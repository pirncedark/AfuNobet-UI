"""Salt okunur SQLite verisinden sade ve atomik UI durum dosyasi uretir."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENTS = {"codex": "codex", "gemini": "gemini", "flash": "gemini", "pro": "gemini",
          "opencode": "opencode", "glm": "glm", "claude": "claude"}
NAMES = {"codex": "Codex", "gemini": "Gemini", "opencode": "OpenCode", "glm": "GLM", "claude": "Claude"}
STATUSES = {
    "PREPARING": "Hazirlaniyor", "HAZIRLANIYOR": "Hazirlaniyor", "PENDING": "Hazirlaniyor",
    "RUNNING": "Calisiyor", "CALISIYOR": "Calisiyor",
    "WAITING": "Bekliyor", "BEKLIYOR": "Bekliyor", "QUEUED": "Bekliyor",
    "DURAKLADI": "Duraklatildi", "PAUSED": "Duraklatildi", "DURAKLATILDI": "Duraklatildi",
    "COMPLETED": "Tamamlandi", "DONE": "Tamamlandi", "BITTI": "Tamamlandi",
    "HATA": "Hata", "FAILED": "Hata", "ERROR": "Hata", "LOST": "Hata",
}
UNAVAILABLE = "Gorevler okunamadi - biraz sonra tekrar deneyin"
TECHNICAL = re.compile(
    r"(?i)\b(?:pid|port|traceback)\b|--[\w-]+|"
    r"\b(?:api[_ -]?key|token|secret|password)\s*[:=]|\bbearer\s+|"
    r"[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b[a-z]:[\\/]|https?://|"
    r"(?<!\w)/(?:[^\s/]+/)*[^\s/]+|\b\d{1,3}(?:\.\d{1,3}){3}\b|"
    r"\b(?:sk|ghp|gho|AIza)[-_][a-z0-9_-]{12,}"
)
COMMAND = re.compile(
    r"(?i)(?:^|[;&|`:]|\b(?:calistir|run|execute)\s+)\s*(?:"
    r"(?:python(?:w|3)?|powershell|pwsh|cmd|bash|sh|git|npm|npx|pip|curl|wget|"
    r"node|java|dotnet|cargo|gradle|docker|kubectl|ssh|scp|cat|ls|dir|echo|rm|del|taskkill)(?:\s|$)|"
    r"(?:codex|claude|gemini|opencode|omp)(?:$|\s+(?:-\S+|exec\b|run\b|resume\b|login\b|logout\b)))"
)
QUOTA_ERROR = re.compile(r"(?i)\b(?:kota|quota(?:_exceeded)?|usage limit|rate limit|429)\b")


def _label(value, limit=120):
    if not isinstance(value, str):
        return None
    text = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", value)
    text = " ".join(re.sub(r"[\x00-\x1f\x7f]", " ", text).split())
    if not text or TECHNICAL.search(text) or COMMAND.search(text):
        return None
    return text[:limit]


def _basename(value):
    if not isinstance(value, str):
        return None
    return _label(value.replace("\\", "/").rstrip("/").rsplit("/", 1)[-1], 80)


def _timestamp(value):
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
    except ValueError:
        return None


def _percent(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 100 and math.isfinite(value):
        return value
    return None


def _task_record(job, providers):
    try:
        checkpoint = json.loads(job.get("checkpoint_data") or "{}")
    except (ValueError, TypeError, RecursionError):
        checkpoint = {}
    if not isinstance(checkpoint, dict):
        checkpoint = {}
    agent = AGENTS.get(str(job.get("subagent") or "").casefold())
    agent = agent or AGENTS.get(str(job.get("provider") or "").casefold())
    provider = providers.get(str(agent or "").upper(), {})
    status = STATUSES.get(str(job.get("status") or "").upper(), "Hazirlaniyor")
    goal = checkpoint.get("goal")
    read_file = None
    if isinstance(goal, str):
        match = re.match(r"\s*Read\s+(?:\"([^\"]+)\"|(\S+))", goal, re.IGNORECASE)
        if match:
            read_file = _basename(match.group(1) or match.group(2))
    task = _label(goal)
    if read_file:
        task = _label(Path(read_file).stem.removeprefix("GOREV_").replace("_", " "))
    file = _basename(checkpoint.get("current_file") or checkpoint.get("file")) or read_file
    quota_error = QUOTA_ERROR.search(str(checkpoint.get("last_error") or ""))
    quota_blocked = provider.get("status") in ("BLOCKED", "COOLDOWN")
    if status in ("Hata", "Duraklatildi") and (quota_error or quota_blocked):
        status = "Duraklatildi"
        message = "{} duraklatildi - kota yenilenince devam edecek".format(NAMES.get(agent, "Ajan"))
    else:
        message = {
            "Hata": "Gorev tamamlanamadi - yeniden deneyin",
            "Duraklatildi": "Gorev duraklatildi - hazir oldugunuzda devam edin",
            "Bekliyor": "Gorev sirada - hazir olunca baslayacak",
            "Hazirlaniyor": "Gorev hazirlaniyor",
            "Calisiyor": "Gorev calisiyor",
            "Tamamlandi": "Gorev tamamlandi",
        }[status]
    identity = hashlib.sha256(str(job.get("job_id") or "").encode("utf-8")).hexdigest()[:16]
    record = {
        "id": "task-" + identity,
        "job_id": _label(job.get("job_id"), 80),
        "agent": agent,
        "task": task or "Gorev",
        "repo": _basename(checkpoint.get("cwd")),
        "status": status,
        "file": file,
        "current_file": file,
        "progress": 100 if status == "Tamamlandi" else _percent(checkpoint.get("progress")),
        "started": _timestamp(job.get("created_at")),
        "updated_at": _timestamp(job.get("updated_at")),
        "quota": {"remaining_percent": _percent(provider.get("quota_percent")),
                  "reset_at": _timestamp(provider.get("reset_at"))},
        "mesaj": message,
        "message": message,
    }
    for key in ("title", "current_action", "description"):
        value = _label(checkpoint.get(key))
        if value:
            record[key] = value
    model = _label(job.get("subagent_model") or checkpoint.get("model"), 80)
    if model:
        record["model"] = model
    record["started_at"] = record["started"]
    return record


def _db_path(db_path=None):
    return Path(db_path or os.environ.get("AFUNOBET_DB") or ROOT / "state.db")


def _read_quota_cache():
    """Mevcut cache salt okunur tüketilir; kota sorgusu/refresher/Claude çağrısı yok."""
    path = Path(os.environ.get("AFUNOBET_QUOTA_CACHE") or Path.home() / ".claude" / ".ajan_kota.cache")
    result = {}
    try:
        parts = path.read_text(encoding="ascii").strip().split("|")
        if len(parts) != 6:
            return result
        try:
            metadata = json.loads(Path(str(path) + ".basari.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            metadata = {}
        for index, agent in enumerate(("codex", "gemini")):
            used = int(parts[index]) if parts[index].isdigit() else None
            reset = parts[index + 2]
            record = metadata.get("saglayicilar", {}).get(agent.upper(), {})
            checked = record.get("zaman")
            result[agent] = {"remaining_percent": 100 - used if used is not None and 0 <= used <= 100 else None,
                             "reset_at": datetime.fromtimestamp(int(reset[1:])).astimezone().isoformat() if reset.startswith("@") and reset[1:].isdigit() and int(reset[1:]) > 0 else None,
                             "checked_at": datetime.fromtimestamp(checked).astimezone().isoformat() if isinstance(checked, (int, float)) and not isinstance(checked, bool) else None}
    except (OSError, ValueError, OverflowError, AttributeError, TypeError):
        return {}
    return result


def build_state(db_path=None):
    """Kaynak DB salt okunur acilir; kota sorgusu ve motor islemi yapilmaz."""
    result = {"version": 1, "tasks": [], "mesaj": ""}
    conn = None
    try:
        path = _db_path(db_path)
        conn = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True, timeout=0.25)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA query_only=ON")
        # Iki tablo ayni SQLite anlik goruntusunden okunur.
        conn.execute("BEGIN")
        jobs = [dict(row) for row in conn.execute("SELECT * FROM jobs ORDER BY job_id")]
        exists = conn.execute("SELECT 1 FROM sqlite_master WHERE type=? AND name=?",
                              ("table", "provider_state")).fetchone()
        providers = {row["provider"]: dict(row) for row in conn.execute("SELECT * FROM provider_state")} if exists else {}
        result["tasks"] = [_task_record(job, providers) for job in jobs]
        result["quotas"] = _read_quota_cache()
        for task in result["tasks"]:
            cached = result["quotas"].get(task["agent"])
            if cached:
                task["quota"] = cached.copy()
    except (OSError, sqlite3.Error, ValueError):
        result["mesaj"] = UNAVAILABLE
    finally:
        if conn is not None:
            conn.close()
    return result


def write_state(db_path=None, output_path=None):
    """Tam JSON ayni klasorde yazilir; os.replace ile tek adimda yayinlanir."""
    source = _db_path(db_path).resolve()
    target = Path(output_path) if output_path is not None else source.with_name("state.json")
    if target.resolve() == source or (target.exists() and source.exists() and os.path.samefile(source, target)):
        raise ValueError("Durum dosyasi veritabani ile ayni olamaz")
    temp_path = target.with_suffix(".tmp")
    if temp_path.resolve() in (source, target.resolve()) or (
            temp_path.exists() and source.exists() and os.path.samefile(source, temp_path)):
        raise ValueError("Gecici dosya veritabani veya hedef ile ayni olamaz")
    snapshot = build_state(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        # x modu eszamanli yazicinin state.tmp dosyasini ezmez.
        with temp_path.open(mode="x", encoding="utf-8") as stream:
            temporary = temp_path
            json.dump(snapshot, stream, ensure_ascii=False, allow_nan=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, target)
        # Yayinlanan gecici dosyanin sahipligi bitti; yeni yaziciya dokunma.
        temporary = None
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    return snapshot


def main(argv=None):
    parser = argparse.ArgumentParser(description="AfuNobet UI durum dosyasini yenile")
    parser.add_argument("--db", help="Kaynak state.db")
    parser.add_argument("--output", help="Hedef state.json")
    args = parser.parse_args(argv)
    try:
        snapshot = write_state(args.db, args.output)
    except (OSError, ValueError):
        print("Durum dosyasi yazilamadi - biraz sonra tekrar deneyin")
        return 1
    if snapshot["mesaj"]:
        print(snapshot["mesaj"])
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
