# ORTAK KURALLAR — Toplu bitirme turu (2 Eki akşam)
Depo: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI (AfuNöbet işi hariç). Plan: docs/superpowers/plans/2026-10-01-afunobet-ui-tum-fazlar.md (Faz E + Faz F tabloları). Önce kendi maddelerinin mevcut durumunu grep ile ölç; zaten yapılmışsa "VARDI" yaz, yeniden yapma.
Aynı anda 5 ajan çalışıyor. DOSYA SAHİPLİĞİ (yalnız kendi dosyalarına yaz; yeni dosya serbest):
- OPUS-PROTOKOL: src-tauri/src/protokol*.rs, src-tauri/src/ipc*.rs, src/core/state.ts, src/core/protokol*.ts, scripts/ (köprü/hook betikleri)
- OPUS-ARAYUZ: src/views/*, src/style.css, src/core/layout.ts, src/core/labels*/i18n
- CODEX-SISTEM: src-tauri/src/tray*.rs, bildirim/ses/servis/hook_kur/kimlik rust dosyaları, public/ses/
- GEMINI-ETKILESIM: src/island/*, src/afu/* (pet.ts, character.ts), src/main.ts, tests/character.test.ts
- Ortak dosyalar (lib.rs, Cargo.toml, package.json, index.html): yalnız EKLEME, düzenlemeden hemen önce yeniden oku, küçük parça; başkasının satırını silme.
Her madde için test (TDD). Sonda: windows/ içinde `node node_modules/typescript/bin/tsc --noEmit` + `npm test`; src-tauri içinde `cargo test --offline`. Başka ajanın yarım değişikliği yüzünden kırmızı olursa kendi testlerini ayrı koştur ve bunu SONUC'a yaz.
Agent aracın varsa işini paralel alt ajanlara böl (aynı dosyayı ikiye verme).
YASAK: exe derleme (npm run pack), GUI/uygulama açma, süreç öldürme (PID dışında), commit/push, ücretli API, Claude çağırma, ses_deneme klasörü, afu-character görselleri, kullanıcı ayar dosyalarını değiştirme (%LOCALAPPDATA%, ~/.claude/settings.json — yalnız test kopyası).
Basitlik kuralı: ana ekran sade; ayrıntı tıklanınca; teknik terim yok; uydurma sayı yok (okunamazsa gizli veya "?").
Log: _gorev/20261002/log/<ajan>_<is>.log zaman damgalı ADIM/HATA, sonda SON:. Çıktı: SONUC dosyası ilk satır `SONUC: TAMAM|YARIM`, madde başına: durum (YAPILDI/VARDI/YAPILAMADI+neden), dosya:satır, test adları.
