# P6: Mini pet çerçeveden taşmasın — çerçeveye göre sığdır
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakikada bitir. Exe paketleme YOK, git YOK, görünür pencere YOK, görsel/ses dosyalarına dokunma, island.rs dokunma. TAMAM yazmadan önce kendi testini koştur ve çıktısını SONUC'a yapıştır. Dosyayı düzenlemeden hemen önce yeniden oku; başka ajanın değişikliğini silme.
Sonuç: SONUC_P6.md
Kullanıcı görüntüsü: docs/kanit/pet_anim/kullanici_tasma_0210.png — uçuş animasyonunda karakter 256 px pencerenin dışına taşıyor, kafa sol kenarda KESİLİYOR. Kullanıcı: "Dışarı taşma olmasın, çerçeve içerisindeki boyuta göre büyüt."

Yap (windows/src/afu/pet.ts, ölçek/konum uygulayan yer):
1. Her kare/animasyon için alfa sınır kutusu tablosunu kullan (studyo/boyut_tablosu.json veya pet.ts PET_BOYUT — ölçülmüş bbox oranları; yoksa scripts/boyut_olc.py ile üret, görseli DEĞİŞTİRMEDEN).
2. Son dönüşüm (PET_AYAR olcek × normalize × ense/scruff) uygulandıktan sonra karakterin kutusu PET_PENCERE (256) içinde kalmalı, 6 px kenar payıyla: sığmıyorsa ölçeği ORANTILI küçült ve kutuyu içeri kaydır (clamp). Sığıyorsa dokunma — kullanıcı tasarımı korunur.
3. Yani: "çerçeveye sığacak en büyük boy" — her animasyonda karakter çerçeveyi olabildiğince doldursun ama hiçbir kenardan taşmasın. Ayakların görev çubuğuna oturduğu bekleme pozunda alt hizayı koru.
4. Saf fonksiyon: sigdir(kutu, olcek, x, y, pencere=256, pay=6) → {olcek, x, y}; vitest: taşan uçuş kutusu → içeri alınır; sığan kutu → değişmez; sol/sağ/üst/alt taşma durumları.
Doğrula: cd windows; node node_modules/typescript/bin/tsc --noEmit; npm test (tümü yeşil). Başsız görüntü: ucus, kalkis, masa_cikis, bekleme kareleri 256 pencerede taşmadan → docs/kanit/p6/.
