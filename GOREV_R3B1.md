# GOREV R3B1 (tek iş, ~8 dk): pet modunda mesaj balonda temiz görünsün
Ana: GOREV_R3_MESAJ_PET_BICIMI.md "Davranış 2". windows/src/message/bicim.ts hazır (bicimle()).
Yap: mini pet modundayken gelen mesaj, petin başının üstündeki balonda (P10 balonu) bicimle() çıktısıyla görünür: başlık + en fazla 3 madde. Kart kendiliğinden açılmaz, balona tıklanınca açılır ve tam metin "Ayrıntı" altında görünür. Bildirim türünde 8 sn sonra kapanır (notifications.ts mevcut).
Test (vitest): pet modunda bildirim → balon metninde ━ ya da ` yok, kart kapalı; balona tık → kart açık.
Kurallar: island.rs değişmez, git/exe yok. Doğrula: windows içinde tsc + vitest → 0 fail.
Sonuç: SONUC_R3B1.md ilk satır "SONUC: TAMAM - ..." / "SONUC: YARIM - neden".
