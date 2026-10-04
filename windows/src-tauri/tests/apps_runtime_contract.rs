#[path = "../src/apps.rs"]
mod apps;
#[path = "../src/apps_runtime.rs"]
mod apps_runtime;
#[path = "../src/apps_state.rs"]
mod apps_state;
mod tray {
    pub fn refresh_apps(_app: &tauri::AppHandle) {}
}
use std::{
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
    time::Duration,
};
static COUNT: AtomicU64 = AtomicU64::new(0);
struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target/test-fixtures")
            .join(format!(
                "runtime-{}-{}",
                std::process::id(),
                COUNT.fetch_add(1, Ordering::Relaxed)
            ));
        std::fs::create_dir_all(&path).unwrap();
        Self(path)
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        assert!(self
            .0
            .starts_with(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target/test-fixtures")));
        let _ = std::fs::remove_dir_all(&self.0);
    }
}
#[test]
fn popup_bottom_anchor_and_center_preserved() {
    let rect = apps_runtime::popup_rect((100, 900), (128, 128), (0, 0, 1920, 1080), 1.0);
    assert_eq!(rect, ((0, 728), (360, 300)));
    let rect = apps_runtime::popup_rect((900, 900), (128, 128), (0, 0, 1920, 1080), 1.0);
    assert_eq!(rect, ((784, 728), (360, 300)));
}
#[test]
fn popup_negative_monitor_and_dpi_clamps() {
    let rect = apps_runtime::popup_rect((-1850, -100), (192, 192), (-1920, -1080, 0, 0), 1.5);
    assert_eq!(rect, ((-1920, -450), (540, 450)));
    let rect = apps_runtime::popup_rect((20, 20), (128, 128), (0, 0, 300, 200), 2.0);
    assert_eq!(rect, ((0, 0), (300, 200)));
}
#[test]
fn popup_bad_scale_uses_safe_default() {
    assert_eq!(
        apps_runtime::popup_rect((900, 900), (128, 128), (0, 0, 1920, 1080), f64::NAN),
        ((784, 728), (360, 300))
    );
}
#[test]
fn no_status_means_no_timer_stale_transition_stops_timer() {
    assert_eq!(apps_runtime::wait_interval(&[]), None);
    let row = apps::AppDto {
        indir_url: None,
        id: "afudm".into(),
        ad: "AfuDM".into(),
        kurulu: false,
        telefonda: false,
        durum: Some("calisiyor".into()),
        ozet: None,
    };
    assert_eq!(
        apps_runtime::wait_interval(&[row.clone()]),
        Some(Duration::from_secs(60))
    );
    let mut stale = row;
    stale.durum = None;
    assert_eq!(apps_runtime::wait_interval(&[stale]), None);
}
#[test]
fn saved_popup_geometry_is_not_overwritten_by_repeat_open() {
    let mut saved = apps_runtime::SavedPopup::default();
    assert!(saved.remember((10, 20), (128, 128)));
    assert!(!saved.remember((0, 0), (360, 300)));
    assert_eq!(saved.take(), Some(((10, 20), (128, 128))));
    assert_eq!(saved.take(), None);
}
#[test]
fn runtime_stop_without_start_is_idempotent() {
    let runtime = apps_runtime::Runtime::default();
    runtime.stop();
    runtime.stop();
}
#[test]
fn watcher_idle_has_no_poll_and_registry_write_wakes() {
    let f = Fixture::new();
    let registry = f.0.join("uygulamalar.json");
    std::fs::write(&registry, "[]").unwrap();
    let watch = apps_runtime::WatchSet::new(&registry, &[]).unwrap();
    assert!(!watch.wait_changed(Duration::from_millis(150)));
    std::fs::write(&registry, "[{}]").unwrap();
    assert!(watch.wait_changed(Duration::from_secs(3)));
}
#[test]
fn watcher_missing_status_parent_creation_is_observed() {
    let f = Fixture::new();
    let registry = f.0.join("uygulamalar.json");
    std::fs::write(&registry, "[]").unwrap();
    let status = f.0.join("durum/afudm.json");
    let row = apps::AfuApp {
        indir_url: None,
        id: "afudm".into(),
        ad: "AfuDM".into(),
        yol: None,
        durum_dosyasi: Some(status.clone()),
        simge: None,
    };
    let watch = apps_runtime::WatchSet::new(&registry, &[row]).unwrap();
    std::fs::create_dir_all(status.parent().unwrap()).unwrap();
    std::fs::write(&status, "{}").unwrap();
    assert!(watch.wait_changed(Duration::from_secs(3)));
}

#[test]
fn registry_rebind_watches_new_status_and_ignores_removed_status() {
    let f = Fixture::new();
    let registry = f.0.join("uygulamalar.json");
    std::fs::write(&registry, "[]").unwrap();
    let old = f.0.join("old.json");
    let new = f.0.join("new.json");
    let row = apps::AfuApp {
        indir_url: None,
        id: "afudm".into(),
        ad: "AfuDM".into(),
        yol: None,
        durum_dosyasi: Some(old.clone()),
        simge: None,
    };
    let mut watch = apps_runtime::WatchSet::new(&registry, &[row.clone()]).unwrap();
    let mut changed = row;
    changed.durum_dosyasi = Some(new.clone());
    watch.update(&registry, &[changed]).unwrap();
    std::fs::write(old, "{}").unwrap();
    assert!(!watch.wait_changed(Duration::from_millis(150)));
    std::fs::write(new, "{}").unwrap();
    assert!(watch.wait_changed(Duration::from_secs(3)));
}
