"""Headless app adapter. No Codex call and no changes to prototype preferences."""
import json
from pathlib import Path
import sys
import time
import wave
from afu_konus import Voice, VOICE_NAMES, DEFAULT_VOICE, speech_text, LOCAL

FILTERS = ('sicak', 'enerjik', 'sakin', 'yok')

def render(request, directory, voices=None):
    cancelled = lambda: (directory / 'cancel').exists()
    text = speech_text(str(request.get('text', '')))
    result = {'ok': False, 'cancelled': False, 'text': text}
    if cancelled():
        return dict(result, cancelled=True)
    if LOCAL is None:
        return dict(result, missing_installation=True)
    voice = None
    try:
        selected = request.get('ses', DEFAULT_VOICE)
        preset = request.get('filtre', 'sicak')
        if selected not in VOICE_NAMES or preset not in FILTERS:
            raise ValueError('Invalid choice')
        if not text:
            return dict(result, ok=True)
        if voices is None:
            voice = Voice(selected, cancelled=cancelled)
        else:
            # Sunucu modu: model bellekte kalır, her iş kendi iptal denetimini kullanır.
            current = voices.get(selected)
            if current is None:
                current = voices[selected] = Voice(selected, cancelled=cancelled)
            current.cancelled = cancelled
            voice = None
            extra = {'tarz': request['tarz']} if request.get('tarz') == 'sohbet' else {}
            parameters = current.generate(text, directory / 'answer.wav', preset, **extra)
            verified = isinstance(parameters, dict) and parameters.get('quality_verified') is True
            return dict(result, ok=verified and not cancelled(), cancelled=cancelled(), voice=selected, voice_parameters=parameters)
        extra = {'tarz': request['tarz']} if request.get('tarz') == 'sohbet' else {}
        parameters = voice.generate(text, directory / 'answer.wav', preset, **extra)
        verified = isinstance(parameters, dict) and parameters.get('quality_verified') is True
        return dict(result, ok=verified and not cancelled(), cancelled=cancelled(), voice=selected, voice_parameters=parameters)
    except InterruptedError:
        return dict(result, cancelled=True)
    except Exception:
        if request.get('headless', False):
            # Headless proof retains diagnostics locally; UI and speech stay safe.
            import traceback
            (directory / 'diagnostic.txt').write_text(traceback.format_exc(), encoding='utf-8')
        # Technical errors never reach the user's screen or speech.
        return dict(result, cancelled=cancelled())
    finally:
        if voice is not None:
            voice.close()

def play(path, cancelled):
    import winsound
    with wave.open(str(path), 'rb') as audio:
        duration = audio.getnframes() / audio.getframerate()
    if cancelled():
        return
    try:
        winsound.PlaySound(str(path), winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_NODEFAULT)
        deadline = time.monotonic() + duration
        while not cancelled() and time.monotonic() < deadline:
            time.sleep(0.05)
    finally:
        winsound.PlaySound(None, 0)

def finish(directory, request, result):
    if result['ok'] and result['text'] and not request.get('headless', False):
        try:
            (directory / 'playing').write_text('1')
            play(directory / 'answer.wav', lambda: (directory / 'cancel').exists())
        except Exception:
            result['ok'] = False
    result['cancelled'] = result['cancelled'] or (directory / 'cancel').exists()
    (directory / 'result.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')

def run_job(directory, voices=None):
    request = json.loads((directory / 'request.json').read_text(encoding='utf-8'))
    if (directory / 'cancel').exists():
        finish(directory, request, {'ok': False, 'cancelled': True, 'text': ''})
        return
    finish(directory, request, render(request, directory, voices))

def via_server(directory):
    """Bellekte hazır duran ses sunucusuna iş verir; yoksa başlatır. Başarısızsa False."""
    import socket, subprocess, os
    port = 47615
    def connect():
        try:
            return socket.create_connection(('127.0.0.1', port), timeout=1)
        except OSError:
            return None
    conn = connect()
    if conn is None:
        server = Path(__file__).with_name('uygulama_sesi_sunucu.py')
        subprocess.Popen(['cmd', '/c', 'start', '', '/B', sys.executable, '-B', str(server)],
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         creationflags=0x08000000)
        deadline = time.monotonic() + 60
        while conn is None and time.monotonic() < deadline:
            time.sleep(0.3)
            conn = connect()
    if conn is None:
        return False
    try:
        conn.settimeout(None)
        conn.sendall((str(directory) + chr(10)).encode('utf-8'))
        return conn.makefile('r', encoding='utf-8').readline().strip() == 'done'
    except OSError:
        return False
    finally:
        conn.close()

def main():
    directory = Path(sys.argv[1])
    if directory.name.startswith('afu-voice-') and via_server(directory) and (directory / 'result.json').exists():
        return
    run_job(directory)

if __name__ == '__main__':
    main()
