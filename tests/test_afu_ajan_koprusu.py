"""Fail-open ajan köprüsü (scripts/afu_ajan_koprusu.py): ölçülü testler.

Gerçek AFU'ya bağlanmaz; her test kendi rastgele adlı sahte borusunu `_winapi`
ile açar. Ağ yok, pencere yok.
"""
import _winapi
import ctypes
from ctypes import wintypes
import json
import os
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path

import pytest

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "scripts"))
import afu_ajan_koprusu as k  # noqa: E402

BETIK = KOK / "scripts" / "afu_ajan_koprusu.py"
ZA = 0.3  # varsayılan zaman aşımı
PAY = 0.1  # ölçüm payı (Windows saat çözünürlüğü ~15 ms)
BASLANGIC_PAYI = 1.5  # Python yorumlayıcı başlangıcı
ERROR_PIPE_CONNECTED = 535
UNLIMITED = 255
BAYRAK = getattr(subprocess, "CREATE_NO_WINDOW", 0)
_disconnect = ctypes.WinDLL("kernel32", use_last_error=True).DisconnectNamedPipe
_disconnect.argtypes = [wintypes.HANDLE]
_disconnect.restype = wintypes.BOOL


def rastgele_boru(on="afu-test"):
    return "\\\\.\\pipe\\" + on + "-" + uuid.uuid4().hex[:12]


class SahteAda:
    """Okuyan sahte AFU: her bağlantıdaki satırları toplar."""

    def __init__(self, ad, gecikme=0.0):
        self.ad = ad
        self.gecikme = gecikme
        self.satirlar = []
        self.kilit = threading.Lock()
        self.dur = False
        self.hazir = threading.Event()
        self.is_ = threading.Thread(target=self._calis, daemon=True)
        self.is_.start()

    def _calis(self):
        if self.gecikme:
            time.sleep(self.gecikme)
        while not self.dur:
            h = _winapi.CreateNamedPipe(self.ad, _winapi.PIPE_ACCESS_DUPLEX, 0, UNLIMITED, 65536, 65536, 0, _winapi.NULL)
            self.hazir.set()
            try:
                _winapi.ConnectNamedPipe(h, False)
            except OSError as e:
                if e.winerror != ERROR_PIPE_CONNECTED:
                    _winapi.CloseHandle(h)
                    continue
            threading.Thread(target=self._oku, args=(h,), daemon=True).start()

    def _oku(self, h):
        tampon = b""
        while True:
            try:
                veri, _ = _winapi.ReadFile(h, 65536, False)
            except OSError:
                break
            if not veri:
                break
            tampon += veri
        try:
            _disconnect(h)  # CPython _winapi does not expose DisconnectNamedPipe.
        except OSError:
            pass
        _winapi.CloseHandle(h)
        if self.dur:
            return
        with self.kilit:
            for s in tampon.decode("utf-8").splitlines():
                if s.strip():
                    self.satirlar.append(json.loads(s))

    def bekle(self, adet, sure=3.0):
        son = time.monotonic() + sure
        while time.monotonic() < son:
            with self.kilit:
                if len(self.satirlar) >= adet:
                    return list(self.satirlar)
            time.sleep(0.01)
        with self.kilit:
            return list(self.satirlar)

    def kapat(self):
        self.dur = True
        try:
            open(self.ad, "wb").close()  # bloklu ConnectNamedPipe'ı uyandır
        except OSError:
            pass
        self.is_.join(2)


@pytest.fixture
def ada():
    a = SahteAda(rastgele_boru())
    assert a.hazir.wait(2)
    yield a
    a.kapat()


def betik(stdin, *argv, env=None, timeout=30):
    ortam = dict(os.environ)
    ortam.update(env or {})
    basla = time.monotonic()
    r = subprocess.run([sys.executable, str(BETIK), *argv], input=stdin.encode("utf-8"), capture_output=True,
                       env=ortam, timeout=timeout, creationflags=BAYRAK)
    return r, time.monotonic() - basla


# --- E4: AFU kapalı / yavaş ----------------------------------------------------


def test_afu_kapali_surec_hemen_sessiz_cikar():
    boru = rastgele_boru("afu-yok")
    girdi = json.dumps({"hook_event_name": "PreToolUse", "session_id": "s-1", "tool_name": "Bash", "tool_input": {"command": "ls"}})
    r, sure = betik(girdi, env={"AFUNOBET_AJAN_PIPE": boru})
    print(f"surec_suresi={sure:.3f}s")
    assert (r.returncode, r.stdout, r.stderr) == (0, b"", b"")
    assert sure <= ZA + BASLANGIC_PAYI


def test_afu_kapali_gonderim_fonksiyonu_zaman_asimi_icinde():
    ayr = k.gonder_ayrinti('{"surum":1,"ajan":"x","olay":"working"}', rastgele_boru("afu-yok"), ZA)
    print(f"gonder_kapali={ayr['sure']:.3f}s deneme={ayr['deneme']}")
    assert ayr["ok"] is False
    assert ayr["sure"] <= ZA + PAY
    assert k.afu_acik_mi(rastgele_boru("afu-yok")) is False


def test_yavas_afu_okumayan_sunucu_zaman_asiminda_birakilir():
    ad = rastgele_boru("afu-yavas")
    h = _winapi.CreateNamedPipe(ad, _winapi.PIPE_ACCESS_DUPLEX, 0, 1, 0, 0, 0, _winapi.NULL)
    threading.Thread(target=lambda: _winapi.ConnectNamedPipe(h, False), daemon=True).start()
    try:
        assert k.afu_acik_mi(ad) is True
        satir = json.dumps({"surum": 1, "ajan": "x", "olay": "working", "gorev": "a" * 100, "dolgu": "b" * 16000})
        assert len(satir.encode()) < 16384  # protokol sınırı içinde
        basla = time.monotonic()
        ok = k.gonder(satir, ad, ZA)
        sure = time.monotonic() - basla
        print(f"gonder_yavas={sure:.3f}s")
        assert ok is False
        assert ZA - PAY <= sure <= ZA + PAY
    finally:
        _winapi.CloseHandle(h)  # asılı yazım thread'i kırık boruyla biter


def test_yavas_afu_surec_de_takilmaz():
    ad = rastgele_boru("afu-yavas")
    h = _winapi.CreateNamedPipe(ad, _winapi.PIPE_ACCESS_DUPLEX, 0, 1, 0, 0, 0, _winapi.NULL)
    threading.Thread(target=lambda: _winapi.ConnectNamedPipe(h, False), daemon=True).start()
    try:
        r, sure = betik(json.dumps({"surum": 1, "ajan": "x", "olay": "working", "gorev": "g", "d": "x" * 16000}), "--ham",
                        env={"AFUNOBET_AJAN_PIPE": ad})
        print(f"surec_yavas={sure:.3f}s")
        assert (r.returncode, r.stdout, r.stderr) == (0, b"", b"")
        assert sure <= ZA + BASLANGIC_PAYI
    finally:
        _winapi.CloseHandle(h)


# --- E1: normal gönderim -------------------------------------------------------


def test_claude_pretooluse_ulasir(ada):
    girdi = {"hook_event_name": "PreToolUse", "session_id": "c-1", "tool_name": "Bash", "tool_input": {"command": "npm test"}, "cwd": "C:\\p"}
    r, _ = betik(json.dumps(girdi), env={"AFUNOBET_AJAN_PIPE": ada.ad})
    assert (r.returncode, r.stdout, r.stderr) == (0, b"", b"")
    [s] = ada.bekle(1)
    assert {k_: s[k_] for k_ in ("surum", "ajan", "olay", "oturum", "gorev")} == {
        "surum": 1, "ajan": "claude", "olay": "PreToolUse", "oturum": "c-1", "gorev": "Bash"}
    assert isinstance(s["zaman"], int) and abs(s["zaman"] - time.time() * 1000) < 60_000
    assert "alt_oturum" not in s and "alt_tur" not in s


def test_claude_subagentstart_alt_alanlar(ada):
    girdi = {"hook_event_name": "SubagentStart", "session_id": "c-1", "agent_id": "ag-7", "agent_type": "Explore"}
    r, _ = betik(json.dumps(girdi), env={"AFUNOBET_AJAN_PIPE": ada.ad})
    assert r.returncode == 0
    [s] = ada.bekle(1)
    assert (s["olay"], s["oturum"], s["alt_oturum"], s["alt_tur"]) == ("SubagentStart", "c-1", "ag-7", "Explore")


def test_prompt_gizli_bilgi_maskeli_ve_120_karakter(ada):
    prompt = "Şunu kullan sk-abcdefghijklmnop1234567 ve devam et " + "x" * 300
    r, _ = betik(json.dumps({"hook_event_name": "UserPromptSubmit", "session_id": "c-2", "prompt": prompt}), "--ajan", "gemini",
                 env={"AFUNOBET_AJAN_PIPE": ada.ad})
    assert r.returncode == 0
    [s] = ada.bekle(1)
    assert s["ajan"] == "gemini" and s["olay"] == "UserPromptSubmit"
    assert "abcdefghijklmnop" not in s["gorev"] and "•••" in s["gorev"]
    assert len(s["gorev"]) <= 120


def test_yeni_ajan_ham_satir(ada):
    satir = {"surum": 1, "ajan": "yeni-ajan", "olay": "working", "oturum": "y-1", "gorev": "token=gizli123 ile rapor"}
    r, _ = betik(json.dumps(satir, ensure_ascii=False) + "\n", "--ham", env={"AFUNOBET_AJAN_PIPE": ada.ad})
    assert (r.returncode, r.stdout, r.stderr) == (0, b"", b"")
    [s] = ada.bekle(1)
    assert (s["ajan"], s["olay"], s["oturum"]) == ("yeni-ajan", "working", "y-1")
    assert "gizli123" not in s["gorev"]


def test_protokol_satiri_diger_ajan_bicimleri():
    assert k.protokol_satiri({"type": "agent-turn-complete", "thread-id": "t-9"}, "codex", 5)["olay"] == "agent-turn-complete"
    o = k.protokol_satiri({"event": "session.idle", "sessionId": "o-1"}, "opencode", 5)
    assert o == {"surum": 1, "ajan": "opencode", "olay": "session.idle", "oturum": "o-1", "zaman": 5}
    assert k.protokol_satiri({"hook_event_name": "BeforeTool", "tool_name": "run_shell_command"}, None, 1)["ajan"] == "claude"
    assert k.protokol_satiri({"ajan": "Gemini", "hook_event_name": "AfterAgent"}, None, 1)["ajan"] == "gemini"
    assert k.protokol_satiri({"tool_name": "x"}, "claude", 1) is None


def test_boru_adi_kurali(monkeypatch):
    monkeypatch.delenv("AFUNOBET_AJAN_PIPE", raising=False)
    monkeypatch.setenv("USERNAME", "Afu Ü.x_1")
    assert k.boru_adi() == "\\\\.\\pipe\\afunobet-ajan-afux_1"
    monkeypatch.setenv("USERNAME", "ÜĞ")
    assert k.boru_adi().endswith("afunobet-ajan-kullanici")
    monkeypatch.setenv("AFUNOBET_AJAN_PIPE", "\\\\.\\pipe\\ozel")
    assert k.boru_adi() == "\\\\.\\pipe\\ozel"


# --- F17: istemci tarafı toparlanma -----------------------------------------------


def test_f17_boru_yokken_kisa_sure_sonra_acilan_sunucuya_ulasir():
    ad = rastgele_boru("afu-gec")
    a = SahteAda(ad, gecikme=0.015)
    try:
        ayr = k.gonder_ayrinti('{"surum":1,"ajan":"x","olay":"working"}', ad, ZA)
        print(f"f17_yok={ayr['sure']:.3f}s deneme={ayr['deneme']}")
        assert ayr["ok"] is True and ayr["deneme"] == 2
        assert ayr["sure"] <= ZA + PAY
        assert a.bekle(1)[0]["olay"] == "working"
    finally:
        a.kapat()


def test_f17_boru_mesgulken_bosalinca_ulasir():
    ad = rastgele_boru("afu-mesgul")
    h = _winapi.CreateNamedPipe(ad, _winapi.PIPE_ACCESS_DUPLEX, 0, 1, 65536, 65536, 0, _winapi.NULL)
    tutamak = [h]
    isgalci = open(ad, "wb", buffering=0)  # tek örneği meşgul eder
    try:
        _winapi.ConnectNamedPipe(h, False)
    except OSError as e:
        assert e.winerror == ERROR_PIPE_CONNECTED
    alinan = []

    def bosalt():
        time.sleep(0.015)
        isgalci.close()
        _winapi.CloseHandle(h)  # tek örnek kapanır, yerine yenisi açılır
        h2 = _winapi.CreateNamedPipe(ad, _winapi.PIPE_ACCESS_DUPLEX, 0, 1, 65536, 65536, 0, _winapi.NULL)
        tutamak[0] = h2
        try:
            _winapi.ConnectNamedPipe(h2, False)
        except OSError as e:
            if e.winerror != ERROR_PIPE_CONNECTED:
                raise
        try:
            veri, _ = _winapi.ReadFile(h2, 65536, False)
            alinan.append(veri)
        except OSError:
            pass

    t = threading.Thread(target=bosalt, daemon=True)
    t.start()
    try:
        ayr = k.gonder_ayrinti('{"surum":1,"ajan":"x","olay":"working"}', ad, ZA)
        print(f"f17_mesgul={ayr['sure']:.3f}s deneme={ayr['deneme']}")
        t.join(2)
        assert ayr["ok"] is True and ayr["deneme"] == 2
        assert ayr["sure"] <= ZA + PAY
        assert alinan and b'"working"' in alinan[0]
    finally:
        try:
            _winapi.CloseHandle(tutamak[0])
        except OSError:
            pass


# --- F18: onay kapısı ----------------------------------------------------------

RISKLI = [
    ("Bash", {"command": "rm -rf build/"}, k.SILME),
    ("Bash", {"command": "rm -r eski"}, k.SILME),
    # The completion contract requires approval for single-file deletion too.
    ("Bash", {"command": "rm dosya.txt"}, k.SILME),
    ("PowerShell", {"command": "Remove-Item C:\\x -Recurse -Force"}, k.SILME),
    ("Bash", {"command": "cmd /c del /s /q C:\\tmp\\*"}, k.SILME),
    ("Bash", {"command": "rmdir /S /Q eski"}, k.SILME),
    ("Bash", {"command": "rd /s klasor"}, k.SILME),
    ("Bash", {"command": "git clean -fdx"}, k.SILME),
    ("Bash", {"command": "git branch -D ozellik"}, k.SILME),
    ("delete_file", {"path": "a.txt"}, k.SILME),
    ("mcp__fs__RemoveFile", {"path": "a.txt"}, k.SILME),
    ("Bash", {"command": "git push --force origin main"}, k.GECMIS),
    ("Bash", {"command": "git push -f"}, k.GECMIS),
    ("Bash", {"command": "git push --force-with-lease origin x"}, k.GECMIS),
    ("Bash", {"command": "git push origin --delete eski"}, k.GECMIS),
    ("Bash", {"command": "git push origin :eski"}, k.GECMIS),
    ("Bash", {"command": "cd x && git reset --hard HEAD~3"}, k.GECMIS),
    ("Bash", {"command": "gh release create v1.0.0 --notes x"}, k.YAYIN),
    ("Bash", {"command": "gh release delete v1.0.0 -y"}, k.GERI_ALINAMAZ),
    ("Bash", {"command": "gh repo delete afu/x --yes"}, k.GERI_ALINAMAZ),
    ("Bash", {"command": "npm publish --access public"}, k.YAYIN),
    ("Bash", {"command": "cargo publish"}, k.YAYIN),
    ("Bash", {"command": "python -m twine upload dist/*"}, k.YAYIN),
    ("Bash", {"command": "sqlite3 a.db 'DROP TABLE users'"}, k.GERI_ALINAMAZ),
    ("Bash", {"command": "psql -c \"drop database prod\""}, k.GERI_ALINAMAZ),
    ("Bash", {"command": "format D: /q"}, k.GERI_ALINAMAZ),
    ("PowerShell", {"command": "Set-ExecutionPolicy Unrestricted"}, k.GUVENLIK),
    ("Bash", {"command": "icacls C:\\gizli /grant Everyone:F"}, k.GUVENLIK),
    ("Bash", {"command": "netsh advfirewall set allprofiles state off"}, k.GUVENLIK),
    ("run_shell_command", {"command": "rm -rf /"}, k.SILME),
]
RISKSIZ = [
    ("Bash", {"command": "ls -la"}),
    ("Bash", {"command": "git push origin main"}),
    ("Bash", {"command": "git push -u origin ozellik"}),
    ("Bash", {"command": "git push --follow-tags"}),
    ("Bash", {"command": "git reset --soft HEAD~1"}),
    ("Bash", {"command": "git log --format=%H"}),
    ("Bash", {"command": "git branch -d bitti"}),
    ("Bash", {"command": "npm test"}),
    ("Bash", {"command": "gh release list"}),
    ("Bash", {"command": "python -m pytest -q"}),
    ("Read", {"file_path": "C:\\a.txt"}),
    ("Edit", {"file_path": "C:\\a.txt", "old_string": "a", "new_string": "b"}),
    ("PowerShell", {"command": "Get-ExecutionPolicy"}),
    ("Bash", {"command": "icacls C:\\x"}),
]


@pytest.mark.parametrize("arac,girdi,baslik", RISKLI, ids=[r[1].get("command", r[0]) for r in RISKLI])
def test_riskli_mi_riskli(arac, girdi, baslik):
    assert k.riskli_mi(arac, girdi) == (True, baslik)


@pytest.mark.parametrize("arac,girdi", RISKSIZ, ids=[r[1].get("command", r[0]) for r in RISKSIZ])
def test_riskli_mi_risksiz(arac, girdi):
    assert k.riskli_mi(arac, girdi) == (False, None)


def test_riskli_basliklar_teknik_terimsiz():
    for b in (k.SILME, k.GECMIS, k.YAYIN, k.GERI_ALINAMAZ, k.GUVENLIK):
        assert b.endswith("onaylansın mı?") and len(b) <= 120
        for terim in ("force", "push", "git", "commit"):
            assert terim not in b.lower()


def _onay_girdi(komut, session="c-9"):
    return json.dumps({"hook_event_name": "PreToolUse", "session_id": session, "tool_name": "Bash",
                       "tool_input": {"command": komut}, "cwd": "C:\\proje"})


def _cevaplayici(kok, secim, goruldu):
    """Ada gibi: soru dosyasını görünce cevap yazar (secim None = hiç cevap yazma)."""
    dur = threading.Event()

    def calis():
        while not dur.is_set():
            d = kok / "sorular"
            if d.exists():
                for yol in d.glob("*.json"):
                    soru = json.loads(yol.read_text(encoding="utf-8"))
                    if soru["id"] in goruldu:
                        continue
                    goruldu[soru["id"]] = soru
                    if secim is not None:
                        (kok / "cevaplar" / f"{soru['id']}.json").write_text(
                            json.dumps({"surum": 1, "id": soru["id"], "secim": secim, "metin": None, "zaman": 1, "kaynak": "ada"}),
                            encoding="utf-8")
            time.sleep(0.02)

    threading.Thread(target=calis, daemon=True).start()
    return dur


def _karar(stdout):
    return json.loads(stdout.decode("utf-8"))["hookSpecificOutput"]


@pytest.mark.parametrize("secim,beklenen", [("evet", "allow"), ("hayir", "deny")])
def test_onay_evet_hayir(ada, tmp_path, secim, beklenen):
    goruldu = {}
    dur = _cevaplayici(tmp_path, secim, goruldu)
    try:
        r, sure = betik(_onay_girdi("git push --force origin main OPENAI_KEY=sk-abcdefghijklmnop99"), "--onay", "--onay-sure", "10",
                        env={"AFUNOBET_AJAN_PIPE": ada.ad, "AFUNOBET_SORU_DIZINI": str(tmp_path)})
    finally:
        dur.set()
    assert (r.returncode, r.stderr) == (0, b"")
    karar = _karar(r.stdout)
    assert karar["hookEventName"] == "PreToolUse" and karar["permissionDecision"] == beklenen
    if beklenen == "deny":
        assert karar["permissionDecisionReason"] == "Kullanıcı onay vermedi."
    [soru] = goruldu.values()
    assert soru["surum"] == 1 and soru["ajan"] == "claude" and soru["tur"] == "komut"
    assert soru["baslik"] == k.GECMIS and soru["varsayilan"] == "hayir"
    assert [s["id"] for s in soru["secenekler"]] == ["evet", "hayir"]
    assert "abcdefghijklmnop" not in soru["metin"] and "git push --force" in soru["metin"]
    assert 9_000 <= soru["sonGecerlilik"] - soru["olusturma"] <= 10_000
    assert list((tmp_path / "sorular").iterdir()) == [] and list((tmp_path / "cevaplar").iterdir()) == []
    olaylar = [s["olay"] for s in ada.bekle(2)]
    assert olaylar == ["PreToolUse", "question"]
    print(f"onay_{secim}={sure:.3f}s")


def test_onay_cevapsiz_sure_dolunca_reddeder(ada, tmp_path):
    goruldu = {}
    dur = _cevaplayici(tmp_path, None, goruldu)
    try:
        r, sure = betik(_onay_girdi("rm -rf C:\\proje\\build"), "--onay", "--onay-sure", "1",
                        env={"AFUNOBET_AJAN_PIPE": ada.ad, "AFUNOBET_SORU_DIZINI": str(tmp_path)})
    finally:
        dur.set()
    print(f"onay_cevapsiz={sure:.3f}s")
    assert r.returncode == 0
    assert _karar(r.stdout)["permissionDecision"] == "deny"
    assert len(goruldu) == 1 and list(goruldu.values())[0]["baslik"] == k.SILME
    assert list((tmp_path / "sorular").iterdir()) == []
    assert 1.0 <= sure <= 1.0 + BASLANGIC_PAYI + 0.5


def test_onay_afu_kapaliysa_ask_ve_soru_yazilmaz(tmp_path):
    r, sure = betik(_onay_girdi("npm publish"), "--onay",
                    env={"AFUNOBET_AJAN_PIPE": rastgele_boru("afu-yok"), "AFUNOBET_SORU_DIZINI": str(tmp_path)})
    print(f"onay_kapali={sure:.3f}s")
    assert (r.returncode, r.stderr) == (0, b"")
    karar = _karar(r.stdout)
    assert karar == {"hookEventName": "PreToolUse", "permissionDecision": "ask", "permissionDecisionReason": "AFU kapalı; onayı burada ver."}
    assert not (tmp_path / "sorular").exists()
    assert sure <= ZA + BASLANGIC_PAYI


def test_onay_risksiz_komut_sessiz_soru_yok(ada, tmp_path):
    r, _ = betik(_onay_girdi("npm test"), "--onay", env={"AFUNOBET_AJAN_PIPE": ada.ad, "AFUNOBET_SORU_DIZINI": str(tmp_path)})
    assert (r.returncode, r.stdout, r.stderr) == (0, b"", b"")
    assert not (tmp_path / "sorular").exists()
    [s] = ada.bekle(1)
    assert s["olay"] == "PreToolUse"


def test_onay_gemini_beforetool_bicimi(tmp_path):
    girdi = json.dumps({"hook_event_name": "BeforeTool", "session_id": "g-1", "tool_name": "run_shell_command", "tool_input": {"command": "git reset --hard"}})
    r, _ = betik(girdi, "--onay", "--ajan", "gemini", env={"AFUNOBET_AJAN_PIPE": rastgele_boru("afu-yok"), "AFUNOBET_SORU_DIZINI": str(tmp_path)})
    assert r.returncode == 0
    assert json.loads(r.stdout.decode("utf-8")) == {"decision": "ask", "reason": "AFU kapalı; onayı burada ver."}


def test_bozuk_girdi_ve_arguman_sessiz():
    boru = rastgele_boru("afu-yok")
    for stdin, argv in (("{bozuk", ()), ("", ()), ("[1,2]", ()), ("{}", ("--bilinmeyen", "--zaman-asimi", "abc"))):
        r, _ = betik(stdin, *argv, env={"AFUNOBET_AJAN_PIPE": boru})
        assert (r.returncode, r.stdout, r.stderr) == (0, b"", b""), (stdin, argv)
