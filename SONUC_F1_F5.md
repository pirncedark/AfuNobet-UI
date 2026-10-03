SONUC: YARIM - F1–F5 ve F7 uygulandı; npm test içindeki kapsam dışı pet-kirpma.test.ts hatası nedeniyle tüm testler yeşil değil.

# F1–F5 + F7 sonucu

Görev dosyası, CLAUDE.md, GOREV_COUCOU_AFU.md, AFU_CHANGES.md, planın F1–F5/F7 maddeleri ve veri sözleşmeleri okundu. UI salt okunur sınırı korundu.

## Gerçek veri ölçümü

Kaynak: ../AfuNobet/state.json. Ölçülen 234 görevde stage, handoff, model, effort, context ve cost alanlarının her biri için mevcut alan sayısı 0. Kanıt: docs/kanit/f1_f5/veri_olcumu.json.

AfuNobet/afu/ui_state.py salt okunarak incelendi: kayıtlı subagent_model/checkpoint.model varsa isteğe bağlı model alanı üretiyor; aşama, devir, effort, bağlam ve maliyet alanlarını üretmiyor. AfuNobet/afunobet.py içindeki MODEL/NOBET satırları yerel ayar/durum bilgisi; görevle eşleştirilmiş canlı ölçüm değil. Bunlar aktif görevin modeli olarak tahmin edilmedi, CLI/süreç başlatılmadı. docs/AFU_DURUM_SOZLESMESI.md uygulama durumları içindir; görev ayrıntıları içermez.

## Uygulanan maddeler

| Madde | Uygulama | Ölçülen gerçek veride durum |
| --- | --- | --- |
| F1 | stage alanını okuyup TRIAGE → SPLIT → RUN → VERIFY → MERGE için Ayırma, Bölme, Çalışma, Doğrulama, Birleştirme etiketli küçük adım çizgisi gösterir; aktif adım vurgulu ve erişilebilir. | veri yok, gizli |
| F2 | Açık handoff kaydındaki from/to/reason üzerinden tek satır devir veya bekleme gösterir. Claude hem kaynak hem hedef olarak engellendi; yalnız mevcut Claude KORUNUYOR rozeti kalır. Bilinmeyen sebep/ajan ve aynı ajana devir gizlidir. | veri yok, gizli |
| F3 | Gerçek model ve doğrulanmış effort bilgisi küçük gri yazıyla gösterilir. Model yoksa veya ?/— ise ilgili bilgi gizlenir. | veri yok, gizli |
| F4 | Geçerli context.used/context.total üzerinden ayrıntı görünümünde ince çubuk ve ölçülmüş kullanım gösterilir. Ana ekranda yer kaplamaz. | veri yok, gizli |
| F5 | Yalnız state içindeki sayısal cost verisi gösterilir; mevcut görünüm sözleşmesinde USD. Sıfır gerçek ölçüm olarak korunur; negatif/sonsuz/metin veri gizlidir. | veri yok, gizli |
| F7 | Plan gereği 10+ görevde arama düğmesi; görev listesinde arama kutusu, ajan filtresi ve Çalışıyor/Bekliyor/Bitti/Hata durum filtresi. Türkçe harfler desteklenir. Güncel olmayan bitmiş görev seçimi kendi ayrıntısını açar. | 234 görev ile erişilebilir |

Bu alanlar UI okuyucusuna bağlandı; AfuNöbet tarafına kod yazılmadı. Gelecekte veri gelirse yalnız doğrulanmış değer gösterilecek. Hatalı ek alanlar geçerli görev kaydını bozmaz; durum ve kota alanlarından aşama/devir/model/bağlam/maliyet türetilmez.

## Doğrulama

- Test öncesi yeni F1–F5/F7 testlerinde 14 testin 7 tanesi beklenen eksik ayrıştırma/gösterim nedeniyle başarısızdı; uygulama sonrası geçti. Bilinmeyen model işareti için ek RED → GREEN kontrolü yapıldı.
- node node_modules/typescript/bin/tsc --noEmit: PASS, çıkış 0.
- F1–F5/F7 hedefli testler + mevcut arayüz testleri: 57/57 PASS, çıkış 0.
- npm --offline test (npm test betiği): 377 PASS, 1 FAIL; toplam 378 test, 31 dosyanın 30 tanesi geçti; çıkış 1.
- Kalan hata: windows/tests/pet-kirpma.test.ts:25, fits the complete frame and jump inside a smaller viewport without island borders. Beklenen sol konum >= 0; ölçülen -24. Görev pet.ts ve pet CSS değişikliklerini açıkça yasaklıyor; hata giderilmedi, test atlanmadı ve beklenti gevşetilmedi.
- Rust değiştirilmedi; cargo test çalıştırılmadı. EXE paketleme, git işlemi, görünür pencere ve AfuNöbet yazımı yapılmadı. Gerçek Windows kullanıcı testi bu işte doğrulanmadı.

İlk npm çağrısı yanlışlıkla kök dizinden yapıldığı için package.json bulunamadı; windows dizininden tekrarlandı. Bir test düzenleme komutundaki göreli yol hatası da düzeltildi. Bu yürütme hataları logda kaydedildi.

## Değiştirilen dosyalar

- windows/src/core/state.ts
- windows/src/core/labels.ts
- windows/src/views/model.ts
- windows/src/views/views.ts
- windows/src/style.css: yalnız yeni f3-model-info, f4-context-track, f4-context-fill sınıfları eklendi.
- windows/tests/f1_f5.test.ts: yeni gerçek state ayrıştırma testleri.
- windows/tests/arayuz.test.ts: görev dosyasına aykırı eski beklentiler güncellendi; state → DOM, eksik/bozuk veri, bağlam çubuğu ve arşiv seçimi testleri eklendi.

Kanıtlar: docs/kanit/f1_f5/log.txt, veri_olcumu.json, tsc.txt, hedefli_test.txt, npm_test.txt.

Kalan kabul adımı: Pet işinin sahibi kırpma sorununu giderdikten sonra windows dizininde npm test yeniden çalıştırılmalı. F1–F5/F7 uygulaması tamamlandı; tüm-testler-yeşil kabul şartı henüz sağlanmadı.
