"""Generate original, quiet notification cues using only Python standard library."""
import math
from pathlib import Path
import struct
import wave

CUES = {
    "basladi": [440, 660],
    "tamamlandi": [523, 659, 784],
    "hata": [330, 247],
    "cevap": [587, 784, 587],
    "kota": [392, 330, 262],
    "baglandi": [494, 740],
}

def generate(root):
    rate = 22050
    for name, notes in CUES.items():
        frames = bytearray()
        for hz in notes:
            count = int(rate * 0.11)
            for index in range(count):
                phase = index / count
                envelope = math.sin(math.pi * phase) ** 2
                sample = int(5000 * envelope * math.sin(2 * math.pi * hz * index / rate))
                frames.extend(struct.pack("<h", sample))
            frames.extend(b"\0\0" * int(rate * 0.025))
        with wave.open(str(root / (name + ".wav")), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(rate)
            output.writeframes(frames)

if __name__ == "__main__":
    generate(Path(__file__).resolve().parent)
