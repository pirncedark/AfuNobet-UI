use serde_json::Value;

#[test]
fn island_window_is_transparent_non_focusing_and_outside_taskbar() {
    let conf: Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
    let w = &conf["app"]["windows"][0];
    assert_eq!(w["decorations"], false);
    assert_eq!(w["transparent"], true);
    assert_eq!(w["alwaysOnTop"], true);
    assert_eq!(w["skipTaskbar"], true);
    assert_eq!(w["focus"], false);
    assert_eq!(w["visible"], false);
}
