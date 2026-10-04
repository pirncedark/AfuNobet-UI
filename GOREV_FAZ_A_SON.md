# GÖREV: AfuNobet-UI — Faz A son eksikler (2 Eki 2026)

Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Önce oku: SONUC_FAZ_A_DEVAM.md, docs/ILERLEME_MASTER.md (A1–A19 tablosu), GOREV_A14_KESIM.md.

KURALLAR: Claude çağırma. commit/push YOK. Yeni pencere açma. Ücretli API yok. `ses_deneme/` klasörüne DOKUNMA (orada ses ajanı çalışıyor). Kanıtsız "tamam" yok.

## 1 — A13/A19: Rust test takımının tamamı geçsin
Şu an tam `cargo test` voice testinde `ModelMissing` ile Exit 101 veriyor. Sebebi bul. Model dosyası yoksa test ortamında bu durum beklenen davranışsa testi model yokken anlamlı şekilde atlayacak/sahte modelle çalışacak hale getir (testi silme, gerçek hatayı gizleme). Uygulamada model yoksa kullanıcıya tek cümle Türkçe mesaj göstermeli, çökmemeli. Tam `cargo test` çıktısını kanıt olarak yaz.

## 2 — A14: Pet bakış kareleri
İki bakış karesi aynı yöne bakıyor. Sol/sağ bakış karelerini doğru yöne düzelt (aynalama ile mümkünse kalite kaybı olmadan; alfa, boyut, hizalama korunmalı). 50 karelik kontrolü yeniden koş, sonucu yaz.

## 3 — Teslim
Testler (TS, Python, Rust tamamı) yeşil → exe yeniden derle → önceki çalışan exe'yi `dist/onceki/` altında sakla (tek hareketle geri alınabilsin) → masaüstü kısayolunu yeni exe'ye güncelle (kisayol_guncelle.ps1) → exe SHA256 ve tarih yaz. docs/ILERLEME_MASTER.md'de A13, A14, A19'u güncelle.

## Çıktı
SONUC_FAZ_A_SON.md: ilk satır `SONUC: TAMAM` veya `SONUC: YARIM` + kanıtlar + Kapı 1 için kullanıcının deneyeceği kısa kontrol listesi (Türkçe, madde madde).
