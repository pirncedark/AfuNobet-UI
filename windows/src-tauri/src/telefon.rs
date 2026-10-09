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
static SES_ONBELLEK: Mutex<VecDeque<(String, Vec<u8>)>> = Mutex::new(VecDeque::new());
static URETIM: Mutex<()> = Mutex::new(());
/// Eşleştirme: 6 haneli, 10 dk geçerli, tek kullanımlık; 5 yanlış denemede kapanır. (kod, bitiş, hata sayısı)
static ESLESTIRME: Mutex<Option<(String, std::time::Instant, u32)>> = Mutex::new(None);

/// `mesajlar_list` mesajı tüketip silmeden önce buraya da koyar; telefon son mesajları görür.
pub fn tampona_ekle(mesaj: Mesaj) {
    // Claude cevabının ilk parçasını telefon istemeden önce hazırla: ses daha çabuk başlar.
    if mesaj.ajan == "claude" && mesaj.tur == "bitti" {
        let metin = mesaj.metin.clone();
        std::thread::spawn(move || {
            if let Some(parca) = ilk_parca(&okunacak(&metin)) {
                let _ = ses_onbellekli(&parca, "okuma");
            }
        });
    }
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

fn yeni_eslestirme_kodu() -> String {
    let t = rastgele_token();
    let sayi = u64::from_str_radix(&t[..12], 16).unwrap_or(0) % 1_000_000;
    let kod = format!("{sayi:06}");
    if let Ok(mut e) = ESLESTIRME.lock() {
        *e = Some((kod.clone(), std::time::Instant::now() + Duration::from_secs(600), 0));
    }
    kod
}

/// Telefon kısa kodu getirir; doğruysa uzun token'ı verir ve kodu tüketir.
pub fn eslestir(kod: &str) -> (u16, Value) {
    let Ok(mut e) = ESLESTIRME.lock() else { return (400, json!({ "hata": "Eşleştirme yapılamadı." })) };
    let Some((dogru, bitis, hata)) = e.as_mut() else { return (400, json!({ "hata": "Önce bilgisayarda Telefon bağlantısını göster'e bas." })) };
    if std::time::Instant::now() > *bitis {
        *e = None;
        return (400, json!({ "hata": "Kodun süresi doldu. Bilgisayarda yeniden göster." }));
    }
    let girilen: String = kod.chars().filter(|c| c.is_ascii_digit()).collect();
    if !sabit_esit(&girilen, dogru) {
        *hata += 1;
        if *hata >= 5 {
            *e = None;
            return (400, json!({ "hata": "Çok fazla yanlış deneme. Bilgisayarda kodu yeniden göster." }));
        }
        return (401, json!({ "hata": "Kod yanlış. Bilgisayardaki 6 haneli kodu yeniden gir." }));
    }
    *e = None;
    let token = TOKEN.lock().map(|t| t.clone()).unwrap_or_default();
    (200, json!({ "token": token }))
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
    if yontem == "POST" && yol == "/api/eslestir" {
        let kod = serde_json::from_slice::<Value>(govde).ok().and_then(|v| v.get("kod").and_then(|k| k.as_str()).map(str::to_owned)).unwrap_or_default();
        return eslestir(&kod);
    }
    let gecerli = TOKEN.lock().map(|t| !t.is_empty() && sabit_esit(&t, token)).unwrap_or(false);
    if !gecerli {
        return (401, json!({ "hata": "Yetkisiz." }));
    }
    let _ = kok;
    match (yontem, yol) {
        ("GET", "/api/ping") => (200, json!({ "ok": true })),
        ("GET", "/api/durum") => {
            let mesajlar: Vec<Value> = TAMPON.lock().map(|t| t.iter().map(mesaj_json).collect()).unwrap_or_default();
            (200, json!({ "mesajlar": mesajlar, "sorular": sorular(), "gorevler": telefon_gorevleri() }))
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
        ("GET", "/api/surum") => match son_apk() {
            Some((surum, _)) => (200, json!({ "surum": surum })),
            None => (404, json!({ "hata": "Güncelleme dosyası yok." })),
        },
        ("POST", "/api/komut") => {
            let Some(v) = serde_json::from_slice::<Value>(govde).ok() else { return (400, json!({ "hata": "Komut okunamadı." })) };
            let ajan = v.get("ajan").and_then(|x| x.as_str()).unwrap_or("");
            let gorev = v.get("gorev").and_then(|x| x.as_str()).map(str::trim).unwrap_or("");
            if gorev.is_empty() {
                return (400, json!({ "hata": "Görev boş olamaz." }));
            }
            if ajan.eq_ignore_ascii_case("claude") {
                // Telefondan Claude'a görev: Telegram ile aynı gelen kutusuna düşer; AFK/Telegram modundaki Claude oradan okur.
                return match claude_kuyruguna_yaz(gorev) {
                    Ok(()) => (200, json!({ "ok": true })),
                    Err(e) => (400, json!({ "hata": e })),
                };
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

/// Telefon uygulamasındaki `okunacak` ile aynı kural: etiketi ve süsleri atar, en çok 200 karakter.
pub fn okunacak(ham: &str) -> String {
    let mut metin = ham.trim_start();
    if let Some(geri) = metin.strip_prefix("Claude") {
        let geri = geri.trim_start();
        if let Some(sonra) = geri.strip_prefix('·') {
            if let Some(i) = sonra.find(':') {
                if sonra[..i].chars().count() <= 24 && sonra[..i].chars().count() >= 1 {
                    metin = sonra[i + 1..].trim_start();
                }
            }
        }
    }
    let birlesik: Vec<&str> = metin.lines().map(str::trim).filter(|l| !l.is_empty()).collect();
    birlesik.join(" ").chars().filter(|c| !"*`#_>".contains(*c)).take(200).collect()
}

/// Telefonun ilk ses parçası: cümle sınırlarında ~60 karaktere kadar birleştirir (`parcala` ile aynı).
pub fn ilk_parca(metin: &str) -> Option<String> {
    let mut cumleler: Vec<String> = Vec::new();
    let mut simdiki = String::new();
    let karakterler: Vec<char> = metin.chars().collect();
    let mut i = 0;
    while i < karakterler.len() {
        simdiki.push(karakterler[i]);
        let sonu = ".!?…".contains(karakterler[i]);
        if sonu && i + 1 < karakterler.len() && karakterler[i + 1].is_whitespace() {
            cumleler.push(simdiki.trim().to_owned());
            simdiki.clear();
            while i + 1 < karakterler.len() && karakterler[i + 1].is_whitespace() { i += 1; }
        }
        i += 1;
    }
    if !simdiki.trim().is_empty() { cumleler.push(simdiki.trim().to_owned()); }
    let cumleler: Vec<String> = cumleler.into_iter().filter(|c| !c.is_empty()).collect();
    let mut ilk = cumleler.first()?.clone();
    for c in cumleler.iter().skip(1) {
        if ilk.chars().count() + 1 + c.chars().count() <= 60 { ilk.push(' '); ilk.push_str(c); } else { break; }
    }
    Some(ilk)
}

/// Aynı metin tekrar istenirse yeniden üretmez; üretimler sıraya girer.
fn ses_onbellekli(metin: &str, tarz: &str) -> Result<Vec<u8>, String> {
    let anahtar = format!("{tarz}|{metin}");
    let _sira = URETIM.lock().unwrap_or_else(|e| e.into_inner());
    if let Ok(o) = SES_ONBELLEK.lock() {
        if let Some((_, b)) = o.iter().find(|(k, _)| *k == anahtar) {
            return Ok(b.clone());
        }
    }
    let bayt = crate::voice::afu::uret_wav(metin, tarz)?;
    if let Ok(mut o) = SES_ONBELLEK.lock() {
        o.push_back((anahtar, bayt.clone()));
        while o.len() > 16 { o.pop_front(); }
    }
    Ok(bayt)
}

/// Telefondan gelen son görevler ve Claude'a ulaşıp ulaşmadığı ("bekliyor" = bilgisayara ulaştı, "tamamlandi" = Claude aldı).
fn telefon_gorevleri() -> Vec<Value> {
    let Ok(icerik) = std::fs::read_to_string(claude_gelen_yolu()) else { return Vec::new() };
    let mut liste: Vec<Value> = icerik
        .lines()
        .rev()
        .take(60)
        .filter_map(|l| serde_json::from_str::<Value>(l).ok())
        .filter(|v| v.get("kaynak").and_then(|k| k.as_str()) == Some("telefon"))
        .take(5)
        .map(|v| json!({ "metin": v.get("text").cloned().unwrap_or(Value::Null), "durum": v.get("durum").cloned().unwrap_or(Value::Null), "ts": v.get("ts").cloned().unwrap_or(Value::Null) }))
        .collect();
    liste.reverse();
    liste
}

/// Claude gelen kutusu (Telegram ile ortak). `AFU_TG_GELEN` ile değiştirilebilir.
fn claude_gelen_yolu() -> PathBuf {
    std::env::var_os("AFU_TG_GELEN")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(r"C:\Users\afuuu\Desktop\AJAN\antygravitiy\telegram_kuyruk\gelen_mesajlar.jsonl"))
}

pub fn claude_kuyruguna_yaz_yola(yol: &std::path::Path, gorev: &str, simdi_sn: u64) -> Result<(), String> {
    const YOK: &str = "Claude kanalı kapalı. Bilgisayarda Telegram köprüsünü aç.";
    let icerik = std::fs::read_to_string(yol).map_err(|_| YOK.to_owned())?;
    let chat_id = icerik
        .lines()
        .rev()
        .filter_map(|l| serde_json::from_str::<Value>(l).ok())
        .find_map(|v| v.get("chat_id").cloned())
        .ok_or_else(|| YOK.to_owned())?;
    let satir = json!({ "update_id": -(simdi_sn as i64), "chat_id": chat_id, "text": format!("[Telefon] {}", gorev.trim()), "ts": simdi_sn, "durum": "bekliyor", "kaynak": "telefon" });
    let mut dosya = std::fs::OpenOptions::new().append(true).open(yol).map_err(|_| YOK.to_owned())?;
    let basa = if icerik.is_empty() || icerik.ends_with('\n') { "" } else { "\n" };
    write!(dosya, "{basa}{satir}\n").map_err(|_| YOK.to_owned())
}

fn claude_kuyruguna_yaz(gorev: &str) -> Result<(), String> {
    let simdi = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    claude_kuyruguna_yaz_yola(&claude_gelen_yolu(), gorev, simdi)
}

/// Telefon APK'sı bu klasörden sunulur (afunobet-telefon-X.Y.Z.apk); en yüksek sürüm seçilir.
fn apk_klasoru() -> PathBuf {
    std::env::var_os("AFU_TELEFON_APK_DIZINI")
        .map(PathBuf::from)
        .unwrap_or_else(|| crate::orkestra::project_root().join("AfuNobet-Telefon").join("dist"))
}

pub fn surum_sayi(s: &str) -> Option<(u32, u32, u32)> {
    let mut p = s.trim().split('.').map(|x| x.parse::<u32>().ok());
    Some((p.next()??, p.next()??, p.next()??))
}

fn son_apk() -> Option<(String, PathBuf)> {
    let mut en_iyi: Option<((u32, u32, u32), String, PathBuf)> = None;
    for giris in std::fs::read_dir(apk_klasoru()).ok()?.flatten() {
        let ad = giris.file_name().to_string_lossy().to_string();
        let Some(sur) = ad.strip_prefix("afunobet-telefon-").and_then(|r| r.strip_suffix(".apk")) else { continue };
        if let Some(n) = surum_sayi(sur) {
            if en_iyi.as_ref().map(|(b, _, _)| n > *b).unwrap_or(true) {
                en_iyi = Some((n, sur.to_owned(), giris.path()));
            }
        }
    }
    en_iyi.map(|(_, s, p)| (s, p))
}

fn baglanti_isle(mut akis: TcpStream) {
    let _ = akis.set_read_timeout(Some(Duration::from_secs(5)));
    let _ = akis.set_write_timeout(Some(Duration::from_secs(5)));
    let kaynak = akis.peer_addr().ok().map(|a| a.ip());
    let izinli = kaynak.map(ozel_ag).unwrap_or(false);
    if !izinli {
        return;
    }
    let yerel = kaynak.map(|ip| ip.is_loopback()).unwrap_or(false);
    let Some(istek) = istek_oku(&mut akis) else {
        yanit_yaz(&mut akis, 400, &json!({ "hata": "İstek okunamadı." }));
        return;
    };
    // Yalnız bu bilgisayardan: yeni eşleştirme kodu üretir (arayüz ve yardımcı araçlar için).
    if yerel && istek.yontem == "GET" && istek.yol == "/api/yerel-kod" {
        yanit_yaz(&mut akis, 200, &json!({ "kod": yeni_eslestirme_kodu() }));
        return;
    }
    // Sesli yanıt: metni Afu sesiyle WAV olarak üretip telefona verir.
    if istek.yontem == "POST" && istek.yol == "/api/ses-oku" {
        let gecerli = TOKEN.lock().map(|t| !t.is_empty() && sabit_esit(&t, &istek.token)).unwrap_or(false);
        if !gecerli {
            yanit_yaz(&mut akis, 401, &json!({ "hata": "Yetkisiz." }));
            return;
        }
        let v = serde_json::from_slice::<Value>(&istek.govde).unwrap_or(Value::Null);
        let metin: String = v.get("metin").and_then(|m| m.as_str()).unwrap_or("").chars().take(600).collect();
        let tarz = if v.get("tarz").and_then(|t| t.as_str()) == Some("okuma") { "okuma" } else { "sohbet" };
        if metin.trim().is_empty() {
            yanit_yaz(&mut akis, 400, &json!({ "hata": "Okunacak metin yok." }));
            return;
        }
        match ses_onbellekli(&metin, tarz) {
            Ok(bayt) => {
                let _ = akis.set_write_timeout(Some(Duration::from_secs(60)));
                let _ = write!(akis, "HTTP/1.1 200 OK\r\nContent-Type: audio/wav\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", bayt.len());
                let _ = akis.write_all(&bayt);
            }
            Err(e) => yanit_yaz(&mut akis, 400, &json!({ "hata": e })),
        }
        return;
    }
    // APK indirme: token ister, dosya olduğu gibi gönderilir.
    if istek.yontem == "GET" && istek.yol == "/api/apk" {
        let gecerli = TOKEN.lock().map(|t| !t.is_empty() && sabit_esit(&t, &istek.token)).unwrap_or(false);
        if !gecerli {
            yanit_yaz(&mut akis, 401, &json!({ "hata": "Yetkisiz." }));
            return;
        }
        match son_apk().and_then(|(_, yol)| std::fs::read(yol).ok()) {
            Some(bayt) => {
                let _ = akis.set_write_timeout(Some(Duration::from_secs(120)));
                let _ = write!(akis, "HTTP/1.1 200 OK\r\nContent-Type: application/vnd.android.package-archive\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", bayt.len());
                let _ = akis.write_all(&bayt);
            }
            None => yanit_yaz(&mut akis, 404, &json!({ "hata": "Güncelleme dosyası yok." })),
        }
        return;
    }
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
        "kod": yeni_eslestirme_kodu(),
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
    fn eslestirme_dogru_kod_token_verir_ve_tek_kullanimlik() {
        let _g = token_kur("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
        let kod = yeni_eslestirme_kodu();
        assert_eq!(kod.len(), 6);
        assert_eq!(eslestir("000x").0, 401);
        let (k, v) = eslestir(&kod);
        assert_eq!(k, 200);
        assert_eq!(v["token"], "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
        assert_eq!(eslestir(&kod).0, 400);
    }

    #[test]
    fn eslestirme_bes_yanlista_kapanir() {
        let _g = token_kur("ffffffffffffffffffffffffffffffff");
        let kod = yeni_eslestirme_kodu();
        let yanlis = if kod == "111111" { "222222" } else { "111111" };
        for _ in 0..4 { assert_eq!(eslestir(yanlis).0, 401); }
        assert_eq!(eslestir(yanlis).0, 400);
        assert_eq!(eslestir(&kod).0, 400);
    }

    #[test]
    fn surum_karsilastirma_ve_claude_kuyrugu() {
        assert!(surum_sayi("0.10.0") > surum_sayi("0.9.5"));
        assert_eq!(surum_sayi("x.1.2"), None);
        let dizin = std::env::temp_dir().join(format!("afu-tel-{}", std::process::id()));
        std::fs::create_dir_all(&dizin).unwrap();
        let yol = dizin.join("gelen.jsonl");
        assert!(claude_kuyruguna_yaz_yola(&yol, "x", 5).is_err());
        std::fs::write(&yol, "{\"update_id\":1,\"chat_id\":42,\"text\":\"a\",\"durum\":\"tamamlandi\"}\n").unwrap();
        claude_kuyruguna_yaz_yola(&yol, "  yap  ", 100).unwrap();
        let son: Value = serde_json::from_str(std::fs::read_to_string(&yol).unwrap().lines().last().unwrap()).unwrap();
        assert_eq!(son["text"], "[Telefon] yap");
        assert_eq!(son["durum"], "bekliyor");
        assert_eq!(son["chat_id"], 42);
        let _ = std::fs::remove_dir_all(dizin);
    }

    #[test]
    fn okunacak_ve_ilk_parca_telefonla_ayni() {
        assert_eq!(okunacak("Claude · AfuNobet-UI: Merhaba

**dunya**"), "Merhaba dunya");
        assert_eq!(okunacak("a".repeat(500).as_str()).chars().count(), 200);
        let metin = "Merhaba! Bugün nasılsın? Ben iyiyim. Sana yardımcı olmak için buradayım. Ne yapalım istersin?";
        assert_eq!(ilk_parca(metin).as_deref(), Some("Merhaba! Bugün nasılsın? Ben iyiyim."));
        assert_eq!(ilk_parca("   "), None);
    }

    #[test]
    fn token_32_hex() {
        let t = rastgele_token();
        assert_eq!(t.len(), 32);
        assert!(t.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
