"""Codex soru köprüsü (taslak): Codex app-server onay/soru isteklerini adaya taşır.

Sözleşme: docs/SORU_SOZLESMESI.md. Ağ yok, model çağrısı yok, Claude Code hook'u yok.

Kullanım (şeffaf vekil): bir app-server istemcisi `codex app-server` yerine şunu başlatır:

    python scripts/codex_soru_koprusu.py --kok <AfuNobet klasörü> -- codex app-server

Vekil istemciden gelen satırları olduğu gibi Codex'e, Codex'ten gelenleri istemciye
aktarır. Yalnız Codex'in kullanıcıya sorduğu sunucu isteklerini (komut izni, dosya
değişikliği, ek izin, açık uçlu soru) yakalar: `sorular/<id>.json` yazar, adadaki
cevabı `cevaplar/<id>.json`dan bekler ve Codex'e cevap olarak döner. Süre dolarsa
güvenli varsayılanı (reddet) döner. Diğer sunucu istekleri istemciye aynen gider.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Iterable, TextIO

SURE_MS = 110_000  # coucou ile aynı: hook 110 s bekler
MAX_METIN = 2000
MAX_AYRINTI = 4000
MASKE = "•••"

_KALIPLAR = [
    re.compile(r"(?<![A-Za-z0-9])(?:sk-|ghp_|gho_|ghs_|ghu_|github_pat_|xox[bpa]-|AKIA)[A-Za-z0-9_\-./+=]{8,}"),
    re.compile(r"(?i)(?<![A-Za-z0-9])(bearer\s+)([^\s\"'&,;]+)"),
    re.compile(r"(?i)(?<![A-Za-z0-9])((?:password|passwd|token|secret|api_key|apikey)[A-Za-z0-9_]*\s*[=:]\s*[\"']?)([^\s\"'&,;]+)"),
]


def maskele(metin: str) -> str:
    """Bilinen gizli bilgi kalıplarını `•••` yapar (ada okurken bir kez daha maskeler)."""
    metin = _KALIPLAR[0].sub(MASKE, metin)
    metin = _KALIPLAR[1].sub(lambda m: m.group(1) + MASKE, metin)
    return _KALIPLAR[2].sub(lambda m: m.group(1) + MASKE, metin)


def _kisalt(metin: str, en_fazla: int) -> str:
    return metin if len(metin) <= en_fazla else metin[: en_fazla - 1] + "…"


def _temiz(metin: Any, en_fazla: int) -> str | None:
    if not isinstance(metin, str) or not metin.strip():
        return None
    return _kisalt(maskele(metin.strip()), en_fazla)


ONAY_ETIKET = {"evet": "İzin ver", "oturum": "Hep izin ver", "hayir": "Reddet"}
# Yöntem → (tür, başlık, {seçenek: codex kararı}, varsayılan karar)
ONAYLAR: dict[str, tuple[str, str, dict[str, str], str]] = {
    "item/commandExecution/requestApproval": (
        "komut", "Komut çalıştırılsın mı?", {"evet": "accept", "oturum": "acceptForSession", "hayir": "decline"}, "decline"),
    "item/fileChange/requestApproval": (
        "dosya", "Dosya değişikliği onaylansın mı?", {"evet": "accept", "oturum": "acceptForSession", "hayir": "decline"}, "decline"),
    "execCommandApproval": (
        "komut", "Komut çalıştırılsın mı?", {"evet": "approved", "oturum": "approved_for_session", "hayir": "denied"}, "denied"),
    "applyPatchApproval": (
        "dosya", "Dosya değişikliği onaylansın mı?", {"evet": "approved", "oturum": "approved_for_session", "hayir": "denied"}, "denied"),
}
IZIN = "item/permissions/requestApproval"
GIRDI = "item/tool/requestUserInput"
DESTEKLENEN = set(ONAYLAR) | {IZIN, GIRDI}


def _komut_metni(komut: Any) -> str | None:
    if isinstance(komut, list):
        komut = " ".join(str(p) for p in komut)
    return komut if isinstance(komut, str) else None


def _karar_listesi(params: dict) -> set[str] | None:
    liste = params.get("availableDecisions")
    if not isinstance(liste, list):
        return None
    return {k if isinstance(k, str) else next(iter(k), "") for k in liste if isinstance(k, (str, dict))}


def _taban(ajan: str, tur: str, baslik: str, metin: str, simdi_ms: int, sure_ms: int) -> dict:
    return {
        "surum": 1,
        "id": f"{ajan}-{uuid.uuid4().hex[:12]}",
        "ajan": ajan,
        "tur": tur,
        "baslik": baslik,
        "metin": metin,
        "ayrinti": None,
        "secenekler": [],
        "serbestMetin": False,
        "gizli": False,
        "varsayilan": None,
        "olusturma": simdi_ms,
        "sonGecerlilik": simdi_ms + sure_ms,
    }


def sorulari_olustur(yontem: str, params: dict, simdi_ms: int, sure_ms: int = SURE_MS, ajan: str = "codex") -> list[dict]:
    """Bir Codex sunucu isteğinden soru kayıtları üretir; desteklenmiyorsa boş liste."""
    if yontem in ONAYLAR:
        tur, baslik, kararlar, _ = ONAYLAR[yontem]
        if tur == "komut":
            govde = _temiz(_komut_metni(params.get("command")), MAX_METIN) or "Bir komut çalıştırmak istiyor."
        else:
            dosyalar = params.get("fileChanges")
            adlar = ", ".join(Path(str(a)).name for a in dosyalar) if isinstance(dosyalar, dict) and dosyalar else ""
            govde = _temiz(adlar, MAX_METIN) or _temiz(params.get("reason"), MAX_METIN) or "Dosyalarda değişiklik yapmak istiyor."
        ayrinti = [x for x in (
            f"Neden: {params['reason']}" if tur == "komut" and isinstance(params.get("reason"), str) and params["reason"].strip() else None,
            f"Klasör: {params['cwd']}" if isinstance(params.get("cwd"), str) and params["cwd"] else None,
        ) if x]
        izinli = _karar_listesi(params)
        s = _taban(ajan, tur, baslik, govde, simdi_ms, sure_ms)
        s["ayrinti"] = _temiz("\n".join(ayrinti), MAX_AYRINTI)
        s["secenekler"] = [
            {"id": sid, "etiket": ONAY_ETIKET[sid]}
            for sid, karar in kararlar.items()
            if izinli is None or karar in izinli or sid == "hayir"
        ]
        s["varsayilan"] = "hayir"
        return [s]
    if yontem == IZIN:
        s = _taban(ajan, "izin", "Ek izin verilsin mi?", _temiz(params.get("reason"), MAX_METIN) or "Daha fazla erişim istiyor.", simdi_ms, sure_ms)
        s["ayrinti"] = _temiz(f"Klasör: {params['cwd']}", MAX_AYRINTI) if isinstance(params.get("cwd"), str) else None
        s["secenekler"] = [{"id": "evet", "etiket": "İzin ver"}, {"id": "hayir", "etiket": "Reddet"}]
        s["varsayilan"] = "hayir"
        return [s]
    if yontem == GIRDI:
        sorular = []
        for q in params.get("questions") or []:
            if not isinstance(q, dict) or not isinstance(q.get("id"), str):
                continue
            secenekler = q.get("options") or []
            s = _taban(ajan, "soru", _kisalt(str(q.get("header") or "Ajan soruyor"), 120), _temiz(q.get("question"), MAX_METIN) or "Cevabın gerekiyor.", simdi_ms, sure_ms)
            s["secenekler"] = [
                {"id": f"s{i}", "etiket": _kisalt(str(o.get("label")), 40)}
                for i, o in enumerate(secenekler[:6]) if isinstance(o, dict) and str(o.get("label") or "").strip()
            ]
            aciklamalar = [f"{o.get('label')}: {o.get('description')}" for o in secenekler[:6] if isinstance(o, dict) and o.get("description")]
            s["ayrinti"] = _temiz("\n".join(aciklamalar), MAX_AYRINTI)
            s["serbestMetin"] = bool(q.get("isOther")) or not s["secenekler"]
            s["gizli"] = bool(q.get("isSecret"))
            s["_codexSoru"] = q["id"]
            sorular.append(s)
        return sorular
    return []


def codex_cevabi(yontem: str, params: dict, sorular: list[dict], cevaplar: dict[str, dict | None]) -> dict:
    """Ada cevaplarını (yoksa None = süre doldu) Codex'in beklediği sonuca çevirir."""
    if yontem in ONAYLAR:
        _, _, kararlar, varsayilan = ONAYLAR[yontem]
        c = cevaplar.get(sorular[0]["id"]) if sorular else None
        secim = (c or {}).get("secim")
        return {"decision": kararlar.get(secim, varsayilan) if secim in {s["id"] for s in sorular[0]["secenekler"]} else varsayilan}
    if yontem == IZIN:
        c = cevaplar.get(sorular[0]["id"]) if sorular else None
        if (c or {}).get("secim") == "evet" and isinstance(params.get("permissions"), dict):
            return {"permissions": params["permissions"], "scope": "turn"}
        return {"permissions": {}}
    if yontem == GIRDI:
        sonuc = {}
        for s in sorular:
            c = cevaplar.get(s["id"]) or {}
            etiket = next((x["etiket"] for x in s["secenekler"] if x["id"] == c.get("secim")), None)
            yazi = c.get("metin") if s["serbestMetin"] and isinstance(c.get("metin"), str) else None
            sonuc[s["_codexSoru"]] = {"answers": [v for v in (etiket, yazi) if v]}
        return {"answers": sonuc}
    raise ValueError(f"desteklenmeyen yöntem: {yontem}")


class SoruDeposu:
    """`sorular/` ve `cevaplar/` klasörleri; yazımlar atomik."""

    def __init__(self, kok: Path, saat: Callable[[], float] = time.time, uyku: Callable[[float], None] = time.sleep):
        self.kok = Path(kok)
        self.sorular = self.kok / "sorular"
        self.cevaplar = self.kok / "cevaplar"
        self.saat = saat
        self.uyku = uyku

    def simdi_ms(self) -> int:
        return int(self.saat() * 1000)

    def yaz(self, soru: dict) -> Path:
        self.sorular.mkdir(parents=True, exist_ok=True)
        self.cevaplar.mkdir(parents=True, exist_ok=True)
        kayit = {k: v for k, v in soru.items() if not k.startswith("_")}
        hedef = self.sorular / f"{soru['id']}.json"
        gecici = hedef.with_suffix(".json.tmp")
        gecici.write_text(json.dumps(kayit, ensure_ascii=False), encoding="utf-8")
        os.replace(gecici, hedef)
        return hedef

    def cevap_oku(self, soru_id: str) -> dict | None:
        yol = self.cevaplar / f"{soru_id}.json"
        try:
            veri = json.loads(yol.read_text(encoding="utf-8-sig"))
        except (OSError, ValueError):
            return None
        return veri if isinstance(veri, dict) and veri.get("id") == soru_id and veri.get("surum") == 1 else None

    def temizle(self, soru_id: str) -> None:
        for yol in (self.sorular / f"{soru_id}.json", self.cevaplar / f"{soru_id}.json"):
            try:
                yol.unlink()
            except FileNotFoundError:
                pass

    def cevap_bekle(self, soru: dict, aralik: float = 0.25) -> dict | None:
        """Cevap gelene ya da süre dolana kadar bekler; her iki durumda dosyaları siler."""
        try:
            while self.simdi_ms() < soru["sonGecerlilik"]:
                cevap = self.cevap_oku(soru["id"])
                if cevap is not None:
                    return cevap
                self.uyku(aralik)
            return self.cevap_oku(soru["id"])
        finally:
            self.temizle(soru["id"])


def istegi_isle(mesaj: dict, depo: SoruDeposu, sure_ms: int = SURE_MS) -> dict | None:
    """Desteklenen bir sunucu isteğini adaya sorar; JSON-RPC cevabı döner. Değilse None."""
    yontem = mesaj.get("method")
    if "id" not in mesaj or yontem not in DESTEKLENEN:
        return None
    params = mesaj.get("params") if isinstance(mesaj.get("params"), dict) else {}
    sorular = sorulari_olustur(yontem, params, depo.simdi_ms(), sure_ms)
    for s in sorular:
        depo.yaz(s)
    cevaplar = {s["id"]: depo.cevap_bekle(s) for s in sorular}
    return {"id": mesaj["id"], "result": codex_cevabi(yontem, params, sorular, cevaplar)}


def vekil(codex_cikti: Iterable[str], codex_girdi: TextIO, istemci_cikti: TextIO, depo: SoruDeposu, sure_ms: int = SURE_MS) -> list[threading.Thread]:
    """Codex çıktısını okur: soruları adaya, gerisini istemciye aktarır."""
    kilit = threading.Lock()
    isler: list[threading.Thread] = []

    def codexe_yaz(cevap: dict) -> None:
        with kilit:
            codex_girdi.write(json.dumps(cevap, ensure_ascii=False) + "\n")
            codex_girdi.flush()

    for satir in codex_cikti:
        try:
            mesaj = json.loads(satir)
        except ValueError:
            mesaj = None
        if isinstance(mesaj, dict) and "id" in mesaj and mesaj.get("method") in DESTEKLENEN:
            is_ = threading.Thread(target=lambda m=mesaj: codexe_yaz(istegi_isle(m, depo, sure_ms)), daemon=True)
            is_.start()
            isler.append(is_)
            continue
        istemci_cikti.write(satir if satir.endswith("\n") else satir + "\n")
        istemci_cikti.flush()
    return isler


def varsayilan_kok() -> Path:
    if os.environ.get("AFUNOBET_SORU_DIZINI"):
        return Path(os.environ["AFUNOBET_SORU_DIZINI"])
    if os.environ.get("AFUNOBET_UI_STATE"):
        return Path(os.environ["AFUNOBET_UI_STATE"]).parent
    if os.environ.get("AFUNOBET_DB"):
        return Path(os.environ["AFUNOBET_DB"]).parent
    # Mevcut AfuNobet kurulumu korunur; yoksa kullanici veri klasoru.
    eski = Path.home() / 'Desktop' / 'afuproject' / 'AfuNobet'
    if eski.is_dir():
        return eski
    return Path(os.environ.get('LOCALAPPDATA') or Path.home() / 'AppData' / 'Local') / 'AfuNobet'


def main(argv: list[str] | None = None) -> int:
    ayr = argparse.ArgumentParser(description="Codex sorularını AfuNobet adasına taşıyan vekil.")
    ayr.add_argument("--kok", type=Path, default=None, help="sorular/ ve cevaplar/ klasörlerinin kökü")
    ayr.add_argument("--sure", type=int, default=SURE_MS // 1000, help="soru başına bekleme (saniye)")
    ayr.add_argument("komut", nargs=argparse.REMAINDER, help="-- sonrası: codex app-server komutu")
    args = ayr.parse_args(argv)
    komut = [k for k in args.komut if k != "--"] or ["codex", "app-server"]
    depo = SoruDeposu(args.kok or varsayilan_kok())
    bayrak = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    cocuk = subprocess.Popen(komut, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8", bufsize=1, creationflags=bayrak)
    kilit = threading.Lock()

    def istemciden() -> None:
        for satir in sys.stdin:
            with kilit:
                cocuk.stdin.write(satir)
                cocuk.stdin.flush()

    threading.Thread(target=istemciden, daemon=True).start()

    class KilitliGirdi:
        def write(self, s: str) -> None:
            with kilit:
                cocuk.stdin.write(s)

        def flush(self) -> None:
            with kilit:
                cocuk.stdin.flush()

    vekil(cocuk.stdout, KilitliGirdi(), sys.stdout, depo, args.sure * 1000)
    return cocuk.wait()


if __name__ == "__main__":
    raise SystemExit(main())
