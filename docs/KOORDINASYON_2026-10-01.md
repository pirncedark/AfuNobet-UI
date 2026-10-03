Güncel durum: [DEVAM_2026-10-01.md](DEVAM_2026-10-01.md). Aşağıdaki tablo ilk keşfin tarihsel kaydıdır; dış Codex artık durmuş, son durum yukarıdaki kayıttadır.

# AfuNöbet UI koordinasyon ve plan denetimi

Tarih: 2026-10-01, Türkiye saati. Kullanıcı bu sohbette tam yetki verdi ve paralel ilerleme istedi.

## Mevcut iş ve sahiplik

- Mevcut dış Codex: PID 26484 (üst kabuk 21256), `GOREV_MASTER.md` görevini yürütüyor. Günlük: `C:/Users/afuuu/AppData/Local/Temp/subajan_codex_1790859226.log`. Bu iş bitmeden `windows/src`, `windows/src-tauri` ve mevcut pet üretim dosyalarına ikinci yazıcı başlatılmaz.
- `is_1790859225944538` eski DB kaydı HATA / subajan exit 1 (16:23), fakat aynı işe ait daha yeni günlük ve canlı süreç var. DB satırı güncel çalışma kanıtı olarak kullanılamaz.
- Root: bu rapor ve `docs/KABUL_FAZ_A.md`, genel denetim, sonuçları birleştirme.
- gpt_ses_deneme: `_deneme/ses/gpt_karakter_deneme.py`, `rt_aday/GPT-*` ve ses raporu. Mevcut Chatterbox sürecine ve betiklere dokunmaz.
- canli_uretici: AfuNobet `afu/ui_state_loop.py`, `afu/ui_state.py`, ilgili testler ve ayrı kurulum raporu. Motor, kota yenileyici, provider dosyalarına dokunmaz; sürekli süreç veya autostart başlatmaz.
- a14_eksik_gorseller: yalnız `delivery/A14-complement/` içine güncel 50 çıktılık sözleşmenin tamamlayıcı görsellerini ve doğrulamasını hazırlar. Üretim görsellerine eş zamanlı yazmaz.

## Planın tamamında görülen durum

| Alan | Kanıtlı durum | Kalan |
|---|---|---|
| Faz 0 | İlerleme kaydı, taban test çıktıları var; dal hâlâ main | Git dal koruması yapılmamış |
| A1-A4 | Önceki checkpoint TS 72, Rust 20+1, build PASS kaydı | Gerçek Windows pencere, tepsi, DPI kabulü |
| A5-A10 | Teslim üretici testleri 12 PASS kaydı; UI checkpoint PARTIAL | Ana AfuNobet deposuna entegrasyon ve canlı yenileme |
| A11-A13 | TS 95 ve 105 headless ekran görüntüsü kaydı | Son release, exe kopyası/hash, göz kırpma tamamlaması |
| A14 | Mevcut doğrulama 34 ana kare+simge; Python 3 PASS | 16:16 güncel görev sözleşmesindeki 50 ana PNG seti, kart/efekt/özel görseller ve simge türevleri |
| A15 | `a15-green.log`: Rust 26+1 PASS | Windows konum kabulü |
| A16 | `a16-green.log`: Rust 28+1 PASS | Gerçek kayma ve tam ekran kabulü |
| A17 | 16:54 son test TS 101 PASS / 1 FAIL; canlı dış Codex devam ediyor | 15 saniye sonra home->pet geçişi ve bütünleştirme |
| A18-A19 | Henüz tamamlanma kanıtı yok | Pet aç/kapat, kalıcı tercih, durum simgesi, son test/build/rapor |
| Kapı 1 | FAZ A = ACCEPTED kaydı yok | Gerçek Windows kullanıcı kabul testi |
| R1 | Commit/push yok | Kapı 1 sonrası kayıt; kullanıcının mevcut yetkisi ve açık plan kısıtları esas |
| Faz C | `AFU_MERKEZ_KESIF.md` ön araştırması var | C1-C3 uygulama kayıt/okuyucu/menü; Kapı 1 bağımlılığı |
| B0 | Plan model/libclang/crate hazırlığı yapıldığını yazıyor | Whisper bağlama hatası hâlâ açık; bağımsız doğrulama gerekli |
| Faz B | Üretim sohbet/dosya/mikrofon/ses modülleri yapılmadı | B1-B6; GPT ses tercihi eski Windows TTS tasarımıyla uzlaştırılacak |
| Faz D | İsteğe bağlı, başlamadı | V1 görsel kabulü sonrası gerekirse |

## Denetimde bulunan tutarsızlıklar

1. GOREV_MASTER eski kapsam satırı A1-A3 derken en üst ve son ek A1-A19 der. En üst ve güncel ek uygulanır.
2. A14 mevcut testin kendi 34 elemanlı CORE listesini doğrulaması, güncel 50 ana PNG sözleşmesini sağlamaz. Kapsam tamamlanmadan A14 tam PASS sayılmaz.
3. Kaynaktaki iki bakış karesi aynı yöne bakıyor. Sol/sağ doğruluğu PARTIAL kalır; üretilmeyen hareket varmış gibi anlatılmaz.
4. Kapı 1 eski #9 küçük hâl beklentisi mini pet varsayılanıyla çelişir. Güncel mini pet açıkken küçültme pete, kapalıyken bildirim alanına gider; eski başlatma hidden/petit davranışı ayrı sınanır.
5. Kapı 2 internet kapalıyken yeni Codex cevabı bekler. Yerel STT çevrimdışı çalışabilir; üyelikli uzaktaki Codex cevabı için bağlantı gerekir. Tam çevrimdışı sohbet iddia edilmez.
6. Kullanıcı son ses yönü: GPT seslendirme ve karakter yönlendirmesi. Ses denemesi ayrı alanda doğrulanır; eski ücretsiz/yerel Windows TTS planına sessizce ücretli API fallback eklenmez.
7. Dış AfuNobet Python tabanı 174 PASS / 32 FAIL olarak kayıtlı. Yeni UI hatası gibi sunulmaz; dar değişikliklerde ilgili regresyonlar koşulur.

## Tamamlanma sınırı

Otomatik testler ve gerçek Windows kabulü ayrı raporlanır. Kullanıcı afk olduğu için gözle/tıklayarak doğrulanmayan Windows davranışları UNVERIFIED kalır. Faz A kabul edilmiş gibi işaretlenmez. Paket indirme, sürekli servis, autostart, commit/push ve başka uygulamalara yazma için mevcut görev sınırları korunur.
