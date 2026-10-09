"""ChatGPT-login Codex thread -> offline Turkish Chatterbox -> local audio."""
import argparse
import datetime
import json
import os
from pathlib import Path
import queue
import re
import shutil
import subprocess
import sys
import threading
import time

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'cikti'
def resolve_local(root=ROOT, configured=None):
    """Resolve the voice installation without depending on the current directory."""
    candidates = []
    if configured:
        candidates.append(Path(configured).expanduser())
    candidates.extend((root.parent / 'ses', root / 'ses',
                       root.parent.parent / '_deneme' / 'ses'))
    candidates.extend(parent / '_deneme' / 'ses' for parent in root.parents)
    return next((path for path in candidates if path.is_dir()), None)

LOCAL = resolve_local(configured=os.environ.get('AFU_SES_DIZIN'))
HIDDEN = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
SETTINGS = ROOT / 'ayar.json'
DEFAULT_VOICE = 'afu_5b'
VOICE_NAMES = (DEFAULT_VOICE, 'notr', 'yumusak_sicak', 'neseli_hareketli', 'sakin_dogal')

def load_settings(path=SETTINGS):
    settings = {'ses': DEFAULT_VOICE, 'filtre': 'sicak'}
    if path.exists():
        settings.update(json.loads(path.read_text(encoding='utf-8-sig')))
    if settings['ses'] not in VOICE_NAMES or settings['filtre'] not in ('sicak', 'enerjik', 'sakin', 'yok'):
        raise ValueError('Ses seçimi geçersiz; yeniden bir ses seç.')
    return settings

def save_settings(settings, path=SETTINGS):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(path)

def load_voice_config(selected):
    if selected == DEFAULT_VOICE:
        return {'exaggeration': 0.35, 'cfg_weight': 0.5, 'temperature': 0.7, 'energy': 'sakin'}
    if selected == 'notr':
        return {'exaggeration': 0.5, 'long_exaggeration': 0.35, 'cfg_weight': 0.5, 'temperature': 0.7}
    manifest = ROOT / 'ses_adaylari' / 'presets.json'
    if not manifest.exists():
        raise RuntimeError('Seçilen ses henüz hazır değil; nötr sesi seçerek yeniden dene.')
    data = json.loads(manifest.read_text(encoding='utf-8-sig'))
    if 'presets' in data:
        candidate = data['presets'][selected]
        reference = (manifest.parent / data['reference']).resolve()
        if not reference.is_relative_to(manifest.parent.resolve()) or not reference.is_file():
            raise ValueError('Ses ön ayarı eksik; nötr sesi seçerek yeniden dene.')
        config = dict(exaggeration=candidate['ex'],
                      long_exaggeration=candidate['ex'] + data.get('long_exaggeration_delta', -0.05),
                      cfg_weight=candidate['cfg'], temperature=data.get('temperature', 0.7),
                      reference=str(reference), pause=candidate['pause'], seed=data.get('seed', 42),
                      ffmpeg_filter=f"rubberband=pitch={candidate['pitch']}:tempo={candidate['tempo']}:formant=shifted,{candidate['eq']},loudnorm=I=-18:TP=-2:LRA=7")
    else:
        config = data[selected]
    for key in ('exaggeration', 'cfg_weight'):
        if not isinstance(config.get(key), (int, float)):
            raise ValueError('Ses ön ayarı eksik; nötr sesi seçerek yeniden dene.')
    return config

class GpuLock:
    """Shared O_EXCL lock; never remove another process's lock."""
    def __init__(self, path=ROOT / '.gpu.lock', timeout=300, cancelled=None):
        self.path, self.timeout, self.owned = path, timeout, False
        self.cancelled = cancelled or (lambda: False)

    def stale(self):
        """Sahibi ölmüş kilidi kaldırır (çöken/öldürülen işçiden kalan); canlı sahibin kilidine dokunmaz."""
        try:
            pid = int(self.path.read_text().strip())
        except (OSError, ValueError):
            return False
        try:
            import ctypes
            kernel = ctypes.windll.kernel32
            handle = kernel.OpenProcess(0x1000, False, pid)
            if not handle:
                alive = False
            else:
                code = ctypes.c_ulong()
                alive = bool(kernel.GetExitCodeProcess(handle, ctypes.byref(code))) and code.value == 259
                kernel.CloseHandle(handle)
        except Exception:
            return False
        if alive:
            return False
        try:
            self.path.unlink()
            return True
        except OSError:
            return False

    def acquire(self):
        deadline = time.monotonic() + self.timeout
        while True:
            if self.cancelled():
                raise InterruptedError('Ses durduruldu.')
            try:
                fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                self.owned = True
                with os.fdopen(fd, 'w') as stream:
                    stream.write(str(os.getpid()))
                return
            except FileExistsError:
                if self.stale():
                    continue
                if time.monotonic() >= deadline:
                    raise TimeoutError('Ses üretimi meşgul; biraz sonra yeniden dene.')
                time.sleep(1)

    def close(self):
        if self.owned:
            self.path.unlink(missing_ok=True)
            self.owned = False

def save_state(state):
    OUT.mkdir(exist_ok=True)
    temporary = OUT / 'thread.tmp'
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(OUT / 'thread.json')

def route_status(text, state):
    normalized = text.strip().lower().translate(str.maketrans('çğıöşü', 'cgiosu'))
    normalized = re.sub(r'[?!.]+$', '', normalized).strip()
    if normalized not in {'codex su an ne yapiyor', 'codex ne yapiyor', 'durum ne', 'bitti mi', 'kac is var'}:
        return None
    status = state.get('status', 'unknown')
    if status not in {'completed', 'inProgress', 'failed', 'interrupted'}:
        return 'Bu sohbetin güncel durumunu bilmiyorum; bir mesaj göndererek devam edebilirsin.'
    if normalized == 'kac is var':
        return 'Bu sohbet oturumunda bir iş sürüyor.' if status == 'inProgress' else 'Bu sohbet oturumunda çalışan iş yok; diğer görevlerin sayısını bilmiyorum.'
    return {'completed': 'Son yanıt hazır, birlikte devam edebiliriz.',
            'inProgress': 'Codex yanıtını hazırlıyor, biraz bekleyelim.',
            'failed': 'Son yanıt tamamlanamadı, yeniden deneyebilirsin.',
            'interrupted': 'Son yanıt durduruldu, yeniden deneyebilirsin.'}.get(status, 'Henüz bu sohbette bir görev başlamadı.')

def number_words(value):
    ones = ('', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz')
    tens = ('', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan')
    n = int(value)
    if not n:
        return 'sıfır'
    if n >= 1000000:
        return 'ekrandaki sayı'
    parts = []
    if n >= 1000:
        parts.append((number_words(n // 1000) + ' ' if n // 1000 != 1 else '') + 'bin')
        n %= 1000
    if n >= 100:
        parts.append((ones[n // 100] + ' ' if n // 100 != 1 else '') + 'yüz')
        n %= 100
    parts.extend((tens[n // 10], ones[n % 10]))
    return ' '.join(p for p in parts if p)


def speech_text(text, *, legacy=False):
    """Remove only Markdown markers; preserve words, code and whitespace."""
    if legacy:
        return _legacy_speech_text(text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'(?m)^([ \t]*)(?:#{1,6}|[-*+]|\d+\.)[ \t]+', r'\1', text)
    return text.replace('**', '').replace('`', '')


def _legacy_speech_text(text):
    # A length-limited screen answer can end before the closing fence.
    text = re.sub(r'(```|~~~).*?(?:\1|\Z)', ' Kodu ekrana yazdım. ', text, flags=re.S)
    text = re.sub(r'(?m)^Traceback .*?(?=\n\s*\n|\Z)', ' Ayrıntıları ekranda görebilirsin. ', text, flags=re.S)
    code = re.compile(r'^(?:(?:async\s+)?(?:def|class)\s+\w+|(?:from\s+\S+\s+import|import)\s+|(?:if|elif|else|for|while|try|except|finally|with)\b.*[:{]\s*$|(?:return|raise|yield|pass|break|continue)\b|(?:const|let|var|function)\s+|[A-Za-z_]\w*(?:\([^\n]*\)|\s*=\s*[^=].*)\s*;?\s*$|[{}];?\s*$)')
    lines, in_code = [], False
    for line in text.splitlines():
        stripped = line.strip()
        if code.match(stripped) or (in_code and line[:1].isspace() and stripped):
            if not in_code:
                lines.append('Kodu ekrana yazdım.')
            in_code = True
        else:
            lines.append(line)
            in_code = False
    text = '\n'.join(lines)
    text = re.sub(r'`[^`]*`', ' Ayrıntıyı ekrana yazdım. ', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'https?://\S+|www\.\S+|[A-Za-z]:[\\/]\S+|(?<!\w)/(?:[^\s/]+/)*[^\s]+', ' ', text)
    text = re.sub(r'(?<!\w)(?:[\w.-]+[\\/])+[\w.-]+', ' Ayrıntıları ekranda görebilirsin. ', text)
    text = re.sub(r'(?m)^\s*(?:#{1,6}|>|[-*]|\d+\.)\s+', '', text)
    text = re.sub(r'\b(?=[\w-]{10,}\b)(?=[\w-]*[A-Za-z])(?=[\w-]*\d)[\w-]+\b|\b[0-9a-fA-F]{16,}\b', 'ekrandaki kod', text)
    text = re.sub(r'\b\d+\b', lambda m: number_words(m[0]), text)
    letters = dict(zip('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ('a', 'be', 'ce', 'de', 'e', 'ef', 'ge', 'he', 'i', 'je', 'ka', 'le', 'me', 'ne', 'o', 'pe', 'ku', 're', 'se', 'te', 'u', 've', 'dabıl yu', 'iks', 'ye', 'ze')))
    text = re.sub(r'\b[A-Z]{2,6}\b', lambda m: ' '.join(letters[c] for c in m[0]), text)
    text = re.sub(r'[*_~]', '', text)
    text = ''.join(c for c in text if ord(c) < 0x2600 or c.isalnum())
    return re.sub(r'\s+', ' ', text).strip() or 'Yanıtı ekrana yazdım.'


def speech_chunks(text, limit=200):
    if limit < 1:
        raise ValueError('Parça uzunluğu pozitif olmalı.')
    chunks = []
    for sentence in re.split(r'(?<=[.!?])\s+', text.strip()):
        while len(sentence) > limit:
            cut = sentence.rfind(' ', 0, limit + 1)
            if cut <= 0:
                raise ValueError('Ses metninde çok uzun bir sözcük var; metni kısaltarak yeniden dene.')
            chunks.append(sentence[:cut])
            sentence = sentence[cut:].lstrip()
        if sentence:
            chunks.append(sentence)
    return chunks


def breath(rate, seed):
    """Çok hafif, süzülmüş nefes sesi (≈ -36 dB, 0,3 sn)."""
    import numpy as np
    rng = np.random.default_rng(1000 + seed)
    n = int(rate * 0.3)
    noise = rng.standard_normal(n).astype(np.float32)
    spectrum = np.fft.rfft(noise)
    freqs = np.fft.rfftfreq(n, 1 / rate)
    spectrum[(freqs < 300) | (freqs > 3200)] = 0
    shaped = np.fft.irfft(spectrum, n).astype(np.float32)
    envelope = np.sin(np.linspace(0, np.pi, n)) ** 2
    shaped *= envelope / max(float(np.max(np.abs(shaped))), 1e-6) * 0.018
    return shaped


def trim_tail(samples, rate, text):
    """Chatterbox bazen cümleden sonra uğultu/hırlama (uzun kuyruk) üretir: beklenen süreyi aşan son parçayı keser."""
    import numpy as np
    frame = int(rate * 0.05)
    if frame <= 0 or len(samples) < frame * 4:
        return samples
    energy = np.array([float(np.sqrt(np.mean(samples[i:i + frame] ** 2))) for i in range(0, len(samples) - frame + 1, frame)])
    voiced = energy > 0.012
    limit = (0.07 * len(text) + 0.3) * 1.6
    segments, start, gap = [], None, 0
    for index, flag in enumerate(voiced):
        if flag:
            if start is None:
                start = index
            gap = 0
            end = index
        elif start is not None:
            gap += 1
            if gap >= 5:  # 250 ms sessizlik parçayı kapatır
                segments.append((start, end))
                start = None
    if start is not None:
        segments.append((start, end))
    if len(segments) < 2:
        return samples
    keep = segments[0][1]
    for seg_start, seg_end in segments[1:]:
        if (seg_end + 1) * frame / rate <= limit:
            keep = seg_end
        else:
            break
    if keep == segments[-1][1]:
        return samples
    cut = min(len(samples), (keep + 1) * frame + int(rate * 0.12))
    return samples[:cut]


def chunk_quality(text, seconds, transcript=None):
    if not 0.025 * len(text) <= seconds <= max(5, 0.18 * len(text)):
        return 'duration_ratio'
    if transcript is not None:
        # Keep validation in the worker; development proof scripts are not shipped.
        def words(value):
            return re.findall(r'\w+', value.replace('İ', 'i').lower())
        expected, heard = words(text), words(transcript)
        previous = list(range(len(heard) + 1))
        for row, word in enumerate(expected, 1):
            current = [row]
            for column, actual in enumerate(heard, 1):
                current.append(min(current[-1] + 1, previous[column] + 1,
                                   previous[column - 1] + (word != actual)))
            previous = current
        if previous[-1] / max(1, len(expected)) > 0.15:
            return 'whisper_mismatch'
    return None

def voice_preset(text):
    if len(text) > 220:
        return 'sakin', 0.35, 0.5
    if len(text) < 85:
        return 'enerjik', 0.7, 0.4
    return 'notr', 0.5, 0.5

class CodexThread:
    def __init__(self, state):
        self.state = state
        self.q = queue.Queue()
        self.seq = 0
        exe = os.environ.get('AFU_CODEX_EXE') or shutil.which('codex.exe')
        if not exe:
            candidates = list((Path(os.environ.get('LOCALAPPDATA', '')) / 'OpenAI/Codex/bin').glob('*/codex.exe'))
            exe = str(candidates[-1]) if candidates else None
        if not exe:
            raise RuntimeError('Codex bulunamadı')
        env = os.environ.copy()
        for key in list(env):
            if key.endswith('API_KEY'):
                env.pop(key)
        self.stderr = open(OUT / 'app_server_stderr.log', 'w', encoding='utf-8')
        self.p = subprocess.Popen([exe, '-c', 'forced_login_method="chatgpt"', '-c', 'features.shell_tool=false',
                                  '-c', 'features.plugins=false', 'app-server'],
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self.stderr,
                                 text=True, encoding='utf-8', env=env, creationflags=HIDDEN)
        threading.Thread(target=self.read, daemon=True).start()
        try:
            self.rpc('initialize', {'clientInfo': {'name': 'afu_sohbet', 'version': '1'}, 'capabilities': {'experimentalApi': True}})
            self.send({'method': 'initialized'})
            account = self.rpc('account/read', {'refreshToken': False})
            if (account.get('account') or {}).get('type') != 'chatgpt':
                raise RuntimeError('ChatGPT üyelik oturumu yok; normal terminalde codex login çalıştır')
            params = {'cwd': str(ROOT), 'sandbox': 'read-only', 'approvalPolicy': 'never', 'modelProvider': 'openai',
                      'developerInstructions': (ROOT / 'karakter.md').read_text(encoding='utf-8'),
                      'config': {'features.shell_tool': False, 'features.plugins': False, 'mcp_servers': {}}}
            if state.get('threadId'):
                params['threadId'] = state['threadId']
                result = self.rpc('thread/resume', params)
            else:
                result = self.rpc('thread/start', params)
            state['threadId'] = result['thread']['id']
            # Disk state is historical; an interrupted previous process is not
            # evidence that a task is still running now.
            state['status'] = 'unknown'
            save_state(state)
        except BaseException:
            self.close()
            raise

    def read(self):
        for line in self.p.stdout:
            try:
                self.q.put(json.loads(line))
            except ValueError:
                pass
        self.q.put({'processExited': True})

    def send(self, data):
        self.p.stdin.write(json.dumps(data, ensure_ascii=False) + '\n')
        self.p.stdin.flush()

    def receive(self, deadline):
        while time.monotonic() < deadline:
            try:
                data = self.q.get(timeout=min(1, max(0.01, deadline-time.monotonic())))
            except queue.Empty:
                continue
            if data.get('processExited'):
                self.stderr.flush()
                raise RuntimeError('Codex durdu: ' + (OUT / 'app_server_stderr.log').read_text(encoding='utf-8').strip())
            if 'method' in data and 'id' in data:
                self.send({'id': data['id'], 'error': {'code': -32601, 'message': 'Prototype tools unavailable'}})
                continue
            return data
        raise TimeoutError('Codex yanıt süresi doldu')

    def rpc(self, method, params):
        self.seq += 1
        request_id = self.seq
        self.send({'id': request_id, 'method': method, 'params': params})
        pending = []
        try:
            deadline = time.monotonic() + 45
            while True:
                data = self.receive(deadline)
                if data.get('id') == request_id:
                    if 'error' in data:
                        raise RuntimeError(json.dumps(data['error'], ensure_ascii=False))
                    return data['result']
                pending.append(data)
        finally:
            for data in pending:
                self.q.put(data)

    def answer(self, text):
        self.state['status'] = 'inProgress'
        save_state(self.state)
        try:
            result = self.rpc('turn/start', {'threadId': self.state['threadId'], 'input': [{'type': 'text', 'text': text}]})
            turn_id = result['turn']['id']
            messages = {}
            deadline = time.monotonic() + 300
            while True:
                event = self.receive(deadline)
                method, params = event.get('method'), event.get('params', {})
                if params.get('threadId') != self.state['threadId']:
                    continue
                if method == 'item/completed' and params.get('turnId') == turn_id:
                    item = params['item']
                    if item.get('type') == 'agentMessage':
                        messages[item['id']] = item
                if method == 'turn/completed' and params['turn']['id'] == turn_id:
                    turn = params['turn']
                    self.state.update(status=turn['status'], turnId=turn_id)
                    save_state(self.state)
                    if turn['status'] != 'completed':
                        raise RuntimeError(str(turn.get('error') or turn['status']))
                    for item in turn.get('items', []):
                        if item.get('type') == 'agentMessage':
                            messages[item['id']] = item
                    final = [i['text'] for i in messages.values() if i.get('phase') == 'final_answer']
                    reply = '\n'.join(final or [i['text'] for i in messages.values()])
                    if not reply.strip():
                        raise RuntimeError('Codex boş yanıt verdi')
                    return reply
        except BaseException:
            self.state['status'] = 'failed'
            save_state(self.state)
            raise

    def close(self):
        if self.p.poll() is None:
            self.p.kill()
        self.p.wait()
        self.stderr.close()

class Voice:
    def __init__(self, selected=DEFAULT_VOICE, cancelled=None):
        self.selected = selected
        self.cancelled = cancelled or (lambda: False)
        self.config = load_voice_config(selected)
        self.lock = GpuLock(cancelled=self.cancelled)
        self.lock.acquire()
        try:
            self.load()
        except BaseException:
            self.close()
            raise

    def load(self):
        if LOCAL is None:
            raise FileNotFoundError('Afu sesi kurulu değil, yazıyla devam ediyorum.')
        os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', NUMBA_CACHE_DIR=str(ROOT/'numba_cache'))
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        torch.set_num_threads(4)
        self.torch = torch
        snapshots = Path.home() / '.cache/huggingface/hub/models--ResembleAI--chatterbox/snapshots'
        for attempt in range(3):
            if self.cancelled():
                raise InterruptedError('Ses durduruldu.')
            try:
                self.model = ChatterboxMultilingualTTS.from_local(next(snapshots.iterdir()), device='cuda' if torch.cuda.is_available() else 'cpu')
                break
            except torch.cuda.OutOfMemoryError:
                torch.cuda.empty_cache()
                if attempt == 2:
                    raise
                time.sleep(10)
        self.ref = Path(self.config.get('reference', OUT / 'reference.wav'))
        if not self.config.get('reference'):
            self.ref.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(LOCAL/'2-Afu-Minik-Kiz.mp3'), '-ac', '1', '-ar', '24000', str(self.ref)], check=True, creationflags=HIDDEN)

    def generate(self, text, target, preset, tarz='okuma'):
        import soundfile as sf
        name, ex, cfg = voice_preset(text)
        # The recommended 5b voice keeps its energy for all answer lengths.
        config = self.config
        name = config.get('energy', name)
        ex = config.get('long_exaggeration', config['exaggeration']) if name == 'sakin' else config['exaggeration']
        cfg = config['cfg_weight']
        import numpy as np
        sentences = speech_chunks(text)
        previous_text = ''
        parts = []
        checks = []
        for sentence in sentences:
            if self.cancelled():
                raise InterruptedError('Ses durduruldu.')
            candidates = []
            for quality_attempt in range(2):
                for attempt in range(3):
                    if self.cancelled():
                        raise InterruptedError('Ses durduruldu.')
                    self.torch.manual_seed(config.get('seed', 42) + quality_attempt)
                    try:
                        wav = self.model.generate(sentence, language_id='tr', audio_prompt_path=str(self.ref), exaggeration=ex, cfg_weight=cfg, temperature=config.get('temperature', 0.7))
                        break
                    except self.torch.cuda.OutOfMemoryError:
                        self.torch.cuda.empty_cache()
                        if attempt == 2:
                            raise
                        time.sleep(10)
                samples = wav.detach().cpu().numpy().reshape(-1)
                samples = trim_tail(samples, self.model.sr, sentence)
                seconds = len(samples) / self.model.sr
                reason = chunk_quality(sentence, seconds)
                transcript = None
                if reason is None and os.environ.get('AFU_SES_DOGRULA') == '1':
                    transcript = self.transcribe(samples)  # yavaş; yalnız geliştirme denetiminde
                    reason = chunk_quality(sentence, seconds, transcript)
                candidates.append(dict(attempt=quality_attempt + 1, seconds=seconds,
                                       transcript=transcript, issue=reason))
                if reason in (None, 'whisper_mismatch'):
                    break  # adlar/yabancı sözcükler yanlış duyulur; sesi çal, robot sesine düşme
            checks.append(dict(text=sentence, attempts=candidates))
            if parts:
                parts.append(np.zeros(int(self.model.sr * config.get('pause', 0.18)), dtype=np.float32))
                if tarz == 'sohbet':
                    # Sohbette doğal ses: cümleler arası biraz daha es, bazen hafif nefes (okumada yok, hızlı okunur).
                    parts.append(np.zeros(int(self.model.sr * 0.2), dtype=np.float32))
                    if len(checks) % 2 == 1 and not previous_text.rstrip().endswith('?'):
                        parts.append(breath(self.model.sr, len(checks)))
            previous_text = sentence
            parts.append(samples)
        raw = target.with_name(target.stem + '_ham.wav')
        if self.cancelled():
            raise InterruptedError('Ses durduruldu.')
        sf.write(raw, np.concatenate(parts), self.model.sr)
        from filter_audio import apply_filter
        if config.get('ffmpeg_filter'):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', config['ffmpeg_filter'],
                            '-c:a', 'pcm_s16le', str(target)], check=True, creationflags=HIDDEN)
        else:
            apply_filter(raw, target, preset)
        return {'energy': name, 'exaggeration': ex, 'cfg_weight': cfg,
                'filter': config.get('ffmpeg_filter', preset), 'chunks': checks,
                'quality_verified': all(row['attempts'][-1]['issue'] in (None, 'whisper_mismatch') for row in checks)}

    def transcribe(self, samples):
        import numpy as np
        from scipy.signal import resample_poly
        if not hasattr(self, 'whisper'):
            from faster_whisper import WhisperModel
            cache = Path.home() / '.cache/huggingface/hub/models--Systran--faster-whisper-small/snapshots'
            self.whisper = WhisperModel(str(next(cache.iterdir())), device='cpu', compute_type='int8',
                                        cpu_threads=4, local_files_only=True)
        audio = resample_poly(samples, 16000, self.model.sr).astype(np.float32)
        segments, _ = self.whisper.transcribe(audio, language='tr', beam_size=5,
                                             condition_on_previous_text=False)
        return ' '.join(segment.text.strip() for segment in segments)

    def close(self):
        if hasattr(self, 'whisper'):
            del self.whisper
        if hasattr(self, 'model'):
            del self.model
            if self.torch.cuda.is_available():
                self.torch.cuda.empty_cache()
        self.lock.close()

def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description='Afu ile konuş')
    parser.add_argument('mesaj', nargs='?')
    parser.add_argument('--filtre', choices=['sicak', 'enerjik', 'sakin', 'yok'])
    parser.add_argument('--ses', choices=VOICE_NAMES, help='Ses seçimini kaydet')
    parser.add_argument('--sessiz', action='store_true')
    parser.add_argument('--etkilesimli', action='store_true')
    args = parser.parse_args()
    if not args.mesaj and not args.etkilesimli:
        parser.error('Bir mesaj yaz veya --etkilesimli kullan')
    configured_python = os.environ.get('AFU_SES_PYTHON')
    candidates = ([Path(configured_python)] if configured_python else [])
    if LOCAL is not None:
        candidates.append(LOCAL / 'cbenv/Scripts/python.exe')
    python = next((path for path in candidates if path.is_file()), None)
    if python is not None and Path(sys.executable).resolve() != python.resolve():
        return subprocess.call([str(python), '-B', str(Path(__file__).resolve()), *sys.argv[1:]], creationflags=HIDDEN)
    OUT.mkdir(exist_ok=True)
    state = {}
    client = voice = None
    message = args.mesaj
    try:
        if (OUT/'thread.json').exists():
            state = json.loads((OUT/'thread.json').read_text(encoding='utf-8'))
            if state.get('status') == 'inProgress':
                state['status'] = 'unknown'
        settings = load_settings()
        if args.ses:
            settings['ses'] = args.ses
        if args.filtre:
            settings['filtre'] = args.filtre
        load_voice_config(settings['ses'])
        if not settings.get('ilk_kullanim_gosterildi'):
            print('Afu ile konuşmak için mesajını yaz; ses seçimin sonraki konuşmalarda hatırlanır.', flush=True)
            settings['ilk_kullanim_gosterildi'] = True
        save_settings(settings)
        while True:
            if message is None:
                try:
                    message = input('Sen: ').strip()
                except EOFError:
                    break
            if message.casefold() in {'cik', 'çık'}:
                break
            if not message:
                message = None
                continue
            started = time.monotonic()
            with open(OUT/'attempts.jsonl', 'a', encoding='utf-8') as log:
                log.write(json.dumps({'input': message, 'started': datetime.datetime.now().isoformat()}, ensure_ascii=False)+'\n')
            local = route_status(message, state)
            if local is None:
                if client is None:
                    client = CodexThread(state)
                reply = client.answer(message)
            else:
                reply = local
            text_seconds = time.monotonic() - started
            print('Afu: ' + reply, flush=True)
            if LOCAL is None:
                print('Afu sesi kurulu değil, yazıyla devam ediyorum.', flush=True)
                if not args.etkilesimli:
                    break
                message = None
                continue
            spoken = speech_text(reply, legacy=True)
            target = OUT / (datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f') + '.wav')
            if voice is None:
                voice = Voice(settings['ses'])
            setting = voice.generate(spoken, target, settings['filtre'])
            record = dict(input=message, reply=reply, spoken=spoken, route='local' if local is not None else 'codex',
                          threadId=state.get('threadId'), setting=setting['energy'], voice=settings['ses'], filter=setting['filter'], voice_parameters=setting, wav=str(target),
                          text_seconds=text_seconds, total_seconds=time.monotonic()-started)
            with open(OUT/'sohbet.jsonl', 'a', encoding='utf-8') as log:
                log.write(json.dumps(record, ensure_ascii=False) + '\n')
            print(json.dumps(record, ensure_ascii=False), flush=True)
            if not args.sessiz:
                subprocess.run(['ffplay', '-nodisp', '-autoexit', '-loglevel', 'error', str(target)], check=True, creationflags=HIDDEN)
            if not args.etkilesimli:
                break
            message = None
    except (Exception, KeyboardInterrupt) as error:
        with open(OUT/'failure.log', 'a', encoding='utf-8') as log:
            log.write(str(error)+'\n')
        with open(OUT/'attempts.jsonl', 'a', encoding='utf-8') as log:
            log.write(json.dumps({'input': message, 'error': str(error)}, ensure_ascii=False)+'\n')
        if 'Could not find home directory' in str(error):
            hint = 'Sohbet bağlantısı açılamadı; dene_sohbet.ps1 komutunu normal terminalde çalıştır.'
        elif isinstance(error, FileNotFoundError):
            hint = 'Gerekli ses bileşeni bulunamadı; yerel ses kurulumunu kontrol ederek yeniden dene.'
        elif isinstance(error, TimeoutError):
            hint = 'Yanıt zamanında hazırlanamadı; biraz sonra yeniden dene.'
        else:
            known = ('Seçilen ses henüz hazır değil;', 'Ses seçimi geçersiz;', 'Ses ön ayarı eksik;')
            hint = str(error) if str(error).startswith(known) else 'Sohbet tamamlanamadı; yeniden dene.'
        print(hint, file=sys.stderr)
        return 1
    finally:
        if client:
            client.close()
        if voice:
            voice.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
