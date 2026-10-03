"""Cut official Afu reference pixels. Offline: Pillow, NumPy and SciPy only.

Run from the repository root: python scripts/cut-afu.py
No generated drawing, character recolouring, model download or external input.
"""
from pathlib import Path
import hashlib
import json
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "afu-character"
PUBLIC = ROOT / "windows/public/afu"
ICONS = ROOT / "windows/src-tauri/icons"
SOURCE = OUT / "REFERANS.png"
CROPS = {
    "main-34": (14, 43, 488, 653),
    "front": (490, 164, 815, 635),
    "happy": (831, 370, 1034, 586),
    "thinking": (1034, 370, 1226, 585),
    "alert": (1233, 380, 1440, 585),
    "mini-icon": (68, 772, 267, 963),
}


def segment(crop, name):
    rgb = np.asarray(crop.convert("RGB")).astype(np.float32)
    low = rgb.min(axis=2)
    high = rgb.max(axis=2)
    # The sheet has a neutral light background; saturated mascot pixels and
    # dark outlines define the foreground. Flood-fill its largest component,
    # then fill enclosed eye whites, teeth and specular highlights.
    candidate = ((high - low > 31) & (low < 230)) | (high < 185)
    if name == "mini-icon":
        # The mini portrait is on a rounded blue-grey tile. A traced silhouette
        # excludes that decorative tile while retaining the original pixels.
        polygon = [(114, 1), (144, 7), (170, 26), (186, 52), (196, 88),
                   (185, 116), (170, 137), (177, 155), (176, 177),
                   (153, 190), (51, 190), (25, 179), (26, 155),
                   (39, 142), (26, 128), (9, 111), (2, 84),
                   (10, 58), (27, 33), (54, 13), (84, 4)]
        limit = Image.new("L", crop.size)
        ImageDraw.Draw(limit).polygon(polygon, fill=255)
        candidate &= np.asarray(limit) > 0
    candidate = ndimage.binary_closing(candidate, iterations=1)
    labels, count = ndimage.label(candidate)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    mask = labels == int(sizes.argmax())
    mask = ndimage.binary_fill_holes(mask)
    if name in ("main-34", "front"):
        # The coloured floor shadow touches the soles. Explicit source-space
        # sole contours stop that connected shadow from entering the cutout.
        sole_contours = {
            "main-34": (605, [
                [(140,605),(250,605),(247,644),(230,649),(157,652),(142,647)],
                [(265,605),(392,605),(396,634),(390,641),(288,646),(266,640)],
            ]),
            "front": (602, [
                [(560,602),(650,602),(649,623),(636,631),(580,634),(565,629)],
                [(682,602),(760,602),(763,622),(757,630),(703,633),(684,626)],
            ]),
        }
        start, polygons = sole_contours[name]
        left, top, right, bottom = CROPS[name]
        limit = Image.new("L", crop.size)
        drawing = ImageDraw.Draw(limit)
        drawing.rectangle((0,0,crop.width,start-top-1),fill=255)
        for polygon in polygons:
            drawing.polygon([(x-left,y-top) for x,y in polygon], fill=255)
        mask &= np.asarray(limit) > 0
    # Alpha stays binary: preserved pixels have identical RGB to the source.
    # Avoid blurring/repainting facial features, the brain or clothing.
    rgba = np.dstack((rgb.astype(np.uint8), mask.astype(np.uint8) * 255))
    rgba[~mask, :3] = 0
    result = Image.fromarray(rgba)
    bounds = result.getbbox()
    return result.crop(bounds), bounds


def icon_square(source, size):
    canvas = Image.new("RGBA", (size, size))
    picture = source.copy()
    picture.thumbnail((round(size * .94), round(size * .94)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(picture, ((size - picture.width) // 2, (size - picture.height) // 2))
    return canvas


def contact_sheet(images):
    cell_w, cell_h = 360, 390
    sheet = Image.new("RGB", (cell_w * 3, cell_h * 2), "#131d35")
    d = ImageDraw.Draw(sheet)
    for index, (name, im) in enumerate(images.items()):
        x, y = (index % 3) * cell_w, (index // 3) * cell_h
        # Checkerboard exposes opaque background remnants and disconnected art.
        for cy in range(y + 35, y + cell_h - 20, 16):
            for cx in range(x + 12, x + cell_w - 12, 16):
                tone = "#e4e8ee" if ((cx-x)//16 + (cy-y)//16) % 2 else "#6a7891"
                d.rectangle((cx, cy, min(cx+15,x+cell_w-13), min(cy+15,y+cell_h-21)), fill=tone)
        d.text((x + 15, y + 10), f"{name}.png  {im.width} x {im.height}", fill="white")
        scaled = im.copy()
        scaled.thumbnail((cell_w - 30, cell_h - 68), Image.Resampling.LANCZOS)
        sheet.paste(scaled, (x + (cell_w-scaled.width)//2, y + 43 + (cell_h-68-scaled.height)//2), scaled)
    sheet.save(OUT / "cut-control.png")


def main():
    for folder in (OUT, PUBLIC, ICONS):
        folder.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    manifest = {"source": "REFERANS.png", "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                "source_size": list(source.size), "method": "Offline neutral-background segmentation, largest-component flood fill, enclosed-hole fill; no redraw",
                "assets": {}}
    images = {}
    for name, crop_box in CROPS.items():
        result, bounds = segment(source.crop(crop_box), name)
        result.save(OUT / f"{name}.png")
        shutil.copyfile(OUT / f"{name}.png", PUBLIC / f"{name}.png")
        images[name] = result
        manifest["assets"][f"{name}.png"] = {"reference_crop_xyxy": crop_box, "trim_box_within_crop": bounds,
                                                    "size": list(result.size), "alpha": "binary", "rgb": "unchanged source pixels"}
    effects = {
        "question.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80"><text x="32" y="66" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="76" font-weight="700" fill="#f5c768">?</text></svg>',
        "exclamation.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80"><text x="32" y="66" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="76" font-weight="700" fill="#ff9b34">!</text></svg>',
        "sparkle.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 2 39 25 62 32 39 39 32 62 25 39 2 32 25 25Z" fill="#ffd76a"/></svg>',
    }
    for name, content in effects.items():
        (OUT / name).write_text(content + "\n", encoding="utf-8")
        shutil.copyfile(OUT / name, PUBLIC / name)
    for name, size in {"32x32.png": 32, "128x128.png": 128, "128x128@2x.png": 256, "icon.png": 512, "tray.png": 32}.items():
        icon_square(images["mini-icon"], size).save(ICONS / name)
    icon_square(images["mini-icon"], 256).save(ICONS / "icon.ico", format="ICO", sizes=[(s,s) for s in (16,24,32,48,64,128,256)])
    contact_sheet(images)
    (OUT / "crop-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({name: list(im.size) for name, im in images.items()}))


if __name__ == "__main__":
    main()
