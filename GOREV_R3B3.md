# GOREV R3B3 (tek iş, ~5 dk): kısa bildirim sekmelerin üstüne binmesin + son doğrulama
Ana: GOREV_R3_MESAJ_PET_BICIMI.md "Davranış 4-5". "Mini pet açık" gibi kısa bildirim (toast) sekme/düğme satırının üstüne biniyor.
Yap: toast kartın en altında boş alana ya da sekmelerin üstünde ayrılmış satıra yerleşsin; hiçbir düğmeyi örtmesin. Balonda yol/komut maskelenir (mevcut maskeleme).
Test (vitest DOM): toast dikdörtgeni sekme düğmeleriyle kesişmez.
Son doğrulama: KOK'te python -m pytest -q tests ; windows içinde tsc + vitest ; windows/src-tauri içinde cargo test --offline → hepsi 0 fail.
Sonuç: SONUC_R3.md İLK SATIRI "SONUC: TAMAM - ..." ya da "SONUC: YARIM - neden" (dosyanın üstüne yaz). Git/exe yok.
