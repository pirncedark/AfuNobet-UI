# GÖREV: Kullanıcının stüdyo tasarımını uygulamada çalışır hale getir

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_STUDYO_UYGULA.md (ilk satır `SONUC: TAMAM` / `SONUC: YARIM - <neden>`)
Log: docs/kanit/studyo_uygula/log.txt

Durum: Claude, kullanıcının stüdyoda hazırladığı `docs/kanit/anim_studyo/birlesik_0110.json` dosyasını `python studyo/uygula.py ... --yaz` ile windows/src/afu/pet.ts'e uyguladı (önceki hali: docs/kanit/anim_studyo/pet.ts.once-0115). Kullanıcı tasarımı ARTIK DOĞRU KAYNAK: mini pet bazı sekanslarda yeni `durum/*` animasyonlarını, bazılarında eski kareleri kullanıyor; PET_AYAR ile sekans başına ölçek/konum; normalize açık.

Sorunlar:
1. tsc: `src/afu/pet.ts(6,1): 'T' is declared but its value is never read` → kullanılmayan importu kaldır (ya da T'yi sürelerde koru) — kullanıcının ms değerlerini DEĞİŞTİRME.
2. 7 vitest kırmızı (tests/pet-geri.test.ts, tests/pet.test.ts): eski sekansları/zamanlamayı birebir bekliyorlar. Testleri YENİ tasarıma göre güncelle (kullanıcı tasarımı doğru kabul). AMA "every sequence references actual cut assets" testi gerçek bir hatayı da gösterebilir: `durum/ad` kare adlarının uygulamada `/afu/durum/ad.webp` yoluna, eski karelerin `/afu/pet/ad.webp` yoluna çözüldüğünü KOD üzerinden doğrula; çözülmüyorsa pet.ts'teki yol çözümünü düzelt (ön yükleme dahil). Tüm kareler gerçek dosyaya çözülmeli.
3. PET_AYAR (ölçek/x/y) ve normalize dönüşümü gerçekten uygulanıyor mu (görsel stilinde) — başsız tarayıcıda pet bileşenini sahte olaylarla render edip doğrula; ekran görüntüsü docs/kanit/studyo_uygula/.
4. Sürükle-bırak-dön (surukleme/geri_donus/yaslanma) ve tek tık kart açma bozulmamalı.

Doğrulama: `node node_modules/typescript/bin/tsc --noEmit`, `npm test` (windows/), `cargo test --offline` yeşil (sayılar SONUC'a).
Exe: dist exe → dist/onceki/ zaman damgalı yedek, `npm --offline run pack` (windows/). Kısayolu Claude günceller.
YASAK: kullanıcının sekans/ms/ayar değerlerini değiştirme; görsel dosyaları; studyo/; git; görünür pencere. Not: başka bir Gemini (Konuşan Afu) aynı anda windows/src içinde balon katmanı ekliyor — pet.ts'te yalnız yukarıdaki düzeltmeleri yap, onun eklediklerini silme.
