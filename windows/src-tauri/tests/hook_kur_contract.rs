#[path = "../src/hook_kur.rs"] mod hook_kur;
use serde_json::{json, Value};
use std::{fs, path::PathBuf};
fn fixture() -> PathBuf {
 let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target/hook-tests").join(format!("{}-{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
 fs::create_dir_all(&root).unwrap(); root.join("settings.json")
}
#[test] fn kur_kaldir_yabanci_kayitlari_korur_ve_yedekler() {
 let path=fixture(); let original=json!({"theme":"dark","hooks":{"Stop":[{"hooks":[{"type":"command","command":"echo foreign"}]}],"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"echo afu-accidental"}]}]}}).to_string();
 fs::write(&path,&original).unwrap();
 let plan=hook_kur::onizle(&path,"python C:/Afu/afu_hook.py",true).unwrap();
 assert_eq!(fs::read_to_string(&path).unwrap(),original,"preview never mutates");
 assert!(plan.sonra.contains("afu_hook.py"));
 let backup=hook_kur::uygula(&path,&plan).unwrap(); assert_eq!(fs::read_to_string(backup).unwrap(),original);
 let uninstall=hook_kur::onizle(&path,"python C:/Afu/afu_hook.py",false).unwrap(); hook_kur::uygula(&path,&uninstall).unwrap();
 assert_eq!(serde_json::from_str::<Value>(&fs::read_to_string(&path).unwrap()).unwrap(),serde_json::from_str::<Value>(&original).unwrap());
}
#[test] fn bayat_diff_ve_bozuk_json_yazilmaz() {
 let path=fixture(); fs::write(&path,"{}").unwrap();
 let plan=hook_kur::onizle(&path,"python C:/Afu/afu_hook.py",true).unwrap();
 fs::write(&path,"{\"foreign\":true}").unwrap(); assert!(hook_kur::uygula(&path,&plan).is_err());
 fs::write(&path,"broken").unwrap(); assert!(hook_kur::onizle(&path,"python C:/Afu/afu_hook.py",true).is_err()); assert_eq!(fs::read_to_string(path).unwrap(),"broken");
}
#[test] fn yalniz_isaretli_tam_afu_kaydi_kaldirilir() {
 let path=fixture();fs::write(&path,json!({"hooks":{"Stop":[{"afuNobet":true,"hooks":[{"type":"command","command":"foreign"}]},{"hooks":[{"type":"command","command":"afu"}]},{"afuNobet":true,"hooks":[{"type":"command","command":"afu"}]}]}}).to_string()).unwrap();
 let plan=hook_kur::onizle(&path,"afu",false).unwrap();let value:Value=serde_json::from_str(&plan.sonra).unwrap();assert_eq!(value["hooks"]["Stop"].as_array().unwrap().len(),2);
}
#[test] fn kurulum_tekrari_tek_kayit_yapar() {
 let path=fixture();fs::write(&path,"{}").unwrap();for _ in 0..2 {let plan=hook_kur::onizle(&path,"afu",true).unwrap();hook_kur::uygula(&path,&plan).unwrap();}
 let value:Value=serde_json::from_str(&fs::read_to_string(path).unwrap()).unwrap();assert_eq!(value["hooks"]["Stop"].as_array().unwrap().len(),1);
}
#[test] fn gecersiz_onizleme_ayar_dosyasini_degistirmez() {
 let path=fixture();fs::write(&path,"{\"foreign\":true}").unwrap();
 for sonra in ["broken", "[]", "null"] {
  let plan=hook_kur::Degisiklik {once:"{\"foreign\":true}".into(),sonra:sonra.into()};
  assert!(hook_kur::uygula(&path,&plan).is_err(),"invalid preview must be rejected");
  assert_eq!(fs::read_to_string(&path).unwrap(),"{\"foreign\":true}");
 }
}
