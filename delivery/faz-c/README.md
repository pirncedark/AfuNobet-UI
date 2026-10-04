# Afu Merkez C1–C2 hazırlık teslimi

Durum: **HEADLESS HAZIR / ÜRETİME ENTEGRE DEĞİL**. Faz A Windows kabulü ve Kapı 1 henüz doğrulanmadığı için bu klasör üretim arayüzünün modül ağacına eklenmedi. GOREV_MASTER, ILERLEME_MASTER, windows/src, windows/src-tauri, kaynak görseller, AfuDM, AfuDesk, PadKöprü ve AfuNöbet motorunda değişiklik yok.

Bu klasör ayrı Cargo workspace ve bağımsız test harness içerir. Ana uygulamadaki kurulu sürümler sabittir: serde 1.0.229, serde_json 1.0.151, windows 0.61.3. Paket veya binary indirilmedi. target klasörü yalnız teslim içindeki derleme çıktısıdır ve .gitignore ile hariç tutulur.

## Dosyalar

- src/apps.rs: C1 kayıt ayrıştırıcı, sayısal sürüm seçimi, kayıt kimliğiyle exe açma doğrulaması, Windows ShellExecuteW adaptörü.
- src/apps_state.rs: C2 durum sözleşmesi, kimlik/tazelik/metin doğrulaması, salt okunur okuyucu.
- tests/contract.rs: headless testler; açma yan etkisi mock kanalla sınanır.
- examples/uygulamalar.json: keşif raporundaki üç gerçek yol ve iki kurulu olmayan uygulama; gerçek LOCALAPPDATA kaydı değildir.
- examples/afudm.json: test amaçlı durum örneği; canlı AfuDM durumunu iddia etmez.
- AFU_MERKEZ.md ve AFU_DURUM_SOZLESMESI.md: arayüzler ve entegrasyon sınırları.
- test-red.log, test-review-red.log, test-secret-red.log, test-green.log, check.log: doğrulama kanıtları.

## Yeniden doğrulama (PowerShell)

```powershell
$deliveryRoot = "C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\delivery\faz-c"
$env:CARGO_NET_OFFLINE = "true"
$env:CARGO_TARGET_DIR = "$deliveryRoot\target"
cargo test --manifest-path "$deliveryRoot\Cargo.toml" --offline --locked
cargo check --manifest-path "$deliveryRoot\Cargo.toml" --offline --locked
cargo fmt --manifest-path "$deliveryRoot\Cargo.toml" --check
```

Bu komutlar GUI uygulaması veya gerçek launcher çalıştırmaz. Testlerdeki exe uzantılı dosyalar yalnız boş içerikli fixture dosyalarıdır. WindowsLauncher headless testlerde çağrılmaz.

## Doğrulama

2026-10-01: İlk RED 18 testte 9 başarısız / 9 başarılı; eksik C1/C2 davranışı yakalandı. İnceleme RED ek insan metni sınırında 19 başarılı / 1 başarısız. Son headless test koşusu **22/22 başarılı**, doc test 0; offline --locked kullanıldı. Gerçek ShellExecuteW açma, kullanıcı tıklaması, tray/pet entegrasyonu ve uygulamaların durum yazması **UNVERIFIED**.

Keşif raporundaki AfuDM, AfuDesk v140 ve PadKopru exe dosyaları Test-Path ile salt okunur doğrulandı: üçü de mevcut. AfuTube ve AfuRemote PC helper için docs/AFU_MERKEZ_KESIF.md içindeki bulunamadı kaydı korundu; yeni kurulum veya tarama yapılmadı.

C2 inceleme düzeltmesi: gizli bilgi atamaları (api_key, api key, api-key, apikey, token, secret, password), Bearer yetkilendirme biçimi, e-posta ve mevcut üretici/UI sözleşmesindeki anahtar önekleri özette reddedilir. Sıradan Türkçe insan metni ve değer taşımayan açıklamalar korunur. Regresyon RED 21 başarılı / 1 başarısız; GREEN 22/22 başarılı. Son cargo check --offline --locked ve cargo fmt --check PASS. Yeni bağımlılık veya indirme yok.

## Kararlar

- Planın ac(&AfuApp) yerine dış çağrı Kayit::ac(id, launcher) ve Kayit::ac_windows(id) olarak daraltıldı: çağıran yalnız kayıt kimliği seçer; yeni yol veya argüman iletemez. Windows adaptörü özel türdür. Bedeli: entegratör tek çağrıyı kayıt kimliği kullanacak biçimde uyarlamalıdır.
- Planın oku(yol, simdi) imzası korundu; <id>.json dosya adına bağlanır. Kayıtta farklı dosya adı varsa oku_icin(kayıt_id, yol, simdi) kullanılır. Bu seçim kimlik uyuşmazlığını reddeder. Bedeli: kayıt id bilgisi çağrıya taşınmalıdır.
- RFC3339 için bağımlılıksız dar altküme seçildi: büyük T/Z, UTC veya ±HH:MM, en fazla 9 kesir basamağı; artık saniye ve 1970 öncesi reddedilir. Üreticiler bu biçimi kullanmalıdır.
- Eksik/bozuk/bayat durum okuyucudan None döner. None bir gerçek uygulama durumu değildir; tüketici durum noktasını göstermemeli ve uygulama için yalnız açma seçeneğini korumalıdır.

## Sonraki adım

Ana oturum bağımsız teslimi kod gözden geçirmeye verir. Kapı 1 ACCEPTED ve sonrasında gerekli kullanıcı kapıları gerçekleşmeden üretim dosyalarına taşıma, kayıt dosyası oluşturma veya exe açma yapılmaz. Commit/push yok.

