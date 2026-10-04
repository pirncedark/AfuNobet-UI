"""Adapter contract tests; model generation is the only expensive boundary replaced."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
import wave
from afu_konus import GpuLock
import uygulama_sesi as adapter

class AdapterTests(unittest.TestCase):
    def test_unverified_speech_is_not_accepted_for_playback(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(adapter, 'LOCAL', Path(folder)), patch.object(adapter, 'Voice') as model:
            model.return_value.generate.return_value = {'quality_verified': False}
            result = adapter.render({'text': 'Merhaba'}, Path(folder))
            self.assertFalse(result['ok'])
            model.return_value.close.assert_called_once()

    def test_full_answer_is_cleaned_and_selected_identity_is_used(self):
        calls = []
        class Model:
            def __init__(self, selected, cancelled=None): calls.append(selected)
            def generate(self, text, target, preset):
                calls.extend([text, preset]); target.write_bytes(b'wave')
                return {'quality_verified': True}
            def close(self): calls.append('closed')
        # Model behavior requires an installed voice root. Missing installation
        # has its own contract in tests/test_ses_paths.py and must stay fail-safe.
        with tempfile.TemporaryDirectory() as folder, patch.object(adapter, 'LOCAL', Path(folder)), patch.object(adapter, 'Voice', Model):
            result = adapter.render({'text': 'Merhaba.\n```python\nprint(1)\n```', 'ses': 'sakin_dogal', 'filtre': 'sicak'}, Path(folder))
        self.assertTrue(result['ok'])
        self.assertEqual(result['text'], 'Merhaba.\npython\nprint(1)\n')
        self.assertEqual(calls[1], result['text'])
        self.assertEqual(calls[0], 'sakin_dogal')
        self.assertEqual(calls[-2:], ['sicak', 'closed'])

    def test_failure_returns_safe_cleaned_fallback(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(adapter, 'LOCAL', Path(folder)), patch.object(adapter, 'Voice', side_effect=RuntimeError('private path')):
            result = adapter.render({'text': 'Tamam.\n```\nsecret\n```', 'ses': 'notr', 'filtre': 'sicak'}, Path(folder))
        self.assertFalse(result['ok']); self.assertEqual(result['text'], 'Tamam.\n\nsecret\n')
        self.assertNotIn('private', str(result))

    def test_cancelled_job_does_not_load_model(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(adapter, 'Voice') as model:
            path = Path(folder); (path/'cancel').touch()
            result = adapter.render({'text': 'Merhaba', 'ses': 'notr', 'filtre': 'sicak'}, path)
            self.assertTrue(result['cancelled']); model.assert_not_called()

    def test_worker_failure_keeps_diagnostics_local(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(adapter, 'LOCAL', Path(folder)), patch.object(adapter, 'Voice', side_effect=RuntimeError('model diagnostic')):
            result = adapter.render({'text': 'Merhaba', 'headless': True}, Path(folder))
            self.assertFalse(result['ok'])
            self.assertNotIn('model diagnostic', str(result))
            self.assertIn('RuntimeError: model diagnostic', (Path(folder) / 'diagnostic.txt').read_text(encoding='utf-8'))

    def test_invalid_selection_does_not_silently_use_neutral_voice(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(adapter, 'LOCAL', Path(folder)), patch.object(adapter, 'Voice') as model:
            result = adapter.render({'text': 'Merhaba', 'ses': 'unknown', 'filtre': 'sicak'}, Path(folder))
            self.assertFalse(result['ok']); model.assert_not_called()

    def test_waiting_cancel_preserves_other_gpu_owner(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'.gpu.lock'; path.write_text('another owner')
            lock = GpuLock(path, cancelled=lambda: True)
            with self.assertRaises(InterruptedError): lock.acquire()
            lock.close()
            self.assertEqual(path.read_text(), 'another owner')

    def test_playback_cancel_stops_sound_and_pre_cancel_never_starts_it(self):
        sound = Mock(SND_FILENAME=1, SND_ASYNC=2, SND_NODEFAULT=4)
        stopped = False
        def play(path, flags):
            nonlocal stopped
            if path is not None: stopped = True
        sound.PlaySound.side_effect = play
        with tempfile.TemporaryDirectory() as folder, patch.dict('sys.modules', winsound=sound):
            path = Path(folder)/'silence.wav'
            with wave.open(str(path), 'wb') as stream:
                stream.setnchannels(1); stream.setsampwidth(2); stream.setframerate(24000)
                stream.writeframes(b'\0\0'*2400)
            adapter.play(path, lambda: True)
            self.assertEqual(sound.PlaySound.call_count, 0)
            adapter.play(path, lambda: stopped)
            self.assertEqual(sound.PlaySound.call_args.args, (None, 0))
            self.assertEqual(sound.PlaySound.call_count, 2)

if __name__ == '__main__': unittest.main()
