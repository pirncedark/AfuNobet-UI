// Ajan soruları: köprü `sorular/<id>.json` yazar, ada okur ve kullanıcının
// cevabını `cevaplar/<id>.json` olarak yazar. Sözleşme: docs/SORU_SOZLESMESI.md.
// Ağ yok, model çağrısı yok; yalnız yerel dosya ve olay tabanlı izleme.
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

pub const OLAY: &str = "sorular";
const MAX_BYTES: u64 = 65_536;
const MAX_METIN: usize = 2_000;
const MAX_AYRINTI: usize = 4_000;
const MAX_BASLIK: usize = 120;
const MAX_ETIKET: usize = 40;
const MAX_SECENEK: usize = 6;
const MASKE: &str = "•••";

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Secenek {
    pub id: String,
    pub etiket: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Soru {
    pub id: String,
    pub ajan: String,
    pub tur: String,
    pub baslik: String,
    pub metin: String,
    pub ayrinti: Option<String>,
    pub secenekler: Vec<Secenek>,
    pub serbest_metin: bool,
    pub gizli: bool,
    pub olusturma: u64,
    pub son_gecerlilik: u64,
}

pub fn simdi_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// Soru kökü: `AFUNOBET_SORU_DIZINI` ya da AfuNöbet `state.json` klasörü.
pub fn kok() -> PathBuf {
    std::env::var_os("AFUNOBET_SORU_DIZINI")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            crate::state::resolve_path().parent().map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from("."))
        })
}

fn gecerli_kimlik(s: &str, en_fazla: usize) -> bool {
    !s.is_empty() && s.len() <= en_fazla && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn kisalt(s: &str, en_fazla: usize) -> String {
    let temiz: String = s.chars().map(|c| if c.is_control() && c != '\n' && c != '\t' { ' ' } else { c }).collect();
    if temiz.chars().count() <= en_fazla {
        return temiz;
    }
    let mut kesik: String = temiz.chars().take(en_fazla.saturating_sub(1)).collect();
    kesik.push('…');
    kesik
}

fn token_karakteri(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.' || c == '/' || c == '+' || c == '='
}

/// Boşluksuz, en az 32 karakter, büyük + küçük harf + rakam içeren ve `/` içermeyen dize:
/// öneki bilinmeyen anahtar/belirteç sayılır (1.0.3). Commit karması (küçük harf) ve yollar geçer.
fn uzun_gizli_mi(parca: &[char]) -> bool {
    parca.len() >= 32
        && !parca.contains(&'/')
        && parca.iter().any(char::is_ascii_uppercase)
        && parca.iter().any(char::is_ascii_lowercase)
        && parca.iter().any(char::is_ascii_digit)
}

/// Bilinen gizli bilgi kalıplarını `•••` yapar. Regex yok: küçük bir tarayıcı.
pub fn maskele(girdi: &str) -> String {
    // 1.0.3: Google (AIza, AQ., ya29., 4/0A), Hugging Face, GitLab ve Stripe önekleri eklendi.
    const ONEKLER: &[&str] = &["sk-", "sk_", "ghp_", "gho_", "ghs_", "ghu_", "github_pat_", "xoxb-", "xoxp-", "xoxa-", "AKIA", "AIza", "AQ.", "ya29.", "4/0A", "hf_", "glpat-"];
    const ANAHTARLAR: &[&str] = &["password", "passwd", "token", "secret", "api_key", "apikey", "bearer"];
    let karakterler: Vec<char> = girdi.chars().collect();
    let kucuk: Vec<char> = girdi.to_lowercase().chars().collect();
    // to_lowercase bazı harflerde uzunluk değiştirebilir; o zaman yalnız öneklere bak.
    let ayni_boy = kucuk.len() == karakterler.len();
    let mut cikti = String::with_capacity(girdi.len());
    let mut i = 0;
    let sinir = |i: usize| i == 0 || !karakterler[i - 1].is_ascii_alphanumeric();
    let esit = |i: usize, kalip: &str, kaynak: &[char]| {
        let k: Vec<char> = kalip.chars().collect();
        i + k.len() <= kaynak.len() && kaynak[i..i + k.len()] == k[..]
    };
    while i < karakterler.len() {
        if i == 0 || !token_karakteri(karakterler[i - 1]) {
            let mut j = i;
            while j < karakterler.len() && token_karakteri(karakterler[j]) {
                j += 1;
            }
            if uzun_gizli_mi(&karakterler[i..j]) {
                cikti.push_str(MASKE);
                i = j;
                continue;
            }
        }
        if sinir(i) {
            if let Some(onek) = ONEKLER.iter().find(|o| esit(i, o, &karakterler)) {
                let mut j = i + onek.chars().count();
                while j < karakterler.len() && token_karakteri(karakterler[j]) {
                    j += 1;
                }
                if j - i >= 12 {
                    cikti.push_str(MASKE);
                    i = j;
                    continue;
                }
            }
            if ayni_boy {
                if let Some(anahtar) = ANAHTARLAR.iter().find(|a| esit(i, a, &kucuk)) {
                    let mut j = i + anahtar.len();
                    // "api_key" gibi anahtarın sonrası da kelime içi olabilir (ör. TOKEN_X).
                    while j < karakterler.len() && (karakterler[j].is_ascii_alphanumeric() || karakterler[j] == '_') {
                        j += 1;
                    }
                    let mut k = j;
                    while k < karakterler.len() && karakterler[k] == ' ' {
                        k += 1;
                    }
                    let ayirici = k < karakterler.len() && (karakterler[k] == '=' || karakterler[k] == ':');
                    let bearer = *anahtar == "bearer" && k > j;
                    if ayirici || bearer {
                        if ayirici {
                            k += 1;
                        }
                        while k < karakterler.len() && (karakterler[k] == ' ' || karakterler[k] == '"' || karakterler[k] == '\'') {
                            k += 1;
                        }
                        let mut son = k;
                        while son < karakterler.len() && !karakterler[son].is_whitespace() && !matches!(karakterler[son], '"' | '\'' | '&' | ',' | ';') {
                            son += 1;
                        }
                        if son > k {
                            cikti.extend(&karakterler[i..k]);
                            cikti.push_str(MASKE);
                            i = son;
                            continue;
                        }
                    }
                }
            }
        }
        cikti.push(karakterler[i]);
        i += 1;
    }
    cikti
}

fn metin_alani(v: &Value, ad: &str) -> Option<String> {
    v.get(ad).and_then(Value::as_str).map(str::to_owned)
}

/// Bir soru dosyasının içeriğini doğrular; geçersiz ya da süresi geçmişse `None`.
pub fn soru_coz(bayt: &[u8], dosya_id: &str, simdi: u64) -> Option<Soru> {
    if bayt.len() as u64 > MAX_BYTES {
        return None;
    }
    let bayt = bayt.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(bayt);
    let v: Value = serde_json::from_slice(bayt).ok()?;
    if v.get("surum").and_then(Value::as_u64) != Some(1) {
        return None;
    }
    let id = metin_alani(&v, "id")?;
    if !gecerli_kimlik(&id, 64) || id != dosya_id {
        return None;
    }
    let ajan = metin_alani(&v, "ajan")?;
    if !gecerli_kimlik(&ajan, 32) || ajan.chars().any(|c| c.is_ascii_uppercase()) {
        return None;
    }
    let tur = metin_alani(&v, "tur")?;
    if !matches!(tur.as_str(), "komut" | "dosya" | "izin" | "soru") {
        return None;
    }
    let son_gecerlilik = v.get("sonGecerlilik").and_then(Value::as_u64)?;
    let olusturma = v.get("olusturma").and_then(Value::as_u64)?;
    if son_gecerlilik <= simdi {
        return None;
    }
    let metin = metin_alani(&v, "metin")?;
    if metin.trim().is_empty() {
        return None;
    }
    let mut secenekler = Vec::new();
    if let Some(liste) = v.get("secenekler").and_then(Value::as_array) {
        for s in liste.iter().take(MAX_SECENEK) {
            let (Some(sid), Some(etiket)) = (metin_alani(s, "id"), metin_alani(s, "etiket")) else { return None };
            if !gecerli_kimlik(&sid, 32) || etiket.trim().is_empty() || secenekler.iter().any(|x: &Secenek| x.id == sid) {
                return None;
            }
            secenekler.push(Secenek { id: sid, etiket: kisalt(&etiket, MAX_ETIKET) });
        }
    }
    let serbest_metin = v.get("serbestMetin").and_then(Value::as_bool).unwrap_or(false);
    if secenekler.is_empty() && !serbest_metin {
        return None;
    }
    let baslik = metin_alani(&v, "baslik").filter(|b| !b.trim().is_empty()).unwrap_or_else(|| "Ajan soruyor".into());
    Some(Soru {
        id,
        ajan,
        tur,
        baslik: kisalt(&maskele(&baslik), MAX_BASLIK),
        metin: kisalt(&maskele(&metin), MAX_METIN),
        ayrinti: metin_alani(&v, "ayrinti").filter(|a| !a.trim().is_empty()).map(|a| kisalt(&maskele(&a), MAX_AYRINTI)),
        secenekler,
        serbest_metin,
        gizli: v.get("gizli").and_then(Value::as_bool).unwrap_or(false),
        olusturma,
        son_gecerlilik,
    })
}

fn soru_yolu(kok: &Path, id: &str) -> PathBuf {
    kok.join("sorular").join(format!("{id}.json"))
}
fn cevap_yolu(kok: &Path, id: &str) -> PathBuf {
    kok.join("cevaplar").join(format!("{id}.json"))
}

fn soru_oku(kok: &Path, id: &str, simdi: u64) -> Option<Soru> {
    let yol = soru_yolu(kok, id);
    if std::fs::metadata(&yol).ok()?.len() > MAX_BYTES {
        return None;
    }
    soru_coz(&std::fs::read(&yol).ok()?, id, simdi)
}

/// Cevaplanmamış, süresi geçmemiş sorular; en eski önce.
pub fn bekleyenler(kok: &Path, simdi: u64) -> Vec<Soru> {
    let Ok(okuyucu) = std::fs::read_dir(kok.join("sorular")) else { return Vec::new() };
    let mut liste: Vec<Soru> = okuyucu
        .filter_map(Result::ok)
        .filter_map(|e| {
            let ad = e.file_name().into_string().ok()?;
            let id = ad.strip_suffix(".json")?.to_owned();
            if !gecerli_kimlik(&id, 64) || cevap_yolu(kok, &id).exists() {
                return None;
            }
            soru_oku(kok, &id, simdi)
        })
        .collect();
    liste.sort_by(|a, b| a.olusturma.cmp(&b.olusturma).then_with(|| a.id.cmp(&b.id)));
    liste.truncate(20);
    liste
}

fn atomik_yaz(hedef: &Path, icerik: &[u8]) -> std::io::Result<()> {
    let gecici = hedef.with_extension("json.tmp");
    std::fs::write(&gecici, icerik)?;
    std::fs::rename(&gecici, hedef).inspect_err(|_| {
        let _ = std::fs::remove_file(&gecici);
    })
}

/// Kullanıcının cevabını yazar. Hata metni tek cümle, kullanıcı dilinde.
pub fn cevap_yaz(kok: &Path, id: &str, secim: Option<&str>, metin: Option<&str>, simdi: u64) -> Result<(), String> {
    const GECERSIZ: &str = "Bu soru artık geçerli değil.";
    if !gecerli_kimlik(id, 64) {
        return Err(GECERSIZ.into());
    }
    let soru = soru_oku(kok, id, simdi).ok_or_else(|| GECERSIZ.to_owned())?;
    let cevap = cevap_yolu(kok, id);
    if cevap.exists() {
        return Err("Bu soru zaten cevaplandı.".into());
    }
    let secim = secim.filter(|s| !s.is_empty());
    if let Some(s) = secim {
        if !soru.secenekler.iter().any(|x| x.id == s) {
            return Err("Bu seçenek kullanılamıyor; listeden birini seç.".into());
        }
    }
    let metin = metin.map(str::trim).filter(|m| !m.is_empty());
    if let Some(m) = metin {
        if !soru.serbest_metin {
            return Err("Bu soru için bir seçeneğe dokun.".into());
        }
        if m.chars().count() > MAX_METIN {
            return Err("Cevap çok uzun; kısaltıp yeniden gönder.".into());
        }
    }
    if secim.is_none() && metin.is_none() {
        return Err("Önce bir cevap seç ya da yaz.".into());
    }
    let govde = json!({"surum":1,"id":id,"secim":secim,"metin":metin,"zaman":simdi,"kaynak":"ada"});
    std::fs::create_dir_all(kok.join("cevaplar")).map_err(|_| "Cevap kaydedilemedi; yeniden dene.".to_owned())?;
    atomik_yaz(&cevap, govde.to_string().as_bytes()).map_err(|_| "Cevap kaydedilemedi; yeniden dene.".to_owned())
}

fn ilgili(olay: &Event, kok: &Path) -> bool {
    if matches!(olay.kind, EventKind::Access(_)) {
        return false;
    }
    let sorular = kok.join("sorular");
    let cevaplar = kok.join("cevaplar");
    olay.paths.is_empty()
        || olay.paths.iter().any(|p| p.starts_with(&sorular) || p.starts_with(&cevaplar))
}

/// Soru klasörünü olay tabanlı izler (zamanlayıcı yok). Her değişiklikte
/// güncel bekleyen listeyi `gonder`e verir. Kök izlenemezse sessizce durur.
pub fn izle(kok: PathBuf, mut gonder: impl FnMut(Vec<Soru>) + Send + 'static) -> notify::Result<std::thread::JoinHandle<()>> {
    let (tx, rx) = mpsc::sync_channel::<()>(1);
    let hedef = kok.clone();
    let mut izleyici: RecommendedWatcher = notify::recommended_watcher(move |sonuc: notify::Result<Event>| {
        if sonuc.as_ref().map_or(true, |o| ilgili(o, &hedef)) {
            let _ = tx.try_send(());
        }
    })?;
    izleyici.watch(&kok, RecursiveMode::NonRecursive)?;
    let mut alt_izlenen = [false, false];
    let kok_alt = kok.clone();
    let alt_bagla = move |izleyici: &mut RecommendedWatcher, alt: &mut [bool; 2]| {
        for (i, ad) in ["sorular", "cevaplar"].iter().enumerate() {
            let yol = kok_alt.join(ad);
            let var = yol.is_dir();
            if var && !alt[i] {
                alt[i] = izleyici.watch(&yol, RecursiveMode::NonRecursive).is_ok();
            } else if !var && alt[i] {
                let _ = izleyici.unwatch(&yol);
                alt[i] = false;
            }
        }
    };
    alt_bagla(&mut izleyici, &mut alt_izlenen);
    let kok_is = kok.clone();
    Ok(std::thread::spawn(move || {
        gonder(bekleyenler(&kok_is, simdi_ms()));
        while rx.recv().is_ok() {
            while rx.try_recv().is_ok() {}
            alt_bagla(&mut izleyici, &mut alt_izlenen);
            gonder(bekleyenler(&kok_is, simdi_ms()));
        }
    }))
}

pub fn start(app: AppHandle) {
    let kok = kok();
    if !kok.is_dir() {
        return;
    }
    let _ = izle(kok, move |liste| {
        let _ = app.emit(OLAY, liste);
    });
}

#[tauri::command]
pub fn questions_list() -> Vec<Soru> {
    bekleyenler(&kok(), simdi_ms())
}

#[tauri::command]
pub fn answer_question(id: String, secim: Option<String>, metin: Option<String>) -> Result<(), String> {
    cevap_yaz(&kok(), &id, secim.as_deref(), metin.as_deref(), simdi_ms())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    fn gecici_kok(ad: &str) -> PathBuf {
        let yol = std::env::temp_dir().join(format!("afunobet-soru-{ad}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&yol);
        std::fs::create_dir_all(yol.join("sorular")).unwrap();
        yol
    }

    fn ornek(id: &str, son: u64) -> Value {
        json!({"surum":1,"id":id,"ajan":"codex","tur":"komut","baslik":"Komut çalıştırılsın mı?",
            "metin":"npm test","ayrinti":"C:\\proje",
            "secenekler":[{"id":"evet","etiket":"İzin ver"},{"id":"hayir","etiket":"Reddet"}],
            "serbestMetin":false,"gizli":false,"varsayilan":"hayir","olusturma":1000,"sonGecerlilik":son})
    }

    fn yaz(kok: &Path, v: &Value) {
        let id = v["id"].as_str().unwrap();
        std::fs::write(soru_yolu(kok, id), v.to_string()).unwrap();
    }

    #[test]
    fn gecerli_soru_okunur_ve_alanlar_tasinir() {
        let s = soru_coz(ornek("a1", 5000).to_string().as_bytes(), "a1", 2000).unwrap();
        assert_eq!(s.ajan, "codex");
        assert_eq!(s.secenekler.len(), 2);
        assert_eq!(s.secenekler[0].etiket, "İzin ver");
        assert_eq!(s.ayrinti.as_deref(), Some("C:\\proje"));
    }

    #[test]
    fn suresi_gecmis_bozuk_ve_uyumsuz_sorular_reddedilir() {
        let v = ornek("a1", 5000);
        assert!(soru_coz(v.to_string().as_bytes(), "a1", 5000).is_none(), "süresi geçmiş");
        assert!(soru_coz(v.to_string().as_bytes(), "baska", 2000).is_none(), "dosya adı uyuşmuyor");
        assert!(soru_coz(b"{", "a1", 2000).is_none());
        let mut s = v.clone();
        s["surum"] = json!(2);
        assert!(soru_coz(s.to_string().as_bytes(), "a1", 2000).is_none());
        let mut s = v.clone();
        s["tur"] = json!("bilinmez");
        assert!(soru_coz(s.to_string().as_bytes(), "a1", 2000).is_none());
        let mut s = v.clone();
        s["secenekler"] = json!([]);
        assert!(soru_coz(s.to_string().as_bytes(), "a1", 2000).is_none(), "cevap yolu yok");
        let mut s = v.clone();
        s["id"] = json!("../x");
        assert!(soru_coz(s.to_string().as_bytes(), "../x", 2000).is_none());
        let mut s = v.clone();
        s["secenekler"] = json!([{"id":"a","etiket":"A"},{"id":"a","etiket":"B"}]);
        assert!(soru_coz(s.to_string().as_bytes(), "a1", 2000).is_none(), "yinelenen seçenek");
    }

    #[test]
    fn kopru_betiginin_yazdigi_bicim_okunur() {
        // scripts/codex_soru_koprusu.py çıktısı (requestUserInput, seçeneksiz, serbest metin).
        let ham = r#"{"surum": 1, "id": "codex-aecccad09bca", "ajan": "codex", "tur": "soru", "baslik": "Dal", "metin": "Hangi dal? token=•••", "ayrinti": null, "secenekler": [], "serbestMetin": true, "gizli": false, "varsayilan": null, "olusturma": 1000, "sonGecerlilik": 111000}"#;
        let s = soru_coz(ham.as_bytes(), "codex-aecccad09bca", 2000).unwrap();
        assert!(s.serbest_metin && s.secenekler.is_empty() && s.ayrinti.is_none());
        assert_eq!(s.metin, "Hangi dal? token=•••");
    }

    #[test]
    fn bom_kabul_edilir_buyuk_dosya_reddedilir() {
        let mut bayt = vec![0xEF, 0xBB, 0xBF];
        bayt.extend(ornek("a1", 5000).to_string().as_bytes());
        assert!(soru_coz(&bayt, "a1", 2000).is_some());
        let mut v = ornek("a1", 5000);
        v["ayrinti"] = json!("x".repeat(70_000));
        assert!(soru_coz(v.to_string().as_bytes(), "a1", 2000).is_none());
    }

    #[test]
    fn uzun_metin_kesilir() {
        let mut v = ornek("a1", 5000);
        v["metin"] = json!("y".repeat(5000));
        let s = soru_coz(v.to_string().as_bytes(), "a1", 2000).unwrap();
        assert_eq!(s.metin.chars().count(), MAX_METIN);
        assert!(s.metin.ends_with('…'));
    }

    #[test]
    fn gizli_bilgi_maskelenir() {
        let m = maskele("curl -H 'Authorization: Bearer abc.def123' https://x?token=s3cr3t&a=1 sk-proj-ABCDEFGHIJKLMNOP ghp_0123456789abcdefXYZ");
        assert!(!m.contains("abc.def123"), "{m}");
        assert!(!m.contains("s3cr3t"), "{m}");
        assert!(!m.contains("ABCDEFGHIJKLMNOP"), "{m}");
        assert!(!m.contains("0123456789abcdef"), "{m}");
        assert!(m.contains("&a=1"), "{m}");
        assert_eq!(maskele("PASSWORD=hunter2 npm test"), "PASSWORD=••• npm test");
        assert_eq!(maskele("api_key: \"abc\""), "api_key: \"•••\"");
        assert_eq!(maskele("npm test --watch"), "npm test --watch");
        assert_eq!(maskele("risk-free task"), "risk-free task", "kısa sk- maskelenmez");
        // 1.0.3: Google anahtarları ve öneki bilinmeyen uzun gizli dizeler (uydurma örnekler).
        for gizli in ["AIzaSyFAKEfake0123456789abcdefGHIJKLM", "AQ.FakeKey0123456789-abcdef_GHIJ", "ya29.a0FAKEtoken123456", "4/0AFAKEcode123456789", "hf_FAKEtoken0123456789"] {
            let m = maskele(&format!("bu {gizli} anahtar"));
            assert_eq!(m, "bu ••• anahtar", "{gizli}");
        }
        assert_eq!(maskele("Zx9QwErTy7UiOpAs4DfGhJkL2ZxCvBnM8"), "•••", "öneksiz uzun gizli dize");
        let karma = "0fa7e6012ab34cd56ef78901234567890abcdef1";
        assert_eq!(maskele(karma), karma, "commit karması (büyük harfsiz) geçer");
        assert_eq!(maskele("windows/src/afu/PetKafaOlcegi2Test.ts"), "windows/src/afu/PetKafaOlcegi2Test.ts", "yol geçer");
        assert_eq!(maskele("Internationalization hazırlığı"), "Internationalization hazırlığı");
        let mut v = ornek("a1", 5000);
        v["metin"] = json!("export OPENAI_API_KEY=sk-abcdefghijklmnop1234");
        let s = soru_coz(v.to_string().as_bytes(), "a1", 2000).unwrap();
        assert!(!s.metin.contains("abcdefghijklmnop"), "{}", s.metin);
    }

    #[test]
    fn bekleyenler_cevaplananlari_ve_gecersizleri_atlar_eskiyi_once_verir() {
        let kok = gecici_kok("liste");
        let mut a = ornek("a", 9_999_999_999_999);
        a["olusturma"] = json!(3000);
        let mut b = ornek("b", 9_999_999_999_999);
        b["olusturma"] = json!(1000);
        yaz(&kok, &a);
        yaz(&kok, &b);
        yaz(&kok, &ornek("eski", 10));
        std::fs::write(kok.join("sorular").join("bozuk.json"), "{").unwrap();
        std::fs::write(kok.join("sorular").join("x.json.tmp"), "{}").unwrap();
        let ids: Vec<_> = bekleyenler(&kok, 2000).into_iter().map(|s| s.id).collect();
        assert_eq!(ids, ["b", "a"]);
        cevap_yaz(&kok, "b", Some("evet"), None, 2000).unwrap();
        let ids: Vec<_> = bekleyenler(&kok, 2000).into_iter().map(|s| s.id).collect();
        assert_eq!(ids, ["a"]);
        std::fs::remove_dir_all(kok).unwrap();
    }

    #[test]
    fn cevap_dogrulanir_ve_atomik_yazilir() {
        let kok = gecici_kok("cevap");
        yaz(&kok, &ornek("q1", 9000));
        assert!(cevap_yaz(&kok, "q1", Some("belki"), None, 2000).is_err());
        assert!(cevap_yaz(&kok, "q1", None, Some("serbest"), 2000).is_err(), "serbest metin kapalı");
        assert!(cevap_yaz(&kok, "q1", None, None, 2000).is_err());
        assert!(cevap_yaz(&kok, "q1", Some("evet"), None, 9000).is_err(), "süresi geçmiş");
        assert!(cevap_yaz(&kok, "..\\q1", Some("evet"), None, 2000).is_err());
        assert!(cevap_yaz(&kok, "yok", Some("evet"), None, 2000).is_err());
        cevap_yaz(&kok, "q1", Some("evet"), None, 2000).unwrap();
        let v: Value = serde_json::from_slice(&std::fs::read(cevap_yolu(&kok, "q1")).unwrap()).unwrap();
        assert_eq!(v, json!({"surum":1,"id":"q1","secim":"evet","metin":null,"zaman":2000,"kaynak":"ada"}));
        assert!(!kok.join("cevaplar").join("q1.json.tmp").exists());
        assert_eq!(cevap_yaz(&kok, "q1", Some("hayir"), None, 2000).unwrap_err(), "Bu soru zaten cevaplandı.");
        std::fs::remove_dir_all(kok).unwrap();
    }

    #[test]
    fn serbest_metin_kirpilir_ve_sinirlanir() {
        let kok = gecici_kok("serbest");
        let mut v = ornek("q2", 9000);
        v["tur"] = json!("soru");
        v["secenekler"] = json!([]);
        v["serbestMetin"] = json!(true);
        yaz(&kok, &v);
        assert!(cevap_yaz(&kok, "q2", None, Some("   "), 2000).is_err());
        assert!(cevap_yaz(&kok, "q2", None, Some(&"z".repeat(2001)), 2000).is_err());
        cevap_yaz(&kok, "q2", None, Some("  main dalı  "), 2000).unwrap();
        let v: Value = serde_json::from_slice(&std::fs::read(cevap_yolu(&kok, "q2")).unwrap()).unwrap();
        assert_eq!(v["metin"], "main dalı");
        assert_eq!(v["secim"], Value::Null);
        std::fs::remove_dir_all(kok).unwrap();
    }

    #[test]
    fn izleyici_klasor_sonradan_acilsa_da_yeni_soruyu_bildirir() {
        let kok = std::env::temp_dir().join(format!("afunobet-soru-izle-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&kok);
        std::fs::create_dir_all(&kok).unwrap();
        let (tx, rx) = mpsc::channel();
        let _is = izle(kok.clone(), move |l| {
            let _ = tx.send(l.into_iter().map(|s| s.id).collect::<Vec<_>>());
        })
        .unwrap();
        assert_eq!(rx.recv_timeout(Duration::from_secs(3)).unwrap(), Vec::<String>::new(), "ilk liste");
        std::fs::create_dir_all(kok.join("sorular")).unwrap();
        // Klasör açılışı fark edilsin, sonra soru gelsin.
        let _ = rx.recv_timeout(Duration::from_secs(3));
        let gecici = kok.join("sorular").join("z.json.tmp");
        std::fs::write(&gecici, ornek("z", 9_999_999_999_999).to_string()).unwrap();
        std::fs::rename(&gecici, soru_yolu(&kok, "z")).unwrap();
        let son = (0..20)
            .filter_map(|_| rx.recv_timeout(Duration::from_secs(3)).ok())
            .find(|l| l == &["z".to_string()]);
        assert!(son.is_some(), "yeni soru bildirilmedi");
        std::fs::remove_file(soru_yolu(&kok, "z")).unwrap();
        let silindi = (0..20)
            .filter_map(|_| rx.recv_timeout(Duration::from_secs(3)).ok())
            .find(|liste| liste.is_empty());
        assert!(silindi.is_some(), "silinen soru kuyruktan kaldırılmadı");
        let _ = std::fs::remove_dir_all(kok);
    }
}
