# GÖREV: AfuNobet-UI — Ses yolu denemesi (Faz B hazırlık, 2 Eki 2026)

Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Önce oku: docs/SES_DERLEME.md, docs/codex-protocol/ (deneysel şema), docs/superpowers/plans/2026-10-01-afunobet-ui-tum-fazlar.md (Faz B bölümü).

KURALLAR: Uygulama koduna (windows/, afu-character/, tests/, dist/) DOKUNMA — orada başka bir Codex Faz A işi çalışıyor. Bütün çıktılar yalnız `ses_deneme/` klasörüne (yoksa aç) ve SONUC_SES_DENEME.md'ye. Claude çağırma. commit/push YOK. Yeni pencere açma. Ücretli API anahtarı KULLANMA, ödeme gerektiren hiçbir şeye geçme. Kanıtsız "çalışıyor" deme.

## Hedef
Mikrofon → Codex sesli oturumu → sesli cevap → Afu karakteri. Karakter yönlendirmesi: "Türkçe konuş; sıcak, tatlı, neşeli ve doğal bir ton kullan; kısa cevaplar ver." Tını sistemin sunduğu seslerden seçilir; `2-Afu-Minik-Kiz.mp3` birebir klonlanmış varsayılmaz. Not: aşırı ince ses uzun kullanımda yorar; anlaşılırlık öncelik.

## Adım 1 — Doğrudan Codex sesi (öncelik)
1. Codex çalıştırılabilir dosyasını bul (ör. %LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe, PATH, npm global). Sürümünü yaz.
2. Deneysel protokol/şemada sesli oturum (realtime/voice), ses seçimi ve talimat alanlarını listele (dosya + alan adı).
3. ChatGPT üyelik oturumuyla (API anahtarı değil) gerçek, en küçük bağlantı denemesini `ses_deneme/` altında bir betikle yap: oturum açılıyor mu, hangi sesler var, Türkçe kısa bir cevap ses dosyası (wav/mp3) olarak kaydedilebiliyor mu. Ağ/sandbox engeli olursa hatayı aynen yaz ve kullanıcının kendi terminalinde koşacağı tek komutu hazırla.
4. Sonuç: ÇALIŞIYOR (kanıt: dosya yolu + log) / ÇALIŞMIYOR (sebep) / BELİRSİZ.

## Adım 2 — Yedek yol: yerel Chatterbox (+ Whisper)
1. Kurulu Chatterbox'ı bul; `2-Afu-Minik-Kiz.mp3` referansıyla 3 kısa Türkçe aday üret (kısa bildirim enerjik; uzun cevap sakin; bir de nötr). `ses_deneme/chatterbox/` altına kaydet.
2. Her adayın gerçekten ses içerdiğini ölç (süre, sessizlik oranı, dosya boyutu). Türkçe telaffuzu otomatik kontrol için yerel Whisper varsa geri yazıya çevirip metinle karşılaştır.
3. Önceki doğrulanmamış adaylar varsa onları da aynı ölçümden geçir.

## Çıktı
SONUC_SES_DENEME.md: ilk satır `SONUC: ...` (DOGRUDAN_CODEX_CALISIYOR / YEREL_YOL / BELIRSIZ) + her adımın kanıtı + dinlenecek dosyaların tam yolları + kullanıcının yapması gereken tek iş (varsa).
