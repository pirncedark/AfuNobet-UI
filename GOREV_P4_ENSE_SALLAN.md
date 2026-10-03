# P4: Enseden tutma — kedi gibi sallanma
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakikada bitir. Exe paketleme YOK, git YOK, görünür pencere YOK, görsel/ses dosyalarına dokunma, island.rs dokunma. TAMAM yazmadan önce kendi testini koştur ve çıktısını SONUC dosyasına yapıştır. Başka ajanın değişikliğini silme; dosyayı düzenlemeden hemen önce yeniden oku.
Sonuç: SONUC_P4.md
Önce SONUC_P3.md'yi oku (P3 bitmiş olmalı).
Yap (windows/src/afu/pet.ts): tutulurken yatay fare hızına göre ters yöne eğilme (en fazla ±25°), sönümlü yay ile dik konuma dönüş, hızlı sallamada scaleY ≤1.06, hafif bacak sallanması (0,6 sn nefes benzeri). requestAnimationFrame; prefers-reduced-motion açıksa sallanma yok. Bırakınca sallanma sönerek mevcut dönüşe geçer. Hesabı saf fonksiyona ayır (ör. sarkac(adim, hiz, dt)).
Test: sarkaç hesabı (sınırlar, sönüm, hız→açı) vitest. cd windows; tsc --noEmit; npm test tümü yeşil.
