# Sesli Afu EXE doğrulaması — 2026-10-02

Güncel kaynaklardan Windows x64 release EXE derlendi ve paketlendi.

- Teslim: `dist/afunobet-ui.exe`, 77.329.408 bayt.
- SHA-256: `1b0bad6d922f9d4b31976d58ad3d9ea2defb8830c1591f3b1dd81c55ae227d91`.
- Kaynak EXE ile teslim kopyasının SHA-256 değerleri aynı. PE başlığı x64 / Windows GUI olarak doğrulandı.
- Önceki teslim dosyaları `dist/onceki/sesli-20261002-184658/` altında yedeklendi.

## Kontroller

| Kontrol | Sonuç |
|---|---|
| Frontend testleri | 283 geçti |
| Rust testleri | 187 geçti, 4 atlandı |
| Python sohbet/adaptör testleri | 16 + 6 geçti |
| TypeScript + Vite + Tauri release | Başarılı |
| Gerçek yerel ses üretimi | Başarılı; 24.000 Hz, 7,053125 saniye, 338.628 bayt WAV |
| GPU kilidi | Üretim sonrasında kalmadı |
| EXE açılışı, ayrı WebView2 test profili | 15 saniye sonra süreç çalışıyor ve yanıt veriyor |
| Normal WebView2 profili | Başarısız: HRESULT 0x800700AA, istenen kaynak kullanımda |
| Eski ekran görüntüsü otomasyonu | Başarısız: boş görsel kaynağını beklerken zaman aşımı |

Normal açılışın hata çıktısı `log/exe-startup-stderr.log` içinde. Ayrı profil sonucu `exe-isolated-startup.json` içinde. Test profili yalnız başlatılan test sürecinin ortamında ayarlandı; kalıcı kullanıcı ayarı değiştirilmedi. Kontrolden sonra yalnız bu görevde başlatılan test süreci kapatıldı.

Ekran otomasyonu tanısında önizleme `ready=true` durumuna ulaştı; sayfa JavaScript hata çıktısı üretmedi. Kaynağı olmayan görsel sayfanın kendi URL'sine çözümlendiği için tüm görsellerin yüklenmesini bekleyen eski kontrol tamamlanmadı. Bu kontrol başarılı sayılmadı.

`npm run pack`, `node_modules/.bin` altındaki Tauri komut kısayolu eksik olduğu için çalışmadı. Kurulu CLI doğrudan `node node_modules/@tauri-apps/cli/tauri.js build --no-bundle` ile çalıştırıldı; başarılı çıkıştan sonra `node scripts/pack.mjs` çağrıldı. Derleme `log/exe-build.log` içinde.

Ses üretimi `exe-headless/answer.wav` ve `exe-headless/result.json` ile kanıtlandı. Hoparlörden dinleme, mikrofon, native ekran davranışı ve normal kullanıcı profiliyle açılış kabulü doğrulanmadı. EXE, bu bilgisayardaki `ses_deneme` adaptörünü ve mevcut yerel Python/model ortamını kullanıyor; başka bilgisayara tek EXE taşıyarak Afu model sesinin çalışması doğrulanmadı.

Sonuç: EXE derlemesi, otomatik testler, dosya bütünlüğü, gerçek WAV üretimi ve ayrı profille süreç açılışı geçti. Normal profil açılışı ve masaüstü/ses kabulü eksik.
