"""Afu stüdyo JSON'unu uygular. Varsayılan: yalnız fark; yazmak için --yaz.

ms=null eski Infinity süresini kayıpsız temsil eder. Kare adları pet için
uzantısız, durum için durum/ad biçimindedir. Bu betik eski pet kaynağına
yöneliktir; tanınmayan kaynakta hiçbir şey yazmaz.
"""
import argparse
import difflib
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAMES = re.compile(r'^[A-Za-z_][A-Za-z0-9_]{0,63}$')
RESERVED = {'__proto__', 'constructor', 'prototype'}
SEQ = re.compile(r'export const SEKANSLAR[^=]*=\s*\{.*?\n\};', re.S)
SETTINGS = re.compile(r'\n?// STÜDYO AYAR BAŞLANGIÇ.*?// STÜDYO AYAR SON\n', re.S)
HIZ_ARALIK = (0.25, 2)
BEKLEME_ARALIK = (0, 60000)


def number(value, low, high):
    return type(value) in (int, float) and math.isfinite(value) and low <= value <= high


def sinir_kutusu_gecerli(box):
    # Ölçülen alfa kutusu isteğe bağlıdır (pet.ts çerçeveye sığdırmada kullanır);
    # varsa sol/üst/sağ/alt sırası ve sınırları doğrulanır.
    return (isinstance(box, list) and len(box) == 4
            and all(number(value, -1000, 1000) for value in box)
            and box[0] <= box[2] and box[1] <= box[3])


def validate(data, known):
    if not isinstance(data, dict) or type(data.get('surum')) is not int or data['surum'] != 1:
        raise ValueError('Dosya sürümü geçersiz.')
    sequences, settings = data.get('sekanslar'), data.get('ayar')
    effects = data.get('efektler')
    if 'normalize' in data and type(data['normalize']) is not bool:
        raise ValueError('Normalizasyon boolean olmalı.')
    if 'normalizeSekanslar' in data:
        selected = data['normalizeSekanslar']
        if not data.get('normalize') or not isinstance(selected, list) or any(not isinstance(n, str) or n not in (sequences or {}) for n in selected) or len(set(selected)) != len(selected):
            raise ValueError('Normalizasyon sekansları geçersiz.')
    if not isinstance(sequences, dict) or not 1 <= len(sequences) <= 100 or not isinstance(settings, dict) or set(settings) != set(sequences):
        raise ValueError('Sekanslar ve ayarlar eşleşmiyor.')
    if 'tutma' in data:
        if not isinstance(data['tutma'], dict) or set(data['tutma']) != {'guc'} or not number(data['tutma']['guc'], 0, 100):
            raise ValueError('Tutma ayarı geçersiz.')
    else:
        data['tutma'] = {'guc': 50}
    playback = data.get('oynatma')
    if playback is not None:
        # Animasyon başına hız (0,25–2) ve döngü arası bekleme (ms); eksikse
        # uygulama hız 1 / bekleme 0 varsayılanını kendisi yazar.
        if not isinstance(playback, dict) or set(playback) != set(sequences):
            raise ValueError('Oynatma ayarları ve sekanslar eşleşmiyor.')
        for name, config in playback.items():
            if (not isinstance(config, dict) or set(config) != {'hiz', 'donguArasi'}
                    or not number(config['hiz'], *HIZ_ARALIK) or not number(config['donguArasi'], *BEKLEME_ARALIK)):
                raise ValueError('Oynatma değerleri geçersiz: ' + name)
    if effects is not None:
        if not isinstance(effects, dict) or set(effects) != set(sequences):
            raise ValueError('Efektler ve sekanslar eşleşmiyor.')
        valid_effects = {'nefes', 'ziplama', 'sallanma', 'yumusak_gecis', 'golge', 'parilti', 'kivilcim', 'goz_kirpma'}
        for name, config in effects.items():
            if not isinstance(config, dict) or not set(config).issubset(valid_effects):
                raise ValueError('Efekt isimleri geçersiz.')
            for effect_name, effect_val in config.items():
                if not isinstance(effect_val, dict) or 'acik' not in effect_val or 'guc' not in effect_val or type(effect_val['acik']) is not bool or not number(effect_val['guc'], 0, 100):
                    raise ValueError('Efekt değerleri geçersiz.')
                allowed_keys = {'acik', 'guc', 'renk'} if effect_name == 'parilti' else {'acik', 'guc'}
                if set(effect_val) - allowed_keys:
                    raise ValueError('Efekt değerleri geçersiz.')
                if effect_name == 'parilti' and 'renk' in effect_val and not (isinstance(effect_val['renk'], str) and re.fullmatch(r'^#[0-9a-fA-F]{6}$', effect_val['renk'])):
                    if not (isinstance(effect_val['renk'], str) and effect_val['renk'] == 'gold'):
                        raise ValueError('Parıltı rengi geçersiz.')
    for name, frames in sequences.items():
        if not NAMES.fullmatch(name) or name in RESERVED:
            raise ValueError('Sekans adı geçersiz: ' + name)
        if not isinstance(frames, list) or not 1 <= len(frames) <= 1000:
            raise ValueError('Her sekans en az bir kare içermeli.')
        for frame in frames:
            if not isinstance(frame, dict) or set(frame) != {'kare', 'ms'} or not isinstance(frame['kare'], str) or frame['kare'] not in known:
                raise ValueError('Bilinmeyen kare adı veya geçersiz kare.')
            if frame['ms'] is not None and not number(frame['ms'], 1, 600000):
                raise ValueError('Kare süresi 1–600000 ms veya null olmalı.')
        config = settings[name]
        if not isinstance(config, dict) or set(config) != {'olcek', 'x', 'y'} or not number(config['olcek'], 25, 200) or not number(config['x'], -400, 400) or not number(config['y'], -400, 400):
            raise ValueError('Boyut veya konum ayarı geçersiz.')
    return data


def transform(source, data, known, table=None):
    validate(data, known)
    if not SEQ.search(source) or not re.search(r'export type PetPose\s*=.*?;', source, re.S) or 'this.el.dataset.pose = this.model.pose;' not in source:
        raise ValueError('Pet kaynağı tanınmadı; dosya değiştirilmedi.')
    if '/afu/pet/${next}.webp' not in source and 'studyoKareYolu(next)' not in source:
        raise ValueError('Eski pet çizim kodu bulunamadı; önce eski pet kaynağını kullan.')
    # PetModel and paint require these poses, including any newer source pose references.
    required = set(re.findall(r'(?:setPose\(|pose\s*===\s*|pose\s*=\s*)[\"\']([A-Za-z_]+)', source))
    # Ternary expressions and includes() also reference built-in poses. Keep
    # the original union intact; custom poses may be added without removing it.
    original_union = re.search(r'export type PetPose\s*=(.*?);', source, re.S).group(1)
    required.update(re.findall(r'[\"\']([A-Za-z_][A-Za-z0-9_]*)[\"\']', original_union))
    if not required <= set(data['sekanslar']):
        raise ValueError('Uygulamanın gerekli sekansları eksik: ' + ', '.join(sorted(required - set(data['sekanslar']))))
    names = ' | '.join(json.dumps(name) for name in data['sekanslar'])
    source = re.sub(r'export type PetPose\s*=.*?;', lambda _: 'export type PetPose = ' + names + ';', source, count=1, flags=re.S)
    rows = []
    for name, frames in data['sekanslar'].items():
        items = ', '.join('{ kare: ' + json.dumps(f['kare']) + ', ms: ' + ('Infinity' if f['ms'] is None else json.dumps(f['ms'])) + ' }' for f in frames)
        rows.append('  ' + json.dumps(name) + ': [' + items + '],')
    block = 'export const SEKANSLAR: Record<PetPose, { kare: string; ms: number }[]> = {\n' + '\n'.join(rows) + '\n};'
    source = SEQ.sub(lambda _: block, source, count=1)
    source = SETTINGS.sub('', source)
    config = '// STÜDYO AYAR BAŞLANGIÇ\nexport const PET_AYAR: Record<PetPose, { olcek: number; x: number; y: number }> = ' + json.dumps(data['ayar'], ensure_ascii=False, indent=2) + ';\n'
    playback = data.get('oynatma') or {name: {'hiz': 1, 'donguArasi': 0} for name in data['sekanslar']}
    config += 'export const PET_OYNATMA: Record<PetPose, { hiz: number; donguArasi: number }> = ' + json.dumps(playback, ensure_ascii=False, indent=2) + ';\n'
    if 'tutma' in data:
        config += 'export const PET_TUTMA = ' + json.dumps(data['tutma'], ensure_ascii=False) + ';\n'
    config += 'function studyoKareYolu(kare: string) { return kare.startsWith("durum/") ? `/afu/durum/${kare.slice(6)}.webp` : `/afu/pet/${kare}.webp`; }\n// STÜDYO AYAR SON\n'
    if data.get('normalize'):
        if table is None:
            table_path = ROOT / 'studyo/boyut_tablosu.json'
            table = json.loads(table_path.read_text(encoding='utf-8')) if table_path.exists() else {}
        if not isinstance(table, dict) or any(not isinstance(item, dict) or not {'olcek', 'x', 'y'} <= set(item) or set(item) - {'olcek', 'x', 'y', 'kutu'} or not number(item['olcek'], .001, 1000) or not number(item['x'], -1000, 1000) or not number(item['y'], -1000, 1000) or ('kutu' in item and not sinir_kutusu_gecerli(item['kutu'])) for item in table.values()):
            raise ValueError('Normalizasyon tablosu geçersiz.')
        enabled = data.get('normalizeSekanslar', list(data['sekanslar']))
        extra = 'export const PET_NORMALIZE: string[] = ' + json.dumps(enabled) + ';\n'
        extra += 'export const PET_BOYUT: Record<string, { olcek: number; x: number; y: number; kutu?: [number, number, number, number] }> = ' + json.dumps(table) + ';\n'
        config = config.replace('// STÜDYO AYAR SON', extra + '// STÜDYO AYAR SON')
    match = SEQ.search(source)
    source = source[:match.end()] + '\n' + config + source[match.end():]
    source = source.replace('`/afu/pet/${next}.webp`', 'studyoKareYolu(next)').replace('`/afu/pet/${frame}.webp`', 'studyoKareYolu(frame)')
    start, end = '// STÜDYO ÇİZİM BAŞLANGIÇ', '// STÜDYO ÇİZİM SON'
    source = re.sub(r'\n\s*' + start + r'.*?' + end, '', source, flags=re.S)
    anchor = 'this.el.dataset.pose = this.model.pose;'
    paint = '\n    ' + start + '\n    const ayar = PET_AYAR[this.model.pose];\n    for (const image of [this.image, this.previous]) { image.style.transformOrigin = "50% 100%"; image.style.translate = `${ayar.x}px ${ayar.y}px`; image.style.scale = String(ayar.olcek / 100); }\n    ' + end
    if data.get('normalize'):
        paint = '\n    ' + start + '''
    const ayar = PET_AYAR[this.model.pose];
    for (const image of [this.image, this.previous]) {
      const kare = image === this.image ? next : (this.image.getAttribute("src") || "").replace(/^.*\\/afu\\/(pet\\/|durum\\/)/, (_, folder) => folder === "durum/" ? "durum/" : "").replace(/\\.webp$/, "");
      const n = PET_NORMALIZE.includes(this.model.pose) ? (PET_BOYUT[kare] || { olcek: 1, x: 0, y: 0 }) : { olcek: 1, x: 0, y: 0 };
      image.style.transformOrigin = "50% 100%";
      image.style.translate = `${ayar.x + n.x * 256 * ayar.olcek / 100}px ${ayar.y + n.y * 256 * ayar.olcek / 100}px`;
      image.style.scale = String(n.olcek * ayar.olcek / 100);
    }
    ''' + end
    return source.replace(anchor, anchor + paint, 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('json', nargs='?', type=Path, default=Path('afu_animasyon.json'))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--dene', action='store_true', help='Yalnız fark göster (varsayılan)')
    mode.add_argument('--yaz', action='store_true', help='Doğrulamadan sonra hedefe yaz')
    parser.add_argument('--hedef', type=Path, default=ROOT / 'windows/src/afu/pet.ts')
    parser.add_argument('--gorseller', type=Path, default=ROOT / 'windows/public/afu')
    args = parser.parse_args()
    try:
        known = {('durum/' if folder == 'durum' else '') + p.stem for folder in ('pet', 'durum') for p in (args.gorseller / folder).glob('*.webp') if '.yedek' not in p.name}
        source = args.hedef.read_text(encoding='utf-8')
        data = json.loads(args.json.read_text(encoding='utf-8-sig'))
        updated = transform(source, data, known)
        sys.stdout.writelines(difflib.unified_diff(source.splitlines(True), updated.splitlines(True), fromfile=str(args.hedef), tofile=str(args.hedef) + ' (stüdyo)'))
        if args.yaz:
            # All checks finish before the first write. Replace atomically in the same folder.
            temporary = args.hedef.with_name(args.hedef.name + '.studyo-tmp')
            try:
                temporary.write_text(updated, encoding='utf-8', newline='\n')
                temporary.replace(args.hedef)
            finally:
                temporary.unlink(missing_ok=True)
        return 0
    except (OSError, ValueError, TypeError) as exc:
        print('HATA: ' + str(exc), file=sys.stderr)
        return 1


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'): sys.stderr.reconfigure(encoding='utf-8')
    raise SystemExit(main())
