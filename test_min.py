import os
from PIL import Image
import sys

src_path = 'C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/afu-character/video/durumlar/bosta_nefes.webp'
dst_path = 'test_min.webp'

img = Image.open(src_path)
frames = []
try:
    idx = 0
    while True:
        img.seek(idx)
        if idx % 5 != 4:
            w, h = img.size
            new_h = 368
            new_w = int(w * (new_h / h))
            frame = img.copy().resize((new_w, new_h), Image.Resampling.LANCZOS)
            frames.append(frame)
        idx += 1
except EOFError:
    pass

if frames:
    frames[0].save(
        dst_path,
        format='WEBP',
        save_all=True,
        append_images=frames[1:],
        duration=83,
        loop=0,
        quality=82,
        method=6, 
        lossless=False,
        minimize_size=True
    )

print(f"Size: {os.path.getsize(dst_path) / 1024:.2f} KB")
