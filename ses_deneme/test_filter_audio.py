"""The production filter must run without generating or loading speech models."""
import math
from pathlib import Path
import struct
import tempfile
import unittest
import wave


class FilterTests(unittest.TestCase):
    def test_warm_filter_produces_pcm_and_preserves_source(self):
        from filter_audio import apply_filter
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'raw.wav'
            target = Path(directory) / 'answer.wav'
            with wave.open(str(source), 'wb') as audio:
                audio.setnchannels(1)
                audio.setsampwidth(2)
                audio.setframerate(24000)
                audio.writeframes(b''.join(struct.pack('<h', int(5000 * math.sin(i * 2 * math.pi * 300 / 24000))) for i in range(24000)))
            original = source.read_bytes()
            apply_filter(source, target, 'sicak')
            self.assertEqual(source.read_bytes(), original)
            with wave.open(str(target), 'rb') as audio:
                self.assertEqual(audio.getframerate(), 24000)
                self.assertEqual(audio.getsampwidth(), 2)
                self.assertAlmostEqual(audio.getnframes() / 24000, 1, delta=0.05)

    def test_unknown_filter_is_rejected(self):
        from filter_audio import apply_filter
        with self.assertRaises(ValueError):
            apply_filter(Path('missing.wav'), Path('answer.wav'), 'unknown')


if __name__ == '__main__':
    unittest.main()
