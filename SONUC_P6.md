SONUC: TAMAM

# P6 — Mini pet çerçeveden taşmasın (çerçeveye göre sığdır)

Kullanıcı görüntüsü: `docs/kanit/pet_anim/kullanici_tasma_0210.png` — uçuş animasyonunda karakter
256 px pencerenin dışına taşıyor, kafa sol kenarda kesiliyordu.

## Ne yapıldı

1. **Son dönüşüm ölçülüyor.** `windows/src/afu/pet.ts` içindeki `paint()` (STÜDYO ÇİZİM bloğu):
   PET_AYAR.olcek × normalize (PET_BOYUT.olcek) × ense/scruff uygulandıktan sonra sonuç
   `sigdir(...)` saf fonksiyonuna verilir. Fonksiyon `pet.ts:1171`.
2. **Alfa sınır kutusu tablosu kullanıldı.** `pet.ts` içindeki ölçülmüş `PET_BOYUT` tablosundaki
   `kutu: [L, T, R, B]` oranları (stüdyo `boyut_tablosu.json` ile aynı ölçüm) kullanılıyor; görsel
   dosyalarına dokunulmadı, ölçüm yeniden üretilmedi.
3. **Sığdırma kuralı.** `sigdir(kutu, olcek, x, y, pencere = 256, pay = 6)`:
   - Ölçekli kutu 256 − 2×6 = 244'ü aşarsa ölçek **orantılı** küçültülür.
   - Sonra kutu `transform-origin` etrafında ölçeklenip `translate` ile 6 px kenar payına **clamp**
     edilir (sol/sağ/üst/alt).
   - Sığan kutu **hiç değişmez**: ölçek, x ve aynen korunur (kullanıcının stüdyo tasarımı bozulmaz).
   - Bekleme pozunda alt hizayı korur: kutu alt kenarı 6 px payla pencerenin dibine oturur
     (ayaklar görev çubuğu hizasında kalır, kanıt: `bekleme.png` alt pay = 1 px).
4. **Düzeltilen yan hata (P3 korunarak).** Ölçü tablosu, `PET_NORMALIZE` dışındaki pozalarda
   (sürükleme / geri dönüş kareleri) daha önce yok sayılıp `[0,0,1,1]` tüm çerçeve kullanılıyordu;
   bu, sürükleme sırasında karakteri %5 gereksiz küçültüyor ve scruff kaydırmasını kilitliyordu.
   Artık **ölçülen kutu her kare için** kullanılıyor, ölçek yine kullanıcının değeri (1). Kod:
   `pet.ts:1146` ve `pet.ts:1153`. P3'teki sürükleme eşiği (5 px) ve ense `transform-origin`
   (`50% 35.15625%` / ölçekli `50% ${90/256*100}%`) **aynen korundu**, hiçbir satır silinmedi.

## Test

`windows/tests/pet-sigdir.test.ts` (yeni, 11 test):
taşan uçuş kutusu içeri alınır · sığan kutu değişmez (ölçek + kaydırma korunur) · sol taşma ·
sağ taşma · üst taşma · alt taşma · çerçeveden büyük kutu orantılı küçülür · **tüm poz × tüm
karelerde taşma yok** (SEKANSLAR'daki her kare, kendi PET_AYAR'ıyla) · ölçüsüz kare için tam
çerçeve · tam sığan kutu küçültülmez.

```
$ node node_modules/typescript/bin/tsc --noEmit
TSC OK

$ npm test
> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 Test Files  36 passed (36)
      Tests  432 passed (432)
   Start at  02:18:12
   Duration  5.41s (transform 2.43s, setup 0ms, import 4.56s, tests 5.48s, environment 6ms)
```

## Başsız görüntü (kanıt)

`windows/scripts/p6-sigdir-kanit.mjs` — Chromium/Pixi değil, Playwright + `scripts/png.mjs` ile
**gerçek alfa pikselleri** ölçülür: 256×256 pencere kırpılır, alfa > 24 olan piksellerin sınır
kutusu bulunur ve 6 px pay içinde olduğu doğrulanır. Görsel dosyalarına dokunulmaz, pencere
görünmez (başsız), çıktı: `docs/kanit/p6/`.

```
$ node scripts/p6-sigdir-kanit.mjs
OK ucus        kutu={"left":135,"top":152,"right":228,"bottom":246} pay={"sol":129,"sag":22,"ust":146,"alt":4} scale=0.447555 translate=58px -3.63277px
OK masa_cikis  kutu={"left":162,"top":242,"right":211,"bottom":249} pay={"sol":156,"sag":39,"ust":236,"alt":1} scale=0.451516 translate=57.2835px -6px
OK kalkis      kutu={"left":101,"top":151,"right":192,"bottom":244} pay={"sol":95,"sag":58,"ust":145,"alt":6} scale=0.801914 translate=19.837px -2.14479px
OK bekleme     kutu={"left":78,"top":144,"right":176,"bottom":249} pay={"sol":72,"sag":74,"ust":138,"alt":1} scale=0.445601 translate=-1.41414px -6px
PASS 4 kare 256 pencerede taşmadan -> docs/kanit/p6/
```

Dosyalar: `docs/kanit/p6/ucus.png`, `kalkis.png`, `masa_cikis.png`, `bekleme.png`, `manifest.json`.

Not (tespit, değiştirilmedi): `gecis` pozunda stüdyo `ayar.x = 58` olduğu için uçuş karakteri
pencrenin sağ altında duruyor — bu tasarım tercihidir, sığdırma onu bozmadı. Ayrıca ölçülen alfa
kutusu, `PET_BOYUT` tablosundan **daha geniş** çıkıyor (örn. uçuş: tablo tabanı 131–240 px, gerçek
alfa 135–228 px), yani sığdırma güvenli yönde çalışıyor ve kırpma yok.

## Kural uyumu

Exe paketleme yok · git yok · görünür pencere yok · görsel/ses dosyası değiştirilmedi ·
`island.rs` dokunulmadı · P3 ense kodu korundu · sadece `windows/src/afu/pet.ts`,
`windows/tests/pet-sigdir.test.ts`, `windows/scripts/p6-sigdir-kanit.mjs` ve `docs/kanit/p6/*`.
