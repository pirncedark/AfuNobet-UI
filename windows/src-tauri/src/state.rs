use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};

pub fn resolve_path() -> PathBuf {
    let path = std::env::var_os("AFUNOBET_UI_STATE")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("AFUNOBET_DB")
                .filter(|value| !value.is_empty())
                .map(|db| PathBuf::from(db).with_file_name("state.json"))
        })
        .unwrap_or_else(|| varsayilan_kok().join("state.json"));
    // Do not canonicalize: missing sources are expected at startup.
    std::path::absolute(&path).unwrap_or(path)
}

/// Kullanıcıya özel veri kökü. Mevcut AfuNöbet kurulumu (%USERPROFILE%\Desktop\afuproject\AfuNobet)
/// varsa o korunur; yoksa %LOCALAPPDATA%\AfuNobet kullanılır.
pub fn varsayilan_kok() -> PathBuf {
    let eski = std::env::var_os("USERPROFILE")
        .filter(|value| !value.is_empty())
        .map(|home| PathBuf::from(home).join("Desktop").join("afuproject").join("AfuNobet"));
    if let Some(eski) = eski.filter(|path| path.is_dir()) {
        return eski;
    }
    std::env::var_os("LOCALAPPDATA")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("USERPROFILE")
                .filter(|value| !value.is_empty())
                .map(|home| PathBuf::from(home).join("AppData").join("Local"))
        })
        .unwrap_or_else(|| PathBuf::from("."))
        .join("AfuNobet")
}

pub fn unavailable() -> Value {
    json!({"version":1,"tasks":[],"mesaj":"Bağlantı bekleniyor"})
}

const MAX_BYTES: u64 = 2_097_152;

fn text(value: Option<&Value>, fallback: &str) -> String {
    let Some(value) = value.and_then(Value::as_str) else {
        return fallback.into();
    };
    let lowered = value.to_lowercase();
    if value.trim().is_empty()
        || value.len() > 400
        || value.chars().any(char::is_control)
        || ["http:", "https:", "://", "429", "cmd.exe"]
            .iter()
            .any(|word| lowered.contains(word))
        || lowered
            .split(|c: char| !c.is_alphanumeric() && c != '_')
            .any(|word| {
                [
                    "pid",
                    "port",
                    "bearer",
                    "token",
                    "secret",
                    "api_key",
                    "authorization",
                    "last_error",
                    "localhost",
                    "powershell",
                ]
                .contains(&word)
            })
        || value.contains('/')
        || value.contains('\\')
        || value.contains(':')
    {
        fallback.into()
    } else {
        value.trim().into()
    }
}

fn basename(value: Option<&Value>) -> Value {
    let Some(value) = value.and_then(Value::as_str) else {
        return Value::Null;
    };
    let name = value
        .trim_end_matches(['/', '\\'])
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("");
    let name = text(Some(&Value::String(name.into())), "");
    if name.is_empty() {
        Value::Null
    } else {
        Value::String(name)
    }
}

fn percent(value: Option<&Value>) -> Value {
    value
        .and_then(Value::as_f64)
        .filter(|n| n.is_finite() && (0.0..=100.0).contains(n))
        .and_then(serde_json::Number::from_f64)
        .map(Value::Number)
        .unwrap_or(Value::Null)
}

fn timestamp(value: Option<&Value>) -> Value {
    value
        .and_then(Value::as_str)
        .filter(|s| {
            s.len() <= 40
                && s.len() >= 10
                && s.chars()
                    .all(|c| c.is_ascii_digit() || "-:TZ+. ".contains(c))
        })
        .map(|s| Value::String(s.into()))
        .unwrap_or(Value::Null)
}

fn quota_reason(row: &serde_json::Map<String, Value>) -> bool {
    // Classify on the private source before discarding raw diagnostics.
    [
        "mesaj",
        "message",
        "last_error",
        "circuit",
        "circuit_state",
        "provider_status",
    ]
    .iter()
    .filter_map(|key| row.get(*key).and_then(Value::as_str))
    .any(|value| {
        let lowered = value.to_lowercase().replace('_', " ");
        let words: Vec<_> = lowered.split(|c: char| !c.is_alphanumeric()).collect();
        ["429", "kota", "quota", "blocked", "cooldown"]
            .iter()
            .any(|marker| words.contains(marker))
            || lowered.contains("usage limit")
            || lowered.contains("rate limit")
    })
}

pub fn read_snapshot(path: &Path) -> Option<Value> {
    // Only opening in read mode: never create, repair or modify the source.
    let file = File::open(path).ok()?;
    let metadata = file.metadata().ok()?;
    if !metadata.is_file() || metadata.len() > MAX_BYTES {
        return None;
    }
    let mut bytes = Vec::new();
    file.take(MAX_BYTES + 1).read_to_end(&mut bytes).ok()?;
    if bytes.len() as u64 > MAX_BYTES {
        return None;
    }
    let value: Value = serde_json::from_slice(&bytes).ok()?;
    if value.get("version").and_then(Value::as_u64) != Some(1) {
        return None;
    }
    let tasks = value.get("tasks")?.as_array()?;
    if tasks.len() > 5000 {
        return None;
    }
    let mut ids = HashSet::new();
    let mut clean = Vec::with_capacity(tasks.len());
    for task in tasks {
        let row = task.as_object()?;
        let id = row.get("id")?.as_str()?;
        if id.trim().is_empty() || id.len() > 200 || !ids.insert(id) {
            return None;
        }
        let agent = row
            .get("agent")
            .and_then(Value::as_str)
            .map(str::to_lowercase)
            .filter(|agent| {
                ["codex", "gemini", "opencode", "glm", "claude"].contains(&agent.as_str())
            });
        let source_status = row
            .get("status")
            .and_then(Value::as_str)
            .filter(|status| {
                [
                    "Hazirlaniyor",
                    "Calisiyor",
                    "Bekliyor",
                    "Duraklatildi",
                    "Tamamlandi",
                    "Hata",
                ]
                .contains(status)
            })
            .unwrap_or("Hazirlaniyor");
        let quota_paused = matches!(source_status, "Hata" | "Duraklatildi") && quota_reason(row);
        let status = if quota_paused {
            "Duraklatildi"
        } else {
            source_status
        };
        let message = match status {
            "Duraklatildi" if quota_paused => format!(
                "{} duraklatildi - kota yenilenince devam edecek",
                agent.as_deref().unwrap_or("Ajan").to_uppercase()
            ),
            "Duraklatildi" => format!(
                "{} duraklatildi",
                agent.as_deref().unwrap_or("Ajan").to_uppercase()
            ),
            "Hata" => "Gorev tamamlanamadi - yeniden deneyin".into(),
            _ => String::new(),
        };
        let quota = row.get("quota");
        clean.push(json!({
            "id": id, "agent": agent, "task": text(row.get("task"), "Görev"),
            "title": text(row.get("task").and_then(|task| task.get("title")).or_else(|| row.get("title")), ""),
            "current_action": text(row.get("current_action"), ""),
            "description": text(row.get("description"), ""),
            "model": text(row.get("model"), ""),
            "repo": basename(row.get("repo")), "status": status,
            "file": basename(row.get("file").or_else(|| row.get("current_file"))),
            "current_file": basename(row.get("current_file").or_else(|| row.get("file"))),
            "progress": percent(row.get("progress")),
            "started": timestamp(row.get("started")), "started_at": timestamp(row.get("started_at").or_else(|| row.get("started"))), "updated_at": timestamp(row.get("updated_at")),
            "quota": {"remaining_percent": percent(quota.and_then(|q| q.get("remaining_percent"))),
                      "reset_at": timestamp(quota.and_then(|q| q.get("reset_at"))),
                      "checked_at": timestamp(quota.and_then(|q| q.get("checked_at")))},
            "mesaj": message, "message": message,
        }));
    }
    let mut result = json!({"version":1,"tasks":clean,"mesaj":if value.get("mesaj").and_then(Value::as_str).is_some_and(|s| !s.is_empty()) { "Bağlantı bekleniyor" } else { "" }});
    if let Some(quotas) = value.get("quotas").and_then(Value::as_object) {
        let mut cleaned = serde_json::Map::new();
        for agent in ["codex", "glm", "gemini", "opencode"] {
            if let Some(q) = quotas.get(agent) {
                cleaned.insert(agent.into(), json!({"remaining_percent":percent(q.get("remaining_percent")),"reset_at":timestamp(q.get("reset_at")),"checked_at":timestamp(q.get("checked_at"))}));
            }
        }
        result["quotas"] = Value::Object(cleaned);
    }
    Some(result)
}

pub struct Snapshot {
    value: Value,
}
impl Default for Snapshot {
    fn default() -> Self {
        Self {
            value: unavailable(),
        }
    }
}
impl Snapshot {
    pub fn apply_valid(&mut self, next: Value) -> bool {
        let changed = self.value != next;
        self.value = next;
        changed
    }
    pub fn value(&self) -> &Value {
        &self.value
    }
    pub fn refresh(&mut self, path: &Path) -> bool {
        let mut next = read_snapshot(path).unwrap_or_else(|| {
            let mut retained = self.value.clone();
            retained["mesaj"] = Value::String("Bağlantı bekleniyor".into());
            retained
        });
        let changed = self.value != next;
        std::mem::swap(&mut self.value, &mut next);
        changed
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static NEXT: AtomicUsize = AtomicUsize::new(0);
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let dir = std::env::temp_dir().join(format!(
                "afunobet-reader-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            std::fs::create_dir_all(&dir).unwrap();
            Self(dir)
        }
        fn path(&self) -> PathBuf {
            self.0.join("state.json")
        }
        fn write(&self, value: &str) {
            std::fs::write(self.path(), value).unwrap();
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            if let Ok(meta) = std::fs::metadata(self.path()) {
                let mut permissions = meta.permissions();
                permissions.set_readonly(false);
                let _ = std::fs::set_permissions(self.path(), permissions);
            }
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn display_fields_cross_readonly_bridge_without_private_paths() {
        let fixture = Fixture::new();
        fixture.write(r#"{"version":1,"tasks":[{"id":"a","task":{"title":"Başlık"},"title":"Başlık","current_action":"Testler","description":"Açıklama","model":"gpt-6","started_at":"2026-10-01T12:00:00Z","cwd":"C:/work/AfuNobet"}]}"#);
        let value = read_snapshot(&fixture.path()).unwrap();
        let row = &value["tasks"][0];
        assert_eq!(row["title"], "Başlık");
        assert_eq!(row["current_action"], "Testler");
        assert_eq!(row["model"], "gpt-6");
        assert_eq!(row["started_at"], "2026-10-01T12:00:00Z");
        assert!(row.get("cwd").is_none());
    }

    #[test]
    fn quota_cache_crosses_bridge_even_without_jobs_and_claude_is_excluded() {
        let fixture = Fixture::new();
        fixture.write(r#"{"version":1,"tasks":[],"quotas":{"codex":{"remaining_percent":34,"checked_at":"2026-10-01T12:00:00Z"},"claude":{"remaining_percent":99}}}"#);
        let value = read_snapshot(&fixture.path()).unwrap();
        assert_eq!(value["quotas"]["codex"]["remaining_percent"], 34.0);
        assert_eq!(value["quotas"]["codex"]["checked_at"], "2026-10-01T12:00:00Z");
        assert!(value["quotas"].get("claude").is_none());
    }

    #[test]
    fn missing_source_does_not_create_a_file() {
        let fixture = Fixture::new();
        assert!(read_snapshot(&fixture.path()).is_none());
        assert!(!fixture.path().exists());
        assert_eq!(Snapshot::default().value(), &unavailable());
    }

    #[test]
    fn valid_readonly_source_is_read_without_mutation_and_technical_fields_are_dropped() {
        let fixture = Fixture::new();
        let bytes = r#"{"version":1,"tasks":[{"id":"a","agent":"codex","task":"Test","status":"Calisiyor","pid":42,"port":8000,"last_error":"429","quota":{"remaining_percent":12,"reset_at":null,"secret":"bad"}}],"secret":"bad","mesaj":""}"#;
        fixture.write(bytes);
        let mut permissions = std::fs::metadata(fixture.path()).unwrap().permissions();
        permissions.set_readonly(true);
        std::fs::set_permissions(fixture.path(), permissions).unwrap();
        let value = read_snapshot(&fixture.path()).expect("valid snapshot");
        assert_eq!(value["tasks"][0]["task"], "Test");
        assert!(value["tasks"][0].get("pid").is_none());
        assert!(value["tasks"][0].get("port").is_none());
        assert!(value["tasks"][0].get("last_error").is_none());
        assert!(value["tasks"][0]["quota"].get("secret").is_none());
        assert!(value.get("secret").is_none());
        assert_eq!(std::fs::read(fixture.path()).unwrap(), bytes.as_bytes());
        assert!(std::fs::metadata(fixture.path())
            .unwrap()
            .permissions()
            .readonly());
    }

    #[test]
    fn malformed_deleted_and_old_version_preserve_last_valid_tasks_with_waiting_message() {
        let fixture = Fixture::new();
        fixture.write(r#"{"version":1,"tasks":[{"id":"a","task":"Test"}],"mesaj":""}"#);
        let mut snapshot = Snapshot::default();
        assert!(snapshot.refresh(&fixture.path()));
        for invalid in [
            "{",
            r#"{"version":0,"tasks":[]}"#,
            r#"{"version":1,"tasks":[{"id":"a"},{"id":"a"}]}"#,
        ] {
            fixture.write(invalid);
            snapshot.refresh(&fixture.path());
            assert_eq!(snapshot.value()["tasks"][0]["id"], "a");
            assert_eq!(snapshot.value()["mesaj"], "Bağlantı bekleniyor");
        }
        std::fs::remove_file(fixture.path()).unwrap();
        snapshot.refresh(&fixture.path());
        assert_eq!(snapshot.value()["tasks"][0]["id"], "a");
        assert_eq!(snapshot.value()["mesaj"], "Bağlantı bekleniyor");
    }

    #[test]
    fn invalid_shape_duplicate_ids_and_oversized_source_are_rejected() {
        let fixture = Fixture::new();
        for bytes in [
            r#"{"version":1,"tasks":{}}"#,
            r#"{"version":1,"tasks":[{"id":""}]}"#,
            r#"{"version":1,"tasks":[{"id":"a"},{"id":"a"}]}"#,
        ] {
            fixture.write(bytes);
            assert!(read_snapshot(&fixture.path()).is_none());
        }
        fixture.write(&" ".repeat(2_097_153));
        assert!(read_snapshot(&fixture.path()).is_none());
    }

    #[test]
    fn user_text_paths_and_raw_quota_errors_are_sanitized() {
        let fixture = Fixture::new();
        fixture.write(r#"{"version":1,"tasks":[{"id":"a","agent":"codex","status":"Duraklatildi","task":"PID 41 port 8000 https://secret.example","file":"C:/secret/work/main.rs","repo":"C:/secret/work","message":"429 token secret","quota":{"remaining_percent":900,"reset_at":null}}],"mesaj":"raw error"}"#);
        let value = read_snapshot(&fixture.path()).unwrap();
        assert_eq!(value["tasks"][0]["task"], "Görev");
        assert_eq!(value["tasks"][0]["file"], "main.rs");
        assert_eq!(value["tasks"][0]["repo"], "work");
        assert_eq!(
            value["tasks"][0]["message"],
            "CODEX duraklatildi - kota yenilenince devam edecek"
        );
        assert!(value["tasks"][0]["quota"]["remaining_percent"].is_null());
        assert_eq!(value["mesaj"], "Bağlantı bekleniyor");
    }

    #[test]
    fn ordinary_titles_and_filenames_containing_port_are_not_filtered() {
        let fixture = Fixture::new();
        fixture.write(r#"{"version":1,"tasks":[{"id":"a","task":"Report duzenle","file":"report.ts"}],"mesaj":""}"#);
        let value = read_snapshot(&fixture.path()).unwrap();
        assert_eq!(value["tasks"][0]["task"], "Report duzenle");
        assert_eq!(value["tasks"][0]["file"], "report.ts");
    }

    #[test]
    fn quota_failure_is_paused_but_old_quota_errors_do_not_override_active_or_completed_tasks() {
        let fixture = Fixture::new();
        for marker in [
            "429",
            "usage limit",
            "quota exceeded",
            "RATE_LIMIT",
            "BLOCKED",
            "COOLDOWN",
        ] {
            fixture.write(&json!({"version":1,"tasks":[{"id":"a","agent":"gemini","status":"Hata","message":marker}],"mesaj":""}).to_string());
            let task = &read_snapshot(&fixture.path()).unwrap()["tasks"][0];
            assert_eq!(task["status"], "Duraklatildi", "{marker}");
            assert_eq!(
                task["message"],
                "GEMINI duraklatildi - kota yenilenince devam edecek"
            );
            assert!(!task.to_string().contains(marker), "raw marker escaped");
        }
        for status in ["Calisiyor", "Tamamlandi"] {
            fixture.write(&json!({"version":1,"tasks":[{"id":"a","status":status,"last_error":"429","message":"usage limit","circuit_state":"BLOCKED"}],"mesaj":""}).to_string());
            let task = &read_snapshot(&fixture.path()).unwrap()["tasks"][0];
            assert_eq!(task["status"], status);
            assert_eq!(task["message"], "");
            assert!(task.get("last_error").is_none());
            assert!(task.get("circuit_state").is_none());
        }
    }

    #[test]
    fn ordinary_pause_does_not_invent_a_quota_reason() {
        let fixture = Fixture::new();
        fixture.write(r#"{"version":1,"tasks":[{"id":"a","agent":"codex","status":"Duraklatildi","message":"manual pause"}],"mesaj":""}"#);
        let task = &read_snapshot(&fixture.path()).unwrap()["tasks"][0];
        assert_eq!(task["status"], "Duraklatildi");
        assert_eq!(task["message"], "CODEX duraklatildi");
    }

    #[test]
    fn recorded_quota_circuit_and_last_error_are_detected_without_crossing_ipc() {
        let fixture = Fixture::new();
        for fields in [
            json!({"last_error":"429 token secret"}),
            json!({"circuit_state":"BLOCKED"}),
            json!({"circuit":"COOLDOWN"}),
            json!({"mesaj":"Kota doldu"}),
        ] {
            let mut task = json!({"id":"a","agent":"codex","status":"Hata"});
            task.as_object_mut()
                .unwrap()
                .extend(fields.as_object().unwrap().clone());
            fixture.write(&json!({"version":1,"tasks":[task],"mesaj":""}).to_string());
            let clean = &read_snapshot(&fixture.path()).unwrap()["tasks"][0];
            assert_eq!(clean["status"], "Duraklatildi");
            assert_eq!(
                clean["message"],
                "CODEX duraklatildi - kota yenilenince devam edecek"
            );
            assert!(clean.get("last_error").is_none());
            assert!(clean.get("circuit").is_none());
            assert!(clean.get("circuit_state").is_none());
        }
    }
}
