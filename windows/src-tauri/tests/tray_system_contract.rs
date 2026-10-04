#[test]
fn tray_has_four_single_click_actions_and_restores_window_natively() {
    let source = include_str!("../src/tray.rs");
    for id in ["open", "hide", "status", "quit"] {
        assert!(source.contains(&format!("\"{id}\" =>")), "missing action {id}");
    }
    assert!(source.contains("crate::tray_mode(app.clone(), app.state(), true)"));
    assert!(source.contains("crate::tray_mode(app.clone(), app.state(), false)"));
    assert!(source.contains("MouseButtonState::Up"));
    assert!(source.contains("system-status"));
}
