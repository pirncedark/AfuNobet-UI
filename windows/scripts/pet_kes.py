"""Yalnız kullanıcı görsellerini keser; yerel isnet ve yeşil anahtarlama, indirme yok."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "afu-character/kaynak"
OUT = ROOT / "afu-character/pet"
PUBLIC = ROOT / "windows/public/afu/pet"
CANVAS = (512, 512)
CORE = ["idle_normal", "idle_nefes", "idle_goz_kapali", "idle_goz_acilis", "idle_sol", "idle_sag",
        "tepki_mutlu", "tepki_dusunme", "tepki_uyari", "tepki_goz_kirpma", "tepki_uyku", "tepki_basari",
        "uyan_gizli", "uyan_gozukme", "uyan_yukselme", "uyan_tam", "uyan_dikkat", "uyan_yuzme",
        "gecis_kompakt", "gecis_kayma", "akis_normal", "akis_kuculme", "akis_suzulme", "akis_gorunme", "akis_tutunma", "akis_bekleme",
        "durum_idle", "durum_bakis", "durum_goz_kirpma", "durum_mutlu", "durum_saskin", "durum_dusunme", "durum_uyku", "durum_etkilesim"]


def green_key(image):
    rgb = np.asarray(image.convert("RGB"))
    work = rgb.astype(np.int16)
    green = (work[:, :, 1] > work[:, :, 0] + 35) & (work[:, :, 1] > work[:, :, 2] + 25)
    # Izgara ayırıcıları panel kenarında beyazdır; karakter içindeki göz beyazı korunur.
    bright = (work.min(axis=2) > 220) & (work.max(axis=2) - work.min(axis=2) < 15)
    edge = np.zeros(green.shape, dtype=bool)
    edge[:3] = edge[-3:] = True
    edge[:, :3] = edge[:, -3:] = True
    transparent = green | (bright & edge)
    alpha = np.where(transparent, 0, 255).astype(np.uint8)
    rgba = np.dstack((rgb, alpha))
    # RGB karakterde birebir korunur; kenarda şeffaf yeşil pikseller renksizdir.
    rgba[transparent, :3] = 0
    return Image.fromarray(rgba, "RGBA")


def clean_lower_halo(image):
    """Teslim tuvalinin alt %30'undaki açık haleyi RGB'yi değiştirmeden kaldırır."""
    rgba = np.array(image.convert("RGBA"))
    start = int(image.height * .70)
    rgb = rgba[:, :, :3]
    bright = (rgb.min(axis=2) > 165) | ((rgb[:, :, 2] > 200) &
             (rgb[:, :, 1] > 170) & (rgb[:, :, 0] > 120))
    removed = False
    for _ in range(5):
        transparent = rgba[:, :, 3] < 10
        adjacent = ndimage.binary_dilation(transparent, structure=np.ones((3, 3)))
        halo = adjacent & ~transparent & bright
        halo[:start] = False
        if not halo.any():
            break
        rgba[halo, 3] = 0
        removed = True
    if removed:
        transparent = rgba[:, :, 3] < 10
        edge = ndimage.binary_dilation(transparent, structure=np.ones((3, 3))) & ~transparent
        edge[:start] = False
        rgba[edge, 3] = np.minimum(rgba[edge, 3], 200)
    return Image.fromarray(rgba, "RGBA")


def bar_line(image):
    rgb = np.asarray(image.convert("RGB")).astype(np.int16)
    gray = (rgb.max(axis=2) - rgb.min(axis=2) < 48) & (rgb.min(axis=2) > 125)
    ratio = gray.mean(axis=1)
    start = int(image.height * .55)
    rows = np.flatnonzero((ratio > .58) & (np.arange(image.height) >= start))
    return int(rows[0]) if len(rows) else None


def face_anchor(image):
    rgb = np.asarray(image.convert("RGB")).astype(np.int16)
    alpha = np.asarray(image.convert("RGBA"))[:, :, 3] > 0
    mask = (rgb[:, :, 0] > 165) & (rgb[:, :, 1] > 85) & (rgb[:, :, 2] < 180) & alpha
    yy, xx = np.nonzero(mask)
    return float(np.median(xx)) if len(xx) else image.width / 2


def gaze_score(image):
    rgb = np.asarray(image.convert("RGB")).astype(np.int16)
    # Kaynakta mavi gözün beyazı ve iris merkezi, saç bölgesi dışındaki yüz diliminde ölçülür.
    region = rgb[int(image.height * .36):int(image.height * .8), :int(image.width * .67)]
    white = (region.min(axis=2) > 180) & (region.max(axis=2) - region.min(axis=2) < 45)
    blue = (region[:, :, 2] > 140) & (region[:, :, 2] > region[:, :, 0] + 50) & (region[:, :, 1] > 65)
    labels, count = ndimage.label(white)
    if not count:
        return None
    sizes = ndimage.sum(white, labels, range(1, count + 1))
    eye = labels == int(np.argmax(sizes) + 1)
    bounds = ndimage.find_objects(eye.astype(int))[0]
    expanded = np.zeros_like(eye)
    expanded[bounds] = True
    by, bx = np.nonzero(blue & expanded)
    wy, wx = np.nonzero(eye)
    return float(bx.mean() - wx.mean()) if len(bx) and len(wx) else None


def align(image, canvas=CANVAS, face_x=None):
    x = round(canvas[0] / 2 - (face_x if face_x is not None else image.width / 2))
    bbox = image.getbbox()
    y = canvas[1] - (bbox[3] if bbox else image.height) - 1
    result = Image.new("RGBA", canvas)
    result.alpha_composite(image, (x, y))
    return result, (x, y)

def grid_bounds(image, columns, rows):
    rgb = np.array(image.convert("RGB"))
    white = (rgb.min(axis=2) > 225) & (rgb.max(axis=2) - rgb.min(axis=2) < 20)
    def bounds(scores, count):
        hits = np.flatnonzero(scores > .85)
        groups = np.split(hits, np.where(np.diff(hits) > 1)[0] + 1)
        lines = [int(np.mean(group)) for group in groups if len(group) and 5 < np.mean(group) < len(scores) - 5]
        if len(lines) > count - 1:
            candidates = lines[:]
            lines = []
            for i in range(1, count):
                chosen = min(candidates, key=lambda line: abs(line - len(scores) * i / count))
                lines.append(chosen); candidates.remove(chosen)
            lines.sort()
        if len(lines) != count - 1:
            raise ValueError(f"Grid separators not found: expected {count - 1}, got {lines}")
        return [0] + lines + [len(scores)]
    return bounds(white.mean(axis=0), columns), bounds(white.mean(axis=1), rows)

def build_delivery():
    """A14 ekindeki 50 kaynak kare; rembg yok, çizim veya küçültme yok."""
    base = ROOT / "afu-character"
    manifest = {"frames": {}, "warnings": ["Kaynak bakış kareleri aynı yöne bakıyor; görsel kabul gerekli."]}
    groups = {
      "pet_durumlar_4x4.png": (4, 4, "pet", ["idle_normal", "idle_nefes", "idle_goz_kapali", "idle_sol", "idle_sag", "akis_bekleme", "tepki_mutlu", "tepki_dusunme", "tepki_uyari", "tepki_hata", "tepki_uyku", "tepki_basari", "tepki_goz_kirpma", "tepki_dinleme", "tepki_konusma", "uyan_yuzme"], True),
      "pet_gecis_3x3.png": (3, 3, "pet", ["akis_normal", "akis_kuculme", "akis_suzulme", "akis_gorunme", "akis_tutunma", "uyan_gizli", "uyan_gozukme", "uyan_yukselme", "simge_kaynak"], True),
      "kart_3x3.png": (3, 3, "kart", ["idle", "calisiyor", "dusunme", "bekleme_kota", "basari", "hata", "selam", "dinleme", "konusma"], False),
      "efektler_3x3.png": (3, 3, "efekt", ["unlem", "soru", "uyku_z", "parilti", "tik", "kalp", "ses_dalgasi", "konusma_balonu", "bas_donmesi"], False),
      "ozel_2x3.png": (3, 2, "pet", ["ozel_bas_donmesi", "ozel_dosya_yakala", "ozel_dosya_tut", "ozel_veda", "ozel_sessiz", "ozel_yogun"], True),
    }
    pending = []
    for source, (cols, rows, group, names, has_bar) in groups.items():
        image = Image.open(SOURCE / source).convert("RGB")
        xs, ys = grid_bounds(image, cols, rows)
        cells = []
        for i, name in enumerate(names):
            x, y = i % cols, i // cols
            box = (xs[x] + 3, ys[y] + 3, xs[x + 1] - 3, ys[y + 1] - 3)
            raw = image.crop(box)
            line = bar_line(raw) if has_bar and name not in ["akis_normal", "akis_kuculme", "akis_suzulme", "simge_kaynak"] else None
            cells.append((name, raw, box, line))
        for i, (name, raw, box, line) in enumerate(cells):
            citali = has_bar and name not in ["akis_normal", "akis_kuculme", "akis_suzulme", "simge_kaynak", "uyan_yuzme"]
            if line is None and citali:
                peers = [cell[3] for cell in cells[i // cols * cols:(i // cols + 1) * cols] if cell[3] is not None]
                if peers: line = round(float(np.mean(peers)))
            if line is not None: raw = raw.crop((0, 0, raw.width, line))
            rgba = green_key(raw)
            # Yeşil tik de bir kaynak efekti: dışa bağlı zemin temizlenir, iç renk korunur.
            if group == "efekt":
                pixels = np.array(raw)
                candidate = (pixels[:, :, 1].astype(int) > pixels[:, :, 0].astype(int) + 35) & (pixels[:, :, 1].astype(int) > pixels[:, :, 2].astype(int) + 25)
                seed = np.zeros_like(candidate); seed[0] = candidate[0]; seed[-1] = candidate[-1]; seed[:, 0] |= candidate[:, 0]; seed[:, -1] |= candidate[:, -1]
                background = ndimage.binary_propagation(seed, mask=candidate)
                arr = np.array(raw.convert("RGBA")); arr[background] = 0; rgba = Image.fromarray(arr)
            pending.append(("simge" if name == "simge_kaynak" else group, name, rgba, source, box, citali))
    # Pet tek tuval: en büyük kaynak bbox + 8. Yeniden örnekleme yapılmaz.
    for group in ["pet", "kart", "efekt", "simge"]:
        entries = [entry for entry in pending if entry[0] == group]
        width = max(entry[2].getbbox()[2] - entry[2].getbbox()[0] for entry in entries) + 8
        height = max(entry[2].getbbox()[3] - entry[2].getbbox()[1] for entry in entries) + 8
        directory = base / group; directory.mkdir(exist_ok=True)
        for _, name, rgba, source, box, citali in entries:
            trim = rgba.getbbox(); crop = rgba.crop(trim)
            mirrored = name == "idle_sol"
            if mirrored: crop = crop.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            x, y = (width - crop.width) // 2, height - crop.height - 1
            result = Image.new("RGBA", (width, height)); result.alpha_composite(crop, (x, y))
            if group == "pet": result = clean_lower_halo(result)
            result.save(directory / (name + ".png"))
            if group == "pet": result.save(PUBLIC / (name + ".webp"), lossless=True, exact=True)
            manifest["frames"][group + "/" + name] = {"mirror_x": mirrored, "source": source, "box": list(box), "trim": list(trim), "offset": [x, y], "canvas": [width, height], "bar_contact": citali, "source_area_ratio": np.count_nonzero(np.array(rgba)[:, :, 3]) / (rgba.width * rgba.height), "sha256": hashlib.sha256((directory/(name+".png")).read_bytes()).hexdigest()}
    for alias, origin in {"idle_goz_acilis": "idle_normal", "uyan_tam": "akis_tutunma", "uyan_dikkat": "uyan_yukselme", "gecis_kompakt": "akis_kuculme", "gecis_kayma": "akis_suzulme"}.items():
        image = Image.open(base / f"pet/{origin}.png")
        image.save(base / f"pet/{alias}.png"); image.save(PUBLIC / f"{alias}.webp", lossless=True, exact=True)
    source = Image.open(SOURCE / "uygulama_simgesi.png").convert("RGBA")
    source.save(base / "simge/uygulama_256.png") if source.size == (256, 256) else source.resize((256, 256), Image.Resampling.LANCZOS).save(base / "simge/uygulama_256.png")
    source.save(base / "simge/uygulama.ico", sizes=[(16,16), (24,24), (32,32), (48,48), (64,64), (128,128), (256,256)])
    source.save(ROOT / "windows/src-tauri/icons/icon.ico", sizes=[(16,16), (24,24), (32,32), (48,48), (64,64), (128,128), (256,256)])
    for size, name in [(32,"32x32"),(128,"128x128"),(256,"128x128@2x")]: source.resize((size,size), Image.Resampling.LANCZOS).save(ROOT/f"windows/src-tauri/icons/{name}.png")
    manifest["frames"]["simge/uygulama_256"] = {"source": "uygulama_simgesi.png", "canvas": [256, 256], "bar_contact": False, "source_area_ratio": 1}
    icon = Image.open(base / "simge/simge_kaynak.png")
    for size in [16, 32, 64]: icon.resize((size, size), Image.Resampling.LANCZOS).save(base / f"simge/durum_{size}.png")
    # Cargo yeni PNG bağımlılığı indirmez; yerelde çözümlenmiş resmi simge RGBA olarak gömülür.
    (ROOT / "windows/src-tauri/icons/tray-base.rgba").write_bytes(Image.open(base / "simge/durum_32.png").tobytes())
    (base / "kesim.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (base / "pet/kesim.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    for group in ["pet", "kart", "efekt"]:
        names = [key.split("/")[1] for key in manifest["frames"] if key.startswith(group + "/")]
        report = Image.new("RGB", (6 * 180, ((len(names) + 5)//6) * 205), "#eee")
        draw = ImageDraw.Draw(report)
        for i, name in enumerate(names):
            x, y = i % 6 * 180, i // 6 * 205
            for cy in range(0,180,10):
                for cx in range(0,180,10): draw.rectangle((x+cx,y+cy,x+cx+9,y+cy+9),fill="#ccc" if (cx+cy)//10%2 else "#eee")
            thumb = Image.open(base/group/(name+".png")); thumb.thumbnail((180,180))
            report.paste(thumb,(x+(180-thumb.width)//2,y+180-thumb.height),thumb)
            draw.text((x+2,y+182),name,fill="black")
        report.save(base/f"kesim-kontrol-{group}.png")
    return validate_delivery()

def validate_delivery():
    base = ROOT / "afu-character"
    manifest_path = base / "kesim.json"
    if not manifest_path.exists(): return 1
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors = []
    if len(manifest["frames"]) != 50: errors.append("expected 50 source frames")
    sizes = {}
    for key, record in manifest["frames"].items():
        file = base / (key + ".png")
        if not file.exists(): errors.append(key + ": missing"); continue
        image = Image.open(file); arr = np.array(image)
        if image.mode != "RGBA": errors.append(key + ": RGBA")
        if any(arr[y,x,3] >= 10 for x,y in [(0,0),(image.width-1,0),(0,image.height-1),(image.width-1,image.height-1)]): errors.append(key + ": corner alpha")
        group = key.split("/")[0]
        if group != "simge":
            sizes.setdefault(group,image.size)
            if sizes[group] != image.size: errors.append(key + ": group canvas")
        if record["source_area_ratio"] <= (.05 if group == "efekt" else .15): errors.append(key + ": area")
        if record["bar_contact"] and np.count_nonzero(arr[-3:,:,3] > 10) < 20: errors.append(key + ": bottom alignment")
        opaque = arr[:,:,3] > 10
        rgb = arr[:,:,:3].astype(int)
        green = (rgb[:,:,1] > rgb[:,:,0]+40) & (rgb[:,:,1] > rgb[:,:,2]+40)
        if key != "efekt/tik" and np.mean(green[opaque]) > .005: errors.append(key + ": green spill")
        if "trim" in record:
            original = Image.open(SOURCE/record["source"]).convert("RGB").crop(record["box"]).crop(record["trim"])
            if record.get("mirror_x"): original = original.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            x,y = record["offset"]; crop = arr[y:y+original.height,x:x+original.width]
            selected = crop[:,:,3] > 10
            if not np.array_equal(crop[:,:,:3][selected],np.array(original)[selected]): errors.append(key + ": source RGB changed")
    print("\n".join(errors) if errors else "PASS 50/50 delivery frames (headless; intrinsic green tick preserved)")
    return int(bool(errors))


def build():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    return build_delivery()


def validate():
    return validate_delivery()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dogrula", action="store_true")
    parser.add_argument("--webp", action="store_true")
    args = parser.parse_args()
    if args.webp:
        PUBLIC.mkdir(parents=True, exist_ok=True)
        for image in OUT.glob("*.png"):
            if image.name != "kesim-kontrol.png":
                Image.open(image).save(PUBLIC / (image.stem + ".webp"), lossless=True, exact=True)
        return validate()
    return validate_delivery() if args.dogrula else build()


if __name__ == "__main__":
    raise SystemExit(main())
