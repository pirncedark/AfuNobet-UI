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

pub struct PetRuntime {
    mutation: Mutex<()>,
    pub busy: AtomicBool,
    pub tray: AtomicBool,
    pub active: AtomicBool,
    pub generation: AtomicU64,
    signal: Mutex<()>,
    wake: Condvar,
}
impl PetRuntime {
    pub fn new() -> Self { Self { mutation: Mutex::new(()), busy: AtomicBool::new(false), tray: AtomicBool::new(false), active: AtomicBool::new(false), generation: AtomicU64::new(0), signal: Mutex::new(()), wake: Condvar::new() } }
    pub fn begin(&self) -> u64 {
        let _guard = self.mutation.lock().unwrap();
        let generation = self.generation.fetch_add(1, Ordering::AcqRel) + 1;
        self.set_active(false); self.busy.store(true, Ordering::Release); self.tray.store(false, Ordering::Release);
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
    pub fn cancel(&self) { let _guard = self.mutation.lock().unwrap(); self.generation.fetch_add(1, Ordering::AcqRel); self.busy.store(false, Ordering::Release); self.set_active(false); }
}
fn screen(win: &tauri::WebviewWindow) -> (i32, i32, i32, i32) {
    win.current_monitor().ok().flatten().map(|m| {
        let p = m.position(); let s = m.size(); (p.x, p.y, p.x + s.width as i32, p.y + s.height as i32)
    }).unwrap_or((0, 0, 1920, 1080))
}
fn destination(win: &tauri::WebviewWindow, size: i32) -> (i32, i32) {
    let bounds = screen(win);
    let bar = crate::taskbar::cubuk().unwrap_or(crate::taskbar::Cubuk { rect: (bounds.0, bounds.3 - 48, bounds.2, bounds.3), kenar: crate::taskbar::Kenar::Alt, oto_gizli: true });
    crate::taskbar::pet_konumu(&bar, crate::taskbar::baslat_rect(), size, size, bounds)
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
        let size = crate::dpi::physical_for(128.0, scale) as i32;
        let Ok(origin) = win.outer_position() else { return };
        let Ok(old_size) = win.inner_size() else { return };
        std::thread::sleep(Duration::from_millis(if on { 180 } else { 320 }));
        if runtime.generation.load(Ordering::Acquire) != generation { return; }
        let start = (origin.x + (old_size.width as i32 - size) / 2, origin.y);
        let hidden = on && crate::taskbar::tam_ekran_acik();
        if !runtime.with_current(generation, || {
            let _ = win.set_size(PhysicalSize::new(size as u32, size as u32));
            let _ = win.set_position(PhysicalPosition::new(start.0, start.1));
            if hidden { let _ = win.hide(); } else { let _ = win.show(); }
            gate.collapsed.store(false, Ordering::Relaxed);
            gate.set_rect(crate::island::IslandRect { x: 0.0, y: 0.0, w: 128.0, h: 128.0 });
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
            runtime.with_current(generation, || { runtime.set_active(true); runtime.busy.store(false, Ordering::Release); let _ = app.emit("pet", true); });
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
            let fullscreen = crate::taskbar::tam_ekran_acik();
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
            if !hidden && active {
                let size = crate::dpi::physical_for(128.0, win.scale_factor().unwrap_or(1.0)) as i32;
                let target = destination(&win, size);
                if Some(target) != last_target {
                    if runtime.with_current(generation, || {
                        let _ = win.set_size(PhysicalSize::new(size as u32, size as u32));
                        let _ = win.set_position(PhysicalPosition::new(target.0, target.1));
                    }) { last_target = Some(target); }
                }
            }
            let guard = runtime.signal.lock().unwrap();
            let _ = runtime.wake.wait_timeout(guard, Duration::from_secs(2));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
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
