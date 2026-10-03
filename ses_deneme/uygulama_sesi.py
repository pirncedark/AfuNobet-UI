"""Headless app adapter. No Codex call and no changes to prototype preferences."""
import json
from pathlib import Path
import sys
import time
import wave
from afu_konus import Voice, VOICE_NAMES, DEFAULT_VOICE, speech_text, LOCAL

FILTERS = ('sicak', 'enerjik', 'sakin', 'yok')

def render(request, directory):
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
        voice = Voice(selected, cancelled=cancelled)
        parameters = voice.generate(text, directory / 'answer.wav', preset)
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

def main():
    directory = Path(sys.argv[1])
    request = json.loads((directory / 'request.json').read_text(encoding='utf-8'))
    result = render(request, directory)
    if result['ok'] and result['text'] and not request.get('headless', False):
        try:
            play(directory / 'answer.wav', lambda: (directory / 'cancel').exists())
        except Exception:
            result['ok'] = False
    result['cancelled'] = result['cancelled'] or (directory / 'cancel').exists()
    (directory / 'result.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')

if __name__ == '__main__':
    main()
