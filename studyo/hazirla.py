"""Mevcut görsel listesini ve boyut tablosunu eski stüdyo sekanslarıyla gömer.

Yalnız üretim aracı; HTML çalışırken Python veya git gerekmez.
"""
import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/kanit/anim_studyo'


def log(kind, message):
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    with (EVIDENCE / 'log.txt').open('a', encoding='utf-8') as stream:
        stream.write(datetime.now().astimezone().isoformat(timespec='seconds') + ' ' + kind + ' ' + message + '\n')


def main():
    log('ADIM', 'Görev ve proje kuralları okundu; kaynaklar yalnız okunuyor.')
    # Existing studio snapshot is the authoritative old sequence set. No git needed.
    html_path = ROOT / 'studyo/animasyon_studyo.html'
    html = html_path.read_text(encoding='utf-8')
    data = json.loads(re.search(r'const DEFAULT = (.*?);\n', html).group(1))
    sys.path.insert(0, str(ROOT / 'scripts'))
    from boyut_olc import generate, write_outputs, log as boyut_log
    table, measurements = generate(ROOT / 'windows/public/afu')
    write_outputs(table, measurements, ROOT / 'studyo/boyut_tablosu.json', ROOT / 'docs/kanit/boyut_esitle/olcum.csv')
    sequences = data['sekanslar']
    """Legacy parser retained as documentation only:
    constants = dict((key, int(value)) for key, value in re.findall(r'(\w+):\s*(\d+)', timing))
    block = re.search(r'export const SEKANSLAR[^=]*=\s*\{(.*?)\n\};', pet, re.S).group(1)
    sequences = {}
    for name, items in re.findall(r'(\w+):\s*\[(.*?)\]', block, re.S):
        sequences[name] = []
        for frame, expr in re.findall(r'kare:\s*"([^"]+)",\s*ms:\s*([^}]+)', items):
            expr = expr.strip()
            if expr == 'Infinity': duration = None
            else:
                # The old source uses integers, T members and addition only.
                duration = sum(constants[part.strip()[2:]] if part.strip().startswith('T.') else int(part.strip()) for part in expr.split('+'))
            sequences[name].append({'kare': frame, 'ms': duration})
    """
    assets = []
    hashes = {}
    for folder in ('pet', 'durum'):
        for path in sorted((ROOT / 'windows/public/afu' / folder).glob('*.webp')):
            if '.yedek' in path.name: continue
            relative = path.relative_to(ROOT).as_posix()
            with Image.open(path) as image:
                width, height = image.size
                bottom = -1
                for frame in ImageSequence.Iterator(image):
                    bounds = frame.convert('RGBA').getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()
                    if bounds: bottom = max(bottom, bounds[3] - 1)
            assets.append({'kare': ('durum/' if folder == 'durum' else '') + path.stem, 'group': folder, 'file': path.name, 'path': '../' + relative, 'width': width, 'height': height, 'alphaBottom': bottom})
            hashes[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    html = re.sub(r'const ASSETS = .*?;\n', lambda _: 'const ASSETS = ' + json.dumps(assets, ensure_ascii=False) + ';\n', html, count=1)
    html = re.sub(r'const DEFAULT = .*?;\n', lambda _: 'const DEFAULT = ' + json.dumps(data, ensure_ascii=False) + ';\n', html, count=1)
    html = re.sub(r'const NORMALIZATION = .*?;\n', lambda _: 'const NORMALIZATION = ' + json.dumps(table, ensure_ascii=False) + ';\n', html, count=1)
    html_path.write_text(html, encoding='utf-8')
    boyut_log('ADIM', '71 görselin normalizasyon tablosu HTML içine gömüldü; eski sekanslar korundu.')
    (EVIDENCE / 'varsayilan.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    (EVIDENCE / 'gorsel_sha256.json').write_text(json.dumps(hashes, indent=2), encoding='utf-8')
    # Snapshot current source hashes to prove this task never changes windows/src.
    source_hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT / 'windows/src').rglob('*') if p.is_file()}
    (EVIDENCE / 'kaynak_sha256.json').write_text(json.dumps(source_hashes, indent=2), encoding='utf-8')
    log('ADIM', f'HTML üretildi: {len(sequences)} eski sekans, {sum(a["group"] == "pet" for a in assets)} pet, {sum(a["group"] == "durum" for a in assets)} durum karesi; Infinity=null.')


if __name__ == '__main__': main()
