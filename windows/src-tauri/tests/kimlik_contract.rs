#[path = "../src/kimlik.rs"] mod kimlik;
use std::{cell::RefCell,collections::HashMap};
#[derive(Default)] struct Memory(RefCell<HashMap<String,Vec<u8>>>);
impl kimlik::Kasa for Memory {
 fn kaydet(&self,t:&str,s:&[u8])->Result<(),String>{self.0.borrow_mut().insert(t.into(),s.into());Ok(())}
 fn oku(&self,t:&str)->Result<Option<Vec<u8>>,String>{Ok(self.0.borrow().get(t).cloned())}
 fn sil(&self,t:&str)->Result<(),String>{self.0.borrow_mut().remove(t);Ok(())}
}
#[test] fn anahtar_yalniz_kasada_ve_afu_ad_alaninda() {
 let kasa=Memory::default(); kimlik::kaydet(&kasa,"openai","private-key").unwrap(); assert!(kimlik::var(&kasa,"openai").unwrap());
 assert_eq!(kasa.0.borrow().get("AfuNobet-UI/openai").unwrap(),b"private-key");
 kimlik::sil(&kasa,"openai").unwrap();assert!(!kimlik::var(&kasa,"openai").unwrap());
}
#[test] fn gecersiz_isim_ve_bos_sir_kasaya_ulasmaz() {
 let kasa=Memory::default();for name in ["", "../other", "Other/key", "a\0b"] {assert!(kimlik::kaydet(&kasa,name,"secret").is_err());}
 assert!(kimlik::kaydet(&kasa,"openai","").is_err());assert!(kasa.0.borrow().is_empty());
}
