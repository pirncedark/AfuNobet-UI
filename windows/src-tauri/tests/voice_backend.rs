#[path="../src/voice/mod.rs"]
mod voice;

/// Production Rust -> Python -> 5b WAV -> production Whisper, without playback.
#[test]
#[ignore = "requires the installed offline Afu voice and Whisper models"]
fn afu_5b_roundtrip() {
    use std::sync::atomic::AtomicU64;
    let root = voice::afu::runtime().expect("Afu worker missing");
    let directory = std::env::var_os("AFU_VOICE_PROOF_DIR")
        .map(std::path::PathBuf::from).expect("proof directory required");
    std::fs::create_dir_all(&directory).unwrap();
    // The worker is windowless and uses the production resolver, without playback.
    let text = match std::env::var_os("AFU_VOICE_INPUT_FILE") {
        Some(path) => std::fs::read_to_string(path).expect("live answer missing"),
        None => "Merhaba, birlikte devam edelim.".into(),
    };
    let answer = voice::afu::speak_headless(&root, &directory, &text, &AtomicU64::new(1));
    assert!(matches!(answer, voice::afu::Answer::Played), "voice synthesis failed");
    validate_5b_proof(&directory);
}

/// Recheck a completed synthesis without generating the same speech again.
#[test]
#[ignore = "requires an existing 5b proof directory and local Whisper model"]
fn afu_5b_existing_proof() {
    let directory = std::env::var_os("AFU_VOICE_PROOF_DIR")
        .map(std::path::PathBuf::from).expect("proof directory required");
    validate_5b_proof(&directory);
}

fn validate_5b_proof(directory: &std::path::Path) {
    let result: serde_json::Value = serde_json::from_slice(
        &std::fs::read(directory.join("result.json")).unwrap()).unwrap();
    assert_eq!(result["voice"], "afu_5b");
    assert_eq!(result["voice_parameters"]["exaggeration"], 0.35);
    assert_eq!(result["voice_parameters"]["cfg_weight"], 0.5);
    assert_eq!(result["voice_parameters"]["filter"], "sicak");
    assert_eq!(result["voice_parameters"]["quality_verified"], true,
        "generated speech did not pass the worker's transcription check: {result}");
    let mut wav = hound::WavReader::open(directory.join("answer.wav")).unwrap();
    let spec = wav.spec();
    let raw: Vec<f32> = wav.samples::<i16>().map(|x| x.unwrap() as f32 / 32768.).collect();
    let data = voice::capture::resample(&voice::capture::to_mono(&raw, spec.channels), spec.sample_rate, 16000);
    let motor = voice::whisper::Motor::yukle(&voice::whisper::model_yolu().unwrap()).unwrap();
    let transcript = motor.cevir(&data).unwrap();
    std::fs::write(directory.join("transcript.txt"), &transcript).unwrap();
    assert!(transcript.to_lowercase().contains("merhaba"), "{transcript}");
    // A greeting alone cannot prove that the rest of the answer was spoken.
    let normalized = transcript.to_lowercase();
    for word in result["text"].as_str().unwrap().split(|c: char| !c.is_alphabetic())
        .filter(|word| !word.is_empty()) {
        assert!(normalized.split(|c: char| !c.is_alphabetic())
            .any(|heard| heard == word.to_lowercase()), "missing {word:?}: {transcript}");
    }
}
