//! Afu Merkez: kayıt ayrıştırma ve yalnız kullanıcı tıklamasıyla kayıt kimliğinden exe açma.
use serde::{Deserialize, Serialize};
use std::{
    cmp::Ordering,
    collections::HashSet,
    path::{Path, PathBuf},
};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AfuApp {
    pub id: String,
    pub ad: String,
    pub yol: Option<PathBuf>,
    pub indir_url: Option<String>,
    pub durum_dosyasi: Option<PathBuf>,
    pub simge: Option<PathBuf>,
}

#[derive(Debug, Default)]
pub struct Kayit {
    apps: Vec<AfuApp>,
}

/// Bu kanal argüman, komut metni, betik veya başka bir program kabul etmez.
pub trait ExeLauncher {
    fn ac_parametresiz(&mut self, exe: &Path) -> Result<(), ()>;
}

pub(crate) fn gecerli_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 40
        && id
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || b == b'_')
}

pub fn yukle(json: &str) -> Vec<AfuApp> {
    if json.len() > 65_536 {
        return Vec::new();
    }
    let Ok(serde_json::Value::Array(rows)) = serde_json::from_str(json) else {
        return Vec::new();
    };
    let mut seen = HashSet::new();
    rows.into_iter()
        .filter_map(|row| serde_json::from_value::<AfuApp>(row).ok())
        .filter(|app| {
            gecerli_id(&app.id)
                && !app.ad.trim().is_empty()
                && app.ad.chars().count() <= 60
                && !app
                    .ad
                    .chars()
                    .any(|c| c.is_control() || matches!(c, '/' | '\\' | ':'))
                && seen.insert(app.id.clone())
        })
        .collect()
}

fn exe_dosyasi(path: &Path) -> bool {
    let Some(text) = path.to_str() else {
        return false;
    };
    path.is_absolute()
        && !text.chars().any(|c| c.is_control())
        && !text.starts_with("\\\\")
        && !text.starts_with("//")
        && !text.get(2..).unwrap_or("").contains(':')
        && path
            .extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| e.eq_ignore_ascii_case("exe"))
        && std::fs::symlink_metadata(path).is_ok_and(|m| m.is_file() && !m.file_type().is_symlink())
}

fn surum(ad: &str) -> Option<Vec<u64>> {
    let ad = ad.strip_prefix('v')?;
    if ad.is_empty() {
        return None;
    }
    ad.split('.')
        .map(|p| {
            if p.is_empty() || !p.bytes().all(|b| b.is_ascii_digit()) {
                None
            } else {
                p.parse().ok()
            }
        })
        .collect()
}

fn surum_karsilastir(a: &[u64], b: &[u64]) -> Ordering {
    for i in 0..a.len().max(b.len()) {
        let cmp = a.get(i).unwrap_or(&0).cmp(b.get(i).unwrap_or(&0));
        if cmp != Ordering::Equal {
            return cmp;
        }
    }
    Ordering::Equal
}

/// Tek v* bileşeni desteklenir; kökün dışına çıkan desenler reddedilir.
pub fn bul_en_yeni(kok: &Path, desen: &str) -> Option<PathBuf> {
    let normalized = desen.replace('\\', "/");
    let parts: Vec<&str> = normalized.split('/').collect();
    if parts
        .iter()
        .any(|p| p.is_empty() || *p == "." || *p == ".." || p.contains(':'))
    {
        return None;
    }
    let wildcard = parts.iter().position(|p| *p == "v*")?;
    if parts.iter().filter(|p| p.contains('*')).count() != 1 || wildcard == parts.len() - 1 {
        return None;
    }
    if !parts.last()?.to_ascii_lowercase().ends_with(".exe") {
        return None;
    }
    let mut base = kok.to_owned();
    for p in &parts[..wildcard] {
        base.push(p);
    }
    let entries = std::fs::read_dir(base).ok()?;
    let mut found: Vec<(Vec<u64>, String, PathBuf)> = Vec::new();
    for entry in entries.flatten() {
        if !entry
            .file_type()
            .is_ok_and(|t| t.is_dir() && !t.is_symlink())
        {
            continue;
        }
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        let Some(version) = surum(&name) else {
            continue;
        };
        let mut candidate = entry.path();
        for p in &parts[wildcard + 1..] {
            candidate.push(p);
        }
        if exe_dosyasi(&candidate) {
            found.push((version, name, candidate));
        }
    }
    found.sort_by(|a, b| surum_karsilastir(&a.0, &b.0).then(a.1.cmp(&b.1)));
    found.pop().map(|(_, _, path)| path)
}

impl Kayit {
    pub fn yukle(json: &str) -> Self {
        Self { apps: yukle(json) }
    }
    pub fn uygulamalar(&self) -> &[AfuApp] {
        &self.apps
    }
    #[cfg(windows)]
    pub fn ac_windows(&self, id: &str) -> Result<(), String> {
        self.ac(id, &mut WindowsLauncher)
    }

    /// Seçim yalnız kayıt kimliğidir; çağıran yeni yol veya argüman veremez.
    pub fn ac(&self, id: &str, launcher: &mut impl ExeLauncher) -> Result<(), String> {
        let app = self
            .apps
            .iter()
            .find(|app| app.id == id)
            .ok_or_else(|| "Kurulu değil".to_owned())?;
        if app.id == "afuremote" {
            return Err("Telefonda".to_owned());
        }
        let exe = app
            .yol
            .as_deref()
            .filter(|p| exe_dosyasi(p))
            .ok_or_else(|| "Kurulu değil".to_owned())?;
        launcher
            .ac_parametresiz(exe)
            .map_err(|_| "Açılamadı".to_owned())
    }
}

/// Yalnız kullanıcı tıklama komutu çağırır; headless testler sahte başlatıcı kullanır.
#[cfg(windows)]
struct WindowsLauncher;
#[cfg(windows)]
impl ExeLauncher for WindowsLauncher {
    fn ac_parametresiz(&mut self, exe: &Path) -> Result<(), ()> {
        use std::os::windows::ffi::OsStrExt;
        use windows::{
            core::{w, PCWSTR},
            Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL},
        };
        if !exe_dosyasi(exe) {
            return Err(());
        }
        let wide: Vec<u16> = exe
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        // Dize ömrü çağrı boyunca korunur; parametre ve çalışma dizini NULL.
        let result = unsafe {
            ShellExecuteW(
                None,
                w!("open"),
                PCWSTR(wide.as_ptr()),
                PCWSTR::null(),
                PCWSTR::null(),
                SW_SHOWNORMAL,
            )
        };
        if result.0 as isize > 32 {
            Ok(())
        } else {
            Err(())
        }
    }
}

/// Kullanıcıya yalnız ad, kurulum ve doğrulanmış kısa durum gider; yollar dışarı çıkmaz.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppDto {
    pub id: String,
    pub ad: String,
    pub kurulu: bool,
    pub telefonda: bool,
    pub indir_url: Option<String>,
    pub durum: Option<String>,
    pub ozet: Option<String>,
}

impl Kayit {
    /// Kayıt sadece okunur; aşırı büyük veya bozuk içerik boş kayıt olur.
    pub fn dosyadan(path: &Path) -> Self {
        use std::io::Read;
        let Ok(file) = std::fs::File::open(path) else {
            return Self::default();
        };
        if !file.metadata().is_ok_and(|m| m.is_file()) {
            return Self::default();
        }
        let mut bytes = Vec::new();
        if file.take(65_537).read_to_end(&mut bytes).is_err() || bytes.len() > 65_536 {
            return Self::default();
        }
        std::str::from_utf8(&bytes)
            .map(Self::yukle)
            .unwrap_or_default()
    }

    pub fn liste(&self, simdi: std::time::SystemTime) -> Vec<AppDto> {
        self.apps
            .iter()
            .map(|app| {
                let state = app
                    .durum_dosyasi
                    .as_deref()
                    .and_then(|path| crate::apps_state::oku_icin(&app.id, path, simdi));
                AppDto {
                    id: app.id.clone(),
                    ad: app.ad.clone(),
                    kurulu: app.yol.as_deref().is_some_and(exe_dosyasi),
                    telefonda: app.id == "afuremote",
                    indir_url: etkin_indir_url(app).filter(|u| indir_url_guvenilir(u)),
                    durum: state.as_ref().map(|s| s.durum.clone()),
                    ozet: state.map(|s| s.ozet),
                }
            })
            .collect()
    }

    pub fn indir_url_ac(&self, id: &str) -> Result<(), String> {
        let app = self.apps.iter().find(|a| a.id == id).ok_or("Uygulama bulunamadı.")?;
        let url = etkin_indir_url(app).ok_or("İndirme bağlantısı yok.")?;
        if !indir_url_guvenilir(&url) {
            return Err("Geçersiz indirme bağlantısı.".into());
        }
        shell_hedef_ac(std::ffi::OsStr::new(&url)).map_err(|_| "Tarayıcı açılamadı; yeniden dene.".into())
    }
}

/// Bilinen uygulamaların varsayılan indirme bağlantıları; tek kaynak budur.
/// Eski kayıt dosyalarında `indir_url` alanı yoksa buradan doldurulur.
pub fn varsayilan_indir_url(id: &str) -> Option<&'static str> {
    match id {
        "afudm" => Some("https://github.com/pirncedark/AfuDM/releases/latest"),
        "afudesk" => Some("https://github.com/pirncedark/afudesk/releases/latest"),
        "padkopru" => Some("https://github.com/pirncedark/afugamepad/releases/latest"),
        "afutube" => Some("https://github.com/pirncedark/AfuDM/releases?q=afutube"),
        "afuremote" => Some("https://github.com/pirncedark/AfuRemote/releases/latest"),
        _ => None,
    }
}

fn indir_url_guvenilir(url: &str) -> bool {
    url.starts_with("https://github.com/pirncedark/")
}

/// Kayıttaki bağlantı varsa o, yoksa kimliğe göre varsayılan; kullanıcı dosyası değişmez.
fn etkin_indir_url(app: &AfuApp) -> Option<String> {
    app.indir_url
        .clone()
        .or_else(|| varsayilan_indir_url(&app.id).map(str::to_owned))
}

/// Var olan kullanıcı kaydı asla ezilmez; kök bilinmiyorsa dosya oluşturulmaz.
/// Durum üreticilerine dokunulmaz; varsa yalnız sözleşme dosyaları okunur.
pub fn varsayilan_kayit_olustur(
    path: &Path,
    kok: Option<&Path>,
    durum_kok: Option<&Path>,
) -> Result<bool, String> {
    use std::io::Write;
    if path.exists() {
        return Ok(false);
    }
    let Some(kok) = kok.filter(|p| p.is_absolute() && p.is_dir()) else {
        return Ok(false);
    };
    let dm = kok.join("AfuDM/AfuDM.exe");
    let pad = kok.join("PadKopru/dist/PadKopru/PadKopru.exe");
    let desk = kok.join("AfuDesk/dist/v140/AfuDesk/afudesk.exe");
    let rows = [
        ("afudm", "AfuDM", exe_dosyasi(&dm).then_some(dm)),
        ("afudesk", "AfuDesk", exe_dosyasi(&desk).then_some(desk)),
        ("padkopru", "PadKöprü", exe_dosyasi(&pad).then_some(pad)),
        ("afutube", "AfuTube", None),
        ("afuremote", "AfuRemote", None),
    ]
    .into_iter()
    .map(|(id, ad, yol)| AfuApp {
        indir_url: varsayilan_indir_url(id).map(str::to_owned),
        id: id.into(),
        ad: ad.into(),
        yol,
        durum_dosyasi: durum_kok.map(|p| p.join(format!("{id}.json"))),
        simge: None,
    })
    .collect::<Vec<_>>();
    let content = serde_json::to_vec_pretty(&rows)
        .map_err(|_| "Uygulama listesi hazırlanamadı. Tekrar dene.".to_owned())?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|_| "Uygulama listesi kaydedilemedi. Tekrar dene.".to_owned())?;
    }
    let mut file = match std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
    {
        Ok(file) => file,
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => return Ok(false),
        Err(_) => return Err("Uygulama listesi kaydedilemedi. Tekrar dene.".into()),
    };
    file.write_all(&content)
        .and_then(|_| file.sync_all())
        .map_err(|_| "Uygulama listesi kaydedilemedi. Tekrar dene.".to_owned())?;
    Ok(true)
}

/// Tam URL ayrıştırılır; normalleştirmeyle gizlenen otorite veya yol kabul edilmez.
pub(crate) fn login_url_gecerli(text: &str) -> bool {
    if text.len() > 8192
        || text
            .chars()
            .any(|c| c.is_control() || c.is_whitespace() || c == '\\')
    {
        return false;
    }
    let Some(rest) = text.strip_prefix("https://") else {
        return false;
    };
    let Some((authority, path_query)) = rest.split_once('/') else {
        return false;
    };
    if !matches!(authority, "auth.openai.com" | "auth.openai.com:443") {
        return false;
    }
    let lower = text.to_ascii_lowercase();
    if ["%00", "%0a", "%0d"].iter().any(|s| lower.contains(s)) {
        return false;
    }
    let Ok(url) = tauri::Url::parse(text) else {
        return false;
    };
    if url.scheme() != "https"
        || url.host_str() != Some("auth.openai.com")
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
        || url.fragment().is_some()
    {
        return false;
    }
    let raw_path = path_query.split(['?', '#']).next().unwrap_or("");
    if raw_path.contains('%') || raw_path.split('/').any(|p| p == "." || p == "..") {
        return false;
    }
    let path = url.path();
    raw_path == path.trim_start_matches('/') && path.starts_with('/')
}

/// Kullanıcı yalnız proje adını seçer; tam yol ve alt klasör veremez.
pub(crate) fn proje_klasoru_dogrula(kok: &Path, proje: &str) -> Result<PathBuf, String> {
    let error = || "Proje klasörü bulunamadı; kurulumunu kontrol et.".to_owned();
    if proje.is_empty()
        || proje.len() > 100
        || proje == "."
        || proje == ".."
        || proje.ends_with(['.', ' '])
        || !proje
            .chars()
            .all(|c| c.is_alphanumeric() || matches!(c, ' ' | '-' | '_'))
        || !kok.is_absolute()
    {
        return Err(error());
    }
    let canonical_root = kok.canonicalize().map_err(|_| error())?;
    let canonical_child = kok.join(proje).canonicalize().map_err(|_| error())?;
    if !canonical_root.is_dir()
        || !canonical_child.is_dir()
        || canonical_child.parent() != Some(canonical_root.as_path())
    {
        return Err(error());
    }
    Ok(canonical_child)
}

/// Yalnız Oturum aç düğmesinin doğrulanmış app-server URL'siyle çağrılır.
pub fn login_url_ac(url: &str) -> Result<(), String> {
    if !login_url_gecerli(url) {
        return Err("Oturum açma bağlantısı alınamadı; yeniden dene.".into());
    }
    shell_hedef_ac(std::ffi::OsStr::new(url))
        .map_err(|_| "Oturum açma sayfası açılamadı; yeniden dene.".into())
}

/// Yalnız Projeyi aç kullanıcı tıklamasıyla doğrulanmış kök altında klasör açılır.
pub fn proje_klasoru_ac(kok: &Path, proje: &str) -> Result<(), String> {
    let path = proje_klasoru_dogrula(kok, proje)?;
    shell_hedef_ac(path.as_os_str()).map_err(|_| "Proje klasörü açılamadı; yeniden dene.".into())
}

/// Ayar ekranı yalnız kullanıcının hata çözüm düğmesiyle açılır.
pub(crate) fn ses_ayar_hedefi(tur: &str) -> Option<&'static str> {
    match tur {
        "speech" => Some("ms-settings:privacy-speech"),
        "microphone" => Some("ms-settings:privacy-microphone"),
        "network" => Some("ms-settings:network-status"),
        _ => None,
    }
}

pub fn ses_ayarlari_ac(tur: &str) -> Result<(), String> {
    let hedef = ses_ayar_hedefi(tur).ok_or("Ayar açılamadı; yeniden dene.")?;
    shell_hedef_ac(std::ffi::OsStr::new(hedef))
        .map_err(|_| "Ayar açılamadı; yeniden dene.".into())
}

#[cfg(windows)]
fn shell_hedef_ac(target: &std::ffi::OsStr) -> Result<(), ()> {
    use std::os::windows::ffi::OsStrExt;
    use windows::{
        core::{w, PCWSTR},
        Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL},
    };
    let wide: Vec<u16> = target.encode_wide().chain(std::iter::once(0)).collect();
    let result = unsafe {
        ShellExecuteW(
            None,
            w!("open"),
            PCWSTR(wide.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };
    if result.0 as isize > 32 {
        Ok(())
    } else {
        Err(())
    }
}
#[cfg(not(windows))]
fn shell_hedef_ac(_target: &std::ffi::OsStr) -> Result<(), ()> {
    Err(())
}

/// Sabit yerel HTML; ön yüz yol veya parametre gönderemez.
pub fn animasyon_studyo_ac(kok: &Path) -> Result<(), String> {
    let path = animasyon_studyo_dogrula(kok)?;
    shell_hedef_ac(path.as_os_str()).map_err(|_| "Stüdyo açılamadı; yeniden dene.".into())
}
pub(crate) fn animasyon_studyo_dogrula(kok: &Path) -> Result<PathBuf, String> {
    let error = || "Stüdyo bulunamadı; kurulumunu kontrol et.".to_owned();
    let root = kok.canonicalize().map_err(|_| error())?;
    let path = root.join("studyo/animasyon_studyo.html").canonicalize().map_err(|_| error())?;
    if !path.is_file() || !path.starts_with(&root) { return Err(error()); }
    Ok(path)
}
