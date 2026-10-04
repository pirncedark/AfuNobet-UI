# Üçüncü taraf kaynakları

- Upstream kod: MIT; telif bildirimi kök LICENSE dosyasında korunur. Upstream ikon, ses ve medya alınmaz.
- MurMur: https://github.com/Mr-ABX/MurMur/tree/0be0d1b — yerel ses yakalama ve yerel Whisper fikirleri incelendi. Kaynak: [audio.rs](https://github.com/Mr-ABX/MurMur/blob/0be0d1b/src-tauri/src/audio.rs), [transcriber.rs](https://github.com/Mr-ABX/MurMur/blob/0be0d1b/src-tauri/src/transcriber.rs), commit `0be0d1b`. README MIT beyanı bulunur; bağımsız LICENSE dosyası doğrulanmadığından özgün kod kopyalanmadı. Afu modülleri yeniden yazıldı. Bulut çevirisi, anahtar, model indirici, ekran asistanı, otomatik yapıştırma ve genel kısayol alınmadı.
- whisper-rs 0.11.1: https://github.com/tazz4843/whisper-rs — yerel whisper.cpp Rust bağlayıcısı; Cargo cache içindeki sürüm kullanılır.
- cpal 0.15.3: https://github.com/RustAudio/cpal — mikrofon yakalama; yerel Cargo cache.
- hound 3.5.1: https://github.com/ruuda/hound — yalnız güvenli WAV dosyası testi.
- Yerel Whisper small modeli: [resmî whisper.cpp model kaynağı](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin). `%LOCALAPPDATA%/AfuNobet-UI/models/ggml-small.bin`; 487601967 bayt. 2026-10-01 dosyada doğrulanan SHA256: `1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b`. Model uygulamaya gömülmez; indirme yapılmaz.

## Ses doğrulama sınırı

2026-10-01: yerel güvenli 16 kHz mono WAV dosyasında Türkçe Whisper çevirisi PASS; gerçek mikrofon ve Windows TTS UNVERIFIED. WinRT serbest diktenin çevrimdışı Türkçe PCM çevirisi doğrulanmadı: `winrt_stt=false`, eksik modelde mikrofon açılmadan yazılı mesaj önerilir. Bulut yedeği kullanılmaz.
