"""Ayrı, tek örnek, salt okunur AfuNöbet durum üreticisi; otomatik başlatılmaz."""
import argparse
import contextlib
import json
import math
import os
from pathlib import Path
import tempfile
import time

from afu.ui_state import _db_path, build_state


class ZatenCalisiyor(RuntimeError):
    pass


@contextlib.contextmanager
def tek_ornek(kilit_yolu):
    # OS kilidi süreç ölünce bırakılır; eski PID kilidi kalıcı olarak engellemez.
    # Dosya silinmez: silme/yeniden açma yarışında iki ayrı kilit oluşmaz.
    path = Path(kilit_yolu)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as stream:
        if os.fstat(stream.fileno()).st_size == 0:
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise ZatenCalisiyor("Yenileyici zaten çalışıyor") from exc
        try:
            yield
        finally:
            stream.seek(0)
            if os.name == "nt":
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def run_once(db_path, output_path):
    out = Path(output_path)
    source = _db_path(db_path).resolve()
    temporary = None
    try:
        if out.resolve() == source or (out.exists() and source.exists() and os.path.samefile(source, out)):
            return False
        data = build_state(db_path)
        # build_state hatayı yakalayıp boş bir sonuç döndürebilir; onu yayınlama.
        if not isinstance(data, dict) or data.get("version") != 1 or data.get("mesaj") != "" or not isinstance(data.get("tasks"), list):
            return False
        ids = set()
        for row in data["tasks"]:
            if not isinstance(row, dict) or not isinstance(row.get("id"), str) or not row["id"] or row["id"] in ids:
                return False
            ids.add(row["id"])
        encoded = json.dumps(data, ensure_ascii=False, allow_nan=False).encode("utf-8")
        out.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=out.parent, prefix=out.name + ".", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(encoded + b"\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, out)
        temporary = None
        return True
    except Exception:
        return False
    finally:
        if temporary is not None:
            with contextlib.suppress(OSError):
                temporary.unlink()


def main(argv=None):
    parser = argparse.ArgumentParser(description="AfuNöbet durum yenileyicisi")
    parser.add_argument("--db")
    parser.add_argument("--output")
    parser.add_argument("--aralik", type=float, default=15.0)
    parser.add_argument("--durdur", action="store_true")
    args = parser.parse_args(argv)
    if not math.isfinite(args.aralik) or args.aralik < 1:
        parser.error("Aralık en az 1 saniye olmalı")
    db = _db_path(args.db)
    out = Path(args.output) if args.output else db.with_name("state.json")
    lock = out.with_name("ui_state_loop.lock")
    stop = out.with_name("ui_state_loop.stop")
    if db.resolve() in (out.resolve(), lock.resolve(), stop.resolve()):
        parser.error("Durum dosyası için farklı bir hedef seçin")
    if args.durdur:
        stop.parent.mkdir(parents=True, exist_ok=True)
        stop.touch()
        return 0
    try:
        with tek_ornek(lock):
            stop.unlink(missing_ok=True)
            while not stop.exists():
                run_once(db, out)
                deadline = time.monotonic() + args.aralik
                while not stop.exists() and time.monotonic() < deadline:
                    time.sleep(min(0.25, max(0, deadline - time.monotonic())))
            stop.unlink(missing_ok=True)
    except KeyboardInterrupt:
        return 0
    except ZatenCalisiyor:
        print("Yenileyici zaten çalışıyor.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
