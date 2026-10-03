// Yerel genel ajan API'si (E1c) + güvenli IPC (E5) + kendiliğinden toparlanma (F17).
// Windows adlandırılmış borusu: yalnız aynı kullanıcı, boyut/zaman/bağlantı sınırlı.
// Sözleşme: docs/AJAN_PROTOKOLU.md.
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use windows::core::{HSTRING, PWSTR};
use windows::Win32::Foundation::{
    CloseHandle, LocalFree, ERROR_IO_PENDING, ERROR_PIPE_CONNECTED, HANDLE, HLOCAL, WAIT_OBJECT_0,
};
use windows::Win32::Security::Authorization::{
    ConvertSidToStringSidW, ConvertStringSecurityDescriptorToSecurityDescriptorW, SDDL_REVISION_1,
};
use windows::Win32::Security::{
    EqualSid, GetTokenInformation, TokenUser, PSECURITY_DESCRIPTOR, SECURITY_ATTRIBUTES, TOKEN_QUERY, TOKEN_USER,
};
use windows::Win32::Storage::FileSystem::{
    ReadFile, WriteFile, FILE_FLAGS_AND_ATTRIBUTES, FILE_FLAG_FIRST_PIPE_INSTANCE, FILE_FLAG_OVERLAPPED,
    PIPE_ACCESS_DUPLEX,
};
use windows::Win32::System::Pipes::{
    ConnectNamedPipe, CreateNamedPipeW, DisconnectNamedPipe, GetNamedPipeClientProcessId,
    PIPE_READMODE_BYTE, PIPE_REJECT_REMOTE_CLIENTS, PIPE_TYPE_BYTE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
};
use windows::Win32::System::Threading::{
    CreateEventW, GetCurrentProcess, OpenProcess, OpenProcessToken, WaitForSingleObject,
    PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::System::IO::{CancelIoEx, GetOverlappedResult, OVERLAPPED};

#[derive(Clone, Copy, Debug)]
pub struct Sinirlar {
    pub satir_bayt: usize,
    pub satir_sayisi: usize,
    pub bosta_ms: u32,
    pub baglanti: usize,
}
impl Default for Sinirlar {
    fn default() -> Self {
        Self { satir_bayt: 16_384, satir_sayisi: 64, bosta_ms: 2_000, baglanti: 4 }
    }
}

/// `\\.\pipe\afunobet-ajan-<kullanıcı>`; `AFUNOBET_AJAN_PIPE` tam adı verir.
pub fn boru_adi() -> String {
    if let Some(ad) = std::env::var_os("AFUNOBET_AJAN_PIPE").filter(|v| !v.is_empty()) {
        return ad.to_string_lossy().into_owned();
    }
    let kullanici: String = std::env::var("USERNAME")
        .unwrap_or_default()
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
        .collect();
    let kullanici = if kullanici.is_empty() { "kullanici".into() } else { kullanici };
    format!(r"\\.\pipe\afunobet-ajan-{kullanici}")
}

struct Tutamak(HANDLE);
impl Drop for Tutamak {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }
}
unsafe impl Send for Tutamak {}

fn surec_sid_bayt(surec: HANDLE) -> Option<Vec<u8>> {
    unsafe {
        let mut jeton = HANDLE::default();
        OpenProcessToken(surec, TOKEN_QUERY, &mut jeton).ok()?;
        let jeton = Tutamak(jeton);
        let mut boy = 0u32;
        let _ = GetTokenInformation(jeton.0, TokenUser, None, 0, &mut boy);
        if boy == 0 || boy > 4096 {
            return None;
        }
        // u64 hizası: TOKEN_USER işaretçi içerir.
        let mut tampon = vec![0u64; (boy as usize).div_ceil(8)];
        GetTokenInformation(jeton.0, TokenUser, Some(tampon.as_mut_ptr().cast()), boy, &mut boy).ok()?;
        let bayt: Vec<u8> = std::slice::from_raw_parts(tampon.as_ptr().cast::<u8>(), boy as usize).to_vec();
        Some(bayt)
    }
}

fn token_user_sid(bayt: &[u8]) -> windows::Win32::Security::PSID {
    unsafe { (*(bayt.as_ptr() as *const TOKEN_USER)).User.Sid }
}

/// Bu sürecin kullanıcı SID'i ("S-1-5-21-...").
pub fn kendi_sid() -> Option<String> {
    let bayt = surec_sid_bayt(unsafe { GetCurrentProcess() })?;
    // TOKEN_USER içindeki işaretçi aynı tampona bakar; tampon hizalı kopyada tutulur.
    let mut hizali = vec![0u64; bayt.len().div_ceil(8)];
    unsafe {
        std::ptr::copy_nonoverlapping(bayt.as_ptr(), hizali.as_mut_ptr().cast::<u8>(), bayt.len());
    }
    let _ = hizali;
    // Kopya işaretçileri bozar; SID'i doğrudan yeniden okuyup metne çevir.
    unsafe {
        let mut jeton = HANDLE::default();
        OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut jeton).ok()?;
        let jeton = Tutamak(jeton);
        let mut boy = 0u32;
        let _ = GetTokenInformation(jeton.0, TokenUser, None, 0, &mut boy);
        let mut tampon = vec![0u64; (boy as usize).div_ceil(8)];
        GetTokenInformation(jeton.0, TokenUser, Some(tampon.as_mut_ptr().cast()), boy, &mut boy).ok()?;
        let sid = (*(tampon.as_ptr() as *const TOKEN_USER)).User.Sid;
        let mut metin = PWSTR::null();
        ConvertSidToStringSidW(sid, &mut metin).ok()?;
        let sonuc = metin.to_string().ok();
        LocalFree(Some(HLOCAL(metin.0.cast())));
        sonuc
    }
}

/// Yalnız bu kullanıcıya tam erişim veren, devralmayan DACL.
pub fn sddl(sid: &str) -> String {
    format!("D:P(A;;GA;;;{sid})")
}

/// İstemci süreci bizim kullanıcımıza mı ait? Açılamayan süreç reddedilir.
pub fn ayni_kullanici(pid: u32) -> bool {
    unsafe {
        let Ok(surec) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return false;
        };
        let surec = Tutamak(surec);
        let (Some(istemci), Some(ben)) = (surec_sid_bayt(surec.0), surec_sid_bayt(GetCurrentProcess())) else {
            return false;
        };
        EqualSid(token_user_sid(&istemci), token_user_sid(&ben)).is_ok()
    }
}

struct Guvenlik {
    tanim: PSECURITY_DESCRIPTOR,
}
impl Guvenlik {
    fn yeni() -> Option<Self> {
        let sid = kendi_sid()?;
        let mut tanim = PSECURITY_DESCRIPTOR::default();
        unsafe {
            ConvertStringSecurityDescriptorToSecurityDescriptorW(
                &HSTRING::from(sddl(&sid)),
                SDDL_REVISION_1,
                &mut tanim,
                None,
            )
            .ok()?;
        }
        Some(Self { tanim })
    }
    fn nitelik(&self) -> SECURITY_ATTRIBUTES {
        SECURITY_ATTRIBUTES {
            nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
            lpSecurityDescriptor: self.tanim.0,
            bInheritHandle: false.into(),
        }
    }
}
impl Drop for Guvenlik {
    fn drop(&mut self) {
        unsafe {
            LocalFree(Some(HLOCAL(self.tanim.0)));
        }
    }
}

fn boru_ac(ad: &str, guvenlik: &Guvenlik, ilk: bool) -> Option<Tutamak> {
    let mut bayrak: FILE_FLAGS_AND_ATTRIBUTES = PIPE_ACCESS_DUPLEX | FILE_FLAG_OVERLAPPED;
    if ilk {
        // Aynı adı önceden açmış sahte bir boru varsa açılmaz (ad kapma).
        bayrak |= FILE_FLAG_FIRST_PIPE_INSTANCE;
    }
    let nitelik = guvenlik.nitelik();
    let h = unsafe {
        CreateNamedPipeW(
            &HSTRING::from(ad),
            bayrak,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
            PIPE_UNLIMITED_INSTANCES,
            16_384,
            16_384,
            0,
            Some(&nitelik),
        )
    };
    (!h.is_invalid()).then_some(Tutamak(h))
}

struct Olay(Tutamak);
impl Olay {
    fn yeni() -> Option<Self> {
        unsafe { CreateEventW(None, true, false, None).ok().map(|h| Self(Tutamak(h))) }
    }
}

enum Bekle {
    Tamam(u32),
    Zaman,
    Hata,
}

/// Bindirilmiş G/Ç'yi en fazla `ms` bekler; süre dolarsa işlemi iptal eder.
fn bekle(boru: HANDLE, ov: &mut OVERLAPPED, sonuc: windows::core::Result<()>, ms: u32) -> Bekle {
    let mut n = 0u32;
    match sonuc {
        Ok(()) => {}
        Err(e) if e.code() == ERROR_IO_PENDING.to_hresult() => {
            if unsafe { WaitForSingleObject(ov.hEvent, ms) } != WAIT_OBJECT_0 {
                unsafe {
                    let _ = CancelIoEx(boru, Some(ov));
                    let _ = GetOverlappedResult(boru, ov, &mut n, true);
                }
                return Bekle::Zaman;
            }
        }
        Err(_) => return Bekle::Hata,
    }
    match unsafe { GetOverlappedResult(boru, ov, &mut n, false) } {
        Ok(()) => Bekle::Tamam(n),
        Err(_) => Bekle::Hata,
    }
}

fn yaz(boru: HANDLE, olay: &Olay, veri: &[u8], ms: u32) -> bool {
    let mut ov = OVERLAPPED { hEvent: olay.0 .0, ..Default::default() };
    let sonuc = unsafe { WriteFile(boru, Some(veri), None, Some(&mut ov)) };
    matches!(bekle(boru, &mut ov, sonuc, ms), Bekle::Tamam(n) if n as usize == veri.len())
}

pub type Isleyici = Arc<dyn Fn(&str) -> Result<(), &'static str> + Send + Sync>;

fn cevap(sonuc: Result<(), &str>) -> Vec<u8> {
    match sonuc {
        Ok(()) => b"{\"ok\":true}\n".to_vec(),
        Err(neden) => format!("{{\"ok\":false,\"neden\":\"{neden}\"}}\n").into_bytes(),
    }
}

/// Tek bağlantı: satır satır okur, her satıra cevap yazar, sınırda kapatır.
fn baglanti(boru: Tutamak, sinir: Sinirlar, isle: Isleyici) {
    let _kapat = Kapat(boru.0);
    let mut pid = 0u32;
    if unsafe { GetNamedPipeClientProcessId(boru.0, &mut pid) }.is_err() || !ayni_kullanici(pid) {
        return;
    }
    let Some(olay) = Olay::yeni() else { return };
    let mut birikim: Vec<u8> = Vec::new();
    let mut satir_sayisi = 0usize;
    let mut tampon = vec![0u8; 4096];
    loop {
        let mut ov = OVERLAPPED { hEvent: olay.0 .0, ..Default::default() };
        let sonuc = unsafe { ReadFile(boru.0, Some(&mut tampon), None, Some(&mut ov)) };
        let n = match bekle(boru.0, &mut ov, sonuc, sinir.bosta_ms) {
            Bekle::Tamam(0) | Bekle::Zaman | Bekle::Hata => return,
            Bekle::Tamam(n) => n as usize,
        };
        birikim.extend_from_slice(&tampon[..n]);
        while let Some(konum) = birikim.iter().position(|b| *b == b'\n') {
            let satir: Vec<u8> = birikim.drain(..=konum).collect();
            let satir = &satir[..satir.len() - 1];
            if satir.len() > sinir.satir_bayt {
                let _ = yaz(boru.0, &olay, &cevap(Err("boyut")), sinir.bosta_ms);
                return;
            }
            satir_sayisi += 1;
            if satir_sayisi > sinir.satir_sayisi {
                let _ = yaz(boru.0, &olay, &cevap(Err("sinir")), sinir.bosta_ms);
                return;
            }
            let metin = String::from_utf8_lossy(satir);
            let metin = metin.trim();
            if metin.is_empty() {
                continue;
            }
            if !yaz(boru.0, &olay, &cevap(isle(metin)), sinir.bosta_ms) {
                return;
            }
        }
        if birikim.len() > sinir.satir_bayt {
            let _ = yaz(boru.0, &olay, &cevap(Err("boyut")), sinir.bosta_ms);
            return;
        }
    }
}

struct Kapat(HANDLE);
impl Drop for Kapat {
    fn drop(&mut self) {
        unsafe {
            // YASAK: FlushFileBuffers(self.0) — istemci okumazsa sonsuza dek bekler.
            let _ = DisconnectNamedPipe(self.0);
        }
    }
}

pub struct Sunucu {
    dur: Arc<AtomicBool>,
    is: Option<std::thread::JoinHandle<()>>,
    pub hazir: Arc<AtomicBool>,
    pub yeniden_kurulum: Arc<AtomicUsize>,
}
impl Sunucu {
    pub fn durdur(mut self) {
        self.dur.store(true, Ordering::Release);
        if let Some(is) = self.is.take() {
            let _ = is.join();
        }
    }
}
impl Drop for Sunucu {
    fn drop(&mut self) {
        self.dur.store(true, Ordering::Release);
    }
}

/// Boru sunucusunu başlatır. Açılamazsa (ad kapılmış, geçici hata) artan
/// aralıklarla kendiliğinden yeniden dener; bağlantı hataları sunucuyu düşürmez.
pub fn baslat(ad: String, sinir: Sinirlar, isle: Isleyici) -> Sunucu {
    let dur = Arc::new(AtomicBool::new(false));
    let hazir = Arc::new(AtomicBool::new(false));
    let yeniden = Arc::new(AtomicUsize::new(0));
    let (d, h, y) = (dur.clone(), hazir.clone(), yeniden.clone());
    let is = std::thread::spawn(move || {
        let aktif = Arc::new(AtomicUsize::new(0));
        let mut ara = 50u64;
        let Some(guvenlik) = Guvenlik::yeni() else { return };
        let mut dinleyen: Option<Tutamak> = None;
        while !d.load(Ordering::Acquire) {
            let boru = match dinleyen.take() {
                Some(b) => b,
                None => match boru_ac(&ad, &guvenlik, true) {
                    Some(b) => b,
                    None => {
                        h.store(false, Ordering::Release);
                        y.fetch_add(1, Ordering::Relaxed);
                        std::thread::sleep(Duration::from_millis(ara));
                        ara = (ara * 2).min(2_000);
                        continue;
                    }
                },
            };
            ara = 50;
            h.store(true, Ordering::Release);
            let Some(olay) = Olay::yeni() else {
                std::thread::sleep(Duration::from_millis(200));
                continue;
            };
            let mut ov = OVERLAPPED { hEvent: olay.0 .0, ..Default::default() };
            let mut bagli = match unsafe { ConnectNamedPipe(boru.0, Some(&mut ov)) } {
                Ok(()) => true,
                Err(e) if e.code() == ERROR_PIPE_CONNECTED.to_hresult() => true,
                Err(e) if e.code() == ERROR_IO_PENDING.to_hresult() => false,
                Err(_) => continue, // örnek bozuk: yenisi açılır
            };
            while !bagli && !d.load(Ordering::Acquire) {
                if unsafe { WaitForSingleObject(ov.hEvent, 100) } == WAIT_OBJECT_0 {
                    let mut n = 0;
                    bagli = unsafe { GetOverlappedResult(boru.0, &ov, &mut n, false) }.is_ok();
                    if !bagli {
                        break;
                    }
                }
            }
            if !bagli {
                unsafe {
                    let _ = CancelIoEx(boru.0, Some(&ov));
                    let mut n = 0;
                    let _ = GetOverlappedResult(boru.0, &ov, &mut n, true);
                }
                continue;
            }
            // Ad hiçbir an boş kalmasın: bağlantıyı devretmeden önce yeni örnek aç.
            dinleyen = boru_ac(&ad, &guvenlik, false);
            if aktif.load(Ordering::Acquire) >= sinir.baglanti {
                unsafe {
                    let _ = DisconnectNamedPipe(boru.0);
                }
                continue;
            }
            aktif.fetch_add(1, Ordering::AcqRel);
            let (a, isle) = (aktif.clone(), isle.clone());
            std::thread::spawn(move || {
                baglanti(boru, sinir, isle);
                a.fetch_sub(1, Ordering::AcqRel);
            });
        }
        h.store(false, Ordering::Release);
    });
    Sunucu { dur, is: Some(is), hazir, yeniden_kurulum: yeniden }
}

// ---- Tauri bağlantısı ----

fn kayitlar() -> &'static Mutex<crate::protokol::Kayitlar> {
    static K: OnceLock<Mutex<crate::protokol::Kayitlar>> = OnceLock::new();
    K.get_or_init(Default::default)
}

/// Bir protokol satırını işler; geçerliyse kayıtları günceller ve yükü döndürür.
pub fn satir_isle(satir: &str, simdi: u64) -> Result<serde_json::Value, &'static str> {
    let olay = crate::protokol::coz(satir, simdi)?;
    let mut k = kayitlar().lock().map_err(|_| "ic")?;
    k.uygula(olay);
    k.temizle(simdi);
    Ok(k.yuk())
}

#[tauri::command]
pub fn ajan_listesi() -> serde_json::Value {
    let simdi = crate::questions::simdi_ms();
    let mut k = kayitlar().lock().unwrap_or_else(|e| e.into_inner());
    k.temizle(simdi);
    k.yuk()
}

pub fn start(app: tauri::AppHandle) {
    use tauri::Emitter;
    let isle: Isleyici = Arc::new(move |satir: &str| {
        let yuk = satir_isle(satir, crate::questions::simdi_ms())?;
        let _ = app.emit(crate::protokol::OLAY, yuk);
        Ok(())
    });
    // Uygulama ömrü boyunca açık kalır.
    std::mem::forget(baslat(boru_adi(), Sinirlar::default(), isle));
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{BufRead, BufReader, Write};
    use std::sync::atomic::AtomicUsize;
    use std::time::Instant;

    static SAYAC: AtomicUsize = AtomicUsize::new(0);
    fn ad() -> String {
        format!(r"\\.\pipe\afunobet-test-{}-{}", std::process::id(), SAYAC.fetch_add(1, Ordering::Relaxed))
    }
    fn toplayici() -> (Isleyici, Arc<Mutex<Vec<String>>>) {
        let gelen = Arc::new(Mutex::new(Vec::new()));
        let g = gelen.clone();
        let isle: Isleyici = Arc::new(move |s: &str| {
            crate::protokol::coz(s, 1_790_000_000_000)?;
            g.lock().unwrap().push(s.to_owned());
            Ok(())
        });
        (isle, gelen)
    }
    fn hazir_bekle(s: &Sunucu) {
        let t = Instant::now();
        while !s.hazir.load(Ordering::Acquire) {
            assert!(t.elapsed() < Duration::from_secs(5), "sunucu hazır olmadı");
            std::thread::sleep(Duration::from_millis(10));
        }
    }
    fn baglan(ad: &str) -> std::fs::File {
        let t = Instant::now();
        loop {
            match std::fs::OpenOptions::new().read(true).write(true).open(ad) {
                Ok(f) => return f,
                Err(e) => {
                    assert!(t.elapsed() < Duration::from_secs(5), "bağlanamadı: {e}");
                    std::thread::sleep(Duration::from_millis(10));
                }
            }
        }
    }
    fn gonder(ad: &str, satir: &str) -> String {
        let mut f = baglan(ad);
        f.write_all(satir.as_bytes()).unwrap();
        f.write_all(b"\n").unwrap();
        let mut cevap = String::new();
        BufReader::new(f).read_line(&mut cevap).unwrap();
        cevap
    }
    fn sinir(bosta_ms: u32) -> Sinirlar {
        Sinirlar { bosta_ms, ..Default::default() }
    }

    #[test]
    fn cevap_okumayan_istemci_baglanti_yuvasini_bosaltir() {
        let ad = ad();
        let (isle, _) = toplayici();
        let s = baslat(ad.clone(), Sinirlar { baglanti: 1, ..sinir(150) }, isle);
        hazir_bekle(&s);
        let mut okumayan = baglan(&ad);
        writeln!(okumayan, r#"{{"ajan":"codex","olay":"working"}}"#).unwrap();
        // Cevap boruda kalsın: kapanışta FlushFileBuffers sonsuza dek beklememeli.
        std::thread::sleep(Duration::from_millis(450));
        let cevap = gonder(&ad, r#"{"ajan":"gemini","olay":"thinking"}"#);
        drop(okumayan);
        s.durdur();
        assert_eq!(cevap.trim(), r#"{"ok":true}"#);
    }

    #[test]
    fn sahte_istemci_json_gonderir_yeni_ajan_tanınir() {
        let ad = ad();
        let (isle, gelen) = toplayici();
        let s = baslat(ad.clone(), sinir(2_000), isle);
        hazir_bekle(&s);
        let c = gonder(&ad, r#"{"surum":1,"ajan":"yeni-ajan","olay":"working","oturum":"y-1","gorev":"Rapor"}"#);
        assert_eq!(c.trim(), r#"{"ok":true}"#);
        let c = gonder(&ad, r#"{"ajan":"yeni-ajan","olay":"dans"}"#);
        assert_eq!(c.trim(), r#"{"ok":false,"neden":"olay"}"#);
        assert_eq!(gelen.lock().unwrap().len(), 1);
        // Tauri yolu: aynı satır kayıtlarda görünür.
        let yuk = satir_isle(r#"{"ajan":"yeni-ajan","olay":"working","oturum":"ipc-y"}"#, 1_790_000_000_000).unwrap();
        assert!(yuk["satirlar"].as_array().unwrap().iter().any(|r| r["oturum"] == "ipc-y" && r["ajan"] == "yeni-ajan"));
        s.durdur();
    }

    #[test]
    fn tek_baglantida_coklu_satir_ve_satir_siniri() {
        let ad = ad();
        let (isle, gelen) = toplayici();
        let s = baslat(ad.clone(), Sinirlar { satir_sayisi: 3, ..sinir(2_000) }, isle);
        hazir_bekle(&s);
        let mut f = baglan(&ad);
        for i in 0..5 {
            let _ = writeln!(f, r#"{{"ajan":"codex","olay":"working","oturum":"o{i}"}}"#);
        }
        let mut cevaplar = String::new();
        let mut okuyucu = BufReader::new(f);
        while okuyucu.read_line(&mut cevaplar).unwrap_or(0) > 0 {}
        let satirlar: Vec<_> = cevaplar.lines().collect();
        assert_eq!(satirlar, [r#"{"ok":true}"#, r#"{"ok":true}"#, r#"{"ok":true}"#, r#"{"ok":false,"neden":"sinir"}"#]);
        assert_eq!(gelen.lock().unwrap().len(), 3);
        s.durdur();
    }

    #[test]
    fn buyuk_mesaj_reddedilir_ve_baglanti_kapanir() {
        let ad = ad();
        let (isle, gelen) = toplayici();
        let s = baslat(ad.clone(), sinir(2_000), isle);
        hazir_bekle(&s);
        let mut f = baglan(&ad);
        let buyuk = format!(r#"{{"ajan":"codex","olay":"working","gorev":"{}"}}"#, "x".repeat(20_000));
        let _ = f.write_all(buyuk.as_bytes()); // sunucu erken kapatabilir
        let mut c = String::new();
        let _ = BufReader::new(f).read_line(&mut c);
        assert_eq!(c.trim(), r#"{"ok":false,"neden":"boyut"}"#);
        assert!(gelen.lock().unwrap().is_empty());
        // Sunucu ayakta: sıradaki istemci çalışır.
        assert_eq!(gonder(&ad, r#"{"ajan":"codex","olay":"working"}"#).trim(), r#"{"ok":true}"#);
        s.durdur();
    }

    #[test]
    fn sessiz_istemci_zaman_asiminda_kapatilir() {
        let ad = ad();
        let (isle, _) = toplayici();
        let s = baslat(ad.clone(), sinir(300), isle);
        hazir_bekle(&s);
        let f = baglan(&ad);
        let t = Instant::now();
        let mut c = String::new();
        let n = BufReader::new(f).read_line(&mut c).unwrap_or(0);
        let gecen = t.elapsed();
        assert_eq!(n, 0, "sunucu kapatmalıydı");
        assert!(gecen >= Duration::from_millis(250) && gecen < Duration::from_millis(2_000), "{gecen:?}");
        s.durdur();
    }

    #[test]
    fn esZamanli_baglanti_siniri_asilinca_fazlasi_kapatilir() {
        let ad = ad();
        let (isle, _) = toplayici();
        let s = baslat(ad.clone(), Sinirlar { baglanti: 2, ..sinir(3_000) }, isle);
        hazir_bekle(&s);
        let a = baglan(&ad);
        let b = baglan(&ad);
        std::thread::sleep(Duration::from_millis(150));
        let mut fazla = baglan(&ad);
        let _ = writeln!(fazla, r#"{{"ajan":"codex","olay":"working"}}"#);
        let mut c = String::new();
        let n = BufReader::new(fazla).read_line(&mut c).unwrap_or(0);
        assert_eq!(n, 0, "sınır aşan bağlantı cevap almamalı: {c}");
        drop((a, b));
        std::thread::sleep(Duration::from_millis(150));
        assert_eq!(gonder(&ad, r#"{"ajan":"codex","olay":"working"}"#).trim(), r#"{"ok":true}"#);
        s.durdur();
    }

    #[test]
    fn yalniz_ayni_kullanici_dacl_ve_baska_kullanici_reddi() {
        let sid = kendi_sid().expect("sid");
        assert!(sid.starts_with("S-1-5-"));
        let kural = sddl(&sid);
        assert_eq!(kural, format!("D:P(A;;GA;;;{sid})"));
        for genis in ["WD", "AU", "BU", "AN", "IU", "NU"] {
            assert!(!kural.contains(&format!(";;;{genis})")), "{genis}");
        }
        assert!(ayni_kullanici(std::process::id()));
        // PID 4 = System (NT AUTHORITY\SYSTEM): başka kullanıcı, reddedilir.
        assert!(!ayni_kullanici(4));
        assert!(!ayni_kullanici(0));
        // Boru gerçekten bu DACL ile açılır.
        let g = Guvenlik::yeni().unwrap();
        assert!(boru_ac(&ad(), &g, true).is_some());
    }

    #[test]
    fn ad_kapilmissa_acilmaz_bosalinca_kendiliginden_toparlanir() {
        let ad = ad();
        let g = Guvenlik::yeni().unwrap();
        let sahte = boru_ac(&ad, &g, true).expect("sahte boru");
        let (isle, _) = toplayici();
        let s = baslat(ad.clone(), sinir(2_000), isle);
        std::thread::sleep(Duration::from_millis(300));
        assert!(!s.hazir.load(Ordering::Acquire), "kapılmış ada bağlanmamalı");
        assert!(s.yeniden_kurulum.load(Ordering::Relaxed) >= 1);
        drop(sahte);
        hazir_bekle(&s);
        assert_eq!(gonder(&ad, r#"{"ajan":"codex","olay":"working"}"#).trim(), r#"{"ok":true}"#);
        s.durdur();
    }

    #[test]
    fn yarim_kalan_istemci_sunucuyu_dusurmez_ve_yeniden_baslatma_sonrasi_baglanilir() {
        let ad = ad();
        let (isle, _) = toplayici();
        let s = baslat(ad.clone(), sinir(2_000), isle);
        hazir_bekle(&s);
        {
            let mut f = baglan(&ad);
            let _ = f.write_all(br#"{"ajan":"codex","olay":"wor"#); // satır bitmeden kopar
        }
        assert_eq!(gonder(&ad, r#"{"ajan":"codex","olay":"working"}"#).trim(), r#"{"ok":true}"#);
        s.durdur();
        // AFU yeniden açıldı: aynı adla yeni sunucu, istemci yeniden bağlanır.
        let (isle, _) = toplayici();
        let s = baslat(ad.clone(), sinir(2_000), isle);
        hazir_bekle(&s);
        assert_eq!(gonder(&ad, r#"{"ajan":"gemini","olay":"thinking"}"#).trim(), r#"{"ok":true}"#);
        s.durdur();
    }
}
