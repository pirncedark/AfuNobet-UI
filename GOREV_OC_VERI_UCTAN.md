# GÖREV (OpenCode): AfuNöbet → Ada veri uçtan uca doğrulama (YALNIZ test)

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_OC_VERI.md — İLK SATIR `SONUC: TAMAM` / `SONUC: YARIM - <neden>`; altına koştuğun komutların çıktısının son satırlarını AYNEN yapıştır.

1. Oku: ..\AfuNobet\SONUC_UI_VERI.md (AfuNöbet state.json'a stage/model/effort/handoff/context/cost ekledi) ve SONUC_F1_F5.md (ada bu alanları gösteriyor).
2. GEÇİCİ klasörde (scratch, AfuNobet'in gerçek state.json/state.db'sine DOKUNMA): ..\AfuNobet\afu\ui_state.py ile sahte bir job (çalışıyor, model=gpt-x, effort=high, handoff codex→gemini) içeren state.json üret.
3. Bu state.json'u adanın ayrıştırıcısına ver: YENİ test `windows/tests/veri_uctan.test.ts` (mevcut testleri değiştirme) — üretilen JSON dosyasını fixture olarak `windows/tests/fixtures/state_uctan.json`'a kopyala; testte state.ts ayrıştırıcısı + görünüm: aşama çubuğu görünür, model/effort gri yazı, devir satırı "Codex … → Gemini …", Claude hedefli devir gösterilmez.
4. Bir alan adı uyuşmazsa testi zorlama: SONUC'a "UYUŞMAZLIK: AfuNöbet X yazıyor, ada Y bekliyor" yaz.
5. `cd windows; node node_modules/typescript/bin/tsc --noEmit; npm test`.
YASAK: src/ ve ..\AfuNobet\afu kaynak değişikliği, gerçek state.json, supervisor'a dokunma, git, exe, görünür pencere. Görev dosyasını okuduktan sonra DURMA; işi bitir.
