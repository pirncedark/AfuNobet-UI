SONUC: YARIM

2 Ekim 2026. A13/A14 otomatik doğrulaması tamamlandı. Masaüstü kısayolunu yeniden kaydetmek çalışma alanı dışına yazma kısıtı nedeniyle engellendi; mevcut kısayol zaten dist/afunobet-ui-coucou.exe hedefini gösteriyor. Kapı 1 gerçek Windows kabulü henüz yapılmadı.

## Düzeltmeler

- Rust kök nedeni: test gerçek bir model yüklemiyordu; select_motor(false,true) için mevcut uygulamada desteklenmeyen Windows motorunu bekliyordu. Windows dikte yedeği mevcut kaynakta kapalı ve dinle_yedek ModelMissing döndürüyor. Test silinmedi/atlanmadı; yerel model önceliğini, model yokken her iki Windows bayrağında ModelMissing sonucunu ve tek cümle Türkçe hata metnini doğrulayacak şekilde düzeltildi. voice_start aynı test edilmiş seçimden hata döndürüyor; arayüz hatayı yakalayıp yazarak devam mesajını gösteriyor. Bu görev Windows dikte yedeğini uygulamaz; onun eksikliği gizlenmedi.
- idle_sol kaynak kesimi yatay aynalandı; idle_sag kaynak yönü korundu. Yeniden örnekleme yapılmadı; tuval, alt hizalama, alfa ve kaynak renkleri korundu. Aynalama kesim üreticisine işlendi ve manifestte mirror_x kaydedildi; kaynak karşılaştırması bu dönüşümü doğruluyor. Kontrol görseli incelendi: sol ve sağ yönler doğru. Uygulama WebP dosyaları lossless ve exact kaydedildi; şeffaf pikseller dahil PNG ile eşitlik regresyonu geçti.
- kisayol_guncelle.ps1 hata aldığında başarı yazmaması için Stop kullanıyor. Önceki betik Save başarısız olsa da başarı yazıp Exit0 dönüyordu; artık erişim reddinde Exit1 dönüyor.

## Güncel kanıtlar

| Komut | Sonuç | Tam çıktı |
|---|---|---|
| npm --offline test (windows) | Exit0; 15 dosya, 165 PASS | windows/test-results/faz-a-son-ts.log |
| python -m pytest tests -q | Exit0; 18 PASS | windows/test-results/faz-a-son-python.log |
| cargo test --offline (windows; tam takım, filtre yok) | Exit0; 147 PASS, 0 FAIL, 4 mevcut ignored | windows/test-results/faz-a-son-rust.log |
| python windows/scripts/pet_kes.py --dogrula | Exit0; PASS 50/50 | windows/test-results/faz-a-son-pet.log |
| node windows/scripts/denetim.mjs | Exit0; denetim temiz, MIT korunuyor | Doğrudan komut çıktısı |
| powershell -NoProfile -File ./kisayol_guncelle.ps1 | Exit1; Save UnauthorizedAccessException | windows/test-results/faz-a-son-shortcut.log |

Rust özet grupları: lib65 PASS/2ignored; main0; apps29; runtime11; codex18/1ignored; config1; voice23/1ignored; doc0. Atlanan mevcut testler gerçek model/ses veya ortam fixture'ı gerektiriyor; bu görev yeni ignored eklemedi. Tam cargo test çıktısı bağlantıdaki günlükte korunuyor; gerçek mikrofon testi değildir.

## Teslim

`npm --offline run pack` Exit0; release derlemesi 1 dakika 58 saniye. Tam çıktı: windows/test-results/faz-a-son-build.log. Exe: dist/afunobet-ui-coucou.exe; 9.080.832 bayt; 2026-10-02 13:33:12 Türkiye. SHA256: `9828bd980efed101de39a8d80d28750d6fd85a60bbeb225e3ac9a7e2bfd3c246`. Teslim ve windows/target/release/afunobet-ui.exe hashleri eşit; windows/test-results/faz-a-son-delivery.json içinde doğrulandı.

Önceki exe dist/onceki/afunobet-ui-coucou.exe içinde korunuyor; SHA256 fd9ab5db9033ac838789515db00e5b660a930be7ac5a2383ad5467373067ab41. Tek komutla geri alma: powershell -NoProfile -File dist/onceki/GERI_AL.ps1 (uygulama kapalıyken). Geri alma betiği yeni teslimi değiştirmemek için çalıştırılmadı.

Masaüstü kısayolunun TargetPath değeri yeni teslim yolu ile eşit; aynı yoldaki exe yenilendiği için mevcut kısayol yeni exe'yi hedefliyor. Ancak istenen betikle yeniden kaydetme adımı erişim reddi aldığı için yapılmış sayılmadı. İzinli bir terminalde kisayol_guncelle.ps1 çalıştırılarak bu adım tamamlanabilir.

## Kapı 1 kısa kullanıcı kontrolü

- Masaüstündeki AfuNobet UI kısayolundan aç; karşılama ve küçük görünümü kontrol et.
- Kartı açarken diğer uygulamada yazmayı sürdür; odak çalınmamalı. Şeffaf alana tıklayınca alttaki uygulama tıklanmalı.
- Küçült, petin görev çubuğu yanına indiğini ve tıklayınca kartın döndüğünü kontrol et; sol/sağ bakışları izle.
- Mini peti kapat; sağdaki simgeden kartı aç. Duraklatmayı ve tercihin yeniden açılışta korunmasını dene.
- Ekran ölçeğini %125 ve %150 yap; tam ekran video açıp çık. Ada/pet kırpılmamalı, tam ekranda pet gizlenmeli.
- Yeni bir işin kartta güncellenmesini ve kota/bitiş bildirimlerini kontrol et; 10 dakika boşta CPU/RAM kullanımını ölç.

Commit/push, Claude çağrısı, ücretli API veya yeni uygulama penceresi yapılmadı; ses_deneme/ klasörüne dokunulmadı.

## Tam cargo test --offline cikti kaniti (Exit0)

```text
cargo : warn: could not canonicalize path C:\Users\afuuu
At line:6 char:1
+ cargo test --offline *> test-results/faz-a-son-rust.log; $result=$LAS ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (warn: could not... C:\Users\afuuu:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
   Compiling afunobet-ui v0.1.1 (C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\windows\src-tauri)
warning: constant `STRIP_W` is never used
  --> src-tauri\src\island.rs:30:11
   |
30 | pub const STRIP_W: f64 = 240.0;
   |           ^^^^^^^
   |
   = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default

warning: constant `STRIP_H` is never used
  --> src-tauri\src\island.rs:31:11
   |
31 | pub const STRIP_H: f64 = 6.0;
   |           ^^^^^^^

warning: function `apply_geometry` is never used
   --> src-tauri\src\island.rs:206:8
    |
206 | pub fn apply_geometry(app: &AppHandle, pref: &str, collapsed: bool) {
    |        ^^^^^^^^^^^^^^

warning: function `oku` is never used
   --> src-tauri\src\apps_state.rs:257:8
    |
257 | pub fn oku(yol: &Path, simdi: SystemTime) -> Option<AppDurum> {
    |        ^^^

warning: function `thread_params` is never used
   --> src-tauri\src\codex.rs:215:8
    |
215 | pub fn thread_params(cwd: &Path) -> Value {
    |        ^^^^^^^^^^^^^

warning: associated function `start` is never used
  --> src-tauri\src\voice\capture.rs:85:12
   |
84 | impl Recorder {
   | ------------- associated function in this implementation
85 |     pub fn start() -> Result<Self, SesHata> {
   |            ^^^^^

warning: function `stt_ready_policy` is never used
  --> src-tauri\src\voice\winrt.rs:35:4
   |
35 | fn stt_ready_policy(identity: bool, languages: &[String]) -> bool {
   |    ^^^^^^^^^^^^^^^^

warning: function `konus` is never used
  --> src-tauri\src\voice\winrt.rs:65:8
   |
65 | pub fn konus(metin: &str) -> Result<(), SesHata> {
   |        ^^^^^

warning: method `wait_changed` is never used
   --> src-tauri\src\apps_runtime.rs:190:19
    |
 93 | impl WatchSet {
    | ------------- method in this implementation
...
190 |     pub(crate) fn wait_changed(&self, timeout: Duration) -> bool {
    |                   ^^^^^^^^^^^^

warning: `afunobet-ui` (lib test) generated 7 warnings (6 duplicates)
warning: linker stdout: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\windows\target\debug\deps\afunobet_ui_lib.dll.lib
 kitaplığı ve C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\windows\target\debug\deps\afunobet_ui_lib.dll.exp nesnesi o
luşturuluyor
  |
  = note: `#[warn(linker_messages)]` on by default

warning: `afunobet-ui` (lib) generated 9 warnings
warning: struct `Kayit` is never constructed
  --> src-tauri\tests\..\src\apps.rs:19:12
   |
19 | pub struct Kayit {
   |            ^^^^^
   |
   = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default

warning: trait `ExeLauncher` is never used
  --> src-tauri\tests\..\src\apps.rs:24:11
   |
24 | pub trait ExeLauncher {
   |           ^^^^^^^^^^^

warning: function `gecerli_id` is never used
  --> src-tauri\tests\..\src\apps.rs:28:15
   |
28 | pub(crate) fn gecerli_id(id: &str) -> bool {
   |               ^^^^^^^^^^

warning: function `yukle` is never used
  --> src-tauri\tests\..\src\apps.rs:36:8
   |
36 | pub fn yukle(json: &str) -> Vec<AfuApp> {
   |        ^^^^^

warning: function `exe_dosyasi` is never used
  --> src-tauri\tests\..\src\apps.rs:59:4
   |
59 | fn exe_dosyasi(path: &Path) -> bool {
   |    ^^^^^^^^^^^

warning: function `surum` is never used
  --> src-tauri\tests\..\src\apps.rs:75:4
   |
75 | fn surum(ad: &str) -> Option<Vec<u64>> {
   |    ^^^^^

warning: function `surum_karsilastir` is never used
  --> src-tauri\tests\..\src\apps.rs:91:4
   |
91 | fn surum_karsilastir(a: &[u64], b: &[u64]) -> Ordering {
   |    ^^^^^^^^^^^^^^^^^

warning: function `bul_en_yeni` is never used
   --> src-tauri\tests\..\src\apps.rs:102:8
    |
102 | pub fn bul_en_yeni(kok: &Path, desen: &str) -> Option<PathBuf> {
    |        ^^^^^^^^^^^

warning: associated items `yukle`, `uygulamalar`, `ac_windows`, and `ac` are never used
   --> src-tauri\tests\..\src\apps.rs:150:12
    |
149 | impl Kayit {
    | ---------- associated items in this implementation
150 |     pub fn yukle(json: &str) -> Self {
    |            ^^^^^
...
153 |     pub fn uygulamalar(&self) -> &[AfuApp] {
    |            ^^^^^^^^^^^
...
157 |     pub fn ac_windows(&self, id: &str) -> Result<(), String> {
    |            ^^^^^^^^^^
...
162 |     pub fn ac(&self, id: &str, launcher: &mut impl ExeLauncher) -> Result<(), String> {
    |            ^^

warning: struct `WindowsLauncher` is never constructed
   --> src-tauri\tests\..\src\apps.rs:181:8
    |
181 | struct WindowsLauncher;
    |        ^^^^^^^^^^^^^^^

warning: associated items `dosyadan` and `liste` are never used
   --> src-tauri\tests\..\src\apps.rs:231:12
    |
229 | impl Kayit {
    | ---------- associated items in this implementation
230 |     /// Kayıt sadece okunur; aşırı büyük veya bozuk içerik boş kayıt olur.
231 |     pub fn dosyadan(path: &Path) -> Self {
    |            ^^^^^^^^
...
248 |     pub fn liste(&self, simdi: std::time::SystemTime) -> Vec<AppDto> {
    |            ^^^^^

warning: function `varsayilan_kayit_olustur` is never used
   --> src-tauri\tests\..\src\apps.rs:271:8
    |
271 | pub fn varsayilan_kayit_olustur(
    |        ^^^^^^^^^^^^^^^^^^^^^^^^

warning: function `login_url_gecerli` is never used
   --> src-tauri\tests\..\src\apps.rs:327:15
    |
327 | pub(crate) fn login_url_gecerli(text: &str) -> bool {
    |               ^^^^^^^^^^^^^^^^^

warning: function `proje_klasoru_dogrula` is never used
   --> src-tauri\tests\..\src\apps.rs:369:15
    |
369 | pub(crate) fn proje_klasoru_dogrula(kok: &Path, proje: &str) -> Result<PathBuf, String> {
    |               ^^^^^^^^^^^^^^^^^^^^^

warning: function `login_url_ac` is never used
   --> src-tauri\tests\..\src\apps.rs:395:8
    |
395 | pub fn login_url_ac(url: &str) -> Result<(), String> {
    |        ^^^^^^^^^^^^

warning: function `proje_klasoru_ac` is never used
   --> src-tauri\tests\..\src\apps.rs:404:8
    |
404 | pub fn proje_klasoru_ac(kok: &Path, proje: &str) -> Result<(), String> {
    |        ^^^^^^^^^^^^^^^^

warning: function `ses_ayar_hedefi` is never used
   --> src-tauri\tests\..\src\apps.rs:410:15
    |
410 | pub(crate) fn ses_ayar_hedefi(tur: &str) -> Option<&'static str> {
    |               ^^^^^^^^^^^^^^^

warning: function `ses_ayarlari_ac` is never used
   --> src-tauri\tests\..\src\apps.rs:419:8
    |
419 | pub fn ses_ayarlari_ac(tur: &str) -> Result<(), String> {
    |        ^^^^^^^^^^^^^^^

warning: function `shell_hedef_ac` is never used
   --> src-tauri\tests\..\src\apps.rs:426:4
    |
426 | fn shell_hedef_ac(target: &std::ffi::OsStr) -> Result<(), ()> {
    |    ^^^^^^^^^^^^^^

warning: field `sender` is never read
  --> src-tauri\tests\..\src\apps_runtime.rs:89:5
   |
86 | pub(crate) struct WatchSet {
   |                   -------- field in this struct
...
89 |     sender: SyncSender<Signal>,
   |     ^^^^^^

warning: method `wait` is never used
   --> src-tauri\tests\..\src\apps_runtime.rs:170:8
    |
 93 | impl WatchSet {
    | ------------- method in this implementation
...
170 |     fn wait(&self, timeout: Option<Duration>) -> Option<Signal> {
    |        ^^^^

warning: field `popup` is never read
   --> src-tauri\tests\..\src\apps_runtime.rs:201:5
    |
199 | pub struct Runtime {
    |            ------- field in this struct
200 |     worker: Mutex<Option<Worker>>,
201 |     popup: Mutex<SavedPopup>,
    |     ^^^^^

warning: methods `start`, `pet_popup`, and `restore_popup` are never used
   --> src-tauri\tests\..\src\apps_runtime.rs:204:12
    |
203 | impl Runtime {
    | ------------ methods in this implementation
204 |     pub fn start(&self, app: &AppHandle, registry_path: &Path) -> Result<(), String> {
    |            ^^^^^
...
248 |     pub fn pet_popup(&self, app: &AppHandle, on: bool) -> Result<(), String> {
    |            ^^^^^^^^^
...
291 |     pub fn restore_popup(&self, app: &AppHandle) {
    |            ^^^^^^^^^^^^^

warning: struct `AppDurum` is never constructed
  --> src-tauri\tests\..\src\apps_state.rs:12:12
   |
12 | pub struct AppDurum {
   |            ^^^^^^^^

warning: function `gizli_bilgi_bicimi` is never used
  --> src-tauri\tests\..\src\apps_state.rs:22:4
   |
22 | fn gizli_bilgi_bicimi(lower: &str) -> bool {
   |    ^^^^^^^^^^^^^^^^^^

warning: function `insan_ozeti` is never used
  --> src-tauri\tests\..\src\apps_state.rs:89:4
   |
89 | fn insan_ozeti(s: &str) -> bool {
   |    ^^^^^^^^^^^

warning: function `sayi` is never used
   --> src-tauri\tests\..\src\apps_state.rs:122:4
    |
122 | fn sayi(s: &[u8]) -> Option<u64> {
    |    ^^^^

warning: function `artik` is never used
   --> src-tauri\tests\..\src\apps_state.rs:130:4
    |
130 | fn artik(y: u64) -> bool {
    |    ^^^^^

warning: function `ay_gunu` is never used
   --> src-tauri\tests\..\src\apps_state.rs:133:4
    |
133 | fn ay_gunu(y: u64, m: u64) -> u64 {
    |    ^^^^^^^

warning: function `iso_zaman` is never used
   --> src-tauri\tests\..\src\apps_state.rs:150:4
    |
150 | fn iso_zaman(text: &str) -> Option<SystemTime> {
    |    ^^^^^^^^^

warning: function `ayristir` is never used
   --> src-tauri\tests\..\src\apps_state.rs:223:8
    |
223 | pub fn ayristir(json: &str, id: &str, simdi: SystemTime) -> Option<AppDurum> {
    |        ^^^^^^^^

warning: function `oku_icin` is never used
   --> src-tauri\tests\..\src\apps_state.rs:243:8
    |
243 | pub fn oku_icin(id: &str, yol: &Path, simdi: SystemTime) -> Option<AppDurum> {
    |        ^^^^^^^^

warning: function `oku` is never used
   --> src-tauri\tests\..\src\apps_state.rs:257:8
    |
257 | pub fn oku(yol: &Path, simdi: SystemTime) -> Option<AppDurum> {
    |        ^^^

warning: function `refresh_apps` is never used
 --> src-tauri\tests\apps_runtime_contract.rs:8:12
  |
8 |     pub fn refresh_apps(_app: &tauri::AppHandle) {}
  |            ^^^^^^^^^^^^

warning: method `ac_windows` is never used
   --> src-tauri\tests\..\src\apps.rs:157:12
    |
149 | impl Kayit {
    | ---------- method in this implementation
...
157 |     pub fn ac_windows(&self, id: &str) -> Result<(), String> {
    |            ^^^^^^^^^^
    |
    = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default

warning: variants `OturumYok` and `Mesgul` are never constructed
  --> src-tauri\tests\..\src\codex.rs:24:5
   |
22 | pub enum CodexHata {
   |          --------- variants in this enum
23 |     Bulunamadi,
24 |     OturumYok,
   |     ^^^^^^^^^
...
29 |     Mesgul,
   |     ^^^^^^
   |
   = note: `CodexHata` has derived impls for the traits `Clone` and `Debug`, but these are intentionally ignored during
 dead code analysis
   = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default

warning: type alias `Callback` is never used
   --> src-tauri\tests\..\src\codex.rs:265:6
    |
265 | type Callback = Arc<dyn Fn(CodexEvent) + Send + Sync>;
    |      ^^^^^^^^

warning: function `resolve_exe` is never used
   --> src-tauri\tests\..\src\codex.rs:304:8
    |
304 | pub fn resolve_exe() -> Option<PathBuf> {
    |        ^^^^^^^^^^^

warning: fields `thread_id`, `send_gate`, and `login_id` are never read
   --> src-tauri\tests\..\src\codex.rs:325:5
    |
317 | pub struct CodexBridge {
    |            ----------- fields in this struct
...
325 |     thread_id: Mutex<Option<(String, PathBuf)>>,
    |     ^^^^^^^^^
326 |     send_gate: Mutex<()>,
    |     ^^^^^^^^^
327 |     login_id: Mutex<Option<String>>,
    |     ^^^^^^^^

warning: multiple associated items are never used
   --> src-tauri\tests\..\src\codex.rs:330:12
    |
329 | impl CodexBridge {
    | ---------------- associated items in this implementation
330 |     pub fn start() -> Result<Self, CodexHata> {
    |            ^^^^^
...
333 |     pub fn start_with_callback(callback: Callback) -> Result<Self, CodexHata> {
    |            ^^^^^^^^^^^^^^^^^^^
...
447 |     pub fn status(&self) -> Result<CodexStatus, CodexHata> {
    |            ^^^^^^
...
457 |     pub fn send(&self, text: &str, attachments: &[String], cwd: &Path) -> Result<Value, CodexHata> {
    |            ^^^^
...
519 |     pub fn cancel(&self) -> Result<Value, CodexHata> {
    |            ^^^^^^
...
533 |     pub fn login_start(&self) -> Result<String, CodexHata> {
    |            ^^^^^^^^^^^
...
543 |     pub fn login_cancel(&self) -> Result<Value, CodexHata> {
    |            ^^^^^^^^^^^^

warning: variant `Busy` is never constructed
  --> src-tauri\tests\..\src\voice\mod.rs:18:5
   |
12 | pub enum SesHata {
   |          ------- variant in this enum
...
18 |     Busy,
   |     ^^^^
   |
   = note: `SesHata` has derived impls for the traits `Debug` and `Clone`, but these are intentionally ignored during d
ead code analysis
   = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default

warning: fields `motor` and `speech_lock` are never read
  --> src-tauri\tests\..\src\voice\mod.rs:39:5
   |
37 | pub struct VoiceState {
   |            ---------- fields in this struct
38 |     recorder: Arc<Mutex<Option<(u64, capture::Recorder)>>>,
39 |     motor: Arc<Mutex<Option<whisper::Motor>>>,
   |     ^^^^^
40 |     speech_lock: Arc<Mutex<()>>,
   |     ^^^^^^^^^^^

warning: struct `Supported` is never constructed
   --> src-tauri\tests\..\src\voice\mod.rs:109:12
    |
109 | pub struct Supported {
    |            ^^^^^^^^^

warning: function `voice_supported` is never used
   --> src-tauri\tests\..\src\voice\mod.rs:115:14
    |
115 | pub async fn voice_supported() -> Supported {
    |              ^^^^^^^^^^^^^^^

warning: function `voice_start` is never used
   --> src-tauri\tests\..\src\voice\mod.rs:129:14
    |
129 | pub async fn voice_start(state: State<'_, VoiceState>) -> Result<(), String> {
    |              ^^^^^^^^^^^

warning: function `voice_stop` is never used
   --> src-tauri\tests\..\src\voice\mod.rs:185:14
    |
185 | pub async fn voice_stop(state: State<'_, VoiceState>) -> Result<String, String> {
    |              ^^^^^^^^^^

warning: function `voice_cancel` is never used
   --> src-tauri\tests\..\src\voice\mod.rs:211:14
    |
211 | pub async fn voice_cancel(state: State<'_, VoiceState>) -> Result<(), String> {
    |              ^^^^^^^^^^^^

warning: function `voice_silence` is never used
   --> src-tauri\tests\..\src\voice\mod.rs:217:8
    |
217 | pub fn voice_silence(state: State<'_, VoiceState>) {
    |        ^^^^^^^^^^^^^

warning: function `voice_speak` is never used
   --> src-tauri\tests\..\src\voice\mod.rs:221:14
    |
221 | pub async fn voice_speak(state: State<'_, VoiceState>, text: String) -> Result<(), String> {
    |              ^^^^^^^^^^^

warning: constant `RATE` is never used
 --> src-tauri\tests\..\src\voice\capture.rs:9:11
  |
9 | pub const RATE: u32 = 16_000;
  |           ^^^^

warning: constant `MAX_SECONDS` is never used
  --> src-tauri\tests\..\src\voice\capture.rs:10:11
   |
10 | pub const MAX_SECONDS: usize = 60;
   |           ^^^^^^^^^^^

warning: constant `START_TIMEOUT` is never used
  --> src-tauri\tests\..\src\voice\capture.rs:49:7
   |
49 | const START_TIMEOUT: Duration = Duration::from_secs(5);
   |       ^^^^^^^^^^^^^

warning: static `WORKER_ACTIVE` is never used
  --> src-tauri\tests\..\src\voice\capture.rs:51:8
   |
51 | static WORKER_ACTIVE: AtomicBool = AtomicBool::new(false);
   |        ^^^^^^^^^^^^^

warning: struct `WorkerLease` is never constructed
  --> src-tauri\tests\..\src\voice\capture.rs:52:8
   |
52 | struct WorkerLease;
   |        ^^^^^^^^^^^

warning: associated function `acquire` is never used
  --> src-tauri\tests\..\src\voice\capture.rs:54:8
   |
53 | impl WorkerLease {
   | ---------------- associated function in this implementation
54 |     fn acquire() -> Result<Self, SesHata> {
   |        ^^^^^^^

warning: associated functions `start` and `start_cancelled` are never used
  --> src-tauri\tests\..\src\voice\capture.rs:85:12
   |
84 | impl Recorder {
   | ------------- associated functions in this implementation
85 |     pub fn start() -> Result<Self, SesHata> {
   |            ^^^^^
...
88 |     pub fn start_cancelled(cancelled: Arc<AtomicBool>) -> Result<Self, SesHata> {
   |            ^^^^^^^^^^^^^^^

warning: type alias `Prepared` is never used
   --> src-tauri\tests\..\src\voice\capture.rs:169:6
    |
169 | type Prepared = (cpal::Stream, Arc<Mutex<Vec<f32>>>, Arc<AtomicBool>, u32);
    |      ^^^^^^^^

warning: function `prepare` is never used
   --> src-tauri\tests\..\src\voice\capture.rs:170:4
    |
170 | fn prepare(cancelled: Arc<AtomicBool>) -> Result<Prepared, SesHata> {
    |    ^^^^^^^

warning: function `tts_supported` is never used
  --> src-tauri\tests\..\src\voice\winrt.rs:38:8
   |
38 | pub fn tts_supported() -> bool {
   |        ^^^^^^^^^^^^^

warning: `afunobet-ui` (test "codex_protocol") generated 5 warnings
warning: `afunobet-ui` (test "apps_runtime_contract") generated 34 warnings
warning: `afunobet-ui` (test "apps_contract") generated 4 warnings (3 duplicates)
warning: `afunobet-ui` (test "voice_backend") generated 19 warnings
    Finished `test` profile [unoptimized + debuginfo] target(s) in 10.41s
     Running unittests src\lib.rs (target\debug\deps\afunobet_ui_lib-21f9390329c5b437.exe)

running 67 tests
test codex::tests::owned_child_shutdown_fixture ... ignored, yalnız hidden owned-child fixture; env yoksa hemen döner
test dpi::tests::a_display_that_cannot_be_enumerated_still_yields_a_usable_placement ... ok
test dpi::tests::a_window_sized_in_the_wrong_scale_is_detected_and_corrected ... ok
test codex::tests::eof_releases_all_pending_requests ... ok
test codex::tests::shutdown_is_explicit_idempotent_even_when_arc_clone_survives ... ok
test codex::tests::chunked_utf8_and_crlf_frames ... ok
test codex::tests::correlation_routes_out_of_order_and_errors ... ok
test codex::tests::rate_limit_filter_drops_identifiers_and_credit_data ... ok
test apps_runtime::lifecycle_tests::concurrent_start_is_blocked_until_previous_worker_join_finishes ... ok
test codex::tests::timeout_and_disconnected_are_distinct ... ok
test dpi::tests::an_unusable_or_missing_scale_never_reports_a_correct_size ... ok
test dpi::tests::logical_size_becomes_the_matching_physical_size_at_every_windows_scale ... ok
test dpi::tests::neither_the_panel_nor_the_wake_strip_ever_lands_in_a_corner ... ok
test apps_runtime::lifecycle_tests::stop_wakes_parked_worker_and_joins_only_owned_thread ... ok
test dpi::tests::invalid_scale_uses_one_instead_of_a_one_pixel_window ... ok
test dpi::tests::the_island_hangs_from_the_top_centre_of_the_display ... ok
test glide::tests::cancelled_generation_cannot_move_or_reactivate ... ok
test glide::tests::timing_steps_and_bad_inputs_are_bounded ... ok
test glide::tests::exact_endpoints_and_monotone_descent ... ok
test dpi::tests::missing_monitor_bounds_still_centre_the_panel ... ok
test settings::tests::false_survives_serialization ... ok
test settings::tests::missing_or_corrupt_settings_default_on ... ok
test state::tests::missing_source_does_not_create_a_file ... ok
test taskbar::tests::absent_start_and_autohide_have_safe_defaults ... ok
test state::tests::ordinary_pause_does_not_invent_a_quota_reason ... ok
test taskbar::tests::beside_start_and_on_top_of_taskbar ... ok
test taskbar::tests::every_edge_and_negative_monitor_origin_stays_in_bounds ... ok
test state::tests::user_text_paths_and_raw_quota_errors_are_sanitized ... ok
test state::tests::ordinary_titles_and_filenames_containing_port_are_not_filtered ... ok
test voice::capture::tests::ayni_oran_degismez ... ok
test tray_icon::tests::distinct_statuses ... ok
test tray_icon::tests::transparent_corners_and_size ... ok
test voice::capture::tests::drop_iptal_sinyali_gonderir_worker_kaynagi_birakir ... ok
test voice::capture::tests::bozuk_giris_guvenli ... ok
test state::tests::valid_readonly_source_is_read_without_mutation_and_technical_fields_are_dropped ... ok
test state::tests::malformed_deleted_and_old_version_preserve_last_valid_tasks_with_waiting_message ... ok
test voice::capture::tests::kayit_tavana_ulastiginda_buyumez ... ok
test voice::capture::tests::drop_takilan_surucuyu_beklemez ... ok
test state::tests::display_fields_cross_readonly_bridge_without_private_paths ... ok
test voice::capture::tests::stereo_mono_ortalama ... ok
test voice::tests::shutdown_iptal_eder_ve_idempotenttir ... ok
test voice::tests::shutdown_diger_kilitleri_beklemez ... ok
test voice::tests::yerel_model_oncelikli_yoksa_anlamli_hata_doner ... ok
test voice::capture::tests::yeniden_ornekleme_uzunlugu ... ok
test voice::whisper::tests::cok_kisa_ses_model_gerekmeden_ayirt_edilir ... ok
test voice::whisper::tests::model_yoksa_tek_cumle_hata ... ok
test voice::whisper::tests::turkce_ornek_ses_cevrilir ... ignored, yalnız güvenli örnek WAV ve yerel model ile
test voice::winrt::tests::bos_metin_hoparlor_acmaz ... ok
test voice::winrt::tests::iptal_edilmis_istek_sentez_baslatmaz ... ok
test voice::winrt::tests::turkce_ses_varsa_varsayilandan_once_secilir ... ok
test voice::winrt::tests::turkce_yoksa_windows_varsayilan_sesi_kullanilir ... ok
test state::tests::recorded_quota_circuit_and_last_error_are_detected_without_crossing_ipc ... ok
test voice::winrt::tests::uzun_metin_hoparlor_acmadan_reddedilir ... ok
test voice::winrt::tests::windows_yedegi_paket_kimligi_ve_turkce_dikte_ister ... ok
test state::tests::quota_cache_crosses_bridge_even_without_jobs_and_claude_is_excluded ... ok
test voice::tests::shutdown_kilit_acilinca_gecikmis_iptali_tamamlar ... ok
test voice::capture::tests::stop_worker_sonucunu_alir_ve_kaynak_birakilir ... ok
test watch::tests::atomic_publication_and_existing_file_replace_are_observed ... ok
test watch::tests::deleted_parent_is_recreated_and_new_atomic_snapshot_is_observed ... ok
test state::tests::invalid_shape_duplicate_ids_and_oversized_source_are_rejected ... ok
test state::tests::quota_failure_is_paused_but_old_quota_errors_do_not_override_active_or_completed_tasks ... ok
test voice::tests::gecikmis_iptal_yeni_kaydin_sinyalini_degistirmez ... ok
test voice::capture::tests::takilan_worker_stop_beklemesi_sinirlidir ... ok
test codex::tests::shutdown_kills_only_owned_hidden_fixture_while_arc_survives ... ok
test voice::capture::tests::baslangic_hazirligi_zaman_asimi_sinirlidir ... ok
test watch::tests::idle_watch_never_produces_a_timer_read ... ok
test watch::tests::partial_publication_retries_once_and_recovers_without_restart ... ok

test result: ok. 65 passed; 0 failed; 2 ignored; 0 measured; 0 filtered out; finished in 0.52s

     Running unittests src\main.rs (target\debug\deps\afunobet_ui-602627a9a160c829.exe)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running tests\apps_contract.rs (target\debug\deps\apps_contract-351f7eaeb58af749.exe)

running 29 tests
test bozuk_json_ve_dizi_olmayan_bos_kayit_uretir ... ok
test bos_yanlis_tur_ve_yinelenen_kimlik_atlanir ... ok
test bozuk_satir_gecerli_komsulari_kaybettirmez ... ok
test bozuk_bilinmeyen_ve_eksik_durum_reddedilir ... ok
test bayat_gelecek_ve_kimlik_uyusmazligi_yok_sayilir ... ok
test gizli_bilgi_isaretleri_ve_eposta_ozetten_reddedilir ... ok
test gizli_bilgi_suzgeci_siradan_turkce_insan_metnini_korur ... ok
test login_url_tam_ayristirilir_ve_yalniz_guvenilen_otoriteyi_kabul_eder ... ok
test iso_tarih_araligi_ve_bicimi_kati_dogrulanir ... ok
test desen_yol_kacisi_ve_eksik_kok_reddedilir ... ok
test ses_ayarlari_yalniz_sabit_hedefleri_kabul_eder ... ok
test acma_hatasi_insan_mesajina_donusur ... ok
test exe_olmayan_eksik_dizin_ve_argumanli_yol_hic_acilmaz ... ok
test takvim_tasma_hatasi_tazelik_kontrolunun_arkasina_saklanmaz ... ok
test taze_durum_ve_bes_dakika_siniri_okunur ... ok
test teknik_ve_kontrol_metni_ana_uiya_gecmez ... ok
test teknik_yol_gizli_surucu_ve_ipv6_ozette_gosterilmez ... ok
test tum_durumlar_ve_negatif_ofset_desteklenir ... ok
test turkce_ozet_karakterle_sinirlanir_baytla_degil ... ok
test proje_yalniz_kok_icindeki_dogrudan_klasor_olabilir ... ok
test dto_salt_okur_taze_durumla_birlesir ... ok
test asiri_buyuk_dosya_okunmaz ... ok
test okuyucu_salt_okur_ve_dosya_kimligini_denetler ... ok
test yalniz_kayitli_mevcut_exe_parametresiz_kanala_ulastirilir ... ok
test mevcut_bozuk_kayit_ezilmez_ve_okuyucu_sinirlidir ... ok
test proje_junction_kok_disina_kacis_reddedilir ... ok
test cok_parcali_surumlar_sayisal_ve_deterministik ... ok
test kayit_sadece_eksikse_ve_kok_biliniyorsa_olusturulur ... ok
test sayisal_surum_ve_mevcut_exe_secilir ... ok

test result: ok. 29 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.06s

     Running tests\apps_runtime_contract.rs (target\debug\deps\apps_runtime_contract-f50bab3bb087f767.exe)

running 11 tests
test no_status_means_no_timer_stale_transition_stops_timer ... ok
test popup_bad_scale_uses_safe_default ... ok
test popup_bottom_anchor_and_center_preserved ... ok
test popup_negative_monitor_and_dpi_clamps ... ok
test runtime_stop_without_start_is_idempotent ... ok
test apps_runtime::lifecycle_tests::stop_wakes_parked_worker_and_joins_only_owned_thread ... ok
test saved_popup_geometry_is_not_overwritten_by_repeat_open ... ok
test apps_runtime::lifecycle_tests::concurrent_start_is_blocked_until_previous_worker_join_finishes ... ok
test watcher_missing_status_parent_creation_is_observed ... ok
test watcher_idle_has_no_poll_and_registry_write_wakes ... ok
test registry_rebind_watches_new_status_and_ignores_removed_status ... ok

test result: ok. 11 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.17s

     Running tests\codex_protocol.rs (target\debug\deps\codex_protocol-6c7f83b035274dfd.exe)

running 19 tests
test codex::tests::owned_child_shutdown_fixture ... ignored, yalnız hidden owned-child fixture; env yoksa hemen döner
test codex::tests::chunked_utf8_and_crlf_frames ... ok
test codex::tests::shutdown_is_explicit_idempotent_even_when_arc_clone_survives ... ok
test codex::tests::correlation_routes_out_of_order_and_errors ... ok
test codex::tests::eof_releases_all_pending_requests ... ok
test codex::tests::timeout_and_disconnected_are_distinct ... ok
test codex::tests::rate_limit_filter_drops_identifiers_and_credit_data ... ok
test failed_or_malformed_config_is_fail_closed_before_thread_start ... ok
test eof_error_is_correlated_before_active_ids_are_cleared ... ok
test dotted_mcp_names_are_kept_as_literal_table_keys ... ok
test partial_and_multiple_frames ... ok
test inherited_mcp_and_apps_are_disabled_in_all_effective_layers ... ok
test process_flags_disable_tools_before_any_thread ... ok
test safe_status_and_notification ... ok
test readonly_and_input_validation ... ok
test stream_events_keep_correlation_but_drop_private_fields ... ok
test thread_start_uses_only_stable_local_protocol_fields ... ok
test oversized_and_invalid_frames_fail_closed ... ok
test codex::tests::shutdown_kills_only_owned_hidden_fixture_while_arc_survives ... ok

test result: ok. 18 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.02s

     Running tests\config.rs (target\debug\deps\config-5a6164050794ca24.exe)

running 1 test
test island_window_is_transparent_non_focusing_and_outside_taskbar ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running tests\voice_backend.rs (target\debug\deps\voice_backend-62f888e15b2081cb.exe)

running 24 tests
test voice::capture::tests::bozuk_giris_guvenli ... ok
test voice::capture::tests::kayit_tavana_ulastiginda_buyumez ... ok
test voice::capture::tests::ayni_oran_degismez ... ok
test voice::capture::tests::drop_iptal_sinyali_gonderir_worker_kaynagi_birakir ... ok
test voice::tests::shutdown_iptal_eder_ve_idempotenttir ... ok
test voice::tests::shutdown_diger_kilitleri_beklemez ... ok
test voice::capture::tests::stereo_mono_ortalama ... ok
test voice::tests::yerel_model_oncelikli_yoksa_anlamli_hata_doner ... ok
test voice::capture::tests::drop_takilan_surucuyu_beklemez ... ok
test voice::whisper::tests::cok_kisa_ses_model_gerekmeden_ayirt_edilir ... ok
test voice::whisper::tests::turkce_ornek_ses_cevrilir ... ignored, yalnız güvenli örnek WAV ve yerel model ile
test voice::whisper::tests::model_yoksa_tek_cumle_hata ... ok
test voice::capture::tests::yeniden_ornekleme_uzunlugu ... ok
test voice::winrt::tests::bos_metin_hoparlor_acmaz ... ok
test voice::winrt::tests::iptal_edilmis_istek_sentez_baslatmaz ... ok
test voice::winrt::tests::turkce_ses_varsa_varsayilandan_once_secilir ... ok
test voice::winrt::tests::turkce_yoksa_windows_varsayilan_sesi_kullanilir ... ok
test voice::winrt::tests::uzun_metin_hoparlor_acmadan_reddedilir ... ok
test voice::winrt::tests::windows_yedegi_paket_kimligi_ve_turkce_dikte_ister ... ok
test voice::tests::shutdown_kilit_acilinca_gecikmis_iptali_tamamlar ... ok
test voice::capture::tests::stop_worker_sonucunu_alir_ve_kaynak_birakilir ... ok
test voice::tests::gecikmis_iptal_yeni_kaydin_sinyalini_degistirmez ... ok
test voice::capture::tests::takilan_worker_stop_beklemesi_sinirlidir ... ok
test voice::capture::tests::baslangic_hazirligi_zaman_asimi_sinirlidir ... ok

test result: ok. 23 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.03s

   Doc-tests afunobet_ui_lib

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s


```
