# GOREV (yalniz DOGRULAMA, kod yazma yok): 3 maddenin gercekten bitip bitmedigini kanitla

Maddeler (takip sayfasinda yesil degiller):
A) "Mesaj gelince one gel" — SONUC_R1.md TAMAM diyor. Ilgili testleri bul ve kos (notifications.test.ts, pet-bildirim-sekme.test.ts vb.).
B) "Codex ile giris + bas-konus" — SONUC_BAS_KONUS.md TAMAM diyor ama vitest kirmizilarindan soz ediyor. chat.test.ts, voice.test.ts, afu_voice.test.ts, sor_ui.test.ts kos.
C) "Bas-konus ve ses" — docs/ses-uygulama/SONUC_*.md oku; ses testlerini kos.
Her madde icin: ilgili kaynak dosyalarin son degisim saati vs dist/afunobet-ui-yeni.exe saati (12:20) → "exe de var" mi "yeni exe gerek" mi.
Kod DEGISTIRME. Sadece komut kos ve rapor yaz.

## Ortak kurallar
- Calisma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
- BASKA BIR TERMINAL AYNI ANDA R3B isini yapiyor: windows/src/message/*, windows/src/question/*, windows/src/afu/pet.ts, notifications ve pet balonu dosyalarina DOKUNMA. Kapsam disi dosya gerekiyorsa SONUC a yaz, degistirme.
- Afu basitlik kurali (AGENTS.md) gecerli: teknik terim yok, tek cumle Turkce mesaj.
- Uygulamada Claude otomatik yedek olarak KULLANILMAZ.
- Exe derleme, commit, push YOK (en sonda Claude yapacak).
- Log: _gorev/2026-10-03/log/<ajan>_<is>.log, zaman damgali ADIM/HATA/SON satirlari.
- Dogrulama (hepsi 0 fail): windows icinde `npx tsc --noEmit` + `npx vitest run`; windows/src-tauri icinde `cargo test --offline`; kokte `python -m pytest -q tests`. Kirmizi baska seridin (R3B) dosyasindan geliyorsa SONUC a yaz, onlari duzeltme.

## SONUC
_gorev/2026-10-03/SONUC_DOGRULA_KALAN.md: her madde icin tek satir `A: YESIL|KIRMIZI|BELIRSIZ - test adlari + sayilar - exe: var|yeni gerek`. Ilk satir `SONUC: TAMAM` (rapor bitti demek) ya da `SONUC: YARIM - neden`.
