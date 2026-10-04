import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("ui_state_fields_delivery", ROOT / "delivery/AfuNobet/afu/ui_state.py")
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)


def test_optional_fields_are_passed_only_when_recorded():
    job = {"job_id": "x", "status": "RUNNING", "subagent": "codex", "subagent_model": "gpt-6", "created_at": "2026-10-01T12:00:00Z", "checkpoint_data": json.dumps({"title": "Başlık", "current_action": "Testler", "description": "Açıklama"})}
    row = producer._task_record(job, {})
    assert row["title"] == "Başlık"
    assert row["current_action"] == "Testler"
    assert row["model"] == "gpt-6"
    assert row["started_at"] == "2026-10-01T12:00:00+00:00"
    assert "title" not in producer._task_record({"job_id": "x"}, {})


def test_existing_quota_cache_is_read_without_query_or_mutation(tmp_path, monkeypatch):
    cache = tmp_path / "quota.cache"
    cache.write_text("66|0|@1790696225|@1790705059|5H|5H", encoding="ascii")
    sidecar = Path(str(cache) + ".basari.json")
    sidecar.write_text(json.dumps({"saglayicilar": {"CODEX": {"zaman": 1790695000}}}), encoding="utf-8")
    monkeypatch.setenv("AFUNOBET_QUOTA_CACHE", str(cache))
    before = cache.read_bytes()
    quotas = producer._read_quota_cache()
    assert quotas["codex"]["remaining_percent"] == 34
    assert quotas["gemini"]["remaining_percent"] == 100
    assert quotas["codex"]["checked_at"] is not None
    assert quotas["gemini"]["checked_at"] is None
    assert "claude" not in quotas
    assert cache.read_bytes() == before
