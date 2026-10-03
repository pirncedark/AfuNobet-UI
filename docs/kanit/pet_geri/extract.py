from pathlib import Path
import brotli, json, hashlib, subprocess

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
exe = root / 'dist/onceki/afunobet-ui-coucou-20261002-233831.exe'
data = exe.read_bytes()
found = []
# Tauri's release assets use Brotli with a 22-bit window (header 0x1b).
for offset, byte in enumerate(data):
    if byte != 0x1b:
        continue
    decoder = brotli.Decompressor()
    chunks = []
    try:
        for pos in range(offset, min(offset + 2000000, len(data)), 256):
            try:
                chunk = decoder.process(data[pos:pos+256])
            except brotli.error:
                # Brotli rejects trailing bytes from the next native asset.
                decoder = brotli.Decompressor()
                decoder.process(data[offset:pos])
                tail = []
                for end in range(pos, pos+256):
                    tail.append(decoder.process(data[end:end+1]))
                    if decoder.is_finished():
                        break
                chunk = b''.join(tail)
            chunks.append(chunk)
            if sum(map(len, chunks)) > 3000000:
                break
            if decoder.is_finished():
                break
        raw = b''.join(chunks)
        if b'pet-image' in raw and (b'afu-pet' in raw):
            name = 'reference.js' if b'idle_normal' in raw else 'reference.css'
            (out / name).write_bytes(raw)
            found.append({'offset':offset, 'bytes':len(raw), 'file':name})
            print(found[-1], flush=True)
    except brotli.error:
        pass
(out/'reference-extraction.json').write_text(json.dumps({'exe_sha256':hashlib.sha256(data).hexdigest(), 'assets':found}, indent=2))
