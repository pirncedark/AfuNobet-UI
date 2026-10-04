SONUC: TAMAM

GOREV_P9B_AYRINTI_TASMA.md uygulandı. GOREV_AFU_TEMEL.md ve AFU_CHANGES.md okundu.

Neden: Ayrıntı kutusu kaydırılan soru gövdesinin dışında, küçülmeyen kart çocuğuydu. Açıldığında sabit içerik kartın yüksekliğini aşıyor, gövde sıfır yüksekliğe düşüyor ve cevap alanı kartın altından taşıyordu.

Değişiklikler:
- windows/src/question/question.ts: ayrıntı metni soru gövdesine taşındı; açma/kapatma düğmesi seçeneklerin üstünde sabit kaldı.
- windows/src/question/question.css: soru metninin küçülmesi önlendi; ayrıntının ayrı 64 px kaydırma kutusu kaldırıldı. Soru ve ayrıntı birlikte .soru-govde içinde kayar; seçenekler ve cevap alanı kartın altında görünür kalır.
- SONUC_OC_TEST_GECE.md: ilk satır SONUC: TAMAM yapıldı; P9b ile düzeltildi notu ve yeni test çıktıları eklendi, eski kanıt tarihçe olarak korundu.

Önceki hata mevcut testlerle yeniden üretildi:
```text
 Test Files  1 failed (1)
      Tests  3 failed | 13 passed (16)
```
Çıkış kodu 1. DPI 1 / 1.25 / 1.5 senaryolarında cevap alanı bottom=463.75, kart bottom=410 idi.

Düzeltme sonrası hedefli doğrulama:
`cd windows; node node_modules/vitest/vitest.mjs run tests/gece_kontrol.test.ts --configLoader runner --reporter dot`
```text
 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  11:24:33
   Duration  5.85s (transform 136ms, setup 0ms, import 563ms, tests 5.14s, environment 0ms)
```
Çıkış kodu 0. Uzun soru ve açık ayrıntı için üç DPI senaryosunda dört seçenek ve cevap alanı, gövde kaydırılmadan ve en alta kaydırıldıktan sonra kartın ve pencerenin içinde kalıyor.

`cd windows; node node_modules/typescript/bin/tsc --noEmit`
Çıktı boş; çıkış kodu 0.

`cd windows; npm test`
Çıkış kodu 0. Son satırlar:
```text
 Test Files  45 passed (45)
      Tests  573 passed (573)
   Start at  11:24:48
   Duration  7.82s (transform 2.69s, setup 0ms, import 6.43s, tests 13.15s, environment 8ms)
```

windows/tests altındaki 47 dosyanın başlangıç ve son SHA256 değerleri aynı. Test silinmedi, atlanmadı veya değiştirilmedi.
windows/src-tauri/src/island.rs başlangıç ve son SHA256:
`5f2f4588f4f7231450fe583f4218bde4c04db4bfe4cdbd1389b4430945f71b57`

Exe üretilmedi; git kullanılmadı; görünür pencere açılmadı; bağımlılık indirilmedi. Testler mevcut çevrimdışı bağımlılıklar ve headless Chromium ile çalıştı. Gerçek Windows pencere/DPI kabulü bu doğrulamanın kapsamında değildir.
