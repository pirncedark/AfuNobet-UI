import os
from PIL import Image

src_dir = 'C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/afu-character/video/durumlar'
dst_dir = 'C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows/public/afu/durum'

os.makedirs(dst_dir, exist_ok=True)

for f in os.listdir(dst_dir):
    if f.endswith('.webp'):
        os.remove(os.path.join(dst_dir, f))

files = [f for f in os.listdir(src_dir) if f.endswith('.webp')]
for f in files:
    src_path = os.path.join(src_dir, f)
    dst_path = os.path.join(dst_dir, f)
    
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
            method=2, 
            lossless=False
        )
    print(f"Processed {f}")

total_size = sum(os.path.getsize(os.path.join(dst_dir, f)) for f in os.listdir(dst_dir) if f.endswith('.webp'))
print(f"Total size: {total_size / (1024*1024):.2f} MB")
