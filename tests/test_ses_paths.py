"""Portable voice path checks: no synthesis, models or virtual environment changes."""
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

VOICE_ROOT = Path(__file__).resolve().parents[1] / 'ses_deneme'
spec = importlib.util.spec_from_file_location('afu_paths_under_test', VOICE_ROOT / 'afu_konus.py')
afu = importlib.util.module_from_spec(spec)
spec.loader.exec_module(afu)


class SesPathsTest(unittest.TestCase):
    def test_worktree_finds_shared_installation_without_configuration(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            root = base / '_wt' / 'w9-ses' / 'ses_deneme'
            root.mkdir(parents=True)
            shared = base / '_deneme' / 'ses'
            shared.mkdir(parents=True)
            self.assertEqual(afu.resolve_local(root), shared)

    def test_priority_missing_candidates_and_moved_directory(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            root = base / 'moved' / 'ses_deneme'
            configured = base / 'custom'
            portable = root.parent / 'ses'
            legacy = root.parent.parent / '_deneme' / 'ses'
            for path in (root, configured, portable, legacy):
                path.mkdir(parents=True)
            self.assertEqual(afu.resolve_local(root, str(configured)), configured)
            configured.rmdir()
            self.assertEqual(afu.resolve_local(root, str(configured)), portable)
            portable.rmdir()
            self.assertEqual(afu.resolve_local(root), legacy)
            legacy.rmdir()
            self.assertIsNone(afu.resolve_local(root))

    def test_missing_installation_returns_text_without_constructing_voice(self):
        sys.path.insert(0, str(VOICE_ROOT))
        try:
            import uygulama_sesi as worker
            with tempfile.TemporaryDirectory() as temporary, patch.object(worker, 'LOCAL', None), patch.object(worker, 'Voice') as voice:
                result = worker.render({'text': 'Metin yanıtı devam eder.'}, Path(temporary))
                self.assertTrue(result['missing_installation'])
                self.assertEqual(result['text'], 'Metin yanıtı devam eder.')
                self.assertFalse(result['ok'])
                voice.assert_not_called()
        finally:
            sys.path.pop(0)


if __name__ == '__main__':
    unittest.main()
