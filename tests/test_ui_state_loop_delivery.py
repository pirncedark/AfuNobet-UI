import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / "AfuNobet"))
spec = importlib.util.spec_from_file_location("ui_state_loop_delivery", ROOT / "delivery/AfuNobet/afu/ui_state_loop.py")
loop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(loop)


def test_read_error_retains_last_valid_state(tmp_path, monkeypatch):
    out = tmp_path / "state.json"
    out.write_text("previous", encoding="utf-8")
    def fail(db_path=None):
        raise RuntimeError("locked")
    monkeypatch.setattr(loop, "build_state", fail)
    assert loop.run_once(None, out) is False
    assert out.read_text(encoding="utf-8") == "previous"
    assert list(tmp_path.iterdir()) == [out]


@pytest.mark.parametrize("value", [{"version": 1, "tasks": [], "mesaj": "unavailable"}, {}, {"version": 1, "tasks": [None], "mesaj": ""}])
def test_invalid_or_unavailable_snapshot_is_not_published(tmp_path, monkeypatch, value):
    out = tmp_path / "state.json"
    out.write_text("previous", encoding="utf-8")
    monkeypatch.setattr(loop, "build_state", lambda db_path=None: value)
    assert loop.run_once(None, out) is False
    assert out.read_text(encoding="utf-8") == "previous"


def test_second_instance_is_rejected_and_stale_pid_can_be_reused(tmp_path):
    lock = tmp_path / "ui_state_loop.lock"
    lock.write_text("999999", encoding="utf-8")
    with loop.tek_ornek(lock):
        with pytest.raises(loop.ZatenCalisiyor):
            with loop.tek_ornek(lock):
                pass
    with loop.tek_ornek(lock):
        pass


def test_atomic_replace_and_write_failure_preserve_previous_state(tmp_path, monkeypatch):
    out = tmp_path / "state.json"
    out.write_text("previous", encoding="utf-8")
    monkeypatch.setattr(loop, "build_state", lambda db_path=None: {"version": 1, "tasks": [], "mesaj": ""})
    replace = loop.os.replace
    def fail(src, dst):
        assert Path(dst) == out
        assert out.read_text(encoding="utf-8") == "previous"
        raise OSError("locked")
    monkeypatch.setattr(loop.os, "replace", fail)
    assert loop.run_once(None, out) is False
    assert out.read_text(encoding="utf-8") == "previous"
    monkeypatch.setattr(loop.os, "replace", replace)
    assert loop.run_once(None, out) is True
    assert json.loads(out.read_text(encoding="utf-8"))["version"] == 1
    assert list(tmp_path.iterdir()) == [out]


def test_real_producer_reads_database_without_mutating_it(tmp_path):
    db = tmp_path / "state.db"
    with sqlite3.connect(db) as conn:
        conn.execute("CREATE TABLE jobs (job_id TEXT, status TEXT, subagent TEXT, checkpoint_data TEXT, created_at TEXT, updated_at TEXT)")
        conn.execute("INSERT INTO jobs VALUES (?, ?, ?, ?, ?, ?)", ("x", "RUNNING", "codex", "{}", None, None))
    before = db.read_bytes()
    assert loop.run_once(db, tmp_path / "state.json")
    assert db.read_bytes() == before
    assert json.loads((tmp_path / "state.json").read_text(encoding="utf-8"))["tasks"][0]["agent"] == "codex"


def test_output_cannot_replace_database(tmp_path):
    db = tmp_path / "state.db"
    db.write_bytes(b"preserve")
    assert loop.run_once(db, db) is False
    assert db.read_bytes() == b"preserve"


def test_invalid_interval_is_rejected_without_starting_loop():
    with pytest.raises(SystemExit):
        loop.main(["--aralik", "0"])


def test_stop_command_only_creates_stop_signal(tmp_path):
    out = tmp_path / "state.json"
    assert loop.main(["--output", str(out), "--durdur"]) == 0
    assert not out.exists()
    assert out.with_name("ui_state_loop.stop").exists()
