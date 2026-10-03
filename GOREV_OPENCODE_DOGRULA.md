# GOREV (opencode): Faz A bagimsiz test ve exe dogrulamasi

Calisma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Codex'in SONUC_FAZ_A_SON.md raporunu BAGIMSIZ dogrula. Kod degistirme; yalniz komut kos ve rapor yaz. Yeni pencere acma (exe'yi GUI olarak calistirma). Commit/push yok.

1. windows/ icinde: npm test (veya package.json test betigi), cargo test (src-tauri, TAMAMI), repo kokunde python -m pytest -q. Her birinin gecen/kalan sayisini ve cikis kodunu aynen yaz.
2. Exe: SONUC_FAZ_A_SON.md'deki exe yolu, tarihi, SHA256'sini kendin olc ve karsilastir. dist/onceki/ icinde onceki exe var mi.
3. Masaustu kisayolu (C:\Users\afuuu\Desktop\*.lnk icinde AfuNobet/Afu adli olan) hangi exe'yi gosteriyor (PowerShell WScript.Shell ile TargetPath oku).
4. Cikti: SONUC_OPENCODE_DOGRULA.md, ilk satir SONUC: UYUMLU veya SONUC: FARK VAR (+ farklar). Komut ciktilarini kanit olarak ekle; kosmadigin seyi gecti yazma.
