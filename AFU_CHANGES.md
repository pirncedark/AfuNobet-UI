# AfuNöbet UI değişiklik kaydı

Kaynak: Louis-CFM/coucou (MIT, Louis Raille). LICENSE korunur. Bu fork yalnız AfuNöbet durumunu salt okunur görüntüler; Mochi/Coucou ikon, ses ve medya derlemeye alınmaz.

## 2026-10-01 Faz A

- A1: Sonradan sabitlenen uyarı, daha önce kurulmuş küçültme zamanlayıcısını iptal eder. Test RED → GREEN, TS 71/71 headless.
- A2: Dar monitörde negatif merkezleme giderildi; bozuk DPI 1 olarak alınır, monitör yoksa Windows ekran genişliği kullanılır. Afu konumu yalnız dpi.rs tarafından yönetilir.
- `windows/src-tauri/src/island.rs` upstream HEAD ile bayt bayt aynı kalır. Win32 non-activating, toolwindow, cursor poll, click-through kodu korunur; Afu konum hesabı dpi.rs içindedir.
- Önceden bulunan değişiklikler geri alınmadı; görev öncesindeki dosya silmeleri bu oturumun işlemi değildir.

## Doğrulama sınırı

Gerçek Windows always-on-top, Alt-Tab dışı görünüm, click-through, DPI/monitör değişimi, hover wake, tray tıklama ve pet davranışı UNVERIFIED. Yalnız headless otomatik test sonuçları PASS sayılır. Faz A ACCEPTED kaydı yoktur. Kullanıcının sonraki tam-plan yetkisiyle B/C geliştirmesi sürüyor; gerçek kabul kapıları bekliyor ve koşullu D tetiklenmedi.

Üretici AfuNobet deposuna yetkili kurulumla bağlandı; son hedefli kontrolde49 test geçti. Hata durumunda son geçerli JSON ve salt-okur DB korunuyor. Otomatik başlatma kaydı yapılmaz. Commit/push yapılmaz.

## 2026-10-01 B4 yerel ses

- MurMur `0be0d1b` yerel cpal/Whisper fikirlerinden yeniden yazılan `voice/capture.rs` ve `voice/whisper.rs`; kaynak ve model özeti THIRD_PARTY.md içinde. Özgün kod kopyalanmadı.
- Mikrofon yalnız açık bas-konuş komutunda açılır. Stop/Cancel/Drop ve 60 saniye tavanı aygıtı bırakır. Mono, sonlu örnek normalizasyonu, 16 kHz yeniden örnekleme ve bellek tavanı uygulanır.
- Yerel model ilk çeviride yüklenip yeniden kullanılır; Türkçe sabit, GPU kapalı, CPU en fazla dört iş parçacığı. 0,3 saniyeden kısa ses boş metindir. Metin yalnız sonuç olarak döner; otomatik gönderilmez.
- Windows Türkçe TTS açık okuma komutuyla çalışır; iptal ve zaman tavanı vardır. Gerçek mikrofon/TTS kullanıcı testi UNVERIFIED.
- Güvenli Windows çevrimdışı serbest STT yedeği doğrulanmadı: destek false. Eksik modelde mikrofon açılmadan kısa yazılı mesaj önerilir; ücretli API/bulut yedeği yok.
- Test: saf yakalama testlerinde önce RED (3 beklenen failure), sonra GREEN; 12 donanımsız Rust testi PASS ve güvenli örnek WAV ile gerçek yerel Türkçe model testi ayrıca PASS (4,37 saniye toplam). İlk helper argüman hatası düzeltildi; model testi tekrar koşularak geçti.
- Yerel `.cargo/config.toml` ve `scripts/derlemehelper.cmd` çevrimdışı x64/libclang/CMake ortamını yalnız derleme komutunda sağlar; sistem ayarı/autostart değişmez. B0 istisnası kapsamında önceden indirilmiş whisper-rs/cpal/hound kullanılır.


## B/C üretim entegrasyonu

Uygulama kaydı, sınırlı taze durum okuma, dosya izleyicisi, dinamik tepsi menüsü ve mevcut pet penceresinde liste bağlı. Sohbet köprüsü yalnız kullanıcı eylemiyle başlar; ek dosyalar açık Gönder eyleminde işlenir. Canlı hesap kotası görünümü günceller. Yerel bas-konuş metni kullanıcı denetiminden sonra gönderilir. Sesli bildirim varsayılan kapalı; görev başlangıcı sessiz ve bildirim arası en az30 saniye. Gerçek hesap/mikrofon/pencere kabulü UNVERIFIED. Son paket ve kanıtlar docs/DEVAM_2026-10-01.md içinde izlenir.

## B4 tamamlanma denetimi sonrası

Sohbet yanıtı TTS'si bildirim sesinden ayrı, Settings.tts varsayılanfalse ve tek düğmeyle yönetilir. Başarılı korelasyonlu yanıt tamamlanınca en fazla32000 Unicode karakter4000'lik ardışık parçalarda okunur; teknik yanıt metni etiket filtresiyle susturulmaz. İptal/görünümden çıkış/kapatma kalan parçaları durdurur; bas-konuş önce yanıt ve bildirim sesini susturur, mikrofon açılışında da yeni bildirim susturulur. listening/thinking/working/speaking/idle görsel zinciri bağlandı. Sohbet alanı kendi içinde kayar, alt düğmeler ve iki ses anahtarı erişilebilir kalır. Türkçe TTS yoksa Windows varsayılan sesi kullanılır. Son153 TS testi ve21 ses testi PASS; gerçek ses UNVERIFIED. WinRT dikte yedeğinin paket kimliği+çevrimiçi servis gereksinimi docs/SES_DERLEME.md içinde resmi Microsoft kaynağıyla kayıtlı; kullanıcı kararı bekliyor.
