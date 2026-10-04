use afu_merkez_hazirlik::{
    apps::{self, ExeLauncher, Kayit},
    apps_state,
};
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
