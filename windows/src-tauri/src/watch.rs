use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

fn relevant(event: &Event, path: &Path) -> bool {
    !matches!(event.kind, EventKind::Access(_))
        && (event.paths.is_empty()
            || event
                .paths
                .iter()
                .any(|changed| changed == path || path.starts_with(changed)))
}

pub struct FileWatch {
    watcher: Mutex<RecommendedWatcher>,
    parent: PathBuf,
    ancestor: PathBuf,
    reconnect: Arc<AtomicBool>,
    receiver: Receiver<()>,
}
impl FileWatch {
    pub fn new(path: PathBuf) -> notify::Result<Self> {
        let (sender, receiver) = mpsc::sync_channel(1);
        let target = path.clone();
        let parent = path.parent().unwrap_or(Path::new(".")).to_path_buf();
        let callback_parent = parent.clone();
        let reconnect = Arc::new(AtomicBool::new(false));
        let callback_reconnect = reconnect.clone();
        let mut watcher = notify::recommended_watcher(move |result: notify::Result<Event>| {
            // An OS watch error is a single change signal, never a timer fallback.
            if result
                .as_ref()
                .map_or(true, |event| relevant(event, &target))
            {
                if result.as_ref().map_or(true, |event| {
                    event
                        .paths
                        .iter()
                        .any(|changed| callback_parent.starts_with(changed))
                }) {
                    callback_reconnect.store(true, Ordering::Release);
                }
                let _ = sender.try_send(());
            }
        })?;
        // Keep a separate subscription above the source directory. Its handle
        // survives deleting/recreating the source directory itself.
        let ancestor = parent
            .parent()
            .unwrap_or(&parent)
            .ancestors()
            .find(|directory| directory.is_dir())
            .unwrap_or(&parent)
            .to_path_buf();
        let mode = if parent.parent() == Some(ancestor.as_path()) || ancestor == parent {
            RecursiveMode::NonRecursive
        } else {
            RecursiveMode::Recursive
        };
        watcher.watch(&ancestor, mode)?;
        if parent != ancestor && parent.is_dir() {
            watcher.watch(&parent, RecursiveMode::NonRecursive)?;
        }
        Ok(Self {
            watcher: Mutex::new(watcher),
            parent,
            ancestor,
            reconnect,
            receiver,
        })
    }
    pub fn wait(&self) -> bool {
        if self.receiver.recv().is_err() {
            return false;
        }
        // Coalesce pending notifications from one atomic publication.
        while self.receiver.try_recv().is_ok() {}
        if self.reconnect.swap(false, Ordering::AcqRel) && self.parent != self.ancestor {
            let mut watcher = self.watcher.lock().unwrap();
            let _ = watcher.unwatch(&self.parent);
            if self.parent.is_dir() {
                let _ = watcher.watch(&self.parent, RecursiveMode::NonRecursive);
            }
        }
        true
    }
}
fn read_with_retry(path: &Path) -> Option<serde_json::Value> {
    crate::state::read_snapshot(path).or_else(|| {
        std::thread::sleep(std::time::Duration::from_millis(250));
        crate::state::read_snapshot(path)
    })
}

pub fn start(app: AppHandle, path: PathBuf, watcher: Option<FileWatch>) {
    let Some(watcher) = watcher else { return };
    std::thread::spawn(move || {
        while watcher.wait() {
            let Some(value) = read_with_retry(&path) else { continue };
            let shared = app.state::<crate::Shared>();
            let mut snapshot = shared.snapshot.lock().unwrap();
            if snapshot.apply_valid(value) {
                let _ = app.emit("afunobet-state", snapshot.value().clone());
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;
    use std::time::Duration;

    #[test]
    fn partial_publication_retries_once_and_recovers_without_restart() {
        let dir = std::env::temp_dir().join(format!("afunobet-watch-partial-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("state.json");
        std::fs::write(&path, "{\"version\":1,\"tasks\":[").unwrap();
        let publish = path.clone();
        let worker = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(50));
            std::fs::write(publish, r#"{"version":1,"tasks":[{"id":"fresh"}],"mesaj":""}"#).unwrap();
        });
        assert_eq!(read_with_retry(&path).unwrap()["tasks"][0]["id"], "fresh");
        worker.join().unwrap();
        std::fs::write(&path, "{").unwrap();
        assert!(read_with_retry(&path).is_none());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn idle_watch_never_produces_a_timer_read() {
        let dir = std::env::temp_dir().join(format!("afunobet-watch-idle-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let watcher = FileWatch::new(dir.join("state.json")).unwrap();
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            tx.send(watcher.wait()).unwrap();
        });
        assert!(matches!(
            rx.recv_timeout(Duration::from_millis(250)),
            Err(mpsc::RecvTimeoutError::Timeout)
        ));
        // Wake the worker so it releases the directory handle before cleanup.
        std::fs::write(dir.join("state.json"), "{}").unwrap();
        assert!(rx.recv_timeout(Duration::from_secs(3)).unwrap());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn atomic_publication_and_existing_file_replace_are_observed() {
        let dir =
            std::env::temp_dir().join(format!("afunobet-watch-replace-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("state.json");
        let temp = dir.join("state.tmp");
        let watcher = FileWatch::new(path.clone()).unwrap();
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            tx.send(watcher.wait()).unwrap();
            tx.send(watcher.wait()).unwrap();
        });
        std::fs::write(&temp, r#"{"version":1,"tasks":[]}"#).unwrap();
        std::fs::rename(&temp, &path).unwrap();
        assert!(rx.recv_timeout(Duration::from_secs(3)).unwrap());
        std::fs::write(&temp, r#"{"version":1,"tasks":[{"id":"b"}]}"#).unwrap();
        replace(&temp, &path);
        assert!(rx.recv_timeout(Duration::from_secs(3)).unwrap());
        assert_eq!(
            crate::state::read_snapshot(&path).unwrap()["tasks"][0]["id"],
            "b"
        );
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn deleted_parent_is_recreated_and_new_atomic_snapshot_is_observed() {
        let root =
            std::env::temp_dir().join(format!("afunobet-watch-parent-{}", std::process::id()));
        let parent = root.join("source");
        let path = parent.join("state.json");
        std::fs::create_dir_all(&parent).unwrap();
        std::fs::write(&path, r#"{"version":1,"tasks":[{"id":"a"}]}"#).unwrap();
        let watcher = FileWatch::new(path.clone()).unwrap();
        let (tx, rx) = mpsc::channel();
        let worker = std::thread::spawn(move || {
            while watcher.wait() {
                if crate::state::read_snapshot(&path)
                    .is_some_and(|value| value["tasks"][0]["id"] == "b")
                {
                    tx.send(()).unwrap();
                    return;
                }
            }
        });
        std::fs::remove_dir_all(&parent).unwrap();
        std::fs::create_dir_all(&parent).unwrap();
        let temp = parent.join("state.tmp");
        std::fs::write(&temp, r#"{"version":1,"tasks":[{"id":"b"}]}"#).unwrap();
        std::fs::rename(&temp, parent.join("state.json")).unwrap();
        rx.recv_timeout(Duration::from_secs(3))
            .expect("recreated source was not observed");
        worker.join().unwrap();
        std::fs::remove_dir_all(root).unwrap();
    }

    fn replace(from: &Path, to: &Path) {
        use std::os::windows::ffi::OsStrExt;
        use windows::core::PCWSTR;
        use windows::Win32::Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING};
        let from: Vec<u16> = from.as_os_str().encode_wide().chain(Some(0)).collect();
        let to: Vec<u16> = to.as_os_str().encode_wide().chain(Some(0)).collect();
        unsafe {
            MoveFileExW(
                PCWSTR(from.as_ptr()),
                PCWSTR(to.as_ptr()),
                MOVEFILE_REPLACE_EXISTING,
            )
            .unwrap();
        }
    }
}
