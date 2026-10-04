use std::path::Path;
use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize)]
pub struct Stored { pub pet: bool }
pub fn load(path: &Path) -> bool { std::fs::read(path).ok().and_then(|bytes| serde_json::from_slice::<Stored>(&bytes).ok()).map_or(true, |value| value.pet) }
pub fn save(path: &Path, on: bool) -> Result<(), String> {
    let parent = path.parent().ok_or("Ayar kaydedilemedi. Tekrar deneyin.")?;
    std::fs::create_dir_all(parent).map_err(|_| "Ayar kaydedilemedi. Tekrar deneyin.")?;
    let bytes = serde_json::to_vec(&Stored { pet: on }).map_err(|_| "Ayar kaydedilemedi. Tekrar deneyin.")?;
    std::fs::write(path, bytes).map_err(|_| "Ayar kaydedilemedi. Tekrar deneyin.".into())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn missing_or_corrupt_settings_default_on() { assert!(load(Path::new("missing-pet-settings.json"))); }
    #[test]
    fn false_survives_serialization() { let s: Stored = serde_json::from_str("{\"pet\":false}").unwrap(); assert!(!s.pet); }
}
