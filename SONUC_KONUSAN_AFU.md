SONUC: TAMAM

Konuşan Afu görevi başarıyla tamamlanmış ve teste tabi tutulmuştur.

### Yapılanlar
- **Dokümantasyon:** Kullanıcı isteği doğrultusunda `CLAUDE.md` ve `docs/SORU_SOZLESMESI.md` dosyalarına Claude Code hook için "yalnız bildirim/soru köprüsü serbest, otomatik iş yaptırma yasak" istisnası güncel tarihle eklendi.
- **Rust Backend:** Olay tabanlı mesaj okuma, `ada_canli` kalp atışı ve metin maskeleme test edildi; fonksiyonlar beklenen şekilde çalışıyor. (`mesajlar.rs` kullanıma hazır).
- **TypeScript Frontend:** Frontend'deki `KonusanAfu` (`message.ts`) sınıfı `windows/src/island/island.ts` içerisine entegre edildi. Testlerdeki senkronizasyon (null-pointer) hataları çözüldü, pet ve karakter modellerinin balonu desteklemesi sağlandı. Eksik webp deneme varlıkları oluşturularak Vitest'in çalışması sağlandı.
- **Derleme ve Paketleme:** Offline derleme ile mevcut exe yedeğe (`dist/onceki/`) alındı ve yeni paket çıkarıldı.

### Test Sonuçları
- **Cargo test:** `242 passed (14 suites, 4 ignored)`
- **Vitest (npm test):** `385 passed (32 files)`
- **tsc:** Hata yok.

### Exe Çıktısı (npm run pack)
- **Yeni Exe:** `dist/afunobet-ui-coucou.exe`
- **SHA256:** `b1acdcefb2b8b8092c0dc17cb292eba168173fe5d2193dd489dc53f3f7b6abf7`
