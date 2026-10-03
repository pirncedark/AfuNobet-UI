/// Claude köprüsü hook kurulu mu kontrol et
pub fn is_installed() -> bool {
    // ~/.claude/settings.json dosyasında claude_kopru/afu_hook.py var mı?
    let home = match std::env::var("USERPROFILE") {
        Ok(h) => h,
        Err(_) => return false,
    };

    let settings_path = std::path::Path::new(&home).join(".claude").join("settings.json");

    if !settings_path.exists() {
        return false;
    }

    match std::fs::read_to_string(&settings_path) {
        Ok(content) => content.contains("afu_hook") || content.contains("claude_kopru"),
        Err(_) => false,
    }
}
