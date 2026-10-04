fn main() {
    let builder = tauri::window::WindowBuilder::new(
        &tauri::Builder::default().build(tauri::generate_context!("tauri.conf.json")).unwrap(),
        "test",
        tauri::WindowUrl::App("index.html".into())
    );
    let _ = builder.accept_first_mouse(true);
}
