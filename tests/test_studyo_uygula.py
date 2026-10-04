import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'studyo/uygula.py'


@pytest.fixture
def api():
    assert SCRIPT.exists(), 'Uygulama betiği henüz yok'
    spec = importlib.util.spec_from_file_location('studyo_uygula', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SOURCE = '''export type PetPose = "bekleme";
export const SEKANSLAR: Record<PetPose, { kare: string; ms: number }[]> = {
  bekleme: [{ kare: "idle_normal", ms: 10 }],
};
export class AfuPet {
  private paint() {
    const next = this.model.frame;
    this.el.dataset.pose = this.model.pose;
    this.image.src = `/afu/pet/${next}.webp`;
  }
}
'''


def data():
    return {'surum': 1, 'sekanslar': {'bekleme': [{'kare': 'idle_normal', 'ms': None}],
                                   'deneme': [{'kare': 'durum/basari', 'ms': 500}]},
            'ayar': {'bekleme': {'olcek': 100, 'x': 0, 'y': 0},
                     'deneme': {'olcek': 120, 'x': 12, 'y': -8}}}


def test_transform_updates_sequences_settings_and_paths(api):
    result = api.transform(SOURCE, data(), {'idle_normal', 'durum/basari'})
    assert 'ms: Infinity' in result
    assert '"deneme"' in result
    assert 'PET_AYAR' in result and '"olcek": 120' in result
    assert '/afu/durum/' in result
    assert 'const next = this.model.frame;' in result
    assert api.transform(result, data(), {'idle_normal', 'durum/basari'}) == result


@pytest.mark.parametrize('mutation', ['unknown', 'negative', 'nan', 'missing', 'name', 'bool', 'empty'])
def test_rejects_invalid_json_before_transform(api, mutation):
    value = data()
    if mutation == 'unknown': value['sekanslar']['deneme'][0]['kare'] = '../evil'
    if mutation == 'negative': value['sekanslar']['deneme'][0]['ms'] = -1
    if mutation == 'nan': value['ayar']['deneme']['x'] = float('nan')
    if mutation == 'missing': del value['ayar']['deneme']
    if mutation == 'name': value['sekanslar']['__proto__'] = value['sekanslar'].pop('deneme')
    if mutation == 'bool': value['sekanslar']['deneme'][0]['ms'] = True
    if mutation == 'empty': value['sekanslar']['deneme'] = []
    with pytest.raises(ValueError): api.transform(SOURCE, value, {'idle_normal', 'durum/basari'})


def test_unrecognized_source_fails_closed(api):
    with pytest.raises(ValueError): api.transform('const other = 1;', data(), {'idle_normal', 'durum/basari'})


def test_required_runtime_pose_cannot_be_removed(api):
    source = SOURCE.replace('const next = this.model.frame;', 'const next = this.model.frame; this.model.setPose("bekleme");')
    value = data()
    del value['sekanslar']['bekleme']
    del value['ayar']['bekleme']
    with pytest.raises(ValueError, match='gerekli sekansları'):
        api.transform(source, value, {'idle_normal', 'durum/basari'})


def test_cannot_remove_pose_used_in_ternary(api):
    source = SOURCE.replace('"bekleme";', '"bekleme" | "donus";')
    source += '\nfunction transition(reverse: boolean) { model.setPose(reverse ? "donus" : "bekleme"); }'
    with pytest.raises(ValueError, match='donus'):
        api.transform(source, data(), {'idle_normal', 'durum/basari'})


def test_transform_scale_anchor_matches_old_pet_css(api):
    result = api.transform(SOURCE, data(), {'idle_normal', 'durum/basari'})
    assert 'transformOrigin = "50% 100%"' in result


def test_normalize_preserved_in_future_application_output(api):
    value = data()
    value['normalize'] = True
    value['normalizeSekanslar'] = ['deneme']
    result = api.transform(SOURCE, value, {'idle_normal', 'durum/basari'})
    assert 'PET_NORMALIZE' in result
    assert 'PET_BOYUT' in result
    assert 'n.olcek * ayar.olcek / 100' in result
    assert api.transform(result, value, {'idle_normal', 'durum/basari'}) == result


@pytest.mark.parametrize('flag', ['true', 1, None, {}])
def test_normalize_requires_boolean(api, flag):
    value = data()
    value['normalize'] = flag
    with pytest.raises(ValueError, match='normalizasyon|Normalizasyon'):
        api.validate(value, {'idle_normal', 'durum/basari'})


@pytest.mark.parametrize('enabled', [None, 'deneme', ['missing'], ['deneme', 'deneme'], [True]])
def test_normalization_sequence_scope_is_validated(api, enabled):
    value = data()
    value.update(normalize=True, normalizeSekanslar=enabled)
    with pytest.raises(ValueError, match='Normalizasyon'):
        api.validate(value, {'idle_normal', 'durum/basari'})


def test_generated_normalization_composes_user_settings_and_previous_frame(api):
    import re
    value = data()
    value.update(normalize=True, normalizeSekanslar=['deneme'])
    table = {'idle_normal': {'olcek': 1, 'x': 0, 'y': .1},
             'durum/basari': {'olcek': .5, 'x': .03, 'y': .02}}
    result = api.transform(SOURCE, value, {'idle_normal', 'durum/basari'}, table=table)
    paint = re.search('// STÜDYO ÇİZİM BAŞLANGIÇ(.*?)// STÜDYO ÇİZİM SON', result, re.S).group(1)
    setup = 'const PET_AYAR='+json.dumps(value['ayar'])+';const PET_NORMALIZE=["deneme"];const PET_BOYUT='+json.dumps(table)+';'
    program = setup + '''
const assert=require('node:assert/strict');
const current={style:{},getAttribute:()=>'/afu/pet/idle_normal.webp'};
const previous={style:{},getAttribute:()=>'/afu/durum/basari.webp'};
const owner={model:{pose:'deneme'},image:current,previous};
''' + 'new Function("next","PET_AYAR","PET_NORMALIZE","PET_BOYUT",'+json.dumps(paint)+').call(owner,"durum/basari",PET_AYAR,PET_NORMALIZE,PET_BOYUT);' + '''
assert.equal(Number(current.style.scale),.6);
assert.equal(Number(previous.style.scale),1.2);
const positions=current.style.translate.split(' ').map(parseFloat);
assert.ok(Math.abs(positions[0]-21.216)<1e-6);
assert.ok(Math.abs(positions[1]+1.856)<1e-6);
'''
    run = subprocess.run(['node', '-e', program], capture_output=True, stdin=subprocess.DEVNULL)
    assert run.returncode == 0, run.stderr.decode()


def oynatma_verisi():
    value = data()
    value['oynatma'] = {'bekleme': {'hiz': 0.5, 'donguArasi': 3500},
                        'deneme': {'hiz': 1, 'donguArasi': 0}}
    return value


def test_playback_is_written_next_to_pet_ayar(api):
    result = api.transform(SOURCE, oynatma_verisi(), {'idle_normal', 'durum/basari'})
    assert 'PET_AYAR' in result and 'PET_OYNATMA' in result
    assert '"hiz": 0.5' in result and '"donguArasi": 3500' in result
    # tekrar uygulama aynı sonucu verir (idempotent)
    assert api.transform(result, oynatma_verisi(), {'idle_normal', 'durum/basari'}) == result


def test_missing_playback_defaults_to_speed_one_and_no_wait(api):
    result = api.transform(SOURCE, data(), {'idle_normal', 'durum/basari'})
    assert 'PET_OYNATMA' in result
    assert json.loads(re.search(r'PET_OYNATMA[^=]*= (.*?);\n', result, re.S).group(1)) == {
        'bekleme': {'hiz': 1, 'donguArasi': 0}, 'deneme': {'hiz': 1, 'donguArasi': 0}}
    assert api.transform(result, data(), {'idle_normal', 'durum/basari'}) == result

@pytest.mark.parametrize('mutation', ['negative', 'high', 'nan', 'bool', 'string', 'missing',
                                      'extra', 'not_object', 'array'])
def test_invalid_tutma_is_rejected_before_transform(api, mutation):
    value = data()
    tutma = {'guc': 60}
    if mutation == 'negative': tutma['guc'] = -1
    if mutation == 'high': tutma['guc'] = 101
    if mutation == 'nan': tutma['guc'] = float('nan')
    if mutation == 'bool': tutma['guc'] = True
    if mutation == 'string': tutma['guc'] = '60'
    if mutation == 'missing': tutma.pop('guc')
    if mutation == 'extra': tutma['hiz'] = 1
    if mutation == 'not_object': tutma = 60
    if mutation == 'array': tutma = [60]
    value['tutma'] = tutma
    with pytest.raises(ValueError, match='utma|Tutma'):
        api.transform(SOURCE, value, {'idle_normal', 'durum/basari'})


def test_cli_default_dry_run_and_explicit_write(tmp_path, api):
    # Alt süreç stdin'i devralmaz: pytest pencere arkasından (pythonw) koşarken
    # üst sürecin stdin tutamağı geçersizdir ve devralma WinError 6 verir.
    bos = {'stdin': subprocess.DEVNULL}
    assets = tmp_path / 'assets'
    (assets / 'pet').mkdir(parents=True)
    (assets / 'durum').mkdir()
    (assets / 'pet/idle_normal.webp').touch()
    (assets / 'durum/basari.webp').touch()
    target = tmp_path / 'pet.ts'
    target.write_text(SOURCE, encoding='utf-8')
    payload = tmp_path / 'afu_animasyon.json'
    payload.write_text(json.dumps(data()), encoding='utf-8')
    args = [sys.executable, str(SCRIPT), str(payload), '--hedef', str(target), '--gorseller', str(assets)]
    run = subprocess.run(args, capture_output=True, **bos)
    assert run.returncode == 0, run.stderr
    assert target.read_text(encoding='utf-8') == SOURCE
    assert b'PET_AYAR' in run.stdout
    assert subprocess.run(args + ['--yaz'], capture_output=True, **bos).returncode == 0
    updated = target.read_bytes()
    invalid = data()
    invalid['sekanslar']['deneme'][0]['kare'] = 'yok'
    payload.write_text(json.dumps(invalid), encoding='utf-8')
    assert subprocess.run(args + ['--yaz'], capture_output=True, **bos).returncode != 0
    assert target.read_bytes() == updated
