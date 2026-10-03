# GÖREV: Özellik durum sayfasını kanıtla güncelle

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Dosya: docs/kanit/ozellik/ozellikler.html (yalnız bunu düzenle)
Sonuç: SONUC_OZELLIK_DURUM.md (ilk satır `SONUC: TAMAM` veya `SONUC: YARIM - <neden>`)
Log: docs/kanit/ozellik/log.txt (zaman damgalı ADIM/HATA/SON)

Sayfa 17:19'daki halinde kaldı; sonrasında E1–E12 ve F1–F18 işleri yapıldı ama sayfa güncellenmedi. 21 madde "no" (Henüz yok), bazıları "build"/"unk".

Yapılacak:
1. Script içindeki `F` dizisinde durumu "ok" OLMAYAN HER madde için kodda/testte kanıt ara: ../_gorev/20261002/SONUC_T_*.md, SONUC_TESLIM_TOPLU.md, SONUC_T_PROTOKOL.md, SONUC_TASIMA.md, docs/ILERLEME_MASTER.md, windows/src, windows/src-tauri/src, windows/tests.
2. Durum kuralı: kod + test var ve exe'de (dist 23:24 exe derlemesine dahil) → "ok"; kod var ama bağlı/çalışmıyor → "build"; kanıt yok → olduğu gibi bırak. UYDURMA YOK: her değişen maddenin 5. alanına (kanıt) dosya:fonksiyon veya test dosyası yaz.
3. TEST nesnesi: yeni "ok" olanlara "test edilecek" ekle (kullanıcı henüz gerçek tıklamayla denemedi). Mevcut "sen denedin" etiketlerini değiştirme.
4. Yeni maddeler ekle: "Ses taşınabilirliği" (ok, SONUC_TASIMA.md), "Mini pet yeni animasyonlar" (work, Codex yapıyor), "Menü sekmeleri eski haline" (work, Codex yapıyor).
5. Üst bilgi: `.meta` satırını "exe 23:24 · SHA 8aa3d7c9…", "354 TS + 237 Rust testi geçti" yap; lede'deki "Son güncelleme" → "2 Eki 23:40".
6. HTML/JS sözdizimini bozma: `node -e` ile script bloğunu ayıklayıp `new Function` ile derlet; F dizisi sayısını ve durum dağılımını SONUC'a yaz (önce/sonra, değişen madde listesi + kanıt).

YASAK: başka dosya değiştirme, git yok, kod dosyalarına dokunma (Codex aynı anda windows/src içinde çalışıyor).
