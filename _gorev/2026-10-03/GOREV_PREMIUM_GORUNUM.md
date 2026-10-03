# GOREV: Premium karakter gorunumunu bagla (takip sayfasi: "Kodda var, bagli degil")

Tanim: hafif renk filtresi, iki renkli parilti, isikli arka plan, duruma gore kenar rengi. --pet-* CSS degiskenleri style.css de var ama uygulamaya bagli degil.
Yapilacak:
1. windows/src/style.css icindeki --pet-* degiskenlerini ve windows/src/afu/character.ts / island/island.ts durum degisimini bagla: karakterin bulundugu kapta durum sinifi (calisiyor/dusunuyor/hata/basari/onay-bekliyor/bosta) → kenar rengi + parilti degisir.
2. Abartma: filtre hafif; prefers-reduced-motion da animasyonsuz; yuksek DPI (%150) ve mini pet modunda tasma yok (P6 sigdirma bozulmasin).
3. pet.ts e DOKUNMA (baska terminal). Gerekirse yalniz CSS + character.ts + island.ts.
4. Test: durum → sinif eslemesi vitest (en az 6), mevcut pet-sigdir / p8 / q3 testleri yesil kalsin.
5. Kanit: headless ekran goruntusu varsa docs/kanit/premium/ altina (once/sonra), yoksa SONUC a "gorsel kanit yok" yaz.

## Ortak kurallar
- Calisma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
- BASKA BIR TERMINAL AYNI ANDA R3B isini yapiyor: windows/src/message/*, windows/src/question/*, windows/src/afu/pet.ts, notifications ve pet balonu dosyalarina DOKUNMA. Kapsam disi dosya gerekiyorsa SONUC a yaz, degistirme.
- Afu basitlik kurali (AGENTS.md) gecerli: teknik terim yok, tek cumle Turkce mesaj.
- Uygulamada Claude otomatik yedek olarak KULLANILMAZ.
- Exe derleme, commit, push YOK (en sonda Claude yapacak).
- Log: _gorev/2026-10-03/log/<ajan>_<is>.log, zaman damgali ADIM/HATA/SON satirlari.
- Dogrulama (hepsi 0 fail): windows icinde `npx tsc --noEmit` + `npx vitest run`; windows/src-tauri icinde `cargo test --offline`; kokte `python -m pytest -q tests`. Kirmizi baska seridin (R3B) dosyasindan geliyorsa SONUC a yaz, onlari duzeltme.

## SONUC
_gorev/2026-10-03/SONUC_PREMIUM_GORUNUM.md ilk satir `SONUC: TAMAM - ...` / `SONUC: YARIM - ...`.
