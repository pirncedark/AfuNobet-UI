"""Q5: sahte test modu (scripts/sahte_olay.py) -> uygulamanin ayristiricilari.

Uretilen dosyalar iki ayristirici tarafindan okunur:
  - windows/src-tauri/src/state.rs  (state.json: surum, kimlik, gosterim alanlari)
  - windows/src/core/state.ts       (parseState: ayni kurallarin TS hali)
  - windows/src-tauri/src/questions.rs (sorular/<id>.json) / src/question/question.ts

Buradaki denetimler ureticinin bu kuralara uydugunu ve vitest fixture'larinin
kaymadigini kanitlar; ayristirmanin kendisi windows/tests/q5_sahte_mod.test.ts
ve src-tauri testlerinde calisir.
"""
import json
import re
import sys
from pathlib import Path

import pytest

KOK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK / "scripts"))
import sahte_olay  # noqa: E402

FIXTURE = KOK / "windows" / "tests" / "fixtures"
KIMLIK = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
ZAMAN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
AJANLAR = {"codex", "gemini", "opencode", "glm", "claude"}
DURUMLAR = {"Hazirlaniyor", "Calisiyor", "Bekliyor", "Duraklatildi", "Tamamlandi", "Hata"}
KOTA_KISA = re.compile(r"\b(?:kota|quota|usage limit|rate limit|429|BLOCKED|COOLDOWN)\b", re.I)
KOTA_RUST = {"429", "kota", "quota", "blocked", "cooldown"}

SENARYOLAR = ["bos", "codex_soru", "gemini_kota", "hata", "bayat"]
AYAR = {
    "bos": {},
    "codex_soru": {"bekleme": 0.0, "cevap_bekleme": 0.0, "sabit": True},
    "gemini_kota": {"bekleme": 0.0, "sabit": True},
    "hata": {"bekleme": 0.0, "sabit": True},
    "bayat": {"sabit": True},
}
OYNATICI = {
    "bos": sahte_olay.play_bos,
    "codex_soru": sahte_olay.play_codex_soru,
    "gemini_kota": sahte_olay.play_gemini_kota,
    "hata": sahte_olay.play_hata,
    "bayat": sahte_olay.play_bayat,
}


def oynat(hedef: Path, senaryo: str, oto_cevap=None):
    """Senaryoyu beklemeden oynatir; uretilen klasoru dondurur."""
    ayar = dict(AYAR[senaryo])
    if oto_cevap:
        ayar["oto_cevap"] = oto_cevap
    OYNATICI[senaryo](hedef, **ayar)
    return hedef


def durum(hedef: Path) -> dict:
    with open(hedef / "state.json", "r", encoding="utf-8") as f:
        return json.load(f)


def rust_gosterim_metni(deger: str) -> bool:
    """state.rs `text()` süzgeci: bu metni olduğu gibi bırakır mı?"""
    if not deger.strip() or len(deger) > 400 or any(ord(c) < 32 for c in deger):
        return False
    kucuk = deger.lower()
    if any(yasak in kucuk for yasak in ("http:", "https:", "://", "429", "cmd.exe")):
        return False
    if "/" in deger or "\\" in deger or ":" in deger:
        return False
    yasak_kelimeler = {"pid", "port", "bearer", "token", "secret", "api_key",
                       "authorization", "last_error", "localhost", "powershell"}
    kelimeler = {k for k in re.split(r"[^a-z0-9_]+", kucuk) if k}
    return not kelimeler & yasak_kelimeler


def kota_ipucu(gorev: dict) -> bool:
    """state.rs quota_reason() ile state.ts'in kota sezgisi aynı sonucu vermeli."""
    ham = [gorev.get(k) for k in ("mesaj", "message", "last_error", "circuit", "provider_status")]
    rust = False
    for deger in ham:
        if not isinstance(deger, str):
            continue
        duz = deger.lower().replace("_", " ")
        kelimeler = {k for k in re.split(r"[^a-z0-9]+", duz) if k}
        if kelimeler & KOTA_RUST or "usage limit" in duz or "rate limit" in duz:
            rust = True
    ts = bool(KOTA_KISA.search(str(gorev.get("mesaj") or gorev.get("message") or "")))
    assert rust == ts, f"Rust ve TS kota sezgisi ayrisiyor: {gorev}"
    return rust


@pytest.mark.parametrize("senaryo", SENARYOLAR)
def test_state_json_sozlesmeye_uyar(tmp_path, senaryo):
    """state.rs read_snapshot + state.ts parseState bu dosyayi ayni sonucu okur."""
    oynat(tmp_path / senaryo, senaryo, bekleme=0.0, sabit=True)
    veri = durum(tmp_path / senaryo)
    assert veri["version"] == 1
    assert veri["mesaj"] == "", "mesaj bos degilse arayuz 'Baglanti bekleniyor' der"
    assert isinstance(veri["tasks"], list) and len(veri["tasks"]) <= 5000
    kimlikler = set()
    for gorev in veri["tasks"]:
        kimlik = gorev["id"]
        assert KIMLIK.match(kimlik) and kimlik not in kimlikler
        kimlikler.add(kimlik)
        assert gorev["agent"] in AJANLAR
        assert gorev["status"] in DURUMLAR
        assert ZAMAN.match(gorev["started_at"])
        # Arayuz canlilik penceresi updated_at ile acar; yoksa kayit hic gosterilmez.
        assert ZAMAN.match(gorev["updated_at"])
        for alan in ("task", "current_action", "model"):
            deger = gorev.get(alan)
            if isinstance(deger, str) and deger:
                assert rust_gosterim_metni(deger), f"{alan} süzgeçten düşer: {deger!r}"
        assert set(gorev) <= {"id", "agent", "status", "task", "current_action", "model",
                              "started_at", "updated_at", "message", "last_error", "quota"}, \
            f"arayüzün tanımadığı alan sızdı: {sorted(set(gorev))}"


def test_bos_senaryo_bos_tabla_acar(tmp_path):
    oynat(tmp_path, "bos")
    veri = durum(tmp_path)
    assert (veri["version"], veri["tasks"], veri["mesaj"]) == (1, [], "")


def test_codex_soru_soruyu_yazar_ve_cevapla_bitir(tmp_path):
    oynat(tmp_path, "codex_soru", bekleme=0.0, cevap_bekleme=0.0, sabit=True, oto_cevap="evet")
    veri = durum(tmp_path)
    gorev = veri["tasks"][0]
    assert (gorev["agent"], gorev["status"]) == ("codex", "Tamamlandi")
    assert not (tmp_path / "cevaplar").exists() or not list((tmp_path / "cevaplar").glob("*.json")), \
        "körü cevabı temizlenmedi"


def test_soru_dosyasi_sorulme_sozlesmesine_uyar(tmp_path):
    """questions.rs soru_coz + question.ts sorulariAyikla bu kaydi kabul eder."""
    sahte_olay.YAZILAN_SORULAR.clear()
    oynat(tmp_path, "codex_soru", bekleme=0.0, cevap_bekleme=0.0, sabit=True)
    assert sahte_olay.YAZILAN_SORULAR, "soru yazilmadi"
    soru = sahte_olay.YAZILAN_SORULAR[0]
    assert soru["surum"] == 1
    assert KIMLIK.match(soru["id"]) and soru["ajan"].islower() and KIMLIK.match(soru["ajan"])
    assert soru["tur"] in {"komut", "dosya", "izin", "soru"}
    assert soru["metin"].strip()
    assert 0 < len(soru["secenekler"]) <= 6 and soru["varsayilan"] in {s["id"] for s in soru["secenekler"]}
    assert soru["sonGecerlilik"] > soru["olusturma"]


def test_soru_id_dosya_adiyla_ayni(tmp_path):
    oynat(tmp_path, "codex_soru", bekleme=0.0, cevap_bekleme=0.0, sabit=True)
    for dosya in (tmp_path / "sorular").glob("*.json"):
        with open(dosya, "r", encoding="utf-8") as f:
            assert json.load(f)["id"] == dosya.stem


def test_gemini_kota_duraklatildi_olarak_okunur(tmp_path):
    oynat(tmp_path / "kota", "gemini_kota", bekleme=0.0, sabit=True)
    veri = durum(tmp_path / "kota")
    gorev = veri["tasks"][0]
    assert gorev["status"] == "Hata"
    assert kota_ipucu(gorev), "kota ipucu yoksa arayuz hatayi gorur, duraklatildi gormez"
    assert veri["quotas"]["gemini"]["remaining_percent"] == 0


def test_hata_kota_sayilmaz(tmp_path):
    oynat(tmp_path / "hata", "hata", bekleme=0.0, sabit=True)
    veri = durum(tmp_path / "hata")
    gorev = veri["tasks"][0]
    assert (gorev["status"], kota_ipucu(gorev)) == ("Hata", False)


def test_bayat_kaydi_canli_sayilmaz(tmp_path):
    """isCurrent: 30 dakikadır güncellenmemiş 'Calisiyor' kaydı gösterilmez."""
    oynat(tmp_path / "bayat", "bayat", sabit=True)
    gorev = durum(tmp_path / "bayat")["tasks"][0]
    assert gorev["status"] == "Calisiyor"
    assert gorev["updated_at"] == "2020-01-01T00:00:00Z"
    assert gorev["updated_at"] == gorev["started_at"], "dokunma=False olsa damga tazelenirdi"


def test_uretilen_dosyalar_hedef_klasorde_kalir(tmp_path):
    oynat(tmp_path / "codex_soru", "codex_soru", bekleme=0.0, cevap_bekleme=0.0, sabit=True, oto_cevap="evet")
    kalan = {yol.relative_to(tmp_path).as_posix() for yol in tmp_path.rglob("*") if yol.is_file()}
    assert kalan <= {"state.json", "sorular/codex-soru.json"}, kalan
    assert not list(tmp_path.rglob("*.tmp")), "atomik yazma artigi kaldi"


@pytest.mark.parametrize("ad", ["sahte_bos.json", "sahte_codex_soru.json", "sahte_gemini_kota.json",
                                "sahte_hata.json", "sahte_bayat.json"])
def test_vitest_fixture_lari_sozlesmeye_uyar(ad):
    """Fixture'lar gerçek üreticinin çıktısıdır; kayarsa vitest anlamını yitirir."""
    with open(FIXTURE / ad, "r", encoding="utf-8") as f:
        veri = json.load(f)
    assert veri["version"] == 1 and veri["mesaj"] == ""
    for gorev in veri["tasks"]:
        assert KIMLIK.match(gorev["id"])
        assert gorev["agent"] in AJANLAR and gorev["status"] in DURUMLAR
        assert ZAMAN.match(gorev["updated_at"])
        for alan in ("task", "current_action", "model"):
            deger = gorev.get(alan)
            if isinstance(deger, str) and deger:
                assert rust_gosterim_metni(deger), f"{ad}: {alan} süzgeçten düşer: {deger!r}"


def test_vitest_soru_fixture_sozlesmeye_uyar():
    with open(FIXTURE / "sahte_soru_kodu.json", "r", encoding="utf-8") as f:
        soru = json.load(f)
    assert soru["surum"] == 1
    assert KIMLIK.match(soru["id"]) and soru["id"] == "codex-soru"
    assert KIMLIK.match(soru["ajan"]) and soru["ajan"].islower()
    assert soru["tur"] in {"komut", "dosya", "izin", "soru"}
    assert soru["metin"].strip() and soru["sonGecerlilik"] > soru["olusturma"]
    assert soru["varsayilan"] in {s["id"] for s in soru["secenekler"]}


def test_ps1_betigi_ortam_degiskenlerini_kuruyor():
    """scripts/sahte_modda_ac.ps1: ortam + exe, ama pencere yalnizca -Ac ile."""
    betik = (KOK / "scripts" / "sahte_modda_ac.ps1").read_text(encoding="utf-8")
    assert "AFUNOBET_UI_STATE" in betik and "AFUNOBET_SORU_DIZINI" in betik
    assert "test_durum" in betik and "afunobet-ui" in betik
    assert "[switch]$Ac" in betik, "pencere acma istege bagli olmali"
    baslat = betik.split("if ($Ac)")[1] if "if ($Ac)" in betik else ""
    assert "Start-Process" in baslat, "exe yalnizca -Ac ile baslatilmalı"
    assert "Start-Process" not in betik.split("if ($Ac)")[0], "betik kendiliginden pencere acmamali"
    assert "UTF8Encoding($false)" in betik, "state.json BOM'suz yazilmali (Rust cozemez)"


def test_ortam_degiskenleri_ada_tarafindan_okunuyor():
    """Ortam degiskenleri gercekten uygulamanin ayristiricisinda geçerli mi?"""
    state_rs = (KOK / "windows" / "src-tauri" / "src" / "state.rs").read_text(encoding="utf-8")
    soru_rs = (KOK / "windows" / "src-tauri" / "src" / "questions.rs").read_text(encoding="utf-8")
    assert 'var_os("AFUNOBET_UI_STATE")' in state_rs
    assert 'var_os("AFUNOBET_DB")' in state_rs
    assert 'var_os("AFUNOBET_SORU_DIZINI")' in soru_rs
    assert "crate::state::resolve_path().parent()" in soru_rs, \
        "soru kökü state.json klasörüne düşmeli"