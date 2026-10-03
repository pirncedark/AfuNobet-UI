"""Speech validation must work in the shipped worker without development tools."""
import unittest
from afu_konus import chunk_quality


class QualityTests(unittest.TestCase):
    def test_matching_turkish_speech_ignores_case_and_punctuation(self):
        self.assertIsNone(chunk_quality('İyi, birlikte devam edelim.', 2, 'iyi birlikte devam edelim'))

    def test_missing_or_changed_words_fail_validation(self):
        for heard in ('', 'Merhaba', 'Merhaba birlikte başka edelim'):
            with self.subTest(heard=heard):
                self.assertEqual(chunk_quality('Merhaba birlikte devam edelim', 2, heard), 'whisper_mismatch')

    def test_duration_is_still_checked_before_transcription(self):
        self.assertEqual(chunk_quality('Merhaba', 100, 'Merhaba'), 'duration_ratio')


if __name__ == '__main__':
    unittest.main()
