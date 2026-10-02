// Codex app-server: yalnız kullanıcı eylemiyle başlar; ana uygulama token görmez.
use serde::Serialize;
use serde_json::{json, Value};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::{
    collections::HashMap,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, Command, Stdio},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc::{self, Sender},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
pub const MAX_FRAME: usize = 1024 * 1024;
const TIMEOUT: Duration = Duration::from_secs(30);
#[derive(Debug, Clone, PartialEq)]
pub enum CodexHata {
    Bulunamadi,
    OturumYok,
    Protokol,
    Kapandi,
    ZamanAsimi,
    GecersizGirdi,
    Mesgul,
}
pub fn durum_metni(e: &CodexHata) -> &'static str {
    match e {
        CodexHata::Bulunamadi => "Codex bulunamadı.",
        CodexHata::OturumYok => "Codex oturumu açık değil. Oturum açın.",
        CodexHata::ZamanAsimi => "Codex yanıt vermedi. Tekrar deneyin.",
        CodexHata::GecersizGirdi => "Mesaj veya dosya okunamadı. Seçiminizi kontrol edin.",
        CodexHata::Mesgul => "Codex yanıt hazırlıyor. Tamamlanmasını bekleyin.",
        _ => "Codex bağlantısı kesildi. Tekrar deneyin.",
    }
}
#[derive(Default)]
pub struct Cerceve {
    buffer: Vec<u8>,
}
impl Cerceve {
    pub fn besle(&mut self, bytes: &[u8]) -> Result<Vec<Value>, CodexHata> {
        let mut out = Vec::new();
        for &b in bytes {
            if b == b'\n' {
                if !self.buffer.is_empty() {
                    let v =
                        serde_json::from_slice(&self.buffer).map_err(|_| CodexHata::Protokol)?;
                    self.buffer.clear();
                    out.push(v);
                }
            } else {
                if self.buffer.len() >= MAX_FRAME {
                    self.buffer.clear();
                    return Err(CodexHata::Protokol);
                }
                self.buffer.push(b);
            }
        }
        Ok(out)
    }
}
#[derive(Clone, Serialize)]
pub struct CodexEvent {
    pub method: String,
    pub params: Value,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexStatus {
    pub status: String,
    pub logged_in: bool,
    pub plan_type: Option<String>,
    pub rate_limits: Value,
}
pub fn status_from_account(v: &Value) -> CodexStatus {
    let a = &v["account"];
    let logged = a["type"] == "chatgpt";
    CodexStatus {
        status: if logged { "hazir" } else { "oturum_yok" }.into(),
        logged_in: logged,
        plan_type: if logged {
            a["planType"].as_str().map(str::to_owned)
        } else {
            None
        },
        rate_limits: Value::Null,
    }
}
fn safe_window(v: &Value) -> Value {
    if !v.is_object() {
        return Value::Null;
    }
    json!({"usedPercent":v["usedPercent"].as_f64(),"windowDurationMins":v["windowDurationMins"].as_u64(),"resetsAt":v["resetsAt"].as_i64()})
}
pub fn safe_limits(v: &Value) -> Value {
    let bucket = v["rateLimitsByLimitId"]["codex"]
        .as_object()
        .map(|_| &v["rateLimitsByLimitId"]["codex"])
        .unwrap_or(&v["rateLimits"]);
    json!({"primary":safe_window(&bucket["primary"]),"secondary":safe_window(&bucket["secondary"])})
}
pub fn safe_event(method: &str, p: &Value) -> Option<CodexEvent> {
    let params = match method {
        "item/agentMessage/delta" => {
            json!({"threadId":p["threadId"].as_str(),"turnId":p["turnId"].as_str(),"itemId":p["itemId"].as_str(),"delta":p["delta"].as_str().unwrap_or("")})
        }
        "turn/started" | "turn/completed" => {
            json!({"threadId":p["threadId"].as_str(),"turn":{"id":p["turn"]["id"].as_str(),"status":p["turn"]["status"].as_str()}})
        }
        "account/rateLimits/updated" => safe_limits(p),
        "account/login/completed" => json!({"success":p["success"].as_bool().unwrap_or(false)}),
        "error" => {
            json!({"threadId":p["threadId"].as_str(),"turnId":p["turnId"].as_str(),"willRetry":p["willRetry"].as_bool().unwrap_or(false),"message":"Codex yanıtı tamamlayamadı. Tekrar deneyin."})
        }
        _ => return None,
    };
    Some(CodexEvent {
        method: method.into(),
        params,
    })
}
// EOF kimlikleri temizlenmeden önce alınır; sohbet yalnız kendi yanıtını bitirir.
pub fn stream_closed_event(active: &Mutex<Option<(String, String)>>) -> CodexEvent {
    let current = active.lock().ok().and_then(|mut a| a.take());
    let (thread_id, turn_id) = match current {
        Some((thread_id, turn_id)) => (Some(thread_id), Some(turn_id)),
        None => (None, None),
    };
    safe_event(
        "error",
        &json!({"threadId":thread_id,"turnId":turn_id,"willRetry":false}),
    )
    .unwrap()
}
// Yerel codex-cli 0.159.2 generate-json-schema --experimental: ThreadStartParams.config
// TOML anahtarlarını taşır; ConfigReadResponse.layers[].config tam katmanları verir.
// Yapılandırma anahtarları yerel CLI'de doğrulandı; enabled=false MCP'yi kapatır:
// https://developers.openai.com/codex/config-reference
const DISABLED_FEATURES: &[&str] = &["shell_tool", "unified_exec", "plugins", "enable_mcp_apps"];
/// Ana süreç kullanıcı hesabının yapılandırmasını değiştirmez; geçici CLI override kullanır.
pub fn app_server_args() -> Vec<String> {
    let mut args = vec!["app-server".into()];
    for override_text in [
        "sandbox_mode=\"read-only\"",
        "approval_policy=\"never\"",
        "web_search=\"disabled\"",
    ] {
        args.extend(["-c".into(), override_text.into()]);
    }
    for feature in DISABLED_FEATURES {
        args.extend(["-c".into(), format!("features.{feature}=false")]);
    }
    args
}
/// Boş tablo mirastaki MCP girişlerini silmez; her etkili katmandaki kimlik ayrı kapatılır.
/// Sırları kopyalamaz veya dışarı yayınlamaz; yalnız adlardan kapalı tablolar üretir.
pub fn disabled_tool_config(response: &Value) -> Result<Value, CodexHata> {
    let mut sources = vec![response
        .get("config")
        .and_then(Value::as_object)
        .ok_or(CodexHata::Protokol)?];
    match response.get("layers") {
        None | Some(Value::Null) => {}
        Some(Value::Array(layers)) => {
            for layer in layers {
                sources.push(
                    layer
                        .get("config")
                        .and_then(Value::as_object)
                        .ok_or(CodexHata::Protokol)?,
                );
            }
        }
        _ => return Err(CodexHata::Protokol),
    }
    let mut mcp = serde_json::Map::new();
    let mut apps = serde_json::Map::new();
    for source in sources {
        for (field, output) in [("mcp_servers", &mut mcp), ("apps", &mut apps)] {
            if let Some(value) = source.get(field) {
                let table = value.as_object().ok_or(CodexHata::Protokol)?;
                for (name, value) in table {
                    if name.is_empty()
                        || name.len() > 255
                        || name.chars().any(char::is_control)
                        || !value.is_object()
                    {
                        return Err(CodexHata::Protokol);
                    }
                    output.insert(name.clone(), json!({"enabled":false}));
                }
            }
        }
    }
    if mcp.len() > 512 || apps.len() > 512 {
        return Err(CodexHata::Protokol);
    }
    apps.insert("_default".into(), json!({"enabled":false}));
    let features: serde_json::Map<String, Value> = DISABLED_FEATURES
        .iter()
        .map(|key| ((*key).to_owned(), Value::Bool(false)))
        .collect();
    Ok(json!({"web_search":"disabled","features":features,"mcp_servers":mcp,"apps":apps}))
}
pub fn thread_params_with_config(cwd: &Path, config: Value) -> Value {
    json!({"cwd":cwd,"sandbox":"read-only","approvalPolicy":"never","ephemeral":true,
        "config":config,
        "developerInstructions":"Senin adın Afu. Türkçe, sıcak, tatlı, neşeli ve doğal konuşan bir asistansın. Kısa cevap ver. Yalnız sohbet ve okuma yap. Dosya değiştirme, komut çalıştırma, harici araç veya MCP kullanma."})
}
pub fn thread_params(cwd: &Path) -> Value {
    thread_params_with_config(cwd, disabled_tool_config(&json!({"config":{}})).unwrap())
}
pub fn build_input(text: &str, attachments: &[String]) -> Result<Vec<Value>, CodexHata> {
    if (text.trim().is_empty() && attachments.is_empty())
        || text.len() > 64 * 1024
        || attachments.len() > 8
    {
        return Err(CodexHata::GecersizGirdi);
    }
    let mut input = vec![json!({"type":"text","text":text})];
    let mut total = text.len();
    for raw in attachments {
        let path = Path::new(raw);
        if !path.is_absolute() {
            return Err(CodexHata::GecersizGirdi);
        }
        let path = path.canonicalize().map_err(|_| CodexHata::GecersizGirdi)?;
        let size = path.metadata().map_err(|_| CodexHata::GecersizGirdi)?;
        if !size.is_file() || size.len() > 8 * 1024 * 1024 {
            return Err(CodexHata::GecersizGirdi);
        }
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if ["png", "jpg", "jpeg", "webp", "gif"].contains(&ext.as_str()) {
            input.push(json!({"type":"localImage","path":path}));
        } else {
            if ![
                "txt", "md", "json", "csv", "rs", "ts", "js", "py", "html", "css",
            ]
            .contains(&ext.as_str())
                || size.len() > 128 * 1024
            {
                return Err(CodexHata::GecersizGirdi);
            }
            let data = std::fs::read_to_string(&path).map_err(|_| CodexHata::GecersizGirdi)?;
            total += data.len();
            if total > 256 * 1024 {
                return Err(CodexHata::GecersizGirdi);
            }
            let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("Dosya");
            input.push(json!({"type":"text","text":format!("Ek dosya: {name}\n{data}")}));
        }
    }
    Ok(input)
}
pub type Pending = Arc<Mutex<HashMap<u64, Sender<Result<Value, CodexHata>>>>>;
type Callback = Arc<dyn Fn(CodexEvent) + Send + Sync>;
fn deliver_result(p: &Pending, id: u64, msg: &Value) {
    if let Ok(mut pending) = p.lock() {
        if let Some(tx) = pending.remove(&id) {
            let _ = tx.send(if msg.get("error").is_some() {
                Err(CodexHata::Protokol)
            } else {
                Ok(msg["result"].clone())
            });
        }
    }
}
fn await_result(
    rx: mpsc::Receiver<Result<Value, CodexHata>>,
    timeout: Duration,
) -> Result<Value, CodexHata> {
    rx.recv_timeout(timeout).map_err(|e| match e {
        mpsc::RecvTimeoutError::Timeout => CodexHata::ZamanAsimi,
        _ => CodexHata::Kapandi,
    })?
}
fn write_message(stdin: &Mutex<ChildStdin>, v: &Value) -> Result<(), CodexHata> {
    let bytes = serde_json::to_vec(v).map_err(|_| CodexHata::Protokol)?;
    if bytes.len() > MAX_FRAME {
        return Err(CodexHata::GecersizGirdi);
    }
    let mut w = stdin.lock().map_err(|_| CodexHata::Kapandi)?;
    w.write_all(&bytes)
        .and_then(|_| w.write_all(b"\n"))
        .and_then(|_| w.flush())
        .map_err(|_| CodexHata::Kapandi)
}
pub fn close_pending(p: &Pending, err: CodexHata) {
    if let Ok(mut guard) = p.lock() {
        for (_, s) in guard.drain() {
            let _ = s.send(Err(err.clone()));
        }
    }
}
pub fn resolve_exe() -> Option<PathBuf> {
    if let Some(p) = std::env::var_os("APPDATA") {
        let p=PathBuf::from(p).join("npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe");
        if p.is_file() {
            return Some(p);
        }
    }
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths)
            .map(|p| p.join("codex.exe"))
            .find(|p| p.is_file())
    })
}
pub struct CodexBridge {
    closed: Arc<AtomicBool>,
    child: Mutex<Option<Child>>,
    stdin: Option<Arc<Mutex<ChildStdin>>>,
    pending: Pending,
    next: AtomicU64,
    reader: Mutex<Option<thread::JoinHandle<()>>>,
    active: Arc<Mutex<Option<(String, String)>>>,
    thread_id: Mutex<Option<(String, PathBuf)>>,
    send_gate: Mutex<()>,
    login_id: Mutex<Option<String>>,
}
impl CodexBridge {
    pub fn start() -> Result<Self, CodexHata> {
        Self::start_with_callback(Arc::new(|_| {}))
    }
    pub fn start_with_callback(callback: Callback) -> Result<Self, CodexHata> {
        let exe = resolve_exe().ok_or(CodexHata::Bulunamadi)?;
        let mut cmd = Command::new(exe);
        cmd.args(app_server_args())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);
        let mut child = cmd.spawn().map_err(|_| CodexHata::Bulunamadi)?;
        let stdin = Arc::new(Mutex::new(child.stdin.take().ok_or(CodexHata::Kapandi)?));
        let mut stdout = child.stdout.take().ok_or(CodexHata::Kapandi)?;
        let pending: Pending = Arc::new(Mutex::new(HashMap::new()));
        let active = Arc::new(Mutex::new(None));
        let closed = Arc::new(AtomicBool::new(false));
        let rc = closed.clone();
        let (rp, ri, ra) = (pending.clone(), stdin.clone(), active.clone());
        let reader = thread::spawn(move || {
            let mut frame = Cerceve::default();
            let mut buf = [0u8; 8192];
            loop {
                let n = match stdout.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => n,
                };
                let msgs = match frame.besle(&buf[..n]) {
                    Ok(v) => v,
                    Err(e) => {
                        close_pending(&rp, e);
                        break;
                    }
                };
                for msg in msgs {
                    if msg.get("id").is_some() {
                        if let Some(method) = msg["method"].as_str() {
                            // Sunucudan gelen araç/izin isteklerini hiçbir zaman otomatik onaylama.
                            let _ = method;
                            let _ = write_message(
                                &ri,
                                &json!({"id":msg["id"],"error":{"code":-32601,"message":"Afu sohbeti araç ve izin isteklerini desteklemiyor."}}),
                            );
                        } else if let Some(id) = msg["id"].as_u64() {
                            deliver_result(&rp, id, &msg);
                        }
                    } else if let Some(method) = msg["method"].as_str() {
                        let p = &msg["params"];
                        if method == "turn/started" {
                            if let (Some(id), Some(thread)) =
                                (p["turn"]["id"].as_str(), p["threadId"].as_str())
                            {
                                if let Ok(mut a) = ra.lock() {
                                    *a = Some((thread.into(), id.into()));
                                }
                            }
                        }
                        if method == "turn/completed" {
                            if let Ok(mut a) = ra.lock() {
                                *a = None;
                            }
                        }
                        if let Some(e) = safe_event(method, p) {
                            callback(e);
                        }
                    }
                }
            }
            rc.store(true, Ordering::Release);
            close_pending(&rp, CodexHata::Kapandi);
            callback(stream_closed_event(&ra));
        });
        let bridge = Self {
            closed,
            child: Mutex::new(Some(child)),
            stdin: Some(stdin),
            pending,
            next: AtomicU64::new(1),
            reader: Mutex::new(Some(reader)),
            active,
            thread_id: Mutex::new(None),
            send_gate: Mutex::new(()),
            login_id: Mutex::new(None),
        };
        bridge.request("initialize",json!({"clientInfo":{"name":"afunobet_ui","version":env!("CARGO_PKG_VERSION")},"capabilities":{"experimentalApi":false}}))?;
        write_message(
            bridge.stdin.as_ref().ok_or(CodexHata::Kapandi)?,
            &json!({"method":"initialized"}),
        )?;
        Ok(bridge)
    }
    pub fn request(&self, method: &str, params: Value) -> Result<Value, CodexHata> {
        if self.closed.load(Ordering::Acquire) {
            return Err(CodexHata::Kapandi);
        }
        let id = self.next.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = mpsc::channel();
        self.pending
            .lock()
            .map_err(|_| CodexHata::Kapandi)?
            .insert(id, tx);
        if self.closed.load(Ordering::Acquire) {
            self.pending.lock().unwrap().remove(&id);
            return Err(CodexHata::Kapandi);
        }
        if let Err(e) = write_message(
            self.stdin.as_ref().ok_or(CodexHata::Kapandi)?,
            &json!({"id":id,"method":method,"params":params}),
        ) {
            self.pending.lock().unwrap().remove(&id);
            return Err(e);
        }
        let result = await_result(rx, TIMEOUT);
        self.pending.lock().unwrap().remove(&id);
        result
    }
    pub fn status(&self) -> Result<CodexStatus, CodexHata> {
        let mut s =
            status_from_account(&self.request("account/read", json!({"refreshToken":false}))?);
        if s.logged_in {
            if let Ok(v) = self.request("account/rateLimits/read", json!({})) {
                s.rate_limits = safe_limits(&v);
            }
        }
        Ok(s)
    }
    pub fn send(&self, text: &str, attachments: &[String], cwd: &Path) -> Result<Value, CodexHata> {
        // İkinci Gönder başlamaz; iptal ve durum sorgusu bu kilide ihtiyaç duymaz.
        let _send = self.send_gate.try_lock().map_err(|_| CodexHata::Mesgul)?;
        let input = build_input(text, attachments)?;
        if self
            .active
            .lock()
            .map_err(|_| CodexHata::Kapandi)?
            .is_some()
        {
            return Err(CodexHata::Mesgul);
        }
        if !cwd.is_absolute() || !cwd.is_dir() {
            return Err(CodexHata::GecersizGirdi);
        }
        let cwd = cwd.canonicalize().map_err(|_| CodexHata::GecersizGirdi)?;
        if !self.status()?.logged_in {
            return Err(CodexHata::OturumYok);
        }
        let existing = self
            .thread_id
            .lock()
            .map_err(|_| CodexHata::Kapandi)?
            .clone();
        let id = if let Some((id, _)) = existing.filter(|(_, p)| p == &cwd) {
            id
        } else {
            // Okuma başarısızsa veya bozuksa araç mirası bilinmediğinden thread başlamaz.
            let effective = self.request("config/read", json!({"includeLayers":true,"cwd":cwd}))?;
            let config = disabled_tool_config(&effective)?;
            let v = self.request("thread/start", thread_params_with_config(&cwd, config))?;
            let id = v["thread"]["id"]
                .as_str()
                .ok_or(CodexHata::Protokol)?
                .to_owned();
            *self.thread_id.lock().map_err(|_| CodexHata::Kapandi)? =
                Some((id.clone(), cwd.clone()));
            id
        };
        *self.active.lock().map_err(|_| CodexHata::Kapandi)? = Some((id.clone(), String::new()));
        let result=self.request("turn/start",json!({"threadId":id,"input":input,"cwd":cwd,"approvalPolicy":"never","sandboxPolicy":{"type":"readOnly","networkAccess":false}}));
        let v = match result {
            Ok(v) => v,
            Err(e) => {
                *self.active.lock().unwrap() = None;
                return Err(e);
            }
        };
        let turn = match v["turn"]["id"].as_str() {
            Some(t) => t.to_owned(),
            None => {
                *self.active.lock().unwrap() = None;
                return Err(CodexHata::Protokol);
            }
        };
        if let Ok(mut active) = self.active.lock() {
            if active.is_some() {
                *active = Some((id.clone(), turn.clone()));
            }
        }
        Ok(json!({"threadId":id,"turnId":turn}))
    }
    pub fn cancel(&self) -> Result<Value, CodexHata> {
        let a = self.active.lock().map_err(|_| CodexHata::Kapandi)?.clone();
        if let Some((thread_id, turn_id)) = a {
            if turn_id.is_empty() {
                return Err(CodexHata::Mesgul);
            }
            self.request(
                "turn/interrupt",
                json!({"threadId":thread_id,"turnId":turn_id}),
            )
        } else {
            Ok(json!({}))
        }
    }
    pub fn login_start(&self) -> Result<String, CodexHata> {
        let v = self.request("account/login/start", json!({"type":"chatgpt"}))?;
        let url = v["authUrl"].as_str().ok_or(CodexHata::Protokol)?;
        if !url.starts_with("https://auth.openai.com/") {
            return Err(CodexHata::Protokol);
        }
        *self.login_id.lock().map_err(|_| CodexHata::Kapandi)? =
            v["loginId"].as_str().map(str::to_owned);
        Ok(url.into())
    }
    pub fn login_cancel(&self) -> Result<Value, CodexHata> {
        let id = self.login_id.lock().map_err(|_| CodexHata::Kapandi)?.take();
        if let Some(id) = id {
            self.request("account/login/cancel", json!({"loginId":id}))
        } else {
            Ok(json!({}))
        }
    }
}
impl CodexBridge {
    /// Arc kopyaları yaşasa bile yalnız bu köprünün sahip olduğu alt süreç kapanır.
    pub fn shutdown(&self) {
        self.closed.store(true, Ordering::Release);
        close_pending(&self.pending, CodexHata::Kapandi);
        if let Ok(mut active) = self.active.lock() {
            *active = None;
        }
        if let Ok(mut slot) = self.child.lock() {
            if let Some(mut child) = slot.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
        // Callback aynı köprüyü kapatırsa join boyunca okuyucu kilidi tutulmaz.
        let reader = self.reader.lock().ok().and_then(|mut slot| slot.take());
        if let Some(reader) = reader {
            if reader.thread().id() != thread::current().id() {
                let _ = reader.join();
            }
        }
    }
}
impl Drop for CodexBridge {
    fn drop(&mut self) {
        self.shutdown();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shutdown_is_explicit_idempotent_even_when_arc_clone_survives() {
        let pending: Pending = Arc::new(Mutex::new(HashMap::new()));
        let (sender, receiver) = mpsc::channel();
        pending.lock().unwrap().insert(1, sender);
        let bridge = Arc::new(CodexBridge {
            closed: Arc::new(AtomicBool::new(false)),
            child: Mutex::new(None),
            stdin: None,
            pending,
            next: AtomicU64::new(1),
            reader: Mutex::new(None),
            active: Arc::new(Mutex::new(Some(("thread".into(), "turn".into())))),
            thread_id: Mutex::new(None),
            send_gate: Mutex::new(()),
            login_id: Mutex::new(None),
        });
        let clone = bridge.clone();
        bridge.shutdown();
        bridge.shutdown();
        assert!(clone.closed.load(Ordering::Acquire));
        assert_eq!(receiver.recv().unwrap(), Err(CodexHata::Kapandi));
        assert!(clone.active.lock().unwrap().is_none());
        assert_eq!(
            clone.request("account/read", json!({})),
            Err(CodexHata::Kapandi)
        );
    }
    #[test]
    #[ignore = "yalnız hidden owned-child fixture; env yoksa hemen döner"]
    fn owned_child_shutdown_fixture() {
        if std::env::var("AFU_UI_TEST_CHILD").as_deref() != Ok("1") {
            return;
        }
        std::io::stdout().write_all(b"AFU_READY\n").unwrap();
        std::io::stdout().flush().unwrap();
        loop {
            std::thread::park();
        }
    }
    #[test]
    fn shutdown_kills_only_owned_hidden_fixture_while_arc_survives() {
        // Model/CLI değil, yalnız bu test binary'sinin izole fixture testi çalışır.
        let exe = std::env::current_exe().unwrap();
        let mut cmd = Command::new(exe);
        cmd.args([
            "--exact",
            "codex::tests::owned_child_shutdown_fixture",
            "--ignored",
            "--nocapture",
        ])
        .env("AFU_UI_TEST_CHILD", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);
        let mut child = cmd.spawn().unwrap();
        let stdin = child.stdin.take().map(|pipe| Arc::new(Mutex::new(pipe)));
        let mut stdout = child.stdout.take().unwrap();
        let (ready_sender, ready_receiver) = mpsc::channel();
        let eof = Arc::new(AtomicBool::new(false));
        let ended = eof.clone();
        let reader = thread::spawn(move || {
            let mut bytes = [0; 1024];
            let mut text = String::new();
            let mut ready = false;
            while let Ok(n) = stdout.read(&mut bytes) {
                if n == 0 {
                    break;
                }
                text.push_str(&String::from_utf8_lossy(&bytes[..n]));
                if !ready && text.contains("AFU_READY") {
                    ready = true;
                    let _ = ready_sender.send(());
                }
            }
            ended.store(true, Ordering::Release);
        });
        let bridge = Arc::new(CodexBridge {
            closed: Arc::new(AtomicBool::new(false)),
            child: Mutex::new(Some(child)),
            stdin,
            pending: Arc::new(Mutex::new(HashMap::new())),
            next: AtomicU64::new(1),
            reader: Mutex::new(Some(reader)),
            active: Arc::new(Mutex::new(None)),
            thread_id: Mutex::new(None),
            send_gate: Mutex::new(()),
            login_id: Mutex::new(None),
        });
        ready_receiver.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(bridge
            .child
            .lock()
            .unwrap()
            .as_mut()
            .unwrap()
            .try_wait()
            .unwrap()
            .is_none());
        let retained = bridge.clone();
        bridge.shutdown();
        bridge.shutdown();
        assert!(retained.child.lock().unwrap().is_none());
        assert!(retained.reader.lock().unwrap().is_none());
        assert!(eof.load(Ordering::Acquire));
        assert!(retained.closed.load(Ordering::Acquire));
    }
    #[test]
    fn correlation_routes_out_of_order_and_errors() {
        let p: Pending = Arc::new(Mutex::new(HashMap::new()));
        let (a, ar) = mpsc::channel();
        let (b, br) = mpsc::channel();
        p.lock().unwrap().insert(1, a);
        p.lock().unwrap().insert(2, b);
        deliver_result(&p, 2, &json!({"result":{"value":2}}));
        deliver_result(&p, 999, &json!({"result":{}}));
        assert_eq!(br.recv().unwrap().unwrap()["value"], 2);
        assert!(ar.try_recv().is_err());
        deliver_result(&p, 1, &json!({"error":{"code":123,"message":"secret"}}));
        assert_eq!(ar.recv().unwrap(), Err(CodexHata::Protokol));
    }
    #[test]
    fn timeout_and_disconnected_are_distinct() {
        let (_tx, rx) = mpsc::channel();
        assert_eq!(await_result(rx, Duration::ZERO), Err(CodexHata::ZamanAsimi));
        let (tx, rx) = mpsc::channel();
        drop(tx);
        assert_eq!(await_result(rx, Duration::ZERO), Err(CodexHata::Kapandi));
    }

    #[test]
    fn eof_releases_all_pending_requests() {
        let p: Pending = Arc::new(Mutex::new(HashMap::new()));
        let (a, ar) = mpsc::channel();
        let (b, br) = mpsc::channel();
        p.lock().unwrap().insert(11, a);
        p.lock().unwrap().insert(22, b);
        close_pending(&p, CodexHata::Kapandi);
        assert_eq!(ar.recv().unwrap(), Err(CodexHata::Kapandi));
        assert_eq!(br.recv().unwrap(), Err(CodexHata::Kapandi));
        assert!(p.lock().unwrap().is_empty());
    }
    #[test]
    fn rate_limit_filter_drops_identifiers_and_credit_data() {
        let v = safe_limits(
            &json!({"accountId":"secret","rateLimits":{"primary":{"usedPercent":12.0,"resetsAt":100,"windowDurationMins":300,"token":"secret"}},"credits":{"balance":20}}),
        );
        assert_eq!(v["primary"]["usedPercent"], 12.0);
        assert!(!v.to_string().contains("secret"));
        assert!(v.get("credits").is_none());
    }
    #[test]
    fn chunked_utf8_and_crlf_frames() {
        let mut f = Cerceve::default();
        let b = "{\"delta\":\"Türkçe\"}\r\n".as_bytes();
        let mut out = Vec::new();
        for byte in b {
            out.extend(f.besle(&[*byte]).unwrap());
        }
        assert_eq!(out[0]["delta"], "Türkçe");
    }
}
