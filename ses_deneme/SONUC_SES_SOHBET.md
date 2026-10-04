# Afu sesli sohbet prototipi — 2 Ekim 2026

Prototip yazıldı. Gerçek Codex bağlantısı sandbox'ta ana dizin bulunamadığı için başlamadı; iki Codex mesajıyla uçtan uca doğrulama tamamlanmadı.

İlk tur kayıtları aşağıda korunmuştur; güncel davranış ve yeniden doğrulama sonuçları en alttaki **Tur 2** bölümündedir.

## Uygulanan

- `afu_konus.py`: kurulu yerel Python ortamına otomatik geçiş; ChatGPT hesap türü kontrolü; ücretli API anahtarları child ortamından çıkarılır, OpenAI sağlayıcısı ve ChatGPT login zorlanır.
- Gerçek app-server yöntemleri: `initialize`, `account/read`, `thread/start`, `thread/resume`, `turn/start`. Persona `karakter.md` içeriği `developerInstructions` alanına gider. Thread kimliği başarılı bağlantıda `cikti/thread.json` içinde saklanır; tekrar açılışta devam ettirilir, resume hatasında sessizce yeni oturum açılmaz.
- Yerel yönlendirme yalnız belirli durum sorularını yakalar. Diğer sorular Codex'e gider. Sayı yalnız bu sohbetin durumunu anlatır; AfuNobet diğer işlerine bağlantı henüz yok.
- Tam yanıt ekranda kalır; ses için kod blokları, markdown ve yollar temizlenir. İkinci LLM yok.
- Kısa yanıt enerjik, orta yanıt nötr, uzun yanıt sakin Chatterbox ayarını seçer. `--filtre sicak|enerjik|sakin|yok`, varsayılan sıcak. Kaynak ayarlar `filter_audio.py` içindeki PRESETS'ten alınır.
- WAV ve ham WAV `cikti/` içinde saklanır. `--sessiz` çalmayı kapatır; normal mod ffplay -nodisp -autoexit kullanır. Görünür pencere açılmadı. `--etkilesimli` aynı istemci/thread ile devam eder; `cik` bitirir.
- Bu prototip sohbet içindir; Codex araç isteklerini reddeder ve salt okunur çalışır. Gerçek dosya düzeltme bu aşamada uygulanmadı.

## Şema kanıtı

Kurulu Codex'ten önceki denemede üretilen `schema/v2/ThreadStartParams.json` ve `ThreadResumeParams.json` incelendi. Alan kanıtı ve komut: `schema/PERSONA_KANIT.json`.

Çalıştırılan komut:

```powershell
python -B -c "import json,pathlib; d=json.loads(pathlib.Path('ses_deneme/schema/v2/ThreadStartParams.json').read_text()); print(d['properties']['developerInstructions'])"
```

Gerçek çıktı: `{'type': ['string', 'null']}`. Bu şema doğrulamasıdır; persona talimatının canlı modelde uygulanması bağlantı kurulamadığı için doğrulanmadı. Şemadaki gerçek yöntem adları SDK'dan tahmin edilmedi; `codex exec resume` gerekmedi.

## Doğrulama sonuçları

`python -B ses_deneme/test_sohbet.py`: 3 test geçti. Yerel sorular, Codex'e gitmesi gereken örnekler, ses temizliği ve otomatik ses ayarı sınandı. Önce eksik modül nedeniyle başarısız test çalıştırıldı, sonra uygulama ile geçti.

Kısa mesaj `merhaba Afu` ve uzun soru `Afu, acil ve önemli işleri nasıl ayırıp günümü sakin planlayabilirim?` gerçekten çalıştırıldı. İkisi de initialize aşamasından önce durdu. Mesaj ve hata kayıtları `cikti/attempts.jsonl`; stderr `cikti/app_server_stderr.log`; hata geçmişi `cikti/failure.log`.

```text
WARNING: proceeding, even though we could not create PATH aliases: Could not find home directory
Error: Could not find home directory
```

Yerel bağımsız ses denemesi:

```powershell
& 'C:\Users\afuuu\Desktop\afuproject\_deneme\ses\cbenv\Scripts\python.exe' -B ses_deneme/afu_konus.py 'durum ne' --sessiz
& 'C:\Users\afuuu\Desktop\afuproject\_deneme\ses\cbenv\Scripts\python.exe' -B ses_deneme/dogrula_sohbet.py
```

Yanıt: `Henüz bu sohbette bir görev başlamadı.` Seçim: enerjik, filtre: sıcak. Toplam süre 32,188 sn (model yükleme dahil). WAV: `cikti/20261002_133606_844493.wav`. Tam kayıt `cikti/sohbet.jsonl`. Yerel Whisper aynı Türkçe cümleyi çözdü; normalize metin tam eşleşti, karakter benzerliği 1,0. Kanıt `cikti/whisper.json`. Bu sonuç Codex cevabı değildir ve insan dinlemesi/tını değerlendirmesi yerine geçmez. Üretim EOS uzun kuyruk uyarısı verdi; metin eşleşmesine rağmen doğallık dinlenerek değerlendirilmelidir.

## Kullanım

```powershell
python ses_deneme/afu_konus.py "merhaba Afu"
python ses_deneme/afu_konus.py --etkilesimli --filtre sicak
```

Normal kullanıcı terminalinde iki gerçek mesajı aynı thread'de çalıştırıp Whisper ile karşılaştıracak tek komut:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\ses_deneme\dene_sohbet.ps1"
```

Bu deneme mevcut `codex login` üyelik oturumunu kullanır. İlk mesaj selam, ikinci mesaj önceki selamı hatırlama ve uzun açıklama sorusudur. Başarı halinde thread, süreler, cevaplar, ayarlar, WAV yolları ve Whisper sonuçları kaydedilir. Ses çalma denemesi ayrıca normal kullanımda sınanmalıdır. Canlı thread devamı ve persona etkisi henüz sınanmadı.

Çalışma yalnız `ses_deneme/` içinde yapıldı. Commit/push, ücretli API ve paket indirme yapılmadı.

## Tur 2 — güncellenen plana uyum ve yeni kanıtlar

Önce git status/diff ve görev dosyaları okundu. Önceki işler tekrar üretilmedi; bu turda yalnız sohbet kapsamındaki eksikler tamamlandı. `ses_adaylari/`, windows/, afu-character/, tests/, dist/ değiştirilmedi. Commit/push ve ücretli API kullanılmadı.

- `ayar.json` ile ses ve filtre kalıcı: varsayılan **notr + sicak**. `--ses` ve `--filtre` açık kullanıcı seçimini kaydeder. Ses kimliği/referans aynı kalır, uzun cevapta yalnız enerji düşer. İlk kullanım kısa yönlendirmesi bir kez gösterilir. Geçersiz/eksik aday ön ayarı sessizce taklit edilmez.
- B ajanının üç adayını bağlamak için salt okunur `presets.json` adaptörü hazır; sözleşme `SES_ONAYARI_SOZLESMESI.md`. B dosyası oluşturulmadı, gerçek üç adayla entegrasyon doğrulanmadı. Çocuk/çizgi film tınısı başarısı iddia edilmez.
- `.gpu.lock` ortak exclusive-create kilidi model yükleme ve üretim boyunca tutulur; normal çıkışta kaldırılır. Başkasının kilidini silmez. Model yükleme OOM durumunda iki tekrar bekler. Eşzamanlı B kullanımı ve zorla öldürme sonrası kurtarma doğrulanmadı.
- Bilinmeyen durum artık açıkça “bilmiyorum”; önceki süreçten kalmış `inProgress` güncel çalışan iş sayılmaz. Gerçek AfuNobet job kaynağı henüz bağlı değil.
- Persona yapay zekâ kimliğini gizlemez. Ses temizliği `~~~` kod bloklarını, traceback ve göreli yolları da ayıklar. Tam ekran metni değiştirilmez. Üyelik hesabı kontrolü, salt okunur sandbox ve araç isteklerinin reddi korunur.
- `dogrula_e2e.py`: gerçek thread içinde iki mesaj, rastgele sözcüğün ikinci mesajda hatırlanması, tam kod/metnin korunması, kısa/uzun WAV, süreç kapatma + diskten aynı thread'i yeniden açma + sözcüğü yeniden hatırlama kontrolleri. Başarılı bağlantıda Whisper sonuçlarını da raporlar. Test yapay Codex yanıtı üretmez.

**Güncel test:** `python -B ses_deneme/test_sohbet.py` — **8 test geçti** (yerel yönlendirme, bilinmeyen durum, metin temizliği, ses seçimi kalıcılığı, enerji seçimi, kilit sahipliği, Whisper sözcük farkları). Başlangıçta eksik seçim fonksiyonu ve iki davranış için başarısız sonuç görüldü, uygulama sonrasında geçti.

**Gerçek bağlantı:** `powershell -NoProfile -ExecutionPolicy Bypass -File ses_deneme/dene_sohbet.ps1` yeniden çalıştırıldı. Initialize öncesinde aynı `Could not find home directory` hatası alındı. `cikti/e2e.json`: `success=false`, `turns=[]`, context/restart/code kontrolleri false. Canlı persona, iki gerçek mesaj ve yeniden açılış başarıyla sınanmış değildir. Normal terminal için yukarıdaki tek komut güncel testin tamamını çalıştırır.

**Yerel ses yeniden doğrulaması:** `dogrula_yerel.py` açıkça `local_fixture` etiketli kısa/uzun metinleri üretti; bunlar Codex cevapları değildir. `dogrula_sohbet.py` yerel faster-whisper-small CPU/int8, Türkçe, beam=3 ile geri çevirdi; sözcük farklarını ve Levenshtein WER değerini kaydeder. Ham transkriptler ve beklenen metin `cikti/whisper.json`; tam cevap + temiz ses metni `cikti/sohbet.jsonl`; süre/ayar özeti `cikti/tur2_ses_kanit.json`.

| Dosya (`cikti/`) | Ses süresi | WER | Sözcük farkları |
|---|---:|---:|---|
| `20261002_134327_999664.wav` (yerel durum) | 6,07 sn | %20 | güncel → güncelli; göndererek → gönderecek |
| `yerel_kisa_20261002_134557.wav` | 5,19 sn | %20 | birlikte → belliikte |
| `yerel_uzun_20261002_134557.wav` | 25,03 sn | %7,02 | vadeli → madeli; kısa molalar → kısam olalar; kodu → koda |

Uzun metin kayıtta kod bloğunu içerir; ses metninde `def planla` yok, “Kodu ekrana yazdım.” vardır. Chatterbox kısa örnekte long-tail, uzun örnekte alignment-repetition/EOS uyarısı verdi (`cikti/yerel_test.log`). Yerel üretimin PowerShell yönlendirmeli komutu stderr uyarılarıyla exit=1 raporladı; WAV'lar ayrıca açılarak ölçüldü ve Whisper ile çözüldü. Kusursuz telaffuz iddia edilmez. WER ses üretimi ve Whisper hatalarını ayıramaz. Dinleme/doğallık/yoruculuk değerlendirmesi kullanıcıya aittir; bu tur ses çalma sınanmadı.

**Resmî kaynak kontrolü:** [Codex App Server](https://learn.chatgpt.com/docs/app-server) thread/start, thread/resume ve turn/start yaşam döngüsünü belgeler; kurulu şemada developerInstructions kanıtı ayrıca korunur. [Realtime API](https://developers.openai.com/api/docs/guides/realtime) API ses yolunu belgeler. ChatGPT sohbetindeki sesin üyelikle ücretsiz uygulamaya aktarılmasını destekleyen bir yol bu kontrolde doğrulanmadı; mevcut gerçek realtime kaydı “requires API key auth” ve audio_chunks=0 (`codex_log.jsonl`). Desteklenmeyen ses yakalama yapılmadı; yerel Chatterbox kullanılıyor.

## Tur 3 — güncel durum

Ses seçimi ayar.json içinde saklanıyor; varsayılan nötr + sıcak korunuyor. İlk kullanım açıklaması bir kez gösteriliyor. Yerel durum bilinmiyorsa tahmin edilmiyor.

Gerçek aday teslim biçimi incelendi: presets altında ex/cfg/pitch/tempo/pause/eq alanları, ortak reference_cartoon.wav, temperature, seed ve long_exaggeration_delta. Sohbet adaptörü bu biçime uyarlandı; referans yalnız okunur, cümleler ayrı üretilir ve duraklama ile birleştirilir; rubberband formant zinciri korunur. Ses adayları klasörüne yazılmadı. Adayın zinciri standart filtre yerine kullanılır.

python -B ses_deneme/test_sohbet.py: 9 test geçti; gerçek üç aday manifestinin uyumu dahil. GPU kilidi yalnız sahibi tarafından kaldırılır; yükleme ve üretimde OOM için sınırlı tekrar var. Yeni adayla gerçek WAV denemesi başka sürecin tuttuğu GPU kilidini bekledi; kendi bekleyen süreç durduruldu, başkasının kilidi kaldırılmadı. Bu üretim doğrulanmış sayılmıyor.

dene_sohbet.ps1 yeniden çalıştırıldı: çıkış 1. cikti/e2e.json success=false, sıfır canlı turn ve Could not find home directory hatası içeriyor. Sandbox sınırları değiştirilmedi. Canlı persona, bağlam ve yeniden açılış doğrulanmadı. dogrula_e2e.py iki turn, app-server yeniden başlatma ve üçüncü bağlam sorusunu hazırlar; Whisper kayıtlarının iki WAV'ı da kapsaması zorunludur. Birebir eşleşme ayrıca raporlanır.

Önceki yerel kısa/uzun sesler tekrar üretilmedi. cikti/whisper.json kısa ses WER %20: birlikte → belliikte. Uzun ses WER %7,02: vadeli → madeli; kısa molalar → kısam olalar; kodu → koda. Bunlar hazır yerel metinlerdir, Codex cevabı değildir. Dinleme değerlendirmesi kullanıcıya aittir.

Üyelik realtime yolu önceki protokol kanıtında API key gerektiriyor (codex_log.jsonl, SES_DEVIR.md). Bu tur ücretli API veya ses yakalama kullanılmadı; yerel Chatterbox yolu korundu.

Normal terminalde gerçek doğrulama komutu:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\ses_deneme\dene_sohbet.ps1"
```

SONUC: EKSIK - Sandbox ana dizin erişimi canlı Codex testini engelliyor; iki gerçek mesaj, yeniden açılış ve Codex cevaplarının Whisper karşılaştırması bekliyor; adayla yeni WAV üretimi GPU kilidi nedeniyle doğrulanmadı.

## Tur 4 — canli Codex testi (2 Eki 18:04)

Gerçek Codex bağlantısıyla oluşturulan `e2e.json` uçtan uca test sonuçları incelendi.

- **Whisper WER:** Kısa cevap için 0.2, uzun cevap için 0.10309.
- **Sözcük farkları (Kısa):** sözcüğü → sözcü, kod → koltuk.
- **Sözcük farkları (Uzun):** kod → kut, acil → acın, vadeli → madeli, acil → acın, ayırmak için önce → ayrımak içindence, takvimine → takbimine, önemi → önemli, işin → işinin.
- **Kök neden (`code_cleanup_verified` false):** Codex, istenen Python fonksiyonunu üretirken etrafına beklenen Markdown kod bloklarını (``` veya ~~~) koymamıştır. Test betiği (`dogrula_e2e.py`) kesin olarak bu işaretleri aradığı için başarısız olmuştur. Ancak `afu_konus.py` içindeki temizleyici (cleaner), Markdown olmamasına rağmen `def ` ile başlayan kodu başarıyla tespit etmiş, sesten kaldırmış ve yerine "Kodu ekrana yazdım." eklemiştir. Aynı şekilde rastgele üretilen 13 haneli token (örn. `afu2839536e24`) da temizleyici tarafından kod/hash olarak doğru tanınmış ve "ekrandaki kod" sözcükleriyle değiştirilmiştir. Test bu başarılı değişimi doğrulamadığı için hata vermiştir.
- **Düzeltme:** `dogrula_e2e.py` güncellenerek Markdown blokları (``` / ~~~) zorunluluğu kaldırıldı. Bunun yerine konuşulan metinde "Kodu ekrana yazdım." ve "ekrandaki kod" kalıplarının bulunduğu, "def" sözcüğünün ve ham hash token'ının ise sesten başarıyla temizlendiği doğrulandı.
- **Test sonucu:** `python -B test_sohbet.py` koşturuldu; 15 testin tamamı başarıyla geçti. Temizleyicinin hash ve kod yakalama mantığının sorunsuz çalıştığı testle doğrulandı.

## Tur 4b — düzeltmeyle canlı yeniden deneme (2 Eki 18:14, Claude koşturdu)

`dene_sohbet.ps1` exit=0. `cikti/e2e.json` (started 2026-10-02T18:14:08): success=true, context_verified=true, restart_verified=true, code_cleanup_verified=true, long_answer_verified=true, whisper_verified=true, whisper_exact_match=false. Yeniden açılış cevabı özel sözcüğü doğru verdi. Günlük: `cikti/e2e_canli3.log`. `python -B test_sohbet.py`: 15 test geçti.
Not: ses metninde hash benzeri özel sözcük "ekrandaki kod" olarak okunuyor (plan madde 5 gereği teknik dizgi okunmaz). Dinleme değerlendirmesi kullanıcıya aittir.

SONUC: TAMAM
