# Yerel ses derleme ve doğrulama

B0 önceden hazırlanmış yerel Cargo cache, Visual Studio 2022 BuildTools x64 ve kullanıcı Python libclang kurulumunu kullanır. Paket/model indirilmez ve sistem ortamı değiştirilmez.

`windows/.cargo/config.toml` bu makinenin yollarını varsayılan olarak verir; tanımlı kullanıcı ortam değişkenleri korunur. Başka makinede LIBCLANG_PATH ve CMAKE doğru yerel kurulum yoluna ayarlanmalıdır. CMake toolchain AMD64/x64 seçimidir.

Windows deposunun kökünden, görünür pencere açmadan:

```powershell
& windows/scripts/derlemehelper.cmd test
& windows/scripts/derlemehelper.cmd build --release
```

Güvenli WAV dosyasını açıkça seçerek gerçek yerel model testi:

```powershell
$env:AFUNOBET_TEST_WAV = ""C:\yol\merhaba_16k.wav""
& windows/scripts/derlemehelper.cmd test --test voice_backend turkce_ornek_ses_cevrilir -- --ignored
```

Model varsayılanı `%LOCALAPPDATA%/AfuNobet-UI/models/ggml-small.bin`; uzman testinde `AFUNOBET_WHISPER_MODEL` ile değişebilir. Uygulama bu ayarı ana ekranına taşımaz.

Saf testler ses dönüştürme, bozuk örnekler, 60 saniyeye karşı bellek tavanı, kısa ses ve eksik model mesajını sınar. Gerçek aygıtı açmaz. Örnek dosya testi çevrimdışı Türkçe Whisper yolunu sınar. Mikrofon izni, aygıt bırakılması ve Windows Türkçe TTS kullanıcı testi UNVERIFIED kalır.

WinRT serbest diktenin çevrimdışı Türkçe girdi yolu doğrulanmadı; buluta veya yeni bir mikrofon yakalamasına otomatik geçiş yapılmaz. Model yoksa yazılı mesaj önerilir.

Son doğrulama: `derlemehelper.cmd test --test voice_backend` → 12 PASS, 1 güvenli model testi varsayılan olarak ignored. Gerçek yerel model testi ayrıca PASS. Stop/Drop kontrolü aygıt bağımlılığı yerine worker kanalıyla headless test edilir; gerçek aygıt bırakılması iddiası değildir. TTS iptal isteği aygıt açmadan önce RED → GREEN regresyonuyla sınandı.

## Sürücü yanıt vermediğinde sınırlar

Başlangıç hazırlığı en fazla 5 saniye beklenir; durdurma sonucu en fazla 2 saniye beklenir. Recorder Drop ve VoiceState.shutdown arayüz iş parçacığında sürücü workerına join yapmaz. Başlangıç sırasında uygulama Mutex kilidi tutulmaz; iptal veya kapanış geç gelen mikrofon açılışını geçersiz kılar. Ses yakalama workerı tek örnektir; sürücü takılıysa yeni workerlar birikmez.

Windows aygıt sürücüsünün kendi işletim sistemi çağrısını Rust tarafından güvenle zorla kesmek mümkün değildir. Böyle bir çağrı takılırsa worker uygulama süreci içinde kalabilir; arayüz süre sınırında hata döndürür, yeni mikrofon başlatmaları reddedilir ve kullanıcı uygulamayı yeniden açmalıdır. Sürücü geri dönerse iptal sinyali aygıtı bırakır. Bu durum harici/orphan alt süreç oluşturmaz. Gerçek sürücü kilitlenmesi ve gerçek mikrofon/TTS kapanışı UNVERIFIED; testler sahte worker ve kontrol kanallarıyla headless yapılır.

2026-10-01 son P2 düzeltme doğrulaması: `derlemehelper.cmd test --test voice_backend` → 19 PASS, 1 güvenli yerel model testi ignored. Donanımsız takılan-worker Drop testi önce RED, sonra GREEN; kilit yarışında gecikmiş iptal testi de RED → GREEN. Yeni kayıt nesli eski iptalden korunur; VoiceState.shutdown idempotenttir, kayıt kilitlerini UI üzerinde beklemez ve ses çıkışını geçersiz kılar. İlk 12-test sonucu yukarıda önceki checkpoint olarak kalır.

## B4 gereksinim karşılaştırması — resmi Windows kanıtı

[Microsoft Speech recognition in Windows apps](https://learn.microsoft.com/en-us/windows/apps/develop/input/speech-recognition) (11 Temmuz2026 güncellemesi,1 Ekim2026 okundu): Windows.Media.SpeechRecognition paket kimliği gerektirir; paketlenmemiş uygulama kullanamaz. Serbest dikte ön tanımlı grameri uzak webservisinde işlenir ve ağ gerektirir. Mevcut teslim manifesti standalone executable'dır; mastergörev yerelSTT ister. Bu iki hedefi WinRT dikte ile aynı anda sağlamak kanıtlanmadı. Windows yedeği tamamlanmamış adım olarak tutulur; kullanıcıya yerelWhisper/tekexe veya paketli/çevrimiçiWindowsyedeği tercihi soruldu. Yanıt gelmeden bu madde plandan çıkarılmaz veya çevrimiçi hizmete geçilmez.

TTS Türkçe sesi tercih eder; bulunmazsa Windows varsayılan sesi kullanır. Destek sorgusu ses oynatmaz. Tercih politikası iki donanımsız regresyonla sınandı. Sohbet yanıtının opt-in TTS ve working/speaking görsel zinciri ayrıca tamamlanma denetiminde ele alınıyor; bildirim TTS'si bu gereksinimi tek başına karşılamaz.
