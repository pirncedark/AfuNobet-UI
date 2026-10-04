pub trait Kasa {
 fn kaydet(&self, hedef: &str, secret: &[u8]) -> Result<(), String>;
 fn oku(&self, hedef: &str) -> Result<Option<Vec<u8>>, String>;
 fn sil(&self, hedef: &str) -> Result<(), String>;
}
fn hata()->String { "Anahtar saklanamadı; yeniden dene.".into() }
fn hedef(name: &str) -> Result<String,String> {
 if name.is_empty() || name.len()>64 || !name.bytes().all(|c|c.is_ascii_lowercase()||c.is_ascii_digit()||c==b'-'||c==b'_') { return Err(hata()); }
 Ok(format!("AfuNobet-UI/{name}"))
}
pub fn kaydet(kasa: &impl Kasa,name:&str,secret:&str)->Result<(),String> {
 if secret.is_empty() || secret.len()>2560 { return Err(hata()); }
 kasa.kaydet(&hedef(name)?,secret.as_bytes())
}
pub fn var(kasa: &impl Kasa,name:&str)->Result<bool,String> {
 let secret=kasa.oku(&hedef(name)?)?; let exists=secret.is_some(); if let Some(mut bytes)=secret { sifirla(&mut bytes); } Ok(exists)
}
pub fn sil(kasa: &impl Kasa,name:&str)->Result<(),String> { kasa.sil(&hedef(name)?) }
fn sifirla(bytes:&mut [u8]) { for byte in bytes { unsafe { std::ptr::write_volatile(byte,0); } } }
pub struct WindowsKasa;
#[cfg(windows)]
impl Kasa for WindowsKasa {
 fn kaydet(&self,target:&str,secret:&[u8])->Result<(),String> {
  use windows::{core::PWSTR, Win32::Security::Credentials::*};
  let mut target:Vec<u16>=target.encode_utf16().chain(Some(0)).collect();let mut bytes=secret.to_vec();
  let credential=CREDENTIALW {Type:CRED_TYPE_GENERIC,TargetName:PWSTR(target.as_mut_ptr()),CredentialBlobSize:bytes.len() as u32,CredentialBlob:bytes.as_mut_ptr(),Persist:CRED_PERSIST_LOCAL_MACHINE,..Default::default()};
  let result=unsafe {CredWriteW(&credential,0)}.map_err(|_|hata());sifirla(&mut bytes);result
 }
 fn oku(&self,target:&str)->Result<Option<Vec<u8>>,String> {
  use windows::{core::PCWSTR, Win32::{Security::Credentials::*,Foundation::ERROR_NOT_FOUND}};
  let target:Vec<u16>=target.encode_utf16().chain(Some(0)).collect();let mut ptr=std::ptr::null_mut();
  match unsafe {CredReadW(PCWSTR(target.as_ptr()),CRED_TYPE_GENERIC,None,&mut ptr)} {
   Ok(())=> {if ptr.is_null(){return Err(hata());} let result=unsafe {let c=&*ptr;if c.CredentialBlobSize==0 {Vec::new()}else if c.CredentialBlob.is_null() || c.CredentialBlobSize>2560 {CredFree(ptr.cast());return Err(hata());}else {std::slice::from_raw_parts(c.CredentialBlob,c.CredentialBlobSize as usize).to_vec()}}; unsafe {let c=&mut *ptr;if !c.CredentialBlob.is_null(){sifirla(std::slice::from_raw_parts_mut(c.CredentialBlob,c.CredentialBlobSize as usize));}CredFree(ptr.cast());} Ok(Some(result)) },
   Err(e) if e.code()==windows::core::HRESULT::from_win32(ERROR_NOT_FOUND.0)=>Ok(None),
   Err(_)=>Err(hata())
  }
 }
 fn sil(&self,target:&str)->Result<(),String> {
  use windows::{core::PCWSTR, Win32::{Security::Credentials::*,Foundation::ERROR_NOT_FOUND}};
  let target:Vec<u16>=target.encode_utf16().chain(Some(0)).collect();
  match unsafe {CredDeleteW(PCWSTR(target.as_ptr()),CRED_TYPE_GENERIC,None)} {Ok(())=>Ok(()),Err(e) if e.code()==windows::core::HRESULT::from_win32(ERROR_NOT_FOUND.0)=>Ok(()),Err(_)=>Err(hata())}
 }
}
#[cfg(not(windows))]
impl Kasa for WindowsKasa {
 fn kaydet(&self,_:&str,_:&[u8])->Result<(),String>{Err(hata())}
 fn oku(&self,_:&str)->Result<Option<Vec<u8>>,String>{Err(hata())}
 fn sil(&self,_:&str)->Result<(),String>{Err(hata())}
}
#[tauri::command]
pub fn anahtar_kaydet(name:String,mut secret:String)->Result<(),String>{let result=kaydet(&WindowsKasa,&name,&secret);unsafe{sifirla(secret.as_bytes_mut());}result}
#[tauri::command]
pub fn anahtar_var(name:String)->Result<bool,String>{var(&WindowsKasa,&name)}
#[tauri::command]
pub fn anahtar_sil(name:String)->Result<(),String>{sil(&WindowsKasa,&name)}
