# 5b sabit varsayılan ses sonucu

Varsayılan ses: afu_5b. Mevcut nötr ses kimliği ve referansı kullanılır; kısa, orta ve uzun cevapların tamamında sakin enerji, exaggeration=0.35, cfg_weight=0.5 ve varsayılan sicak filtre uygulanır. Diğer adayların otomatik enerji davranışı korunur. Önceden açıkça kaydedilmiş kullanıcı seçimleri korunur. İlk kullanımda Afu · Önerilen seçili gelir; diğer dört aday listede kalır.

## Bu görevde değişen kaynak dosyaları

- ses_deneme/afu_konus.py: adlandırılmış varsayılan ve uzunluktan bağımsız sakin enerji.
- ses_deneme/ayar.json: afu_5b varsayılanı.
- ses_deneme/uygulama_sesi.py: varsayılan ses ve gerçek voice_parameters çıktısı.
- ses_deneme/test_sohbet.py: kısa/uzun cevap parametre regresyonu ve varsayılan testleri.
- windows/src-tauri/src/voice/afu.rs: varsayılan, kullanılabilir sesler ve seçim kalıcılığı testleri.
- windows/src/chat/voice-picker.ts: önerilen ses ve mevcut adaylar.
- windows/tests/chat.test.ts: ilk kullanımda seçili ses, sıcak filtre ve Önerilen etiketi.

## Gerçekten çalıştırılan testler

| Komut | Başarılı | Başarısız | Atlanan |
|---|---:|---:|---:|
| python -B ses_deneme/test_sohbet.py | 17 | 0 | 0 |
| windows/ içinde npm test | 284 (22 dosya) | 0 | 0 |
| windows/ içinde cargo test | 187 | 0 | 4 |

Rust dağılımı: birim 97, apps_contract 30, apps_runtime_contract 12, codex_protocol 18, config 1, voice_backend 29. Atlananlar: owned-child fixture iki derleme hedefinde; yerel Whisper WAV testi iki hedefte. Regresyon testi uygulama öncesinde başarısız, uygulama sonrasında başarılı oldu.

## Exe ve yedek

node node_modules/@tauri-apps/cli/tauri.js build --no-bundle ve ardından node scripts/pack.mjs windows/ içinde başarıyla çalıştı. TypeScript ve Vite üretim derlemesi başarılı. Mevcut kullanılmayan kod/ithalat uyarıları derlemeyi engellemedi.

Yeni exe: dist/afunobet-ui.exe
SHA256: d6cc24a03df07f372906703f1d992bb8051990dfcd5dfc43b6d41e80f6cb1f2f
Release exe, paket exe ve build-manifest.json hash değerleri aynı.

Yedek: dist/onceki/afunobet-ui.exe
Ek arşiv: dist/onceki/5b-sabit-20261002/afunobet-ui.exe
Yedek SHA256: 1b0bad6d922f9d4b31976d58ad3d9ea2defb8830c1591f3b1dd81c55ae227d91
GERI_AL.ps1 içeriği korunup hash ile doğrulandı; önceki daha eski yedek ayrıca 5b-sabit-20261002/daha-onceki.exe olarak korundu. Derleme başarılı olduğundan geri alma çalıştırılmadı.

## Headless gerçek ses kanıtı

WAV: ses_deneme/cikti/5b_sabit_kanit/answer.wav
Parametre kaydı: ses_deneme/cikti/5b_sabit_kanit/result.json
İstek: ses_deneme/cikti/5b_sabit_kanit/request.json (ses belirtilmeden varsayılan yol, headless=true).
Metin: Merhaba, birlikte devam edelim.
Süre: 3.6365833333333333 saniye; 24000 Hz, mono.
voice=afu_5b; energy=sakin; exaggeration=0.35; cfg_weight=0.5; filter=sicak; quality_verified=true.
İlk yerel konuşma doğrulamasından sonra tek tekrar üretimle metin doğrulandı. Parametreler e2e.json ikinci turundaki seçilmiş 5b değerleriyle birebir karşılaştırıldı.

Exe açılmadı, ses çalınmadı, yeni pencere açılmadı. Ücretli API kullanılmadı; yerel Chatterbox ve Whisper kullanıldı. ses_adaylari/ ve afu-character/ üzerinde bu görev kapsamında değişiklik yapılmadı. Git commit/push yapılmadı.

SONUC: TAMAM
