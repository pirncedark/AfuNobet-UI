"""Read-only alpha-union measurements; studio transforms use a bottom-aligned square.

olcek is a multiplier; x/y are fractions of the display square (256px on stage).
The reference height/centre come from idle_normal; its feet are placed on the bar.
kutu is the measured alpha box (left, top, right, bottom) of that one image; the
stage uses it to keep the pet inside its frame.
"""
import argparse
import csv
import json
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/kanit/boyut_esitle'


def log(kind, message):
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    with (EVIDENCE / 'log.txt').open('a', encoding='utf-8') as stream:
        stream.write(f'{datetime.now().astimezone().isoformat(timespec="seconds")} {kind} {message}\n')


def measure(path):
    if not Path(path).is_file():
        return None
    with Image.open(path) as image:
        width, height = image.size
        union = None
        count = 0
        for frame in ImageSequence.Iterator(image):
            count += 1
            bounds = frame.convert('RGBA').getchannel('A').getbbox()
            if bounds:
                union = list(bounds) if union is None else [min(union[0], bounds[0]), min(union[1], bounds[1]), max(union[2], bounds[2]), max(union[3], bounds[3])]
    left, top, right, bottom = union or [0, 0, 0, 0]
    edge = max(width, height)
    return {'tuval_genislik': width, 'tuval_boy': height, 'bbox': union,
            'kare_sayisi': count, 'boy_orani': (bottom-top)/height,
            'en_orani': (right-left)/width, 'alt_bosluk_orani': (height-bottom)/height,
            'yatay_merkez_orani': (left+right)/2/width,
            'boy': (bottom-top)/edge, 'en': (right-left)/edge,
            'ayak': 1-(height-bottom)/edge,
            'merkez': .5+((left+right)/2-width/2)/edge}

def sinir_kutu(item):
    """Alfa sınır kutusu: tuval biriminde sol, üst, sağ, alt.

    Ölçüm tek başına yeterlidir; kutu her kareye ayrı ayrı geçerlidir.
    Dosya yoksa veya tamamen saydam ise tüm çerçeve sayılır (pet.ts varsayılanı).
    """
    if not item or not item['boy']:
        return [0, 0, 1, 1]
    bottom = item['ayak']
    return [item['merkez']-item['en']/2, bottom-item['boy'], item['merkez']+item['en']/2, bottom]

def normalization(item, reference):
    if not item or not reference or not item['boy'] or not reference['boy']:
        return {'olcek': 1, 'x': 0, 'y': 0}
    scale = reference['boy']/item['boy']
    return {'olcek': scale, 'x': reference['merkez']-(.5+(item['merkez']-.5)*scale),
            'y': (1-item['ayak'])*scale}

def generate(assets):
    measurements = {}
    for folder in ('pet', 'durum'):
        for path in sorted((Path(assets)/folder).glob('*.webp')):
            if '.yedek' in path.name:
                continue
            key = ('durum/' if folder == 'durum' else '')+path.stem
            measurements[key] = measure(path)
    reference = measurements.get('idle_normal')
    if not reference or not reference['boy']:
        raise ValueError('Referans idle_normal görseli eksik veya saydam.')
    # Kutu ölçümü, normalizasyon dönüşümünden bağımsızdır; ikisi tabloya birlikte yazılır.
    return {key: {**normalization(item, reference), 'kutu': sinir_kutu(item)} for key, item in measurements.items()}, measurements


def write_outputs(table, measurements, output, csv_path):
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    Path(output).write_text(json.dumps(table, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    Path(csv_path).parent.mkdir(parents=True, exist_ok=True)
    fields = ['dosya', *next(iter(measurements.values())).keys(), 'olcek', 'x', 'y', 'kutu']
    with Path(csv_path).open('w', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for key, item in measurements.items():
            writer.writerow({'dosya': key, **item, **table[key]})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gorseller', type=Path, default=ROOT/'windows/public/afu')
    parser.add_argument('--tablo', type=Path, default=ROOT/'studyo/boyut_tablosu.json')
    parser.add_argument('--csv', type=Path, default=EVIDENCE/'olcum.csv')
    args = parser.parse_args()
    try:
        table, measurements = generate(args.gorseller)
        write_outputs(table, measurements, args.tablo, args.csv)
        log('ADIM', f'{len(table)} görselin tüm kareleri ölçüldü; tablo ve CSV yazıldı.')
        print(f'{len(table)} görsel ölçüldü.')
    except Exception as exc:
        log('HATA', str(exc))
        raise


if __name__ == '__main__':
    main()
