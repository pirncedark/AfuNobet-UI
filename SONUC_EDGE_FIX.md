# Üst kenar / mini pet / içerik genişliği — sonuç

Kullanıcı kararı: fare panelden ayrılınca mini pete geçsin; üst kenara gelince panel otomatik açılsın.

Uygulanan düzeltmeler:
- Gizli, mini pet ve tray modlarında mevcut native poll thread düşük sıklıkla monitörün fiziksel üst kenarını kontrol ediyor; girişte edge-wake olayı gönderiyor. Aynı noktada bekleyen fare tekrar olay üretmiyor; sürüklemede uyanma yok.
- Native edge-wake ve kompakt çubuk hover tam panel açıyor. Fare üzerindeyken kapanma timerı iptal ediliyor; mini petten dönüşte hover durumu korunuyor.
- Panel genişliği görünen metin ölçüsünden hesaplanıyor; mevcut native pencere/ekran sınırında büyüyor, ekranı aşmıyor.

Doğrulama:
- Frontend: 78 dosya / 931 PASS, 0 FAIL. Log windows/test-results/edge-full-tests.log.
- Native kenar: 3 PASS. Log windows/test-results/edge-root-rust.log.
- İlk paralel tam Rust testi IPC testinde zamanlama hatası verdi; tek test tekrarında PASS. Tam seri takım: 285 PASS / 9 ignored, Exit0. Kanıt edge-ipc-recheck.log ve edge-full-rust-serial.log.
- TypeScript/Vite ve Tauri release build Exit0: edge-exe-build.log.
- Headless: 60 ekran / 0 sorun, Exit0: edge-tarama.log.

EXE: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\dist\afunobet-ui-20261004-083716.exe
Boyut: 36878336 bayt.
SHA256: 7D407AB2C0CCD14AEB5EB3FB3DE49203654448137FBECA0366E32BFD84B4BCB6
Masaüstü kısayolu: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\dist\afunobet-ui-20261004-083716.exe, hedef yeniden okunarak doğrulandı.
Önceki sürüm ve kısayol yedeği korunuyor. EXE başlatılmadı; gerçek Windows hover/kapanma/çoklu monitör kabulü kullanıcı testidir (UNVERIFIED). Commit/push yapılmadı.
