use std::path::Path;

pub fn claim(app_data: &Path) -> std::io::Result<bool> {
    std::fs::create_dir_all(app_data)?;
    match std::fs::OpenOptions::new().write(true).create_new(true)
        .open(app_data.join("ilk-kullanim-v1.seen")) {
        Ok(_) => Ok(true),
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => Ok(false),
        Err(error) => Err(error),
    }
}

/// Keep the existing greeting UI; its browser flag is now derived from app data.
/// The fixed scripts contain no user input and are sent before boot's IPC reply.
pub fn prepare(app: &tauri::AppHandle) {
    use tauri::Manager;
    static PREPARED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    if PREPARED.swap(true, std::sync::atomic::Ordering::SeqCst) { return; }
    let first = app.path().app_data_dir().ok().and_then(|path| claim(&path).ok()).unwrap_or(false);
    if let Some(window) = app.get_webview_window("island") {
        let script = if first {
            "try { localStorage.removeItem('afunobet-orientation-v1'); } catch (_) {}"
        } else {
            "try { localStorage.setItem('afunobet-orientation-v1', 'seen'); } catch (_) {}"
        };
        let _ = window.eval(script);
    }
}
