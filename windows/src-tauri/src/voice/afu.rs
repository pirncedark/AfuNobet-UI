//! Local voice adapter; the prototype owns synthesis, cleaning and the GPU lock.
use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}, process::{Command, Stdio}, sync::atomic::{AtomicU64, Ordering}, time::{Duration, Instant}};

pub const FALLBACK: &str = "Afu sesi hazır değil; Windows sesiyle devam ediyorum, daha sonra yeniden dene.";
pub const NOT_INSTALLED: &str = "Afu sesi kurulu değil, yazıyla devam ediyorum.";
const NAMES: [&str; 5] = ["afu_5b", "notr", "yumusak_sicak", "neseli_hareketli", "sakin_dogal"];
const FILTERS: [&str; 4] = ["sicak", "enerjik", "sakin", "yok"];
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Choice {
    pub ses: String,
    pub filtre: String,
    pub chosen: bool,
    #[serde(default)]
    pub available: Vec<String>,
    /// "sohbet" = nefes/es eklenir; boş/"okuma" = hızlı, süssüz okuma.
    #[serde(default, skip_serializing)]
    pub tarz: String,
}
impl Default for Choice {
    fn default() -> Self { Self { ses: "afu_5b".into(), filtre: "sicak".into(), chosen: false, available: vec!["afu_5b".into(), "notr".into()], tarz: String::new() } }
}
fn valid(ses: &str, filtre: &str) -> bool { NAMES.contains(&ses) && FILTERS.contains(&filtre) }
pub fn runtime() -> Option<PathBuf> {
    let mut starts = Vec::new();
    if let Ok(exe) = std::env::current_exe() { if let Some(parent) = exe.parent() { starts.push(parent.to_path_buf()); } }
    if let Ok(cwd) = std::env::current_dir() { starts.push(cwd); }
    for start in starts {
        for parent in start.ancestors() {
            let directory = parent.join("ses_deneme");
            if directory.join("uygulama_sesi.py").is_file() { return Some(directory); }
        }
    }
    None
}
pub fn choices(path: &Path, root: Option<&Path>) -> Choice {
    let mut choice = fs::read(path).ok().and_then(|b| serde_json::from_slice::<Choice>(&b).ok())
        .filter(|c| valid(&c.ses, &c.filtre)).unwrap_or_default();
    choice.available = vec!["afu_5b".into(), "notr".into()];
    if let Some(root) = root {
        let manifest = fs::read(root.join("ses_adaylari/presets.json")).ok()
            .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok());
        if let Some(manifest) = manifest {
            let presets = manifest.get("presets").unwrap_or(&manifest);
            for name in &NAMES[2..] { if presets.get(*name).is_some() { choice.available.push((*name).into()); } }
        }
    }
    choice
}
pub fn save_choice(path: &Path, root: Option<&Path>, ses: &str, filtre: &str) -> Result<Choice, String> {
    let mut choice = choices(path, root);
    if !valid(ses, filtre) || !choice.available.iter().any(|v| v == ses) {
        return Err("Seçilen ses hazır değil; başka bir ses seç.".into());
    }
    choice.ses = ses.into(); choice.filtre = filtre.into(); choice.chosen = true;
    let parent = path.parent().ok_or("Ses seçimi kaydedilemedi; yeniden dene.")?;
    fs::create_dir_all(parent).map_err(|_| "Ses seçimi kaydedilemedi; yeniden dene.")?;
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, serde_json::to_vec(&choice).map_err(|_| "Ses seçimi kaydedilemedi; yeniden dene.")?)
        .and_then(|_| fs::rename(&temporary, path)).map_err(|_| "Ses seçimi kaydedilemedi; yeniden dene.")?;
    Ok(choice)
}
#[derive(Deserialize)]
struct WorkerResult { ok: bool, cancelled: bool, text: String, #[serde(default)] missing_installation: bool }
pub enum Answer { Played, Cancelled, Fallback(String) }
pub fn job_directory() -> PathBuf {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos();
    std::env::temp_dir().join(format!("afu-voice-{}-{stamp}-{}", std::process::id(), COUNTER.fetch_add(1, Ordering::Relaxed)))
}
/// Geçici tanı: iptal kaynağını %TEMP%\afu-ses-iptal.log dosyasına yazar.
pub fn kayit(kaynak: &str) {
    use std::io::Write;
    let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(std::env::temp_dir().join("afu-ses-iptal.log")) { let _ = writeln!(f, "{t} {kaynak}"); }
}
pub fn cancel(directory: &Path) { let _ = fs::write(directory.join("cancel"), b""); }
fn resolve_interpreter(root: &Path, configured: Option<&Path>, exe: Option<&Path>) -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(path) = configured { candidates.push(path.to_path_buf()); }
    if let Some(parent) = exe.and_then(Path::parent) {
        candidates.push(parent.join("ses/cbenv/Scripts/python.exe"));
    }
    if let Some(project) = root.parent() {
        candidates.push(project.join("ses/cbenv/Scripts/python.exe"));
        if let Some(parent) = project.parent() { candidates.push(parent.join("_deneme/ses/cbenv/Scripts/python.exe")); }
    }
    for parent in root.ancestors() {
        candidates.push(parent.join("_deneme/ses/cbenv/Scripts/python.exe"));
    }
    // Keep the older development virtual environments as last-resort compatibility.
    candidates.push(root.join(".venv/Scripts/python.exe"));
    if let Some(project) = root.parent() { candidates.push(project.join(".venv/Scripts/python.exe")); }
    candidates.into_iter().find(|p| p.is_file())
}
fn interpreter(root: &Path) -> Option<PathBuf> {
    let configured = std::env::var_os("AFU_SES_PYTHON").filter(|s| !s.is_empty()).map(PathBuf::from);
    let exe = std::env::current_exe().ok();
    resolve_interpreter(root, configured.as_deref(), exe.as_deref())
}
// A killed worker's lock may be removed only after wait confirms that exact owner exited.
fn release_exited_lock(root: &Path, pid: u32) {
    let path = root.join(".gpu.lock");
    if fs::read_to_string(&path).ok().and_then(|s| s.trim().parse::<u32>().ok()) == Some(pid) { let _ = fs::remove_file(path); }
}
// Launchers (Windows Store / install-manager python.exe, venv redirectors) run the real
// interpreter as a child, so the lock may name a grandchild; remove it only once that owner exited.
#[cfg(windows)]
fn release_dead_lock(root: &Path) {
    use windows::Win32::Foundation::{CloseHandle, STILL_ACTIVE};
    use windows::Win32::System::Threading::{GetExitCodeProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
    let path = root.join(".gpu.lock");
    let Some(pid) = fs::read_to_string(&path).ok().and_then(|s| s.trim().parse::<u32>().ok()) else { return; };
    let alive = unsafe {
        match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            Ok(handle) => {
                let mut code = 0u32;
                let known = GetExitCodeProcess(handle, &mut code).is_ok();
                let _ = CloseHandle(handle);
                !known || code == STILL_ACTIVE.0 as u32
            }
            // A missing process cannot be opened; any other failure keeps the lock.
            Err(error) => error.code() != windows::Win32::Foundation::E_INVALIDARG,
        }
    };
    if !alive { let _ = fs::remove_file(path); }
}
// Stop the whole worker tree, not only a launcher that would leave the interpreter running.
fn kill_worker(child: &mut std::process::Child) {
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        let _ = Command::new("taskkill").args(["/PID", &child.id().to_string(), "/T", "/F"])
            .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null())
            .creation_flags(0x08000000).status();
    }
    let _ = child.kill();
}
/// Uygulama açılırken ses sunucusunu arka planda başlatır; model bellekte hazır bekler.
pub fn sunucu_baslat() {
    std::thread::spawn(|| {
        let Some(root) = runtime() else { return; };
        let Some(python) = interpreter(&root) else { return; };
        let mut command = Command::new(python);
        command.args(["-B"]).arg(root.join("uygulama_sesi_sunucu.py")).arg("--hazirla")
            .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
        #[cfg(windows)] { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
        let _ = command.spawn();
    });
}
/// Telefon için: sesi çalmadan WAV olarak üretir (Afu sesi, ses sunucusu üzerinden).
pub fn uret_wav(text: &str, tarz: &str) -> Result<Vec<u8>, String> {
    let root = runtime().ok_or("Afu sesi kurulu değil.")?;
    let python = interpreter(&root);
    let directory = job_directory();
    fs::create_dir_all(&directory).map_err(|_| "Ses hazırlanamadı.".to_owned())?;
    let mut choice = Choice::default();
    choice.tarz = tarz.into();
    let generation = AtomicU64::new(1);
    let sonuc = speak_worker(Some(&root), &directory, &choice, text, &generation, 1, python.as_deref(), true);
    let bayt = fs::read(directory.join("answer.wav"));
    let _ = fs::remove_dir_all(&directory);
    match (sonuc, bayt) {
        (Answer::Played, Ok(b)) => Ok(b),
        _ => Err("Ses üretilemedi. Yeniden dene.".into()),
    }
}
pub fn speak(root: Option<&Path>, directory: &Path, choice: &Choice, text: &str, generation: &AtomicU64, ticket: u64) -> Answer {
    let python = root.and_then(interpreter);
    speak_with_interpreter(root, directory, choice, text, generation, ticket, python.as_deref())
}
fn speak_with_interpreter(root: Option<&Path>, directory: &Path, choice: &Choice, text: &str, generation: &AtomicU64, ticket: u64, python: Option<&Path>) -> Answer {
    speak_worker(root, directory, choice, text, generation, ticket, python, false)
}
#[cfg(test)]
pub fn speak_headless(root: &Path, directory: &Path, text: &str, generation: &AtomicU64) -> Answer {
    let python = interpreter(root);
    speak_worker(Some(root), directory, &Choice::default(), text, generation, 1, python.as_deref(), true)
}
fn speak_worker(root: Option<&Path>, directory: &Path, choice: &Choice, text: &str, generation: &AtomicU64, ticket: u64, python: Option<&Path>, headless: bool) -> Answer {
    let fallback = || Answer::Fallback("Ayrıntıları ekranda görebilirsin.".into());
    if generation.load(Ordering::Acquire) != ticket { return Answer::Cancelled; }
    let (Some(root), Some(python)) = (root, python) else { return Answer::Fallback(NOT_INSTALLED.into()); };
    let request = serde_json::json!({"text":text,"ses":choice.ses,"filtre":choice.filtre,"headless":headless,"tarz":choice.tarz});
    if fs::write(directory.join("request.json"), request.to_string()).is_err() { return fallback(); }
    let mut command = Command::new(python);
    command.args(["-B"]).arg(root.join("uygulama_sesi.py")).arg(directory)
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
    #[cfg(windows)] { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
    let Ok(mut child) = command.spawn() else { return fallback(); };
    let deadline = Instant::now() + Duration::from_secs(600);
    let mut cancel_deadline = None;
    loop {
        if generation.load(Ordering::Acquire) != ticket {
            cancel(directory);
            // Allow cooperative playback/lock cleanup, then stop stuck model generation.
            cancel_deadline.get_or_insert_with(|| Instant::now() + Duration::from_secs(2));
        }
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) if Instant::now() < deadline && cancel_deadline.map(|d| Instant::now() < d).unwrap_or(true) => std::thread::sleep(Duration::from_millis(50)),
            _ => {
                cancel(directory);
                kill_worker(&mut child);
                if child.wait().is_ok() {
                    release_exited_lock(root, child.id());
                    #[cfg(windows)] release_dead_lock(root);
                }
                break;
            }
        }
    }
    if generation.load(Ordering::Acquire) != ticket { return Answer::Cancelled; }
    let result = fs::read(directory.join("result.json")).ok().and_then(|b| serde_json::from_slice::<WorkerResult>(&b).ok());
    match result {
        Some(r) if r.cancelled => Answer::Cancelled,
        Some(r) if r.missing_installation => Answer::Fallback(NOT_INSTALLED.into()),
        Some(r) if r.ok => Answer::Played,
        Some(r) => Answer::Fallback(r.text),
        None => fallback(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn worktree_finds_shared_interpreter() {
        let dir = job_directory();
        let root = dir.join("_wt/w9-ses/ses_deneme");
        let shared = dir.join("_deneme/ses/cbenv/Scripts/python.exe");
        fs::create_dir_all(&root).unwrap();
        fs::create_dir_all(shared.parent().unwrap()).unwrap();
        fs::write(&shared, b"placeholder").unwrap();
        assert_eq!(resolve_interpreter(&root, None, None), Some(shared));
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn interpreter_paths_follow_portable_priority_and_skip_missing_files() {
        let dir = job_directory();
        let root = dir.join("project/ses_deneme");
        let exe = dir.join("moved/app.exe");
        let portable = dir.join("moved/ses/cbenv/Scripts/python.exe");
        let legacy = dir.join("_deneme/ses/cbenv/Scripts/python.exe");
        let configured = dir.join("custom/python.exe");
        fs::create_dir_all(&root).unwrap();
        for path in [&portable, &legacy, &configured] {
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::write(path, b"test placeholder, never executed").unwrap();
        }
        assert_eq!(resolve_interpreter(&root, Some(&configured), Some(&exe)), Some(configured.clone()));
        fs::remove_file(&configured).unwrap();
        assert_eq!(resolve_interpreter(&root, Some(&configured), Some(&exe)), Some(portable.clone()));
        fs::remove_file(&portable).unwrap();
        assert_eq!(resolve_interpreter(&root, None, Some(&exe)), Some(legacy.clone()));
        fs::remove_file(&legacy).unwrap();
        assert_eq!(resolve_interpreter(&root, None, Some(&exe)), None);
        assert_eq!(resolve_interpreter(&root, None, None), None);
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn missing_voice_returns_text_only_notice() {
        match speak(None, Path::new("missing"), &Choice::default(), "Metin yanıtı", &AtomicU64::new(1), 1) {
            Answer::Fallback(text) => assert_eq!(text, "Afu sesi kurulu değil, yazıyla devam ediyorum."),
            _ => panic!("missing voice must return a notice"),
        }
    }
    #[test]
    fn missing_interpreter_never_starts_worker() {
        let dir = job_directory();
        match speak_with_interpreter(Some(&dir), &dir, &Choice::default(), "Metin yanıtı", &AtomicU64::new(1), 1, None) {
            Answer::Fallback(text) => assert_eq!(text, NOT_INSTALLED),
            _ => panic!("missing interpreter must preserve text mode"),
        }
        assert!(!dir.exists(), "missing installation must not create a worker request");
    }
    #[test]
    #[cfg(windows)]
    fn stalled_generation_is_stopped_promptly_and_releases_its_lock() {
        let root = job_directory(); fs::create_dir_all(&root).unwrap();
        // Stay stalled well beyond the test budgets so natural exit cannot pass the test.
        fs::write(root.join("uygulama_sesi.py"), "import os, pathlib, time\np = pathlib.Path(__file__).parent\n(p / '.gpu.lock').write_text(str(os.getpid()))\ntime.sleep(120)\n").unwrap();
        let generation = std::sync::Arc::new(AtomicU64::new(1));
        let signal = generation.clone(); let watched = root.clone();
        let canceller = std::thread::spawn(move || {
            // Wait for a complete lock, allowing slow CI to start Python first.
            let deadline = Instant::now() + Duration::from_secs(30);
            let lock_ready = loop {
                if fs::read_to_string(watched.join(".gpu.lock")).ok()
                    .and_then(|s| s.trim().parse::<u32>().ok()).is_some() { break true; }
                if Instant::now() >= deadline { break false; }
                std::thread::sleep(Duration::from_millis(10));
            };
            let cancelled_at = Instant::now();
            signal.store(2, Ordering::Release);
            (lock_ready, cancelled_at)
        });
        let result = speak_with_interpreter(Some(&root), &root, &Choice::default(), "Merhaba", &generation, 1, Some(Path::new("python.exe")));
        let (lock_ready, cancelled_at) = canceller.join().unwrap();
        let elapsed = cancelled_at.elapsed(); let leftover = root.join(".gpu.lock").exists();
        fs::remove_dir_all(&root).unwrap();
        assert!(lock_ready, "worker did not acquire its GPU lock before cancellation");
        assert!(matches!(result, Answer::Cancelled));
        // Measure cancellation only, with ample scheduler headroom on slow CI.
        assert!(elapsed < Duration::from_secs(30), "cancel waited {elapsed:?}");
        assert!(!leftover, "exited worker kept its GPU lock");
    }
    #[test]
    fn selection_survives_restart_and_defaults_are_unchosen() {
        let dir = job_directory(); fs::create_dir_all(dir.join("ses_adaylari")).unwrap();
        fs::write(dir.join("ses_adaylari/presets.json"), r#"{"presets":{"sakin_dogal":{}}}"#).unwrap();
        let path = dir.join("voice.json");
        let defaults = choices(&path, Some(&dir));
        assert_eq!(defaults.ses, "afu_5b"); assert_eq!(defaults.filtre, "sicak"); assert!(!defaults.chosen);
        assert_eq!(defaults.available, vec!["afu_5b", "notr", "sakin_dogal"]);
        save_choice(&path, Some(&dir), "afu_5b", "sicak").unwrap();
        assert_eq!(choices(&path, Some(&dir)).ses, "afu_5b");
        save_choice(&path, Some(&dir), "sakin_dogal", "sicak").unwrap();
        let reloaded = choices(&path, Some(&dir));
        assert!(reloaded.chosen); assert_eq!(reloaded.ses, "sakin_dogal");
        assert!(save_choice(&path, Some(&dir), "missing", "sicak").is_err());
        assert_eq!(choices(&path, Some(&dir)).ses, "sakin_dogal");
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn cancelled_request_never_starts_worker_or_falls_back() {
        assert!(matches!(speak(None, Path::new("missing"), &Choice::default(), "kod", &AtomicU64::new(2), 1), Answer::Cancelled));
    }
    #[test]
    fn missing_runtime_cannot_read_raw_code_aloud() {
        match speak(None, Path::new("missing"), &Choice::default(), "secret code", &AtomicU64::new(1), 1) {
            Answer::Fallback(text) => { assert!(!text.contains("secret")); assert!(!text.is_empty()); },
            _ => panic!("explicit fallback required"),
        }
    }
    #[test]
    fn cleanup_keeps_another_process_gpu_lock() {
        let dir = job_directory(); fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(".gpu.lock"), "123").unwrap();
        release_exited_lock(&dir, 124); assert!(dir.join(".gpu.lock").exists());
        release_exited_lock(&dir, 123); assert!(!dir.join(".gpu.lock").exists());
        #[cfg(windows)] {
            fs::write(dir.join(".gpu.lock"), std::process::id().to_string()).unwrap();
            release_dead_lock(&dir); assert!(dir.join(".gpu.lock").exists(), "live owner keeps its lock");
        }
        fs::remove_dir_all(dir).unwrap();
    }
}
