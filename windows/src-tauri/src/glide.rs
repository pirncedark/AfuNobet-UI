use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, PhysicalPosition, PhysicalSize};

pub fn yol(bas: (i32, i32), son: (i32, i32), t: f64) -> (i32, i32) {
    let t = if t.is_finite() { t.clamp(0.0, 1.0) } else { 0.0 };
    let x = t * t * (3.0 - 2.0 * t);
    let y = t * t;
    ((bas.0 as f64 + (son.0 as f64 - bas.0 as f64) * x).round() as i32,
     (bas.1 as f64 + (son.1 as f64 - bas.1 as f64) * y).round() as i32)
}
pub fn adimlar(sure_ms: u32, fps: u32) -> u32 { ((sure_ms as u64 * fps as u64 / 1000).max(1).min(10000)) as u32 }

pub fn drag_distance(from: (f64, f64), to: (f64, f64), scale: f64) -> bool {
    let scale = if scale.is_finite() && scale > 0.0 { scale } else { 1.0 };
    (to.0 - from.0).hypot(to.1 - from.1) >= 5.0 * scale
}
/// Physical client geometry, matching pet.ts's bottom-aligned square frame.
/// Re-read the size after moving: Windows can resize it when monitor DPI changes.
pub fn drag_origin(cursor: (f64, f64), size: (u32, u32)) -> (i32, i32) {
    let hand_x = size.0 as f64 * (220.0 / 384.0);
    let hand_y = size.1 as f64 - size.0 as f64;
    ((cursor.0 - hand_x).round() as i32, (cursor.1 - hand_y).round() as i32)
}

pub fn return_point(from: (i32, i32), to: (i32, i32), t: f64) -> (i32, i32) {
    let t = if t.is_finite() { t.clamp(0.0, 1.0) } else { 0.0 };
    let eased = 1.0 - (1.0 - t).powi(3);
    ((from.0 as f64 + (to.0 as f64 - from.0 as f64) * eased).round() as i32,
     (from.1 as f64 + (to.1 as f64 - from.1 as f64) * eased).round() as i32)
}

pub struct PetRuntime {
    mutation: Mutex<()>,
    pub busy: AtomicBool,
    pub tray: AtomicBool,
    pub active: AtomicBool,
    /// P10: görev/ajan mesajı balonu açık mı? Pencere yalnız bu durumda büyür.
    pub balon: AtomicBool,
    pub onay_bekliyor: AtomicBool,
    pub generation: AtomicU64,
    pub dragging: AtomicBool,
    signal: Mutex<()>,
    wake: Condvar,
}
impl PetRuntime {
    pub fn new() -> Self { Self { mutation: Mutex::new(()), busy: AtomicBool::new(false), tray: AtomicBool::new(false), active: AtomicBool::new(false), balon: AtomicBool::new(false), onay_bekliyor: AtomicBool::new(false), generation: AtomicU64::new(0), dragging: AtomicBool::new(false), signal: Mutex::new(()), wake: Condvar::new() } }
    pub fn begin_drag(&self) -> Option<u64> {
        let _guard = self.mutation.lock().unwrap();
        if !self.active.load(Ordering::Acquire) || self.busy.load(Ordering::Acquire) || self.dragging.load(Ordering::Acquire) { return None; }
        self.dragging.store(true, Ordering::Release);
        Some(self.generation.fetch_add(1, Ordering::AcqRel) + 1)
    }
    pub fn begin(&self) -> u64 {
        let _guard = self.mutation.lock().unwrap();
        let generation = self.generation.fetch_add(1, Ordering::AcqRel) + 1;
        self.dragging.store(false, Ordering::Release);
        self.set_active(false); self.busy.store(true, Ordering::Release); self.tray.store(false, Ordering::Release);
        // P10: yeni geçişte balon kapalı başlar; pencere 256 px'e döner.
        self.balon.store(false, Ordering::Release);
        generation
    }
    pub fn with_current(&self, generation: u64, action: impl FnOnce()) -> bool {
        let _guard = self.mutation.lock().unwrap();
        if self.generation.load(Ordering::Acquire) != generation { return false; }
        action(); true
    }
    pub fn finish(&self, generation: u64, active: bool) -> bool {
        self.with_current(generation, || { self.set_active(active); self.busy.store(false, Ordering::Release); })
    }
    pub fn is_pet_or_tray(&self) -> bool { self.active.load(Ordering::Acquire) || self.busy.load(Ordering::Acquire) || self.tray.load(Ordering::Acquire) }
    pub fn set_active(&self, active: bool) {
        let _guard = self.signal.lock().unwrap();
        self.active.store(active, Ordering::Release);
        self.wake.notify_all();
    }
    pub fn cancel(&self) { let _guard = self.mutation.lock().unwrap(); self.generation.fetch_add(1, Ordering::AcqRel); self.dragging.store(false, Ordering::Release); self.busy.store(false, Ordering::Release); self.balon.store(false, Ordering::Release); self.set_active(false); }
    /// Pencerenin ölçüsü değişti: gözlemci döngüsü bir sonraki turda hemen bakar.
    pub fn wake_up(&self) { let _guard = self.signal.lock().unwrap(); self.wake.notify_all(); }
}

/// P10 — mini pet penceresi görev/ajan mesajı balonu açıkken YUKARI büyür.
/// Sayıların ön yüzdeki karşılığı `windows/src/core/layout.ts`
/// (PET_PENCERE, PET_BALON_PAY, PET_BALON_YUKSEKLIK, PET_BALON_BOSLUK) —
/// iki taraf aynı sayıları kullanır, biri değişirse diğeri de değişir.
pub const PET_PENCERE: f64 = 256.0;
pub fn pet_gizli_mi(on: bool, tam_ekran: bool, onay: bool) -> bool {
    on && tam_ekran && !onay
}
pub const PET_BALON_PAY: f64 = 24.0;
pub const PET_BALON_YUKSEKLIK: f64 = 120.0;
pub const PET_BALON_BOSLUK: f64 = 14.0;
/// Balon kuyruğunun alt kenarı, pencerenin alt kenarından bu kadar yukarıda.
pub const PET_BALON_TABAN: f64 = PET_PENCERE + PET_BALON_BOSLUK;

/// Balon görünürken pet penceresinin yüksekliği (yalnız YUKARI büyür).
pub fn pet_pencere_yuksekligi(balon: bool) -> f64 {
    if balon { PET_BALON_TABAN + PET_BALON_YUKSEKLIK + PET_BALON_PAY } else { PET_PENCERE }
}

/// Balonlu pencerenin ölçüsü ve üst kenarı: (fiziksel yükseklik, üst kenar).
///
/// Alt kenar (`taban`, görev çubuğunun üstü) SABİT kalır, karakter yerinden
/// oynamaz. Ekranın üstü yetmezse pencere dışarı taşmaz: yükseklik tepeden
/// kırpılır (`kesme`). Ön yüz aynı kırpılmış yüksekliği görüp balon kutusunu
/// kısaltır (core/layout.ts `petBalonKutusu`), böylece kuyruk ucu görünür.
pub fn balon_olcu(balon: bool, pet: i32, taban: i32, ekran_ust: i32, olcek: f64) -> (i32, i32) {
    let istenen = crate::dpi::physical_for(pet_pencere_yuksekligi(balon), olcek) as i32;
    let en_fazla = (taban - ekran_ust).max(pet).max(1);
    let yukseklik = istenen.min(en_fazla);
    (yukseklik, taban - yukseklik)
}

/// Track the native cursor rather than coordinates relative to a moving webview.
/// The captured resting origin is also the return destination across monitors.
pub fn drag(app: AppHandle, runtime: Arc<PetRuntime>) -> Result<bool, String> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
    let cursor = || -> Result<(f64, f64), String> {
        let mut point = POINT::default();
        unsafe { GetCursorPos(&mut point) }.map_err(|_| "Afu taşınamadı. Yeniden dene.".to_string())?;
        Ok((point.x as f64, point.y as f64))
    };
    let Some(win) = crate::island::window(&app) else { return Ok(false) };
    let origin = win.outer_position().map_err(|_| "Afu taşınamadı. Yeniden dene.".to_string())?;
    let original_size = win.inner_size().map_err(|_| "Afu taşınamadı. Yeniden dene.".to_string())?;
    let scale = win.scale_factor().unwrap_or(1.0);
    let first = cursor()?;
    let Some(generation) = runtime.begin_drag() else { return Ok(false) };
    let home = (origin.x, origin.y);
    let result = (|| {
        let mut held = false;
        let mut last_position = None;
        loop {
            if runtime.generation.load(Ordering::Acquire) != generation { return Ok(true); }
            if unsafe { GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000 } == 0 { break; }
            let point = cursor()?;
            if !held && drag_distance(first, point, scale) {
                held = true;
                let _ = app.emit("pet-drag", "held");
            }
            if held {
                let mut error = false;
                if !runtime.with_current(generation, || {
                    // Settle a synchronous DPI resize in the same cursor sample.
                    // No webview-relative feedback, easing or screen-edge clamp.
                    for _ in 0..3 {
                        let Ok(size) = win.inner_size() else { error = true; break; };
                        let target = drag_origin(point, (size.width, size.height));
                        if last_position == Some(target) { break; }
                        if win.set_position(PhysicalPosition::new(target.0, target.1)).is_err() {
                            error = true; break;
                        }
                        last_position = Some(target);
                    }
                }) { return Ok(true); }
                if error { return Err("Afu taşınamadı. Yeniden dene.".to_string()); }
            }
            std::thread::sleep(Duration::from_millis(16));
        }
        if !held { return Ok(false); }
        let _ = app.emit("pet-drag", "returning");
        let pos = win.outer_position().map_err(|_| "Afu taşınamadı. Yeniden dene.".to_string())?;
        let started = Instant::now();
        let steps = adimlar(500, 60);
        for i in 0..=steps {
            let point = return_point((pos.x, pos.y), home, i as f64 / steps as f64);
            let mut error = None;
            if !runtime.with_current(generation, || { error = win.set_position(PhysicalPosition::new(point.0, point.1)).err(); }) { return Ok(true); }
            if error.is_some() { return Err("Afu taşınamadı. Yeniden dene.".to_string()); }
            if i < steps { std::thread::sleep(Duration::from_millis(500 * (i + 1) as u64 / steps as u64).saturating_sub(started.elapsed())); }
        }
        runtime.with_current(generation, || {
            let _ = win.set_size(original_size);
            let _ = win.set_position(origin);
            // P10: sürükleme sırasında balon açıldıysa ölçüyü tazele.
            if runtime.balon.load(Ordering::Acquire) { uygula(&win, None, true); }
            let _ = app.emit("pet-drag", "landed");
        });
        Ok(true)
    })();
    runtime.with_current(generation, || {
        if result.is_err() {
            let _ = win.set_size(original_size);
            let _ = win.set_position(origin);
            let _ = app.emit("pet-drag", "landed");
        }
        runtime.dragging.store(false, Ordering::Release);
    });
    result
}
fn screen(win: &tauri::WebviewWindow) -> (i32, i32, i32, i32) {
    win.current_monitor().ok().flatten().map(|m| {
        let p = m.position(); let s = m.size(); (p.x, p.y, p.x + s.width as i32, p.y + s.height as i32)
    }).unwrap_or((0, 0, 1920, 1080))
}
/// R2: petin bulunduğu ekranın çalışma alanı (görev çubukları hariç).
fn calisma_alani(win: &tauri::WebviewWindow) -> Option<(i32, i32, i32, i32)> {
    win.current_monitor().ok().flatten().map(|m| {
        let w = m.work_area(); (w.position.x, w.position.y, w.position.x + w.size.width as i32, w.position.y + w.size.height as i32)
    })
}
/// R2: yer her çağrıda petin şu anki ekranından hesaplanır; izleyici 2 sn'de
/// bir çağırdığı için ekran/çözünürlük/ölçek değişince yer kendiliğinden düzelir.
fn destination(win: &tauri::WebviewWindow, size: i32) -> (i32, i32) {
    let bounds = screen(win);
    let calisma = calisma_alani(win).unwrap_or(bounds);
    let bar = crate::taskbar::cubuk();
    crate::yaslanma::pet_yeri(bounds, calisma, bar.as_ref(), crate::taskbar::baslat_rect(), size, size)
}
/// Pet penceresinin hedef ölçüsü ve konumu: (x, y, fiziksel yükseklik).
/// Balon açıksa genişlik değişmez, yalnız YUKARI büyür ve alt kenar
/// (görev çubuğunun üstü) sabit kalır; ekran yetmezse üstten kırpılır.
fn hedef(win: &tauri::WebviewWindow, size: i32, balon: bool) -> (i32, i32, i32) {
    let scale = win.scale_factor().unwrap_or(1.0);
    let (x, y) = destination(win, size);
    let (yukseklik, ust) = balon_olcu(balon, size, y + size, screen(win).1, scale);
    (x, ust, yukseklik)
}

/// Balon (ya da balonsuz pet) ölçüsünü pencereye uygular. Alt kenar görev
/// çubuğunun üstünde sabit kalır; balon açıksa tepedeki şeffaf pay isabet
/// kutusuna girmez, böylece boş kısım tıklamayı geçirir.
fn uygula(win: &tauri::WebviewWindow, gate: Option<&crate::island::PollGate>, balon: bool) {
    let size = crate::dpi::physical_for(PET_PENCERE, win.scale_factor().unwrap_or(1.0)) as i32;
    let (x, y, yukseklik) = hedef(win, size, balon);
    let _ = win.set_size(PhysicalSize::new(size as u32, yukseklik as u32));
    let _ = win.set_position(PhysicalPosition::new(x, y));
    if let Some(gate) = gate {
        let pay = if balon { PET_BALON_PAY } else { 0.0 };
        gate.set_rect(crate::island::IslandRect { x: 0.0, y: pay, w: PET_PENCERE, h: pet_pencere_yuksekligi(balon) - pay });
    }
}
fn move_segment(win: &tauri::WebviewWindow, runtime: &PetRuntime, generation: u64, from: (i32, i32), to: (i32, i32), ms: u32) -> bool {
    let started = Instant::now();
    let steps = adimlar(ms, 60);
    for i in 0..=steps {
        let point = yol(from, to, i as f64 / steps as f64);
        if !runtime.with_current(generation, || { let _ = win.set_position(PhysicalPosition::new(point.0, point.1)); }) { return false; }
        if i < steps { std::thread::sleep((Duration::from_millis(ms as u64 * (i + 1) as u64 / steps as u64)).saturating_sub(started.elapsed())); }
    }
    true
}
pub fn transition(app: AppHandle, runtime: Arc<PetRuntime>, gate: Arc<crate::island::PollGate>, on: bool) {
    let generation = runtime.begin();
    std::thread::spawn(move || {
        let Some(win) = crate::island::window(&app) else { return };
        let scale = win.scale_factor().unwrap_or(1.0);
        let size = crate::dpi::physical_for(PET_PENCERE, scale) as i32;
        let Ok(origin) = win.outer_position() else { return };
        let Ok(old_size) = win.inner_size() else { return };
        std::thread::sleep(Duration::from_millis(if on { 180 } else { 320 }));
        if runtime.generation.load(Ordering::Acquire) != generation { return; }
        let start = (origin.x + (old_size.width as i32 - size) / 2, origin.y);
        // P11: Bekleyen onay/soru varsa gizleme yapma
        let hidden = pet_gizli_mi(on, crate::taskbar::tam_ekran_acik(), runtime.onay_bekliyor.load(Ordering::Acquire));
        if !runtime.with_current(generation, || {
            let _ = win.set_size(PhysicalSize::new(size as u32, size as u32));
            let _ = win.set_position(PhysicalPosition::new(start.0, start.1));
            if hidden { let _ = win.hide(); } else { let _ = win.show(); }
            gate.collapsed.store(false, Ordering::Relaxed);
            gate.set_rect(crate::island::IslandRect { x: 0.0, y: 0.0, w: PET_PENCERE, h: PET_PENCERE });
            gate.set_active(!hidden);
            let _ = app.emit("pet-visible", !hidden);
        }) { return; }
        let bounds = screen(&win);
        let end = if on { destination(&win, size) } else { ((bounds.0 + bounds.2 - size) / 2, bounds.1) };
        let approach = if on { (end.0, end.1 - crate::dpi::physical_for(6.0, scale) as i32) } else { end };
        if !move_segment(&win, &runtime, generation, start, approach, 250) { return; }
        if on {
            std::thread::sleep(Duration::from_millis(200));
            if !move_segment(&win, &runtime, generation, approach, end, 120) { return; }
            runtime.with_current(generation, || {
                runtime.set_active(true); runtime.busy.store(false, Ordering::Release);
                // P10: geçiş sırasında açılan balonun ölçüsü geçiş bitince uygulanır.
                if runtime.balon.load(Ordering::Acquire) { uygula(&win, Some(&gate), true); }
                let _ = app.emit("pet", true);
            });
        } else {
            std::thread::sleep(Duration::from_millis(180));
            runtime.with_current(generation, || { crate::dpi::place(&app, "primary", false); runtime.busy.store(false, Ordering::Release); let _ = app.emit("pet", false); });
        }
    });
}
pub fn watch_fullscreen(app: AppHandle, runtime: Arc<PetRuntime>, gate: Arc<crate::island::PollGate>) {
    std::thread::spawn(move || {
        let mut hidden = false;
        let mut last_target = None;
        let mut last_generation = 0;
        loop {
            let mut guard = runtime.signal.lock().unwrap();
            drop(guard);
            let Some(win) = crate::island::window(&app) else { break };
            let generation = runtime.generation.load(Ordering::Acquire);
            let active = runtime.active.load(Ordering::Acquire);
            if active && generation != last_generation { hidden = false; last_target = None; last_generation = generation; }
            let onay = runtime.onay_bekliyor.load(Ordering::Acquire);
            let fullscreen = pet_gizli_mi(true, crate::taskbar::tam_ekran_acik(), onay);
            if onay {
                let _ = win.show();
                let _ = win.set_always_on_top(true);
            }
            if fullscreen != hidden {
                hidden = fullscreen;
                if active {
                    runtime.with_current(generation, || {
                        if hidden { let _ = win.hide(); } else { let _ = win.show(); }
                        gate.set_active(!hidden);
                        let _ = app.emit("pet-visible", !hidden);
                    });
                } else {
                    if hidden { let _ = win.hide(); } else { let _ = win.show(); }
                    gate.set_active(!hidden);
                }
            }
            if !hidden && active && !runtime.dragging.load(Ordering::Acquire) {
                let size = crate::dpi::physical_for(PET_PENCERE, win.scale_factor().unwrap_or(1.0)) as i32;
                // P10: balon açıksa hedef yukarı büyümüş konumdur; izleyici onu
                // küçültmez, çünkü hedef balon durumundan hesaplanır.
                let (tx, ty, yukseklik) = hedef(&win, size, runtime.balon.load(Ordering::Acquire));
                let target = Some((tx, ty, yukseklik));
                if target != last_target {
                    if runtime.with_current(generation, || {
                        if runtime.dragging.load(Ordering::Acquire) { return; }
                        let _ = win.set_size(PhysicalSize::new(size as u32, yukseklik as u32));
                        let _ = win.set_position(PhysicalPosition::new(tx, ty));
                    }) { last_target = target; }
                }
            }
            let guard = runtime.signal.lock().unwrap();
            let _ = runtime.wake.wait_timeout(guard, Duration::from_secs(2));
        }
    });
}

/// P10: balon açıldı/kapandı. Ölçü değişimi anında uygulanır (izleyiciyi
/// beklemeden); alt kenar görev çubuğunun üstünde sabit kalır, karakter
/// yerinden oynamaz. Balon açıkken pencerenin tepesindeki şeffaf pay isabet
/// kutusuna girmesin diye `y` pay kadar kaydırılır.
pub fn balon(app: &AppHandle, runtime: &PetRuntime, gate: &crate::island::PollGate, on: bool) {
    // Pet modunda ya da pete geçiş sürerken anlamlıdır (kart açıkken değil).
    if !runtime.active.load(Ordering::Acquire) && !runtime.busy.load(Ordering::Acquire) { return; }
    if runtime.balon.swap(on, Ordering::AcqRel) == on { return; }
    runtime.wake_up();
    // Geçiş veya sürükleme sürerken ölçü onların sonunda uygulanır; ikisi de
    // `balon` durumunu okuyup kendi hedefini yeniden hesaplar.
    if runtime.busy.load(Ordering::Acquire) || runtime.dragging.load(Ordering::Acquire) { return; }
    let Some(win) = crate::island::window(app) else { return };
    uygula(&win, Some(gate), on);
}

#[cfg(test)]
mod tests {
    #[test]
    fn fullscreen_hides_pet_only_without_pending_approval() {
        assert!(!super::pet_gizli_mi(true, true, true));
        assert!(super::pet_gizli_mi(true, true, false));
        assert!(!super::pet_gizli_mi(false, true, false));
        assert!(!super::pet_gizli_mi(true, false, false));
    }
    #[test]
    fn pending_approval_starts_false_and_survives_pet_transitions() {
        let runtime = super::PetRuntime::new();
        assert!(!runtime.onay_bekliyor.load(super::Ordering::Acquire));
        runtime.onay_bekliyor.store(true, super::Ordering::Release);
        runtime.begin();
        assert!(runtime.onay_bekliyor.load(super::Ordering::Acquire));
        runtime.cancel();
        assert!(runtime.onay_bekliyor.load(super::Ordering::Acquire));
    }
    use super::*;
    #[test]
    fn drag_threshold_is_logical_at_all_dpis() {
        for scale in [1.0, 1.25, 1.5] {
            assert!(!drag_distance((0.0, 0.0), (4.9 * scale, 0.0), scale));
            assert!(drag_distance((0.0, 0.0), (5.0 * scale, 0.0), scale));
            assert!(drag_distance((0.0, 0.0), (3.0 * scale, 4.0 * scale), scale));
        }
    }
    #[test]
    fn hand_anchor_tracks_cursor_at_all_dpis_and_negative_coordinates() {
        for (size, offset) in [(256, 147), (320, 183), (384, 220)] {
            for (cursor, expected) in [((900.0, 400.0), (900 - offset, 400)),
                                       ((-1800.0, -500.0), (-1800 - offset, -500))] {
                assert_eq!(drag_origin(cursor, (size, size)), expected);
                assert_eq!(drag_origin(cursor, (size, size + 200)), (expected.0, expected.1 - 200));
                let moved = drag_origin((cursor.0 + 37.0, cursor.1 - 29.0), (size, size));
                assert_eq!(moved, (expected.0 + 37, expected.1 - 29));
            }
        }
    }
    #[test]
    fn hand_anchor_recomputes_after_a_monitor_dpi_resize() {
        assert_eq!(drag_origin((-100.0, 80.0), (256, 256)), (-247, 80));
        assert_eq!(drag_origin((-100.0, 80.0), (384, 384)), (-320, 80));
        assert_eq!(drag_origin((-100.0, 80.0), (320, 518)), (-283, -118));
    }
    /// P10: balon açıkken pencere yalnız YUKARI büyür; alt kenar (görev çubuğunun
    /// üstü) her DPI'da sabit kalır, karakter yerinden oynamaz.
    #[test]
    fn pet_window_grows_only_upwards_at_every_dpi() {
        assert_eq!(pet_pencere_yuksekligi(false), 256.0);
        assert_eq!(pet_pencere_yuksekligi(true), 414.0);
        for (scale, size) in [(1.0, 256), (1.25, 320), (1.5, 384)] {
            let taban = 1032i32; // 1080 piksellik ekranda 48 px'lik görev çubuğu
            let (balon, ust) = balon_olcu(true, size, taban, 0, scale);
            assert!(balon > size, "balon peti buyutmeli (scale {})", scale);
            assert_eq!(ust + balon, taban, "alt kenar sabit kalmali (scale {})", scale);
            assert!(ust < taban - size, "buyume yukarı dogru olmali (scale {})", scale);
            // Balon kapanınca eski 256 px boyutuna dönülür.
            let (kapali, ust_kapali) = balon_olcu(false, size, taban, 0, scale);
            assert_eq!((kapali, ust_kapali), (size, taban - size));
        }
    }
    /// P10 kesme: ekranın üstü yetmezse pencere UZAMAZ, tepeden kırpılır; alt
    /// kenar yine de görev çubuğunun üstündedir ve pencere ekranın dışına taşmaz.
    #[test]
    fn balloon_window_is_clipped_at_the_screen_top_never_below_the_taskbar() {
        for scale in [1.0, 1.25, 1.5] {
            let size = crate::dpi::physical_for(PET_PENCERE, scale) as i32;
            for (ekran_ust, taban_ofset) in [(0, 0), (0, 50), (0, 420), (0, 1032), (0, 2000)] {
                // `destination` hiçbir zaman petten kısa bir taban üretmez.
                let taban = size + taban_ofset;
                let istenen = crate::dpi::physical_for(pet_pencere_yuksekligi(true), scale) as i32;
                let (yukseklik, ust) = balon_olcu(true, size, taban, ekran_ust, scale);
                assert_eq!(ust + yukseklik, taban, "alt kenar (gorev cubugu ustunde) sabit");
                assert!(ust >= ekran_ust, "pencere ekranin ustunden tasmaz");
                assert!(yukseklik >= size, "pencere petten kucuk olamaz");
                assert!(yukseklik <= istenen);
                if taban - ekran_ust < istenen {
                    assert_eq!(yukseklik, (taban - ekran_ust).max(size), "kisa ekranda tam kırpılır");
                } else {
                    assert_eq!(yukseklik, istenen);
                }
            }
        }
    }
    #[test]
    fn pet_transition_resets_the_balloon() {
        let runtime = PetRuntime::new();
        runtime.balon.store(true, Ordering::Release);
        runtime.begin();
        assert!(!runtime.balon.load(Ordering::Acquire));
        runtime.balon.store(true, Ordering::Release);
        runtime.cancel();
        assert!(!runtime.balon.load(Ordering::Acquire));
    }
    #[test]
    fn return_path_is_ease_out_and_has_exact_endpoints() {
        assert_eq!(return_point((100, 100), (0, 0), 0.0), (100, 100));
        assert_eq!(return_point((100, 100), (0, 0), 1.0), (0, 0));
        assert_eq!(return_point((100, 100), (0, 0), 0.5), (13, 13));
    }
    #[test]
    fn drag_keeps_pet_active_but_cancellation_invalidates_its_motion() {
        let runtime = PetRuntime::new(); runtime.set_active(true);
        let generation = runtime.begin_drag().unwrap();
        assert!(runtime.active.load(Ordering::Acquire));
        assert!(runtime.dragging.load(Ordering::Acquire));
        assert!(runtime.begin_drag().is_none());
        runtime.cancel();
        assert!(!runtime.with_current(generation, || panic!("stale drag")));
        assert!(!runtime.dragging.load(Ordering::Acquire));
    }
    #[test]
    fn cancelled_generation_cannot_move_or_reactivate() {
        let runtime = PetRuntime::new(); let old = runtime.begin();
        runtime.cancel();
        let mut moved = false;
        assert!(!runtime.with_current(old, || moved = true));
        assert!(!moved); assert!(!runtime.finish(old, true));
        assert!(!runtime.active.load(Ordering::Acquire));
    }
    #[test]
    fn exact_endpoints_and_monotone_descent() {
        assert_eq!(yol((800, 0), (40, 960), 0.0), (800, 0));
        assert_eq!(yol((800, 0), (40, 960), 1.0), (40, 960));
        let mut previous = -1;
        for i in 0..=30 { let (_, y) = yol((800, 0), (40, 960), i as f64 / 30.0); assert!(y >= previous); previous = y; }
    }
    #[test]
    fn timing_steps_and_bad_inputs_are_bounded() {
        assert_eq!(adimlar(250, 60), 15);
        assert_eq!(adimlar(120, 60), 7);
        assert_eq!(yol((0, 0), (100, 100), f64::NAN), (0, 0));
    }
}
