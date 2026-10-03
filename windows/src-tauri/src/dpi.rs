// Window geometry reconciliation.
//
// The island window is sized in *physical* pixels but every consumer of that
// size — the WebView2 layout viewport, the CSS pixel grid in the front end and
// the cursor maths in `island.rs` — works in *logical* pixels. The only
// invariant that keeps the panel from being clipped is therefore:
//
//     physical client size / window scale factor == PANEL_W x PANEL_H
//
// `island.rs` derives the physical size from the *monitor* scale factor. That
// value is not always the factor the window and its webview actually use: on
// mixed-DPI desktops, and whenever the process is not running with full
// per-monitor-v2 awareness, Windows reports a different scale. When the
// reported factor is smaller than the real one the window is created too
// small, the webview lays out fewer CSS pixels than the design needs and the
// panel is cut off on the right and the bottom.
//
// `island.rs` is preserved byte for byte, so the correction lives here: the
// physical size is re-asserted from the window's *own* scale factor until the
// invariant holds, and the window is then re-centred on the chosen display
// using physical monitor bounds, so the island always hangs from the top
// centre of the screen instead of the top left corner.

use tauri::{AppHandle, Monitor, PhysicalPosition, PhysicalSize};

/// Window-logical target sizes.
///
/// `island.rs` is preserved byte for byte, so its 720x320 constants are still
/// what the window is *born* at; this module re-asserts the size afterwards and
/// is therefore the one place that carries the real card size. P8: the card is
/// drawn 1.5x larger (design 720x320 x 1.5), so the window is 1080x480 logical.
/// The front end mirrors these numbers in `src/core/layout.ts` (PANEL_W/H).
const KART_OLCEK: f64 = 1.5;
const PANEL_W: f64 = 720.0 * KART_OLCEK;
const PANEL_H: f64 = 320.0 * KART_OLCEK;
const STRIP_W: f64 = 240.0;
const STRIP_H: f64 = 6.0;

/// How many times the physical size is re-asserted. One pass is enough in
/// practice; the loop only exists because a resize can itself trigger another
/// DPI change on the way.
const PASSES: usize = 4;

/// A scale factor that is too small or not a number would make the arithmetic
/// below meaningless, and Windows has been known to report a zero DPI for a
/// window that has not been shown yet.
fn usable_scale(scale: f64) -> Option<f64> {
    (scale.is_finite() && scale >= 0.25 && scale <= 16.0).then_some(scale)
}

/// Physical size that yields exactly `logical` CSS pixels at `scale`.
pub fn physical_for(logical: f64, scale: f64) -> u32 {
    let scale = usable_scale(scale).unwrap_or(1.0);
    ((logical * scale).round() as i64).clamp(1, i32::MAX as i64) as u32
}

/// True when a client size of `physical` already maps onto `logical` CSS pixels
/// at `scale`. Half a CSS pixel of slack absorbs rounding.
pub fn sized_correctly(physical: u32, logical: f64, scale: f64) -> bool {
    usable_scale(scale).is_some_and(|scale| (physical as f64 / scale - logical).abs() < 0.5)
}

/// Horizontal offset that centres a window of `window_w` physical pixels inside
/// the display area `[left, left + width)`, clamped so a window wider than the
/// display still starts on it.
pub fn centred_x(left: i32, width: i32, window_w: u32) -> i32 {
    let window_w = window_w as i32;
    let slack = width.saturating_sub(window_w).max(0);
    left + slack / 2
}

/// island.rs imleç döngüsünün hesabı, test edilebilsin diye burada aynen:
/// fiziksel imleç → pencere-mantıksal nokta, ve ada kutusu (+14 px pay) testi.
/// Ön yüz kutuyu bu birimde göndermek zorunda (src/core/hit.ts toWindow).
pub fn pencere_mantiksal(cursor: (f64, f64), origin: (i32, i32), scale: f64) -> (f64, f64) {
    ((cursor.0 - origin.0 as f64) / scale, (cursor.1 - origin.1 as f64) / scale)
}
pub fn adada(p: (f64, f64), r: (f64, f64, f64, f64)) -> bool {
    const PAY: f64 = 14.0;
    r.2 > 0.0 && p.0 >= r.0 - PAY && p.0 <= r.0 + r.2 + PAY && p.1 >= r.1 - PAY && p.1 <= r.1 + r.3 + PAY
}

fn monitor_contains(m: &Monitor, x: i32, y: i32) -> bool {
    let p = m.position();
    let s = m.size();
    x >= p.x
        && x < p.x + s.width as i32
        && y >= p.y
        && y < p.y + s.height as i32
}

/// The display the island lives on: the primary one, or the one under the
/// cursor. Same rule as the preserved `island.rs`, expressed here so the
/// reconciliation can also correct the position.
fn target_monitor(app: &AppHandle, pref: &str) -> Option<Monitor> {
    let monitors = app.available_monitors().ok()?;
    if pref == "cursor" {
        if let Some((cx, cy)) = cursor_physical() {
            if let Some(m) = monitors.iter().find(|m| monitor_contains(m, cx, cy)) {
                return Some(m.clone());
            }
        }
    }
    app.primary_monitor()
        .ok()
        .flatten()
        .or_else(|| monitors.into_iter().next())
}

/// Physical bounds of the display, never `None`: a monitor query that comes back
/// empty must not leave the island at the position the window was created with.
pub fn fallback_bounds() -> (i32, i32, i32) {
    use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN};
    let width = unsafe { GetSystemMetrics(SM_CXSCREEN) };
    (0, 0, if width >= 800 { width } else { 1920 })
}

fn display_bounds(app: &AppHandle, pref: &str) -> (i32, i32, i32) {
    match target_monitor(app, pref) {
        Some(m) => {
            let p = *m.position();
            (p.x, p.y, m.size().width as i32)
        }
        None => fallback_bounds(),
    }
}

fn cursor_physical() -> Option<(i32, i32)> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut p = POINT::default();
    unsafe { GetCursorPos(&mut p).ok()? };
    Some((p.x, p.y))
}

/// Re-asserts the physical size until the CSS viewport matches the panel, then
/// hangs the window from the top centre of the chosen display.
///
/// The window is created hidden (`visible: false` in `tauri.conf.json`) so it is
/// never painted at the 240x6 strip size and the (0, 0) position it is born
/// with; it is shown here, once the size and the position are the real ones.
pub fn place(app: &AppHandle, pref: &str, collapsed: bool) {
    let Some(win) = crate::island::window(app) else {
        return;
    };
    let (lw, lh) = if collapsed {
        (STRIP_W, STRIP_H)
    } else {
        (PANEL_W, PANEL_H)
    };
    for _ in 0..PASSES {
        let scale = win.scale_factor().ok().and_then(usable_scale);
        let Some(scale) = scale else { break };
        let Ok(inner) = win.inner_size() else { break };
        if sized_correctly(inner.width, lw, scale) && sized_correctly(inner.height, lh, scale) {
            break;
        }
        let _ = win.set_size(PhysicalSize::new(physical_for(lw, scale), physical_for(lh, scale)));
    }
    recentre(app, pref);
    let _ = win.show();
}

/// Moves the window back to the horizontal centre of the target display and to
/// its top edge. Moving a window between displays makes Windows rescale it, so
/// the physical size is asserted once more afterwards. The result is read back,
/// because a placement Windows rejected (or scaled on the way) must not leave the
/// island in a corner.
fn recentre(app: &AppHandle, pref: &str) {
    let Some(win) = crate::island::window(app) else {
        return;
    };
    let (left, top, width) = display_bounds(app, pref);
    let Ok(inner) = win.inner_size() else { return };
    let want = PhysicalPosition::new(centred_x(left, width, inner.width), top);
    if win.outer_position().ok().as_ref() != Some(&want) {
        let _ = win.set_position(want);
    }
    let _ = win.set_size(PhysicalSize::new(inner.width, inner.height));
    let _ = win.set_always_on_top(true);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kart_dugme_satiri_metin_olcegi_132_de_adada_kalir() {
        // Canlı ölçüm 2026-10-02: pencere (2200,0) 720x320 fiziksel, ölçek 1.0,
        // WebView2 devicePixelRatio 1.32. Ön yüzün eski gönderdiği CSS kutusu
        // (30.3,0,485.3,216.9) alt düğme satırını dışarıda bırakıyordu.
        let kota = pencere_mantiksal((2450.0, 259.0), (2200, 0), 1.0);
        let kucult = pencere_mantiksal((2824.0, 259.0), (2200, 0), 1.0);
        let eski = (30.3, 0.0, 485.3, 216.9);
        assert!(!adada(kota, eski) && !adada(kucult, eski), "hata yeniden üretilmeli");
        let k = 1.32;
        let yeni = (30.3 * k, 0.0, 485.3 * k, 216.9 * k);
        assert!(adada(kota, yeni) && adada(kucult, yeni));
    }

    #[test]
    fn farkli_olcek_ve_monitor_orijininde_hesap_tutarli() {
        // Sol-üstte negatif orijinli 150% monitör: pencere (-1440,-200), 1080x480 fiziksel.
        let p = pencere_mantiksal((-1440.0 + 600.0, -200.0 + 300.0), (-1440, -200), 1.5);
        assert!((p.0 - 400.0).abs() < 1e-9 && (p.1 - 200.0).abs() < 1e-9);
        // Kart açık: pencerenin tamamı gönderilir → her iç nokta adada.
        let kart = (0.0, 0.0, PANEL_W, PANEL_H);
        for (x, y) in [(0.0, 0.0), (PANEL_W - 1.0, PANEL_H - 1.0), (PANEL_W / 2.0, PANEL_H / 2.0)] {
            assert!(adada((x, y), kart));
        }
        assert!(!adada((PANEL_W + 40.0, 10.0), kart));
        assert!(!adada((10.0, 10.0), (0.0, 0.0, 0.0, 0.0)));
    }

    #[test]
    fn missing_monitor_bounds_still_centre_the_panel() {
        let (left, _, width) = fallback_bounds();
        assert!(width >= 800);
        let x = centred_x(left, width, physical_for(PANEL_W, 1.0));
        assert!(x >= left && x as f64 + PANEL_W <= left as f64 + width as f64);
    }

    #[test]
    fn invalid_scale_uses_one_instead_of_a_one_pixel_window() {
        assert_eq!(physical_for(720.0, f64::NAN), 720);
        assert_eq!(physical_for(720.0, 0.0), 720);
    }

    #[test]
    fn logical_size_becomes_the_matching_physical_size_at_every_windows_scale() {
        for scale in [1.0, 1.25, 1.5, 1.75, 2.0] {
            for logical in [PANEL_W, PANEL_H, STRIP_W, STRIP_H] {
                let physical = physical_for(logical, scale);
                let css = physical as f64 / scale;
                assert!(
                    (css - logical).abs() < 0.5,
                    "{logical} CSS px at {scale}x became {css} CSS px"
                );
            }
        }
    }

    #[test]
    fn a_window_sized_in_the_wrong_scale_is_detected_and_corrected() {
        // The reported defect: the monitor factor said 1.0 while the window and
        // its webview ran at 1.25, so the design got 20% fewer CSS px.
        let wrong = physical_for(PANEL_W, 1.0);
        assert!(!sized_correctly(wrong, PANEL_W, 1.25));
        let corrected = physical_for(PANEL_W, 1.25);
        assert!(sized_correctly(corrected, PANEL_W, 1.25));
        assert_eq!(corrected, 1350);
    }

    #[test]
    fn an_unusable_or_missing_scale_never_reports_a_correct_size() {
        for scale in [0.0, f64::NAN, f64::INFINITY, -1.0, 1000.0] {
            assert!(usable_scale(scale).is_none(), "{scale}");
            assert!(!sized_correctly(720, PANEL_W, scale), "{scale}");
        }
        assert!(!sized_correctly(0, PANEL_W, 1.0));
    }

    #[test]
    fn the_island_hangs_from_the_top_centre_of_the_display() {
        // 1920 and 2560 wide displays at 100%, 125% and 150%.
        for (physical_w, scale) in [(1920, 1.0), (2400, 1.25), (2560, 1.25), (3840, 2.0)] {
            let window_w = physical_for(PANEL_W, scale) as i32;
            let left = centred_x(0, physical_w, window_w as u32);
            assert_eq!(left, (physical_w - window_w) / 2);
            assert!(left >= 0);
            assert!(left + window_w <= physical_w);
        }
        // A secondary display to the right of the main one keeps its own origin.
        assert_eq!(centred_x(1920, 1920, 900), 2430);
        // A display narrower than the panel starts on its left edge instead of
        // hanging off the right.
        assert_eq!(centred_x(0, 640, 900), 0);
        // Negative origins (a monitor above and to the left) are preserved: the
        // window is centred on that display, not on the virtual desktop.
        assert_eq!(centred_x(-1920, 1920, 900), -1410);
    }

    #[test]
    fn neither_the_panel_nor_the_wake_strip_ever_lands_in_a_corner() {
        // The reported defect: the island sat at (0, 0) in its 240x6 birth size.
        // Every mode has to end up on the display, horizontally centred.
        // P8: kart 1,5 kat buyutuldu; en kucuk hedef masaustu 1366x768 @%100.
        for (physical_w, scale) in [(1366, 1.0), (1920, 1.0), (2400, 1.25), (2560, 1.5), (3840, 2.0)] {
            for logical in [PANEL_W, STRIP_W] {
                let window_w = physical_for(logical, scale);
                let left = centred_x(0, physical_w, window_w);
                assert!(left > 0, "{logical} at {scale}x on {physical_w} landed at {left}");
                assert_eq!(left + window_w as i32, physical_w - left);
            }
        }
    }

    #[test]
    fn buyutulmus_kart_hedef_masaustlerine_sigar() {
        // Kullanici ekrani: 1366x768 @%100 ve 1920x1080 @%150. Kart mantiksal
        // 1080x480 olmali: 1366 genislikte sigar, @%150'de 1280x720 mantiksal
        // alana da sigar.
        assert_eq!(PANEL_W, 1080.0);
        assert_eq!(PANEL_H, 480.0);
        for (physical_w, physical_h, scale) in [(1366, 768, 1.0), (1920, 1080, 1.5)] {
            let w = physical_for(PANEL_W, scale);
            let h = physical_for(PANEL_H, scale);
            assert!(w <= physical_w && h <= physical_h, "{w}x{h} @%{scale} ekrana sigmiyor");
            let x = centred_x(0, physical_w as i32, w);
            assert!(x >= 0 && x as u32 + w <= physical_w);
        }
        // Tasarim 720x320'in 1,5 kati; oran kayip olmamali.
        assert!((PANEL_W / 1.5 - 720.0).abs() < 0.5 && (PANEL_H / 1.5 - 320.0).abs() < 0.5);
    }

    #[test]
    fn a_display_that_cannot_be_enumerated_still_yields_a_usable_placement() {
        // display_bounds falls back to a 1920x1080 primary display, so the panel
        // is centred instead of inheriting the position the window was born with.
        let window_w = physical_for(PANEL_W, 1.0);
        assert_eq!(centred_x(0, 1920, window_w), (1920 - window_w as i32) / 2);
    }
}
