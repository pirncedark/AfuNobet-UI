#[path = "../src/apps.rs"]
mod apps;
#[path = "../src/apps_state.rs"]
mod apps_state;
use apps::{ExeLauncher, Kayit};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::{
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{Duration, SystemTime},
};
static COUNTER: AtomicU64 = AtomicU64::new(0);
struct Fixture {
    root: PathBuf,
}
impl Fixture {
    fn new() -> Self {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target/test-fixtures")
            .join(format!(
                "{}-{}",
                std::process::id(),
                COUNTER.fetch_add(1, Ordering::Relaxed)
            ));
        std::fs::create_dir_all(&root).unwrap();
        Self { root }
    }
    fn file(&self, name: &str, body: &[u8]) -> PathBuf {
        let file = self.root.join(name);
        std::fs::create_dir_all(file.parent().unwrap()).unwrap();
        std::fs::write(&file, body).unwrap();
        file
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        assert!(self
            .root
            .starts_with(Path::new(env!("CARGO_MANIFEST_DIR")).join("target/test-fixtures")));
        let _ = std::fs::remove_dir_all(&self.root);
    }
}
#[derive(Default)]
struct MockLauncher {
    launched: Vec<PathBuf>,
    fail: bool,
}
impl ExeLauncher for MockLauncher {
    fn ac_parametresiz(&mut self, exe: &Path) -> Result<(), ()> {
        self.launched.push(exe.to_owned());
        if self.fail {
            Err(())
        } else {
            Ok(())
        }
    }
}
fn registry(path: &Path) -> Kayit {
    Kayit::yukle(&serde_json::json!([{"id":"afudm","ad":"AfuDM","yol":path}]).to_string())
}
fn now() -> SystemTime {
    SystemTime::UNIX_EPOCH + Duration::from_secs(1_790_856_180)
}
fn state(summary: &str, time: &str) -> String {
    serde_json::json!({"surum":1,"id":"afudm","durum":"calisiyor","ozet":summary,"guncelleme":time})
        .to_string()
}

#[test]
fn bozuk_satir_gecerli_komsulari_kaybettirmez() {
    let apps = apps::yukle(
        r#"[{"id":"afudm","ad":"AfuDM","yol":"C:/x/AfuDM.exe"},{"id":5},{"id":"afudesk","ad":"AfuDesk"}]"#,
    );
    assert_eq!(
        apps.iter().map(|a| a.id.as_str()).collect::<Vec<_>>(),
        ["afudm", "afudesk"]
    );
    assert_eq!(apps[1].yol, None);
}
#[test]
fn bozuk_json_ve_dizi_olmayan_bos_kayit_uretir() {
    for raw in ["{bozuk", "{}", "null", "[", ""] {
        assert!(apps::yukle(raw).is_empty());
    }
}
#[test]
fn bos_yanlis_tur_ve_yinelenen_kimlik_atlanir() {
    let apps = apps::yukle(
        r#"[{"id":"","ad":"Afu"},{"id":"AfuDM","ad":"Afu"},{"id":"afudm","ad":"AfuDM","yol":5},{"id":"afudm","ad":"AfuDM"},{"id":"afudm","ad":"Diğer"}]"#,
    );
    assert_eq!(apps.len(), 1);
    assert_eq!(apps[0].ad, "AfuDM");
}
#[test]
fn sayisal_surum_ve_mevcut_exe_secilir() {
    let f = Fixture::new();
    for v in ["v99", "v130", "v140", "v2", "v200beta"] {
        f.file(&format!("{v}/AfuDesk/afudesk.exe"), b"fixture");
    }
    std::fs::create_dir_all(f.root.join("v999/AfuDesk")).unwrap();
    assert_eq!(
        apps::bul_en_yeni(&f.root, "v*/AfuDesk/afudesk.exe"),
        Some(f.root.join("v140/AfuDesk/afudesk.exe"))
    );
}
#[test]
fn cok_parcali_surumlar_sayisal_ve_deterministik() {
    let f = Fixture::new();
    for v in ["v1.9", "v1.10", "v1.10.0", "v1.2.99"] {
        f.file(&format!("{v}/AfuDesk/afudesk.exe"), b"x");
    }
    assert_eq!(
        apps::bul_en_yeni(&f.root, "v*/AfuDesk/afudesk.exe"),
        Some(f.root.join("v1.10.0/AfuDesk/afudesk.exe"))
    );
}
#[test]
fn desen_yol_kacisi_ve_eksik_kok_reddedilir() {
    let f = Fixture::new();
    for p in [
        "../v*/a.exe",
        "v*/../a.exe",
        "v*/a.bat",
        "v*/v*/a.exe",
        "C:/v*/a.exe",
    ] {
        assert_eq!(apps::bul_en_yeni(&f.root, p), None);
    }
    assert_eq!(
        apps::bul_en_yeni(&f.root.join("yok"), "v*/AfuDesk/afudesk.exe"),
        None
    );
}
#[test]
fn yalniz_kayitli_mevcut_exe_parametresiz_kanala_ulastirilir() {
    let f = Fixture::new();
    let exe = f.file("boşluklu klasör/AfuDM.EXE", b"fixture");
    let r = registry(&exe);
    let mut mock = MockLauncher::default();
    assert!(r.ac("afudm", &mut mock).is_ok());
    assert_eq!(mock.launched, [exe]);
    assert!(r.ac("uydurma", &mut mock).is_err());
    assert_eq!(mock.launched.len(), 1);
}
#[test]
fn exe_olmayan_eksik_dizin_ve_argumanli_yol_hic_acilmaz() {
    let f = Fixture::new();
    let bat = f.file("cmd.bat", b"x");
    let mut mock = MockLauncher::default();
    for p in [
        bat,
        f.root.join("yok.exe"),
        f.root.clone(),
        PathBuf::from("relative.exe"),
        PathBuf::from("C:/x/app.exe --test"),
    ] {
        assert!(registry(&p).ac("afudm", &mut mock).is_err());
    }
    assert!(mock.launched.is_empty());
    assert!(Kayit::yukle(r#"[{"id":"afudm","ad":"AfuDM"}]"#)
        .ac("afudm", &mut mock)
        .is_err());
}
#[test]
fn acma_hatasi_insan_mesajina_donusur() {
    let f = Fixture::new();
    let exe = f.file("AfuDM.exe", b"x");
    let mut mock = MockLauncher {
        fail: true,
        ..Default::default()
    };
    let err = registry(&exe).ac("afudm", &mut mock).unwrap_err();
    assert!(!err.contains(exe.to_str().unwrap()));
    assert!(!err.contains("PID"));
    assert!(!err.contains('\n'));
}
#[test]
fn taze_durum_ve_bes_dakika_siniri_okunur() {
    for time in [
        "2026-10-01T12:03:00Z",
        "2026-10-01T11:58:00Z",
        "2026-10-01T15:03:00+03:00",
    ] {
        let d = apps_state::ayristir(&state("3 indirme sürüyor", time), "afudm", now()).unwrap();
        assert_eq!(d.ozet, "3 indirme sürüyor");
        assert_eq!(d.durum, "calisiyor");
    }
}
#[test]
fn bayat_gelecek_ve_kimlik_uyusmazligi_yok_sayilir() {
    for time in [
        "2026-10-01T11:57:59Z",
        "2026-10-01T12:03:01Z",
        "2026-10-01T12:03:00.1Z",
    ] {
        assert!(apps_state::ayristir(&state("İndiriliyor", time), "afudm", now()).is_none());
    }
    assert!(apps_state::ayristir(
        &state("İndiriliyor", "2026-10-01T12:03:00Z"),
        "afudesk",
        now()
    )
    .is_none());
}
#[test]
fn bozuk_bilinmeyen_ve_eksik_durum_reddedilir() {
    for raw in [
        "{",
        "null",
        "{}",
        r#"{"surum":1,"id":"afudm","durum":"yeni","ozet":"","guncelleme":"2026-10-01T12:03:00Z"}"#,
    ] {
        assert!(apps_state::ayristir(raw, "afudm", now()).is_none());
    }
    let mut raw: serde_json::Value =
        serde_json::from_str(&state("İndiriliyor", "2026-10-01T12:03:00Z")).unwrap();
    raw["surum"] = serde_json::json!(2);
    assert!(apps_state::ayristir(&raw.to_string(), "afudm", now()).is_none());
}
#[test]
fn turkce_ozet_karakterle_sinirlanir_baytla_degil() {
    assert!(apps_state::ayristir(
        &state(&"ş".repeat(60), "2026-10-01T12:03:00Z"),
        "afudm",
        now()
    )
    .is_some());
    assert!(apps_state::ayristir(
        &state(&"ş".repeat(61), "2026-10-01T12:03:00Z"),
        "afudm",
        now()
    )
    .is_none());
}
#[test]
fn teknik_ve_kontrol_metni_ana_uiya_gecmez() {
    for s in [
        "C:\\Users\\Afu\\app.exe",
        "/tmp/test",
        "PID 34",
        "port: 8000",
        "192.168.1.2",
        "https://example.com",
        "İndirme\nhata",
        "İndirme\u{202e}",
        "Hata\0",
    ] {
        assert!(
            apps_state::ayristir(&state(s, "2026-10-01T12:03:00Z"), "afudm", now()).is_none(),
            "{s}"
        );
    }
}
#[test]
fn iso_tarih_araligi_ve_bicimi_kati_dogrulanir() {
    for t in [
        "2026-02-29T12:03:00Z",
        "2026-13-01T12:03:00Z",
        "2026-10-01T24:00:00Z",
        "2026-10-01T12:03:60Z",
        "2026-10-01T12:03:00+24:00",
        "2026-10-01 12:03:00",
        "2026-10-01T12:03:00Zextra",
        "0000-01-01T00:00:00Z",
    ] {
        assert!(
            apps_state::ayristir(&state("İndiriliyor", t), "afudm", now()).is_none(),
            "{t}"
        );
    }
}
#[test]
fn tum_durumlar_ve_negatif_ofset_desteklenir() {
    for status in ["bos", "calisiyor", "uyari", "hata"] {
        let mut raw: serde_json::Value =
            serde_json::from_str(&state("Hazır", "2026-10-01T09:03:00-03:00")).unwrap();
        raw["durum"] = serde_json::json!(status);
        assert_eq!(
            apps_state::ayristir(&raw.to_string(), "afudm", now())
                .unwrap()
                .durum,
            status
        );
    }
    assert!(apps_state::ayristir(
        &state("Hazır", "2026-10-01T12:02:59.999999999Z"),
        "afudm",
        now()
    )
    .is_some());
}
#[test]
fn okuyucu_salt_okur_ve_dosya_kimligini_denetler() {
    let f = Fixture::new();
    let raw = state("3 indirme sürüyor", "2026-10-01T12:03:00Z");
    let file = f.file("afudm.json", raw.as_bytes());
    assert!(apps_state::oku(&file, now()).is_some());
    assert!(apps_state::oku_icin("afudesk", &file, now()).is_none());
    assert_eq!(std::fs::read(&file).unwrap(), raw.as_bytes());
    assert!(apps_state::oku(&f.root.join("yok.json"), now()).is_none());
    let bad = f.file("bad.json", b"{bozuk");
    assert!(apps_state::oku(&bad, now()).is_none());
}
#[test]
fn asiri_buyuk_dosya_okunmaz() {
    let f = Fixture::new();
    let file = f.file("afudm.json", &vec![b' '; 4097]);
    assert!(apps_state::oku(&file, now()).is_none());
}

#[test]
fn takvim_tasma_hatasi_tazelik_kontrolunun_arkasina_saklanmaz() {
    let cases = [
        ("2026-02-29T00:03:00Z", 1_772_323_380),
        ("2026-10-01T24:03:00Z", 1_790_899_380),
        ("2026-10-01T12:60:00Z", 1_790_859_600),
        ("2026-10-01T12:03:60Z", 1_790_856_240),
        ("2026-10-01T12:03:00+24:00", 1_790_769_780),
    ];
    for (t, seconds) in cases {
        assert!(
            apps_state::ayristir(
                &state("Hazır", t),
                "afudm",
                SystemTime::UNIX_EPOCH + Duration::from_secs(seconds)
            )
            .is_none(),
            "{t}"
        );
    }
    let leap_now = SystemTime::UNIX_EPOCH + Duration::from_secs(1_709_251_380);
    assert!(
        apps_state::ayristir(&state("Hazır", "2024-02-29T23:59:00Z"), "afudm", leap_now).is_some()
    );
    assert!(
        apps_state::ayristir(&state("Hazır", "2024-02-30T00:03:00Z"), "afudm", leap_now).is_none()
    );
}
#[test]
fn teknik_yol_gizli_surucu_ve_ipv6_ozette_gosterilmez() {
    for s in ["C:secret.txt", "bağlantı fe80::1", "PİD 34"] {
        assert!(
            apps_state::ayristir(&state(s, "2026-10-01T12:03:00Z"), "afudm", now()).is_none(),
            "{s}"
        );
    }
}

#[test]
fn gizli_bilgi_isaretleri_ve_eposta_ozetten_reddedilir() {
    for summary in [
        "api_key=ornek-gizli",
        "API KEY : ornek-gizli",
        "api-key=ornek-gizli",
        "apikey=ornek-gizli",
        "token=ornek-gizli",
        "TOKEN : ornek-gizli",
        "secret=ornek-gizli",
        "password = ornek-gizli",
        "Bearer ornek-gizli",
        "iletişim destek@example.test",
        "gizli sk-abcdefghijkl",
        "ghp_abcdefghijkl",
        "AIza-abcdefghijkl",
    ] {
        assert!(
            apps_state::ayristir(&state(summary, "2026-10-01T12:03:00Z"), "afudm", now()).is_none(),
            "gizli bilgi biçimi kabul edildi"
        );
    }
}
#[test]
fn gizli_bilgi_suzgeci_siradan_turkce_insan_metnini_korur() {
    for summary in [
        "3 indirme sürüyor",
        "Kota yenilenince devam edecek.",
        "Token yenileniyor",
        "Anahtar hazır",
        "Parola yenilendi, tekrar dene.",
        "E-posta bildirimi gönderildi",
        "Şifreleme tamamlandı",
        "api_key denetimi tamamlandı",
        "xtoken=insan etiketi",
    ] {
        let parsed = apps_state::ayristir(&state(summary, "2026-10-01T12:03:00Z"), "afudm", now())
            .expect("sıradan insan metni korunmalı");
        assert_eq!(parsed.ozet, summary);
    }
}

#[test]
fn kayit_sadece_eksikse_ve_kok_biliniyorsa_olusturulur() {
    let f = Fixture::new();
    let config = f.root.join("uygulamalar.json");
    assert!(!apps::varsayilan_kayit_olustur(&config, None, None).unwrap());
    assert!(!config.exists());
    f.file("AfuDM/AfuDM.exe", b"x");
    f.file("AfuDesk/dist/v140/AfuDesk/afudesk.exe", b"x");
    f.file("PadKopru/dist/PadKopru/PadKopru.exe", b"x");
    assert!(apps::varsayilan_kayit_olustur(&config, Some(&f.root), None).unwrap());
    let before = std::fs::read(&config).unwrap();
    let registry = Kayit::dosyadan(&config);
    let rows = registry.liste(now());
    assert_eq!(rows.len(), 5);
    assert_eq!(rows.iter().filter(|r| r.kurulu).count(), 3);
    assert!(rows.iter().find(|r| r.id == "afuremote").unwrap().telefonda);
    let dto = serde_json::to_string(&rows).unwrap();
    assert!(!dto.contains("yol"));
    assert!(!dto.contains(f.root.to_str().unwrap()));
    assert!(!apps::varsayilan_kayit_olustur(&config, Some(&f.root), None).unwrap());
    assert_eq!(std::fs::read(&config).unwrap(), before);
}
#[test]
fn mevcut_bozuk_kayit_ezilmez_ve_okuyucu_sinirlidir() {
    let f = Fixture::new();
    let config = f.file("uygulamalar.json", b"{bad");
    assert!(!apps::varsayilan_kayit_olustur(&config, Some(&f.root), None).unwrap());
    assert_eq!(std::fs::read(&config).unwrap(), b"{bad");
    assert!(Kayit::dosyadan(&config).uygulamalar().is_empty());
    let large = f.file("large.json", &vec![b' '; 65537]);
    assert!(Kayit::dosyadan(&large).uygulamalar().is_empty());
}
#[test]
fn dto_salt_okur_taze_durumla_birlesir() {
    let f = Fixture::new();
    let exe = f.file("AfuDM.exe", b"x");
    let status = f.file(
        "afudm.json",
        state("3 indirme sürüyor", "2026-10-01T12:03:00Z").as_bytes(),
    );
    let registry = Kayit::yukle(
        &serde_json::json!([{"id":"afudm","ad":"AfuDM","yol":exe,"durum_dosyasi":status}])
            .to_string(),
    );
    let rows = registry.liste(now());
    assert_eq!(rows[0].durum.as_deref(), Some("calisiyor"));
    assert_eq!(rows[0].ozet.as_deref(), Some("3 indirme sürüyor"));
    assert!(registry.liste(now() + Duration::from_secs(301))[0]
        .durum
        .is_none());
}

#[test]
fn login_url_tam_ayristirilir_ve_yalniz_guvenilen_otoriteyi_kabul_eder() {
    assert!(apps::login_url_gecerli(
        "https://auth.openai.com:443/oauth/authorize?state=abc"
    ));
    assert!(apps::login_url_gecerli(
        "https://auth.openai.com/vendor/login?state=abc"
    ));
    assert!(apps::login_url_gecerli(
        "https://auth.openai.com/authorize?client_id=codex&state=a%20b"
    ));
    assert!(apps::login_url_gecerli(
        "https://auth.openai.com/v1/authorize?state=abc"
    ));
    for url in [
        "http://auth.openai.com/v1/authorize",
        "https://auth.openai.com.evil.test/v1/a",
        "https://user@auth.openai.com/v1/a",
        "https://auth.openai.com:444/v1/a",
        "https://auth.openai.com/v1/../evil",
        "https://auth.openai.com/v1/%2e%2e/evil",
        "https://auth.openai.com/v1/a#fragment",
        "https://auth.openai.com/v1/a\n",
        "https://auth.openai.com\\evil.test/v1/a",
        "https://auth.openai.com/%76%31/authorize",
        " https://auth.openai.com/v1/a",
        "https://auth.openai.com/v1/a?token=%0a",
    ] {
        assert!(!apps::login_url_gecerli(url), "URL reddedilmeli");
    }
}
#[test]
fn proje_yalniz_kok_icindeki_dogrudan_klasor_olabilir() {
    let f = Fixture::new();
    std::fs::create_dir_all(f.root.join("AfuDM")).unwrap();
    let path = apps::proje_klasoru_dogrula(&f.root, "AfuDM").unwrap();
    assert_eq!(path, f.root.join("AfuDM").canonicalize().unwrap());
    for name in [
        "",
        "..",
        "../AfuDM",
        "AfuDM/sub",
        "AfuDM\\sub",
        "C:folder",
        "AfuDM.exe",
        "AfuDM.",
        "AfuDM ",
        "yok",
    ] {
        assert!(apps::proje_klasoru_dogrula(&f.root, name).is_err());
    }
    let file = f.file("dosya", b"x");
    assert!(
        apps::proje_klasoru_dogrula(&f.root, file.file_name().unwrap().to_str().unwrap()).is_err()
    );
}
#[cfg(windows)]
#[test]
fn proje_junction_kok_disina_kacis_reddedilir() {
    let f = Fixture::new();
    let outside = Fixture::new();
    let link = f.root.join("escape");
    let result = std::process::Command::new("cmd")
        .args(["/C", "mklink", "/J"])
        .arg(link.to_str().unwrap().replace('/', "\\"))
        .arg(outside.root.to_str().unwrap().replace('/', "\\"))
        .creation_flags(0x08000000)
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    assert!(apps::proje_klasoru_dogrula(&f.root, "escape").is_err());
    std::fs::remove_dir(&link).unwrap();
}

#[test]
fn ses_ayarlari_yalniz_sabit_hedefleri_kabul_eder() {
    assert_eq!(apps::ses_ayar_hedefi("speech"), Some("ms-settings:privacy-speech"));
    assert_eq!(apps::ses_ayar_hedefi("microphone"), Some("ms-settings:privacy-microphone"));
    assert_eq!(apps::ses_ayar_hedefi("network"), Some("ms-settings:network-status"));
    for kind in ["", "Speech", "speech ", "ms-settings:privacy-speech", "https://example.com", "speech;cmd", "../network"] {
        assert_eq!(apps::ses_ayar_hedefi(kind), None);
        assert!(apps::ses_ayarlari_ac(kind).is_err());
    }
}
#[test]
fn eski_bicim_kayit_indir_url_varsayilandan_doldurulur() {
    let f = Fixture::new();
    let body = serde_json::json!([
        {"id":"afudm","ad":"AfuDM"},
        {"id":"afutube","ad":"AfuTube"},
        {"id":"padkopru","ad":"PadKöprü"},
        {"id":"bilinmeyen","ad":"Bilinmeyen"}
    ])
    .to_string();
    let config = f.file("uygulamalar.json", body.as_bytes());
    let before = std::fs::read(&config).unwrap();
    let rows = Kayit::dosyadan(&config).liste(now());
    let url = |id: &str| rows.iter().find(|r| r.id == id).unwrap().indir_url.clone();
    assert_eq!(url("afudm").as_deref(), Some("https://github.com/pirncedark/AfuDM/releases/latest"));
    assert_eq!(url("afutube").as_deref(), Some("https://github.com/pirncedark/AfuDM/releases?q=afutube"));
    assert_eq!(url("padkopru").as_deref(), Some("https://github.com/pirncedark/afugamepad/releases/latest"));
    assert_eq!(url("bilinmeyen"), None);
    assert_eq!(std::fs::read(&config).unwrap(), before, "kullanıcı dosyası değişmemeli");
}
#[test]
fn bilinmeyen_kimligin_varsayilan_indir_url_yok() {
    assert_eq!(apps::varsayilan_indir_url("bilinmeyen"), None);
    assert_eq!(apps::varsayilan_indir_url(""), None);
    for id in ["afudm", "afudesk", "padkopru", "afutube", "afuremote"] {
        assert!(apps::varsayilan_indir_url(id)
            .unwrap()
            .starts_with("https://github.com/pirncedark/"));
    }
}
#[test]
fn github_disi_indir_url_filtrelenir_varsayilana_dusmez() {
    let registry = Kayit::yukle(
        &serde_json::json!([
            {"id":"afudm","ad":"AfuDM","indir_url":"https://evil.example/AfuDM.exe"},
            {"id":"bilinmeyen","ad":"X","indir_url":"https://github.com/baskasi/x/releases"}
        ])
        .to_string(),
    );
    let rows = registry.liste(now());
    assert!(rows.iter().all(|r| r.indir_url.is_none()));
    assert_eq!(
        registry.indir_url_ac("afudm").unwrap_err(),
        "Geçersiz indirme bağlantısı."
    );
    assert_eq!(registry.indir_url_ac("yok").unwrap_err(), "Uygulama bulunamadı.");
}
#[test]
fn varsayilan_kayit_padkopru_indir_url_icerir() {
    let f = Fixture::new();
    let config = f.root.join("uygulamalar.json");
    assert!(apps::varsayilan_kayit_olustur(&config, Some(&f.root), None).unwrap());
    let rows = Kayit::dosyadan(&config).liste(now());
    assert!(rows.iter().all(|r| r.indir_url.is_some()));
}
