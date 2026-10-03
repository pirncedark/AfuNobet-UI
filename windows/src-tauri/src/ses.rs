//! Original PCM cues, embedded so packaged applications require no loose sound files.
pub fn wav(kind: &str) -> Option<&'static [u8]> {
    Some(match kind {
        "working" | "started" => include_bytes!("../../public/ses/basladi.wav"),
        "finished" => include_bytes!("../../public/ses/tamamlandi.wav"),
        "error" => include_bytes!("../../public/ses/hata.wav"),
        "question" => include_bytes!("../../public/ses/cevap.wav"),
        "rate_limit" => include_bytes!("../../public/ses/kota.wav"),
        "connected" => include_bytes!("../../public/ses/baglandi.wav"),
        _ => return None,
    })
}
#[cfg(windows)]
#[link(name = "winmm")]
unsafe extern "system" {
    fn PlaySoundW(sound: *const u8, module: *const std::ffi::c_void, flags: u32) -> i32;
}
pub fn play(kind: &str) {
    let kind = kind.to_string();
    std::thread::spawn(move || {
        if let Some(bytes) = wav(&kind) {
            // Synchronous (no ASYNC): thread stays alive until sound finishes.
            #[cfg(windows)] unsafe { let _ = PlaySoundW(bytes.as_ptr(), std::ptr::null(), 0x0002 | 0x0004); }
            #[cfg(not(windows))] let _ = bytes;
        }
    });
}
pub fn stop() {
    #[cfg(windows)] unsafe { let _ = PlaySoundW(std::ptr::null(), std::ptr::null(), 0); }
}
