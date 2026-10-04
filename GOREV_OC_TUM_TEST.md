# GÖREV (OpenCode): Takip sayfasındaki TÜM "test edilecek" özellikleri test et

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_OC_TUM_TEST.md — İLK SATIR `SONUC: TAMAM` / `SONUC: YARIM - <neden>`.
Kaynak liste: docs/kanit/ozellik/ozellikler.html → script içindeki `TEST` nesnesinde "test edilecek" olan HER özellik + `F` dizisinde "ok"/"build" olanlar.

Her özellik için:
1. Otomatik doğrulanabilir mi? (vitest, pytest, cargo test, başsız tarayıcı görüntüsü). Evetse testi YAZ: yeni dosyalar `windows/tests/tum_ozellik_*.test.ts` / `tests/test_tum_ozellik_*.py` (mevcut testleri DEĞİŞTİRME). Görüntü kanıtı → docs/kanit/tum_test/<özellik>.png.
2. Sonucu `docs/kanit/tum_test/rapor.md` tablosuna yaz: | Özellik | Test türü | Sonuç (GEÇTİ / KALDI / YALNIZ ELLE) | Kanıt dosyası | Not |
3. "YALNIZ ELLE" (gerçek mikrofon, gerçek Codex girişi, gerçek Windows görev çubuğu gibi) olanlar için kullanıcının 1 dakikada yapacağı tek cümlelik kontrol adımını yaz.
4. KALDI olan her madde için: kaynak kodu DEĞİŞTİRME; "olası hata: …" + kanıt.
5. Son: cd windows; node node_modules/typescript/bin/tsc --noEmit; npm test; cd ..; python -m pytest -q tests — çıktı son satırlarını SONUC'a AYNEN yapıştır.
YASAK: src/ değişikliği, exe, git, görünür pencere, gerçek state.db/state.json yazma. Okuduktan sonra DURMA; uzun sürerse en önemli 15 özellikle başla, kalanını SONUC'ta listele.
