//! Afu Merkez dosya olayları ve açık kullanıcı menüsünün mevcut pencere geometrisi.
use crate::apps::{AfuApp, AppDto, Kayit};
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::{
    collections::HashSet,
    path::{Path, PathBuf},
    sync::{
        mpsc::{self, Receiver, SyncSender},
        Arc, Mutex,
    },
    thread::JoinHandle,
    time::{Duration, SystemTime},
};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize};

type Geometry = ((i32, i32), (u32, u32));

/// Fiziksel piksel cinsinden merkez ve alt kenar sabitlenir, monitöre sığdırılır.
pub(crate) fn popup_rect(
    position: (i32, i32),
    size: (u32, u32),
    bounds: (i32, i32, i32, i32),
    scale: f64,
) -> Geometry {
    let scale = if scale.is_finite() && scale > 0.0 {
        scale
    } else {
        1.0
    };
    let width = (360.0 * scale).round().clamp(1.0, u32::MAX as f64) as u32;
    let height = (300.0 * scale).round().clamp(1.0, u32::MAX as f64) as u32;
    let monitor_w = (bounds.2 as i64 - bounds.0 as i64).max(1);
    let monitor_h = (bounds.3 as i64 - bounds.1 as i64).max(1);
    let width = width.min(monitor_w as u32);
    let height = height.min(monitor_h as u32);
    let x = position.0 as i64 + (size.0 as i64 - width as i64) / 2;
    let y = position.1 as i64 + size.1 as i64 - height as i64;
    let x = x.clamp(
        bounds.0 as i64,
        (bounds.2 as i64 - width as i64).max(bounds.0 as i64),
    );
    let y = y.clamp(
        bounds.1 as i64,
        (bounds.3 as i64 - height as i64).max(bounds.1 as i64),
    );
    ((x as i32, y as i32), (width, height))
}

#[derive(Default)]
pub(crate) struct SavedPopup(Option<Geometry>);
impl SavedPopup {
    pub(crate) fn remember(&mut self, position: (i32, i32), size: (u32, u32)) -> bool {
        if self.0.is_some() {
            return false;
        }
        self.0 = Some((position, size));
        true
    }
    pub(crate) fn take(&mut self) -> Option<Geometry> {
        self.0.take()
    }
}

/// Canlı durum yoksa zamanlayıcı yoktur; dosya olayı sonsuz beklenir.
pub(crate) fn wait_interval(rows: &[AppDto]) -> Option<Duration> {
    rows.iter()
        .any(|r| r.durum.is_some())
        .then_some(Duration::from_secs(60))
}
#[derive(Clone, Copy)]
enum Signal {
    Changed,
    Stop,
}
fn relevant(event: &Event, files: &[PathBuf]) -> bool {
    !matches!(event.kind, EventKind::Access(_))
        && (event.paths.is_empty()
            || event.paths.iter().any(|changed| {
                files
                    .iter()
                    .any(|file| changed == file || file.starts_with(changed))
            }))
}

/// Tek OS izleyicisi; yeni kayıt durum yolları gelince abonelikleri yenilenir.
pub(crate) struct WatchSet {
    watcher: RecommendedWatcher,
    receiver: Receiver<Signal>,
    sender: SyncSender<Signal>,
    files: Arc<Mutex<Vec<PathBuf>>>,
    watched: Vec<PathBuf>,
}
impl WatchSet {
    pub(crate) fn new(registry: &Path, apps: &[AfuApp]) -> Result<Self, String> {
        let (sender, receiver) = mpsc::sync_channel(32);
        let files = Arc::new(Mutex::new(Vec::<PathBuf>::new()));
        let callback_files = files.clone();
        let callback_sender = sender.clone();
        let watcher = notify::recommended_watcher(move |result: notify::Result<Event>| {
            let changed = result.as_ref().map_or(true, |event| {
                callback_files
                    .lock()
                    .is_ok_and(|files| relevant(event, &files))
            });
            if changed {
                let _ = callback_sender.try_send(Signal::Changed);
            }
        })
        .map_err(|_| "Uygulama durumları izlenemedi; yeniden dene.".to_owned())?;
        let mut result = Self {
            watcher,
            receiver,
            sender,
            files,
            watched: Vec::new(),
        };
        result.update(registry, apps)?;
        Ok(result)
    }
    pub(crate) fn update(&mut self, registry: &Path, apps: &[AfuApp]) -> Result<(), String> {
        let files: Vec<PathBuf> = std::iter::once(registry.to_owned())
            .chain(apps.iter().filter_map(|a| a.durum_dosyasi.clone()))
            .collect();
        *self
            .files
            .lock()
            .map_err(|_| "Uygulama durumları izlenemedi; yeniden dene.".to_owned())? =
            files.clone();
        let mut subscriptions = HashSet::new();
        for file in &files {
            let Some(parent) = file.parent() else {
                continue;
            };
            if parent.is_dir() {
                subscriptions.insert((parent.to_owned(), false));
                // Üst abonelik, kaynak klasörü silinip yeniden oluşsa da yaşar.
                if let Some(ancestor) = parent.parent().filter(|p| p.is_dir()) {
                    subscriptions.insert((ancestor.to_owned(), false));
                }
            } else if let Some(ancestor) = parent.ancestors().find(|p| p.is_dir()) {
                subscriptions.insert((ancestor.to_owned(), true));
            }
        }
        // Aynı dizin için geniş abonelik gereken durumda tek recursive abonelik kullanılır.
        let mut merged = std::collections::HashMap::<PathBuf, bool>::new();
        for (path, recursive) in subscriptions {
            *merged.entry(path).or_default() |= recursive;
        }
        for old in self.watched.drain(..) {
            let _ = self.watcher.unwatch(&old);
        }
        for (path, recursive) in merged {
            self.watcher
                .watch(
                    &path,
                    if recursive {
                        RecursiveMode::Recursive
                    } else {
                        RecursiveMode::NonRecursive
                    },
                )
                .map_err(|_| "Uygulama durumları izlenemedi; yeniden dene.".to_owned())?;
            self.watched.push(path);
        }
        if self.watched.is_empty() {
            return Err("Uygulama durumları izlenemedi; yeniden dene.".into());
        }
        Ok(())
    }
    fn wait(&self, timeout: Option<Duration>) -> Option<Signal> {
        let first = match timeout {
            Some(timeout) => match self.receiver.recv_timeout(timeout) {
                Ok(signal) => signal,
                Err(mpsc::RecvTimeoutError::Timeout) => return Some(Signal::Changed),
                Err(_) => return None,
            },
            None => self.receiver.recv().ok()?,
        };
        if matches!(first, Signal::Stop) {
            return None;
        }
        for signal in self.receiver.try_iter() {
            if matches!(signal, Signal::Stop) {
                return None;
            }
        }
        Some(Signal::Changed)
    }
    #[cfg(test)]
    pub(crate) fn wait_changed(&self, timeout: Duration) -> bool {
        matches!(self.receiver.recv_timeout(timeout), Ok(Signal::Changed))
    }
}
struct Worker {
    sender: SyncSender<Signal>,
    thread: JoinHandle<()>,
}
#[derive(Default)]
pub struct Runtime {
    worker: Mutex<Option<Worker>>,
    popup: Mutex<SavedPopup>,
}
impl Runtime {
    pub fn start(&self, app: &AppHandle, registry_path: &Path) -> Result<(), String> {
        let mut worker = self
            .worker
            .lock()
            .map_err(|_| "Uygulama durumları izlenemedi; yeniden dene.".to_owned())?;
        if worker.is_some() {
            return Ok(());
        }
        let registry = registry_path.to_owned();
        let mut kayit = Kayit::dosyadan(&registry);
        let mut watcher = WatchSet::new(&registry, kayit.uygulamalar())?;
        let sender = watcher.sender.clone();
        let app = app.clone();
        let thread = std::thread::spawn(move || {
            let mut rows = kayit.liste(SystemTime::now());
            let mut last = serde_json::to_vec(&rows).unwrap_or_default();
            while watcher.wait(wait_interval(&rows)).is_some() {
                kayit = Kayit::dosyadan(&registry);
                // Yeniden oluşturulan kaynak klasörlerini ve değişen kayıt yollarını bağla.
                let _ = watcher.update(&registry, kayit.uygulamalar());
                rows = kayit.liste(SystemTime::now());
                let serialized = serde_json::to_vec(&rows).unwrap_or_default();
                if serialized != last {
                    last = serialized;
                    let _ = app.emit("afu-apps-changed", &rows);
                    let refresh_app = app.clone();
                    let _ = app.run_on_main_thread(move || crate::tray::refresh_apps(&refresh_app));
                }
            }
        });
        *worker = Some(Worker { sender, thread });
        Ok(())
    }
    /// Stop sinyali sonsuz dosya bekleyişini de uyandırır; yalnız kendi iş parçacığı bırakılır.
    pub fn stop(&self) {
        // Kilit join boyunca tutulur; eşzamanlı start ikinci izleyici başlatamaz.
        if let Ok(mut slot) = self.worker.lock() {
            if let Some(worker) = slot.take() {
                let _ = worker.sender.send(Signal::Stop);
                let _ = worker.thread.join();
            }
        }
    }
    /// Yeni pencere/fokus yok; mevcut pet, açık kullanıcı menüsüne genişler.
    pub fn pet_popup(&self, app: &AppHandle, on: bool) -> Result<(), String> {
        if !on {
            self.restore_popup(app);
            return Ok(());
        }
        let error = || "Uygulama menüsü açılamadı; yeniden dene.".to_owned();
        let window = app.get_webview_window("island").ok_or_else(error)?;
        let mut saved = self.popup.lock().map_err(|_| error())?;
        if saved.0.is_some() {
            return Ok(());
        }
        let position = window.outer_position().map_err(|_| error())?;
        let size = window.inner_size().map_err(|_| error())?;
        let monitor = window
            .current_monitor()
            .map_err(|_| error())?
            .ok_or_else(error)?;
        let area = monitor.work_area();
        let bounds = (
            area.position.x,
            area.position.y,
            (area.position.x as i64 + area.size.width as i64)
                .clamp(i32::MIN as i64, i32::MAX as i64) as i32,
            (area.position.y as i64 + area.size.height as i64)
                .clamp(i32::MIN as i64, i32::MAX as i64) as i32,
        );
        let old = ((position.x, position.y), (size.width, size.height));
        let rect = popup_rect(old.0, old.1, bounds, window.scale_factor().unwrap_or(1.0));
        saved.remember(old.0, old.1);
        if window
            .set_size(PhysicalSize::new(rect.1 .0, rect.1 .1))
            .is_err()
            || window
                .set_position(PhysicalPosition::new(rect.0 .0, rect.0 .1))
                .is_err()
        {
            let _ = window.set_size(size);
            let _ = window.set_position(position);
            saved.take();
            return Err(error());
        }
        Ok(())
    }
    pub fn restore_popup(&self, app: &AppHandle) {
        let original = self.popup.lock().ok().and_then(|mut saved| saved.take());
        if let (Some((position, size)), Some(window)) = (original, app.get_webview_window("island"))
        {
            let _ = window.set_size(PhysicalSize::new(size.0, size.1));
            let _ = window.set_position(PhysicalPosition::new(position.0, position.1));
        }
    }
}
impl Drop for Runtime {
    fn drop(&mut self) {
        self.stop();
    }
}

#[cfg(test)]
mod lifecycle_tests {
    use super::*;
    #[test]
    fn concurrent_start_is_blocked_until_previous_worker_join_finishes() {
        let runtime = Arc::new(Runtime::default());
        let (sender, receiver) = mpsc::sync_channel(1);
        let (stopped_sender, stopped_receiver) = mpsc::channel();
        let (release_sender, release_receiver) = mpsc::channel();
        let thread = std::thread::spawn(move || {
            assert!(matches!(receiver.recv().unwrap(), Signal::Stop));
            stopped_sender.send(()).unwrap();
            let _ = release_receiver.recv();
        });
        *runtime.worker.lock().unwrap() = Some(Worker { sender, thread });
        let stopping = runtime.clone();
        let stopper = std::thread::spawn(move || stopping.stop());
        stopped_receiver
            .recv_timeout(Duration::from_secs(1))
            .unwrap();
        assert!(runtime.worker.try_lock().is_err());
        release_sender.send(()).unwrap();
        stopper.join().unwrap();
    }
    #[test]
    fn stop_wakes_parked_worker_and_joins_only_owned_thread() {
        let runtime = Runtime::default();
        let (sender, receiver) = mpsc::sync_channel(1);
        let (ready_sender, ready_receiver) = mpsc::channel();
        let thread = std::thread::spawn(move || {
            ready_sender.send(()).unwrap();
            assert!(matches!(receiver.recv().unwrap(), Signal::Stop));
        });
        *runtime.worker.lock().unwrap() = Some(Worker { sender, thread });
        ready_receiver.recv_timeout(Duration::from_secs(1)).unwrap();
        runtime.stop();
        assert!(runtime.worker.lock().unwrap().is_none());
        runtime.stop();
    }
}
