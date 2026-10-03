pub mod capture;
pub mod afu;
pub mod whisper;
pub mod winrt;
use serde::Serialize;
use std::fmt;
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
};
use tauri::State;
use tauri::Manager;
use tauri::Emitter;
#[derive(Clone, Copy, Debug)]
pub enum SesHata {
    Microphone,
    Model,
    Recognition,
    Speech,
    ModelMissing,
    Busy,
}
impl fmt::Display for SesHata {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Microphone => "Mikrofon açılamadı, mikrofon iznini kontrol edip tekrar dene.",
            Self::Model => "Ses modeli yüklenemedi.",
            Self::Recognition => "Ses anlaşılamadı, tekrar dene.",
            Self::Speech => "Ses kullanılamıyor, Windows ses ayarlarını kontrol et.",
            Self::ModelMissing => "Ses modeli bulunamadı, mesajını yazarak gönder.",
            Self::Busy => "Ses işlemi sürüyor, bitmesini bekle.",
        })
    }
}
impl std::error::Error for SesHata {}
#[derive(Debug,PartialEq)]
enum MotorChoice {Whisper}
fn select_motor(local:bool,_windows:bool)->Result<MotorChoice,SesHata>{if local {Ok(MotorChoice::Whisper)} else {Err(SesHata::ModelMissing)}}
#[derive(Default)]
pub struct VoiceState {
    recorder: Arc<Mutex<Option<(u64, capture::Recorder)>>>,
    motor: Arc<Mutex<Option<whisper::Motor>>>,
    speech_lock: Arc<Mutex<()>>,
    generation: Arc<AtomicU64>,
    capture_generation: Arc<AtomicU64>,
    pending: Arc<Mutex<Option<(u64, Arc<AtomicBool>)>>>,
    closed: Arc<AtomicBool>,
    afu_jobs: Arc<Mutex<Vec<std::path::PathBuf>>>,
    afu_preferences: Mutex<()>,
}
impl VoiceState {
    fn cancel_afu(&self) {
        if let Ok(jobs) = self.afu_jobs.lock() { for directory in jobs.iter() { afu::cancel(directory); } }
    }
    fn cancel_capture(&self) {
        let cutoff = self.capture_generation.fetch_add(1, Ordering::AcqRel) + 1;
        let pending_done = if let Ok(pending) = self.pending.try_lock() {
            if let Some((ticket, signal)) = pending.as_ref() {
                if *ticket <= cutoff {
                    signal.store(true, Ordering::Release);
                }
            }
            true
        } else {
            false
        };
        let recorder_done = if let Ok(mut recorder) = self.recorder.try_lock() {
            if recorder
                .as_ref()
                .map(|(ticket, _)| *ticket <= cutoff)
                .unwrap_or(false)
            {
                recorder.take();
            }
            true
        } else {
            false
        };
        if !pending_done || !recorder_done {
            // Yalnız kısa yayın kilitleri kalır; UI beklemez ve daha yeni bir kayıt iptal edilmez.
            let pending = self.pending.clone();
            let recorder = self.recorder.clone();
            std::thread::spawn(move || {
                if let Ok(pending) = pending.lock() {
                    if let Some((ticket, signal)) = pending.as_ref() {
                        if *ticket <= cutoff {
                            signal.store(true, Ordering::Release);
                        }
                    }
                }
                if let Ok(mut recorder) = recorder.lock() {
                    if recorder
                        .as_ref()
                        .map(|(ticket, _)| *ticket <= cutoff)
                        .unwrap_or(false)
                    {
                        recorder.take();
                    }
                }
            });
        }
    }
    pub fn shutdown(&self) {
        if self.closed.swap(true, Ordering::AcqRel) {
            return;
        }
        self.generation.fetch_add(1, Ordering::AcqRel);
        self.cancel_afu();
        self.cancel_capture();
    }
}
impl Drop for VoiceState {
    fn drop(&mut self) {
        self.shutdown();
    }
}
#[derive(Serialize)]
pub struct Supported {
    pub whisper: bool,
    pub winrt_stt: bool,
    pub tts: bool,
    pub afu_tts: bool,
}
#[tauri::command]
pub async fn voice_supported() -> Supported {
    tauri::async_runtime::spawn_blocking(|| Supported {
        whisper: whisper::model_yolu().map(|p| p.is_file()).unwrap_or(false),
        winrt_stt: false,
        tts: winrt::tts_supported(),
        afu_tts: afu::runtime().is_some(),
    })
    .await
    .unwrap_or(Supported {
        whisper: false,
        winrt_stt: false,
        tts: false,
        afu_tts: false,
    })
}
#[tauri::command]
pub async fn voice_start(state: State<'_, VoiceState>) -> Result<(), String> {
    let recorder = state.recorder.clone();
    let pending = state.pending.clone();
    let closed = state.closed.clone();
    let epoch = state.capture_generation.clone();
    let ticket = epoch.fetch_add(1, Ordering::AcqRel) + 1;
    tauri::async_runtime::spawn_blocking(move || {
        if closed.load(Ordering::Acquire) {
            return Err(SesHata::Microphone);
        }
        select_motor(whisper::model_yolu().map(|p| p.is_file()).unwrap_or(false), false)?;
        let signal = Arc::new(AtomicBool::new(false));
        {
            let mut slot = pending.lock().map_err(|_| SesHata::Microphone)?;
            if slot.is_some() {
                return Err(SesHata::Busy);
            }
            if recorder.lock().map_err(|_| SesHata::Microphone)?.is_some() {
                return Err(SesHata::Busy);
            }
            *slot = Some((ticket, signal.clone()));
        }
        let result = (|| {
            if closed.load(Ordering::Acquire) || epoch.load(Ordering::Acquire) != ticket {
                signal.store(true, Ordering::Release);
                return Err(SesHata::Microphone);
            }
            // Aygıt hazırlığı sırasında hiçbir uygulama Mutex kilidi tutulmaz.
            let recording = capture::Recorder::start_cancelled(signal.clone())?;
            let mut slot = recorder.lock().map_err(|_| SesHata::Microphone)?;
            if signal.load(Ordering::Acquire)
                || closed.load(Ordering::Acquire)
                || epoch.load(Ordering::Acquire) != ticket
            {
                drop(recording);
                return Err(SesHata::Microphone);
            }
            *slot = Some((ticket, recording));
            Ok(())
        })();
        if let Ok(mut slot) = pending.lock() {
            if slot
                .as_ref()
                .map(|(_, p)| Arc::ptr_eq(p, &signal))
                .unwrap_or(false)
            {
                slot.take();
            }
        }
        result
    })
    .await
    .map_err(|_| SesHata::Microphone.to_string())?
    .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn voice_stop(state: State<'_, VoiceState>) -> Result<String, String> {
    let recorder = state.recorder.clone();
    let motor = state.motor.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let recording = recorder.lock().map_err(|_| SesHata::Microphone)?.take();
        let Some((_, recording)) = recording else {
            return Ok(String::new());
        };
        let data = recording.stop()?;
        if whisper::kisa_mi(&data) {
            return Ok(String::new());
        }
        let mut engine = motor.lock().map_err(|_| SesHata::Model)?;
        if engine.is_none() {
            let Some(path) = whisper::model_yolu() else {
                return winrt::dinle_yedek();
            };
            *engine = Some(whisper::Motor::yukle(&path)?);
        }
        engine.as_ref().ok_or(SesHata::Model)?.cevir(&data)
    })
    .await
    .map_err(|_| SesHata::Recognition.to_string())?
    .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn voice_listen_turn(state: State<'_, VoiceState>, max_bekleme_ms: usize) -> Result<String, String> {
    let motor = state.motor.clone();
    let closed = state.closed.clone();
    let speech_lock = state.speech_lock.clone();
    let pending = state.pending.clone();
    let recorder = state.recorder.clone();
    let epoch = state.capture_generation.clone();
    let ticket = epoch.fetch_add(1, Ordering::AcqRel) + 1;
    tauri::async_runtime::spawn_blocking(move || {
        let signal = Arc::new(AtomicBool::new(false));
        {
            let mut slot = pending.lock().map_err(|_| SesHata::Microphone)?;
            if slot.is_some() || recorder.lock().map_err(|_| SesHata::Microphone)?.is_some() {
                return Err(SesHata::Busy);
            }
            *slot = Some((ticket, signal.clone()));
        }
        let result = (|| {
            // Serialize capture with speech; cancellation remains available while waiting.
            let _speech = speech_lock.lock().map_err(|_| SesHata::Microphone)?;
            if closed.load(Ordering::Acquire) || epoch.load(Ordering::Acquire) != ticket || signal.load(Ordering::Acquire) {
                return Ok(String::new());
            }
            select_motor(whisper::model_yolu().map(|p| p.is_file()).unwrap_or(false), false)?;
            let data = capture::Recorder::start_auto(signal.clone(), 0.01, 800, max_bekleme_ms)?.wait_and_stop()?;
            if signal.load(Ordering::Acquire) || epoch.load(Ordering::Acquire) != ticket || whisper::kisa_mi(&data) {
                return Ok(String::new());
            }
            let mut engine = motor.lock().map_err(|_| SesHata::Model)?;
            if engine.is_none() {
                let path = whisper::model_yolu().ok_or(SesHata::ModelMissing)?;
                *engine = Some(whisper::Motor::yukle(&path)?);
            }
            let text = engine.as_ref().ok_or(SesHata::Model)?.cevir(&data)?;
            if signal.load(Ordering::Acquire) || epoch.load(Ordering::Acquire) != ticket { return Ok(String::new()); }
            Ok(text)
        })();
        if let Ok(mut slot) = pending.lock() {
            if slot.as_ref().map(|(_, p)| Arc::ptr_eq(p, &signal)).unwrap_or(false) { slot.take(); }
        }
        result
    }).await.map_err(|_| SesHata::Recognition.to_string())?.map_err(|e: SesHata| e.to_string())
}
#[tauri::command]
pub async fn voice_cancel(state: State<'_, VoiceState>) -> Result<(), String> {
    state.generation.fetch_add(1, Ordering::AcqRel);
    state.cancel_afu();
    state.cancel_capture();
    Ok(())
}
#[tauri::command]
pub fn voice_silence(state: State<'_, VoiceState>) {
    state.generation.fetch_add(1, Ordering::AcqRel);
    state.cancel_afu();
}
fn choice_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path().app_data_dir().map(|p| p.join("voice.json")).map_err(|_| "Ses seçimi kaydedilemedi; yeniden dene.".into())
}
#[tauri::command]
pub fn voice_choices(app: tauri::AppHandle, state: State<'_, VoiceState>) -> Result<afu::Choice, String> {
    let _guard = state.afu_preferences.lock().map_err(|_| "Ses seçimi açılamadı; yeniden dene.")?;
    Ok(afu::choices(&choice_path(&app)?, afu::runtime().as_deref()))
}
#[tauri::command]
pub fn voice_choose(app: tauri::AppHandle, state: State<'_, VoiceState>, ses: String, filtre: String) -> Result<afu::Choice, String> {
    let _guard = state.afu_preferences.lock().map_err(|_| "Ses seçimi kaydedilemedi; yeniden dene.")?;
    afu::save_choice(&choice_path(&app)?, afu::runtime().as_deref(), &ses, &filtre)
}
#[derive(Serialize)]
pub struct ResponseResult { warning: Option<String> }
#[tauri::command]
pub async fn voice_response(app: tauri::AppHandle, state: State<'_, VoiceState>, text: String) -> Result<ResponseResult, String> {
    if state.closed.load(Ordering::Acquire) { return Err(SesHata::Speech.to_string()); }
    let root = afu::runtime();
    let closed = state.closed.clone();
    let choice = afu::choices(&choice_path(&app)?, root.as_deref());
    let generation = state.generation.clone();
    let ticket = generation.fetch_add(1, Ordering::AcqRel) + 1;
    state.cancel_afu();
    let directory = afu::job_directory();
    std::fs::create_dir_all(&directory).map_err(|_| "Yanıt okunamadı; metinden devam et.")?;
    let jobs = state.afu_jobs.clone();
    jobs.lock().map_err(|_| "Yanıt okunamadı; metinden devam et.")?.push(directory.clone());
    let lock = state.speech_lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let result = (|| {
            let _guard = lock.lock().map_err(|_| SesHata::Speech.to_string())?;
            if closed.load(Ordering::Acquire) { return Ok(ResponseResult { warning: None }); }
            match afu::speak(root.as_deref(), &directory, &choice, &text.chars().take(32000).collect::<String>(), &generation, ticket) {
                afu::Answer::Played | afu::Answer::Cancelled => Ok(ResponseResult { warning: None }),
                afu::Answer::Fallback(cleaned) => {
                    if generation.load(Ordering::Acquire) != ticket { return Ok(ResponseResult { warning: None }); }
                    if cleaned == afu::NOT_INSTALLED {
                        return Ok(ResponseResult { warning: Some(cleaned) });
                    }
                    let _ = app.emit("afu-voice-fallback", ());
                    // Fallback text has already passed the shared local cleaner.
                    let chars: Vec<char> = cleaned.chars().collect();
                    for chunk in chars.chunks(4000) {
                        if generation.load(Ordering::Acquire) != ticket { return Ok(ResponseResult { warning: None }); }
                        winrt::konus_iptalli(&chunk.iter().collect::<String>(), &generation, ticket).map_err(|_| "Ses okunamadı; metinden devam et.".to_string())?;
                    }
                    Ok(ResponseResult { warning: Some(afu::FALLBACK.into()) })
                }
            }
        })();
        if let Ok(mut list) = jobs.lock() { list.retain(|p| p != &directory); }
        let _ = std::fs::remove_dir_all(&directory);
        result
    }).await.map_err(|_| "Yanıt okunamadı; metinden devam et.".to_string())?
}
#[tauri::command]
pub async fn voice_speak(state: State<'_, VoiceState>, text: String) -> Result<(), String> {
    if state.closed.load(Ordering::Acquire) {
        return Err(SesHata::Speech.to_string());
    }
    let closed = state.closed.clone();
    let generation = state.generation.clone();
    let ticket = generation.fetch_add(1, Ordering::AcqRel) + 1;
    let lock = state.speech_lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = lock.lock().map_err(|_| SesHata::Speech)?;
        if closed.load(Ordering::Acquire) || generation.load(Ordering::Acquire) != ticket {
            return Ok(());
        };
        winrt::konus_iptalli(&text, &generation, ticket)
    })
    .await
    .map_err(|_| SesHata::Speech.to_string())?
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shutdown_signals_afu_playback_without_waiting_for_speech() {
        let state = VoiceState::default();
        let dir = afu::job_directory(); std::fs::create_dir_all(&dir).unwrap();
        state.afu_jobs.lock().unwrap().push(dir.clone());
        let _speech = state.speech_lock.lock().unwrap();
        state.shutdown();
        assert!(dir.join("cancel").exists());
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn shutdown_iptal_eder_ve_idempotenttir() {
        let state = VoiceState::default();
        let signal = Arc::new(AtomicBool::new(false));
        *state.pending.lock().unwrap() = Some((0, signal.clone()));
        state.shutdown();
        let epoch = state.generation.load(Ordering::Acquire);
        state.shutdown();
        assert!(state.closed.load(Ordering::Acquire));
        assert!(signal.load(Ordering::Acquire));
        assert_eq!(state.generation.load(Ordering::Acquire), epoch);
    }
    #[test]
    fn shutdown_diger_kilitleri_beklemez() {
        let state = VoiceState::default();
        let _capture = state.recorder.lock().unwrap();
        let _pending = state.pending.lock().unwrap();
        state.shutdown();
        assert!(state.closed.load(Ordering::Acquire));
        assert_eq!(state.capture_generation.load(Ordering::Acquire), 1);
    }
    #[test]
    fn shutdown_kilit_acilinca_gecikmis_iptali_tamamlar() {
        let state = VoiceState::default();
        let signal = Arc::new(AtomicBool::new(false));
        let mut pending = state.pending.lock().unwrap();
        *pending = Some((0, signal.clone()));
        state.shutdown();
        drop(pending);
        let deadline = std::time::Instant::now() + std::time::Duration::from_millis(1000);
        while !signal.load(Ordering::Acquire) && std::time::Instant::now() < deadline {
            std::thread::sleep(std::time::Duration::from_millis(2));
        }
        assert!(signal.load(Ordering::Acquire));
    }
    #[test]
    fn gecikmis_iptal_yeni_kaydin_sinyalini_degistirmez() {
        let state = VoiceState::default();
        let fresh = Arc::new(AtomicBool::new(false));
        let mut pending = state.pending.lock().unwrap();
        state.cancel_capture();
        *pending = Some((2, fresh.clone()));
        drop(pending);
        std::thread::sleep(std::time::Duration::from_millis(20));
        assert!(!fresh.load(Ordering::Acquire));
    }

    #[test]
    fn yerel_model_oncelikli_yoksa_anlamli_hata_doner() {
        assert_eq!(select_motor(true,true).unwrap(),MotorChoice::Whisper);
        assert_eq!(select_motor(true,false).unwrap(),MotorChoice::Whisper);
        // Windows dikte yede?i hen?z uygulanmad?; varm?? gibi se?ilmez.
        for windows in [true, false] {
            let error = select_motor(false, windows).unwrap_err();
            assert!(matches!(error, SesHata::ModelMissing));
            assert_eq!(error.to_string(), "Ses modeli bulunamadı, mesajını yazarak gönder.");
        }
        assert!(matches!(winrt::dinle_yedek(), Err(SesHata::ModelMissing)));
    }
}
