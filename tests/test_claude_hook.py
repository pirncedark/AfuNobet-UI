import importlib.util
import io
import json
import os
import time
from pathlib import Path

import pytest

PATH = Path(__file__).resolve().parents[1] / 'scripts/claude_kopru/afu_hook.py'
spec = importlib.util.spec_from_file_location('afu_hook', PATH)
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)


class Clock:
    def __init__(self):
        self.value = time.time()
        self.on_sleep = None
    def now(self):
        return self.value
    def sleep(self, seconds):
        self.value += seconds
        if self.on_sleep:
            self.on_sleep()


@pytest.fixture
def setup(tmp_path):
    clock = Clock()
    heartbeat = tmp_path / 'ada_canli'
    heartbeat.touch()
    os.utime(heartbeat, (clock.value, clock.value))
    return tmp_path, clock


def run(root, clock, event):
    out = io.StringIO()
    assert hook.main(io.StringIO(json.dumps(event)), out, root=root,
                     wall_clock=clock.now, monotonic=clock.now, sleep=clock.sleep) == 0
    return out.getvalue()


def question():
    return {'hook_event_name': 'PreToolUse', 'tool_name': 'AskUserQuestion',
            'tool_input': {'questions': [{'question': 'Hangisi?', 'options': [{'label': 'Bir'}]}, {'question': 'Ignored'}]}}


def test_notification_and_mask(setup):
    root, clock = setup
    assert run(root, clock, {'hook_event_name': 'Notification', 'message': 'token=private'}) == ''
    message = json.loads(next((root / 'mesajlar').glob('*.json')).read_text('utf-8'))
    assert message['tur'] == 'bilgi'
    assert message['metin'] == 'token=•••'


def test_stop_last_assistant(setup):
    root, clock = setup
    transcript = root / 'transcript.jsonl'
    rows = [{'type': 'assistant', 'message': {'content': [{'type': 'text', 'text': 'Old.'}]}},
            {'type': 'assistant', 'message': {'content': [{'type': 'text', 'text': '**Done**. ```python\nsecret\n``` Second! Third.'}]}},
            {'type': 'user', 'message': {'content': 'User'}}]
    transcript.write_text('\n'.join(json.dumps(r) for r in rows), encoding='utf-8')
    run(root, clock, {'hook_event_name': 'Stop', 'transcript_path': str(transcript)})
    message = json.loads(next((root / 'mesajlar').glob('*.json')).read_text('utf-8'))
    assert message['metin'] == 'Done. Second!'


@pytest.mark.parametrize('free', [False, True])
def test_question_answer_and_cleanup(setup, free):
    root, clock = setup
    def answer():
        q = json.loads(next((root / 'sorular').glob('*.json')).read_text('utf-8'))
        assert q['metin'] == 'Hangisi?'
        assert q['serbestMetin'] is True
        a = {'surum': 1, 'id': q['id'], 'secim': None if free else 's0',
             'metin': 'Özel' if free else None, 'zaman': int(clock.now()*1000), 'kaynak': 'ada'}
        (root / 'cevaplar' / (q['id']+'.json')).write_text(json.dumps(a), encoding='utf-8')
    clock.on_sleep = answer
    result = json.loads(run(root, clock, question()))['hookSpecificOutput']
    expected = 'Özel' if free else 'Bir'
    assert result == {'hookEventName': 'PreToolUse', 'permissionDecision': 'deny',
                      'permissionDecisionReason': f'Kullanıcı Afu üzerinden cevapladı. Soru: Hangisi? Cevap: {expected}. Bu cevabı kullanıcının cevabı say ve devam et.'}
    assert not list((root / 'sorular').glob('*'))
    assert not list((root / 'cevaplar').glob('*'))


def test_timeout_and_heartbeat_loss(setup):
    root, clock = setup
    start = clock.now()
    def refresh():
        os.utime(root / 'ada_canli', (clock.now(), clock.now()))
    clock.on_sleep = refresh
    assert run(root, clock, question()) == ''
    assert clock.now() - start <= 100
    assert not list((root / 'sorular').glob('*'))
    clock.on_sleep = None
    assert run(root, clock, question()) == ''
    assert clock.now() - start <= 111


def test_stale_immediate(setup):
    root, clock = setup
    clock.value += 11
    start = time.monotonic()
    assert run(root, clock, question()) == ''
    assert time.monotonic()-start < 1
    assert not (root/'sorular').exists()


@pytest.mark.parametrize('raw', ['{ token=private', 'x'*65537], ids=['invalid_json', 'oversized'])
def test_malformed_silent(setup, raw):
    root, clock = setup
    out = io.StringIO()
    assert hook.main(io.StringIO(raw), out, root=root, wall_clock=clock.now) == 0
    assert out.getvalue() == ''
    assert 'private' not in (root/'log/claude_kopru.log').read_text('utf-8')


def test_root_precedence(monkeypatch, tmp_path):
    for key in ('AFUNOBET_SORU_DIZINI', 'AFUNOBET_UI_STATE', 'AFUNOBET_DB'):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv('AFUNOBET_DB', str(tmp_path/'db/state.db'))
    assert hook.default_root() == tmp_path/'db'
    monkeypatch.setenv('AFUNOBET_UI_STATE', str(tmp_path/'ui/state.json'))
    assert hook.default_root() == tmp_path/'ui'
    monkeypatch.setenv('AFUNOBET_SORU_DIZINI', str(tmp_path/'direct'))
    assert hook.default_root() == tmp_path/'direct'


@pytest.mark.parametrize('change', [{'id':'wrong'}, {'surum':2}, {'secim':'bad'}, {'metin':'x'*2001}, {'kaynak':'other'}, {'zaman':0}])
def test_invalid_answer_ignored(setup, change):
    root, clock = setup
    def answer():
        q = json.loads(next((root/'sorular').glob('*.json')).read_text('utf-8'))
        a = dict(surum=1, id=q['id'], secim='s0', metin=None, zaman=int(clock.now()*1000), kaynak='ada')
        a.update(change)
        (root/'cevaplar'/f"{q['id']}.json").write_text(json.dumps(a), encoding='utf-8')
    clock.on_sleep = answer
    assert run(root, clock, question()) == ''
    assert not list((root/'cevaplar').glob('*'))
