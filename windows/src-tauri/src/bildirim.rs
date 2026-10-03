use serde::{Deserialize, Serialize};
use std::{collections::HashSet, path::Path};

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct Bildirim { pub id: String, pub kind: String, pub message: String, pub sound: String }
#[derive(Default)]
pub struct Tekillestirici { seen: HashSet<(String, String, String, String)> }
impl Tekillestirici {
    pub fn olay(&mut self, agent: &str, task: &str, kind: &str, occurrence: &str) -> Option<Bildirim> {
        let (message, sound) = match kind {
            "finished" => ("Görev tamamlandı.", "tamamlandi"),
            "error" => ("Görev tamamlanamadı; yeniden dene.", "hata"),
            "rate_limit" => ("Kota doldu; yenilenince devam edecek.", "kota"),
            "question" => ("Cevabın gerekiyor; görev kartını aç.", "cevap"),
            _ => return None,
        };
        if task.is_empty() || task.len() > 256 || occurrence.len() > 256 || agent.len() > 64 { return None; }
        // Saturate rather than evict: old publications must never produce a second alert.
        if self.seen.len() >= 16384 || !self.seen.insert((agent.into(), task.into(), kind.into(), occurrence.into())) { return None; }
        Some(Bildirim { id: serde_json::to_string(&(agent, task, kind, occurrence)).ok()?, kind: kind.into(), message: message.into(), sound: sound.into() })
    }
}
#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Ayarlar { pub muted: bool }
pub fn load(path: &Path) -> Ayarlar {
    std::fs::read(path).ok().filter(|bytes| bytes.len() <= 1024)
        .and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default()
}
pub fn save(path: &Path, settings: Ayarlar) -> Result<(), String> {
    let error = || "Ses ayarı kaydedilemedi; yeniden dene.".to_owned();
    let parent = path.parent().ok_or_else(error)?;
    std::fs::create_dir_all(parent).map_err(|_| error())?;
    std::fs::write(path, serde_json::to_vec(&settings).map_err(|_| error())?).map_err(|_| error())
}

#[derive(Default)]
pub struct Akis { previous: Option<serde_json::Value>, dedup: Tekillestirici, cues: Vec<&'static str>, sounds: HashSet<(String, String, String)> }
impl Akis {
    pub fn cues(&self) -> &[&'static str] { &self.cues }
    pub fn snapshot(&mut self, value: &serde_json::Value) -> Vec<Bildirim> {
        let mut result = Vec::new();
        self.cues.clear();
        if let Some(previous) = self.previous.as_ref() {
            if previous["mesaj"].as_str().is_some_and(|s| !s.is_empty()) && value["mesaj"].as_str() == Some("") { self.cues.push("connected"); }
            if let Some(tasks) = value["tasks"].as_array() {
                for task in tasks {
                    let old = previous["tasks"].as_array().and_then(|rows| rows.iter().find(|row| row["id"] == task["id"]));
                    let agent = task["agent"].as_str().unwrap_or("agent");
                    let id = task["id"].as_str().unwrap_or("");
                    let turn = task["started_at"].as_str().or_else(|| task["started"].as_str()).unwrap_or("");
                    let same_occurrence = old.is_some_and(|old| {
                        old["agent"].as_str().unwrap_or("agent") == agent
                            && old["started_at"].as_str().or_else(|| old["started"].as_str()).unwrap_or("") == turn
                    });
                    if matches!(task["status"].as_str(), Some("Calisiyor" | "working")) && (!same_occurrence || old.is_none_or(|old| old["status"] != task["status"]))
                        && !id.is_empty() && id.len() <= 256 && turn.len() <= 256 && self.sounds.len() < 16384 && self.sounds.insert((agent.into(), id.into(), turn.into())) { self.cues.push("working"); }
                    let kind = snapshot_kind(task);
                    if same_occurrence && old.and_then(snapshot_kind) == kind { continue; }
                    if let Some(kind) = kind {
                        if let Some(alert) = self.dedup.olay(agent, id, kind, turn) { result.push(alert); }
                    }
                }
            }
        }
        self.previous = Some(value.clone());
        result
    }
}
fn snapshot_kind(task: &serde_json::Value) -> Option<&'static str> {
    match task["status"].as_str()? {
        "Tamamlandi" | "finished" => Some("finished"),
        "Hata" | "error" => Some("error"),
        "question" => Some("question"),
        "rate_limit" => Some("rate_limit"),
        // A pause alone is not a quota event. The source sanitizer supplies this reason.
        "Duraklatildi" if task["message"].as_str().or_else(|| task["mesaj"].as_str()).is_some_and(|message| message.contains("kota")) => Some("rate_limit"),
        _ => None,
    }
}

pub struct Runtime {
    path: std::path::PathBuf,
    inner: std::sync::Mutex<RuntimeState>,
}
struct RuntimeState { settings: Ayarlar, paused: bool, flow: Akis, protocol: Akis, sounds: HashSet<(String, String, String, String)> }
impl Runtime {
    pub fn new(path: std::path::PathBuf, baseline: &serde_json::Value) -> Self {
        let mut flow = Akis::default();
        flow.snapshot(baseline);
        let mut protocol = Akis::default();
        protocol.snapshot(&serde_json::json!({"tasks":[],"mesaj":"Bağlantı bekleniyor"}));
        Self { inner: std::sync::Mutex::new(RuntimeState { settings: load(&path), paused: false, flow, protocol, sounds: HashSet::new() }), path }
    }
    pub fn settings(&self) -> Ayarlar { self.inner.lock().unwrap_or_else(|e| e.into_inner()).settings }
    pub fn pause(&self, paused: bool) {
        self.inner.lock().unwrap_or_else(|e| e.into_inner()).paused = paused;
        if paused { crate::ses::stop(); }
    }
    pub fn mute(&self, muted: bool) -> Result<Ayarlar, String> {
        let mut state = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let settings = Ayarlar { muted };
        save(&self.path, settings)?;
        state.settings = settings;
        if muted { crate::ses::stop(); }
        Ok(settings)
    }
    pub fn snapshot(&self, app: &tauri::AppHandle, value: &serde_json::Value) {
        let mut state = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let alerts = state.flow.snapshot(value);
        if state.paused { return; }
        for alert in alerts { deliver(app, &alert, state.settings.muted); }
        if !state.settings.muted { for kind in state.flow.cues() { crate::ses::play(kind); } }
    }
    pub fn protokol(&self, app: &tauri::AppHandle, value: &serde_json::Value) {
        let Some(rows) = value["satirlar"].as_array() else { return; };
        let tasks: Vec<_> = rows.iter().map(|row| serde_json::json!({
            "id":row["oturum"], "agent":row["ajan"], "status":row["durum"],
            "started_at":row["baslangic"].to_string()
        })).collect();
        let snapshot = serde_json::json!({"tasks":tasks,"mesaj":""});
        let mut state = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let alerts = state.protocol.snapshot(&snapshot);
        if state.paused { return; }
        for alert in alerts { deliver(app, &alert, state.settings.muted); }
        if !state.settings.muted { for kind in state.protocol.cues() { crate::ses::play(kind); } }
    }
    /// Explicit event kind and occurrence ID come from the validated local protocol.
    pub fn olay(&self, app: &tauri::AppHandle, agent: &str, task: &str, kind: &str, occurrence: &str) {
        let mut state = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(alert) = state.flow.dedup.olay(agent, task, kind, occurrence) {
            if !state.paused { deliver(app, &alert, state.settings.muted); }
        } else if matches!(kind, "working" | "connected") && !task.is_empty() && task.len() <= 256 && occurrence.len() <= 256 && agent.len() <= 64
            && state.sounds.len() < 16384 && state.sounds.insert((agent.into(), task.into(), kind.into(), occurrence.into())) && !state.settings.muted && !state.paused {
            crate::ses::play(kind);
        }
    }
}
fn deliver(app: &tauri::AppHandle, alert: &Bildirim, muted: bool) {
    use tauri::Emitter;
    let _ = app.emit("afunobet-bildirim", alert);
    let _ = native_toast(&alert.message);
    if !muted { crate::ses::play(&alert.kind); }
}

#[cfg(windows)]
fn native_toast(message: &str) -> windows::core::Result<()> {
    use windows::{core::HSTRING, Data::Xml::Dom::XmlDocument, UI::Notifications::{ToastNotification, ToastNotificationManager}, Win32::System::WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED}};
    let initialized = unsafe { RoInitialize(RO_INIT_MULTITHREADED) }.is_ok();
    let result = (|| {
        let xml = XmlDocument::new()?;
        let escaped = message.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
        xml.LoadXml(&HSTRING::from(format!("<toast><visual><binding template=\"ToastGeneric\"><text>AfuNöbet</text><text>{escaped}</text></binding></visual><audio silent=\"true\"/></toast>")))?;
        let toast = ToastNotification::CreateToastNotification(&xml)?;
        ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from("com.afu.afunobet-ui"))?.Show(&toast)
    })();
    if initialized { unsafe { RoUninitialize(); } }
    result
}
#[cfg(not(windows))]
fn native_toast(_: &str) -> Result<(), ()> { Ok(()) }
