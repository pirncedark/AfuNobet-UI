import glob, numpy as np
from PIL import Image
S = r"C:/Users/afuuu/AppData/Local/Temp/claude/C--Users-afuuu/26dd2098-70d2-4792-a3fe-79a20e159a03/scratchpad/video/"
files = sorted(glob.glob(S + "kareler/k*.png"))
def key(rgb):
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.maximum(r, b)
    yesil = g - m  # yesil baskinligi
    alpha = np.clip(1.0 - (yesil - 18.0) / 30.0, 0, 1)  # 18 alti tam opak, 48 ustu tam seffaf
    # yesil tasma temizligi: kenarda G'yi max(R,B)'ye cek
    g2 = np.where(yesil > 0, m + np.minimum(yesil, 0) , g)
    out = np.dstack([r, np.minimum(g, np.maximum(m, g2)), b]).clip(0, 255)
    return out.astype(np.uint8), (alpha * 255).astype(np.uint8)
frames, boxes = [], []
for f in files:
    rgb = np.array(Image.open(f).convert("RGB"))
    out, al = key(rgb)
    opak = al > 200
    sat = np.where(opak.sum(axis=1) > 25)[0]; sut = np.where(opak.sum(axis=0) > 25)[0]
    boxes.append((sut.min(), sat.min(), sut.max(), sat.max()))
    frames.append((out, al))
x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes); x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
print("kutu", x0, y0, x1, y1, "kare", len(frames))
w, h = x1 - x0, y1 - y0; side = max(w, h) + 8
import statistics
cx = int(statistics.median([(b[0]+b[2])//2 for b in boxes]))
side = (y1 + 10) - 0
left = max(0, cx - side // 2); top = 0
imgs = []
for out, al in frames:
    im = Image.fromarray(np.dstack([out, al]), "RGBA").crop((left, top, left + side, top + side)).resize((384, 384), Image.LANCZOS)
    imgs.append(im)
imgs[0].save(S + "ense_tutma.webp", save_all=True, append_images=imgs[1:], duration=83, loop=0, quality=80, method=5, lossless=False)
imgs[len(imgs)//3].save(S + "ornek_seffaf.png")
bg = Image.new("RGBA", (384, 384), (20, 24, 32, 255)); bg.alpha_composite(imgs[len(imgs)//3]); bg.save(S + "ornek_koyu.png")
