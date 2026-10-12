"""Cache/adapter regressions: mocks only, never load a model or repair real HF cache."""
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
import afu_konus as engine
import uygulama_sesi as adapter

class HealthTests(unittest.TestCase):
    def test_first_success_is_cold_and_next_success_is_warm(self):
        directory = MagicMock()
        directory.__truediv__.return_value.exists.return_value = False
        directory.__truediv__.return_value.read_text.return_value = '{"text":"Merhaba","headless":true}'
        voice = type('FakeVoice', (), {})()
        voices = {engine.DEFAULT_VOICE: voice}
        with patch.object(adapter, 'render', side_effect=lambda *args: {'ok':True,'cancelled':False,'text':'Merhaba'}), patch.object(adapter, 'finish') as finish, patch.object(adapter.time, 'monotonic', side_effect=[0,126.801,200,205]):
            adapter.run_job(directory, voices)
            cold = finish.call_args.args[2]
            adapter.run_job(directory, voices)
            warm = finish.call_args.args[2]
        self.assertEqual((cold['startup'], cold['elapsed_ms']), ('cold',126801))
        self.assertEqual((warm['startup'], warm['elapsed_ms']), ('warm',5000))

    def test_empty_model_file_is_rejected(self):
        path = MagicMock()
        path.is_dir.return_value = True
        path.__truediv__.return_value.is_file.return_value = True
        path.__truediv__.return_value.stat.return_value.st_size = 0
        self.assertFalse(engine.complete_snapshot(path))

    def test_main_revision_precedes_other_snapshots(self):
        cache = Path('fake-cache')
        main = cache / 'snapshots/main-revision'
        with patch.object(Path, 'read_text', return_value='main-revision'), patch.object(Path, 'is_dir', return_value=True), patch.object(Path, 'iterdir', return_value=[cache / 'snapshots/aaa']), patch.object(engine, 'complete_snapshot', return_value=True):
            self.assertEqual(engine.select_snapshot(cache), main)

    def test_incomplete_main_uses_complete_alternative(self):
        cache = Path('fake-cache')
        alternate = cache / 'snapshots/aaa'
        with patch.object(Path, 'read_text', return_value='broken'), patch.object(Path, 'is_dir', return_value=True), patch.object(Path, 'iterdir', return_value=[alternate]), patch.object(engine, 'complete_snapshot', side_effect=lambda p, required: p == alternate):
            self.assertEqual(engine.select_snapshot(cache), alternate)

    def test_missing_cache_without_repair_returns_safe_error(self):
        with patch.object(engine, 'select_snapshot', return_value=None):
            with self.assertRaisesRegex(engine.VoiceFilesMissing, 'ses dosyaları eksik'):
                engine.model_snapshot(Path('fake-cache'), repair=False)

    def test_offline_repair_is_mocked_and_validated(self):
        hub = MagicMock()
        hub.snapshot_download.return_value = 'restored'
        with patch.dict('sys.modules', {'huggingface_hub': hub}), patch.object(engine, 'select_snapshot', return_value=None), patch.object(engine, 'complete_snapshot', return_value=True):
            self.assertEqual(engine.model_snapshot(Path('fake-cache')), Path('restored'))
        self.assertTrue(hub.snapshot_download.call_args.kwargs['local_files_only'])
        self.assertEqual(hub.snapshot_download.call_args.kwargs['allow_patterns'], list(engine.MODEL_FILES))

    def test_invalid_offline_repair_is_not_accepted(self):
        hub = MagicMock()
        hub.snapshot_download.return_value = 'broken'
        with patch.dict('sys.modules', {'huggingface_hub': hub}), patch.object(engine, 'select_snapshot', return_value=None), patch.object(engine, 'complete_snapshot', return_value=False):
            with self.assertRaises(engine.VoiceFilesMissing):
                engine.model_snapshot(Path('fake-cache'))

    def test_missing_files_reach_result_message(self):
        directory = MagicMock()
        directory.__truediv__.return_value.exists.return_value = False
        with patch.object(adapter, 'LOCAL', Path('installed')), patch.object(adapter, 'Voice', side_effect=engine.VoiceFilesMissing(engine.MODEL_MISSING)):
            result = adapter.render({'text':'Merhaba'}, directory)
        self.assertFalse(result['ok'])
        self.assertEqual(result['error_code'], 'model_files_missing')
        self.assertEqual(result['mesaj'], engine.MODEL_MISSING)

    def test_unverified_audio_has_error_in_result_json(self):
        directory = MagicMock()
        directory.__truediv__.return_value.exists.return_value = False
        result = {'ok':False,'cancelled':False,'text':'Merhaba'}
        adapter.finish(directory, {'headless':True}, result)
        self.assertEqual(result['error_code'], 'audio_failed')
        self.assertIn('Yeniden dene', result['mesaj'])

if __name__ == '__main__':
    unittest.main()
