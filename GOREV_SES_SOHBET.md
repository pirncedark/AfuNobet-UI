# GÖREV: Afu sesli sohbet prototipi (Codex LOGIN + karakter + ses filtresi)

> GÜNCELLEME (2 Eki): Bağlayıcı plan GOREV_SES_PLAN.md — ÖNCE onu oku. Sen ajan A'sın (sohbet). 4. madde (ses adayları) ayrı ajanda: `ses_deneme/ses_adaylari/`'na DOKUNMA. Varsayılan ses = notr aday + sicak filtre. Ses seçimi `ses_deneme/ayar.json`'dan okunur.

Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Önce oku: SES_DEVIR.md, SONUC_SES_DENEME.md, ses_deneme/filtre/KARSILASTIRMA.md, ses_deneme/filter_audio.py

## Kurallar
- YALNIZ `ses_deneme/` içinde çalış. windows/, afu-character/, tests/, dist/ dokunma (Faz A başka ajanda sürüyor).
- Ücretli API YOK. Codex'e yalnız ChatGPT üyeliği girişiyle (mevcut `codex login`) bağlan. OPENAI_API_KEY kullanma/isteme.
- Yeni pencere açma; her şey headless/konsol. Ses çalma pencere açmadan (ör. ffplay -nodisp -autoexit veya python sounddevice).
- Commit/push yok.

## Hedef
Kullanıcı yazar (ileride mikrofon) → Codex (login) Afu karakteriyle metin cevap verir → Chatterbox (yerel, `_deneme/ses/cbenv`, referans `_deneme/ses/2-Afu-Minik-Kiz.mp3`) seslendirir → filtre ön-ayarı tınıyı ayarlar → çalınır + wav kaydedilir.

## Mimari (kullanıcı kararı, 2 Eki)
Sen → Afu sohbet → Codex THREAD (gerçek oturum, sahte chatbot yok) → Codex cevabı → Afu persona → Afu sesi.
- Sohbet beyni Codex: ChatGPT login (SDK `login_chatgpt()` / app-server account), `thread_start()` ile thread aç, sonraki mesajlar AYNI thread'de `turn/start` ile devam ("bu repodaki hatayı bul" → "tamam düzelt" bağlamı korur). Thread id `ses_deneme/cikti/thread.json`'a yazılsın, tekrar açılışta sürdürülsün. Önce context7/kurulu SDK'dan gerçek API adlarını doğrula; `codex exec resume` yalnız yedek yol.
- Persona: karakter talimatı thread'e developerInstructions (veya şemadaki doğru alan) olarak gider; cevabı ikinci bir LLM ile yeniden yazma (kota). Seslendirme için yerelde temizle: kod blokları/markdown/yollar okunmaz, "kodu ekrana yazdım" gibi kısa sözle değiştirilir; tam metin ekranda kalır.
- Yerel yönlendirici: "Codex şu an ne yapıyor / durum ne / bitti mi / kaç iş var" gibi basit durum soruları Codex'e GİTMEZ; yerelden (son turn durumu, thread olayları, AfuNobet job durumu varsa) cevaplanır. Diğer her şey (sohbet, kod, analiz, karar) Codex thread'ine. Yönlendirici kuralları ayrı fonksiyon + birkaç örnekle test.

## Yapılacaklar
1. `ses_deneme/karakter.md`: Afu karakter talimatı. Türkçe; sıcak, tatlı, neşeli, doğal; kısa cevap (1-3 cümle, seslendirmeye uygun, markdown/emoji/kod bloğu yok); kısa bildirim enerjik, uzun açıklama sakin. Ayrıca bu talimatın Codex'te HANGİ alana gittiğini kanıtla (ses_deneme/schema/ veya `codex exec` config: developer_instructions / model_instructions_file / thread/start developerInstructions vb.) — kanıt komutu + çıktısı dosyaya.
2. `ses_deneme/afu_konus.py`: tek komutlu prototip.
   - `python afu_konus.py "merhaba Afu"` → Codex login ile karakterli cevap al (codex exec veya app-server; hangisi login ile çalışıyorsa), metni yazdır.
   - Cevabı Chatterbox ile seslendir; uygun aday ayarı (enerjik/notr/sakin) cevap uzunluğuna göre otomatik seç.
   - `--filtre sicak|enerjik|sakin|yok` (varsayılan sicak) ile filter_audio.py'deki ön-ayarı uygula.
   - `ses_deneme/cikti/<zaman>.wav` kaydet ve pencere açmadan çal (`--sessiz` ile çalmadan).
   - `--etkilesimli` modu: döngüde satır okur, aynı Codex oturumunu sürdürür (resume/thread), `cik` ile biter.
3. Gerçek uçtan uca deneme: en az 2 mesajla (biri kısa selam, biri uzunca soru) koştur; Codex cevabı, seçilen ayar, wav yolu, süreler loglansın. Whisper ile wav'ı geri çevirip Türkçe sözlerin doğru çıktığını doğrula.
4. `ses_deneme/SONUC_SES_SOHBET.md`: ne çalıştı, komutlar, kanıt çıktıları, kalan sorunlar. Son satır: `SONUC: TAMAM` veya `SONUC: EKSIK - <neden>`.

Codex sandbox'ında codex login/home bulunamazsa ("Could not find home directory") bunu kanıtla, normal terminalde koşulacak tek komutu SONUC'a yaz; uydurma başarı yazma.
