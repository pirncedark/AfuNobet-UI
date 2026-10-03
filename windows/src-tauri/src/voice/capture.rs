// MurMur (Mr-ABX/MurMur, 0be0d1b) yerel cpal + doğrusal örnekleme fikrinden uyarlama.
// Kaynak kod kopyalanmadı; bulut, otomatik yapıştırma ve genel kısayol alınmadı.
use super::SesHata;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};
pub const RATE: u32 = 16_000;
pub const MAX_SECONDS: usize = 60;
fn finite(x: f32) -> f32 {
    if x.is_finite() {
        x.clamp(-1., 1.)
    } else {
        0.
    }
}
pub fn to_mono(samples: &[f32], channels: u16) -> Vec<f32> {
    if channels == 0 {
        return vec![];
    }
    samples
        .chunks_exact(channels as usize)
        .map(|frame| frame.iter().map(|x| finite(*x)).sum::<f32>() / channels as f32)
        .collect()
}
pub fn resample(samples: &[f32], input: u32, output: u32) -> Vec<f32> {
    if input == 0 || output == 0 || samples.is_empty() {
        return vec![];
    }
    if input == output {
        return samples.iter().map(|x| finite(*x)).collect();
    }
    let len = (samples.len() as u64 * output as u64 / input as u64) as usize;
    (0..len)
        .map(|i| {
            let pos = i as f64 * input as f64 / output as f64;
            let a = pos as usize;
            let b = (a + 1).min(samples.len() - 1);
            let t = (pos - a as f64) as f32;
            finite(samples[a]) * (1. - t) + finite(samples[b]) * t
        })
        .collect()
}
fn append_bounded(target: &mut Vec<f32>, input: &[f32], channels: u16, limit: usize) {
    let remaining = limit.saturating_sub(target.len());
    target.extend(to_mono(input, channels).into_iter().take(remaining));
}
const START_TIMEOUT: Duration = Duration::from_secs(5);
const STOP_TIMEOUT: Duration = Duration::from_secs(2);
static WORKER_ACTIVE: AtomicBool = AtomicBool::new(false);
struct WorkerLease;
impl WorkerLease {
    fn acquire() -> Result<Self, SesHata> {
        WORKER_ACTIVE
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map(|_| Self)
            .map_err(|_| SesHata::Busy)
    }
}
impl Drop for WorkerLease {
    fn drop(&mut self) {
        WORKER_ACTIVE.store(false, Ordering::Release);
    }
}
fn wait_ready(rx: &mpsc::Receiver<Result<(), SesHata>>, timeout: Duration) -> Result<(), SesHata> {
    rx.recv_timeout(timeout).map_err(|_| SesHata::Microphone)?
}
fn wait_finished(worker: &JoinHandle<Result<Vec<f32>, SesHata>>, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    while !worker.is_finished() {
        if Instant::now() >= deadline {
            return false;
        }
        std::thread::sleep(Duration::from_millis(5));
    }
    true
}
pub struct Recorder {
    control: mpsc::Sender<bool>,
    worker: Option<JoinHandle<Result<Vec<f32>, SesHata>>>,
    cancelled: Arc<AtomicBool>,
}
impl Recorder {
    pub fn start() -> Result<Self, SesHata> {
        Self::start_cancelled(Arc::new(AtomicBool::new(false)))
    }
    pub fn start_cancelled(cancelled: Arc<AtomicBool>) -> Result<Self, SesHata> {
        let lease = WorkerLease::acquire()?;
        let (tx, rx) = mpsc::channel::<bool>();
        let (ready_tx, ready_rx) = mpsc::sync_channel(1);
        let signal = cancelled.clone();
        let worker = std::thread::spawn(move || {
            let _lease = lease;
            if signal.load(Ordering::Acquire) {
                let _ = ready_tx.send(Err(SesHata::Microphone));
                return Ok(vec![]);
            }
            let prepared = prepare(signal.clone());
            match prepared {
                Err(e) => {
                    let _ = ready_tx.send(Err(e));
                    Err(e)
                }
                Ok((stream, samples, failed, rate)) => {
                    // İptal hazırlık sırasında gelirse sonradan mikrofon açılmaz.
                    if signal.load(Ordering::Acquire) {
                        let _ = ready_tx.send(Err(SesHata::Microphone));
                        return Ok(vec![]);
                    }
                    if stream.play().is_err() {
                        let _ = ready_tx.send(Err(SesHata::Microphone));
                        return Err(SesHata::Microphone);
                    }
                    if ready_tx.send(Ok(())).is_err() {
                        return Ok(vec![]);
                    }
                    let keep = match rx.recv_timeout(Duration::from_secs(MAX_SECONDS as u64)) {
                        Ok(value) => value,
                        Err(mpsc::RecvTimeoutError::Timeout) => true,
                        Err(_) => false,
                    };
                    drop(stream);
                    if !keep || signal.load(Ordering::Acquire) {
                        return Ok(vec![]);
                    }
                    if failed.load(Ordering::Relaxed) {
                        return Err(SesHata::Microphone);
                    }
                    let data = samples.lock().map_err(|_| SesHata::Microphone)?;
                    Ok(resample(&data, rate, RATE))
                }
            }
        });
        match wait_ready(&ready_rx, START_TIMEOUT) {
            Ok(()) => Ok(Self {
                control: tx,
                worker: Some(worker),
                cancelled,
            }),
            Err(e) => {
                cancelled.store(true, Ordering::Release);
                let _ = tx.send(false);
                drop(worker);
                Err(e)
            }
        }
    }
    pub fn stop(mut self) -> Result<Vec<f32>, SesHata> {
        let _ = self.control.send(true);
        let worker = self.worker.take().ok_or(SesHata::Microphone)?;
        if !wait_finished(&worker, STOP_TIMEOUT) {
            self.cancelled.store(true, Ordering::Release);
            drop(worker);
            return Err(SesHata::Microphone);
        }
        worker.join().map_err(|_| SesHata::Microphone)?
    }
}
impl Drop for Recorder {
    fn drop(&mut self) {
        self.cancelled.store(true, Ordering::Release);
        let _ = self.control.send(false);
        // Windows sürücüsünü zorla kesemeyiz; UI thread üzerinde join yapılmaz.
        // WorkerLease başka bir yakalama workerının birikmesini önler.
        self.worker.take();
    }
}
type Prepared = (cpal::Stream, Arc<Mutex<Vec<f32>>>, Arc<AtomicBool>, u32);
fn prepare(cancelled: Arc<AtomicBool>) -> Result<Prepared, SesHata> {
    let device = cpal::default_host()
        .default_input_device()
        .ok_or(SesHata::Microphone)?;
    let supported = device
        .default_input_config()
        .map_err(|_| SesHata::Microphone)?;
    let config: cpal::StreamConfig = supported.clone().into();
    let rate = config.sample_rate.0;
    let channels = config.channels;
    if rate == 0 || rate > 192000 || channels == 0 || channels > 32 {
        return Err(SesHata::Microphone);
    }
    let samples = Arc::new(Mutex::new(Vec::new()));
    let failed = Arc::new(AtomicBool::new(false));
    let limit = rate as usize * MAX_SECONDS;
    macro_rules! build {
        ($ty:ty,$convert:expr) => {{
            let output = samples.clone();
            let error = failed.clone();
            let cancel = cancelled.clone();
            device
                .build_input_stream(
                    &config,
                    move |data: &[$ty], _| {
                        if cancel.load(Ordering::Acquire) {
                            return;
                        }
                        if let Ok(mut dest) = output.lock() {
                            if dest.len() < limit {
                                let converted: Vec<f32> =
                                    data.iter().copied().map($convert).collect();
                                append_bounded(&mut dest, &converted, channels, limit);
                            }
                        }
                    },
                    move |_| error.store(true, Ordering::Relaxed),
                    None,
                )
                .map_err(|_| SesHata::Microphone)?
        }};
    }
    let stream = match supported.sample_format() {
        cpal::SampleFormat::F32 => build!(f32, finite),
        cpal::SampleFormat::I16 => build!(i16, |x: i16| x as f32 / 32768.),
        cpal::SampleFormat::U16 => build!(u16, |x: u16| (x as f32 - 32768.) / 32768.),
        _ => return Err(SesHata::Microphone),
    };
    Ok((stream, samples, failed, rate))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn stereo_mono_ortalama() {
        assert_eq!(to_mono(&[1., -1., 0.5, 0.5], 2), vec![0., 0.5]);
    }
    #[test]
    fn yeniden_ornekleme_uzunlugu() {
        assert_eq!(resample(&vec![0.; 48000], 48000, 16000).len(), 16000);
    }
    #[test]
    fn ayni_oran_degismez() {
        assert_eq!(
            resample(&[0.1, 0.2, 0.3], 16000, 16000),
            vec![0.1, 0.2, 0.3]
        );
    }
    #[test]
    fn bozuk_giris_guvenli() {
        assert!(to_mono(&[1.], 0).is_empty());
        assert!(resample(&[1.], 0, 16000).is_empty());
        assert_eq!(to_mono(&[f32::NAN, f32::INFINITY, 2.], 1), vec![0., 0., 1.]);
    }
    #[test]
    fn kayit_tavana_ulastiginda_buyumez() {
        let mut data = vec![0.];
        append_bounded(&mut data, &[1., 1., 1., 1.], 2, 2);
        append_bounded(&mut data, &[1., 1.], 2, 2);
        assert_eq!(data, vec![0., 1.]);
    }
    #[test]
    fn stop_worker_sonucunu_alir_ve_kaynak_birakilir() {
        let (tx, rx) = mpsc::channel::<bool>();
        let worker = std::thread::spawn(move || {
            assert!(rx.recv().unwrap());
            Ok(vec![0.5])
        });
        let recorder = Recorder {
            control: tx,
            worker: Some(worker),
            cancelled: Arc::new(AtomicBool::new(false)),
        };
        assert_eq!(recorder.stop().unwrap(), vec![0.5]);
    }
    #[test]
    fn drop_iptal_sinyali_gonderir_worker_kaynagi_birakir() {
        let (tx, rx) = mpsc::channel::<bool>();
        let (released_tx, released_rx) = mpsc::channel();
        let worker = std::thread::spawn(move || {
            assert!(!rx.recv().unwrap());
            released_tx.send(()).unwrap();
            Ok(vec![])
        });
        drop(Recorder {
            control: tx,
            worker: Some(worker),
            cancelled: Arc::new(AtomicBool::new(false)),
        });
        released_rx.recv_timeout(Duration::from_secs(1)).unwrap();
    }
    #[test]
    fn drop_takilan_surucuyu_beklemez() {
        let (control, _receiver) = mpsc::channel();
        let (release_tx, release_rx) = mpsc::channel();
        let worker = std::thread::spawn(move || {
            let _ = release_rx.recv();
            Ok(vec![])
        });
        let recorder = Recorder {
            control,
            worker: Some(worker),
            cancelled: Arc::new(AtomicBool::new(false)),
        };
        let (done_tx, done_rx) = mpsc::channel();
        let dropping = std::thread::spawn(move || {
            drop(recorder);
            done_tx.send(()).unwrap();
        });
        let quick = done_rx.recv_timeout(Duration::from_millis(100)).is_ok();
        let _ = release_tx.send(());
        let _ = dropping.join();
        assert!(quick, "Drop sürücü iş parçacığını beklememeli");
    }
    #[test]
    fn baslangic_hazirligi_zaman_asimi_sinirlidir() {
        let (_tx, rx) = mpsc::channel();
        let now = Instant::now();
        assert!(wait_ready(&rx, Duration::from_millis(20)).is_err());
        assert!(now.elapsed() < Duration::from_millis(500));
    }
    #[test]
    fn takilan_worker_stop_beklemesi_sinirlidir() {
        let (tx, rx) = mpsc::channel();
        let worker = std::thread::spawn(move || {
            let _ = rx.recv();
            Ok(vec![])
        });
        assert!(!wait_finished(&worker, Duration::from_millis(20)));
        tx.send(()).unwrap();
        worker.join().unwrap().unwrap();
    }
}
