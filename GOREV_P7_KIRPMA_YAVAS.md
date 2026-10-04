# P7: Mini pet göz kırpması yavaşlasın (animasyon hız/bekleme kontrolü)
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakikada bitir. Exe YOK, git YOK, görünür pencere YOK, görsel dosyalarını DEĞİŞTİRME/yeniden kodlama YOK, island.rs dokunma. TAMAM yazmadan önce testi koştur, çıktıyı SONUC'a yapıştır. Düzenlemeden önce dosyayı yeniden oku; başka ajanın değişikliğini (P3 ense, P6 sığdır) silme.
Sonuç: SONUC_P7.md
Önce oku: SONUC_P6.md (bitmiş olmalı).

Sorun: kullanıcı "mini pette göz kırpma çok hızlı". Mini pet beklemede `/afu/durum/bekleme.webp` oynuyor: 11 kare ≈0,7 sn'lik döngü, göz kırpma döngünün içinde → her 0,7 sn'de bir kırpıyor.
Çözüm (dosyayı değiştirmeden): animasyonlu webp'yi `<img>` yerine (ya da onun yanında) tarayıcının ImageDecoder API'siyle kare kare canvas'a çizen küçük bir oynatıcı (WebView2/Chromium destekler; yoksa eski <img> davranışına geri dön):
- Animasyon başına ayar: `hiz` (0,25–2; varsayılan 1) ve `donguArasi` (ms; döngü bitince ilk karede bekleme, rastgele ±%30).
- Varsayılan: bekleme → hiz 0,5 (kullanıcı: "animasyonu yavaşlatalım" — 2 kat yavaş), donguArasi 3500 ms (doğal kırpma: 3–5 sn'de bir). Diğer animasyonlar hiz 1, donguArasi 0 (değişmez).
- Ayarlar PET_AYAR yanında tek tabloda (ör. PET_OYNATMA); stüdyo dışa aktarımı ileride bu alanı yazabilsin diye studyo/uygula.py'ye `oynatma: {sekans: {hiz, donguArasi}}` alanını doğrulamalı ekle.
- P6 sığdırma/ölçek ve P3 ense dönüşümleri canvas'a da aynen uygulanmalı (aynı element üzerinde transform).
Test: oynatıcı zamanlaması (sahte zamanlayıcı + sahte decoder): hiz ve donguArasi doğru; decoder yoksa <img>'e düşer. cd windows; tsc --noEmit; npm test tümü yeşil; pytest tests/test_studyo_uygula.py.
