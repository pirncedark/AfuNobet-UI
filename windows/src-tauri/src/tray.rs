use tauri::menu::{CheckMenuItem, Menu, MenuItem, Submenu};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
use tauri::{AppHandle, Emitter, Manager};

pub fn pet_label(app: &AppHandle, on: bool) {
    if let Some(item) = app.state::<crate::Shared>().pet_menu.lock().unwrap().as_ref() {
        let _ = item.set_text(if on { "Mini peti gizle" } else { "Mini peti göster" });
    }
}

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "AfuNöbet", true, None::<&str>)?;
    let pause = CheckMenuItem::with_id(app, "pause", "Bildirimleri duraklat", true, false, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;
    let on = app.state::<crate::Shared>().settings.lock().unwrap().pet;
    let pet = MenuItem::with_id(app, "pet", if on { "Mini peti gizle" } else { "Mini peti göster" }, true, None::<&str>)?;
    *app.state::<crate::Shared>().pet_menu.lock().unwrap() = Some(pet);
    let guard = app.state::<crate::Shared>();
    let item = guard.pet_menu.lock().unwrap();
    let apps = Submenu::new(app, "Afu uygulamaları", true)?;
    let init_durum = fill_apps(app, &apps)?;
    *guard.apps_menu.lock().unwrap() = Some(apps.clone());
    let menu = Menu::with_items(app, &[&open, &apps, item.as_ref().unwrap(), &pause, &quit])?;
    drop(item);
    let builder = TrayIconBuilder::with_id("afunobet-ui")
        .tooltip("Afu yanında")
        .icon(tauri::image::Image::new_owned(crate::tray_icon::simge(init_durum, 32), 32, 32))
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if matches!(event, TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }) {
                let _ = tray.app_handle().emit_to(crate::island::WINDOW_LABEL, "tray", "open");
            }
        })
        .menu(&menu)
        .on_menu_event(move |app: &AppHandle, event| match event.id.as_ref() {
            "quit" => app.exit(0),
            "pet" => {
                let on = !app.state::<crate::Shared>().settings.lock().unwrap().pet;
                if crate::set_pet(app.clone(), app.state(), on).is_err() {
                    let _ = app.emit("pet-setting-error", "Ayar kaydedilemedi. Tekrar deneyin.");
                }
            }
            "open" => {
                let _ = app.emit_to(crate::island::WINDOW_LABEL, "tray", "open".to_string());
            }
            "pause" => {
                let paused = pause.is_checked().unwrap_or(false);
                let _ = pause.set_text(if paused { "Bildirimleri sürdür" } else { "Bildirimleri duraklat" });
                let _ = app.emit_to(crate::island::WINDOW_LABEL, "tray", if paused { "pause" } else { "resume" });
            }
            id if id.starts_with("app:") => {
                if let Err(message) = crate::app_open(app.clone(), id[4..].to_owned()) {
                    let _ = app.emit_to(crate::island::WINDOW_LABEL, "apps-error", message);
                }
            }
            _ => {}
        });
    builder.build(app)?;
    Ok(())
}
fn fill_apps(app: &AppHandle, menu: &Submenu<tauri::Wry>) -> tauri::Result<crate::tray_icon::Durum> {
    let mut en_onemli = crate::tray_icon::Durum::Bos;
    for row in crate::app_rows(app) {
        let availability = if row.telefonda { "Telefonda" } else if !row.kurulu { "Kurulu değil" } else { "Aç" };
        let detail = row.ozet.as_deref().filter(|s| !s.is_empty()).unwrap_or(availability);
        let dot = match row.durum.as_deref() {
            Some("hata") => { en_onemli = crate::tray_icon::Durum::Hata; "🔴 " },
            Some("uyari") => { if !matches!(en_onemli, crate::tray_icon::Durum::Hata) { en_onemli = crate::tray_icon::Durum::Uyari; }; "🟠 " },
            Some("calisiyor") => { if matches!(en_onemli, crate::tray_icon::Durum::Bos) { en_onemli = crate::tray_icon::Durum::Calisiyor; }; "🔵 " },
            _ => "",
        };
        let label = format!("{dot}{} · {detail}", row.ad);
        menu.append(&MenuItem::with_id(app, format!("app:{}", row.id), label,
            row.kurulu && !row.telefonda, None::<&str>)?)?;
    }
    Ok(en_onemli)
}
/// Runtime bunu dosya olayından sonra ana pencere iş parçacığında çağırır.
pub fn refresh_apps(app: &AppHandle) {
    let menu = app.state::<crate::Shared>().apps_menu.lock().ok().and_then(|menu| menu.clone());
    let Some(menu) = menu else { return; };
    if let Ok(items) = menu.items() {
        for item in items { let _ = menu.remove(&item); }
        if let Ok(durum) = fill_apps(app, &menu) {
            if let Some(tray) = app.tray_by_id("afunobet-ui") {
                let _ = tray.set_icon(Some(tauri::image::Image::new_owned(crate::tray_icon::simge(durum, 32), 32, 32)));
            }
        }
    }
}
