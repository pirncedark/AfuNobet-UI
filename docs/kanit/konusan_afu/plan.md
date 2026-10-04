# Konuşan Afu uygulama planı

Kaynak şartname: GOREV_KONUSAN_AFU.md (kullanıcının tüm adımları uygulama yetkisi).
Git, kurulum, görünür pencere ve yasak dosya işlemleri yapılmaz.

1. Standart kütüphaneli Claude köprüsü ve pytest (alt ajan; yalnız betikler/testler).
2. Rust: mesaj doğrulama/maskeleme, olay tabanlı mesaj bildirimi, tüketme komutu ve 3 saniyelik kalp atışı.
3. TypeScript: tek balon, 8 saniye, görünmezken en fazla 5 mesaj, tıklamada tam metin kartı; eski kareye CSS tepkisi.
4. Durum değişimlerinden Codex/Gemini/OpenCode mesajları; bağlantı satırı ve tek seferlik ipucu.
5. Pytest, Vitest, tsc, çevrimdışı Cargo test, eski exe yedeği ve çevrimdışı pack, SHA256 ve sonuç dosyası.

Arabirim: mesajlar_list komutu sürüm 1 mesaj listesi döndürür; afu-mesajlar olayı listeyi yeniden okumayı tetikler. Dosyalar yalnız komut tükettiğinde silinir; ön yüz hazır değilken mesaj kaybolmaz.
Karar: pet 128x128 boyutu korunur; konuşma katmanı mevcut kutunun üst bölümünde gösterilir. Gizlenince aktif mesaj kalan süresiyle bekletilir. Teknik kurulum terimleri yalnız depo belgesinde bulunur.
Karar: kullanıcı ayrıntılı şartnameyi uygulamayı istediği için tasarım onayı tekrar istenmez; git/worktree işlemleri açıkça yasak olduğu için beceri git adımları uygulanmaz.

| Adımlar | Paylaşılan sözleşme | Denetim |
|---|---|---|
| 1 / 2 | kök, 64 KiB, surum/id/ajan/tur/metin/zaman | soru sözleşmesi ve görevle uyumlu |
| 2 / 3 | mesajlar_list ve afu-mesajlar | tek tüketici, olaydan sonra atomik dosya okunur |
| 3 / 4 | mesaj modeli | yalnız desteklenen ajanlar, 5 dakikalık tazelik |
| 5 | tüm adımlar | testler tamamlanmadan TAMAM yazılmaz |
