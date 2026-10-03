# GÖREV (Gemini Flash): Soru kartı görünüm kontrolü + Rust uyarıları — KÜÇÜK

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_FL_SORUKART.md (ilk satır `SONUC: TAMAM` / `SONUC: YARIM - <neden>`)
Kullanıcı: Claude'un sorusu Afu'da çıktığında "UI az bozuktu".

1. Soru kartını (windows/src/views/views.ts soru/onay kartı + style.css ilgili sınıflar) başsız tarayıcıda örnek bir soruyla çiz (uzun soru metni ~150 karakter + 2 uzun seçenek + "Diğer" kısa metin alanı): 256 px ve normal kart genişliğinde ekran görüntüsü al → docs/kanit/sorukart/. Taşma, kırpılma, üst üste binme, okunmayan kontrast varsa CSS ile düzelt (yalnız soru kartı sınıfları). Önce/sonra görüntüsü.
2. `cd windows/src-tauri; cargo build --offline` uyarıları: kullanılmayan importlar (QUNS_BUSY, simdi_ms, PathBuf/Path) — kaldır, davranış değişmesin.
3. Doğrula: `cd windows; node node_modules/typescript/bin/tsc --noEmit; npm test` ve `cd src-tauri; cargo test --offline` — sayıları SONUC'a yapıştır.
YASAK: pet.ts (başka ajan), island.rs, görsel/ses dosyaları, exe paketleme, git, görünür pencere.
