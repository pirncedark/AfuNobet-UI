//! Telefon sunucusu: aynı Wi-Fi / Tailscale üzerinden Afu mesajlarını ve sorularını telefona açar.
//! Sıfır yeni bağımlılık (std::net). Her istek `X-Afu-Token` ister; yalnız özel ağ adresleri kabul edilir.
use crate::mesajlar::Mesaj;
use serde_json::{json, Value};
use std::collections::VecDeque;
use std::io::{Read, Write};
use std::net::{IpAddr, TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Manager};

pub const PORT: u16 = 47617;
const GOVDE_SINIRI: usize = 16 * 1024;
const TAMPON_SINIRI: usize = 50;

static TAMPON: Mutex<VecDeque<Mesaj>> = Mutex::new(VecDeque::new());
static TOKEN: Mutex<String> = Mutex::new(String::new());
static TOKEN_DOSYA: OnceLock<PathBuf> = OnceLock::new();

/// `mesajlar_list` mesajı tüketip silmeden önce buraya da koyar; telefon son mesajları görür.
pub fn tampona_ekle(mesaj: Mesaj) {
    if let Ok(mut tampon) = TAMPON.lock() {
        tampon.retain(|m| m.id != mesaj.id);
        tampon.push_back(mesaj);
        while tampon.len() > TAMPON_SINIRI {
            tampon.pop_front();
        }
    }
}

fn tampondan_dus(id: &str) {
    if let Ok(mut tampon) = TAMPON.lock() {
        tampon.retain(|m| m.id != id);
    }
}

/// Telefonun kaynak adresi yalnız özel ağdan olabilir (yerel, LAN, Tailscale).
pub fn ozel_ag(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            let o = v4.octets();
            v4.is_loopback() || o[0] == 10 || (o[0] == 172 && (16..=31).contains(&o[1])) || (o[0] == 192 && o[1] == 168)
                || (o[0] == 100 && (64..=127).contains(&o[1]))
        }
        IpAddr::V6(v6) => v6.is_loopback(),
    }
}

fn rastgele_token() -> String {
    use std::hash::{BuildHasher, Hasher};
    let mut parcalar = String::new();
    for i in 0..4u64 {
        let mut h = std::collections::hash_map::RandomState::new().build_hasher();
        h.write_u64(i);
        h.write_u128(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0));
        parcalar.push_str(&format!("{:016x}", h.finish()));
    }
    parcalar[..32].to_string()
}

fn token_yukle(dosya: &PathBuf) -> String {
    if let Some(t) = std::fs::read_to_string(dosya).ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .and_then(|v| v.get("token").and_then(|t| t.as_str()).map(str::to_owned))
        .filter(|t| t.len() == 32)
    {
        return t;
    }
    token_yaz(dosya)
}

fn token_yaz(dosya: &PathBuf) -> String {
    let token = rastgele_token();
    if let Some(klasor) = dosya.parent() {
        let _ = std::fs::create_dir_all(klasor);
    }
    let _ = std::fs::write(dosya, json!({ "token": token }).to_string());
    token
}

/// Metindeki "1 = evet / 2 = hayır" şıklarını ayıklar (arayüzdeki bicim.ts ile aynı kural).
pub fn secenekler(metin: &str) -> Vec<Value> {
    let mut sonuc = Vec::new();
    for parca in metin.split(|c| c == '/' || c == '\n') {
        let parca = parca.trim();
        let rakamlar: String = parca.chars().rev().take_while(|c| c.is_ascii_digit()).collect::<Vec<_>>().into_iter().rev().collect();
        let _ = rakamlar;
        if let Some(esit) = parca.find('=') {
            let (sol, sag) = parca.split_at(esit);
            let id: String = sol.trim().chars().rev().take_while(|c| c.is_ascii_digit()).collect::<Vec<_>>().into_iter().rev().collect();
            let etiket = sag[1..].trim();
            if !id.is_empty() && !etiket.is_empty() {
                sonuc.push(json!({ "id": id, "etiket": etiket }));
            }
        }
    }
    sonuc
}

fn mesaj_json(m: &Mesaj) -> Value {
    json!({ "id": m.id, "ajan": m.ajan, "tur": m.tur, "metin": m.metin, "secenekler": secenekler(&m.metin), "zaman": m.zaman })
}

fn sorular() -> Vec<Value> {
    let dizin = crate::questions::kok().join("sorular");
    let mut liste = Vec::new();
    if let Ok(girisler) = std::fs::read_dir(dizin) {
        for giris in girisler.flatten().take(20) {
            if giris.path().extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(v) = std::fs::read(giris.path()).ok().filter(|b| b.len() <= 64 * 1024).and_then(|b| serde_json::from_slice::<Value>(&b).ok()) {
                    liste.push(v);
                }
            }
        }
    }
    liste
}

struct Istek {
    yontem: String,
    yol: String,
    token: String,
    govde: Vec<u8>,
}

fn istek_oku(akis: &mut TcpStream) -> Option<Istek> {
    let mut veri = Vec::new();
    let mut parca = [0u8; 2048];
    let baslik_sonu = loop {
        if veri.len() > GOVDE_SINIRI + 4096 {
            return None;
        }
        let n = akis.read(&mut parca).ok()?;
        if n == 0 {
            return None;
        }
        veri.extend_from_slice(&parca[..n]);
        if let Some(i) = veri.windows(4).position(|w| w == b"\r\n\r\n") {
            break i + 4;
        }
    };
    let baslik = String::from_utf8_lossy(&veri[..baslik_sonu]).to_string();
    let mut satirlar = baslik.split("\r\n");
    let ilk = satirlar.next()?;
    let mut kisimlar = ilk.split(' ');
    let yontem = kisimlar.next()?.to_owned();
    let yol = kisimlar.next()?.split('?').next()?.to_owned();
    let (mut token, mut uzunluk) = (String::new(), 0usize);
    for satir in satirlar {
        if let Some((ad, deger)) = satir.split_once(':') {
            match ad.trim().to_ascii_lowercase().as_str() {
                "x-afu-token" => token = deger.trim().to_owned(),
                "content-length" => uzunluk = deger.trim().parse().ok()?,
                _ => {}
            }
        }
    }
    if uzunluk > GOVDE_SINIRI {
        return None;
    }
    let mut govde = veri[baslik_sonu..].to_vec();
    while govde.len() < uzunluk {
        let n = akis.read(&mut parca).ok()?;
        if n == 0 {
            return None;
        }
        govde.extend_from_slice(&parca[..n]);
    }
    govde.truncate(uzunluk);
    Some(Istek { yontem, yol, token, govde })
}

fn yanit_yaz(akis: &mut TcpStream, kod: u16, govde: &Value) {
    let durum = match kod {
        200 => "OK",
        400 => "Bad Request",
        401 => "Unauthorized",
        404 => "Not Found",
        _ => "Error",
    };
    let metin = govde.to_string();
    let _ = write!(
        akis,
        "HTTP/1.1 {kod} {durum}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{metin}",
        metin.len()
    );
}

fn sabit_esit(a: &str, b: &str) -> bool {
    a.len() == b.len() && a.bytes().zip(b.bytes()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// Yönlendirme: (durum kodu, gövde). Test edilebilsin diye ağdan bağımsız.
pub fn yonlendir(yontem: &str, yol: &str, token: &str, govde: &[u8], kok: &std::path::Path) -> (u16, Value) {
    let gecerli = TOKEN.lock().map(|t| !t.is_empty() && sabit_esit(&t, token)).unwrap_or(false);
    if !gecerli {
        return (401, json!({ "hata": "Yetkisiz." }));
    }
    let _ = kok;
    match (yontem, yol) {
        ("GET", "/api/ping") => (200, json!({ "ok": true })),
        ("GET", "/api/durum") => {
            let mesajlar: Vec<Value> = TAMPON.lock().map(|t| t.iter().map(mesaj_json).collect()).unwrap_or_default();
            (200, json!({ "mesajlar": mesajlar, "sorular": sorular() }))
        }
        ("POST", "/api/cevap") => {
            let Some(v) = serde_json::from_slice::<Value>(govde).ok() else { return (400, json!({ "hata": "Cevap okunamadı." })) };
            let id = v.get("id").and_then(|x| x.as_str()).unwrap_or("");
            let metin = v.get("metin").and_then(|x| x.as_str()).map(str::trim).filter(|s| !s.is_empty());
            let secim = v.get("secim").and_then(|x| x.as_str());
            let simdi = crate::questions::simdi_ms();
            let sonuc = if id.starts_with("claude-") {
                let gonder = metin.map(str::to_owned).or_else(|| secim.map(str::to_owned));
                crate::questions::mesaj_cevap_yaz(&crate::questions::kok(), id, gonder.as_deref(), simdi)
            } else {
                crate::questions::cevap_yaz(&crate::questions::kok(), id, secim, metin, simdi)
            };
            match sonuc {
                Ok(()) => {
                    tampondan_dus(id);
                    (200, json!({ "ok": true }))
                }
                Err(e) => (400, json!({ "hata": e })),
            }
        }
        ("POST", "/api/komut") => {
            let Some(v) = serde_json::from_slice::<Value>(govde).ok() else { return (400, json!({ "hata": "Komut okunamadı." })) };
            let ajan = v.get("ajan").and_then(|x| x.as_str()).unwrap_or("");
            let gorev = v.get("gorev").and_then(|x| x.as_str()).map(str::trim).unwrap_or("");
            if gorev.is_empty() {
                return (400, json!({ "hata": "Görev boş olamaz." }));
            }
            if let Err(e) = crate::orkestra::gonderim_gecerli(ajan, "AfuNobet-UI") {
                return (400, json!({ "hata": e }));
            }
            match crate::orkestra::build_command(&crate::orkestra::project_root(), ajan, "AfuNobet-UI", gorev).spawn() {
                Ok(_) => (200, json!({ "ok": true })),
                Err(_) => (400, json!({ "hata": "Görev başlatılamadı." })),
            }
        }
        _ => (404, json!({ "hata": "Bulunamadı." })),
    }
}

fn baglanti_isle(mut akis: TcpStream) {
    let _ = akis.set_read_timeout(Some(Duration::from_secs(5)));
    let _ = akis.set_write_timeout(Some(Duration::from_secs(5)));
    let izinli = akis.peer_addr().map(|a| ozel_ag(a.ip())).unwrap_or(false);
    if !izinli {
        return;
    }
    let Some(istek) = istek_oku(&mut akis) else {
        yanit_yaz(&mut akis, 400, &json!({ "hata": "İstek okunamadı." }));
        return;
    };
    let kok = crate::questions::kok();
    let sonuc = std::panic::catch_unwind(|| yonlendir(&istek.yontem, &istek.yol, &istek.token, &istek.govde, &kok));
    let (kod, govde) = sonuc.unwrap_or((500, json!({ "hata": "Sunucu hatası." })));
    yanit_yaz(&mut akis, kod, &govde);
}

pub fn baslat(app: AppHandle) {
    if let Ok(klasor) = app.path().app_data_dir() {
        let dosya = klasor.join("telefon.json");
        let token = token_yukle(&dosya);
        if let Ok(mut t) = TOKEN.lock() {
            *t = token;
        }
        let _ = TOKEN_DOSYA.set(dosya);
    }
    std::thread::spawn(|| {
        let Ok(dinleyici) = TcpListener::bind(("0.0.0.0", PORT)) else { return };
        for akis in dinleyici.incoming().flatten() {
            std::thread::spawn(move || baglanti_isle(akis));
        }
    });
}

fn yerel_adres() -> Option<String> {
    // Tailscale varsa onun adresi; yoksa yerel ağ adresi.
    if let Ok(cikti) = std::process::Command::new("tailscale").args(["ip", "-4"]).output() {
        if let Some(ip) = String::from_utf8_lossy(&cikti.stdout).lines().next().map(str::trim).filter(|s| !s.is_empty()) {
            return Some(ip.to_owned());
        }
    }
    let soket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    soket.connect("8.8.8.8:80").ok()?;
    Some(soket.local_addr().ok()?.ip().to_string())
}

#[tauri::command]
pub fn telefon_bilgi() -> Value {
    json!({
        "adres": yerel_adres().map(|a| format!("{a}:{PORT}")).unwrap_or_default(),
        "token": TOKEN.lock().map(|t| t.clone()).unwrap_or_default(),
    })
}

#[tauri::command]
pub fn telefon_yenile() -> Value {
    if let Some(dosya) = TOKEN_DOSYA.get() {
        let yeni = token_yaz(dosya);
        if let Ok(mut t) = TOKEN.lock() {
            *t = yeni;
        }
    }
    telefon_bilgi()
}

#[cfg(test)]
mod tests {
    use super::*;

    static KILIT: Mutex<()> = Mutex::new(());
    fn token_kur(t: &str) -> std::sync::MutexGuard<'static, ()> {
        let g = KILIT.lock().unwrap_or_else(|e| e.into_inner());
        *TOKEN.lock().unwrap() = t.to_owned();
        g
    }

    #[test]
    fn ozel_ag_suzgeci() {
        for ok in ["127.0.0.1", "10.1.2.3", "172.16.0.5", "172.31.255.1", "192.168.1.9", "100.64.0.1", "100.127.9.9"] {
            assert!(ozel_ag(ok.parse().unwrap()), "{ok}");
        }
        for kotu in ["8.8.8.8", "172.32.0.1", "100.128.0.1", "100.63.0.1", "192.169.0.1", "1.1.1.1"] {
            assert!(!ozel_ag(kotu.parse().unwrap()), "{kotu}");
        }
    }

    #[test]
    fn token_olmadan_ve_yanlis_token_401() {
        let _g = token_kur("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let kok = std::env::temp_dir();
        assert_eq!(yonlendir("GET", "/api/ping", "", b"", &kok).0, 401);
        assert_eq!(yonlendir("GET", "/api/ping", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", b"", &kok).0, 401);
        assert_eq!(yonlendir("GET", "/api/ping", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", b"", &kok).0, 200);
    }

    #[test]
    fn secenekler_ayiklanir() {
        let s = secenekler("Devam? 1 = evet, hazır / 2 = hayır, sonra");
        assert_eq!(s.len(), 2);
        assert_eq!(s[0]["id"], "1");
        assert_eq!(s[0]["etiket"], "evet, hazır");
        assert_eq!(s[1]["id"], "2");
        assert!(secenekler("şık yok").is_empty());
    }

    #[test]
    fn durum_tampondaki_mesaji_sikla_verir() {
        let _g = token_kur("cccccccccccccccccccccccccccccccc");
        tampona_ekle(Mesaj { surum: 1, id: "claude-test-durum".into(), ajan: "claude".into(), tur: "bitti".into(), metin: "Soru? 1 = a / 2 = b".into(), zaman: 5 });
        let (kod, v) = yonlendir("GET", "/api/durum", "cccccccccccccccccccccccccccccccc", b"", &std::env::temp_dir());
        assert_eq!(kod, 200);
        let m = v["mesajlar"].as_array().unwrap().iter().find(|m| m["id"] == "claude-test-durum").unwrap().clone();
        assert_eq!(m["secenekler"].as_array().unwrap().len(), 2);
        tampondan_dus("claude-test-durum");
    }

    #[test]
    fn tampon_sinirli() {
        for i in 0..80 {
            tampona_ekle(Mesaj { surum: 1, id: format!("t-{i}"), ajan: "claude".into(), tur: "bitti".into(), metin: "x".into(), zaman: i });
        }
        assert!(TAMPON.lock().unwrap().len() <= TAMPON_SINIRI);
    }

    #[test]
    fn bilinmeyen_yol_404() {
        let _g = token_kur("dddddddddddddddddddddddddddddddd");
        assert_eq!(yonlendir("GET", "/yok", "dddddddddddddddddddddddddddddddd", b"", &std::env::temp_dir()).0, 404);
    }

    #[test]
    fn token_32_hex() {
        let t = rastgele_token();
        assert_eq!(t.len(), 32);
        assert!(t.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
