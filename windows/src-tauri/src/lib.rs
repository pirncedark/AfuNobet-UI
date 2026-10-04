// AfuNobet-UI only observes the published state snapshot.
mod dpi;
mod island;
mod log;
mod state;
mod tray;
mod watch;
mod taskbar;
mod yaslanma;
mod glide;
mod tray_icon;
mod settings;
mod apps;
mod apps_state;
mod apps_runtime;
mod codex;
mod voice;
mod orkestra;
mod questions;
mod disari;
mod ilk_kullanim;
mod sistem;
mod servis;
mod bildirim;
mod ses;
mod hook_kur;
mod kimlik;
mod protokol;
mod mesajlar;
mod ipc;
mod claude_hook;

use island::{PollGate, ScreenInfo};
use serde::Serialize;
use serde_json::Value;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub pet: bool,
    pub screen: String,
    pub auto_close_interval: u32,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            pet: true,
            screen: "primary".into(),
            auto_close_interval: 15,
        }
    }
}

pub struct Shared {
    pub codex: Mutex<Option<Arc<codex::CodexBridge>>>,
    pub apps_menu: Mutex<Option<tauri::menu::Submenu<tauri::Wry>>>,
    pub popup_resume: Mutex<Option<bool>>,
    pub pet_menu: Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>,
    pub pet_runtime: Arc<glide::PetRuntime>,
    pub settings: Mutex<Settings>,
    pub gate: Arc<PollGate>,
    pub snapshot: Mutex<state::Snapshot>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootInfo {
    settings: Settings,
    screen: ScreenInfo,
    version: String,
}

fn project_root() -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent().and_then(|p| p.parent()).and_then(|p| p.parent()).unwrap().to_owned()
}
fn codex_bridge(app: &AppHandle) -> Result<Arc<codex::CodexBridge>, String> {
    let shared = app.state::<Shared>();
    let mut guard = shared.codex.lock().map_err(|_| "Asistan hazırlanamadı. Yeniden dene.".to_owned())?;
    if let Some(bridge) = guard.as_ref() { return Ok(bridge.clone()); }
    let target = app.clone();
    let bridge = codex::CodexBridge::start_with_callback(Arc::new(move |event| { let _ = target.emit_to(island::WINDOW_LABEL, "codex", event); }))
        .map_err(|error| codex::sol_durum_metni(&error).to_owned())?;
    let bridge = Arc::new(bridge); *guard = Some(bridge.clone()); Ok(bridge)
}
async fn codex_action<T: Send + 'static>(app: AppHandle, action: impl FnOnce(Arc<codex::CodexBridge>) -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || action(codex_bridge(&app)?)).await
        .map_err(|_| "Asistan yanıt veremedi. Yeniden dene.".to_owned())?
}
#[tauri::command]
async fn is_claude_hook_installed() -> bool {
    claude_hook::is_installed()
}

#[tauri::command]
async fn codex_status(app: AppHandle) -> Result<codex::CodexStatus, String> {
    codex_action(app, |bridge| bridge.status().map_err(|error| codex::sol_durum_metni(&error).to_owned())).await
}
#[tauri::command]
async fn codex_send(app: AppHandle, text: String, attachments: Vec<String>) -> Result<Value, String> {
    codex_action(app, move |bridge| bridge.send(&text, &attachments, &project_root()).map_err(|error| codex::sol_durum_metni(&error).to_owned())).await
}
#[tauri::command]
async fn codex_cancel(app: AppHandle) -> Result<Value, String> {
    codex_action(app, |bridge| bridge.cancel().map_err(|error| codex::sol_durum_metni(&error).to_owned())).await
}
#[tauri::command]
async fn codex_logout(app: AppHandle) -> Result<Value, String> {
    codex_action(app, |bridge| bridge.logout().map_err(|error| codex::sol_durum_metni(&error).to_owned())).await
}
#[tauri::command]
async fn codex_new_chat(app: AppHandle) -> Result<(), String> {
    codex_action(app, |bridge| bridge.new_chat().map_err(|error| codex::sol_durum_metni(&error).to_owned())).await
}
#[tauri::command]
async fn codex_login(app: AppHandle) -> Result<(), String> {
    codex_action(app, |bridge| {
        let url = bridge.login_start().map_err(|error| codex::sol_durum_metni(&error).to_owned())?;
        if let Err(error) = apps::login_url_ac(&url) { let _ = bridge.login_cancel(); return Err(error); }
        Ok(())
    }).await
}
#[tauri::command]
async fn codex_login_cancel(app: AppHandle) -> Result<Value, String> {
    codex_action(app, |bridge| bridge.login_cancel().map_err(|error| codex::sol_durum_metni(&error).to_owned())).await
}
#[tauri::command]
fn codex_install() -> Result<(), String> {
    crate::apps::login_url_ac("https://www.npmjs.com/package/@openai/codex").map_err(|_| "İndirme sayfası açılamadı; yeniden dene.".to_owned())
}
// Sol uses the existing local Chatterbox worker, fixed to afu_5b; no alternate text or voice.
#[derive(Default)]
struct SolVoiceState {
    generation: Arc<std::sync::atomic::AtomicU64>,
    lock: Arc<Mutex<()>>,
    jobs: Arc<Mutex<Vec<std::path::PathBuf>>>,
}
impl SolVoiceState {
    fn silence(&self) {
        self.generation.fetch_add(1, std::sync::atomic::Ordering::AcqRel);
        if let Ok(jobs) = self.jobs.lock() { for path in jobs.iter() { voice::afu::cancel(path); } }
    }
}
#[tauri::command]
fn sol_voice_silence(sol: tauri::State<'_, SolVoiceState>, state: tauri::State<'_, voice::VoiceState>) {
    sol.silence();voice::voice_silence(state);
}
#[tauri::command]
async fn sol_voice_response(sol: tauri::State<'_, SolVoiceState>, text: String) -> Result<Value, String> {
    use std::sync::atomic::Ordering;
    let generation=sol.generation.clone();
    let ticket=generation.fetch_add(1,Ordering::AcqRel)+1;
    let directory=voice::afu::job_directory();
    let failure="Afu sesi açılamadı; yanıtı yazıyla gösteriyorum.";
    std::fs::create_dir_all(&directory).map_err(|_|failure.to_owned())?;
    let jobs=sol.jobs.clone();jobs.lock().map_err(|_|failure.to_owned())?.push(directory.clone());
    let lock=sol.lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard=lock.lock().map_err(|_|failure.to_owned())?;
        let result=voice::afu::speak(voice::afu::runtime().as_deref(),&directory,&voice::afu::Choice::default(),&text,&generation,ticket);
        if let Ok(mut jobs)=jobs.lock(){jobs.retain(|path|path!=&directory);}
        match result {
            voice::afu::Answer::Played|voice::afu::Answer::Cancelled=>Ok(serde_json::json!({"warning":null})),
            voice::afu::Answer::Fallback(_)=>Err(failure.to_owned()),
        }
    }).await.map_err(|_|failure.to_owned())?
}
#[tauri::command]
fn studio_open() -> Result<(), String> { apps::animasyon_studyo_ac(&project_root()) }
#[tauri::command]
fn project_open(project: String) -> Result<(), String> { apps::proje_klasoru_ac(&project_root(), &project) }
#[tauri::command]
fn log_ac() -> Result<(), String> {
    apps::proje_klasoru_ac(&project_root(), "AfuNobet\\logs")
}
#[tauri::command]
fn voice_open_settings(kind: String) -> Result<(), String> { apps::ses_ayarlari_ac(&kind) }

fn apps_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path().local_data_dir().map(|root| root.join("AfuNobet-UI/uygulamalar.json"))
        .map_err(|_| "Uygulamalar okunamadı. Yeniden dene.".to_owned())
}
fn app_rows(app: &AppHandle) -> Vec<apps::AppDto> {
    apps_path(app).map(|path| apps::Kayit::dosyadan(&path).liste(std::time::SystemTime::now())).unwrap_or_default()
}
#[tauri::command]
fn apps_list(app: AppHandle) -> Vec<apps::AppDto> { app_rows(&app) }
#[tauri::command]
fn app_open(app: AppHandle, id: String) -> Result<(), String> {
    apps::Kayit::dosyadan(&apps_path(&app)?).ac_windows(&id)
}

#[tauri::command]
fn boot(app: AppHandle, shared: State<Shared>) -> BootInfo {
    ilk_kullanim::prepare(&app);
    let settings = shared.settings.lock().unwrap().clone();
    let screen = island::screen_info(&app, &settings.screen);
    BootInfo {
        settings,
        screen,
        version: env!("CARGO_PKG_VERSION").into(),
    }
}

#[tauri::command]
fn read_state(shared: State<Shared>) -> Value {
    shared.snapshot.lock().unwrap().value().clone()
}

/// F10 "Tekrar dene": durum dosyasını şimdi yeniden okur (izleyiciyi beklemez).
#[tauri::command]
fn refresh_state(shared: State<Shared>) -> Value {
    let path = state::resolve_path();
    let mut snapshot = shared.snapshot.lock().unwrap();
    snapshot.refresh(&path);
    snapshot.value().clone()
}

/// Mod değişmeden önce yalnız Afu Merkez tarafından saklanan geometri geri alınır.
fn restore_apps_popup(app: &AppHandle, shared: &Shared, resume: bool) {
    app.state::<apps_runtime::Runtime>().restore_popup(app);
    if let Some(was_active) = shared.popup_resume.lock().unwrap().take() {
        shared.pet_runtime.busy.store(false, Ordering::Release);
        if resume {
            let enabled = shared.settings.lock().unwrap().pet;
            let tray = shared.pet_runtime.tray.load(Ordering::Acquire);
            shared.pet_runtime.set_active(was_active && enabled && !tray);
        }
    }
}
#[tauri::command]
fn pet_apps_popup(app: AppHandle, shared: State<Shared>, on: bool) -> Result<(), String> {
    if !on { restore_apps_popup(&app, &shared, true); return Ok(()); }
    let mut saved = shared.popup_resume.lock().map_err(|_| "Uygulama menüsü açılamadı; yeniden dene.".to_owned())?;
    if saved.is_some() { return Ok(()); }
    if !shared.pet_runtime.active.load(Ordering::Acquire)
        || shared.pet_runtime.tray.load(Ordering::Acquire)
        || shared.pet_runtime.busy.load(Ordering::Acquire) {
        return Err("Mini pet hazır değil; yeniden dene.".into());
    }
    let was_active = shared.pet_runtime.active.load(Ordering::Acquire);
    shared.pet_runtime.cancel();
    shared.pet_runtime.busy.store(true, Ordering::Release);
    if let Err(error) = app.state::<apps_runtime::Runtime>().pet_popup(&app, true) {
        shared.pet_runtime.busy.store(false, Ordering::Release);
        shared.pet_runtime.set_active(was_active);
        return Err(error);
    }
    *saved = Some(was_active);
    Ok(())
}
#[tauri::command]
fn pet_mode(app: AppHandle, shared: State<Shared>, on: bool) {
    if app.state::<sistem::TepsiDurumu>().gizli.load(Ordering::Acquire) { return; }
    app.state::<Arc<servis::Runtime>>().panel_open(false);
    restore_apps_popup(&app, &shared, false);
    glide::transition(app, shared.pet_runtime.clone(), shared.gate.clone(), on);
}
/// P10: mini pet modundayken görev/ajan mesajı balonu karakterin başının
/// üstünde görünür; balon açıkken pencere yukarı büyür, kapanınca eski
/// 256 px boyutuna döner. Kart açıkken çağrılsa da ölçü değişmez (balon kartın
/// içindedir): `glide::balon` yalnız etkin pet modunda çalışır.
#[tauri::command]
fn pet_balon(app: AppHandle, shared: State<Shared>, on: bool) {
    if !shared.pet_runtime.active.load(Ordering::Acquire) { return; }
    glide::balon(&app, &shared.pet_runtime, &shared.gate, on);
}
#[tauri::command]
fn pet_onay_bekliyor(shared: State<Shared>, on: bool) {
    shared.pet_runtime.onay_bekliyor.store(on, Ordering::Release);
    shared.pet_runtime.wake_up();
}
#[tauri::command]
async fn pet_drag(app: AppHandle, shared: State<'_, Shared>) -> Result<bool, String> {
    let runtime = shared.pet_runtime.clone();
    tauri::async_runtime::spawn_blocking(move || glide::drag(app, runtime)).await
        .map_err(|_| "Afu taşınamadı. Yeniden dene.".to_string())?
}
#[tauri::command]
fn tray_mode(app: AppHandle, shared: State<Shared>, on: bool) {
    restore_apps_popup(&app, &shared, false);
    shared.pet_runtime.cancel();
    shared.pet_runtime.tray.store(on, Ordering::Release);
    shared.gate.set_active(!on);
    if let Some(win) = island::window(&app) {
        if on { let _ = win.hide(); }
        else { dpi::place(&app, &shared.settings.lock().unwrap().screen, false); let _ = win.show(); }
    }
}
#[tauri::command]
fn set_pet(app: AppHandle, shared: State<Shared>, on: bool) -> Result<bool, String> {
    let mut guard = shared.settings.lock().unwrap();
    let path = app.path().app_config_dir().map_err(|_| "Ayar kaydedilemedi. Tekrar deneyin.")?.join("pet.json");
    settings::save(&path, on)?;
    guard.pet = on;
    drop(guard);
    tray::pet_label(&app, on);
    let _ = app.emit("pet-enabled", on);
    Ok(on)
}
#[tauri::command]
fn set_tray_status(app: AppHandle, durum: String, title: String) {
    if let Some(tray) = app.tray_by_id("afunobet-ui") {
        let _ = tray.set_icon(Some(tauri::image::Image::new_owned(tray_icon::simge(tray_icon::Durum::parse(&durum), 32), 32, 32)));
        let safe: String = title.chars().filter(|c| !c.is_control()).take(120).collect();
        let _ = tray.set_tooltip(Some(safe));
    }
}

#[tauri::command]
fn set_collapsed(app: AppHandle, shared: State<Shared>, collapsed: bool) {
    if shared.pet_runtime.is_pet_or_tray() { return; }
    let pref = shared.settings.lock().unwrap().screen.clone();
    shared.gate.collapsed.store(collapsed, Ordering::Relaxed);
    dpi::place(&app, &pref, collapsed);
    island::set_ignore_cursor(&app, false);
    shared.gate.forget_ignore_state();
    shared.gate.set_active(!collapsed);
}

/// Ignore late panel measurements while the pet/native transition owns the client.
#[tauri::command]
fn kart_yukseklik(app: AppHandle, shared: State<Shared>, h: f64) {
    if !h.is_finite() || h <= 0.0 || shared.pet_runtime.is_pet_or_tray()
        || shared.gate.collapsed.load(Ordering::Acquire) { return; }
    dpi::kart_yukseklik(app, h);
}

#[tauri::command]
fn set_island_rect(shared: State<Shared>, x: f64, y: f64, width: f64, height: f64) {
    shared.gate.set_rect(island::IslandRect {
        x,
        y,
        w: width,
        h: height,
    });
}

/// Kart (genişletilmiş ada) görünür mü: açıkken pencere dışı tıklamalar izlenir.
#[tauri::command]
fn set_card_open(gozcu: State<Arc<disari::KartGozcu>>, open: bool) {
    gozcu.ayarla(open);
}

#[tauri::command]
fn focus_window(app: AppHandle, focused: bool) {
    let Some(win) = island::window(&app) else {
        return;
    };
    island::set_activating(&win, focused);
    if focused {
        let _ = win.set_focus();
    }
}

#[tauri::command]
fn app_download(app: AppHandle, id: String) -> Result<(), String> {
    apps::Kayit::dosyadan(&apps_path(&app)?).indir_url_ac(&id)
}
#[tauri::command]
fn reposition(app: AppHandle, shared: State<Shared>) {
    if shared.pet_runtime.is_pet_or_tray() { return; }
    let pref = shared.settings.lock().unwrap().screen.clone();
    let collapsed = shared.gate.collapsed.load(Ordering::Relaxed);
    dpi::place(&app, &pref, collapsed);
}

pub fn run() {
    let settings = Settings::default();
    let gate = Arc::new(PollGate::new());
    let pet_runtime = Arc::new(glide::PetRuntime::new());
    let kart_gozcu = Arc::new(disari::KartGozcu::default());
    let path = state::resolve_path();
    // Subscribe before the first read so publication during startup is retained.
    let watcher = Mutex::new(watch::FileWatch::new(path.clone()).ok());
    let mut snapshot = state::Snapshot::default();
    snapshot.refresh(&path);
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            let _ = app.emit_to(island::WINDOW_LABEL, "tray", "open".to_string());
        }))
        .manage(voice::VoiceState::default())
        .manage(SolVoiceState::default())
        .manage(sistem::TepsiDurumu::default())
        .manage(Arc::new(servis::Runtime::default()))
        .manage(apps_runtime::Runtime::default())
        .manage(kart_gozcu.clone())
        .manage(Shared {
            codex: Mutex::new(None),
            apps_menu: Mutex::new(None),
            popup_resume: Mutex::new(None),
            pet_menu: Mutex::new(None),
            pet_runtime: pet_runtime.clone(),
            settings: Mutex::new(settings.clone()),
            gate: gate.clone(),
            snapshot: Mutex::new(snapshot),
        })
        .invoke_handler(tauri::generate_handler![
            boot,
            sistem::bildirim_ayarlari,
            sistem::ses_sessiz,
            servis::servis_panel_open,
            servis::servis_github_refresh,
            hook_kur::hook_onizle,
            hook_kur::hook_uygula,
            kimlik::anahtar_kaydet,
            kimlik::anahtar_var,
            kimlik::anahtar_sil,
            set_collapsed,
            kart_yukseklik,
            set_island_rect,
            set_card_open,
            focus_window,
            reposition,
            read_state,
            refresh_state,
            pet_mode,
            pet_drag,
            pet_onay_bekliyor,
            pet_balon,
            pet_apps_popup,
            tray_mode,
            set_pet,
            set_tray_status,
            apps_list,
            app_open,
            app_download,
            project_open,
            studio_open,
            is_claude_hook_installed,
             codex_status,
            codex_send,
            codex_cancel,
            codex_login,
            codex_login_cancel,
            codex_install,
            codex_new_chat,
            codex_logout,
            sol_voice_response,
            sol_voice_silence,
            voice::voice_start,
            voice::voice_listen_turn,
            voice::voice_stop,
            voice::voice_cancel,
            voice::voice_speak,
            voice::voice_response,
            voice::voice_choices,
            voice::voice_choose,
            voice::voice_silence,
            voice::voice_supported,
            voice_open_settings,
            orkestra::orkestra_projects,
            orkestra::orkestra_send,
            questions::questions_list,
            questions::answer_question,
            mesajlar::mesajlar_list,
            ipc::ajan_listesi,
            log_ac
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            sistem::baslat(&handle)?;
            ilk_kullanim::prepare(&handle);
            mesajlar::start(handle.clone());
            if let Ok(path) = handle.path().app_config_dir() {
                handle.state::<Shared>().settings.lock().unwrap().pet = settings::load(&path.join("pet.json"));
            }
            if let Ok(registry) = apps_path(&handle) {
                let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
                let project_root = manifest.parent().and_then(|p| p.parent()).and_then(|p| p.parent());
                let state_root = handle.path().local_data_dir().ok().map(|p| p.join("Afu/durum"));
                let _ = apps::varsayilan_kayit_olustur(&registry, project_root, state_root.as_deref());
            }
            tray::build(&handle)?;
            if let Ok(registry) = apps_path(&handle) {
                if let Err(message) = handle.state::<apps_runtime::Runtime>().start(&handle, &registry) {
                    let _ = handle.emit("apps-error", message);
                }
            }
            if let Some(win) = island::window(&handle) {
                island::make_non_activating(&win);
                dpi::place(&handle, &settings.screen, false);
                if let Ok(hwnd) = win.hwnd() {
                    unsafe {
                        windows::Win32::UI::Shell::SetWindowSubclass(
                            windows::Win32::Foundation::HWND(hwnd.0 as *mut _),
                            Some(mouse_activate_subclass),
                            0,
                            0,
                        );
                    }
                }
            }
            gate.collapsed.store(false, Ordering::Relaxed);
            gate.set_active(true);
            island::spawn_cursor_poll(handle.clone(), gate.clone());
            disari::baslat(handle.clone(), kart_gozcu.clone());
            glide::watch_fullscreen(handle.clone(), pet_runtime.clone(), gate.clone());
            questions::start(handle.clone());
            ipc::start(handle.clone());
            watch::start(handle, path.clone(), watcher.lock().unwrap().take());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("AfuNobet-UI başlatılamadı")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                app.state::<apps_runtime::Runtime>().stop();
                app.state::<SolVoiceState>().silence();
                app.state::<voice::VoiceState>().shutdown();
                let bridge = app.state::<Shared>().codex.lock().ok().and_then(|mut guard| guard.take());
                if let Some(bridge) = bridge { bridge.shutdown(); }
            }
        });
}

unsafe extern "system" fn mouse_activate_subclass(
    hwnd: windows::Win32::Foundation::HWND,
    msg: u32,
    wparam: windows::Win32::Foundation::WPARAM,
    lparam: windows::Win32::Foundation::LPARAM,
    _id: usize,
    _data: usize,
) -> windows::Win32::Foundation::LRESULT {
    if msg == windows::Win32::UI::WindowsAndMessaging::WM_MOUSEACTIVATE {
        return windows::Win32::Foundation::LRESULT(windows::Win32::UI::WindowsAndMessaging::MA_ACTIVATE as isize);
    }
    windows::Win32::UI::Shell::DefSubclassProc(hwnd, msg, wparam, lparam)
}
