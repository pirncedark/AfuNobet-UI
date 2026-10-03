# GÖREV (gemini): test_pet_cut kırmızısını doğru yoldan düzelt
Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kalan test: tests/test_pet_cut.py::test_left_gaze_is_lossless_source_mirror_and_public_asset_matches. Sebep: pet karelerinde beyaz hale ELLE temizlendi (afu-character/pet/*.png ve windows/public/afu/pet/*.webp), kesim hattı (test içindeki `cut` modülü: green_key vb.) bunu üretmiyor.
Doğru çözüm: hale temizliğini kesim hattına (cut modülü, green_key sonrası) taşı — algoritma: alt %30 bölgede, şeffafa komşu, parlak (min kanal>165 veya açık mavi-beyaz) pikselleri en fazla 5 tur şeffaflaştır, sonra yeni kenar alfa ≤200. Referans uygulama: C:\Users\afuuu\AppData\Local\Temp\claude\C--Users-afuuu\660330b8-3bd2-4e77-bca8-853c7e04d69d\scratchpad\halo.py. Sonra test beklentisi hattın çıktısıyla birebir eşleşmeli (testi gevşetme/silme). Gerekirse teslim karelerini hattan yeniden üret; görsel kalite ve boyut değişmesin, webp kayıpsız.
Bitince `python -m pytest -q tests` tamamı geçmeli (AfuNobet-UI kökünde).
Yalnız: cut modülü dosyası, ilgili test, afu-character/pet ve windows/public/afu/pet görselleri. Exe derleme yok, commit/push yok, Claude çağırma.
Log: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\log\gemini_pet_cut.log
Çıktı: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\SONUC_PET_CUT.md ilk satır SONUC: TAMAM|YARIM.
