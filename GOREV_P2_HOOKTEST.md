# P2: Claude köprü testi
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakikada bitir. Exe paketleme YOK, git YOK, görünür pencere YOK, görsel/ses dosyalarına dokunma, island.rs dokunma. TAMAM yazmadan önce kendi testini koştur ve çıktısını SONUC dosyasına yapıştır. Başka ajanın değişikliğini silme; dosyayı düzenlemeden hemen önce yeniden oku.
Sonuç: SONUC_P2.md
python -m pytest -q tests/test_claude_hook.py → 1 failed + 2 errors (test_malformed_silent parametresi çok uzun; Windows yol/dosya adı sınırı). Test kimliklerini kısa ver (ids=) ve tmp yolunu kısalt; scripts/claude_kopru/afu_hook.py davranışını DEĞİŞTİRME (gerçekten hata varsa düzelt ve SONUC'a yaz).
Test: python -m pytest -q tests  (tümü yeşil olmalı).
