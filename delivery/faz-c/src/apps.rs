//! C1 hazırlığı: kayıt ayrıştırma ve yalnız kayıt kimliğinden exe açma.
use serde::Deserialize;
use std::{
    cmp::Ordering,
    collections::HashSet,
    path::{Path, PathBuf},
};

#[derive(Debug, Clone, Deserialize)]
pub struct AfuApp {
    pub id: String,
    pub ad: String,
    pub yol: Option<PathBuf>,
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
            .ok_or_else(|| "Uygulama bulunamadı; kurulumunu kontrol et.".to_owned())?;
        let exe = app
            .yol
            .as_deref()
            .filter(|p| exe_dosyasi(p))
            .ok_or_else(|| format!("{} bulunamadı; kurulumunu kontrol et.", app.ad))?;
        launcher
            .ac_parametresiz(exe)
            .map_err(|_| format!("{} açılamadı; yeniden dene.", app.ad))
    }
}

/// Hazırlık adaptörü: üretimde bağlanmadı; headless testte hiçbir zaman çağrılmaz.
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
