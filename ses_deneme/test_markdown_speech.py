"""Sol speech removes markup without rewriting answer content."""
import pytest
from afu_konus import speech_text
import uygulama_sesi as adapter

@pytest.mark.parametrize(('source', 'expected'), [
    ('**Merhaba** `API` 123', 'Merhaba API 123'),
    ('# Başlık\n## Alt başlık', 'Başlık\nAlt başlık'),
    ('- bir\n* iki\n+ üç\n1. dört\n  23. beş', 'bir\niki\nüç\ndört\n  beş'),
    ('[belge](https://example.com) ve https://example.com', 'belge ve https://example.com'),
    ('```python\nprint(123)\n```', 'python\nprint(123)\n'),
    ('API 123 C:/ses/test.wav x_y ~ işaret 😀\nTraceback ayrıntısı', 'API 123 C:/ses/test.wav x_y ~ işaret 😀\nTraceback ayrıntısı'),
    ('', ''),
])
def test_only_markdown_markers_are_removed(source, expected):
    assert speech_text(source) == expected

def test_legacy_replacements_require_explicit_flag():
    assert speech_text('`API` 123', legacy=True) == 'Ayrıntıyı ekrana yazdım. yüz yirmi üç'

def test_adapter_preserves_answer_beyond_old_length_limit(tmp_path, monkeypatch):
    monkeypatch.setattr(adapter, 'LOCAL', None)
    text = 'Merhaba ' * 5000
    assert adapter.render({'text': text}, tmp_path)['text'] == text
