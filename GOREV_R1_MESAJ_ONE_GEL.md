# GOREV R1: Terminalden mesaj gelince pencere öne gelsin, sonra arka plana dönsün

Önce CLAUDE.md, GOREV_COUCOU_AFU.md, AFU_CHANGES.md, docs/SORU_SOZLESMESI.md oku.

Kullanıcı isteği (3 Eki): "Terminalden bir mesaj geldiğinde AfuNobet UI en üste gelsin, mesajı kişiye sorsun ya da bildirsin, sonra yine arka plana dönsün."

## Davranış
1. Yeni mesaj geldiğinde AfuNobet UI penceresi kısa süre en üste gelir: Claude köprü hook'u bildirimi/sorusu ya da sorular/*.json içindeki codex/gemini/opencode sorusu. Pet ve kart görünür, mesaj balonu ya da soru kartı açık olur. Pencere görünür değilse görünür yapılır.
2. Soru ise kullanıcı cevap verene ya da kartı kapatana kadar üstte kalır. Cevap yalnız mevcut sözleşmeyle yazılır (cevaplar/<id>.json).
3. Yalnız bildirim ise 8 sn sonra ya da × ile kapatınca pencere eski durumuna döner (always-on-top kapanır). Önceki odak elden geldiğince geri verilir. Kullanıcının o an yazdığı pencerenin odağını ÇALMA: tercihen always-on-top + görünür yap, odak zorlama yok.
4. Aynı mesaj iki kez tetiklemez (id ile tekilleştir). Art arda gelen mesajlar kuyruğa girer, sırayla gösterilir.
5. Ayarlarda tek anahtar: "Mesaj gelince öne gel" (varsayılan AÇIK). Afu basitlik kuralı geçerli: teknik terim yok.

## Kurallar
- windows/src-tauri/src/island.rs bayt bayt DEĞİŞMEZ. Pencere işini başka modülde ya da ön yüzde Tauri pencere API'siyle yap.
- Yeni süreç kontrolü, model API'si, ağ, sır yok. Claude otomatik görev yürütme YASAK (yalnız bildirim/soru köprüsü).
- Görünür test penceresi açma. Testler başsız: vitest (kuyruk/tekilleştirme/zamanlayıcı/ayar) ve gerekiyorsa Rust birim testi.

## Doğrula
python -m pytest -q tests ; windows içinde npx tsc --noEmit ; npx vitest run ; windows/src-tauri içinde cargo test --offline. Hepsi 0 fail.
Exe derleme, git ve commit YOK.

Sonuç: SONUC_R1.md. İlk satır "SONUC: TAMAM - ..." ya da "SONUC: YARIM - neden". Altına değişen dosyalar ve elle deneme adımı (tek cümle).
Log: _gorev/2026-10-03/log/codex_r1_mesaj_one_gel.log (zaman damgalı ADIM/HATA/SON).
