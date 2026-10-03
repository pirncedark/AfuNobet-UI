# GÖREV: Commit hazırlık raporu (YALNIZ RAPOR)

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_COMMIT_HAZIRLIK.md (ilk satır `SONUC: TAMAM` veya `SONUC: YARIM - <neden>`)
Log: docs/kanit/commit_hazirlik/log.txt (zaman damgalı ADIM/HATA/SON)

`git status --short` ile ~180 değişikliği sınıflandır:
1. COMMIT: kaynak kod, test, belge, gerekli varlıklar.
2. GITIGNORE: geçici çıktılar (*.log, __pycache__, test*.webp, test_*.py denemeleri, resize_*.py, dist/, garip adlı `UsersafuuuDesktop...` klasörleri vb.).
3. KARAR GEREK: emin olmadıkların (ör. GOREV_*/SONUC_* kökte mi kalmalı, docs/kanit'e mi taşınmalı; ses_deneme/ bilerek dışarıda).
- 10 MB üstü dosyaları ayrıca listele (git'e girmemeli).
- Sır/anahtar/token içerebilecek dosya var mı tara (gitleaks varsa onu kullan, yoksa grep) — bulguyu yaz, içeriği yazma.
- Önerilen .gitignore eklemelerini SONUC'a metin olarak yaz.

YASAK: Hiçbir dosyayı silme/taşıma/değiştirme (rapor ve log hariç). git add/commit/push YOK. .gitignore'u DEĞİŞTİRME.
Kapsam dışı: windows/src-tauri/src/voice/, ses_deneme/ (başka ajan çalışıyor).
