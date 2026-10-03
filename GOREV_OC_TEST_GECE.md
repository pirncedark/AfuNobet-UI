# GÖREV (OpenCode): Gece sonu test taraması
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_OC_TEST_GECE.md — İLK SATIR `SONUC: TAMAM` / `SONUC: YARIM - <neden>`; altına komut çıktılarının son satırlarını AYNEN yapıştır.
Bu gece yapılan işler: SONUC_P3, P6, P7, P8, P9, P10, P11, P4, P5 (oku).
1. Her iş için testi OLMAYAN davranışları bul ve YENİ test dosyası `windows/tests/gece_kontrol.test.ts`'e yaz (mevcut testleri değiştirme): ense noktası, sığdırma (taşan kutu içeri alınır), oynatıcı hiz/donguArasi, soru kartında seçenekler görünür, balon × ile kapanana kadar kalır, pet balonunda pencere yukarı büyür, sarkaç sınırları.
2. Kaynak kodu (src/) DEĞİŞTİRME. Kırmızı test → atlama yok; SONUC'a "olası hata: …" + kanıt.
3. cd windows; node node_modules/typescript/bin/tsc --noEmit; npm test. cd ..; python -m pytest -q tests.
YASAK: exe, git, görünür pencere. Okuduktan sonra DURMA.
