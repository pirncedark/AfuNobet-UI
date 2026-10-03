# GOREV: Takip sayfasında 5 eski maddeyi gerçeğe uydur
Dosya: docs/kanit/ozellik/ozellikler.html (yalnız bu dosya; F dizisi ve TEST nesnesi).
Bu gece biten işlerin SONUC dosyaları var ama sayfada hâlâ "unk"/"build" görünüyorlar:
- "%150 ölçekte erişilebilirlik" → SONUC_Q3.md
- "Modal davranışı" ve "Klavye erişilebilirliği" → SONUC_Q2.md
- "Uzun metin kontrolü" ve "TR/EN dayanıklılığı" → SONUC_Q1.md
- "E10 Sahte test modu" → SONUC_Q5.md
Her biri için ilgili SONUC dosyasının ilk satırı "SONUC: TAMAM" ise durumu "ok" yap, kanıt sütununa SONUC dosya adını yaz, TEST nesnesine "test edilecek" ekle. TAMAM değilse dokunma ve nedenini sonuç dosyasına yaz.
Yeni 2 madde ekle (durum "build", kanıt SONUC_R1.md / SONUC_R3A.md): "Mesaj gelince öne gel" (Pet ve pencere) ve "Pete uygun mesaj biçimi" (Etkileşim).
Doğrula: node ile sayfadaki script sözdizimini kontrol et (new Function ile F ve TEST ayrıştırılabilir olmalı).
Sonuç: SONUC_SAYFA_ESKI5.md ilk satır "SONUC: TAMAM - X madde guncellendi" ya da "SONUC: YARIM - neden".
