# P9: Soru kartında seçenekler görünmüyor
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakika. Exe YOK, git YOK, görünür pencere YOK, island.rs DEĞİŞMEZ, pet.ts dokunma. Düzenlemeden önce dosyayı yeniden oku (P8 kartı 1,5 kat büyüttü — onu koru). TAMAM'dan önce testleri koştur, çıktıyı SONUC'a yapıştır.
Sonuç: SONUC_P9.md
Kanıt: docs/kanit/sorukart/sorukart-normal-sonra.png — uzun soruda metin + kod kutusu kartı dolduruyor, CEVAP SEÇENEKLERİ ve "Diğer" alanı görünmüyor (alt menünün altında kalmış). Kullanıcı soruyu cevaplayamaz.
Yap (windows/src/question/question.css + soru kartı görünümü):
- Seçenek düğmeleri ve cevap alanı HER ZAMAN görünür (kartın altına sabit); soru metni + ayrıntı (kod kutusu) bölümü kendi içinde kaydırılır (max-height, overflow:auto), ayrıntı varsayılan kapalı "Ayrıntı" ile açılır.
- Soru kartı açıkken alt menü (Kota durumu…Küçült, Afu'ya sor) gizlenir; kart kapanınca geri gelir.
- Başsız görüntü: uzun soru + 4 seçenek + Diğer → normal ve 1366×768 → docs/kanit/p9/ ; seçenekler görüntüde görünmeli.
Doğrula: cd windows; tsc --noEmit; npm test.
