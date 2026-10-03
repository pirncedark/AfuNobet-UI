# AfuNobet-UI Boyut ve Taşınabilirlik Analizi

## GÖREV 1 - EXE BOYUT ANALİZİ
- **Temel Boyut:** Orijinal çalıştırılabilir dosya yaklaşık 16 MB'tı.
- **Görsel Yükü (31 MB):** `windows/public/afu/durum/` (18 MB) ve `windows/public/afu/pet/` (11 MB) dizinlerindeki animasyonlu `.webp` dosyaları, Tauri'nin `frontendDist` yapılandırması (`tauri.conf.json`) aracılığıyla EXE içerisine statik olarak gömülmektedir.
- **include_bytes!:** Sadece `windows/src-tauri/src/tray_icon.rs` içindeki `tray-base.rgba` için (4 KB) kullanılmıştır, boyuta etkisi önemsizdir.
- **Rust Bağımlılıkları:** `Cargo.toml`'a eklenen `whisper-rs` ve CMake yapılandırmaları (`whisper_windows_x64.cmake`) Whisper kütüphanesini statik bağlayarak yer kaplamaktadır.
- **Boyutun 77MB/70MB'a Çıkması:** 16MB temel exe + 31MB WebP görselleri (toplam 47MB) ve önceki sürümlerde tam temizlenmemiş derleme sembolleri/LTO eksiklikleri EXE'yi 77MB'a kadar şişirmiştir (Şu an optimize edilip 33MB'a inmiştir).
- **Çözüm Önerisi:** EXE boyutunu küçültmek için 31 MB'lık animasyonlu WebP dosyaları EXE'den çıkarılıp bir CDN/Sunucu üzerinden çalışma anında önbelleğe alınmalı veya kare hızları/çözünürlükleri düşürülerek küçültülmelidir.

## GÖREV 2 - SES TAŞINABİLİRLİĞİ (PORTABILITY)
- EXE başka bir klasöre veya PC'ye tek başına taşındığında **çalışmaz** (yerel bağımlılıkları bulamaz).
- **Mutlak/Bağımlı Yollar:**
  - `windows/src-tauri/src/voice/afu.rs` (Satır 72): Python yorumlayıcısını projenin iki üst dizininde arar: `parent.join("_deneme/ses/cbenv/Scripts/python.exe")`.
  - `ses_deneme/afu_konus.py` (Satır 450): `LOCAL / 'cbenv/Scripts/python.exe'` kullanır. `LOCAL` değişkeni `ROOT.parent.parent / '_deneme' / 'ses'` olarak tanımlıdır ve taşındığında bozulur.
  - `ses_deneme/*.py`: Hugging Face model önbelleği `Path.home() / '.cache/huggingface/hub/...'` gibi kullanıcının ev dizinine (absolute path) ayarlıdır, başka bir PC'de doğrudan çöker.
- **Hata Mesajı ve Yedek (Fallback):** Bağımlılıklar bulunamadığında UI üzerinde 1 cümlelik şu hata mesajı gösterilir: `"Afu sesi hazır değil; Windows sesiyle devam ediyorum, daha sonra yeniden dene."` ve arka planda sorunsuz bir şekilde Windows TTS (`winrt::konus_iptalli`) ile okumaya devam edilir.

SONUC: TAMAM
