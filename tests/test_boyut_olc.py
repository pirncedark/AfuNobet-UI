import importlib.util
import json
from pathlib import Path

import pytest
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def api():
    path = ROOT / 'scripts/boyut_olc.py'
    assert path.exists(), 'Alfa ölçüm aracı eksik'
    spec = importlib.util.spec_from_file_location('boyut_olc', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def picture(path, size, box):
    # Nonzero RGB under transparent pixels prevents libwebp's black-background
    # animation optimization from dropping alpha in this synthetic fixture.
    image = Image.new('RGBA', size, (255, 0, 0, 0))
    ImageDraw.Draw(image).rectangle(box, fill=(40, 160, 240, 255))
    image.save(path, lossless=True)
    return image


def test_generation_and_screen_transform(tmp_path):
    m = api()
    (tmp_path / 'pet').mkdir()
    (tmp_path / 'durum').mkdir()
    picture(tmp_path / 'pet/idle_normal.webp', (100, 80), (30, 10, 69, 69))
    picture(tmp_path / 'durum/new.webp', (200, 100), (80, 20, 119, 59))
    table, measurements = m.generate(tmp_path)
    assert table['durum/new']['olcek'] == pytest.approx(3)
    ref = measurements['idle_normal']
    item = measurements['durum/new']
    config = table['durum/new']
    assert item['boy'] * config['olcek'] == pytest.approx(ref['boy'])
    assert 1 + (item['ayak'] - 1) * config['olcek'] + config['y'] == pytest.approx(1)
    assert .5 + (item['merkez'] - .5) * config['olcek'] + config['x'] == pytest.approx(ref['merkez'])
    m.write_outputs(table, measurements, tmp_path / 'table.json', tmp_path / 'measure.csv')
    assert json.loads((tmp_path / 'table.json').read_text()) == table
    assert 'durum/new' in (tmp_path / 'measure.csv').read_text()


def test_all_animation_frames_union(tmp_path):
    m = api()
    first = picture(tmp_path / 'first.webp', (100, 100), (10, 10, 29, 39))
    second = picture(tmp_path / 'second.webp', (100, 100), (50, 50, 79, 89))
    target = tmp_path / 'animated.webp'
    first.save(target, save_all=True, append_images=[second], duration=100, lossless=True, exact=True)
    result = m.measure(target)
    assert result['bbox'] == [10, 10, 80, 90]
    assert result['kare_sayisi'] == 2


def test_missing_and_transparent_safe_default(tmp_path):
    m = api()
    assert m.normalization(None, None) == {'olcek': 1, 'x': 0, 'y': 0}
    assert m.measure(tmp_path / 'missing.webp') is None
    Image.new('RGBA', (100, 100)).save(tmp_path / 'empty.webp', lossless=True)
    result = m.measure(tmp_path / 'empty.webp')
    assert m.normalization(result, result) == {'olcek': 1, 'x': 0, 'y': 0}
