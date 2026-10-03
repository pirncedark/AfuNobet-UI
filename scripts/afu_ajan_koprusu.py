"""Fail-open ajan köprüsü: ajan kancası JSON'unu protokol satırına çevirip adaya yollar.

Sözleşme: docs/AJAN_PROTOKOLU.md (E1, E4, F17, F18) ve docs/SORU_SOZLESMESI.md.
Yalnız standart kütüphane; ağ yok, model çağrısı yok.

Kurallar:
- Çıkış kodu HER ZAMAN 0; stdout/stderr'e hiçbir şey yazılmaz (yalnız `--onay`
  modunda riskli işlemde kanca kararı stdout'a yazılır).
- AFU kapalı / çökmüş / yavaşsa en geç `--zaman-asimi` (varsayılan 0,3 sn) içinde
  sessizce çıkılır. Bitişte `os._exit(0)`: asılı gönderim thread'i beklenmez.

Örnekler:
    <claude kanca json> | python scripts/afu_ajan_koprusu.py
    <claude PreToolUse json> | python scripts/afu_ajan_koprusu.py --onay
    '{"surum":1,"ajan":"yeni-ajan","olay":"working"}' | python scripts/afu_ajan_koprusu.py --ham
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from codex_soru_koprusu import SoruDeposu, maskele, varsayilan_kok  # noqa: E402

ZAMAN_ASIMI = 0.3
ONAY_SURE = 110.0
YENIDEN_DENEME = 0.05  # F17: tek, kısa yeniden deneme
MAX_GOREV = 120
MAX_METIN = 2000
MAX_AYRINTI = 4000
STDIN_SURE = 2.0

ERROR_PIPE_BUSY = 231
ERROR_FILE_NOT_FOUND = 2

ONAY_OLAYLARI = {"pretooluse", "beforetool"}
ALT_AJAN_OLAYLARI = {"subagentstart", "subagentstop"}

# --- boru adı ---------------------------------------------------------------


def boru_adi() -> str:
    """`AFUNOBET_AJAN_PIPE` ya da `\\\\.\\pipe\\afunobet-ajan-<kullanıcı>`."""
    ozel = os.environ.get("AFUNOBET_AJAN_PIPE")
    if ozel:
        return ozel
    kullanici = re.sub(r"[^a-z0-9_-]", "", (os.environ.get("USERNAME") or "").lower()) or "kullanici"
    return "\\\\.\\pipe\\afunobet-ajan-" + kullanici


# --- protokol satırı ----------------------------------------------------------


def _kisa(metin: Any, en_fazla: int) -> str | None:
    if not isinstance(metin, str):
        return None
    metin = " ".join(metin.split())
    if not metin:
        return None
    metin = maskele(metin)
    return metin if len(metin) <= en_fazla else metin[: en_fazla - 1] + "…"


def _ajan_adi(ad: Any) -> str | None:
    if not isinstance(ad, str):
        return None
    ad = re.sub(r"[^a-z0-9_-]", "", ad.strip().lower())[:32]
    return ad or None


def _oturum(deger: Any) -> str | None:
    if deger is None or isinstance(deger, (dict, list, bool)):
        return None
    deger = re.sub(r"[^A-Za-z0-9_.:-]", "-", str(deger))[:80]
    return deger or None


def _ilk(veri: dict, *anahtarlar: str) -> Any:
    for a in anahtarlar:
        v = veri.get(a)
        if v not in (None, ""):
            return v
    return None


def olay_adi(veri: dict) -> str | None:
    """Ham olay adı (çeviri Rust'ta yapılır)."""
    olay = _ilk(veri, "hook_event_name", "hookEventName", "type", "event", "method", "olay")
    return olay.strip() if isinstance(olay, str) and olay.strip() else None


def _sade(olay: str) -> str:
    return re.sub(r"[_./\s-]", "", olay).lower()


def protokol_satiri(veri: dict, ajan: str | None = None, simdi_ms: int | None = None) -> dict | None:
    """Kanca JSON'unu protokol nesnesine çevirir; olay adı yoksa None. None alanlar atlanır."""
    if not isinstance(veri, dict):
        return None
    olay = olay_adi(veri)
    if olay is None:
        return None
    ajan = _ajan_adi(ajan) or _ajan_adi(veri.get("agent")) or _ajan_adi(veri.get("ajan")) or "claude"
    arac = _ilk(veri, "tool_name", "toolName", "tool")
    gorev = _kisa(_ilk(veri, "prompt", "gorev"), MAX_GOREV) or _kisa(arac if isinstance(arac, str) else None, MAX_GOREV)
    satir: dict[str, Any] = {
        "surum": 1,
        "ajan": ajan,
        "olay": olay,
        "oturum": _oturum(_ilk(veri, "session_id", "sessionId", "oturum", "thread-id", "thread_id", "threadId") or (veri.get("params") or {}).get("threadId")),
        "gorev": gorev,
        "zaman": simdi_ms if simdi_ms is not None else int(time.time() * 1000),
    }
    if satir["olay"] == "turn/completed" and isinstance(veri.get("params"), dict) and \
       isinstance(veri["params"].get("turn"), dict) and veri["params"]["turn"].get("status") == "failed" and \
       isinstance(veri["params"]["turn"].get("error"), dict) and veri["params"]["turn"]["error"].get("message") == "quota exceeded":
        satir["olay"] = "rate_limit"
    if _sade(olay) in ALT_AJAN_OLAYLARI:
        satir["alt_oturum"] = _oturum(_ilk(veri, "agent_id", "agentId", "alt_oturum"))
        if satir["gorev"] is None:
            satir["gorev"] = satir["alt_tur"]
    return {k: v for k, v in satir.items() if v is not None}


def ham_satiri(metin: str) -> str:
    """--ham: satır olduğu gibi gider; JSON ise yalnız `gorev` maskelenir."""
    metin = metin.strip()
    try:
        veri = json.loads(metin)
    except ValueError:
        return metin
    if isinstance(veri, dict) and isinstance(veri.get("gorev"), str):
        veri["gorev"] = maskele(veri["gorev"])
        return json.dumps(veri, ensure_ascii=False)
    return metin


# --- gönderim (E4 + F17) ------------------------------------------------------


def _boruya_yaz(boru: str, veri: bytes) -> None:
    """CreateFile + WriteFile: Windows hata kodu (2 yok, 231 meşgul) korunur.

    `open()` meşgul boruda kodu EINVAL'e çevirdiği için `_winapi` tercih edilir.
    """
    try:
        import _winapi
    except ImportError:  # Windows dışı: düz dosya/FIFO
        with open(boru, "wb", buffering=0) as f:
            f.write(veri)
        return
    h = _winapi.CreateFile(boru, _winapi.GENERIC_WRITE, 0, _winapi.NULL, _winapi.OPEN_EXISTING, 0, _winapi.NULL)
    try:
        yazilan = 0
        while yazilan < len(veri):
            n, hata = _winapi.WriteFile(h, veri[yazilan:], False)
            if hata or n <= 0:
                raise OSError(None, "yazilamadi", boru, hata)
            yazilan += n
    finally:
        _winapi.CloseHandle(h)


def _yaz(veri: bytes, boru: str, son_an: float, sonuc: dict) -> None:
    deneme = 0
    while True:
        deneme += 1
        sonuc["deneme"] = deneme
        try:
            _boruya_yaz(boru, veri)
            sonuc["ok"] = True
            return
        except OSError as h:
            yeniden = isinstance(h, FileNotFoundError) or getattr(h, "winerror", None) in (ERROR_PIPE_BUSY, ERROR_FILE_NOT_FOUND)
            sonuc["hata"] = getattr(h, "winerror", None) or h.errno
            if not yeniden or deneme >= 2 or time.monotonic() + YENIDEN_DENEME >= son_an:
                return
            time.sleep(YENIDEN_DENEME)
        except Exception:  # noqa: BLE001 - fail-open
            return


def gonder_ayrinti(satir: str, boru: str | None = None, zaman_asimi: float = ZAMAN_ASIMI) -> dict:
    """Satırı ayrı daemon thread'de boruya yazar; en geç `zaman_asimi` sonra döner.

    Dönüş: {"ok": bool, "deneme": int, "hata": winerror|None, "sure": sn}.
    """
    basla = time.monotonic()
    sonuc: dict = {"ok": False}
    try:
        veri = (satir.rstrip("\n") + "\n").encode("utf-8")
        is_ = threading.Thread(target=_yaz, args=(veri, boru or boru_adi(), basla + zaman_asimi, sonuc), daemon=True)
        is_.start()
        is_.join(max(0.0, zaman_asimi - (time.monotonic() - basla)))
    except Exception:  # noqa: BLE001
        pass
    sonuc = dict(sonuc)
    sonuc["ok"] = bool(sonuc.get("ok"))
    sonuc["sure"] = time.monotonic() - basla
    return sonuc


def gonder(satir: str, boru: str | None = None, zaman_asimi: float = ZAMAN_ASIMI) -> bool:
    """Fail-open gönderim; hiçbir hata dışarı sızmaz. Başarılıysa True."""
    return gonder_ayrinti(satir, boru, zaman_asimi)["ok"]


def afu_acik_mi(boru: str | None = None) -> bool:
    """Boru var mı? Bağlantı harcamadan (WaitNamedPipe 1 ms) bakar."""
    boru = boru or boru_adi()
    try:
        import _winapi

        _winapi.WaitNamedPipe(boru, 1)
        return True
    except OSError as h:
        return getattr(h, "winerror", None) != ERROR_FILE_NOT_FOUND
    except Exception:  # noqa: BLE001 - _winapi yoksa
        return os.path.exists(boru)


# --- F18 onay kapısı ----------------------------------------------------------

SILME = "Silme işlemi onaylansın mı?"
GECMIS = "Geçmişin üzerine yazma onaylansın mı?"
YAYIN = "Yayınlama onaylansın mı?"
GERI_ALINAMAZ = "Geri alınamaz işlem onaylansın mı?"
GUVENLIK = "Güvenlik ayarı değişikliği onaylansın mı?"

_B = r"[^;&|\n]*"  # aynı komut parçası içinde
_I = re.IGNORECASE
RISKLI_KALIPLAR: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\b(?:rm|Remove-Item|ri|rmdir|rd|del|erase)\b", _I), SILME),
    (re.compile(r"\bgit\s+clean\b" + _B + r"\s-[A-Za-z]*f", _I), SILME),
    (re.compile(r"\bgit\s+branch\b" + _B + r"\s(?:-D\b|--delete\s+--force\b|-d\s+-f\b)"), SILME),
    (re.compile(r"\bgit\s+push\b" + _B + r"(?:\s--force\b|\s--force-with-lease\b|\s-[A-Za-z]*f\b|\s--delete\b|\s-d\b|\s:\S+|\s\+\S+|\s--mirror\b)", _I), GECMIS),
    (re.compile(r"\bgit\s+reset\b" + _B + r"\s--hard\b", _I), GECMIS),
    (re.compile(r"\bgh\s+release\s+(?:create|upload|edit)\b", _I), YAYIN),
    (re.compile(r"\bgh\s+release\s+delete\b", _I), GERI_ALINAMAZ),
    (re.compile(r"\bgh\s+repo\s+delete\b", _I), GERI_ALINAMAZ),
    (re.compile(r"\b(?:npm|pnpm|yarn)\s+publish\b", _I), YAYIN),
    (re.compile(r"\bcargo\s+publish\b", _I), YAYIN),
    (re.compile(r"\btwine\s+upload\b", _I), YAYIN),
    (re.compile(r"\bdrop\s+(?:table|database|schema)\b", _I), GERI_ALINAMAZ),
    (re.compile(r"\b(?:rm|Remove-Item|ri|rmdir|rd|del|erase)\b", _I), SILME),
    (re.compile(r"\bicacls\b" + _B + r"/grant\b" + _B + r"\b(?:Everyone|\*S-1-1-0|Herkes)\b", _I), GUVENLIK),
    (re.compile(r"\bnetsh\s+(?:advfirewall|firewall)\b", _I), GUVENLIK),
    (re.compile(r"\bSet-NetFirewall\w*|\bDisable-NetFirewall\w*|\bSet-MpPreference\b", _I), GUVENLIK),
]
_SILME_ARACI = re.compile(r"delete|remove", _I)
_KOMUT_ALANLARI = ("command", "cmd", "commandLine", "script", "code")


def _komut_metni(tool_input: Any) -> str:
    if isinstance(tool_input, str):
        return tool_input
    if isinstance(tool_input, dict):
        for a in _KOMUT_ALANLARI:
            v = tool_input.get(a)
            if isinstance(v, list):
                v = " ".join(str(p) for p in v)
            if isinstance(v, str) and v.strip():
                return v
        try:
            return json.dumps(tool_input, ensure_ascii=False)
        except (TypeError, ValueError):
            return ""
    if isinstance(tool_input, list):
        return " ".join(str(p) for p in tool_input)
    return ""


def riskli_mi(tool_name: Any, tool_input: Any) -> tuple[bool, str | None]:
    """Saf fonksiyon: geri dönüşü zor işlem mi? (riskli, kullanıcı dilinde başlık)."""
    ad = tool_name if isinstance(tool_name, str) else ""
    if ad and _SILME_ARACI.search(ad):
        return True, SILME
    komut = _komut_metni(tool_input)
    if not komut:
        return False, None
    for kalip, baslik in RISKLI_KALIPLAR:
        if kalip.search(komut):
            return True, baslik
    return False, None


def kanca_karari(olay: str, karar: str, neden: str) -> dict:
    """Claude Code PreToolUse çıktısı; Gemini BeforeTool için {decision, reason}."""
    if _sade(olay) == "beforetool":
        return {"decision": karar, "reason": neden}
    return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": karar, "permissionDecisionReason": neden}}


def onay_iste(veri: dict, ajan: str, baslik: str, boru: str, sure_sn: float, zaman_asimi: float = ZAMAN_ASIMI,
              depo: SoruDeposu | None = None) -> tuple[str, str]:
    """Adaya soru kartı açar, cevabı bekler. Dönüş: (karar, neden) — allow/deny/ask."""
    if not afu_acik_mi(boru):
        return "ask", "AFU kapalı; onayı burada ver."
    depo = depo or SoruDeposu(varsayilan_kok())
    simdi = depo.simdi_ms()
    metin = _komut_metni(veri.get("tool_input")) or str(veri.get("tool_name") or "Bir işlem yapmak istiyor.")
    metin = maskele(metin.strip())
    if len(metin) > MAX_METIN:
        metin = metin[: MAX_METIN - 1] + "…"
    cwd = veri.get("cwd")
    ayrinti = maskele(f"Klasör: {cwd}")[:MAX_AYRINTI] if isinstance(cwd, str) and cwd else None
    soru = {
        "surum": 1,
        "id": f"{ajan}-{uuid.uuid4().hex[:12]}",
        "ajan": ajan,
        "tur": "komut",
        "baslik": baslik,
        "metin": metin or "Bir işlem yapmak istiyor.",
        "ayrinti": ayrinti,
        "secenekler": [{"id": "evet", "etiket": "İzin ver"}, {"id": "hayir", "etiket": "Reddet"}],
        "serbestMetin": False,
        "gizli": False,
        "varsayilan": "hayir",
        "olusturma": simdi,
        "sonGecerlilik": simdi + int(sure_sn * 1000),
    }
    depo.yaz(soru)
    olay = {"surum": 1, "ajan": ajan, "olay": "question", "oturum": _oturum(veri.get("session_id")), "gorev": baslik, "zaman": simdi}
    gonder(json.dumps({k: v for k, v in olay.items() if v is not None}, ensure_ascii=False), boru, zaman_asimi)
    cevap = depo.cevap_bekle(soru, aralik=0.1)
    if (cevap or {}).get("secim") == "evet":
        return "allow", "Kullanıcı adada onay verdi."
    return "deny", "Kullanıcı onay vermedi."


# --- CLI ----------------------------------------------------------------------


class _Sessiz(argparse.ArgumentParser):
    def error(self, message: str) -> None:  # stderr'e yazma
        raise ValueError(message)


def _stdin_oku(sure: float = STDIN_SURE) -> str:
    kutu: dict = {}

    def oku() -> None:
        try:
            kutu["v"] = sys.stdin.buffer.read().decode("utf-8-sig", errors="replace")
        except Exception:  # noqa: BLE001
            kutu["v"] = ""

    try:
        if sys.stdin is None or sys.stdin.isatty():
            return ""
    except Exception:  # noqa: BLE001
        return ""
    t = threading.Thread(target=oku, daemon=True)
    t.start()
    t.join(sure)
    return kutu.get("v", "")


def _stdout(nesne: dict) -> None:
    try:
        sys.stdout.buffer.write(json.dumps(nesne, ensure_ascii=False).encode("utf-8"))
        sys.stdout.buffer.flush()
    except Exception:  # noqa: BLE001
        pass


def calis(argv: list[str] | None = None) -> None:
    ayr = _Sessiz(add_help=False)
    ayr.add_argument("--ajan", default=None)
    ayr.add_argument("--ham", action="store_true")
    ayr.add_argument("--zaman-asimi", type=float, default=ZAMAN_ASIMI)
    ayr.add_argument("--onay", action="store_true")
    ayr.add_argument("--onay-sure", type=float, default=ONAY_SURE)
    ayr.add_argument("json_arg", nargs="?", default=None, help="Codex notify gibi JSON'u argüman olarak veren ajanlar için")
    args, _ = ayr.parse_known_args(argv)
    zaman_asimi = max(0.0, min(args.zaman_asimi, 5.0))
    boru = boru_adi()
    girdi = args.json_arg if args.json_arg is not None else _stdin_oku()
    if not girdi.strip():
        return
    if args.ham:
        for parca in girdi.splitlines():
            if parca.strip():
                gonder(ham_satiri(parca), boru, zaman_asimi)
                break  # tek satır; ek satırlar için ayrı çağrı
        return
    try:
        veri = json.loads(girdi)
    except ValueError:
        return
    if not isinstance(veri, dict):
        return
    satir = protokol_satiri(veri, args.ajan)
    if satir is None:
        return
    if args.onay and _sade(satir["olay"]) in ONAY_OLAYLARI:
        riskli, baslik = riskli_mi(_ilk(veri, "tool_name", "toolName", "tool"), _ilk(veri, "tool_input", "toolInput", "args"))
        if riskli:
            if not afu_acik_mi(boru):
                _stdout(kanca_karari(satir["olay"], "ask", "AFU kapalı; onayı burada ver."))
                return
            gonder(json.dumps(satir, ensure_ascii=False), boru, zaman_asimi)
            try:
                karar, neden = onay_iste(veri, satir["ajan"], baslik or GERI_ALINAMAZ, boru, args.onay_sure, zaman_asimi, acik_bilinen=True)
            except Exception as e:  # noqa: BLE001
                karar, neden = "deny", f"Depo hatası: {e}"
            _stdout(kanca_karari(satir["olay"], karar, neden))
            return
    gonder(json.dumps(satir, ensure_ascii=False), boru, zaman_asimi)


def main(argv: list[str] | None = None) -> None:
    try:
        sys.stdout.flush()
    except Exception:  # noqa: BLE001
        pass
    os._exit(0)


if __name__ == "__main__":
    main()
            except Exception as e:  # noqa: BLE001
                karar, neden = "deny", f"Depo hatası: {e}"
