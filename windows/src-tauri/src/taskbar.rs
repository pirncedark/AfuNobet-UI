use windows::core::w;
use windows::Win32::UI::Shell::{SHAppBarMessage, SHQueryUserNotificationState, APPBARDATA, ABM_GETTASKBARPOS, ABM_GETSTATE, ABS_AUTOHIDE, QUNS_RUNNING_D3D_FULL_SCREEN, QUNS_PRESENTATION_MODE};

#[derive(Clone, Copy, Debug)]
pub enum Kenar { Alt, Ust, Sol, Sag }
#[derive(Clone, Copy, Debug)]
pub struct Cubuk { pub rect: (i32, i32, i32, i32), pub kenar: Kenar, pub oto_gizli: bool }

pub fn cubuk() -> Option<Cubuk> {
    let mut data = APPBARDATA { cbSize: std::mem::size_of::<APPBARDATA>() as u32, ..Default::default() };
    unsafe {
        if SHAppBarMessage(ABM_GETTASKBARPOS, &mut data) == 0 { return None; }
        let rect = (data.rc.left, data.rc.top, data.rc.right, data.rc.bottom);
        let kenar = match data.uEdge { 0 => Kenar::Sol, 1 => Kenar::Ust, 2 => Kenar::Sag, _ => Kenar::Alt };
        let oto_gizli = SHAppBarMessage(ABM_GETSTATE, &mut data) & ABS_AUTOHIDE as usize != 0;
        Some(Cubuk { rect, kenar, oto_gizli })
    }
}

pub fn baslat_rect() -> Option<(i32, i32, i32, i32)> {
    // COM yalnız bu kısa yardımcı iş parçacığında başlatılır ve bırakılır.
    std::thread::spawn(|| unsafe {
        use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED};
        use windows::Win32::System::Variant::VARIANT;
        use windows::Win32::UI::Accessibility::{CUIAutomation, IUIAutomation, TreeScope_Descendants, UIA_AutomationIdPropertyId};
        use windows::Win32::UI::WindowsAndMessaging::FindWindowW;
        if CoInitializeEx(None, COINIT_APARTMENTTHREADED).is_err() { return None; }
        let result = (|| {
            let hwnd = FindWindowW(w!("Shell_TrayWnd"), None).ok()?;
            let automation: IUIAutomation = CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok()?;
            let root = automation.ElementFromHandle(hwnd).ok()?;
            let condition = automation.CreatePropertyCondition(UIA_AutomationIdPropertyId, &VARIANT::from("StartButton")).ok()?;
            let start = root.FindFirst(TreeScope_Descendants, &condition).ok()?;
            let r = start.CurrentBoundingRectangle().ok()?;
            Some((r.left, r.top, r.right, r.bottom))
        })();
        CoUninitialize();
        result
    }).join().ok().flatten()
}

pub fn tam_ekran_kapli(w_rect: &(i32, i32, i32, i32), m_rect: &(i32, i32, i32, i32)) -> bool {
    w_rect.0 <= m_rect.0 && w_rect.1 <= m_rect.1 && w_rect.2 >= m_rect.2 && w_rect.3 >= m_rect.3
}

pub fn tam_ekran_acik() -> bool {
    unsafe {
        if SHQueryUserNotificationState().is_ok_and(|state| [QUNS_RUNNING_D3D_FULL_SCREEN, QUNS_PRESENTATION_MODE].contains(&state)) {
            return true;
        }
        use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowRect, GetDesktopWindow};
        use windows::Win32::Graphics::Gdi::{MonitorFromWindow, GetMonitorInfoW, MONITORINFO, MONITOR_DEFAULTTOPRIMARY};
        let hwnd = GetForegroundWindow();
        if hwnd.is_invalid() || hwnd == GetDesktopWindow() { return false; }
        let mut rect = std::mem::zeroed();
        if GetWindowRect(hwnd, &mut rect).is_err() { return false; }
        let hmon = MonitorFromWindow(hwnd, MONITOR_DEFAULTTOPRIMARY);
        let mut mi = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
        if GetMonitorInfoW(hmon, &mut mi).into() {
            return tam_ekran_kapli(&(rect.left, rect.top, rect.right, rect.bottom), &(mi.rcMonitor.left, mi.rcMonitor.top, mi.rcMonitor.right, mi.rcMonitor.bottom));
        }
        false
    }
}

pub fn pet_konumu(cubuk: &Cubuk, baslat: Option<(i32, i32, i32, i32)>, w: i32, h: i32, ekran: (i32, i32, i32, i32)) -> (i32, i32) {
    let (left, top, right, bottom) = ekran;
    let (bl, bt, br, bb) = cubuk.rect;
    let (x, y) = if cubuk.oto_gizli { (baslat.map_or(left + 24, |r| r.0 - w), bottom - h) }
        else { match cubuk.kenar {
            Kenar::Alt => (baslat.map_or(bl + 24, |r| r.0 - w), bt - h),
            Kenar::Ust => (baslat.map_or(bl + 24, |r| r.0 - w), bb),
            Kenar::Sol => (br, baslat.map_or(bt + 24, |r| r.3)),
            Kenar::Sag => (bl - w, baslat.map_or(bt + 24, |r| r.3)),
        }};
    (x.clamp(left, (right - w).max(left)), y.clamp(top, (bottom - h).max(top)))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pet_size_and_position_respect_work_area_at_each_dpi() {
        for (scale, size) in [(1.0, 256), (1.25, 320), (1.5, 384)] {
            for taskbar_height in [40, 48, 72] {
                let work = (-1920, 0, 0, 1080 - taskbar_height);
                // Primary taskbar coordinates must not place a secondary pet below its work area.
                let bar = Cubuk { rect: (0, 1032, 1920, 1080), kenar: Kenar::Alt, oto_gizli: true };
                let (actual_size, (x, y)) = (crate::dpi::physical_for(256.0, scale) as i32, pet_konumu(&bar, None, size, size, work));
                assert_eq!(actual_size, size);
                assert!(x >= work.0 && x + size <= work.2);
                assert_eq!(y + size, work.3);
            }
        }
    }
    #[test]
    fn release_destination_uses_start_and_all_taskbar_edges_at_each_dpi() {
        for (scale, size) in [(1.0, 256), (1.25, 320), (1.5, 384)] {
            for (rect, edge, work, start, expected) in [
                ((0,1032,1920,1080), Kenar::Alt, (0,0,1920,1032), (780,1032,828,1080), (780-size,1032-size)),
                ((0,0,1920,48), Kenar::Ust, (0,48,1920,1080), (780,0,828,48), (780-size,48)),
                ((0,0,48,1080), Kenar::Sol, (48,0,1920,1080), (0,20,48,68), (48,68)),
                ((1872,0,1920,1080), Kenar::Sag, (0,0,1872,1080), (1872,20,1920,68), (1872-size,68)),
            ] {
                let bar = Cubuk { rect, kenar: edge, oto_gizli:false };
                assert_eq!((crate::dpi::physical_for(256.0, scale) as i32, pet_konumu(&bar, Some(start), size, size, work)), (size, expected));
            }
        }
    }
    const SCREEN: (i32, i32, i32, i32) = (0, 0, 1920, 1080);
    fn bottom() -> Cubuk { Cubuk { rect: (0, 1032, 1920, 1080), kenar: Kenar::Alt, oto_gizli: false } }
    #[test]
    fn beside_start_and_on_top_of_taskbar() {
        let (x, y) = pet_konumu(&bottom(), Some((780, 1032, 828, 1080)), 120, 110, SCREEN);
        assert_eq!(y + 110, 1032);
        assert_eq!(x + 120, 780);
    }
    #[test]
    fn absent_start_and_autohide_have_safe_defaults() {
        assert_eq!(pet_konumu(&bottom(), None, 120, 110, SCREEN).0, 24);
        let c = Cubuk { oto_gizli: true, ..bottom() };
        assert_eq!(pet_konumu(&c, None, 120, 110, SCREEN).1 + 110, 1080);
    }
    #[test]
    fn every_edge_and_negative_monitor_origin_stays_in_bounds() {
        for (rect, kenar) in [((1872, 0, 1920, 1080), Kenar::Sag), ((0, 0, 48, 1080), Kenar::Sol), ((0, 0, 1920, 48), Kenar::Ust)] {
            let (x, y) = pet_konumu(&Cubuk { rect, kenar, oto_gizli: false }, None, 256, 256, SCREEN);
            assert!(x >= 0 && y >= 0 && x + 256 <= 1920 && y + 256 <= 1080);
        }
        let c = Cubuk { rect: (-1920, 1032, 0, 1080), ..bottom() };
        assert_eq!(pet_konumu(&c, None, 256, 256, (-1920, 0, 0, 1080)), (-1896, 776));
    }
    #[test]
    fn full_screen_rect_comparison() {
        let monitor = (0, 0, 1920, 1080);
        assert!(tam_ekran_kapli(&(0, 0, 1920, 1080), &monitor));
        assert!(tam_ekran_kapli(&(-10, -10, 1930, 1090), &monitor));
        assert!(!tam_ekran_kapli(&(0, 0, 1920, 1079), &monitor));
        assert!(!tam_ekran_kapli(&(1, 0, 1920, 1080), &monitor));
    }
}
