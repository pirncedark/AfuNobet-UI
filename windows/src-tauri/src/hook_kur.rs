use serde::{Deserialize, Serialize};
use std::{path::{Path, PathBuf}, fs::{self, OpenOptions}, io::Write};
use serde_json::{Value, json};

#[derive(Clone, Serialize, Deserialize)]
pub struct Degisiklik { pub once: String, pub sonra: String }
fn hata() -> String { "Bağlantı ayarları değiştirilemedi; yeniden dene.".into() }
pub fn onizle(path: &Path, command: &str, kur: bool) -> Result<Degisiklik, String> {
    if command.is_empty() || command.chars().any(char::is_control) { return Err(hata()); }
    let once = match fs::read_to_string(path) { Ok(s) => s, Err(e) if e.kind()==std::io::ErrorKind::NotFound => String::new(), Err(_) => return Err(hata()) };
    let mut document: Value = if once.is_empty() { json!({}) } else { serde_json::from_str(&once).map_err(|_| hata())? };
    let root=document.as_object_mut().ok_or_else(hata)?;
    if kur { root.entry("hooks").or_insert_with(|| json!({})); }
    if let Some(hooks)=root.get_mut("hooks") {
        let hooks=hooks.as_object_mut().ok_or_else(hata)?;
        for entries in hooks.values_mut() {
            let entries=entries.as_array_mut().ok_or_else(hata)?;
            entries.retain(|entry| entry != &json!({"afuNobet":true,"hooks":[{"type":"command","command":command}]}));
        }
        if kur {
            let entries=hooks.entry("Stop").or_insert_with(|| json!([])).as_array_mut().ok_or_else(hata)?;
            entries.push(json!({"afuNobet":true,"hooks":[{"type":"command","command":command}]}));
        }
    }
    let sonra=serde_json::to_string_pretty(&document).map_err(|_| hata())?;
    Ok(Degisiklik { once, sonra })
}
pub fn uygula(path: &Path, degisiklik: &Degisiklik) -> Result<String, String> {
    let document: Value = serde_json::from_str(&degisiklik.sonra).map_err(|_| hata())?;
    if !document.is_object() {
        return Err(hata());
    }
    let parent=path.parent().ok_or_else(hata)?; fs::create_dir_all(parent).map_err(|_| hata())?;
    // A sibling lock prevents simultaneous AFU installers; old diff cannot overwrite new edits.
    let lock_path=path.with_extension("afu-lock");
    let lock=OpenOptions::new().write(true).create_new(true).open(&lock_path).map_err(|_| hata())?;
    struct Guard(PathBuf); impl Drop for Guard { fn drop(&mut self) { let _=fs::remove_file(&self.0); } }
    let _guard=Guard(lock_path); drop(lock);
    let now=match fs::read_to_string(path) { Ok(s)=>s, Err(e) if e.kind()==std::io::ErrorKind::NotFound=>String::new(), Err(_)=>return Err(hata()) };
    if now!=degisiklik.once { return Err("Ayarlar değişmiş; önizlemeyi yeniden aç.".into()); }
    let id=std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|_| hata())?.as_nanos();
    let backup=path.with_extension(format!("json.afu-{id}.bak"));
    let mut backup_file=OpenOptions::new().create_new(true).write(true).open(&backup).map_err(|_| hata())?;
    backup_file.write_all(now.as_bytes()).and_then(|_|backup_file.sync_all()).map_err(|_|hata())?;
    let staging=path.with_extension(format!("afu-{id}.tmp")); let _staging_guard=Guard(staging.clone());
    let mut file=OpenOptions::new().create_new(true).write(true).open(&staging).map_err(|_|hata())?;
    file.write_all(degisiklik.sonra.as_bytes()).and_then(|_|file.sync_all()).map_err(|_|hata())?; drop(file);
    if fs::read_to_string(path).unwrap_or_default()!=now { return Err("Ayarlar değişmiş; önizlemeyi yeniden aç.".into()); }
    #[cfg(windows)] {
        use std::os::windows::ffi::OsStrExt;
        use windows::{core::PCWSTR, Win32::Storage::FileSystem::{MoveFileExW,MOVEFILE_REPLACE_EXISTING,MOVEFILE_WRITE_THROUGH}};
        let from:Vec<u16>=staging.as_os_str().encode_wide().chain(Some(0)).collect(); let to:Vec<u16>=path.as_os_str().encode_wide().chain(Some(0)).collect();
        unsafe { MoveFileExW(PCWSTR(from.as_ptr()),PCWSTR(to.as_ptr()),MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH) }.map_err(|_|hata())?;
    }
    #[cfg(not(windows))] fs::rename(&staging,path).map_err(|_|hata())?;
    Ok(backup.to_string_lossy().into_owned())
}

// This task authorizes a staging copy only. Never resolve or read ~/.claude here.
fn deneme_yolu(app:&tauri::AppHandle)->Result<PathBuf,String> {
    use tauri::Manager;
    app.path().app_data_dir().map(|p|p.join("hook-deneme/settings.json")).map_err(|_|hata())
}
#[tauri::command]
pub fn hook_onizle(app:tauri::AppHandle,command:String,kur:bool)->Result<Degisiklik,String> {
    onizle(&deneme_yolu(&app)?,&command,kur)
}
#[tauri::command]
pub fn hook_uygula(app:tauri::AppHandle,command:String,kur:bool,once:String)->Result<String,String> {
    let path=deneme_yolu(&app)?;
    let plan=onizle(&path,&command,kur)?;
    if plan.once!=once {return Err("Ayarlar değişmiş; önizlemeyi yeniden aç.".into());}
    uygula(&path,&plan)
}
