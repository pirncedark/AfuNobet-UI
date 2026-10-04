# P8: Görev kartı 1,5 kat büyük + yazılar okunur + sağlık şeridi düzgün
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakikada bitir. Exe YOK, git YOK, görünür pencere YOK, görsel/ses dosyaları YOK, windows/src-tauri/src/island.rs BAYT BAYT DEĞİŞMEZ. TAMAM yazmadan önce testleri koştur, çıktıyı SONUC'a yapıştır. Düzenlemeden önce dosyayı yeniden oku; başkasının değişikliğini silme (pet.ts'e DOKUNMA — başka ajan çalışıyor).
Sonuç: SONUC_P8.md
Kullanıcı görüntüsü: docs/kanit/pet_anim/kullanici_kart_kucuk_0220.png — "1,5 katı büyüyebilir, yazılar çok ufak."

1. Kart (ada açık hali) tüm ölçüleriyle 1,5 kat: pencere genişlik/yükseklik (windows/src/core/layout.ts kart ölçüleri ve pencere boyutunu ayarlayan Rust tarafı — island.rs DIŞINDA bir yerden; island.rs'e dokunmadan mümkün değilse SONUC'a yaz ve dur), yazı boyutları, boşluklar, düğmeler, karakter. Tercihen tek bir ölçek değişkeni (--kart-olcek: 1.5) ile; DPI hesabı bozulmasın; tıklama alanı (hit.ts) yeni boyutla eşleşsin.
2. En küçük yazı ≥ 13 px (1,5 sonrası), alt menü yazıları ≥ 14 px, başlık ≥ 20 px.
3. Sağlık şeridi şu an ham metin gibi duruyor ("AfuNöbet ✓Codex ✓Sesler ✓Claude ✗", büyük ve sıkışık): küçük hap/rozetler hâline getir (yeşil ✓ / gri ✗, aralıklı, kartın stiline uygun). Ayrıca üstteki "Afu bağlantısı: Claude ✓" ile şeritteki "Claude ✗" ÇELİŞİYOR — aynı kaynağı kullansınlar (Claude köprüsü: son 5 dk'da mesaj ya da ada_canli + hook kurulu) ve tutarlı olsun; iki satırdan birini kaldır (sade).
4. Kart ekrana sığmalı: 1366×768 @%100 ve 1920×1080 @%150'de taşmasın (gerekirse ölçek küçülür).
Doğrula: cd windows; tsc --noEmit; npm test; cd src-tauri; cargo test --offline. Başsız ekran görüntüsü önce/sonra → docs/kanit/p8/.
