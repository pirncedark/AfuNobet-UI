"""A14 tamamlayıcı kesim: yalnız mevcut kaynak pikselleri, ağ/model yok.

Teslim alanına yazılır; canlı pet/public dosyaları değiştirilmez. Gerçek yeşil
tik nesnesi korunur, karşıt bakış kaynakta yoksa başarı iddiası yapılmaz.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

PROJECT = Path(r"C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI")
SOURCE = PROJECT / "afu-character/kaynak"
DEFAULT_OUT = PROJECT / "delivery/A14-complement"
SPECS = [
    ("pet_durumlar_4x4.png", 4, 4, "pet", [
        "idle_normal", "idle_nefes", "idle_goz_kapali", "idle_bakis_a",
        "idle_bakis_b", "akis_bekleme", "tepki_mutlu", "tepki_dusunme",
        "tepki_uyari", "tepki_hata", "tepki_uyku", "tepki_basari",
        "tepki_goz_kirpma", "tepki_dinleme", "tepki_konusma", "uyan_yuzme"]),
    ("pet_gecis_3x3.png", 3, 3, "pet", [
        "akis_normal", "akis_kuculme", "akis_suzulme", "akis_gorunme",
        "akis_tutunma", "uyan_gizli", "uyan_gozukme", "uyan_yukselme",
        "simge_kaynak"]),
    ("kart_3x3.png", 3, 3, "kart", [
        "idle", "calisiyor", "dusunme", "bekleme_kota", "basari", "hata",
        "selam", "dinleme", "konusma"]),
    ("efektler_3x3.png", 3, 3, "efekt", [
        "unlem", "soru", "uyku_z", "parilti", "tik", "kalp",
        "ses_dalgasi", "konusma_balonu", "bas_donmesi"]),
    ("ozel_2x3.png", 3, 2, "pet", [
        "ozel_bas_donmesi", "ozel_dosya_yakala", "ozel_dosya_tut",
        "ozel_veda", "ozel_sessiz", "ozel_yogun"]),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def runs(values):
    indices = np.flatnonzero(values)
    if not len(indices):
        return []
    pieces = np.split(indices, np.where(np.diff(indices) > 1)[0] + 1)
    return [(int(piece[0]), int(piece[-1]) + 1) for piece in pieces]


def grid_boxes(image, columns, rows):
    """Ayırıcıların konumu görüntüden ölçülür; eşit hücre varsayımı yok."""
    rgb = np.asarray(image.convert("RGB")).astype(np.int16)
    white = (rgb.min(axis=2) > 220) & (np.ptp(rgb, axis=2) < 20)
    # Izgara çizgileri tüm sayfayı kaplar; açık karakter/göz bölgesi kaplamaz.
    xruns = [run for run in runs(white.mean(axis=0) > .85)
             if run[0] > 4 and run[1] < image.width - 4]
    yruns = [run for run in runs(white.mean(axis=1) > .85)
             if run[0] > 4 and run[1] < image.height - 4]
    # Çıta üstündeki tek piksellik beyaz parlama, kalın grid çizgisi değildir.
    # Eksik adayda tahmin yok; fazla adayda yalnız kalınlık kanıtı kullanılır.
    def strongest(candidates, expected):
        if len(candidates) <= expected:
            return candidates
        ranked = sorted(candidates, key=lambda run: run[1] - run[0], reverse=True)
        if ranked[expected - 1][1] - ranked[expected - 1][0] <= ranked[expected][1] - ranked[expected][0]:
            raise ValueError(f"Izgara/çıta çizgisi belirsiz: {candidates}")
        return sorted(ranked[:expected])
    xruns, yruns = strongest(xruns, columns - 1), strongest(yruns, rows - 1)
    if len(xruns) != columns - 1 or len(yruns) != rows - 1:
        raise ValueError(f"Izgara çizgisi eksik: {columns}x{rows}: {xruns}, {yruns}")
    xs = [(0, xruns[0][0])] if xruns else [(0, image.width)]
    xs += [(xruns[i][1], xruns[i + 1][0]) for i in range(len(xruns) - 1)]
    if xruns:
        xs.append((xruns[-1][1], image.width))
    ys = [(0, yruns[0][0])] if yruns else [(0, image.height)]
    ys += [(yruns[i][1], yruns[i + 1][0]) for i in range(len(yruns) - 1)]
    if yruns:
        ys.append((yruns[-1][1], image.height))
    # Bir piksellik AA ayırıcı kontaminasyonu kayıtta açıkça gösterilir.
    boxes = [(x0 + int(x0 > 0), y0 + int(y0 > 0),
              x1 - int(x1 < image.width), y1 - int(y1 < image.height))
             for y0, y1 in ys for x0, x1 in xs]
    return boxes, {"x_white_runs": xruns, "y_white_runs": yruns}


def bar_line(raw):
    rgb = np.asarray(raw.convert("RGB")).astype(np.int16)
    gray = (np.ptp(rgb, axis=2) < 45) & (rgb.min(axis=2) > 150)
    # Çıtanın kimi gölgeli alanları 190'dan koyu; geniş satır desteği gerekir.
    ratio = gray.mean(axis=1)
    indices = np.flatnonzero((ratio > .65) &
                            (np.arange(raw.height) > raw.height * .45))
    return int(indices[0]) if len(indices) else None


def key(raw, preserve_green=False):
    rgb = np.asarray(raw.convert("RGB")).copy()
    work = rgb.astype(np.int16)
    candidate = ((work[:, :, 1] > work[:, :, 0] + 35) &
                 (work[:, :, 1] > work[:, :, 2] + 35))
    if preserve_green:
        # Yeşil tikin beyaz/sarı dış çizgisi bağlılığı ayırır. İç yeşili tut.
        labels, _ = ndimage.label(candidate)
        border_ids = np.unique(np.concatenate((labels[0], labels[-1],
                                              labels[:, 0], labels[:, -1])))
        border_ids = border_ids[border_ids != 0]
        background = np.isin(labels, border_ids)
    else:
        background = candidate
    alpha = np.where(background, 0, 255).astype(np.uint8)
    # Yalnız dış kenarda spill baskılanır; iç renkler kaynakla birebir kalır.
    edge = ndimage.binary_dilation(background, iterations=1) & ~background
    visible_green = ((work[:, :, 1] > work[:, :, 0] + 15) &
                     (work[:, :, 1] > work[:, :, 2] + 15))
    spill = edge & visible_green
    rgb[spill, 1] = np.maximum(rgb[spill, 0], rgb[spill, 2])
    rgba = np.dstack((rgb, alpha))
    rgba[background, :3] = 0
    return Image.fromarray(rgba), int(spill.sum())


def gaze(raw):
    rgb = np.asarray(raw.convert("RGB")).astype(np.int16)
    # Kaynağın sol görünen gözünün sclera ve iris merkezi ayrı ölçülür.
    region = rgb[int(raw.height * .36):int(raw.height * .8),
                 :int(raw.width * .67)]
    white = (region.min(axis=2) > 180) & (np.ptp(region, axis=2) < 45)
    blue = ((region[:, :, 2] > 140) &
            (region[:, :, 2] > region[:, :, 0] + 50) &
            (region[:, :, 1] > 65))
    labels, count = ndimage.label(white)
    if not count:
        return {"direction": "unknown", "delta": None}
    sizes = ndimage.sum(white, labels, range(1, count + 1))
    eye = labels == int(np.argmax(sizes) + 1)
    bbox = ndimage.find_objects(eye.astype(int))[0]
    area = np.zeros_like(white)
    area[bbox] = True
    _, bx = np.nonzero(blue & area)
    _, wx = np.nonzero(eye)
    if not len(bx) or not len(wx):
        return {"direction": "unknown", "delta": None}
    delta = float(bx.mean() - wx.mean())
    return {"direction": "right" if delta > 2 else "left" if delta < -2 else "center",
            "delta": round(delta, 4), "iris_x": round(float(bx.mean()), 4),
            "white_x": round(float(wx.mean()), 4)}


def expected_names():
    paths = []
    for _, _, _, group, names in SPECS:
        paths += [f"{'simge' if name == 'simge_kaynak' else group}/{name}.png"
                  for name in names]
    return paths + ["simge/uygulama_256.png"]


def preview(out, group, frames):
    names = [name for name in frames if name.startswith(group + "/")]
    width, height = 240, 270
    columns = 5 if group == "pet" else 3
    result = Image.new("RGB", (width * columns,
                       height * ((len(names) + columns - 1) // columns)), "#111827")
    draw = ImageDraw.Draw(result)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 15)
    for index, name in enumerate(names):
        x, y = index % columns * width, index // columns * height
        for yy in range(0, 240, 16):
            for xx in range(0, 240, 16):
                draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15),
                               fill="#cbd5e1" if (xx // 16 + yy // 16) % 2 else "#64748b")
        frame = Image.open(out / name).convert("RGBA")
        frame.thumbnail((232, 232), Image.Resampling.LANCZOS)
        result.paste(frame, (x + (240 - frame.width) // 2,
                            y + 240 - frame.height), frame)
        draw.text((x + 5, y + 246), Path(name).stem, fill="white", font=font)
    result.save(out / f"kesim-kontrol-{group}.png")


def build(out):
    out.mkdir(parents=True, exist_ok=True)
    for group in ("pet", "kart", "efekt", "simge"):
        (out / group).mkdir(exist_ok=True)
    manifest = {"version": 1, "source_root": str(SOURCE), "mode": "complement-only",
                "source_unchanged": True, "sources": {}, "frames": {}, "grids": {},
                "primary_count": 50, "derived_count": 4, "gaze": {}, "warnings": []}
    extracted = {}
    for source, columns, rows, group, names in SPECS:
        image = Image.open(SOURCE / source)
        manifest["sources"][source] = {"sha256": sha(SOURCE / source),
                                       "size": image.size, "mode": image.mode}
        boxes, grid = grid_boxes(image, columns, rows)
        manifest["grids"][source] = grid
        raws = [image.crop(box) for box in boxes]
        citalar = [bar_line(raw) if group == "pet" else None for raw in raws]
        for index, (name, raw, box) in enumerate(zip(names, raws, boxes)):
            actual_group = "simge" if name == "simge_kaynak" else group
            cita = citalar[index]
            # Durum/özel hücreler çıtalı, son durum yüzme yine tabanı keser.
            expected_bar = source in ("pet_durumlar_4x4.png", "ozel_2x3.png") or (
                source == "pet_gecis_3x3.png" and index in range(3, 8))
            if expected_bar and cita is None:
                peers = [value for value in citalar[index // columns * columns:
                         (index // columns + 1) * columns] if value is not None]
                if not peers:
                    raise ValueError(f"Çıta bulunamadı: {source}/{index}")
                cita = round(float(np.mean(peers)))
            if not expected_bar:
                cita = None
            trimmed = raw.crop((0, 0, raw.width, cita if cita is not None else raw.height))
            keyed, spill_count = key(trimmed, preserve_green=name == "tik")
            bbox = keyed.getbbox()
            if bbox is None:
                raise ValueError(f"Boş kesim: {source}/{index}")
            extracted[f"{actual_group}/{name}.png"] = keyed.crop(bbox)
            manifest["frames"][f"{actual_group}/{name}.png"] = {
                "source": source, "cell_index": index, "cell_box": box,
                "crop_box": bbox, "bar_y_local": cita,
                "bar_contact_required": expected_bar and name != "uyan_yuzme",
                "source_cell_area": raw.width * raw.height,
                "source_trim_area": trimmed.width * trimmed.height,
                "scale": 1, "spill_pixels": spill_count,
                "preserves_real_green_object": name == "tik"}
            if name in ("idle_bakis_a", "idle_bakis_b"):
                manifest["gaze"][name] = gaze(trimmed)
    for group in ("pet", "kart", "efekt", "simge"):
        selected = {name: image for name, image in extracted.items()
                    if name.startswith(group + "/")}
        width = max(image.width for image in selected.values()) + 8
        height = max(image.height for image in selected.values()) + 8
        for name, image in selected.items():
            canvas = Image.new("RGBA", (width, height))
            x, y = (width - image.width) // 2, height - image.height
            canvas.alpha_composite(image, (x, y))
            canvas.save(out / name)
            manifest["frames"][name].update({"canvas": [width, height],
                                                "offset": [x, y], "sha256": sha(out / name)})
    icon_source = SOURCE / "uygulama_simgesi.png"
    icon = Image.open(icon_source).convert("RGBA")
    manifest["sources"][icon_source.name] = {"sha256": sha(icon_source),
                                             "size": icon.size, "mode": icon.mode}
    # Kaynak simgenin mevcut alfa kanalı aynen kullanılır; yeşil anahtarlama yok.
    icon.thumbnail((256, 256), Image.Resampling.LANCZOS)
    icon.save(out / "simge/uygulama_256.png")
    icon.save(out / "simge/uygulama.ico", sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])
    manifest["frames"]["simge/uygulama_256.png"] = {
        "source": icon_source.name, "cell_box": [0, 0, 1254, 1254],
        "canvas": list(icon.size), "scale": 256 / 1254,
        "existing_alpha": True, "sha256": sha(out / "simge/uygulama_256.png")}
    status = Image.open(out / "simge/simge_kaynak.png")
    for size in (16, 32, 64):
        small = status.copy()
        small.thumbnail((size - 2, size - 2), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size))
        canvas.alpha_composite(small, ((size - small.width) // 2, (size - small.height) // 2))
        canvas.save(out / f"simge/durum_{size}.png")
    manifest["primary_outputs"] = expected_names()
    manifest["derived_outputs"] = ["simge/uygulama.ico"] + [
        f"simge/durum_{size}.png" for size in (16, 32, 64)]
    if {record["direction"] for record in manifest["gaze"].values()} != {"left", "right"}:
        manifest["warnings"].append("Kaynak iki karşıt bakış sağlamıyor; idle_sol/idle_sag yeniden adlandırılmadı.")
    manifest["warnings"].append("Yeşil tik gerçek nesne rengi: yeşil-artık eşiğinin içerik istisnası; renk değiştirilmedi.")
    (out / "kesim.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    for group in ("pet", "kart", "efekt", "simge"):
        preview(out, group, manifest["frames"])
    create_merge(out, manifest)
    return validate(out)


def create_merge(out, manifest):
    operations = []
    for name in manifest["primary_outputs"] + manifest["derived_outputs"]:
        target = PROJECT / "afu-character" / name
        group = name.split("/")[0]
        protected = group == "pet" and target.exists()
        operations.append({"from": str(out / name), "to": str(target),
                           "action": "KEEP_EXISTING_REVIEW_ONLY" if protected else "COPY_IF_ABSENT",
                           "sha256": sha(out / name), "target_exists": target.exists(),
                           "target_sha256": sha(target) if target.exists() else None})
    (out / "birlestirme-manifesti.json").write_text(json.dumps({
        "automatic_apply": False,
        "note": "Mevcut pet kareleri korunur; hiçbiri burada değiştirilmedi. Webp/public eşlemesi uygulama sahibinin işi.",
        "gaze_names_pending": {"idle_bakis_a": "idle_sol/idle_sag eşlemesi bekliyor",
                               "idle_bakis_b": "idle_sol/idle_sag eşlemesi bekliyor"},
        "operations": operations}, ensure_ascii=False, indent=2), encoding="utf-8")


def validate(out):
    manifest = json.loads((out / "kesim.json").read_text(encoding="utf-8"))
    errors, blockers, exceptions, metrics = [], [], [], {}
    passed = 0
    for source, record in manifest["sources"].items():
        if sha(SOURCE / source) != record["sha256"]:
            errors.append(f"Kaynak değişmiş: {source}")
    for name in expected_names():
        path = out / name
        local = []
        if not path.is_file():
            errors.append(f"Eksik: {name}")
            continue
        image = Image.open(path)
        if image.mode != "RGBA":
            errors.append(f"RGBA değil: {name}")
            continue
        rgba = np.asarray(image)
        record = manifest["frames"][name]
        if sha(path) != record["sha256"]:
            local.append("sha256")
        if any(rgba[y, x, 3] >= 10 for x, y in [(0, 0), (image.width - 1, 0),
                                                              (0, image.height - 1), (image.width - 1, image.height - 1)]):
            local.append("köşe alfa")
        opaque = rgba[:, :, 3] >= 10
        work = rgba[:, :, :3].astype(np.int16)
        green = ((work[:, :, 1] > work[:, :, 0] + 40) &
                 (work[:, :, 1] > work[:, :, 2] + 40) & opaque)
        green_ratio = float(green.sum() / max(1, opaque.sum()))
        if green_ratio >= .005:
            if record.get("preserves_real_green_object"):
                exceptions.append(f"{name}: gerçek yeşil tik korunuyor ({green_ratio:.2%}); eşik teknik olarak geçmiyor")
            else:
                local.append(f"yeşil artığı {green_ratio:.2%}")
        cell_ratio = float(opaque.sum() / record.get("source_cell_area", image.width * image.height))
        if not record.get("existing_alpha") and cell_ratio <= (.05 if name.startswith("efekt/") else .15):
            local.append(f"hücre opak alanı {cell_ratio:.2%}")
        contact = int(np.count_nonzero(opaque[-3:]))
        if record.get("bar_contact_required") and contact < 20:
            local.append(f"alt temas {contact}")
        if list(image.size) != record["canvas"]:
            local.append("tuval ölçüsü")
        # Ölçek küçültülmeyen kesimde iç pikseller kaynakla birebir karşılaştırılır.
        if record.get("scale") == 1:
            source = Image.open(SOURCE / record["source"]).convert("RGB").crop(record["cell_box"])
            bbox = record["crop_box"]
            source = np.asarray(source.crop(bbox))
            x, y = record["offset"]
            region = rgba[y:y + source.shape[0], x:x + source.shape[1]]
            original_bg = ((source[:, :, 1].astype(int) > source[:, :, 0].astype(int) + 35) &
                           (source[:, :, 1].astype(int) > source[:, :, 2].astype(int) + 35))
            interior = ndimage.binary_erosion(region[:, :, 3] >= 10, iterations=2)
            delta = np.abs(region[:, :, :3].astype(int) - source.astype(int))
            if np.any(delta[interior]):
                local.append("iç kaynak rengi değişmiş")
        metrics[name] = {"size": image.size, "opaque_pixels": int(opaque.sum()),
                         "source_cell_opaque_ratio": cell_ratio, "green_ratio": green_ratio,
                         "bottom_three_opaque": contact, "errors": local}
        if local:
            errors += [f"{name}: {error}" for error in local]
        else:
            passed += 1
    for group in ("pet", "kart", "efekt"):
        sizes = {tuple(record["canvas"]) for name, record in manifest["frames"].items()
                 if name.startswith(group + "/")}
        if len(sizes) != 1:
            errors.append(f"Grup tuvalları eşit değil: {group}")
    for path in manifest["derived_outputs"]:
        if not (out / path).is_file():
            errors.append(f"Türev eksik: {path}")
    icon = Image.open(out / "simge/uygulama.ico")
    ico_sizes = sorted(icon.ico.sizes())
    if ico_sizes != [(s, s) for s in (16, 24, 32, 48, 64, 128, 256)]:
        errors.append(f"ICO boyutları eksik: {ico_sizes}")
    if {record["direction"] for record in manifest["gaze"].values()} != {"left", "right"}:
        blockers.append("Kaynak idle_bakis_a/b karşıt sol/sağ bakış sağlamıyor; bu iki kare uydurulmadı.")
    strict = not errors and not blockers and not exceptions
    result = {"status": "PASS" if strict else "PARTIAL", "primary_present": len([p for p in expected_names() if (out / p).is_file()]),
              "primary_structural_pass": passed, "primary_total": 50, "derived_total": 4,
              "errors": errors, "source_blockers": blockers, "content_exceptions": exceptions,
              "gaze": manifest["gaze"], "ico_sizes": ico_sizes, "metrics": metrics}
    (out / "dogrulama.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    report = ["# A14 tamamlayıcı görsel teslimi", "", f"Karar: **{result['status']}**.", "",
              "Mevcut uygulama/üretim pet dosyalarına yazılmadı. Kaynaklar değiştirilmedi; model veya yeni çizim kullanılmadı.",
              "", f"50/50 ana PNG mevcut; yapı/rengi kontrol edilen {passed}/50. Ek 4 türev: ICO + 16/32/64 durum PNG.",
              "", "30 pet = 16 durum + 8 geçiş/uyanma + 6 özel; kart 9 + efekt 9 + simge 2 = 50.",
              "Görevdeki 16+5+3+6 ifadesi 30 eder; geçişte 8 pet ve 1 simge hücresi esas alındı.",
              "", "Izgara çizgileri görüntüden bulundu; grup tuvalları en büyük kutu + 8 piksel, karakterler yatay ortalı ve altta hizalı; pet/kart/efekt küçültülmedi.",
              "", "## Kabulü engelleyen kaynak/içerik sınırları", ""]
    report += [f"- {item}" for item in blockers + exceptions + errors]
    report += ["", "Bakış ölçümü:", "", "```json", json.dumps(manifest["gaze"], ensure_ascii=False, indent=2), "```", "",
               "Yeşil tikin doğal rengini bozarak eşiği geçirmek yanlış olur; tik renk istisnasının kabulü ve karşıt bakış kaynağı gerekir.",
               "", "## Tekrar çalıştırma", "", "```powershell", "python .\\a14_complement.py --out .", "python .\\a14_complement.py --out . --dogrula", "```", "",
               "--dogrula tüm koşullar sağlanırsa 0, kaynak/içerik sınırı veya hata varsa 1 döndürür. PASS 50/50 iddiası mevcut sınırlarda yapılmaz.",
               "", "## Üretime birleştirme", "", "birlestirme-manifesti.json tüm 54 çıktı için kaynak/hedef/SHA-256 verir. Mevcut pet dosyaları KEEP_EXISTING_REVIEW_ONLY, diğerleri COPY_IF_ABSENT. Otomatik uygulama yok; public/webp eşlemesi ana uygulama sahibinde.", "",
               "Görsel kontrol dosyaları: kesim-kontrol-pet.png, kesim-kontrol-kart.png, kesim-kontrol-efekt.png, kesim-kontrol-simge.png.", ""]
    (out / "RAPOR.md").write_text("\n".join(report), encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("status", "primary_present", "primary_structural_pass", "errors", "source_blockers", "content_exceptions")}, ensure_ascii=False))
    return 0 if strict else 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--dogrula", action="store_true")
    args = parser.parse_args()
    return validate(args.out.resolve()) if args.dogrula else build(args.out.resolve())


if __name__ == "__main__":
    raise SystemExit(main())
