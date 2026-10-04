// Genel ajan protokolü (E1/E1b/E3). Sözleşme: docs/AJAN_PROTOKOLU.md.
// Her ajan aynı biçimde olay yazar; ajan adı listesi yoktur, yeni ad yeni ajandır.
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashMap;

pub const OLAY: &str = "ajan-olaylari";
pub const MAX_SATIR: usize = 64;
const BITTI_OMRU_MS: u64 = 10 * 60 * 1000;
const MAX_GOREV: usize = 120;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Durum {
    Thinking,
    Working,
    Question,
    Finished,
    Error,
    RateLimit,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tur {
    Durum(Durum),
    AltBasla,
    AltBitti,
}

/// Ham olay adını standart ada çevirir. Büyük/küçük harf ve `_ . /` farkı önemsizdir.
pub fn esle(ham: &str) -> Option<Tur> {
    use Durum::*;
    let anahtar: String = ham
        .trim()
        .chars()
        .filter(|c| !matches!(c, '_' | '.' | '/' | '-' | ' '))
        .flat_map(char::to_lowercase)
        .collect();
    let tur = match anahtar.as_str() {
        // standart adlar
        "thinking" => Tur::Durum(Thinking),
        "working" => Tur::Durum(Working),
        "question" => Tur::Durum(Question),
        "finished" => Tur::Durum(Finished),
        "error" => Tur::Durum(Error),
        "ratelimit" => Tur::Durum(RateLimit),
        "subagentstart" => Tur::AltBasla,
        "subagentstop" => Tur::AltBitti,
        // Claude Code kancaları
        "userpromptsubmit" | "sessionstart" => Tur::Durum(Thinking),
        "pretooluse" | "posttooluse" => Tur::Durum(Working),
        "permissionrequest" | "notification" => Tur::Durum(Question),
        "stop" | "sessionend" => Tur::Durum(Finished),
        "stopfailure" => Tur::Durum(Error),
        // Codex app-server / notify
        "turnstarted" => Tur::Durum(Thinking),
        "itemstarted" | "itemcompleted" | "execcommandbegin" => Tur::Durum(Working),
        "itemcommandexecutionrequestapproval"
        | "itemfilechangerequestapproval"
        | "itempermissionsrequestapproval"
        | "itemtoolrequestuserinput"
        | "execcommandapproval"
        | "applypatchapproval" => Tur::Durum(Question),
        "turncompleted" | "agentturncomplete" => Tur::Durum(Finished),
        "turnfailed" => Tur::Durum(Error),
        "usagelimitexceeded" => Tur::Durum(RateLimit),
        // Gemini CLI kancaları
        "beforeagent" | "beforemodel" => Tur::Durum(Thinking),
        "beforetool" | "aftertool" => Tur::Durum(Working),
        "afteragent" => Tur::Durum(Finished),
        "resourceexhausted" => Tur::Durum(RateLimit),
        // OpenCode eklenti olayları
        "sessionstatus" | "messageupdated" => Tur::Durum(Thinking),
        "toolexecutebefore" | "toolexecuteafter" | "messagepartupdated" => Tur::Durum(Working),
        "permissionasked" | "permissionupdated" => Tur::Durum(Question),
        "sessionidle" => Tur::Durum(Finished),
        "sessionerror" => Tur::Durum(Error),
        _ if anahtar.starts_with("itemreasoning") => Tur::Durum(Thinking),
        _ => return None,
    };
    Some(tur)
}

fn kota_hatasi(metin: &str) -> bool {
    let k = metin.to_lowercase();
    ["429", "rate limit", "rate_limit", "usage limit", "quota", "kota", "resource_exhausted"]
        .iter()
        .any(|m| k.contains(m))
}

fn kimlik(s: &str, en_fazla: usize, ek: &str) -> bool {
    !s.is_empty() && s.len() <= en_fazla && s.chars().all(|c| c.is_ascii_alphanumeric() || ek.contains(c))
}

pub fn gecerli_ajan(s: &str) -> bool {
    kimlik(s, 32, "_-") && !s.chars().any(|c| c.is_ascii_uppercase())
}

fn gecerli_oturum(s: &str) -> bool {
    kimlik(s, 80, "_.:-")
}

/// Görev metni: gizli bilgi maskelenir, yol/teknik metin hiç gösterilmez.
fn gorev_metni(v: Option<&Value>) -> Option<String> {
    let ham = v?.as_str()?;
    let temiz: String = ham.chars().map(|c| if c.is_control() { ' ' } else { c }).collect();
    let temiz = temiz.split_whitespace().collect::<Vec<_>>().join(" ");
    let kucuk = temiz.to_lowercase();
    if temiz.is_empty()
        || temiz.contains('\\')
        || temiz.contains("://")
        || kucuk.contains("pid ")
        || kucuk.contains("port ")
        || temiz.chars().nth(1) == Some(':')
    {
        return None;
    }
    let maskeli = crate::questions::maskele(&temiz);
    if maskeli.contains("•••") {
        return None;
    }
    let mut kesik: String = maskeli.chars().take(MAX_GOREV).collect();
    if maskeli.chars().count() > MAX_GOREV {
        kesik.pop();
        kesik.push('…');
    }
    Some(kesik)
}

#[derive(Debug, PartialEq)]
pub struct Olay {
    pub ajan: String,
    pub tur: Tur,
    pub oturum: String,
    pub gorev: Option<String>,
    pub alt_oturum: Option<String>,
    pub alt_tur: Option<String>,
    pub zaman: u64,
}

fn ilk_metin<'a>(o: &'a serde_json::Map<String, Value>, tr: &str, en: &str) -> Result<Option<&'a str>, &'static str> {
    let t = o.get(tr).and_then(Value::as_str);
    let e = o.get(en).and_then(Value::as_str);
    if t.is_some() && e.is_some() && t != e {
        return Err("celiski");
    }
    Ok(t.or(e))
}

/// Bir protokol satırını doğrular ve standart olaya çevirir.
pub fn coz(satir: &str, simdi: u64) -> Result<Olay, &'static str> {
    let v: Value = serde_json::from_str(satir.trim_start_matches('\u{feff}')).map_err(|_| "json")?;
    let o = v.as_object().ok_or("json")?;
    match o.get("surum") {
        None => {}
        Some(s) if s.as_u64() == Some(1) => {}
        _ => return Err("surum"),
    }
    let ajan = ilk_metin(o, "ajan", "agent").map_err(|_| "ajan")?.filter(|a| gecerli_ajan(a)).ok_or("ajan")?;
    let ham = ilk_metin(o, "olay", "event").map_err(|_| "olay")?.ok_or("olay")?;
    let mut tur = esle(ham).ok_or("olay")?;
    if tur == Tur::Durum(Durum::Error) {
        let ayrinti = ["mesaj", "message", "hata", "error"]
            .iter()
            .filter_map(|k| o.get(*k).and_then(Value::as_str))
            .any(kota_hatasi);
        if ayrinti || kota_hatasi(ham) {
            tur = Tur::Durum(Durum::RateLimit);
        }
    }
    let oturum = match ilk_metin(o, "oturum", "session_id").map_err(|_| "oturum")? {
        Some(s) if gecerli_oturum(s) => s.to_owned(),
        Some(_) => return Err("oturum"),
        None => ajan.to_owned(),
    };
    let alt_oturum = ilk_metin(o, "alt_oturum", "agent_id").unwrap_or(None).filter(|s| gecerli_oturum(s)).map(str::to_owned);
    if matches!(tur, Tur::AltBasla | Tur::AltBitti) && alt_oturum.is_none() {
        return Err("alt_oturum");
    }
    let zaman = o
        .get("zaman")
        .and_then(Value::as_u64)
        .filter(|z| *z > 1_000_000_000_000 && *z <= simdi + 60_000)
        .unwrap_or(simdi);
    Ok(Olay {
        ajan: ajan.to_owned(),
        tur,
        oturum,
        gorev: gorev_metni(o.get("gorev")),
        alt_oturum,
        alt_tur: gorev_metni(o.get("alt_tur")),
        zaman,
    })
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Kayit {
    pub oturum: String,
    pub ajan: String,
    pub durum: Durum,
    pub gorev: Option<String>,
    pub ust: Option<String>,
    pub alt: bool,
    pub baslangic: u64,
    pub guncelleme: u64,
    pub bitti: bool,
}

/// Oturum başına tek satır; alt ajanlar ana oturumun altında ayrı satırdır.
#[derive(Default)]
pub struct Kayitlar {
    satirlar: HashMap<String, Kayit>,
}

impl Kayitlar {
    fn yeni(oturum: &str, ajan: &str, durum: Durum, ust: Option<String>, zaman: u64) -> Kayit {
        Kayit {
            oturum: oturum.into(),
            ajan: ajan.into(),
            durum,
            gorev: None,
            alt: ust.is_some(),
            ust,
            baslangic: zaman,
            guncelleme: zaman,
            bitti: false,
        }
    }

    pub fn uygula(&mut self, olay: Olay) {
        let Olay { ajan, tur, oturum, gorev, alt_oturum, alt_tur, zaman } = olay;
        match tur {
            Tur::Durum(durum) => {
                let k = self
                    .satirlar
                    .entry(oturum.clone())
                    .or_insert_with(|| Self::yeni(&oturum, &ajan, durum, None, zaman));
                k.durum = durum;
                k.guncelleme = zaman.max(k.guncelleme);
                k.bitti = durum == Durum::Finished;
                // Araç adı (working) işin başlığını ezmez; yalnız boşsa doldurur.
                if gorev.is_some() && (k.gorev.is_none() || durum != Durum::Working) {
                    k.gorev = gorev;
                }
                // Ana oturum bittiyse açık kalan alt ajanlar da biter.
                if durum == Durum::Finished {
                    for alt in self.satirlar.values_mut().filter(|s| s.ust.as_deref() == Some(oturum.as_str())) {
                        alt.bitti = true;
                        alt.durum = Durum::Finished;
                        alt.guncelleme = zaman.max(alt.guncelleme);
                    }
                }
            }
            Tur::AltBasla | Tur::AltBitti => {
                let id = alt_oturum.expect("coz alt_oturum ister");
                let ana = self
                    .satirlar
                    .entry(oturum.clone())
                    .or_insert_with(|| Self::yeni(&oturum, &ajan, Durum::Working, None, zaman));
                if !ana.bitti {
                    ana.guncelleme = zaman.max(ana.guncelleme);
                }
                let durum = if tur == Tur::AltBasla { Durum::Working } else { Durum::Finished };
                let k = self
                    .satirlar
                    .entry(id.clone())
                    .or_insert_with(|| Self::yeni(&id, &ajan, durum, Some(oturum.clone()), zaman));
                k.durum = durum;
                k.bitti = tur == Tur::AltBitti;
                k.guncelleme = zaman.max(k.guncelleme);
                if let Some(t) = alt_tur.or(gorev) {
                    k.gorev = Some(t);
                }
            }
        }
    }

    /// Bayat bitmiş satırları atar ve listeyi sınırlar.
    pub fn temizle(&mut self, simdi: u64) {
        self.satirlar.retain(|_, k| !(k.bitti && simdi.saturating_sub(k.guncelleme) > BITTI_OMRU_MS));
        if self.satirlar.len() > MAX_SATIR {
            let mut eski: Vec<(bool, u64, String)> =
                self.satirlar.values().map(|k| (!k.bitti, k.guncelleme, k.oturum.clone())).collect();
            eski.sort();
            for (_, _, id) in eski.into_iter().take(self.satirlar.len() - MAX_SATIR) {
                self.satirlar.remove(&id);
            }
        }
    }

    /// Ana satır, hemen altında alt ajanları; başlangıç sırasıyla.
    pub fn liste(&self) -> Vec<Kayit> {
        let mut analar: Vec<&Kayit> = self.satirlar.values().filter(|k| !k.alt).collect();
        analar.sort_by(|a, b| (a.baslangic, &a.oturum).cmp(&(b.baslangic, &b.oturum)));
        let mut cikti = Vec::with_capacity(self.satirlar.len());
        for ana in analar {
            cikti.push(ana.clone());
            let mut altlar: Vec<&Kayit> =
                self.satirlar.values().filter(|k| k.alt && k.ust.as_deref() == Some(ana.oturum.as_str())).collect();
            altlar.sort_by(|a, b| (a.baslangic, &a.oturum).cmp(&(b.baslangic, &b.oturum)));
            cikti.extend(altlar.into_iter().cloned());
        }
        let mut yetim: Vec<&Kayit> = self
            .satirlar
            .values()
            .filter(|k| k.alt && !k.ust.as_ref().is_some_and(|u| self.satirlar.get(u).is_some_and(|a| !a.alt)))
            .collect();
        yetim.sort_by(|a, b| (a.baslangic, &a.oturum).cmp(&(b.baslangic, &b.oturum)));
        cikti.extend(yetim.into_iter().cloned());
        cikti
    }

    pub fn yuk(&self) -> Value {
        json!({ "surum": 1, "satirlar": self.liste() })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const T: u64 = 1_790_000_000_000;

    #[test]
    fn ortak_ingilizce_alanlar_kabul_edilir_celiski_reddedilir() {
        let o = coz(r#"{"agent":"yeni-ajan","event":"working","session_id":"new-1"}"#, T).unwrap();
        assert_eq!(o.ajan, "yeni-ajan");
        assert_eq!(o.oturum, "new-1");
        assert!(coz(r#"{"ajan":"claude","agent":"codex","olay":"working"}"#, T).is_err());
    }

    #[test]
    fn sahte_yeni_ajan_kod_degismeden_gorunur() {
        let mut k = Kayitlar::default();
        let olay = coz(r#"{"surum":1,"ajan":"yeni-ajan","olay":"working","oturum":"y-1","gorev":"Rapor hazırla"}"#, T).unwrap();
        k.uygula(olay);
        let liste = k.liste();
        assert_eq!(liste.len(), 1);
        assert_eq!(liste[0].ajan, "yeni-ajan");
        assert_eq!(liste[0].durum, Durum::Working);
        assert_eq!(liste[0].gorev.as_deref(), Some("Rapor hazırla"));
        assert_eq!(k.yuk()["satirlar"][0]["durum"], "working");
    }

    #[test]
    fn esleme_tablosu_codex_gemini_opencode_claude() {
        use Durum::*;
        let tablo: &[(&str, Tur)] = &[
            ("thinking", Tur::Durum(Thinking)),
            ("rate_limit", Tur::Durum(RateLimit)),
            ("turn/started", Tur::Durum(Thinking)),
            ("item/reasoning/summaryTextDelta", Tur::Durum(Thinking)),
            ("item/started", Tur::Durum(Working)),
            ("item/commandExecution/requestApproval", Tur::Durum(Question)),
            ("applyPatchApproval", Tur::Durum(Question)),
            ("turn/completed", Tur::Durum(Finished)),
            ("agent-turn-complete", Tur::Durum(Finished)),
            ("usageLimitExceeded", Tur::Durum(RateLimit)),
            ("BeforeAgent", Tur::Durum(Thinking)),
            ("BeforeTool", Tur::Durum(Working)),
            ("AfterAgent", Tur::Durum(Finished)),
            ("RESOURCE_EXHAUSTED", Tur::Durum(RateLimit)),
            ("session.idle", Tur::Durum(Finished)),
            ("session.error", Tur::Durum(Error)),
            ("permission.asked", Tur::Durum(Question)),
            ("tool.execute.before", Tur::Durum(Working)),
            ("UserPromptSubmit", Tur::Durum(Thinking)),
            ("PreToolUse", Tur::Durum(Working)),
            ("PermissionRequest", Tur::Durum(Question)),
            ("Stop", Tur::Durum(Finished)),
            ("StopFailure", Tur::Durum(Error)),
            ("SubagentStart", Tur::AltBasla),
            ("SubagentStop", Tur::AltBitti),
            ("turn_completed", Tur::Durum(Finished)),
        ];
        for (ham, beklenen) in tablo {
            assert_eq!(esle(ham), Some(*beklenen), "{ham}");
        }
        assert_eq!(esle("bilinmeyen-olay"), None);
    }

    #[test]
    fn hata_metninde_kota_varsa_rate_limit_olur() {
        let o = coz(r#"{"ajan":"gemini","olay":"error","mesaj":"429 Too Many Requests"}"#, T).unwrap();
        assert_eq!(o.tur, Tur::Durum(Durum::RateLimit));
        let o = coz(r#"{"ajan":"gemini","olay":"error","mesaj":"derleme kırıldı"}"#, T).unwrap();
        assert_eq!(o.tur, Tur::Durum(Durum::Error));
    }

    #[test]
    fn gecersiz_satirlar_reddedilir() {
        for (satir, neden) in [
            ("{", "json"),
            ("[]", "json"),
            (r#"{"surum":2,"ajan":"codex","olay":"working"}"#, "surum"),
            (r#"{"ajan":"Codex","olay":"working"}"#, "ajan"),
            (r#"{"ajan":"a b","olay":"working"}"#, "ajan"),
            (r#"{"ajan":"codex","olay":"dans"}"#, "olay"),
            (r#"{"ajan":"codex","olay":"working","oturum":"../x y"}"#, "oturum"),
            (r#"{"ajan":"claude","olay":"SubagentStart","oturum":"c"}"#, "alt_oturum"),
        ] {
            assert_eq!(coz(satir, T).unwrap_err(), neden, "{satir}");
        }
        let uzun = format!(r#"{{"ajan":"{}","olay":"working"}}"#, "a".repeat(33));
        assert_eq!(coz(&uzun, T).unwrap_err(), "ajan");
    }

    #[test]
    fn gorev_metni_temizlenir() {
        // 1.0.3: istem olarak yapıştırılan Google anahtarı görev başlığı olmaz (uydurma örnek).
        let g = coz(r#"{"ajan":"gemini","olay":"BeforeAgent","gorev":"AQ.FakeKey0123456789-abcdef_GHIJ"}"#, T).unwrap();
        assert_eq!(g.gorev, None);
        let o = coz(r#"{"ajan":"codex","olay":"working","gorev":"C:\\gizli\\yol"}"#, T).unwrap();
        assert_eq!(o.gorev, None);
        let o = coz(r#"{"ajan":"codex","olay":"working","gorev":"token=abcdef123456 ile dene"}"#, T).unwrap();
        assert_eq!(o.gorev, None);
        let o = coz(&format!(r#"{{"ajan":"codex","olay":"working","gorev":"{}"}}"#, "x".repeat(300)), T).unwrap();
        assert_eq!(o.gorev.unwrap().chars().count(), MAX_GOREV);
        let o = coz(r#"{"ajan":"codex","olay":"working","oturum":"c1"}"#, T).unwrap();
        assert_eq!(o.zaman, T);
        assert_eq!(o.oturum, "c1");
        let o = coz(r#"{"ajan":"codex","olay":"working"}"#, T).unwrap();
        assert_eq!(o.oturum, "codex");
    }

    #[test]
    fn alt_ajan_baslat_bitir_ayri_satir() {
        let mut k = Kayitlar::default();
        k.uygula(coz(r#"{"ajan":"claude","olay":"UserPromptSubmit","oturum":"c-1","gorev":"Planı uygula","zaman":1790000000000}"#, T).unwrap());
        k.uygula(coz(r#"{"ajan":"claude","olay":"SubagentStart","oturum":"c-1","alt_oturum":"ag-7","alt_tur":"Explore","zaman":1790000002000}"#, T).unwrap());
        k.uygula(coz(r#"{"ajan":"codex","olay":"working","oturum":"x-1","zaman":1790000001000}"#, T).unwrap());
        let l = k.liste();
        let sira: Vec<_> = l.iter().map(|s| s.oturum.as_str()).collect();
        assert_eq!(sira, ["c-1", "ag-7", "x-1"]);
        assert!(l[1].alt);
        assert_eq!(l[1].ust.as_deref(), Some("c-1"));
        assert_eq!(l[1].gorev.as_deref(), Some("Explore"));
        assert!(!l[1].bitti);
        k.uygula(coz(r#"{"ajan":"claude","olay":"SubagentStop","oturum":"c-1","alt_oturum":"ag-7","zaman":1790000009000}"#, T).unwrap());
        let alt = k.liste().into_iter().find(|s| s.oturum == "ag-7").unwrap();
        assert!(alt.bitti);
        assert_eq!(alt.durum, Durum::Finished);
        assert!(!k.liste()[0].bitti, "ana oturum sürüyor");
    }

    #[test]
    fn arac_adi_is_basligini_ezmez() {
        let mut k = Kayitlar::default();
        k.uygula(coz(r#"{"ajan":"claude","olay":"PreToolUse","oturum":"c-1","gorev":"Read","zaman":1790000000000}"#, T).unwrap());
        assert_eq!(k.liste()[0].gorev.as_deref(), Some("Read"), "başlık yoksa araç adı doldurur");
        k.uygula(coz(r#"{"ajan":"claude","olay":"UserPromptSubmit","oturum":"c-1","gorev":"Planı uygula","zaman":1790000001000}"#, T).unwrap());
        k.uygula(coz(r#"{"ajan":"claude","olay":"PreToolUse","oturum":"c-1","gorev":"Edit","zaman":1790000002000}"#, T).unwrap());
        assert_eq!(k.liste()[0].gorev.as_deref(), Some("Planı uygula"));
        k.uygula(coz(r#"{"ajan":"claude","olay":"UserPromptSubmit","oturum":"c-1","gorev":"Testleri yaz","zaman":1790000003000}"#, T).unwrap());
        assert_eq!(k.liste()[0].gorev.as_deref(), Some("Testleri yaz"), "yeni istem başlığı yeniler");
    }

    #[test]
    fn ana_bitince_acik_alt_ajanlar_biter_ve_bayatlar_duser() {
        let mut k = Kayitlar::default();
        k.uygula(coz(r#"{"ajan":"claude","olay":"SubagentStart","oturum":"c-1","alt_oturum":"ag-1"}"#, T).unwrap());
        k.uygula(coz(r#"{"ajan":"claude","olay":"Stop","oturum":"c-1"}"#, T).unwrap());
        assert!(k.liste().iter().all(|s| s.bitti));
        k.temizle(T + BITTI_OMRU_MS);
        assert_eq!(k.liste().len(), 2);
        k.temizle(T + BITTI_OMRU_MS + 1);
        assert!(k.liste().is_empty());
    }

    #[test]
    fn liste_en_fazla_64_satir_once_bitmisler_atilir() {
        let mut k = Kayitlar::default();
        for i in 0..70u64 {
            let olay = if i < 10 { "finished" } else { "working" };
            k.uygula(coz(&format!(r#"{{"ajan":"codex","olay":"{olay}","oturum":"o{i}","zaman":{}}}"#, T + i), T + 100).unwrap());
        }
        k.temizle(T + 100);
        let l = k.liste();
        assert_eq!(l.len(), MAX_SATIR);
        assert_eq!(l.iter().filter(|s| s.bitti).count(), 4);
    }
}
