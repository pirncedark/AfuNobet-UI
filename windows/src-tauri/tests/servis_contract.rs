#[path = "../src/servis.rs"]
mod servis;

use std::cell::Cell;
use std::path::Path;
use std::time::Duration;

#[test]
fn closed_panel_never_requests_github() {
    let runtime = servis::Runtime::default();
    let requests = Cell::new(0);
    for seconds in [0, 60, 120] {
        assert!(runtime.refresh_with(Duration::from_secs(seconds), || {
            requests.set(requests.get() + 1);
            Ok("[]".into())
        }).is_none());
    }
    assert_eq!(requests.get(), 0);
}

#[test]
fn open_panel_refreshes_and_throttles_then_close_stops() {
    let runtime = servis::Runtime::default();
    let requests = Cell::new(0);
    let query = || { requests.set(requests.get() + 1); Ok(r#"[{"status":"completed","conclusion":"success","url":"https://github.com/a/b/actions/runs/1"}]"#.into()) };
    runtime.panel_open(true);
    assert_eq!(runtime.refresh_with(Duration::ZERO, query).unwrap().status, "success");
    runtime.refresh_with(Duration::from_secs(10), query);
    assert_eq!(requests.get(), 1);
    runtime.refresh_with(Duration::from_secs(60), query);
    assert_eq!(requests.get(), 2);
    runtime.panel_open(false);
    assert!(runtime.refresh_with(Duration::from_secs(120), query).is_none());
    assert_eq!(requests.get(), 2);
}

#[test]
fn unavailable_run_is_unknown_and_unsafe_link_is_hidden() {
    assert_eq!(servis::parse_run("[]").status, "unknown");
    assert_eq!(servis::parse_run("broken").status, "unknown");
    let run = servis::parse_run(r#"[{"status":"in_progress","url":"file:///secret"}]"#);
    assert_eq!(run.status, "running");
    assert!(run.url.is_none());
    assert_eq!(servis::parse_run(r#"[{"status":"completed","conclusion":"failure"}]"#).status, "failure");
}

#[test]
fn gh_command_uses_read_only_latest_run_without_shell() {
    let command = servis::gh_command(Path::new("."));
    assert_eq!(command.get_program(), "gh");
    assert_eq!(command.get_args().map(|a| a.to_str().unwrap()).collect::<Vec<_>>(),
        ["run", "list", "--limit", "1", "--json", "status,conclusion,url"]);
}
