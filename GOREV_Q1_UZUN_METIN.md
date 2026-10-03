# Q1: Uzun metin + TR/EN dayanıklılığı (plan F8, F13)
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakika. Exe YOK, git YOK, görünür pencere YOK, island.rs DEĞİŞMEZ, görsel/ses dosyası YOK. Düzenlemeden önce dosyayı yeniden oku; önceki işlerin değişikliklerini silme. TAMAM yazmadan önce: cd windows; node node_modules/typescript/bin/tsc --noEmit; npm test — çıktının son satırlarını SONUC dosyasına AYNEN yapıştır. Okuduktan sonra DURMA.
Sonuç: SONUC_Q1.md
- Görev adı, ajan mesajı, balon, sohbet, soru kartı: çok uzun (300+ karakter, boşluksuz uzun kelime, uzun URL) metinler kırpılır ("…") ve tam metin title/tooltip ile görünür; düzen bozulmaz.
- TR/EN: arayüz metinleri Türkçe karakterlerle (İ, ş, ğ) ve İngilizce uzun karşılıklarla kırpılmadan/taşmadan durur (labels.ts). Dil değişimi varsa bozulmaz; yoksa SONUC'a "dil değişimi yok" yaz.
- Vitest: uzun metin vakaları (kırpma + title). Başsız görüntü → docs/kanit/q1/.
