// MurMur (Mr-ABX/MurMur, 0be0d1b) yerel Whisper yaklaşımından uyarlama.
// Yalnız yerel dosya; model indirme, API anahtarı ve bulut yedeği yok.
use super::SesHata;
use std::path::{Path, PathBuf};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};
pub fn kisa_mi(ses: &[f32]) -> bool {
    ses.len() < 4_800
}
pub fn model_yolu() -> Option<PathBuf> {
    std::env::var_os("AFUNOBET_WHISPER_MODEL")
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("LOCALAPPDATA")
                .map(|p| PathBuf::from(p).join("AfuNobet-UI/models/ggml-small.bin"))
        })
}
pub struct Motor {
    context: WhisperContext,
}
impl Motor {
    pub fn yukle(path: &Path) -> Result<Self, SesHata> {
        if !path.is_file() {
            return Err(SesHata::Model);
        }
        let path = path.to_str().ok_or(SesHata::Model)?;
        let mut params = WhisperContextParameters::default();
        params.use_gpu(false);
        WhisperContext::new_with_params(path, params)
            .map(|context| Self { context })
            .map_err(|_| SesHata::Model)
    }
    pub fn cevir(&self, ses: &[f32]) -> Result<String, SesHata> {
        if kisa_mi(ses) {
            return Ok(String::new());
        }
        if ses.len() > 960_000 || ses.iter().any(|x| !x.is_finite()) {
            return Err(SesHata::Recognition);
        }
        let mut state = self
            .context
            .create_state()
            .map_err(|_| SesHata::Recognition)?;
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some("tr"));
        params.set_translate(false);
        params.set_n_threads(
            std::thread::available_parallelism()
                .map(|x| x.get().min(4) as i32)
                .unwrap_or(1),
        );
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_special(false);
        params.set_print_timestamps(false);
        state.full(params, ses).map_err(|_| SesHata::Recognition)?;
        let n = state.full_n_segments().map_err(|_| SesHata::Recognition)?;
        let mut text = String::new();
        for i in 0..n {
            text.push_str(
                &state
                    .full_get_segment_text(i)
                    .map_err(|_| SesHata::Recognition)?,
            );
        }
        Ok(text.trim().to_string())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cok_kisa_ses_model_gerekmeden_ayirt_edilir() {
        assert!(kisa_mi(&vec![0.; 3000]));
        assert!(kisa_mi(&vec![0.; 4799]));
        assert!(!kisa_mi(&vec![0.; 4800]));
    }
    #[test]
    fn model_yoksa_tek_cumle_hata() {
        assert_eq!(
            Motor::yukle(Path::new("Z:/yok/ggml-small.bin"))
                .err()
                .unwrap()
                .to_string(),
            "Ses modeli yüklenemedi."
        );
    }
    #[test]
    #[ignore = "yalnız güvenli örnek WAV ve yerel model ile"]
    fn turkce_ornek_ses_cevrilir() {
        let m = Motor::yukle(&model_yolu().unwrap()).unwrap();
        let path = std::env::var_os("AFUNOBET_TEST_WAV").expect("güvenli örnek WAV yolu gerekli");
        let mut wav = hound::WavReader::open(path).unwrap();
        assert_eq!(wav.spec().channels, 1);
        assert_eq!(wav.spec().sample_rate, 16000);
        let data: Vec<f32> = wav
            .samples::<i16>()
            .map(|x| x.unwrap() as f32 / 32768.)
            .collect();
        let text = m.cevir(&data).unwrap();
        assert!(text.to_lowercase().contains("merhaba"), "{text}");
    }
}
