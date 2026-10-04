# AfuNöbet UI değişiklik kaydı

## 2026-10-04 v1.0.2 — küçük ve sabit boy pet, portable / smaller same-size pet, portable

EN: The mini pet is half the size (head ~72 px instead of ~145 px) and every animation is drawn at the same head size: frames get a measured head width (`PET_KAFA`, `petKafaOlcegi` in pet.ts) instead of being fitted to one visible height, which made the head vary ~35–220 px. Releases ship a setup installer and a portable zip. Leftover upstream names were removed (`GOREV_AFU_*`, `afunobet-ui.exe`, templates, docs, metadata); the MIT notice in LICENSE stays. Tests: Vitest 994+ PASS sequentially. `island.rs` not touched.

TR: Mini pet yarı boyda (kafa ~145 px yerine ~72 px) ve tüm animasyonlar aynı kafa boyunda çizilir: kareler tek bir görünür yüksekliğe sığdırılmak yerine ölçülmüş kafa genişliğiyle (`PET_KAFA`, pet.ts içinde `petKafaOlcegi`) ölçeklenir; eskiden kafa ~35–220 px arasında değişiyordu. Sürümlerde kurulum dosyası ve portable zip var. Kalan upstream adları kaldırıldı (`GOREV_AFU_*`, `afunobet-ui.exe`, şablonlar, belgeler, paket bilgisi); LICENSE içindeki MIT bildirimi kalır. Test: Vitest 994+ PASS (sırayla). `island.rs` değişmedi.

## 2026-10-04 v1.0.1 — başka bilgisayarda çalışma / running on another PC

EN: Default data folder is portable (existing `Desktop\afuproject\AfuNobet`, else `%LOCALAPPDATA%\AfuNobet`). Agent-pipe main sessions (Claude Code hooks) are listed read-only; Claude still gets no work. Voice cancel stops the whole Python launcher tree and clears a stale GPU lock. Folder timestamp events no longer wake the app-status watcher. The Claude health pill recognises afu_ajan_koprusu.py, and tool names no longer replace prompt titles. New `scripts/gorev-cubugu-guncelle.ps1` and README new-PC guide. Tests (merged with the 2026-10-04 upstream release): Vitest 891 PASS (screenshot files run sequentially), Cargo 287 PASS. `island.rs` not touched by this change.

TR: Varsayılan veri klasörü taşınabilir (mevcut `Desktop\afuproject\AfuNobet`, yoksa `%LOCALAPPDATA%\AfuNobet`). Ajan borusundaki ana oturumlar (Claude Code kancaları) salt okunur listelenir; Claude'a yine iş verilmez. Ses iptali Python başlatıcı ağacının tamamını durdurur ve kalan GPU kilidini temizler. Klasör zaman damgası olayları uygulama durum izleyicisini artık uyandırmaz. Claude sağlık rozeti afu_ajan_koprusu.py kancasını tanır; araç adları istem başlığının yerine geçmez. Yeni `scripts/gorev-cubugu-guncelle.ps1` ve README yeni bilgisayar rehberi. Test (2026-10-04 upstream sürümüyle birleşik): Vitest 891 PASS (ekran görüntüsü dosyaları sırayla), Cargo 287 PASS. `island.rs` bu değişiklikte elle değiştirilmedi.

## 2026-10-03 W7 — arada ifade

Mini pet boştayken 20–60 sn arası rastgele aralıkla kısa bir ifade yapar (göz kırpma, sağa/sola bakış, mutlu, şaşkın, esneme) ve bekleme pozuna döner; aynı ifade arka arkaya gelmez. İş çalışırken, soru/balon açıkken, sürükleme/tutma, uygulama menüsü, kart açıkken, tam ekranda ve hareket azaltma tercihinde yapmaz. Yalnız mevcut kareler kullanılır; yeni görsel yok. Saf mantık `windows/src/afu/ifade.ts`, pet.ts'e küçük bağlantı (STÜDYO blokları değişmedi). Durum panelinde varsayılan açık "Arada ifade yap" anahtarı yerel saklanır. Test: `tests/pet-ifade.test.ts`.

## 2026-10-03 R1 — mesaj gelince öne gel

Ortak FIFO mesaj/soru kuyruğu, oturum boyunca ID tekilleştirme, 8 saniyelik bildirim ve başarılı cevaba kadar sabit soru kartı eklendi. Mevcut ada Tauri API ile odak istemeden gösterilir; kuyruk boşaldığında gizlenir ve üstte tutma kaldırılır. Durum/ayar kartında varsayılan açık “Mesaj gelince öne gel” anahtarı yerel olarak saklanır. Mevcut Rust dizin olayları kullanılır; yeni FS eklentisi, pencere veya bağımlılık eklenmedi.

R1: pytest 297, Vitest 700, Cargo 247 test PASS; tsc hatasız. Cargo 4 mevcut testi ignored bırakır. Önceki kaynak özeti arşivlenip yetkili değişiklikler için yenilendi; test koşulları değiştirilmedi. `island.rs` SHA256 `5F2F4588F4F7231450FE583F4218BDE4C04DB4BFE4CDBD1389B4430945F71B57` korunur. Ayrıntı `SONUC_R1.md`, kanıtlar `_gorev/2026-10-03/log/` içindedir. Gerçek Windows always-on-top, odak çalmama, gizlenme, click-through, hover wake ve pet/tepsi smoke testi UNVERIFIED; görünür pencere açılmadı.

Kaynak: MIT lisanslı upstream kod; telif bildirimi LICENSE dosyasında korunur. Bu fork yalnız AfuNöbet durumunu salt okunur görüntüler; upstream ikon, ses ve medya derlemeye alınmaz.

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

## W3 ajan devri gösterimi

Kart, ayrıntı ve pet balonu tek satır devir gösterir: "Codex kotası doldu → Gemini devraldı" ya da "Codex kotası doldu · bekliyor (14:55'te açılır)". Kaynak yalnız state.json: görevin `handoff` alanı (AfuNöbet ui_state.py checkpoint'ten yazar) ve kota alanları (görev `quota`, yoksa kök `quotas`). Ayrı provider geçmişi alanı yok; uydurulmadı. Claude devreden/devralan olarak gösterilmez; 30 dk'dan eski kayıt ve geçmiş açılış saati yazılmaz. Testler: tests/w3_devir.test.ts.

## 2026-10-04 — M12 sohbet tasarımı
Maskot ve yanıt odaklı açılış, okla açılan kalıcı ayrıntılar, SVG menü ve gerçek sağlık kartları ana uygulamaya aktarıldı. Claude kartı koruma durumunu ve eksik bağlantıyı ayrı metinle gösteriyor. Ses/Codex köprüsü ve island.rs değiştirilmedi.

## 2026-10-04 — Üst kenardan geri açılma ve metin genişliği
Kullanıcının ilk açılıştan sonra kaybolma bildirimine göre island.rs native poll değiştirildi: gizli/pet/tray durumlarında sonsuz park yerine düşük sıklıklı monitör üst kenar algısı var; sürükleme ve tekrar olaylar engelleniyor. Frontend edge-wake ve kompakt hover tam panel açıyor, fare içerdeyken kapanma erteleniyor; ayrılınca mini pete dönme korunuyor. Panel genişliği görünür metne göre mevcut ekran/pencere sınırında büyüyor. Kullanıcı bu düzeltmeyi açıkça istediğinden island.rs koruma kuralına gerekli minimal istisna uygulandı.
## 2026-10-04 — UI/UX hız, panel ve maskot düzeltmeleri
Petten dönüş750ms yerine240ms; kart genişleme70ms. Native pencere doğal içerik yüksekliği ve gerçek zoom/DPI dönüşümüyle boyutlanır; yüksekliği monitörün%85'ini aşmaz. Header/footer sabit, kaydırma yalnız iç gövdede. Footer ana düğmesi taşmak yerine yeni satıra geçer. Dar ekranın tek kolon media kuralı korunur. Pet, panel ve sohbet maskotları ortak170native mantıksal px hedefini kullanır. GerçekChromium native branch testleri kısa/uzun içerik veDPI farkını kapsar; tam sonuç SONUC_UIUX_FIX.md içinde.
