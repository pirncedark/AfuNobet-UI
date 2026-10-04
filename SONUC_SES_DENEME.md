SONUC: YEREL_YOL

2 Ekim 2026. Yerel Chatterbox ses üretimi ve yerel Whisper geri çevirisi doğrulandı. Mikrofon → Codex → karakter zinciri doğrulanmadı; uygulamaya entegrasyon yapılmadı. Tını/doğallık için insan dinlemesi henüz yok.

## 1 — Doğrudan Codex: BELİRSİZ

İki kurulu ikili de `codex-cli 0.159.2`:

- `C:\Users\afuuu\AppData\Local\OpenAI\Codex\bin\de8a38d2100ae498\codex.exe`
- `C:\Users\afuuu\AppData\Roaming\npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe`

İlk ikiliden gerçek deneysel şema üretildi: `ses_deneme/schema/`. Depodaki `docs/codex-protocol/` seçilmiş stabil şemaları içeriyor; aşağıdaki ses alanları yeni deneysel çıktıda bulundu.

| Dosya (`ses_deneme/schema/v2/`) | Alanlar |
|---|---|
| ThreadRealtimeStartParams.json | threadId, outputModality (`audio`/`text`), voice, prompt, realtimeStartInstructions, realtimeEndInstructions, model, version (`v1`/`v2`/`v3`), transport, includeStartupContext, initialItems |
| ThreadRealtimeListVoicesParams.json | boş parametre nesnesi |
| ThreadRealtimeListVoicesResponse.json | ses listesi yanıt şeması |
| ThreadRealtimeAppendAudioParams.json | threadId, audio (ses girdisi) |
| ThreadRealtimeAppendTextParams.json | threadId, text, role |
| ThreadRealtimeOutputAudioDeltaNotification.json | threadId, audio.data, audio.sampleRate, audio.numChannels, audio.samplesPerChannel, audio.itemId |

`ClientRequest.json` yöntemleri: `thread/realtime/start`, `thread/realtime/listVoices`, `thread/realtime/appendAudio`, `thread/realtime/appendText`, `thread/realtime/appendSpeech`, `thread/realtime/stop`.

Şemadaki voice enum: alloy, arbor, ash, ballad, breeze, cedar, coral, cove, echo, ember, juniper, maple, marin, sage, shimmer, sol, spruce, vale, verse. Bu liste canlı hesaba sunulan seslerin kanıtı değildir; canlı listVoices yanıtı alınamadı.

`ses_deneme/codex_probe.py` gerçek app-server sürecini konsol penceresi açmadan başlattı. Her iki ikili de initialize yanıtından önce durdu. stderr aynen:

```text
WARNING: proceeding, even though we could not create PATH aliases: Could not find home directory
Error: Could not find home directory
```

Betik sonucu: `initialize timeout (35s)`. Kanıtlar: `ses_deneme/codex_desktop_log.jsonl`, `codex_desktop_stderr.log`, `codex_log.jsonl`, `codex_stderr.log`. Ortam/ana dizin erişim engeli nedeniyle ChatGPT üyeliği, ses listesi ve realtime bağlantısı bu çalıştırmada sınanamadı. Bu hata üyelikle sesin desteklenmediğini kanıtlamaz.

Betik API anahtarlarını child ortamından kaldırır; yalnız account.type=chatgpt ise devam eder, ücretli yedeğe geçmez. Bağlantı kurulursa `coral` ve istenen Türkçe karakter yönlendirmesiyle kısa metin girdisini seslendirmeyi dener. Ses parçaları PCM16 varsayımıyla `codex_reply.wav` dosyasına yazılır; dosya oluşursa biçim ve ses ayrıca doğrulanmalıdır. Bu denemede oluşmadı. Mikrofon açılmadı; en küçük bağlantı testi metin girdili tasarlandı. Tam mikrofon yolu hâlâ doğrulanmamıştır.

## 2 — Chatterbox + Whisper: yerel üretim doğrulandı

Kurulum: `C:\Users\afuuu\Desktop\afuproject\_deneme\ses\cbenv\Lib\site-packages\chatterbox`.
Python: aynı ortamın `Scripts\python.exe` dosyası. ChatterboxMultilingualTTS yerel snapshot `5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18` ile CUDA üzerinde yüklendi. Model/paket indirilmedi; HF_HUB_OFFLINE ve TRANSFORMERS_OFFLINE açık, from_local kullanıldı.

Referans: `C:\Users\afuuu\Desktop\afuproject\_deneme\ses\2-Afu-Minik-Kiz.mp3`. Deneme klasöründe 24 kHz mono WAV'a çevrildi; üç üretimde de audio_prompt_path olarak verildi. Birebir klon veya beğenilen tını iddiası yok.

Betik: `ses_deneme/chatterbox_probe.py`. Kanıt: `ses_deneme/chatterbox_log.txt` içindeki MODEL_READY cuda ve üç SAVED kaydı. PowerShell stderr uyarıları nedeniyle komut exit=1 raporladı; üç çıktı dosyası bağımsız ölçüldü ve Whisper ile çözüldü. Logdaki uzun-kuyruk EOS uyarısı ve sakin adayın peak=1.0 değeri kalite incelemesinde dikkate alınmalıdır.

| Aday | Süre | Boyut | Sessizlik | Whisper metin benzerliği |
|---|---:|---:|---:|---:|
| enerjik.wav | 3,76 sn | 180.524 bayt | %28,72 | %88,52 |
| sakin.wav | 6,64 sn | 318.764 bayt | %29,82 | %100 |
| notr.wav | 4,32 sn | 207.404 bayt | %50,93 | %100 |

Hepsi 24 kHz mono; RMS değerleri sırasıyla 0,1042 / 0,1390 / 0,0995. Sessizlik: 20 ms çerçevelerde RMS <0,01 (−40 dBFS); oran duraklamaları da içerir. Bu ölçüm tek başına konuşma kalitesini kanıtlamaz.

Yerel faster-whisper-small mevcut snapshot ile CPU/int8 üzerinde, dil `tr`, beam_size=3 kullanıldı. Benzerlik noktalama silinmiş ve küçük harfe çevrilmiş metinlerin karakter SequenceMatcher oranıdır; telaffuz puanı değildir.

- Enerjik beklenen: “Yaşasın! Codex görevi tamamladı.” Çözüm: “Yaşasın, çödeks görevi tamamladı.” Sözcük farkı dinlenerek kontrol edilmeli.
- Sakin: “Merhaba, ben Afu. İşin tamamlandı. Hazır olduğunda birlikte sonraki adıma geçebiliriz.” Metin eşleşti.
- Nötr: “Merhaba. Sana nasıl yardımcı olabilirim?” Metin eşleşti.

Önceki cb_aday klasöründe yalnız `ornek_minik_kiz.wav` bulundu; sekiz üretilmiş CB adayı bulunmadı. Eski referans da ölçüldü: 9,84 sn, 472.398 bayt, %46,95 sessizlik, RMS 0,0954; Türkçe geri çeviri alındı. rt_aday klasörü boştu. Ayrıntılı bağımsız kanıt: `ses_deneme/measurements.json`; ölçüm betiği `ses_deneme/measure.py`.

## Dinlenecek dosyaların tam yolları

- `C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\ses_deneme\chatterbox\enerjik.wav`
- `C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\ses_deneme\chatterbox\sakin.wav`
- `C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\ses_deneme\chatterbox\notr.wav`

## Kullanıcının yapması gereken tek iş

Doğrudan Codex testini normal kullanıcı terminalinde şu tek komutla yeniden çalıştır:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\ses_deneme\dene.ps1"
```

Bu komut oturum açma penceresi oluşturmaz, ücretli API kullanmaz; mevcut üyelik yoksa loglayıp durur. Oluşan log bağlantı sonucunu gösterecektir.

Tüm yazılı çıktılar yalnız ses_deneme/ ve bu rapordadır. windows/, afu-character/, tests/, dist/ değiştirilmedi; Claude çağrılmadı; commit/push yapılmadı; uygulama veya görünür pencere açılmadı.
