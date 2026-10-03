#[path = "../src/codex.rs"]
mod codex;
use codex::*;
use serde_json::json;
#[test]
#[ignore = "requires a real ChatGPT login and network outside the command sandbox"]
fn live_voice_reply() {
    use std::sync::{mpsc, Arc};
    use std::time::{Duration, Instant};
    let directory = std::env::var_os("AFU_VOICE_PROOF_DIR")
        .map(std::path::PathBuf::from).expect("proof directory required");
    std::fs::create_dir_all(&directory).unwrap();
    let (tx, rx) = mpsc::channel();
    let bridge = CodexBridge::start_with_callback(Arc::new(move |event| { let _ = tx.send(event); }))
        .expect("Codex could not start; run from a normal user terminal");
    assert!(bridge.status().unwrap().logged_in, "ChatGPT login required");
    let turn = bridge.send("Merhaba Afu. Yalnız 'Merhaba, birlikte devam edelim.' cümlesiyle yanıt ver.", &[], &std::env::current_dir().unwrap()).unwrap();
    let deadline = Instant::now() + Duration::from_secs(120);
    let mut reply = String::new();
    loop {
        let event = rx.recv_timeout(deadline.saturating_duration_since(Instant::now())).expect("reply timed out");
        if event.params["threadId"] != turn["threadId"] { continue; }
        if event.method == "item/agentMessage/delta" && event.params["turnId"] == turn["turnId"] {
            reply.push_str(event.params["delta"].as_str().unwrap_or(""));
        }
        if event.method == "turn/completed" && event.params["turn"]["id"] == turn["turnId"] {
            assert_eq!(event.params["turn"]["status"], "completed");
            break;
        }
    }
    bridge.shutdown();
    assert!(reply.to_lowercase().contains("merhaba"), "empty or unexpected answer");
    std::fs::write(directory.join("codex_reply.txt"), reply).unwrap();
}
#[test]
fn partial_and_multiple_frames() {
    let mut c = Cerceve::default();
    assert_eq!(
        c.besle(b"{\"id\":1,\"result\":{}}\n{\"method\":\"turn/started\",\"par")
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        c.besle(b"ams\":{}}\n").unwrap()[0]["method"],
        "turn/started"
    );
}
#[test]
fn oversized_and_invalid_frames_fail_closed() {
    assert!(Cerceve::default()
        .besle(&vec![b'x'; MAX_FRAME + 1])
        .is_err());
    assert!(Cerceve::default().besle(b"bad\n").is_err());
}
#[test]
fn safe_status_and_notification() {
    let s = status_from_account(&json!({"account":{"type":"apiKey","accessToken":"secret"}}));
    assert!(!s.logged_in);
    assert!(safe_event("account/updated", &json!({"accessToken":"secret"})).is_none());
    let e = safe_event(
        "turn/completed",
        &json!({"turn":{"id":"t","error":{"message":"secret"}}}),
    )
    .unwrap();
    assert!(!serde_json::to_string(&e).unwrap().contains("secret"));
    assert_eq!(durum_metni(&CodexHata::Bulunamadi), "Codex bulunamadı.");
}
#[test]
fn readonly_and_input_validation() {
    let p = thread_params(std::path::Path::new("C:/workspace"));
    assert_eq!(p["sandbox"], "read-only");
    assert_eq!(p["approvalPolicy"], "never");
    assert!(build_input("", &[]).is_err());
    assert!(build_input("hi", &["C:/missing/file.txt".into()]).is_err());
    assert_eq!(build_input("hi", &[]).unwrap()[0]["text"], "hi");
}
#[test]
fn stream_events_keep_correlation_but_drop_private_fields() {
    let delta = safe_event("item/agentMessage/delta", &json!({"threadId":"thread-1","turnId":"turn-2","itemId":"item-3","delta":"Merhaba","accessToken":"secret"})).unwrap();
    assert_eq!(delta.params["threadId"], "thread-1");
    assert_eq!(delta.params["turnId"], "turn-2");
    assert_eq!(delta.params["itemId"], "item-3");
    assert!(!delta.params.to_string().contains("secret"));
    let error = safe_event("error", &json!({"threadId":"thread-1","turnId":"turn-2","willRetry":false,"error":{"message":"secret","httpStatusCode":429}})).unwrap();
    assert_eq!(error.params["threadId"], "thread-1");
    assert_eq!(error.params["turnId"], "turn-2");
    assert_eq!(error.params["willRetry"], false);
    assert!(!error.params.to_string().contains("secret"));
}

#[test]
fn eof_error_is_correlated_before_active_ids_are_cleared() {
    let active = std::sync::Mutex::new(Some(("thread-1".into(), "turn-2".into())));
    let e = stream_closed_event(&active);
    assert_eq!(e.method, "error");
    assert_eq!(e.params["threadId"], "thread-1");
    assert_eq!(e.params["turnId"], "turn-2");
    assert_eq!(e.params["willRetry"], false);
    assert!(active.lock().unwrap().is_none());
}

#[test]
fn inherited_mcp_and_apps_are_disabled_in_all_effective_layers() {
    let response = json!({"config":{"mcp_servers":{"telegram":{"command":"secret"}},"apps":{"app_a":{"enabled":true}}},
        "layers":[{"config":{"mcp_servers":{"system_write":{"enabled":true}},"apps":{"app_b":{"enabled":true}}}}]});
    let config = disabled_tool_config(&response).unwrap();
    assert_eq!(config["mcp_servers"]["telegram"]["enabled"], false);
    assert_eq!(config["mcp_servers"]["system_write"]["enabled"], false);
    assert_eq!(config["apps"]["app_a"]["enabled"], false);
    assert_eq!(config["apps"]["app_b"]["enabled"], false);
    assert_eq!(config["apps"]["_default"]["enabled"], false);
    for feature in ["shell_tool", "unified_exec", "plugins", "enable_mcp_apps"] {
        assert_eq!(config["features"][feature], false);
    }
    assert_eq!(config["web_search"], "disabled");
    assert!(!config.to_string().contains("secret"));
    let thread = thread_params_with_config(std::path::Path::new("C:/workspace"), config);
    assert_eq!(
        thread["config"]["mcp_servers"]["telegram"]["enabled"],
        false
    );
}
#[test]
fn failed_or_malformed_config_is_fail_closed_before_thread_start() {
    for value in [
        json!(null),
        json!({}),
        json!({"config":null}),
        json!({"config":{"mcp_servers":[]}}),
        json!({"config":{},"layers":{}}),
        json!({"config":{},"layers":[{}]}),
    ] {
        assert_eq!(disabled_tool_config(&value), Err(CodexHata::Protokol));
    }
}
#[test]
fn dotted_mcp_names_are_kept_as_literal_table_keys() {
    let config = disabled_tool_config(
        &json!({"config":{"mcp_servers":{"vendor.write":{"enabled":true}}},"layers":[]}),
    )
    .unwrap();
    assert_eq!(config["mcp_servers"]["vendor.write"]["enabled"], false);
    assert!(config["mcp_servers"].get("vendor").is_none());
}
#[test]
fn process_flags_disable_tools_before_any_thread() {
    let args = app_server_args();
    assert_eq!(args[0], "app-server");
    for key in [
        "features.shell_tool=false",
        "features.unified_exec=false",
        "features.plugins=false",
        "features.enable_mcp_apps=false",
        "web_search=\"disabled\"",
    ] {
        assert!(args.iter().any(|argument| argument == key));
    }
}

#[test]
fn thread_start_uses_only_stable_local_protocol_fields() {
    let schema: serde_json::Value = serde_json::from_str(include_str!(
        "../../../docs/codex-protocol/v2/ThreadStartParams.json"
    ))
    .unwrap();
    let params = thread_params(std::path::Path::new("C:/workspace"));
    for key in params.as_object().unwrap().keys() {
        assert!(
            schema["properties"].get(key).is_some(),
            "bilinmeyen stabil alan: {key}"
        );
    }
}
