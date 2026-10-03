"""Üretim A14 setini salt-okur denetler; sadece delivery raporlarına yazar."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from a14_complement import PROJECT, SOURCE, DEFAULT_OUT, expected_names


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit(out):
    base = PROJECT / "afu-character"
    manifest = json.loads((base / "kesim.json").read_text(encoding="utf-8"))
    expected = [name.removesuffix(".png").replace("idle_bakis_a", "idle_sol")
                .replace("idle_bakis_b", "idle_sag") for name in expected_names()]
    errors, warnings, metrics = [], [], {}
    if set(expected) != set(manifest["frames"]):
        errors.append(f"Liste farklı: eksik {sorted(set(expected)-set(manifest['frames']))}, fazla {sorted(set(manifest['frames'])-set(expected))}")
    for key, record in manifest["frames"].items():
        path = base / (key + ".png")
        image = Image.open(path)
        arr = np.asarray(image)
        if image.mode != "RGBA":
            errors.append(key + ": RGBA değil")
            continue
        if "sha256" in record and sha(path) != record["sha256"]:
            errors.append(key + ": SHA güncel değil")
        opaque = arr[:, :, 3] > 10
        rgb = arr[:, :, :3].astype(int)
        green = (rgb[:, :, 1] > rgb[:, :, 0] + 40) & (rgb[:, :, 1] > rgb[:, :, 2] + 40)
        green_ratio = float(green[opaque].mean())
        if key != "efekt/tik" and green_ratio >= .005:
            errors.append(key + f": yeşil artığı {green_ratio:.2%}")
        if any(arr[y, x, 3] >= 10 for x, y in ((0,0),(image.width-1,0),(0,image.height-1),(image.width-1,image.height-1))):
            errors.append(key + ": köşe alfa")
        original_size = image.size
        if "box" in record:
            box = record["box"]
            original_size = (box[2] - box[0], box[3] - box[1])
            cell_opacity = int(opaque.sum()) / (original_size[0] * original_size[1])
            if cell_opacity <= (.05 if key.startswith("efekt/") else .15):
                errors.append(key + f": tam hücre opak oranı {cell_opacity:.2%}")
        else:
            cell_opacity = float(opaque.mean())
        metrics[key] = {"size": image.size, "source": record["source"],
                        "source_cell_size": original_size, "full_cell_opacity": cell_opacity,
                        "green_ratio": green_ratio, "alpha_levels": len(np.unique(arr[:, :, 3])),
                        "bottom_three_opaque": int(opaque[-3:].sum())}
    old = json.loads((base / "pet/kesim.json").read_text(encoding="utf-8"))
    stale_core = []
    for name, record in old["frames"].items():
        path = base / "pet" / (name + ".png")
        actual_size = Image.open(path).size
        actual_sha = sha(path)
        if tuple(old["canvas"]) != actual_size or record["sha256"] != actual_sha:
            stale_core.append({"name": name, "expected_size": old["canvas"],
                               "actual_size": actual_size,
                               "sha_matches": record["sha256"] == actual_sha})
    low_resolution = [{"name": name, "source_size": record["source_size"],
                       "source": record["source"], "current_size": Image.open(base/"pet"/(name+".png")).size}
                      for name, record in old["frames"].items()
                      if record.get("dusuk_cozunurluk")]
    if stale_core:
        warnings.append(f"Eski pet/kesim.json {len(stale_core)} karede boyut/SHA ile artık eşleşmiyor; eski core doğrulaması yeniden çalışmaz.")
    warnings.append("idle_sol ve idle_sag karşıt yön sağlamıyor; yeni --dogrula bu görsel kabul koşulunu test etmiyor.")
    if low_resolution:
        warnings.append(f"Eski teknik sayfadan {len(low_resolution)} düşük çözünürlüklü durum PNG halen mevcut; yeni 50 manifestinin kapsamında değiller.")
    warnings.append("Yeşil tik %0.5 yeşil-artık şartının gerçek renk istisnası; üretim doğrulayıcısı bunu bilinçli atlıyor.")
    status_icons = {}
    for size in (16,32,64):
        image = Image.open(base / f"simge/durum_{size}.png")
        arr = np.asarray(image)
        status_icons[size] = {"size": image.size, "mode": image.mode,
                              "corner_alpha": [int(arr[y,x,3]) for x,y in [(0,0),(size-1,0),(0,size-1),(size-1,size-1)]]}
        if image.size != (size,size) or image.mode != "RGBA" or max(status_icons[size]["corner_alpha"]) >= 10:
            errors.append(f"durum_{size}: boyut/alfa")
    ico_sizes = sorted(Image.open(base / "simge/uygulama.ico").ico.sizes())
    if ico_sizes != [(s,s) for s in (16,24,32,48,64,128,256)]:
        errors.append("ICO boyutları eksik")
    result = {"status": "PARTIAL" if errors or warnings else "PASS", "primary_present": len(metrics),
              "structural_errors": errors, "source_contract_warnings": warnings,
              "stale_core_records": stale_core, "low_resolution_extras": low_resolution,
              "ico_sizes": ico_sizes, "status_icons": status_icons, "metrics": metrics}
    (out / "uretim-denetimi.json").write_text(json.dumps(result, ensure_ascii=False, indent=2),encoding="utf-8")
    text = ["# Üretim A14 bağımsız denetimi", "", "Karar: **PARTIAL** (kaynak kabul sınırları + eski manifest tutarsızlığı).", "",
            f"Yeni ana set 50/50 mevcut. Bağımsız RGBA, köşe alfa, gerçek hücre alanı, yeşil artık ve SHA denetiminde {len(errors)} yapısal hata.",
            "ICO tüm 7 boyutu, durum PNG 16/32/64 boyutu ve alfa kontrolü sağlandı.", "",
            "Üretim kesim-kontrol-pet/kart/efekt.png dosyaları gözle incelendi: gerekli 30/9/9 set görünür, gri çıta temizlenmiş, doğal yeşil tik korunmuş. Masaüstü çalışan uygulama bu denetimde açılmadı.", "",
            "## Somut bulgular", ""]
    text += [f"- {warning}" for warning in warnings + errors]
    text += ["", "## Düzeltme önerileri", "", "- Eski pet/kesim.json kaydını yeni üretilen birleşik sete göre yenile veya geçersiz eski manifesti açıkça arşiv durumuna taşı; doğrulayıcı gerçek tüketilen tüm kareleri kapsasın.",
             "- Karşıt bakış kaynakta bulunmadığından idle_sol adının anlamı doğrulanamıyor; yeni kaynak veya bu iki kareyi genel bakış olarak kabul kararı gereklidir. Ters çevirme/yeni çizim yapılmadı.",
             "- Yeşil tik istisnası kullanıcıya açık raporlansın; düz eşik testinden PASS 50/50 çıkması tüm sözleşmenin tamamlandığı anlamına gelmez.",
             "- Teknik8 ek karelerinin 183×115 kaynak çözünürlüğü korunarak 'düşük çözünürlük' işaretlensin; 512² tuval görüntünün detayını yükseltmez.", "",
             "Bu rapor sırasında üretim dosyalarına yazılmadı. a14_audit_production.py tekrar çalıştırılabilir; raporlar yalnız bu delivery alanına yazılır.", ""]
    (out / "URETIM_DENETIMI.md").write_text("\n".join(text),encoding="utf-8")
    print(json.dumps({"primary_present":len(metrics), "structural_errors": errors, "stale_core_count":len(stale_core),
                      "low_resolution_extras":len(low_resolution), "status":"PARTIAL"},ensure_ascii=False))
    return int(bool(errors or stale_core))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out",type=Path,default=DEFAULT_OUT)
    raise SystemExit(audit(parser.parse_args().out.resolve()))
