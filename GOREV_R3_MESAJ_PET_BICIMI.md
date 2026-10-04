# GOREV R3: Terminal mesajları pete uygun biçimde, pet halindeyken görünsün ve cevap beklesin

Önce CLAUDE.md, GOREV_AFU_TEMEL.md, AFU_CHANGES.md, docs/SORU_SOZLESMESI.md, SONUC_R1.md oku. R1 (mesajda öne gel) yeni bitti; üstüne kur, bozma.

Kullanıcı isteği (3 Eki, ekran görüntüsüyle): "Mesajlar pete uygun hale dönüştürülsün, pet halindeyken görünsün ve sende cevap beklesin."

Ekran görüntüsünde görülen sorun: Claude mesajı kartta ham terminal biçimiyle çıkıyor. İçinde `━━━━` çizgileri, `1` `2` madde numaraları (inline code), emoji başlık, **kalın** işaretleri var ve uzun paragraf halinde akıyor. Ayrıca "Mini pet açık" bildirimi sekmelerin üstüne biniyor.

## 0. ÖNCE R1 hatasını düzelt (kritik)
windows/src/message/notifications.ts updateWindow(): mesaj kapanınca `setAlwaysOnTop(false)` + `hide()` çağırıyor. Pet/ada AYNI pencerede ve normalde zaten üstte (WS_EX_TOPMOST, dpi.rs:180). Sonuç: her mesajdan sonra pet kaybolur ve üstte kalma bozulur.
Düzeltme: mesaj açılmadan ÖNCEKİ pencere durumunu (görünür mü, üstte mi) kaydet; kapanınca AYNEN geri yükle. Pencere zaten görünür ve üstteyse hiçbir şey kapatma. hide() yalnız pencere mesajdan önce gizliyse çağrılır. Bunun için vitest: "pet modu üstte + görünür → bildirim → 8 sn sonra hâlâ üstte + görünür".

## Davranış
1. Pete uygun biçim: mesaj, gösterilmeden önce saf bir dönüştürücü fonksiyondan geçer. Bu fonksiyon `━─═` süs çizgilerini, markdown işaretlerini (`**`, `` ` ``, `#`), baştaki emoji başlık süsünü ve ANSI kodlarını atar. Kalan metin: tek satır başlık + en fazla 3 kısa madde (her biri ≤ 60 karakter, fazlası "…"). Uzun mesajın tamamı kartta "Ayrıntı" altında, temiz metin olarak durur.
2. Pet halinde görünme: pencere mini pet modundayken mesaj, petin başının üstündeki balonda görünür (P10 balonu). Kart açılmaya zorlanmaz. Balona tıklayınca kart açılır, tam metin görünür.
3. Cevap bekleme: mesaj soru ise (❓ satırı, "1 = … / 2 = …" seçenekleri ya da SORU_SOZLESMESI sorusu) balonda seçenek düğmeleri ve kısa cevap alanı çıkar. Balon, kullanıcı cevap verene ya da × ile kapatana kadar kalır (P11). Cevap yalnız mevcut sözleşmeyle yazılır: codex/gemini/opencode için cevaplar/<id>.json; Claude için mevcut köprü yolu. Bildirim ise R1'deki gibi 8 sn sonra kendiliğinden kapanır.
4. "Mini pet açık" gibi kısa bildirimler sekmelerin/düğmelerin üstüne binmez. Boş alana ya da kartın en altına yerleşir.
5. Afu basitlik kuralı: teknik terim, yol ya da komut balonda görünmez (mevcut maskeleme kullanılır).

## Kurallar
- windows/src-tauri/src/island.rs bayt bayt DEĞİŞMEZ. Claude otomatik görev yürütme YASAK; yalnız bildirim/soru köprüsü.
- Süreç kontrolü, ağ, model API'si, sır yok. Görünür test penceresi yok.
- Testler (vitest): dönüştürücü için örnekler. Biri ekran görüntüsündeki metin: başlık "Commit atıldı: 0068b0a" + 3 madde, içinde ━ ya da ` olmayacak. Ayrıca soru algılama (❓ ve "1 = / 2 =") ve pet modunda balon gösterimi. Bildirimin sekmeyle çakışmadığını DOM ölçüsüyle test et.

## Doğrula
python -m pytest -q tests ; windows içinde npx tsc --noEmit ; npx vitest run ; windows/src-tauri içinde cargo test --offline. Hepsi 0 fail.
Exe, git ve commit YOK.

Sonuç: SONUC_R3.md. İlk satır "SONUC: TAMAM - ..." ya da "SONUC: YARIM - neden". Altına değişen dosyalar ve tek cümlelik elle deneme adımı.
Log: _gorev/2026-10-03/log/codex_r3_mesaj_pet.log (zaman damgalı ADIM/HATA/SON).
