SONUC: TAMAM

# P4 — Enseden tutma: kedi gibi sallanma

## Ne yapıldı

Değişen dosyalar (başka hiçbir dosyaya dokunulmadı):
- `windows/src/afu/pet.ts`
- `windows/tests/pet-sallanma.test.ts` (yeni)

### 1. Saf hesap ayrıldı — `sarkac(adim, hiz, dt, hedef, sert)`
Sınıfın içindeki gömülü sönümlü-yay matematiği (0.3/0.7 ve 0.1/0.85 sabitleri, kareye bağlı
olarak) saf, test edilebilir fonksiyonlara çıkarıldı:

| Dışa aktarılan | İş |
| --- | --- |
| `sarkac(adim, hiz, dt, hedef = 0, sert = false)` | Sönümlü yay adımı. `dt` saniye, 60 fps'e normalize edilir (en fazla 8 kare). Tutmada sert=true, bırakınca sert=false (yumuşak dönüş). |
| `sarkacHedef(hiz)` | Yatay fare hızı (px/sn) → eğilme açısı. Sağa giden fare sola eğilir (ters yön). |
| `sarkacUzama(hiz)` | Açısal hız → `scaleY`, 1 … 1,06 arası. |
| `sarkacNefes(t)` | Geçen ms → `{nefes, bacak}` — 0,6 sn periyotlu hafif sallanma. |
| Sabitler | `SARKAC_MAX_ACI=25`, `SARKAC_HIZ_TAM=1200`, `SARKAC_YAY=0.3`, `SARKAC_SONUM=0.7`, `SARKAC_DONUS_YAY=0.1`, `SARKAC_DONUS_SONUM=0.85`, `SARKAC_UZAMA_MAX=1.06`, `SARKAC_NEFES_MS=600`, `SARKAC_NEFES_PIK=2` |

### 2. İstenen davranışlar
- **Ters yöne eğilme, en fazla ±25°:** Pencere `screenX` farkı kare süresine bölünerek px/sn hıza
  çevrilir, EMA (0,35) ile yumuşatılır, `sarkacHedef` ile açıya çevrilir. 1200 px/sn → tam 25°,
  üstü `SARKAC_MAX_ACI` ile sınırlanır. Yumuşatma titremeyi (jitter) kaldırır.
- **Sönümlü yayla dik konuma dönüş:** Bırakınca (`returning` / `landed`) hedef 0 olur, yumuşak
  yay + güçlü sönüm açıyı 0'a çeker. Açı/hız 0,1° altına inince rAF döngüsü kendini durdurur ve
  mevcut dönüş (`geri_donus` → `yaslanma`) kesintisiz devam eder.
- **Hızlı sallamada `scaleY ≤ 1.06`:** `sarkacUzama` 1…1,06 arasına kıstırır.
- **Hafif bacak sallanması (0,6 sn):** `sarkacNefes` → dikey nefes ±2 px + yatay bacak ±0,7 px
  ve ±0,35° ek rotasyon. Tutma başlangıcından itibaren sürekli akar.
- **`prefers-reduced-motion`:** Tercih açıkken rAF hiç başlamaz (`held` olayında atlanır),
  çalışırken açılırsa döngü `cancelAnimationFrame` ile durdurulup açı/hız sıfırlanır
  (`sallanmaDurdur`), `paint()` sallanma/uzama/nefes transform'unu hiç uygulamaz.
- **requestAnimationFrame:** Evet, sürükleme sırasında yalnız `runPhysics` rAF döngüsü çalışır;
  pencere gizliyken döngü yoktur (P3 düzeni korundu).

### 3. P3 ile uyum
`transform-origin` ense noktasında (`50% 35.15625%`) ve ense kayması (120 ms easing) aynen
korundu; sallanma bunların üstüne ek `transform` olarak biner. Hareket azaltma tercihi P3'teki
`50% 100%` tutuş geometrisini bozmaz — sadece sallanma kapanır.

## Test çıktısı

```
$ npx vitest run tests/pet-sallanma.test.ts --configLoader runner --reporter verbose

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sınırlar > hedef açı ±25° ile sınırlanır 1ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sınırlar > adım ne kadar büyük olursa olsun açı sınırı aşılmaz 1ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sınırlar > geçersiz sayı girdide sarkaç güvenli biçimde sıfırlanır 1ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sınırlar > dt<=0 durumu değiştirmez 0ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sınırlar > çok büyük dt patlamaz (kare sayısı sınırlanır) 0ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — hız → açı > yatay hız ters yöne eğilme verir ve doğrusaldır 0ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — hız → açı > yumuşatılmış hız sarkacı hedef yönünde çeker 0ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sönüm ve dönüş > bırakılınca açı sönerek dik konuma döner 2ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sönüm ve dönüş > bırakılınca ilk yarım saniyede belirgin biçimde söner 0ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sönüm ve dönüş > hız devam ederken aşırı salınım yok, salınım sınırlı 3ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sönüm ve dönüş > tutarken de hedefe oturur ama aşmaz (yay + sönüm) 0ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma sarkacı — sönüm ve dönüş > kare hızından bağımsız: aynı süre, farklı adım → aynı sonuca yakınsar 0ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma — uzama ve nefes > hızlı sallamada scaleY 1,06'yı geçmez 0ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma — uzama ve nefes > nefes 0,6 sn periyotlu ve hafif 4ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma — hareket azaltma tercihi > hareket azaltma kapalıyken sallanma uygulanır 5ms
 ✓ tests/pet-sallanma.test.ts > P4 enseden tutma — hareket azaltma tercihi > hareket azaltma açıkken sallanma uygulanmaz 1ms

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  03:27:47
   Duration  287ms (transform 98ms, setup 0ms, import 128ms, tests 21ms, environment 0ms)
```

```
$ npx tsc --noEmit
(çıktı yok — hata yok, exit code 0)
```

```
$ npm test

> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 Test Files  41 passed (41)
      Tests  521 passed (521)
   Start at  03:27:29
   Duration  5.04s (transform 2.37s, setup 0ms, import 4.82s, tests 5.41s, environment 7ms)
```

## Kural denetimi
- Exe paketleme yapılmadı, git commit/push yapılmadı, görünür pencere açılmadı.
- Görsel/ses dosyalarına dokunulmadı; `island.rs` okundu, değiştirilmedi.
- Başka ajanın değişikliği silinmedi: `pet.ts` düzenlenmeden hemen önce yeniden okundu, tüm testler
  yeşil (41 dosya / 521 test), P3'ün ense tutuşu korundu.

## Notlar / sonraki adım için
- `PET_TUTMA.guc` (50) artık sarkacın hedef açısını etkilemiyor; sarkaç kademeler `SARKAC_YAY` /
  `SARKAC_HIZ_TAM` ile kalibre ediliyor. Stüdyo `PET_AYAR` bloğu hâlâ dokunulmadan duruyor;
  `PET_TUTMA` P5 (stüdyo ense) ile yeniden bağlanabilir.
- Sallanma yalnız `prefers-reduced-motion: reduce` kapalıyken görünür; masaüstünde varsayılan açıktır.
