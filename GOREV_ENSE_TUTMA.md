# GÖREV: Sürüklerken kedi gibi ensesinden tutulsun

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_ENSE_TUTMA.md (ilk satır `SONUC: TAMAM` / `SONUC: YARIM - <neden>`)
Log: docs/kanit/ense_tutma/log.txt
Önce oku: SONUC_PET_GERI.md (sürükle-bırak-dön nasıl yapıldı), SONUC_STUDYO_UYGULA.md (kullanıcı tasarımı — ona DOKUNMA).

Kullanıcı: "Fareyle tuttuğunda kedi gibi alsın, onu ensesinden gezdirsin."

1. Tutma noktası: fareye basınca pet, fare imleci karakterin ENSESİNDE (baş ile gövde arası, üst orta) olacak şekilde konumlanır — nereden tıklanırsa tıklansın kısa (~120 ms) kayarak ense imlecin altına gelir.
2. Sarkma: karakter imlecin altından AŞAĞI SARKAR; dönme merkezi (transform-origin) ense noktası.
3. Sallanma (sarkaç): yatay fare hızına göre karakter ters yöne eğilir (en fazla ±25°), bırakınca/durunca yaylanarak (sönümlü yay) dik konuma gelir. Hızlı salınca biraz uzar (scaleY ≤1.06), yavaşlayınca normale döner. 60 fps, requestAnimationFrame.
4. Ayaklar havada sallanıyor hissi: tutulurken çok hafif yukarı-aşağı esneme (nefes gibi, 0,6 sn).
5. Kare: sürükleme sekansındaki kareyi kullan (`SEKANSLAR.surukleme`, kullanıcı stüdyodan değiştirebilir). Yeni görsel ÜRETME.
6. Bırakınca: mevcut davranış — yumuşakça Başlat yanındaki yerine döner (sallanma sönerek), sonra yaslanma.
7. Tek tık (hareket < ~5 px) kart açmaya devam eder; ense kayması tık sırasında görünmesin (yalnız eşik aşılınca başlasın).
8. Hareket azaltma (prefers-reduced-motion) açıksa sallanma yok, yalnız sarkma.
9. Stüdyoya da ekle (studyo/animasyon_studyo.html): sahnede pet'i tutunca aynı ense+sarkaç davranışı; "Sallanma gücü" kaydırıcısı, JSON'a `tutma: {guc}`; studyo/uygula.py bu alanı pet.ts'e taşısın. (Gemini'nin efekt işi studyo'yu bitirmiş olmalı — SONUC_STUDYO_EFEKT.md'yi kontrol et; bitmediyse stüdyo kısmını atla ve SONUC'a yaz.)

Test: sarkaç hesabı (hız→açı, sönüm, sınırlar), ense noktası hesabı, tık/sürükle eşiği. tsc, npm test, cargo test --offline yeşil.
Exe: dist exe → dist/onceki/ zaman damgalı yedek, `npm --offline run pack` (windows/). Kısayolu Claude günceller.
YASAK: kullanıcının sekans/ms/PET_AYAR değerleri; görsel dosyaları; git; görünür pencere; island.rs.
