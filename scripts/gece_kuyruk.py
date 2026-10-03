"""Gece kuyruğu: OpenCode görevlerini sırayla çalıştırır, her birini kendisi doğrular.

Claude kotası azken çalışsın diye yazıldı (3 Eki 2026). Durum: docs/kanit/gece_kuyruk/durum.md
"""
import datetime
import os
import subprocess
import sys
import time
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
WIN = KOK / "windows"
SUBAJAN = "C:/Users/afuuu/.claude/skills/afu-ai/scripts/subajan.py"
LOG_DIR = KOK / "docs" / "kanit" / "gece_kuyruk"
DURUM = LOG_DIR / "durum.md"
NOWIN = 0x08000000 if os.name == "nt" else 0

# Önce bitmesi beklenen, şu an çalışan işler (sonuç dosyası, en fazla bekleme sn)
BEKLE = [(KOK / "SONUC_P6.md", 1800), (KOK / "SONUC_P8.md", 1800)]

# (görev dosyası, sonuç dosyası) — sırayla; aynı dosyaya dokunan işler zaten ardışık
KUYRUK = [
    ("GOREV_P7_KIRPMA_YAVAS.md", "SONUC_P7.md"),
    ("GOREV_P9_SORUKART_SIG.md", "SONUC_P9.md"),
    ("GOREV_P11_BALON_KALICI.md", "SONUC_P11.md"),
    ("GOREV_P10_PET_BALON.md", "SONUC_P10.md"),
    ("GOREV_P4_ENSE_SALLAN.md", "SONUC_P4.md"),
    ("GOREV_P5_STUDYO_ENSE.md", "SONUC_P5.md"),
    ("GOREV_Q1_UZUN_METIN.md", "SONUC_Q1.md"),
    ("GOREV_Q2_MODAL_KLAVYE.md", "SONUC_Q2.md"),
    ("GOREV_Q3_DPI150.md", "SONUC_Q3.md"),
    ("GOREV_Q5_SAHTE_MOD.md", "SONUC_Q5.md"),
    ("GOREV_Q4_SAYFA_DURUM.md", "SONUC_Q4.md"),
    ("GOREV_Q6_SAYFA_YESIL.md", "SONUC_Q6.md"),
    ("GOREV_OC_TEST_GECE.md", "SONUC_OC_TEST_GECE.md"),
    ("GOREV_OC_TUM_TEST.md", "SONUC_OC_TUM_TEST.md"),
]


SAYFA = KOK / "docs" / "kanit" / "ozellik" / "ozellikler.html"


def sayfa_guncelle():
    # Takip sayfasının yerel kaynağına "Gece kuyruğu" bölümü; Claude sonra aynı linke yayınlar.
    try:
        import html
        satirlar = DURUM.read_text(encoding="utf-8").splitlines()[-60:]
        govde = "".join(f"<li>{html.escape(s.lstrip('- '))}</li>" for s in satirlar)
        bolum = (f'<section id="gece-kuyruk" class="note"><b>Gece kuyruğu (OpenCode) — canlı rapor</b>'
                 f'<ul style="margin:6px 0 0;padding-left:18px">{govde}</ul></section>')
        s = SAYFA.read_text(encoding="utf-8")
        bas, son = s.find('<section id="gece-kuyruk"'), s.find("</section>", s.find('<section id="gece-kuyruk"'))
        if bas != -1 and son != -1:
            s = s[:bas] + bolum + s[son + len("</section>"):]
        else:
            s = s.replace('<div id="list"></div>', bolum + '\n  <div id="list"></div>', 1)
        SAYFA.write_text(s, encoding="utf-8")
    except Exception as hata:  # rapor sayfası kuyruğu asla durdurmamalı
        with (LOG_DIR / "sayfa_hata.txt").open("a", encoding="utf-8") as f:
            f.write(f"{type(hata).__name__}\n")


def yaz(satir):
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    zaman = datetime.datetime.now().strftime("%H:%M:%S")
    with DURUM.open("a", encoding="utf-8") as f:
        f.write(f"- {zaman} {satir}\n")
    with (LOG_DIR / "rapor.jsonl").open("a", encoding="utf-8") as f:
        import json
        f.write(json.dumps({"zaman": datetime.datetime.now().isoformat(timespec="seconds"), "olay": satir}, ensure_ascii=False) + "\n")
    sayfa_guncelle()


def kos(komut, cwd, sure):
    try:
        p = subprocess.run(komut, cwd=cwd, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=sure, creationflags=NOWIN, stdin=subprocess.DEVNULL)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return -1, "ZAMAN_ASIMI"


def dogrula(rust=False):
    kod, cikti = kos(["node", "node_modules/typescript/bin/tsc", "--noEmit"], WIN, 300)
    if kod != 0:
        return False, "tsc:\n" + cikti[-3000:]
    kod, cikti = kos(["node", "node_modules/vitest/vitest.mjs", "run", "tests", "--configLoader", "runner"], WIN, 600)
    if kod != 0:
        return False, "npm test:\n" + cikti[-3000:]
    kod, cikti = kos([sys.executable, "-m", "pytest", "-q", "tests"], KOK, 600)
    if kod != 0:
        return False, "pytest:\n" + cikti[-3000:]
    if rust:
        kod, cikti = kos(["cargo", "test", "--offline"], WIN / "src-tauri", 1500)
        if kod != 0:
            return False, "cargo:\n" + cikti[-3000:]
    return True, "yeşil"


def opencode(gorev):
    return kos([sys.executable, SUBAJAN, "opencode", gorev, "--cwd", str(KOK), "--timeout", "570"], KOK, 700)


def sonuc_tamam(dosya):
    try:
        ilk = (KOK / dosya).read_text(encoding="utf-8-sig").lstrip().splitlines()[0]
    except (OSError, IndexError):
        return False
    return ilk.startswith("SONUC: TAMAM")


def calistir(gorev, sonuc):
    temel = (f"GOREV: {gorev} dosyasini oku ve icindeki adimlari eksiksiz uygula; sonucu {sonuc} dosyasina yaz "
             f"(ilk satir SONUC: TAMAM ya da SONUC: YARIM - neden). Okuduktan sonra DURMA, isi bitir.")
    istem = temel
    for deneme in range(1, 4):
        yaz(f"{gorev}: deneme {deneme} başladı")
        kod, cikti = opencode(istem)
        tamam = sonuc_tamam(sonuc)
        ok, rapor = dogrula()
        if tamam and ok:
            yaz(f"{gorev}: TAMAM ve doğrulama yeşil ✅")
            return True
        neden = rapor if not ok else f"{sonuc} ilk satırı SONUC: TAMAM değil ya da dosya yok"
        (LOG_DIR / f"{Path(gorev).stem}_deneme{deneme}.txt").write_text(neden + "\n\n" + cikti[-4000:], encoding="utf-8")
        yaz(f"{gorev}: deneme {deneme} başarısız ({neden.splitlines()[0]}) — düzeltme turu")
        istem = (temel + " ONCEKI DENEME KIRMIZI. Kaldigin yerden devam et ve su hatayi duzelt (test silme/atlama YASAK): "
                 + " ".join(neden.split())[:1500])
    yaz(f"{gorev}: 3 denemede yeşile dönmedi ❌ — kuyruk DURDU (sonraki işler bozuk temele kurulmasın)")
    return False


def paketle():
    yaz("Exe paketleme başladı")
    onceki = KOK / "dist" / "onceki"
    exe = KOK / "dist" / "afunobet-ui-coucou.exe"
    if exe.exists():
        damga = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        (onceki / f"afunobet-ui-coucou-{damga}.exe").write_bytes(exe.read_bytes())
    kod, cikti = kos(["npm.cmd" if os.name == "nt" else "npm", "--offline", "run", "pack"], WIN, 1800)
    if kod != 0:
        yaz("Exe paketleme BAŞARISIZ ❌ (pack log: gece_kuyruk/pack.txt)")
        (LOG_DIR / "pack.txt").write_text(cikti[-6000:], encoding="utf-8")
        return
    kos(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(KOK / "kisayol_guncelle.ps1")], KOK, 120)
    yaz("Exe hazır ✅ ve masaüstü kısayolu güncellendi")


def main():
    yaz("Gece kuyruğu başladı")
    for dosya, sure in BEKLE:
        bas = time.time()
        while not dosya.exists() and time.time() - bas < sure:
            time.sleep(20)
        yaz(f"Bekleme: {dosya.name} {'geldi' if dosya.exists() else 'gelmedi (zaman aşımı), devam'}")
    ok, rapor = dogrula()
    if not ok:
        yaz("Başlangıç doğrulaması kırmızı — önce düzeltme görevi")
        (LOG_DIR / "baslangic.txt").write_text(rapor, encoding="utf-8")
        (KOK / "GOREV_OC_BASLANGIC_YESIL.md").write_text(
            "# Testleri yeşile döndür (OpenCode)\nDizin: C:\\Users\\afuuu\\Desktop\\afuproject\\AfuNobet-UI\n"
            "Sonuç: SONUC_OC_BASLANGIC_YESIL.md (ilk satır SONUC: TAMAM / YARIM)\n"
            "Hata çıktısı: docs/kanit/gece_kuyruk/baslangic.txt. Kök nedeni düzelt; test silme/atlama YASAK; exe/git/görünür pencere YOK.\n",
            encoding="utf-8")
        if not calistir("GOREV_OC_BASLANGIC_YESIL.md", "SONUC_OC_BASLANGIC_YESIL.md"):
            return
    for gorev, sonuc in KUYRUK:
        if not (KOK / gorev).exists():
            yaz(f"{gorev}: dosya yok, atlandı")
            continue
        if sonuc_tamam(sonuc):
            yaz(f"{gorev}: zaten TAMAM, atlandı")
            continue
        if not calistir(gorev, sonuc):
            return
    ek = LOG_DIR / "ek_kuyruk.txt"
    if ek.exists():
        for satir in ek.read_text(encoding="utf-8").splitlines():
            if "|" not in satir or satir.startswith("#"):
                continue
            gorev, sonuc = (x.strip() for x in satir.split("|", 1))
            if (KOK / gorev).exists() and not sonuc_tamam(sonuc) and not calistir(gorev, sonuc):
                return
    ok, rapor = dogrula(rust=True)
    if not ok:
        yaz("Son tam doğrulama (Rust dahil) kırmızı ❌ — exe derlenmedi")
        (LOG_DIR / "son_dogrulama.txt").write_text(rapor, encoding="utf-8")
        return
    yaz("Son tam doğrulama yeşil (TS + Python + Rust) ✅")
    paketle()
    yaz("Gece kuyruğu bitti")


if __name__ == "__main__":
    main()
