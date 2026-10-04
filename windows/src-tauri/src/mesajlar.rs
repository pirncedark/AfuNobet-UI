use crate::questions::{kok, maskele};
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Mesaj {
    pub surum: u32,
    pub id: String,
    pub ajan: String,
    pub tur: String,
    pub metin: String,
    pub zaman: u64,
}

fn gecerli_kimlik(s: &str, en_fazla: usize) -> bool {
    let boy = s.len();
    boy > 0 && boy <= en_fazla && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn mesaj_coz(bayt: &[u8]) -> Option<Mesaj> {
    if bayt.len() > 64 * 1024 {
        return None;
    }
    let govde: serde_json::Value = serde_json::from_slice(bayt).ok()?;
    if govde.get("surum").and_then(|v| v.as_u64()) != Some(1) {
        return None;
    }
    let id = govde.get("id").and_then(|v| v.as_str())?;
    if !gecerli_kimlik(id, 64) {
        return None;
    }
    let ajan = govde.get("ajan").and_then(|v| v.as_str())?;
    if !matches!(ajan, "claude" | "codex" | "gemini" | "opencode") {
        return None;
    }
    let tur = govde.get("tur").and_then(|v| v.as_str())?;
    if !matches!(tur, "bitti" | "bilgi" | "uyari") {
        return None;
    }
    let metin = govde.get("metin").and_then(|v| v.as_str())?;
    let zaman = govde.get("zaman").and_then(|v| v.as_u64())?;
    
    Some(Mesaj {
        surum: 1,
        id: id.to_owned(),
        ajan: ajan.to_owned(),
        tur: tur.to_owned(),
        metin: maskele(metin),
        zaman,
    })
}

pub fn start(app: AppHandle) {
    let kok_yolu = kok();
    if !kok_yolu.is_dir() {
        return;
    }

    // Kalp atışı
    let kalp_koku = kok_yolu.clone();
    std::thread::spawn(move || {
        let canli_yolu = kalp_koku.join("ada_canli");
        loop {
            if let Ok(file) = fs::OpenOptions::new().create(true).write(true).open(&canli_yolu) {
                let _ = file.set_len(0); // touch
            }
            std::thread::sleep(Duration::from_secs(3));
        }
    });

    // Mesajlar klasörü
    let mesajlar_dizini = kok_yolu.join("mesajlar");
    let _ = fs::create_dir_all(&mesajlar_dizini);

    let (tx, rx) = mpsc::sync_channel::<()>(1);
    let mut izleyici: RecommendedWatcher = notify::recommended_watcher(move |sonuc: notify::Result<Event>| {
        if let Ok(olay) = sonuc {
            match olay.kind {
                EventKind::Create(_) | EventKind::Modify(_) => {
                    if olay.paths.iter().any(|p| p.extension().and_then(|s| s.to_str()) == Some("json")) {
                        let _ = tx.try_send(());
                    }
                }
                _ => {}
            }
        }
    }).unwrap();

    let app_clone = app.clone();
    std::thread::spawn(move || {
        let _ = izleyici.watch(&mesajlar_dizini, RecursiveMode::NonRecursive);
        while rx.recv().is_ok() {
            let _ = app_clone.emit("afu-mesajlar", ());
            // Biriken olayları temizle
            while rx.try_recv().is_ok() {}
            std::thread::sleep(Duration::from_millis(100)); // debounce
        }
    });
}

#[tauri::command]
pub fn mesajlar_list() -> Vec<Mesaj> {
    let kok_yolu = kok();
    let mesajlar_dizini = kok_yolu.join("mesajlar");
    let mut liste = Vec::new();
    
    if let Ok(dizin) = fs::read_dir(mesajlar_dizini) {
        for giris in dizin.flatten() {
            let yol = giris.path();
            if yol.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(bayt) = fs::read(&yol) {
                    if let Some(mesaj) = mesaj_coz(&bayt) {
                        liste.push(mesaj);
                        let _ = fs::remove_file(&yol); // tüketildi
                    }
                }
            }
        }
    }
    
    // Zamana göre sırala (eskiden yeniye)
    liste.sort_by_key(|m| m.zaman);
    liste
}
