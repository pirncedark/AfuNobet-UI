# GÖREV: Afu sesini taşınabilir yap + teslim

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Log: docs/kanit/tasima/log.txt (zaman damgalı ADIM/HATA/SON satırları)
Sonuç: SONUC_TASIMA.md (ilk satır `SONUC: TAMAM` veya `SONUC: YARIM - <neden>`)

## Sorun (SONUC_EXE_BOYUT_TASIMA.md'den)
- `windows/src-tauri/src/voice/afu.rs` ~72: python'u `../../_deneme/ses/cbenv/Scripts/python.exe` mutlak/üst-dizin yolunda arıyor.
- `ses_deneme/afu_konus.py` ~450: `LOCAL = ROOT.parent.parent/'_deneme'/'ses'` — klasör taşınınca bozulur.

## Yapılacak
1. Yol çözümünü sırayla yap: (a) `AFU_SES_PYTHON` ortam değişkeni, (b) exe yanındaki `ses/cbenv/Scripts/python.exe`, (c) mevcut eski yol (geri uyumluluk). Python dosyasında da aynı mantık (`AFU_SES_DIZIN` ortam değişkeni → betiğe göre göreli → eski yol).
2. Hiçbiri bulunamazsa uygulama ÇÖKMESİN: tek cümle Türkçe uyarı ("Afu sesi kurulu değil, yazıyla devam ediyorum.") ve metin cevabı sürsün.
3. Yol çözümü için Rust birim testi ekle (geçici dizinle; gerçek ses modeli çalıştırma).
4. Doğrula: `node node_modules/typescript/bin/tsc --noEmit`, `npm test`, `cargo test --offline` hepsi yeşil; sayıları SONUC'a yaz (önceki: 353 TS, 231 Rust).
5. Exe: çalışan süreç yoksa `dist/afunobet-ui-coucou.exe` → `dist/onceki/` yedekle, `npm --offline run pack` (windows/), `powershell -NoProfile -File kisayol_guncelle.ps1`. Yeni exe tarih/boyut/SHA256 SONUC'a.
6. Exe'yi kısa süre başlat (yeni görünür pencere AÇMA kuralı: mümkünse yalnız süreç ayakta mı kontrol et, 5 sn sonra kapat) — açılış kanıtı SONUC'a.

## Yasak
- Ses modeli dosyalarını/cbenv'i taşıma, silme, kopyalama.
- git commit/push YOK.
- Görsellere (afu-character, pet kareleri) dokunma.
- Kapsam dışı dosya değiştirme; değiştirilen dosya listesi SONUC'a.
