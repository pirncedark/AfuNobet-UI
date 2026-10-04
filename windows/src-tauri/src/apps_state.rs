//! Afu Merkez durum sözleşmesi: salt okunur ve sınırlandırılmış okuyucu.
use crate::apps::gecerli_id;
use serde::Deserialize;
use std::{
    fs::File,
    io::Read,
    path::Path,
    time::{Duration, SystemTime},
};

#[derive(Debug, PartialEq, Eq, Deserialize)]
pub struct AppDurum {
    pub surum: u8,
    pub id: String,
    pub durum: String,
    pub ozet: String,
    pub guncelleme: String,
}

// Üretici/UI sözleşmesindeki somut gizli bilgi biçimlerini bağımlılıksız tanır.
// Anlamsal bir sır tarayıcısı değildir; üretici kısa insan cümlesi yazmalıdır.
fn gizli_bilgi_bicimi(lower: &str) -> bool {
    for (at, _) in lower.char_indices() {
        if lower[..at]
            .chars()
            .next_back()
            .is_some_and(|c| c.is_alphanumeric() || c == '_')
        {
            continue;
        }
        let rest = &lower[at..];
        for key in [
            "apikey", "api_key", "api key", "api-key", "token", "secret", "password",
        ] {
            if rest
                .strip_prefix(key)
                .is_some_and(|tail| tail.trim_start().starts_with([':', '=']))
            {
                return true;
            }
        }
        if rest
            .strip_prefix("bearer")
            .is_some_and(|tail| tail.chars().next().is_some_and(char::is_whitespace))
        {
            return true;
        }
        for prefix in [
            "sk-", "sk_", "ghp-", "ghp_", "gho-", "gho_", "aiza-", "aiza_",
        ] {
            if rest.strip_prefix(prefix).is_some_and(|tail| {
                tail.bytes()
                    .take_while(|c| c.is_ascii_alphanumeric() || matches!(c, b'-' | b'_'))
                    .count()
                    >= 12
            }) {
                return true;
            }
        }
    }
    // Üretici ve UI ile aynı pratik e-posta biçimi: yerel bölüm@alan.tld.
    for (at, _) in lower.match_indices('@') {
        let local = lower[..at]
            .chars()
            .rev()
            .take_while(|c| c.is_alphanumeric() || matches!(c, '_' | '.' | '+' | '-'))
            .count();
        let domain: String = lower[at + 1..]
            .chars()
            .take_while(|c| c.is_alphanumeric() || matches!(c, '_' | '.' | '-'))
            .collect();
        if local > 0
            && domain.char_indices().any(|(dot, c)| {
                c == '.'
                    && dot > 0
                    && domain[dot + 1..]
                        .bytes()
                        .take_while(u8::is_ascii_lowercase)
                        .count()
                        >= 2
            })
        {
            return true;
        }
    }
    false
}

fn insan_ozeti(s: &str) -> bool {
    if s.chars().count()>60||s.chars().any(|c|c.is_control()||matches!(c,'/'|'\\'|'\u{200b}'..='\u{200f}'|'\u{202a}'..='\u{202e}'|'\u{2066}'..='\u{2069}')) {return false;}
    let lower = s.replace('İ', "I").replace('ı', "i").to_lowercase();
    if gizli_bilgi_bicimi(&lower)
        || lower.contains("::")
        || lower
            .as_bytes()
            .windows(3)
            .any(|w| w[0].is_ascii_alphabetic() && w[1] == b':' && !w[2].is_ascii_whitespace())
        || lower.contains("http")
        || lower.contains("www.")
        || lower.contains(":\\")
        || lower.contains(":/")
    {
        return false;
    }
    for word in lower.split(|c: char| !c.is_alphanumeric() && c != '.') {
        if matches!(word, "pid" | "port" | "ip" | "tcp" | "udp" | "localhost") {
            return false;
        }
        let candidate = word.trim_matches('.');
        let pieces: Vec<&str> = candidate.split('.').collect();
        if pieces.len() == 4
            && pieces.iter().all(|p| {
                !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()) && p.parse::<u8>().is_ok()
            })
        {
            return false;
        }
    }
    true
}

fn sayi(s: &[u8]) -> Option<u64> {
    if s.is_empty() || !s.iter().all(u8::is_ascii_digit) {
        return None;
    }
    s.iter().try_fold(0u64, |n, b| {
        n.checked_mul(10)?.checked_add((b - b'0') as u64)
    })
}
fn artik(y: u64) -> bool {
    y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)
}
fn ay_gunu(y: u64, m: u64) -> u64 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if artik(y) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

/// RFC3339 dar altkümesi: UTC veya ±HH:MM, en fazla 9 kesir basamağı.
/// Artık saniye, yerel saat ve 1970 öncesi zaman kabul edilmez.
fn iso_zaman(text: &str) -> Option<SystemTime> {
    let s = text.as_bytes();
    if s.len() < 20
        || s[4] != b'-'
        || s[7] != b'-'
        || s[10] != b'T'
        || s[13] != b':'
        || s[16] != b':'
    {
        return None;
    }
    let year = sayi(&s[0..4])?;
    let month = sayi(&s[5..7])?;
    let day = sayi(&s[8..10])?;
    let hour = sayi(&s[11..13])?;
    let minute = sayi(&s[14..16])?;
    let second = sayi(&s[17..19])?;
    if year < 1970
        || !(1..=12).contains(&month)
        || day == 0
        || day > ay_gunu(year, month)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return None;
    }
    let mut at = 19;
    let mut nanos = 0u32;
    if s.get(at) == Some(&b'.') {
        at += 1;
        let start = at;
        while s.get(at).is_some_and(u8::is_ascii_digit) {
            at += 1;
        }
        let digits = at - start;
        if !(1..=9).contains(&digits) {
            return None;
        }
        nanos = (sayi(&s[start..at])? as u32) * 10u32.pow((9 - digits) as u32);
    }
    let offset: i64 = match s.get(at) {
        Some(b'Z') if at + 1 == s.len() => 0,
        Some(b'+') | Some(b'-') if at + 6 == s.len() && s[at + 3] == b':' => {
            let hours = sayi(&s[at + 1..at + 3])?;
            let minutes = sayi(&s[at + 4..at + 6])?;
            if hours > 23 || minutes > 59 {
                return None;
            }
            let seconds = (hours * 3600 + minutes * 60) as i64;
            if s[at] == b'+' {
                seconds
            } else {
                -seconds
            }
        }
        _ => return None,
    };
    let mut days = 0u64;
    for y in 1970..year {
        days += if artik(y) { 366 } else { 365 };
    }
    for m in 1..month {
        days += ay_gunu(year, m);
    }
    days += day - 1;
    let epoch = (days * 86400 + hour * 3600 + minute * 60 + second) as i64 - offset;
    if epoch < 0 {
        return None;
    }
    SystemTime::UNIX_EPOCH.checked_add(Duration::new(epoch as u64, nanos))
}

pub fn ayristir(json: &str, id: &str, simdi: SystemTime) -> Option<AppDurum> {
    if json.len() > 4096 || !gecerli_id(id) {
        return None;
    }
    let state: AppDurum = serde_json::from_str(json).ok()?;
    if state.surum != 1
        || state.id != id
        || !matches!(state.durum.as_str(), "bos" | "calisiyor" | "uyari" | "hata")
        || !insan_ozeti(&state.ozet)
    {
        return None;
    }
    let age = simdi.duration_since(iso_zaman(&state.guncelleme)?).ok()?;
    if age > Duration::from_secs(300) {
        return None;
    }
    Some(state)
}

/// Kimlik kayıt girdisinden alınır; dosyanın kendi id alanına güvenilmez.
pub fn oku_icin(id: &str, yol: &Path, simdi: SystemTime) -> Option<AppDurum> {
    let file = File::open(yol).ok()?;
    if !file.metadata().ok()?.is_file() {
        return None;
    }
    let mut bytes = Vec::new();
    file.take(4097).read_to_end(&mut bytes).ok()?;
    if bytes.len() > 4096 {
        return None;
    }
    ayristir(std::str::from_utf8(&bytes).ok()?, id, simdi)
}

/// Planın kısa arayüzü: <id>.json dosya adındaki kimlik de eşleşmelidir.
pub fn oku(yol: &Path, simdi: SystemTime) -> Option<AppDurum> {
    if yol.extension()?.to_str()? != "json" {
        return None;
    }
    oku_icin(yol.file_stem()?.to_str()?, yol, simdi)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn humantime_parse(s: &str) -> SystemTime {
        iso_zaman(s).unwrap()
    }

    #[test]
    fn bayat_ve_bozuk_durum_yok_sayilir() {
        let tdir = std::env::temp_dir().join(format!("afutest-{}", std::process::id()));
        std::fs::create_dir_all(&tdir).unwrap();
        let d = tdir.join("afudm.json");
        std::fs::write(&d, r#"{"surum":1,"id":"afudm","durum":"calisiyor","ozet":"3 indirme","guncelleme":"2026-10-01T12:00:00Z"}"#).unwrap();
        let simdi = humantime_parse("2026-10-01T12:03:00Z");
        assert_eq!(oku(&d, simdi).unwrap().ozet, "3 indirme");
        let gec = humantime_parse("2026-10-01T12:10:00Z");
        assert!(oku(&d, gec).is_none());
        std::fs::write(&d, "{bozuk").unwrap();
        assert!(oku(&d, simdi).is_none());
        let _ = std::fs::remove_dir_all(&tdir);
    }
}
