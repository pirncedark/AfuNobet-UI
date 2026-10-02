// Kart açıkken pencerenin DIŞINA yapılan tıklamayı fark eder.
//
// Ada penceresi WS_EX_NOACTIVATE ile açılır; kullanıcı karta hiç dokunmadan
// masaüstüne tıklarsa pencere odak kaybı olayı bile almaz. Bu yüzden kart açık
// olduğu sürece fare tuşları kısa aralıkla okunur: tuş pencerenin dışında basılıp
// yine dışarıda, kıpırdamadan bırakılırsa (yani sürükleme değil, tıklama) ön yüze
// `outside-click` gönderilir. Masaüstünden dosya sürükleyip karta bırakmak
// tıklama sayılmaz. Kart kapalıyken iş parçacığı koşul değişkeninde uyur.

use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter};
use windows::Win32::Foundation::POINT;
use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON, VK_RBUTTON};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

/// Tıklama sayılması için basma ile bırakma arasındaki en büyük kayma (fiziksel px).
const KAYMA: i32 = 8;
/// Tıklama sayılması için en uzun basılı tutma süresi.
const SURE: Duration = Duration::from_millis(1200);

pub fn disarida(p: (i32, i32), r: (i32, i32, i32, i32)) -> bool {
    p.0 < r.0 || p.0 >= r.2 || p.1 < r.1 || p.1 >= r.3
}

/// Basma ve bırakma birlikte bir "dışarı tıklama" mı?
pub fn disari_tik(bas: (i32, i32), birak: (i32, i32), sure: Duration, pencere: (i32, i32, i32, i32)) -> bool {
    disarida(bas, pencere)
        && disarida(birak, pencere)
        && (bas.0 - birak.0).abs() <= KAYMA
        && (bas.1 - birak.1).abs() <= KAYMA
        && sure <= SURE
}

#[derive(Default)]
pub struct KartGozcu {
    acik: Mutex<bool>,
    cv: Condvar,
}

impl KartGozcu {
    pub fn ayarla(&self, acik: bool) {
        *self.acik.lock().unwrap() = acik;
        self.cv.notify_all();
    }
    fn acik_mi(&self) -> bool {
        *self.acik.lock().unwrap()
    }
    fn bekle(&self) {
        let mut g = self.acik.lock().unwrap();
        while !*g {
            g = self.cv.wait(g).unwrap();
        }
    }
}

fn imlec() -> Option<(i32, i32)> {
    let mut p = POINT::default();
    unsafe { GetCursorPos(&mut p).ok()? };
    Some((p.x, p.y))
}

fn basili() -> bool {
    unsafe {
        (GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000) != 0
            || (GetAsyncKeyState(VK_RBUTTON.0 as i32) as u16 & 0x8000) != 0
    }
}

fn pencere_rect(app: &AppHandle) -> Option<(i32, i32, i32, i32)> {
    let win = crate::island::window(app)?;
    if !win.is_visible().unwrap_or(false) {
        return None;
    }
    let p = win.outer_position().ok()?;
    let s = win.outer_size().ok()?;
    Some((p.x, p.y, p.x + s.width as i32, p.y + s.height as i32))
}

pub fn baslat(app: AppHandle, gozcu: Arc<KartGozcu>) {
    std::thread::spawn(move || loop {
        gozcu.bekle();
        // Kart açılırken zaten basılı olan tuş (açan tıklama) sayılmaz.
        let mut onceki = basili();
        let mut basma: Option<((i32, i32), Instant)> = None;
        while gozcu.acik_mi() {
            std::thread::sleep(Duration::from_millis(20));
            let simdi = basili();
            if simdi && !onceki {
                basma = imlec().map(|p| (p, Instant::now()));
            } else if !simdi && onceki {
                if let (Some((bas, t)), Some(birak), Some(r)) = (basma.take(), imlec(), pencere_rect(&app)) {
                    if disari_tik(bas, birak, t.elapsed(), r) {
                        let _ = app.emit_to(crate::island::WINDOW_LABEL, "outside-click", ());
                    }
                }
            }
            onceki = simdi;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    // Canlı pencere: tek monitör 5120x1440, ada (2200,0)-(2920,320).
    const ADA: (i32, i32, i32, i32) = (2200, 0, 2920, 320);

    #[test]
    fn masaustune_tik_disari_sayilir() {
        assert!(disari_tik((1000, 700), (1002, 701), Duration::from_millis(90), ADA));
    }
    #[test]
    fn kart_icindeki_tik_disari_degil() {
        assert!(!disari_tik((2450, 259), (2450, 259), Duration::from_millis(90), ADA));
        assert!(!disari_tik((2919, 319), (2919, 319), Duration::from_millis(90), ADA));
    }
    #[test]
    fn surukle_birak_tiklama_sayilmaz() {
        // Masaüstünden dosya sürükleyip karta bırakmak.
        assert!(!disari_tik((1000, 700), (2500, 200), Duration::from_millis(600), ADA));
        // Dışarıda uzun sürükleme.
        assert!(!disari_tik((1000, 700), (1200, 700), Duration::from_millis(300), ADA));
        // Uzun basılı tutma.
        assert!(!disari_tik((1000, 700), (1000, 700), Duration::from_millis(3000), ADA));
    }
    #[test]
    fn negatif_orijinli_monitor() {
        let sol = (-1920, 0, -1200, 320);
        assert!(!disarida((-1500, 100), sol));
        assert!(disarida((100, 100), sol));
        assert!(disarida((-1200, 100), sol));
    }
}
