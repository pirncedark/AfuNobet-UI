# GÖREV (gemini): Exe teslimi — indirme bağlantısı düzeltmesi (SONUC_INDIR_KAYIT.md)

Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Animasyon işi bitti (SONUC_ANIM3.md). Kod değişikliği YAPMA, yalnız doğrula + derle + teslim et.
1. windows/ içinde: `node node_modules/typescript/bin/tsc --noEmit` temiz, `npm test` tamamı geçmeli; src-tauri içinde `cargo test --offline` geçmeli. Biri kırmızıysa DUR, SONUC: FARK VAR yaz.
2. Çalışan uygulama exe'yi kilitliyorsa (afunobet-ui-coucou.exe süreci) ÖLDÜRME — DUR ve SONUC: FARK VAR "exe kilitli" yaz.
3. Teslim: mevcut dist/afunobet-ui-coucou.exe → dist/onceki/ (GERI_AL.ps1 çalışır kalsın); windows/ içinde `npm --offline run pack`; yeni exe → dist/afunobet-ui-coucou.exe; `powershell -NoProfile -File kisayol_guncelle.ps1`. SHA256 + tarih + boyut yaz (beklenen < 40 MB).
YASAK: uygulamayı GUI olarak AÇMA, kod/görsel değiştirme, commit/push, Claude çağırma.
Log: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\log\gemini_teslim_indir.log
Çıktı: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\SONUC_TESLIM_INDIR.md ilk satır SONUC: TESLIM_EDILDI | FARK VAR; test çıktıları; exe bilgisi.
Not: tests/character.test.ts 'kompakt ve karşılama durumlarını doğru ayırır' arada düşebiliyor (kararsız); düşerse npm test'i bir kez daha koştur, ikinci de düşerse DUR.
