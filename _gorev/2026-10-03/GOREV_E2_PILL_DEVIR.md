# GOREV: E2 Ajan pill sistemi + Ajan devri gosterimi (takip sayfasi: ikisi de "Henuz yok")

## 1) E2 Ajan pill sistemi
Her ajana (CODEX, GEMINI, OPENCODE, GLM ve protokolden gelen yeni ajanlar) gorsel kimlik: kucuk yuvarlak "pill" = ajan rengi + kisa ad + durum noktasi.
- Calisan ajan: canli renk + hafif nabiz; son 24 saatte kullanilmis ama su an calismayan: soluk "bosta" (idle).
- Hic gorulmemis ajan pill gostermez. Renk/ad eslemesi tek yerde (ornek windows/src/core/ajan_kimlik.ts).
- Mevcut "Aktif ajan sekmeleri" ve gorev kartindaki ajan adi bu pill i kullansin. Veri: mevcut state.ts / protokol.ts (E1 ortak olay formati). Yeni veri kaynagi icat etme.

## 2) Ajan devri gosterimi
State/olaylarda bir isin ajani degistiginde ya da rate_limit olayi geldiginde kartta tek satir:
"Codex kotasi doldu → Gemini devraldi" ya da devralan yoksa "Codex kotasi doldu · bekliyor (yenilenme HH:MM)" (saat biliniyorsa).
- Claude asla devralan olarak gosterilmez ve onerilmez (2 Eki karari).
- Veri yoksa satir hic gorunmez (uydurma yok). Kaynak: state.json is kaydindaki ajan gecmisi / rate_limit olaylari; alan yoksa AfuNobet ui_state uretecini (../AfuNobet/afu/ui_state.py) OKU, oradaki alanlari kullan; gerekirse yalniz UI tarafinda turet.

## Test
- Yeni vitest: pill renk/durum (calisiyor/bosta/hic), devir satiri (devraldi/bekliyor/veri yok/Claude asla) — en az 10 test.
- scripts/sahte_olay.py ye "codex_kota_gemini_devir" senaryosu ekle (E10 sahte mod) ve bir testte kullan.

## Ortak kurallar
- Calisma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
- BASKA BIR TERMINAL AYNI ANDA R3B isini yapiyor: windows/src/message/*, windows/src/question/*, windows/src/afu/pet.ts, notifications ve pet balonu dosyalarina DOKUNMA. Kapsam disi dosya gerekiyorsa SONUC a yaz, degistirme.
- Afu basitlik kurali (AGENTS.md) gecerli: teknik terim yok, tek cumle Turkce mesaj.
- Uygulamada Claude otomatik yedek olarak KULLANILMAZ.
- Exe derleme, commit, push YOK (en sonda Claude yapacak).
- Log: _gorev/2026-10-03/log/<ajan>_<is>.log, zaman damgali ADIM/HATA/SON satirlari.
- Dogrulama (hepsi 0 fail): windows icinde `npx tsc --noEmit` + `npx vitest run`; windows/src-tauri icinde `cargo test --offline`; kokte `python -m pytest -q tests`. Kirmizi baska seridin (R3B) dosyasindan geliyorsa SONUC a yaz, onlari duzeltme.

## SONUC
_gorev/2026-10-03/SONUC_E2_PILL_DEVIR.md ilk satir: `SONUC: TAMAM - <test sayilari>` ya da `SONUC: YARIM - <neden>`. Degisen dosyalar + kanit (test adlari) listele.
