# P10: Mini pet (Başlat yanında) iken görev mesajı başının üstünde
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakika. Exe YOK, git YOK, görünür pencere YOK, island.rs DEĞİŞMEZ, görsel/ses yok. Düzenlemeden önce dosyayı yeniden oku (P3 ense, P6 sığdır, P7 oynatıcı değişikliklerini koru). TAMAM'dan önce testleri koştur, çıktıyı SONUC'a yapıştır.
Sonuç: SONUC_P10.md
Önce oku: SONUC_KONUSAN_AFU.md (balon katmanı), SONUC_P6.md.
Kullanıcı: "Pet hâlinde Başlat menüsündeyken görev mesajı başının üstünde gözüksün."
Yap:
- Mini pet modundayken gelen görev/ajan mesajı (konuşma balonu: iş başladı, bitti, hata, soru bekliyor) karakterin BAŞININ ÜSTÜNDE çizgi-roman balonu olarak görünür (kuyruk karakterin başına bakar).
- 256 px pet penceresi balona yetmiyorsa: balon görünürken pencere YUKARI doğru büyür (alt kenar = görev çubuğu üstü sabit; karakter yerinden oynamaz), balon kapanınca eski boyuta döner. Konum hesabı mevcut taskbar/pet_konumu mantığıyla; DPI %100/%125/%150.
- Balon: SONUC_P11.md'deki ortak balon kurallarını kullan — kullanıcı × ile kapatana kadar KALIR (otomatik kapanma yok), temiz metin, +N rozeti; tıklayınca kart açılır. Tam ekran oyunda gösterme.
- Balon açıkken pencerenin boş (şeffaf) kısmı tıklamayı geçirsin (click-through mantığı mevcut hit.ts ile).
Test: pencere yükseklik hesabı (balonlu/balonsuz), kesme, kuyruk; vitest + gerekirse cargo test. cd windows; tsc --noEmit; npm test; cd src-tauri; cargo test --offline.
