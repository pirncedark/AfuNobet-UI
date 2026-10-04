#[path = "../src/bildirim.rs"] mod bildirim;
use bildirim::*;
#[test]
fn notification_ids_survive_serialization_without_tuple_collisions() {
    let mut engine = Tekillestirici::default();
    let first = engine.olay("code:x", "work", "finished", "turn1").unwrap();
    let second = engine.olay("code", "x:work", "finished", "turn1").unwrap();
    let next = engine.olay("code:x", "work", "finished", "turn2").unwrap();
    assert_ne!(first.id, second.id);
    assert_ne!(first.id, next.id);
    let json = serde_json::to_value(&first).unwrap();
    assert_eq!(json["id"].as_str(), Some(first.id.as_str()));
    let mut restarted = Tekillestirici::default();
    assert_eq!(restarted.olay("code:x", "work", "finished", "turn1").unwrap().id, first.id);
}
#[path = "../src/ses.rs"] mod ses;

#[test]
fn important_events_map_to_safe_short_messages_and_distinct_sounds() {
    let mut engine = Tekillestirici::default();
    let mut sounds = std::collections::HashSet::new();
    for kind in ["finished", "error", "rate_limit", "question"] {
        let result = engine.olay("codex", "work", kind, "turn1").unwrap();
        assert!(!result.message.is_empty());
        assert!(!result.message.contains("work"));
        sounds.insert(result.sound);
    }
    assert_eq!(sounds.len(), 4);
    assert!(engine.olay("codex", "work", "thinking", "turn1").is_none());
}
#[test]
fn same_event_never_repeats_but_a_new_turn_and_agent_can_notify() {
    let mut engine = Tekillestirici::default();
    assert!(engine.olay("codex", "work", "finished", "turn1").is_some());
    for _ in 0..100 { assert!(engine.olay("codex", "work", "finished", "turn1").is_none()); }
    assert!(engine.olay("codex", "work", "finished", "turn2").is_some());
    assert!(engine.olay("gemini", "work", "finished", "turn1").is_some());
}
#[test]
fn mute_survives_reload_in_a_test_directory() {
    let dir = std::env::temp_dir().join(format!("afu-notifications-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("settings.json");
    assert!(!load(&path).muted);
    save(&path, Ayarlar { muted: true }).unwrap();
    assert!(load(&path).muted);
    std::fs::write(&path, "broken").unwrap();
    assert!(!load(&path).muted);
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
fn six_wav_cues_are_short_valid_and_different() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../public/ses");
    let mut unique = std::collections::HashSet::new();
    for name in ["basladi", "tamamlandi", "hata", "cevap", "kota", "baglandi"] {
        let path = root.join(format!("{name}.wav"));
        assert!(path.is_file(), "Missing {name}");
        let mut reader = hound::WavReader::open(path).unwrap();
        assert_eq!(reader.spec().channels, 1);
        assert_eq!(reader.spec().bits_per_sample, 16);
        assert!((0.1..0.8).contains(&(reader.duration() as f64 / reader.spec().sample_rate as f64)));
        let samples: Vec<i16> = reader.samples().map(Result::unwrap).collect();
        assert!(samples.iter().any(|s| s.abs() > 100));
        unique.insert(samples);
    }
    assert_eq!(unique.len(), 6);
}

#[test]
fn snapshot_baseline_is_silent_and_only_live_important_transitions_notify() {
    let mut flow = Akis::default();
    let snapshot = |status: &str, message: &str| serde_json::json!({"version":1,"tasks":[{"id":"a", "agent":"codex", "status":status,"message":message,"started_at":"turn1"}]});
    assert!(flow.snapshot(&snapshot("Tamamlandi", "")).is_empty());
    assert!(flow.snapshot(&snapshot("Calisiyor", "")).is_empty());
    assert!(flow.snapshot(&snapshot("Duraklatildi", "Elle duraklatildi")).is_empty());
    assert_eq!(flow.snapshot(&snapshot("Duraklatildi", "kota yenilenince devam edecek"))[0].kind, "rate_limit");
    assert!(flow.snapshot(&snapshot("Duraklatildi", "kota yenilenince devam edecek")).is_empty());
    assert_eq!(flow.snapshot(&snapshot("Hata", ""))[0].kind, "error");
    assert_eq!(flow.snapshot(&snapshot("Tamamlandi", ""))[0].kind, "finished");
    assert!(flow.snapshot(&snapshot("Calisiyor", "")).is_empty());
    assert!(flow.snapshot(&snapshot("Tamamlandi", "")).is_empty());
}

#[test]
fn event_sound_mapping_uses_only_embedded_valid_cues() {
    for kind in ["working", "finished", "error", "question", "rate_limit", "connected"] {
        assert_eq!(&ses::wav(kind).unwrap()[..4], b"RIFF");
    }
    assert!(ses::wav("file_edit").is_none());
}

#[test]
fn live_start_and_reconnect_cues_never_replay_on_identical_snapshots() {
    let mut flow = Akis::default();
    let waiting = serde_json::json!({"version":1,"tasks":[],"mesaj":"Bağlantı bekleniyor"});
    flow.snapshot(&waiting);
    let live = serde_json::json!({"version":1,"tasks":[{"id":"a","agent":"codex","status":"Calisiyor","started_at":"turn1"}],"mesaj":""});
    flow.snapshot(&live);
    assert_eq!(flow.cues(), &["connected", "working"]);
    flow.snapshot(&live);
    assert!(flow.cues().is_empty());
}

#[test]
fn a_new_turn_can_notify_even_when_intermediate_snapshots_were_missed() {
    let mut flow = Akis::default();
    let snapshot = |status: &str, turn: &str| serde_json::json!({"tasks":[{"id":"same", "agent":"codex", "status":status,"started_at":turn}]});
    flow.snapshot(&snapshot("working", "turn1"));
    assert_eq!(flow.snapshot(&snapshot("finished", "turn1")).len(), 1);
    assert_eq!(flow.snapshot(&snapshot("finished", "turn2")).len(), 1);
    assert!(flow.snapshot(&snapshot("finished", "turn2")).is_empty());
    flow.snapshot(&snapshot("working", "turn3"));
    assert_eq!(flow.cues(), &["working"]);
    flow.snapshot(&snapshot("working", "turn4"));
    assert_eq!(flow.cues(), &["working"]);
    flow.snapshot(&snapshot("working", "turn4"));
    assert!(flow.cues().is_empty());
}
