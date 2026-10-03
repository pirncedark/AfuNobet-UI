use serde::Serialize;
use std::{path::Path, process::{Command, Stdio}, sync::{Arc, Mutex}, time::{Duration, Instant}};

#[derive(Clone, Serialize)]
pub struct Pill { pub service: String, pub status: String, pub label: String, pub url: Option<String> }
#[derive(Default)]
struct Cache { open: bool, last: Option<Duration>, pill: Option<Pill> }
pub struct Runtime { cache: Mutex<Cache>, started: Instant }
impl Default for Runtime { fn default() -> Self { Self { cache: Mutex::new(Cache::default()), started: Instant::now() } } }
impl Runtime {
    pub fn panel_open(&self, open: bool) {
        if let Ok(mut cache) = self.cache.lock() { cache.open = open; }
    }
    pub fn refresh_with(&self, now: Duration, query: impl FnOnce() -> Result<String, String>) -> Option<Pill> {
        // Closing is synchronous with the request gate: a request cannot start after close returns.
        let mut cache = self.cache.lock().ok()?;
        if !cache.open { return None; }
        if cache.last.is_some_and(|last| now.saturating_sub(last) < Duration::from_secs(60)) { return cache.pill.clone(); }
        cache.last = Some(now);
        let pill = parse_run(&query().unwrap_or_default());
        cache.pill = Some(pill.clone());
        Some(pill)
    }
}
pub fn parse_run(json: &str) -> Pill {
    let value: serde_json::Value = serde_json::from_str(json).unwrap_or_default();
    let run = value.as_array().and_then(|runs| runs.first());
    let status = match run.and_then(|r| r["status"].as_str()) {
        Some("queued" | "in_progress" | "waiting" | "pending" | "requested") => "running",
        Some("completed") => match run.and_then(|r| r["conclusion"].as_str()) {
            Some("success") => "success",
            Some("failure" | "timed_out" | "startup_failure" | "action_required") => "failure",
            _ => "unknown",
        },
        _ => "unknown",
    };
    let url = run.and_then(|r| r["url"].as_str()).filter(|url| {
        url.starts_with("https://github.com/") && !url.chars().any(|c| c.is_control() || c.is_whitespace())
    }).map(str::to_owned);
    let label = match status { "success" => "GitHub ✓", "failure" => "GitHub: kontrol başarısız", "running" => "GitHub: kontrol sürüyor", _ => "GitHub ?" };
    Pill { service: "github".into(), status: status.into(), label: label.into(), url }
}
pub fn gh_command(path: &Path) -> Command {
    let mut command = Command::new("gh");
    command.current_dir(path).args(["run", "list", "--limit", "1", "--json", "status,conclusion,url"])
        .env("GH_PROMPT_DISABLED", "1").env("GH_HTTP_TIMEOUT", "10").stdin(Stdio::null()).stderr(Stdio::null());
    #[cfg(windows)] { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
    command
}
fn query_github(path: &Path) -> Result<String, String> {
    // Bounded wait also covers gh hanging before it reaches its HTTP timeout.
    let mut child = gh_command(path).stdout(Stdio::piped()).spawn().map_err(|_| "GitHub durumu okunamadı.".to_owned())?;
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(50)),
            _ => { let _ = child.kill(); let _ = child.wait(); return Err("GitHub durumu okunamadı.".into()); }
        }
    }
    let output = child.wait_with_output().map_err(|_| "GitHub durumu okunamadı.".to_owned())?;
    if !output.status.success() { return Err("GitHub durumu okunamadı.".into()); }
    String::from_utf8(output.stdout).map_err(|_| "GitHub durumu okunamadı.".into())
}
#[tauri::command]
pub fn servis_panel_open(runtime: tauri::State<Arc<Runtime>>, open: bool) { runtime.panel_open(open); }
#[tauri::command]
pub async fn servis_github_refresh(runtime: tauri::State<'_, Arc<Runtime>>) -> Result<Option<Pill>, String> {
    let runtime = runtime.inner().clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).parent()?.parent()?;
        runtime.refresh_with(runtime.started.elapsed(), || query_github(root))
    }).await.ok().flatten())
}
