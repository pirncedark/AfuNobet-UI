import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import afu_ajan_koprusu as k


def test_agent_event_alias_and_nested_codex_failure():
    assert k.protokol_satiri({"agent": "yeni-ajan", "event": "working"})["ajan"] == "yeni-ajan"
    o = k.protokol_satiri({"method": "turn/completed", "params": {
        "threadId": "t-1", "turn": {"status": "failed", "error": {"message": "quota exceeded"}}}}, "codex")
    assert (o["oturum"], o["olay"]) == ("t-1", "rate_limit")


@pytest.mark.parametrize("command", ["rm report.txt", "Remove-Item -LiteralPath report.txt", "del report.txt"])
def test_single_file_deletion_requires_approval(command):
    assert k.riskli_mi("Bash", {"command": command})[0]


def test_approval_storage_failure_denies(monkeypatch, capsys):
    monkeypatch.setattr(k, "_stdin_oku", lambda: '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"npm publish"}}')
    monkeypatch.setattr(k, "afu_acik_mi", lambda _: True)
    monkeypatch.setattr(k, "gonder", lambda *args: True)
    def broken(*args, **kwargs):
        raise OSError("storage unavailable")
    monkeypatch.setattr(k, "onay_iste", broken)
    output = []
    monkeypatch.setattr(k, "_stdout", output.append)
    k.calis(["--onay"])
    assert output[0]["hookSpecificOutput"]["permissionDecision"] == "deny"
