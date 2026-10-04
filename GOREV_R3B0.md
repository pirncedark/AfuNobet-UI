# GOREV R3B0 (tek iş, ~5 dk): kırık 2 testi onar
Yarım kalan R3 turları 2 testi kırdı:
- windows/tests/p8_kart_buyut.test.ts:87 — CSS'te `.health-strip{display:flex` bekleniyor, yok.
- windows/tests/pet-kirpma.test.ts:39 — pet geometrisi [0,0,256,256] beklentisi tutmuyor.
Testi DEĞİŞTİRME ya da atlama; kaynağı (style.css / ilgili ts) testin beklediği doğru davranışa geri getir. Gerekirse `git diff -- windows/src` ile neyin bozulduğunu gör.
Doğrula: windows içinde npx tsc --noEmit ; npx vitest run → 0 fail.
Sonuç: SONUC_R3B0.md ilk satır "SONUC: TAMAM - vitest X gecti 0 kaldi" ya da "SONUC: YARIM - neden". Git/exe yok.
