"""Offline acceptance contracts. No hooks, accounts or real state are modified.

Source checks verify explicit invariants, not Windows runtime behavior; the
report states this limit and links separately executed Rust behavior tests.
"""
import hashlib
import json
import re
import wave
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs/kanit/tum_test"


@pytest.mark.parametrize("filename,patterns", [
    ("ipc.rs", [r"PIPE_REJECT_REMOTE_CLIENTS", r"EqualSid", r"satir_bayt:\s*16_384", r"baglanti:\s*4", r"CancelIoEx"]),
    ("log.rs", [r"maskele\(message\)", r"metadata.len\(\) > 2097152", r"afunobet-ui\.3\.log", r"masked.replace\(&h,\s*\"~\"\)"]),
    # Rust whitespace is insignificant; retain the exact 2560-byte bound.
    ("kimlik.rs", [r"CRED_TYPE_GENERIC", r"CredWriteW", r"CredReadW", r"write_volatile", r"secret\.len\(\)\s*>\s*2560\b"]),
    ("tray.rs", [r'"open", "AfuNöbet"', r'"hide", "Gizle"', r'"status", "Durum"', r'"quit", "Çıkış"', r"show_menu_on_left_click\(false\)"]),
    ("ses.rs", [r'"finished" => include_bytes!', r'"error" => include_bytes!', r'"question" => include_bytes!', r'"rate_limit" => include_bytes!', r"_ => return None"]),
    ("watch.rs", [r"notify", r"read_snapshot", r"idle_watch_never_produces_a_timer_read", r"partial_publication_retries_once_and_recovers_without_restart"]),
])
def test_native_invariant_contract(filename, patterns):
    source = (ROOT / "windows/src-tauri/src" / filename).read_text(encoding="utf-8-sig")
    for pattern in patterns:
        assert re.search(pattern, source), f"{filename}: contract missing: {pattern}"


@pytest.mark.parametrize("path", sorted((ROOT / "windows/public/ses").glob("*.wav")), ids=lambda p: p.name)
def test_event_audio_is_valid_embedded_pcm(path):
    with wave.open(str(path), "rb") as sound:
        assert sound.getcomptype() == "NONE"
        assert sound.getnchannels() in (1, 2)
        assert sound.getsampwidth() in (1, 2, 3, 4)
        assert 0 < sound.getnframes() / sound.getframerate() <= 10
        assert len(sound.readframes(sound.getnframes())) > 0


def test_ci_has_three_language_gates_without_write_permissions():
    source = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8-sig")
    for command in ("tsc --noEmit", "npm test", "cargo test", "python -m pytest -q tests"):
        assert command in source
    assert "pull_request:" in source
    assert "contents: read" in source
    assert "contents: write" not in source


@pytest.mark.parametrize("service", ["github", "vercel", "n8n", "stripe", "notion"])
def test_e7_declared_service_pills_have_an_implementation(service):
    """Acceptance of the tracker claim, not just the implemented GitHub subset."""
    source = "\n".join(p.read_text(encoding="utf-8-sig") for p in (
        ROOT / "windows/src-tauri/src/servis.rs",
        ROOT / "windows/src/sistem/servis.ts",
    ))
    assert re.search(r'["\x27]' + service + r'["\x27]', source, re.I), \
        f"E7 tracker declares {service}, but the service implementations only expose GitHub"


def test_orkestra_respects_project_locked_codex_rule():
    """Read-only safety acceptance; never starts the command under examination."""
    source = (ROOT / "windows/src-tauri/src/orkestra.rs").read_text(encoding="utf-8-sig")
    send = source.split("pub async fn orkestra_send", 1)[1].split("#[cfg(test)]", 1)[0]
    before_spawn = send.split("cmd.spawn()", 1)[0]
    assert re.search(r'codex', before_spawn, re.I) and re.search(r'return\s+Err|Err\(', before_spawn), \
        "Project requires Codex KORUNUYOR: orkestra_send has no Codex rejection before spawning"


def test_asset_animation_inventory_has_27_decodable_webp_files():
    from PIL import Image
    files = list((ROOT / "windows/public/afu/durum").glob("*.webp"))
    assert len(files) == 27
    for path in files:
        with Image.open(path) as image:
            assert image.width > 0 and image.height > 0
            image.seek(image.n_frames - 1)
            image.load()


def test_task_scope_exactly_matches_requested_feature_union():
    source = (ROOT / "docs/kanit/ozellik/ozellikler.html").read_text(encoding="utf-8-sig")
    requested = json.loads(re.search(r"const TEST=(.*?);", source).group(1))
    part = source.split("const F=[")[1].split("\n];")[0]
    rows = [json.loads(line.rstrip(",")) for line in part.splitlines() if line.startswith('["')]
    names = {r[2] for r in rows if r[1] in ("ok", "build")}
    names |= {name for name, status in requested.items() if status == "test edilecek"}
    inventory = json.loads((EVIDENCE / "inventory.json").read_text(encoding="utf-8"))
    assert {item["name"] for item in inventory} == names
    assert len(inventory) == len(names)


def test_sources_outside_authorized_r1_scope_including_island_are_byte_identical():
    # GOREV_PYTEST_ONAR explicitly authorizes a separate recovery baseline.
    # Keep historical R1/R3 evidence unchanged and pin ALL paths and bytes,
    # including island.rs; recovery must not narrow this gate to a single file.
    hashes = json.loads((ROOT / "docs/kanit/kurtarma_source_hashes.json").read_text(encoding="utf-8"))
    actual = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
              for folder in ("windows/src", "windows/src-tauri/src")
              for p in (ROOT / folder).rglob("*") if p.is_file()}
    assert "windows/src-tauri/src/island.rs" in hashes
    assert actual == hashes
