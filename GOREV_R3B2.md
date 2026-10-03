# GOREV R3B2 (tek iş, ~8 dk): soru mesajı balonda cevap beklesin
Ana: GOREV_R3_MESAJ_PET_BICIMI.md "Davranış 3". bicim.ts soru algılıyor.
Yap: mesaj soru ise (❓ ya da "1 = … / 2 = …") pet balonunda seçenek düğmeleri + kısa cevap alanı çıkar; balon cevap ya da × ile kapanana kadar kalır (P11). Cevap mevcut yolla yazılır (codex/gemini/opencode: cevaplar/<id>.json; Claude: mevcut köprü). Yeni yazma yolu EKLEME.
Test (vitest): soru → seçenek düğmeleri görünür, 30 sn sonra hâlâ açık; seçeneğe tık → cevap fonksiyonu doğru id ve değerle çağrılır, balon kapanır.
Kurallar: island.rs değişmez, git/exe yok. Doğrula: windows içinde tsc + vitest → 0 fail.
Sonuç: SONUC_R3B2.md ilk satır "SONUC: TAMAM - ..." / "SONUC: YARIM - neden".
