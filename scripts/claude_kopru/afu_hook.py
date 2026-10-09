"""Standalone local Claude notification/question bridge; always fail open."""
import json
import os
import re
import sys
import time
import uuid
from pathlib import Path

LIMIT = 64 * 1024
REPLY_WAIT = 90


def default_root():
    if os.environ.get('AFUNOBET_SORU_DIZINI'):
        return Path(os.environ['AFUNOBET_SORU_DIZINI'])
    for key in ('AFUNOBET_UI_STATE', 'AFUNOBET_DB'):
        if os.environ.get(key):
            return Path(os.environ[key]).parent
    # Mevcut AfuNobet kurulumu korunur; yoksa kullanici veri klasoru.
    eski = Path.home() / 'Desktop' / 'afuproject' / 'AfuNobet'
    if eski.is_dir():
        return eski
    return Path(os.environ.get('LOCALAPPDATA') or Path.home() / 'AppData' / 'Local') / 'AfuNobet'


def mask(text):
    text = re.sub(r'(?<![A-Za-z0-9])(?:sk-|ghp_|gho_|ghs_|ghu_|github_pat_|xox[a-z]*-|AKIA)[A-Za-z0-9_./+=-]{8,}', '•••', text)
    text = re.sub(r'(?i)(bearer\s+)[^\s\"\'&,;]+', r'\1•••', text)
    return re.sub(r'(?i)((?:password|passwd|token|secret|api_key|apikey)[A-Za-z0-9_]*\s*[=:]\s*[\"\']?)[^\s\"\'&,;]+', r'\1•••', text)


def log(root, error):
    # Exception messages and input can contain secrets; only the exception type is logged.
    try:
        folder = root / 'log'
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / 'claude_kopru.log'
        if path.exists() and path.stat().st_size > LIMIT:
            path.write_text('', encoding='utf-8')
        with path.open('a', encoding='utf-8') as stream:
            stream.write(f'{int(time.time())} {mask(type(error).__name__)}\n')
    except Exception:
        pass


def read_json(path):
    with path.open('rb') as stream:
        raw = stream.read(LIMIT + 1)
    if len(raw) > LIMIT:
        raise ValueError('oversized file')
    return json.loads(raw.decode('utf-8-sig'))


def atomic(path, record):
    raw = json.dumps(record, ensure_ascii=False).encode('utf-8')
    if len(raw) > LIMIT:
        raise ValueError('oversized record')
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.json.tmp')
    try:
        temp.write_bytes(raw)
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def live(root, now):
    try:
        age = now() - (root / 'ada_canli').stat().st_mtime
        return -10 <= age <= 10
    except OSError:
        return False


def simple(text):
    text = re.sub(r'```[\s\S]*?```|~~~[\s\S]*?~~~', ' ', text)
    text = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', text)
    text = re.sub(r'(?m)^\s*(?:#{1,6}\s*|>\s*|[-*+]\s+|\d+\.\s+)', '', text)
    text = re.sub(r'[`*_~]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return ' '.join(re.split(r'(?<=[.!?])\s+', text)[:2])


def last_assistant(path):
    # Tail read bounds both memory and transcript processing, even for long sessions.
    with Path(path).open('rb') as stream:
        size = stream.seek(0, 2)
        stream.seek(max(0, size-LIMIT))
        raw = stream.read(LIMIT)
    lines = raw.splitlines()
    if size > LIMIT:
        lines = lines[1:]
    for line in reversed(lines):
        try:
            row = json.loads(line)
            if not isinstance(row, dict) or row.get('type') != 'assistant':
                continue
            content = row.get('message', {}).get('content', [])
            if isinstance(content, str):
                return simple(content)
            texts = [part['text'] for part in content if isinstance(part, dict) and part.get('type') == 'text' and isinstance(part.get('text'), str)]
            if texts:
                return simple(' '.join(texts))
        except (ValueError, AttributeError, TypeError):
            continue
    return ''


def valid_answer(answer, q, now):
    if not isinstance(answer, dict) or type(answer.get('surum')) is not int or answer['surum'] != 1 or answer.get('id') != q['id'] or answer.get('kaynak') != 'ada':
        return None
    stamp = answer.get('zaman')
    if type(stamp) not in (int, float) or not q['olusturma'] <= stamp <= min(now*1000, q['sonGecerlilik']):
        return None
    selection, text = answer.get('secim'), answer.get('metin')
    labels = {o['id']: o['etiket'] for o in q['secenekler']}
    if selection is not None and (not isinstance(selection, str) or selection not in labels):
        return None
    if text is not None and (not isinstance(text, str) or not text.strip() or len(text) > 2000):
        return None
    parts = [p for p in (labels.get(selection), text) if p]
    return ' '.join(parts) if parts else None


def wait_reply(uid, root, wall_clock, monotonic, sleep, deadline):
    """Stop sonrası Afu balonundan gelen cevabı bekler; cevap varsa Claude devam eder.

    Cevap yoksa, "Okudum" denirse ya da Afu kapanırsa sessizce biter (fail open)."""
    answer_path = root/'cevaplar'/f'{uid}.json'
    try:
        while monotonic() < deadline and live(root, wall_clock):
            try:
                record = read_json(answer_path)
            except FileNotFoundError:
                record = None
            except (OSError, ValueError, TypeError) as error:
                log(root, error)
                record = None
            if isinstance(record, dict):
                text = record.get('metin')
                if isinstance(text, str) and text.strip():
                    return {'decision': 'block', 'reason': f'Kullanıcı Afu balonundan cevap yazdı: {mask(text.strip())[:2000]}. Bunu kullanıcının mesajı say ve devam et.'}
                return None
            sleep(min(.1, max(0, deadline-monotonic())))
    finally:
        try:
            answer_path.unlink(missing_ok=True)
        except OSError as error:
            log(root, error)
    return None


def process(event, root, wall_clock, monotonic, sleep, deadline):
    if not live(root, wall_clock):
        return None
    kind = event.get('hook_event_name')
    if kind in ('Stop', 'Notification'):
        text = last_assistant(event['transcript_path']) if kind == 'Stop' else event.get('message')
        if isinstance(text, str) and text.strip():
            uid = 'claude-' + uuid.uuid4().hex
            atomic(root/'mesajlar'/f'{uid}.json', dict(surum=1, id=uid, ajan='claude', tur='bitti' if kind == 'Stop' else 'bilgi', metin=mask(text.strip())[:2000], zaman=int(wall_clock()*1000)))
            if kind == 'Stop':
                return wait_reply(uid, root, wall_clock, monotonic, sleep, min(deadline, monotonic() + REPLY_WAIT))
        return None
    if kind != 'PreToolUse' or event.get('tool_name') != 'AskUserQuestion':
        return None
    questions = event.get('tool_input', {}).get('questions', [])
    if not isinstance(questions, list) or not questions or not isinstance(questions[0], dict):
        return None
    first = questions[0]
    text = first.get('question')
    if not isinstance(text, str) or not text.strip():
        return None
    options = first.get('options', [])
    if not isinstance(options, list):
        return None
    uid = 'claude-' + uuid.uuid4().hex
    start = int(wall_clock()*1000)
    q = dict(surum=1, id=uid, ajan='claude', tur='soru', baslik=mask(str(first.get('header') or 'Claude soruyor'))[:120], metin=mask(text.strip())[:2000], secenekler=[dict(id=f's{i}', etiket=mask(o['label'])[:40]) for i,o in enumerate(options[:6]) if isinstance(o,dict) and isinstance(o.get('label'),str) and o['label'].strip()], serbestMetin=True, gizli=bool(first.get('isSecret')), varsayilan=None, olusturma=start, sonGecerlilik=start+max(0,int((deadline-monotonic())*1000)))
    question_path = root/'sorular'/f'{uid}.json'
    answer_path = root/'cevaplar'/f'{uid}.json'
    (root/'cevaplar').mkdir(parents=True, exist_ok=True)
    try:
        atomic(question_path, q)
        while monotonic() < deadline and live(root, wall_clock):
            try:
                answer = valid_answer(read_json(answer_path), q, wall_clock())
                if answer:
                    return {'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'permissionDecision': 'deny', 'permissionDecisionReason': f'Kullanıcı Afu üzerinden cevapladı. Soru: {q["metin"]} Cevap: {answer}. Bu cevabı kullanıcının cevabı say ve devam et.'}}
            except FileNotFoundError:
                pass
            except (OSError, ValueError, TypeError) as error:
                log(root, error)
            sleep(min(.1, max(0, deadline-monotonic())))
    finally:
        for path in (question_path, answer_path):
            try:
                path.unlink(missing_ok=True)
            except OSError as error:
                log(root, error)
    return None


def main(stdin=None, stdout=None, *, root=None, wall_clock=time.time, monotonic=time.monotonic, sleep=time.sleep):
    root = Path(root) if root is not None else default_root()
    deadline = monotonic() + 100
    try:
        stream = stdin if stdin is not None else getattr(sys.stdin, 'buffer', sys.stdin)
        raw = stream.read(LIMIT+1)
        if len(raw) > LIMIT or (isinstance(raw, str) and len(raw.encode('utf-8')) > LIMIT):
            raise ValueError('oversized input')
        if isinstance(raw, bytes):
            raw = raw.decode('utf-8-sig')
        event = json.loads(raw)
        if not isinstance(event, dict):
            raise ValueError('invalid event')
        result = process(event, root, wall_clock, monotonic, sleep, deadline)
        if result is not None:
            out = stdout if stdout is not None else sys.stdout
            encoded = json.dumps(result, ensure_ascii=False)+'\n'
            if stdout is None and hasattr(out, 'buffer'):
                out.buffer.write(encoded.encode('utf-8'))
                out.buffer.flush()
            else:
                out.write(encoded)
                out.flush()
    except Exception as error:
        log(root, error)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
