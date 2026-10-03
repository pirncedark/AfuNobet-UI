"""Uygulama durum animasyonlarini kaynaktan kucultur (kaynak DEGISMEZ).

Kullanim: python scripts/kucult_durum.py [yukseklik] [fps] [kalite]
Kaynak: afu-character/video/durumlar/*.webp -> windows/public/afu/durum/*.webp
"""
import sys
from multiprocessing import Pool
from pathlib import Path

from PIL import Image, ImageSequence

KOK = Path(__file__).resolve().parent.parent
KAYNAK = KOK / "afu-character" / "video" / "durumlar"
HEDEF = KOK / "windows" / "public" / "afu" / "durum"

YUKSEKLIK = int(sys.argv[1]) if len(sys.argv) > 1 else 256
FPS = float(sys.argv[2]) if len(sys.argv) > 2 else 10
KALITE = int(sys.argv[3]) if len(sys.argv) > 3 else 72


def isle(yol: Path):
    im = Image.open(yol)
    kareler, sureler = [], []
    hedef_ms = 1000.0 / FPS
    birikim = 0.0  # kaynak zamaninda ilerleme
    sonraki = 0.0  # bir sonraki alinacak karenin zamani
    for kare in ImageSequence.Iterator(im):
        sure = kare.info.get("duration") or 66
        if birikim + 1e-6 >= sonraki:
            k = kare.convert("RGBA")
            w = max(1, round(k.width * YUKSEKLIK / k.height))
            kareler.append(k.resize((w, YUKSEKLIK), Image.LANCZOS))
            sureler.append(0.0)
            sonraki += hedef_ms
        sureler[-1] += sure
        birikim += sure
    sureler = [max(20, int(round(s))) for s in sureler]
    cikti = HEDEF / yol.name
    gecici = cikti.with_suffix(".tmp.webp")
    kareler[0].save(
        gecici, format="WEBP", save_all=True, append_images=kareler[1:],
        duration=sureler, loop=0, quality=KALITE, method=6, lossless=False,
        alpha_quality=80,
    )
    gecici.replace(cikti)
    return yol.name, len(kareler), sum(sureler), cikti.stat().st_size


if __name__ == "__main__":
    HEDEF.mkdir(parents=True, exist_ok=True)
    dosyalar = sorted(KAYNAK.glob("*.webp"))
    with Pool() as p:
        sonuc = p.map(isle, dosyalar)
    toplam = 0
    for ad, n, ms, b in sonuc:
        toplam += b
        print(f"{ad}\t{n} kare\t{ms} ms\t{b/1024:.0f} KB", flush=True)
    print(f"TOPLAM {len(sonuc)} dosya {toplam/1048576:.2f} MB", flush=True)
