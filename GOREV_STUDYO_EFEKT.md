# GÖREV: Stüdyoya hazır efektler (kullanıcı hızlıca düzeltecek)

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Dosya: studyo/animasyon_studyo.html (+ studyo/uygula.py şema)
Sonuç: SONUC_STUDYO_EFEKT.md (ilk satır `SONUC: TAMAM` / `SONUC: YARIM - <neden>`)
Log: docs/kanit/studyo_efekt/log.txt

Kullanıcı: "Sen yeni efektlerle güncellemeleri yap, ben üzerinde hızlıca düzeltmeler yapayım." Önce GOREV_BOYUT_ESITLE sonucunu (SONUC_BOYUT_ESITLE.md) oku; onun eklediği "Boyutları eşitle" düğmesini KORU.

## Efekt paneli (sekans başına, her biri aç/kapa + tek kaydırıcı "güç")
1. Nefes: hafif yukarı-aşağı esneme (scaleY 1→1.03, 2,4 sn döngü).
2. Zıplama: başarıda küçük zıplama + inişte ezilme-esneme (squash & stretch).
3. Sallanma: hata/uyarıda kısa yatay titreme.
4. Yumuşak geçiş: kareler arası çapraz solma (ms ayarlı) — kare kare atlamayı yumuşatır.
5. Gölge: ayak altında yumuşak elips gölge (zıplamada küçülür).
6. Parıltı: karakter çevresinde hafif ışık (renk seçici, altın varsayılan).
7. Kıvılcım: başarıda küçük yıldız parçacıkları (CSS, görsel dosyası yok).
8. Göz kırpma zamanlaması: eski kırpma karelerini rastgele 3–7 sn arayla araya sokar.
- HAZIR AYARLAR (tek tık, sekansa uygular): "Sakin", "Neşeli", "Uykulu", "Heyecanlı". Kullanıcı sonra kaydırıcıyla düzeltir.
- Önce/sonra: "Efektsiz göster" basılı tutunca efektler kapanır (karşılaştırma).
- Hepsi CSS/JS ile; GÖRSEL DOSYASI ÜRETME/DEĞİŞTİRME. Uygulamadaki karşılığı olacak şekilde CSS animasyonu olarak dışa aktar: JSON'a `efektler: { sekans: { nefes:{acik,guc}, ... } }`; uygula.py bu alanı doğrulasın (henüz pet.ts'e YAZMA — `--dene` farkı göstersin).
- Sade arayüz: efektler sağda katlanır "Efektler" bölümü; teknik terim yok.

Doğrulama: başsız Chromium — sayfa hatasız, 8 efekt + 4 hazır ayar çalışır, dışa aktar şemaya uyar, 390 px dar ekranda taşma yok; ekran görüntüleri docs/kanit/studyo_efekt/. pytest yeşil.
YASAK: windows/src, exe, görsel dosyaları, git, görünür pencere açma.
