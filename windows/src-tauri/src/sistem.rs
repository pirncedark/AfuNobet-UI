use std::sync::atomic::AtomicBool;
use tauri::{Listener, Manager};

#[derive(Default)]
pub struct TepsiDurumu { pub gizli: AtomicBool }

#[tauri::command]
pub fn bildirim_ayarlari(app: tauri::AppHandle) -> crate::bildirim::Ayarlar {
    app.state::<crate::bildirim::Runtime>().settings()
}
#[tauri::command]
pub fn ses_sessiz(app: tauri::AppHandle, muted: bool) -> Result<crate::bildirim::Ayarlar, String> {
    app.state::<crate::bildirim::Runtime>().mute(muted)
}

pub fn baslat(app: &tauri::AppHandle) -> tauri::Result<()> {
    let baseline = app.state::<crate::Shared>().snapshot.lock().unwrap().value().clone();
    app.manage(crate::bildirim::Runtime::new(app.path().app_data_dir()?.join("bildirim_ayarlari.json"), &baseline));
    let target = app.clone();
    app.listen("afunobet-state", move |event| {
        if let Ok(value) = serde_json::from_str(event.payload()) {
            target.state::<crate::bildirim::Runtime>().snapshot(&target, &value);
        }
    });
    let target = app.clone();
    app.listen(crate::questions::OLAY, move |event| {
        if let Ok(serde_json::Value::Array(rows)) = serde_json::from_str(event.payload()) {
            for row in rows {
                let id = row["id"].as_str().unwrap_or("");
                let agent = row["ajan"].as_str().unwrap_or("");
                target.state::<crate::bildirim::Runtime>().olay(&target, agent, id, "question", id);
            }
        }
    });
    let target = app.clone();
    app.listen(crate::protokol::OLAY, move |event| {
        if let Ok(value) = serde_json::from_str(event.payload()) {
            target.state::<crate::bildirim::Runtime>().protokol(&target, &value);
        }
    });
    Ok(())
}
