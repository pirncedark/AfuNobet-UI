"""Offline Afu filters, retaining the previously selected 5b warm chain."""
import os
import shutil
import subprocess
import wave

PRESETS = {
    'sicak': (1.0, 1.00, 250, 1.5, 3200, -1.5),
    'enerjik': (2.0, 1.08, 250, -1.0, 3000, 2.0),
    'sakin': (-0.5, 0.94, 300, 2.0, 3500, -2.0),
}


def apply_filter(source, target, preset='sicak'):
    if preset == 'yok':
        shutil.copyfile(source, target)
        return
    if preset not in PRESETS:
        raise ValueError('Ses filtresi geçersiz; yeniden bir ses seç.')
    semitones, speed, lowfreq, lowgain, highfreq, highgain = PRESETS[preset]
    with wave.open(str(source), 'rb') as audio:
        rate = audio.getframerate()
    ratio = 2 ** (semitones / 12)
    chain = (f'asetrate={rate}*{ratio:.10f},aresample={rate},atempo={speed/ratio:.10f},'
             f'equalizer=f={lowfreq}:t=q:w=1:g={lowgain},'
             f'equalizer=f={highfreq}:t=q:w=1:g={highgain},volume=0.8,'
             'alimiter=limit=0.95:level=false')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-af', chain,
                    '-c:a', 'pcm_s16le', str(target)], check=True,
                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
