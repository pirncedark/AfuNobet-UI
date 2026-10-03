# GÖREV: Testleri yeşile döndür (DAR KAPSAM, hızlı)

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\windows
Sonuç: ..\SONUC_YESIL.md (ilk satır `SONUC: TAMAM` / `SONUC: YARIM - <neden>`)
Log: ..\docs\kanit\yesil\log.txt

Son iki Gemini işi (SONUC_AKTIVASYON.md, SONUC_BAS_KONUS.md) TAMAM dedi ama doğrulama kırmızı:
1. `node node_modules/typescript/bin/tsc --noEmit`: src/island/island.ts satır 106-107, 277 — `"sor"` IslandViewName tipinde yok. → "sor" görünümünü IslandViewName tipine ekle (ya da doğru görünüm adını kullan); davranışı bozma.
2. `npm test`: 53 kırmızı (tests/arayuz.test.ts 27, tests/chat.test.ts 22, tests/sor_ui.test.ts 3, tests/apps.test.ts 1). Hata türleri:
   - 27× `ReferenceError: window is not defined` → yeni kod modül yüklenirken/kurucuda doğrudan `window` kullanıyor (ör. sağlık şeridi setInterval, health-strip). `typeof window !== "undefined"` korumasıyla veya mevcut zamanlayıcı/olay yardımcılarıyla düzelt; testlerin ortamını değiştirme.
   - 18× `Cannot read properties of undefined (reading 'toggle')` → classList/element henüz yokken erişim; kurucu sırasını düzelt.
   - chat: 'Codex oturumu açık değil.' beklenen 'Soru iletilemedi; yeniden dene.' — yeni giriş kontrolü hata cümlesini değiştirdi; testin beklediği davranış doğruysa kodu, yeni davranış doğruysa testi güncelle (kullanıcıya en anlaşılır tek cümle kalsın) ve gerekçeyi SONUC'a yaz.
   - vi.fn çağrılmadı hataları → aynı kök nedenlerden; tek tek doğrula.
Önce `npm test 2>&1 | tail -80` ile bak, kök nedeni düzelt; test silme/atlama (skip) YASAK.
Son durumda: tsc 0 hata, npm test tümü geçer, `cargo test --offline` geçer (src-tauri). Sayıları SONUC'a yaz.
YASAK: exe paketleme, pet.ts/pet boyutu, görsel/ses dosyaları, island.rs, git, görünür pencere.
