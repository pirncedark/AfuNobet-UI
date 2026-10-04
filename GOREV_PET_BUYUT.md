# GÖREV: Mini pet 3 kat büyüsün + Claude köprü test hatası

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_PET_BUYUT.md (ilk satır `SONUC: TAMAM` / `SONUC: YARIM - <neden>`)
Log: docs/kanit/pet_buyut/log.txt
Kullanıcı görüntüsü: docs/kanit/pet_anim/kullanici_kucuk_0130.png — "çok küçük olmuş, 3 katı kadar büyümeli".

## 1) Boyut
- Şu an pet penceresi 128 px (windows/src/style.css `#afu-pet` 128px; windows/src-tauri/src/taskbar.rs `physical_for(128.0, …)` ve testleri) ve bekleme PET_AYAR olcek 68 → ekranda ~87 px karakter.
- Hedef: karakter ekranda ~3 kat (≈260 px). Yap: pet pencere boyutunu TEK sabite bağla (TS ve Rust'ta aynı ad, ör. PET_PENCERE = 256), 128 geçen tüm pet yerlerini buna çevir (konum hesabı, DPI, görev çubuğu üstü, sürükleme/dönüş hedefi, ense noktası, tıklama alanı/hit, ön yükleme). PET_AYAR'da `bekleme.olcek` 68 → 100 (kullanıcı onayı: 3 kat büyüt). Diğer PET_AYAR değerlerine dokunma; x/y ofsetleri 128 tabanlıysa ×2 ölçekle (oran korunsun) ve SONUC'a yaz.
- Karakter tam görünmeli (kafa üstü + ayaklar), görev çubuğunun arkasına girmemeli; pencere görev çubuğu üstünde, Başlat yanında. DPI %100/%125/%150 testleri güncelle.
- Stüdyo (studyo/animasyon_studyo.html): sahnedeki pet kutusu da 256 olsun (gerçek boyut önizleme); studyo/uygula.py ve testleri buna uysun.

## 2) Test hatası
- `python -m pytest -q tests` → 1 failed + 2 errors, tests/test_claude_hook.py (test_malformed_silent parametresi çok uzun dosya adı/argüman üretiyor olabilir). Düzelt (scripts/claude_kopru/afu_hook.py davranışını bozmadan); tüm pytest yeşil.

Doğrulama: tsc, npm test, cargo test --offline, pytest tests — hepsi yeşil (sayılar SONUC'a). Başsız görüntü: 256 pencerede bekleme karesi tam görünür (docs/kanit/pet_buyut/).
EXE PAKETLEME YAPMA — Claude ayrı derleyecek (Rust derlemesi zaman aşımına uğruyor).
YASAK: sekans/ms değerleri; görsel dosyaları; island.rs; git; görünür pencere; ~/.claude.
Önce oku: SONUC_ENSE_TUTMA.md (ense/sarkaç eklendi — ona uyumlu ölçekle).
