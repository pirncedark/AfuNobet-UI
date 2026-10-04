"""Codex soru köprüsü: sahte akışla birim testler (gerçek Codex'e bağlanmaz)."""
import io
import json
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import Mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import codex_soru_koprusu as k  # noqa: E402


class SahteSaat:
    def __init__(self, t=1000.0):
        self.t = t

    def __call__(self):
        return self.t

    def uyu(self, s):
        self.t += s


def soru_oku_yeniden(yol, dur, sinir=0.5):
    """Retry only transient publication/Windows sharing races, with a hard deadline."""
    son = time.monotonic() + sinir
    while not dur.is_set():
        try:
            return json.loads(yol.read_text(encoding="utf-8"))
        except (PermissionError, FileNotFoundError, json.JSONDecodeError):
            if time.monotonic() >= son:
                raise
            dur.wait(0.005)
    return None


class SahteOkumaYarisi(unittest.TestCase):
    def test_gecici_yayin_hatalari_sonrasi_soru_okunur(self):
        yol = Mock()
        yol.read_text.side_effect = [PermissionError(), FileNotFoundError(), "{", '{"id":"s1"}']
        self.assertEqual(soru_oku_yeniden(yol, threading.Event()), {"id": "s1"})
        self.assertEqual(yol.read_text.call_count, 4)

    def test_kalici_hata_sure_sinirinda_saklanmadan_yukselir(self):
        yol = Mock()
        yol.read_text.side_effect = PermissionError("kalici")
        with self.assertRaises(PermissionError):
            soru_oku_yeniden(yol, threading.Event(), sinir=0.01)
        yol.read_text.side_effect = ValueError("baska hata")
        with self.assertRaises(ValueError):
            soru_oku_yeniden(yol, threading.Event())


def adaci(depo, cevap_fn, bekleme=0.02):
    """Ada gibi davranır: soru dosyası görünce cevap dosyası yazar."""
    dur = threading.Event()

    def calis():
        goruldu = set()
        while not dur.is_set():
            if depo.sorular.exists():
                for yol in depo.sorular.glob("*.json"):
                    # Do not reopen an answered question while the client deletes it.
                    if yol.stem in goruldu:
                        continue
                    soru = soru_oku_yeniden(yol, dur)
                    if soru is None:
                        return
                    if soru["id"] in goruldu:
                        continue
                    goruldu.add(soru["id"])
                    c = cevap_fn(soru)
                    if c is not None:
                        (depo.cevaplar / f"{soru['id']}.json").write_text(json.dumps({"surum": 1, "id": soru["id"], **c}), encoding="utf-8")
            time.sleep(bekleme)

    t = threading.Thread(target=calis, daemon=True)
    t.start()
    return dur


class Maskeleme(unittest.TestCase):
    def test_gizli_bilgiler_gizlenir_siradan_metin_kalir(self):
        m = k.maskele("export OPENAI_API_KEY=sk-abcdefghijklmnop1234 && curl -H 'Authorization: Bearer abc.def' x?token=s3&a=1 ghp_0123456789abcdef")
        for gizli in ("abcdefghijklmnop", "abc.def", "s3&", "0123456789abcdef"):
            self.assertNotIn(gizli, m)
        self.assertIn("&a=1", m)
        self.assertEqual(k.maskele("npm test --watch risk-free"), "npm test --watch risk-free")
        self.assertEqual(k.maskele("PASSWORD=hunter2 npm test"), "PASSWORD=••• npm test")


class SoruOlusturma(unittest.TestCase):
    def test_komut_onayi(self):
        params = {"threadId": "t", "turnId": "u", "itemId": "i", "startedAtMs": 1, "command": "npm test", "cwd": "C:\\proje",
                  "reason": "testleri koşturmak", "availableDecisions": ["accept", "decline", "cancel"]}
        [s] = k.sorulari_olustur("item/commandExecution/requestApproval", params, 5000, 1000)
        self.assertEqual((s["tur"], s["metin"], s["sonGecerlilik"], s["varsayilan"]), ("komut", "npm test", 6000, "hayir"))
        self.assertEqual([x["id"] for x in s["secenekler"]], ["evet", "hayir"], "acceptForSession listede yok")
        self.assertIn("Klasör: C:\\proje", s["ayrinti"])
        self.assertRegex(s["id"], r"^codex-[0-9a-f]{12}$")

    def test_v1_komut_listesi_ve_maske(self):
        [s] = k.sorulari_olustur("execCommandApproval", {"command": ["git", "push", "token=abc123"], "cwd": "C:\\x", "callId": "c", "conversationId": "v", "parsedCmd": []}, 0)
        self.assertEqual(s["metin"], "git push token=•••")
        self.assertEqual([x["id"] for x in s["secenekler"]], ["evet", "oturum", "hayir"])

    def test_dosya_ve_izin(self):
        [d] = k.sorulari_olustur("applyPatchApproval", {"fileChanges": {"C:\\p\\a.ts": {}, "C:\\p\\b.rs": {}}, "callId": "c", "conversationId": "v"}, 0)
        self.assertEqual((d["tur"], d["metin"]), ("dosya", "a.ts, b.rs"))
        [i] = k.sorulari_olustur("item/permissions/requestApproval", {"cwd": "C:\\p", "permissions": {"network": {"enabled": True}}}, 0)
        self.assertEqual(i["tur"], "izin")

    def test_kullanici_girdisi_coklu_soru(self):
        params = {"isBlocking": True, "itemId": "i", "threadId": "t", "turnId": "u", "questions": [
            {"id": "dal", "header": "Dal", "question": "Hangi dala?", "options": [{"label": "main", "description": "ana dal"}, {"label": "dev", "description": ""}], "isOther": True},
            {"id": "parola", "header": "Parola", "question": "Parolayı yaz", "isSecret": True},
            {"bozuk": True},
        ]}
        a, b = k.sorulari_olustur("item/tool/requestUserInput", params, 0)
        self.assertEqual([x["etiket"] for x in a["secenekler"]], ["main", "dev"])
        self.assertTrue(a["serbestMetin"])
        self.assertEqual(a["ayrinti"], "main: ana dal")
        self.assertTrue(b["serbestMetin"] and b["gizli"])

    def test_desteklenmeyen_istek_soru_acmaz(self):
        self.assertEqual(k.sorulari_olustur("mcpServer/elicitation/request", {}, 0), [])
        self.assertEqual(k.sorulari_olustur("account/chatgptAuthTokens/refresh", {}, 0), [])


class CodexCevabi(unittest.TestCase):
    def test_onay_eslemesi_ve_guvenli_varsayilan(self):
        y = "item/commandExecution/requestApproval"
        [s] = k.sorulari_olustur(y, {"command": "ls"}, 0)
        self.assertEqual(k.codex_cevabi(y, {}, [s], {s["id"]: {"secim": "evet"}}), {"decision": "accept"})
        self.assertEqual(k.codex_cevabi(y, {}, [s], {s["id"]: {"secim": "oturum"}}), {"decision": "acceptForSession"})
        self.assertEqual(k.codex_cevabi(y, {}, [s], {s["id"]: {"secim": "hayir"}}), {"decision": "decline"})
        self.assertEqual(k.codex_cevabi(y, {}, [s], {s["id"]: None}), {"decision": "decline"})
        self.assertEqual(k.codex_cevabi(y, {}, [s], {s["id"]: {"secim": "uydurma"}}), {"decision": "decline"})
        [v] = k.sorulari_olustur("applyPatchApproval", {}, 0)
        self.assertEqual(k.codex_cevabi("applyPatchApproval", {}, [v], {v["id"]: None}), {"decision": "denied"})

    def test_izin_eslemesi(self):
        y = "item/permissions/requestApproval"
        p = {"cwd": "C:\\p", "permissions": {"network": {"enabled": True}}}
        [s] = k.sorulari_olustur(y, p, 0)
        self.assertEqual(k.codex_cevabi(y, p, [s], {s["id"]: {"secim": "evet"}}), {"permissions": p["permissions"], "scope": "turn"})
        self.assertEqual(k.codex_cevabi(y, p, [s], {s["id"]: None}), {"permissions": {}})

    def test_girdi_eslemesi(self):
        y = "item/tool/requestUserInput"
        p = {"questions": [{"id": "dal", "header": "Dal", "question": "?", "options": [{"label": "main", "description": ""}], "isOther": True},
                           {"id": "not", "header": "Not", "question": "?"}]}
        a, b = k.sorulari_olustur(y, p, 0)
        sonuc = k.codex_cevabi(y, p, [a, b], {a["id"]: {"secim": "s0", "metin": None}, b["id"]: None})
        self.assertEqual(sonuc, {"answers": {"dal": {"answers": ["main"]}, "not": {"answers": []}}})


class Depo(unittest.TestCase):
    def setUp(self):
        self.dizin = tempfile.TemporaryDirectory()
        self.kok = Path(self.dizin.name)

    def tearDown(self):
        self.dizin.cleanup()

    def test_atomik_yazim_ve_sure_dolunca_temizlik(self):
        saat = SahteSaat()
        depo = k.SoruDeposu(self.kok, saat=saat, uyku=saat.uyu)
        [s] = k.sorulari_olustur("item/commandExecution/requestApproval", {"command": "ls"}, depo.simdi_ms(), 1000)
        s["_ic"] = "yazılmaz"
        yol = depo.yaz(s)
        kayit = json.loads(yol.read_text(encoding="utf-8"))
        self.assertNotIn("_ic", kayit)
        self.assertEqual(list(depo.sorular.glob("*.tmp")), [])
        self.assertIsNone(depo.cevap_bekle(s))
        self.assertFalse(yol.exists())

    def test_cevap_okununca_iki_dosya_da_silinir_bozuk_cevap_yok_sayilir(self):
        saat = SahteSaat()
        depo = k.SoruDeposu(self.kok, saat=saat, uyku=saat.uyu)
        [s] = k.sorulari_olustur("item/commandExecution/requestApproval", {"command": "ls"}, depo.simdi_ms(), 5000)
        depo.yaz(s)
        (depo.cevaplar / f"{s['id']}.json").write_text("{", encoding="utf-8")
        self.assertIsNone(depo.cevap_oku(s["id"]))
        (depo.cevaplar / f"{s['id']}.json").write_text(json.dumps({"surum": 1, "id": "baska", "secim": "evet"}), encoding="utf-8")
        self.assertIsNone(depo.cevap_oku(s["id"]))
        (depo.cevaplar / f"{s['id']}.json").write_text(json.dumps({"surum": 1, "id": s["id"], "secim": "evet"}), encoding="utf-8")
        self.assertEqual(depo.cevap_bekle(s)["secim"], "evet")
        self.assertEqual(list(depo.sorular.iterdir()) + list(depo.cevaplar.iterdir()), [])


class SahteAkis(unittest.TestCase):
    def setUp(self):
        self.dizin = tempfile.TemporaryDirectory()
        self.depo = k.SoruDeposu(Path(self.dizin.name))

    def tearDown(self):
        self.dizin.cleanup()

    def test_vekil_soruyu_adaya_sorar_gerisini_istemciye_aktarir(self):
        dur = adaci(self.depo, lambda s: {"secim": "evet", "metin": None})
        try:
            codex = [
                json.dumps({"method": "turn/started", "params": {}}),
                json.dumps({"id": 7, "method": "item/commandExecution/requestApproval", "params": {"command": "npm test", "threadId": "t", "turnId": "u", "itemId": "i", "startedAtMs": 1}}),
                json.dumps({"id": 8, "method": "account/chatgptAuthTokens/refresh", "params": {}}),
                "bozuk satır",
            ]
            codexe, istemciye = io.StringIO(), io.StringIO()
            for is_ in k.vekil(codex, codexe, istemciye, self.depo, 5000):
                is_.join(5)
        finally:
            dur.set()
        istemci_satirlari = istemciye.getvalue().splitlines()
        self.assertEqual(len(istemci_satirlari), 3, "onay isteği istemciye gitmez")
        self.assertIn("chatgptAuthTokens", istemci_satirlari[1])
        self.assertEqual(json.loads(codexe.getvalue()), {"id": 7, "result": {"decision": "accept"}})
        self.assertEqual(list(self.depo.sorular.iterdir()), [])

    def test_cevap_gelmezse_sure_dolunca_reddeder(self):
        mesaj = {"id": "a", "method": "execCommandApproval", "params": {"command": ["rm", "-rf", "x"], "cwd": "C:\\", "callId": "c", "conversationId": "v", "parsedCmd": []}}
        basla = time.time()
        cevap = k.istegi_isle(mesaj, self.depo, sure_ms=300)
        self.assertLess(time.time() - basla, 3)
        self.assertEqual(cevap, {"id": "a", "result": {"decision": "denied"}})

    def test_kullanici_girdisi_metinle_cevaplanir(self):
        dur = adaci(self.depo, lambda s: {"secim": None, "metin": "feature/x"})
        try:
            mesaj = {"id": 3, "method": "item/tool/requestUserInput", "params": {"isBlocking": True, "itemId": "i", "threadId": "t", "turnId": "u",
                     "questions": [{"id": "dal", "header": "Dal", "question": "Hangi dal?", "isOther": True, "options": [{"label": "main", "description": ""}]}]}}
            cevap = k.istegi_isle(mesaj, self.depo, sure_ms=5000)
        finally:
            dur.set()
        self.assertEqual(cevap, {"id": 3, "result": {"answers": {"dal": {"answers": ["feature/x"]}}}})

    def test_desteklenmeyen_ya_da_bildirim_islenmez(self):
        self.assertIsNone(k.istegi_isle({"method": "item/commandExecution/requestApproval", "params": {}}, self.depo))
        self.assertIsNone(k.istegi_isle({"id": 1, "method": "currentTime/read"}, self.depo))


class VekilSureci(unittest.TestCase):
    def test_gercek_surecle_sahte_codex_uctan_uca(self):
        import subprocess
        with tempfile.TemporaryDirectory() as d:
            sahte = Path(d) / "sahte_codex.py"
            sahte.write_text(
                "import json,sys" + chr(10) +
                "print(json.dumps({'id':1,'method':'execCommandApproval','params':{'command':['ls'],'cwd':'C:/','callId':'c','conversationId':'v','parsedCmd':[]}}),flush=True)" + chr(10) +
                "cevap=json.loads(sys.stdin.readline())" + chr(10) +
                "print(json.dumps({'method':'sahte/bitti','params':cevap}),flush=True)" + chr(10),
                encoding="utf-8")
            betik = Path(__file__).resolve().parents[1] / "scripts" / "codex_soru_koprusu.py"
            sonuc = subprocess.run([sys.executable, str(betik), "--kok", d, "--sure", "1", "--", sys.executable, str(sahte)],
                                   input="", capture_output=True, text=True, encoding="utf-8", timeout=30)
            self.assertEqual(sonuc.returncode, 0, sonuc.stderr)
            satir = json.loads(sonuc.stdout.strip().splitlines()[-1])
            self.assertEqual(satir, {"method": "sahte/bitti", "params": {"id": 1, "result": {"decision": "denied"}}})
            self.assertEqual(list((Path(d) / "sorular").iterdir()), [])


if __name__ == "__main__":
    unittest.main()
