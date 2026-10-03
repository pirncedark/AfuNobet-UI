use std::sync::{Mutex, OnceLock};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
use crate::questions::maskele;

static LOG_MUTEX: OnceLock<Mutex<()>> = OnceLock::new();

fn get_mutex() -> &'static Mutex<()> {
    LOG_MUTEX.get_or_init(|| Mutex::new(()))
}

fn mask_message(message: &str) -> String {
    let mut masked = maskele(message);
    
    #[cfg(windows)]
    let home = std::env::var("USERPROFILE").ok();
    #[cfg(not(windows))]
    let home = std::env::var("HOME").ok();

    if let Some(h) = home {
        if !h.is_empty() {
            masked = masked.replace(&h, "~");
        }
    }
    masked
}

pub fn line(message: impl AsRef<str>) {
    let masked = mask_message(message.as_ref());
    eprintln!("[AfuNobet-UI] {}", masked);

    let _guard = get_mutex().lock().unwrap_or_else(|e| e.into_inner());
    if let Err(e) = write_to_log_dir("logs", &masked) {
        eprintln!("[log yazma hatası] {}", e);
    }
}

fn write_to_log_dir(dir: &str, message: &str) -> std::io::Result<()> {
    fs::create_dir_all(dir)?;
    let log_path = Path::new(dir).join("afunobet-ui.log");

    if let Ok(metadata) = fs::metadata(&log_path) {
        if metadata.len() > 2097152 {
            let log_3 = Path::new(dir).join("afunobet-ui.3.log");
            let log_2 = Path::new(dir).join("afunobet-ui.2.log");
            let log_1 = Path::new(dir).join("afunobet-ui.1.log");

            let _ = fs::remove_file(&log_3);
            let _ = fs::rename(&log_2, &log_3);
            let _ = fs::rename(&log_1, &log_2);
            let _ = fs::rename(&log_path, &log_1);
        }
    }

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)?;

    writeln!(file, "{}", message)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    #[test]
    fn test_log_file_creation() {
        let dir = "temp/test_log_file_creation";
        let _ = fs::remove_dir_all(dir);
        write_to_log_dir(dir, "test message").unwrap();
        
        let log_path = Path::new(dir).join("afunobet-ui.log");
        assert!(log_path.exists());
        let content = fs::read_to_string(log_path).unwrap();
        assert_eq!(content, "test message\n");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn test_log_rotation_at_size_limit() {
        let dir = "temp/test_log_rotation";
        let _ = fs::remove_dir_all(dir);
        fs::create_dir_all(dir).unwrap();
        
        let log_path = Path::new(dir).join("afunobet-ui.log");
        let dummy_data = vec![b'A'; 2097153];
        fs::write(&log_path, &dummy_data).unwrap();
        
        write_to_log_dir(dir, "new message").unwrap();
        
        let rotated = Path::new(dir).join("afunobet-ui.1.log");
        assert!(rotated.exists());
        assert_eq!(fs::metadata(&rotated).unwrap().len(), 2097153);
        
        let content = fs::read_to_string(&log_path).unwrap();
        assert_eq!(content, "new message\n");
        
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn test_masking_sk_tokens() {
        let masked = mask_message("my sk-12345ABCD token");
        assert_eq!(masked, "my ••• token");
    }

    #[test]
    fn test_masking_api_keys() {
        let masked = mask_message("password=secret api_key=xyz");
        assert_eq!(masked, "password=••• api_key=•••");
    }

    #[test]
    fn test_masking_bearer_tokens() {
        let masked = mask_message("Bearer XXXXXX");
        assert_eq!(masked, "Bearer •••");
    }

    #[test]
    fn test_masking_home_dir() {
        #[cfg(windows)]
        let env_key = "USERPROFILE";
        #[cfg(not(windows))]
        let env_key = "HOME";

        let old_home = std::env::var(env_key).ok();
        std::env::set_var(env_key, "/home/testuser");
        
        let masked = mask_message("File found at /home/testuser/Documents/test.txt");
        
        if let Some(h) = old_home {
            std::env::set_var(env_key, h);
        } else {
            std::env::remove_var(env_key);
        }

        assert_eq!(masked, "File found at ~/Documents/test.txt");
    }
}
