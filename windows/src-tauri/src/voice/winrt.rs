use super::SesHata;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    mpsc,
};
use std::time::{Duration, Instant};
use windows::{
    core::HSTRING,
    Foundation::TypedEventHandler,
    Media::{Core::MediaSource, Playback::MediaPlayer, SpeechSynthesis::SpeechSynthesizer},
    Win32::System::WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED},
};
struct Apartment;
impl Apartment {
    fn new() -> Result<Self, SesHata> {
        unsafe { RoInitialize(RO_INIT_MULTITHREADED) }.map_err(|_| SesHata::Speech)?;
        Ok(Self)
    }
}
impl Drop for Apartment {
    fn drop(&mut self) {
        unsafe { RoUninitialize() };
    }
}
// None: listede Türkçe yoksa sentezleyicinin kendi varsayılan sesi kullanılır.
fn preferred_voice(languages: &[String]) -> Option<usize> {
    languages.iter().position(|language| {
        language
            .split('-')
            .next()
            .unwrap_or("")
            .eq_ignore_ascii_case("tr")
    })
}
fn stt_ready_policy(identity: bool, languages: &[String]) -> bool {
    identity && languages.iter().any(|language| language.eq_ignore_ascii_case("tr-TR"))
}
pub fn tts_supported() -> bool {
    let Ok(_apt) = Apartment::new() else {
        return false;
    };
    let Ok(synth) = SpeechSynthesizer::new() else {
        return false;
    };
    let supported = selected_voice(&synth).is_ok();
    let _ = synth.Close();
    supported
}
fn selected_voice(
    synth: &SpeechSynthesizer,
) -> Result<windows::Media::SpeechSynthesis::VoiceInformation, SesHata> {
    if let Ok(voices) = SpeechSynthesizer::AllVoices() {
        let listed: Vec<_> = voices.into_iter().collect();
        let languages: Vec<String> = listed
            .iter()
            .map(|voice| voice.Language().map(|x| x.to_string()).unwrap_or_default())
            .collect();
        if let Some(index) = preferred_voice(&languages) {
            return Ok(listed[index].clone());
        }
    }
    // Türkçe ses eksik olsa da geçerli Windows varsayılan sesi kullanılabilir.
    synth.Voice().map_err(|_| SesHata::Speech)
}
pub fn konus(metin: &str) -> Result<(), SesHata> {
    konus_iptalli(metin, &AtomicU64::new(0), 0)
}
pub fn konus_iptalli(metin: &str, generation: &AtomicU64, ticket: u64) -> Result<(), SesHata> {
    if generation.load(Ordering::Acquire) != ticket {
        return Ok(());
    }
    if metin.trim().is_empty() {
        return Ok(());
    }
    if metin.chars().count() > 4000 {
        return Err(SesHata::Speech);
    }
    let _apt = Apartment::new()?;
    let synth = SpeechSynthesizer::new().map_err(|_| SesHata::Speech)?;
    synth
        .SetVoice(&selected_voice(&synth)?)
        .map_err(|_| SesHata::Speech)?;
    let operation = synth
        .SynthesizeTextToStreamAsync(&HSTRING::from(metin))
        .map_err(|_| SesHata::Speech)?;
    let synth_deadline = Instant::now() + Duration::from_secs(30);
    while operation.Status().map_err(|_| SesHata::Speech)?.0 == 0 {
        if generation.load(Ordering::Acquire) != ticket {
            let _ = operation.Cancel();
            let _ = synth.Close();
            return Ok(());
        }
        if Instant::now() >= synth_deadline {
            let _ = operation.Cancel();
            let _ = synth.Close();
            return Err(SesHata::Speech);
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let stream = operation.GetResults().map_err(|_| SesHata::Speech)?;
    if generation.load(Ordering::Acquire) != ticket {
        let _ = synth.Close();
        return Ok(());
    }
    let source =
        MediaSource::CreateFromStream(&stream, &stream.ContentType().map_err(|_| SesHata::Speech)?)
            .map_err(|_| SesHata::Speech)?;
    let player = MediaPlayer::new().map_err(|_| SesHata::Speech)?;
    let (tx, rx) = mpsc::channel();
    let failed = tx.clone();
    let ended = player
        .MediaEnded(&TypedEventHandler::new(move |_, _| {
            let _ = tx.send(true);
            Ok(())
        }))
        .map_err(|_| SesHata::Speech)?;
    let error = player
        .MediaFailed(&TypedEventHandler::new(move |_, _| {
            let _ = failed.send(false);
            Ok(())
        }))
        .map_err(|_| SesHata::Speech)?;
    let result = (|| {
        player.SetSource(&source).map_err(|_| SesHata::Speech)?;
        player.Play().map_err(|_| SesHata::Speech)?;
        let deadline = Instant::now() + Duration::from_secs(120);
        loop {
            if generation.load(Ordering::Acquire) != ticket {
                return Ok(());
            }
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(true) => return Ok(()),
                Ok(false) => return Err(SesHata::Speech),
                Err(mpsc::RecvTimeoutError::Disconnected) => return Err(SesHata::Speech),
                Err(_) => {}
            }
            if Instant::now() >= deadline {
                return Err(SesHata::Speech);
            }
        }
    })();
    let _ = player.Pause();
    let _ = player.RemoveMediaEnded(ended);
    let _ = player.RemoveMediaFailed(error);
    let _ = player.Close();
    let _ = source.Close();
    let _ = synth.Close();
    result
}
// WinRT serbest dikte ağ servisine bağımlı olabilir; çevrimdışı Türkçe PCM yedeği doğrulanmadı.
// Bırakma anında yeni mikrofon açılmaz ve buluta sessiz geçiş yapılmaz.
pub fn dinle_yedek() -> Result<String, SesHata> {
    Err(SesHata::ModelMissing)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bos_metin_hoparlor_acmaz() {
        assert!(konus("").is_ok());
    }
    #[test]
    fn uzun_metin_hoparlor_acmadan_reddedilir() {
        assert!(matches!(konus(&"a".repeat(4001)), Err(SesHata::Speech)));
    }
    #[test]
    fn iptal_edilmis_istek_sentez_baslatmaz() {
        assert!(konus_iptalli(&"a".repeat(4001), &AtomicU64::new(1), 0).is_ok());
    }

    #[test]
    fn turkce_ses_varsa_varsayilandan_once_secilir() {
        let languages = vec!["en-US".into(), "TR-tr".into(), "de-DE".into()];
        assert_eq!(preferred_voice(&languages), Some(1));
    }
    #[test]
    fn turkce_yoksa_windows_varsayilan_sesi_kullanilir() {
        assert_eq!(preferred_voice(&["en-US".into(), "de-DE".into()]), None);
        assert_eq!(preferred_voice(&[]), None);
        assert_eq!(preferred_voice(&["trash".into()]), None);
    }

    #[test]
    fn windows_yedegi_paket_kimligi_ve_turkce_dikte_ister() {
        assert!(stt_ready_policy(true,&["tr-TR".into()]));
        assert!(!stt_ready_policy(false,&["tr-TR".into()]));
        assert!(!stt_ready_policy(true,&["en-US".into()]));
    }
}
