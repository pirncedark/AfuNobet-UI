SONUC: TAMAM

# P7 — Mini pet göz kırpma yavaşlasın (animasyon hız / döngü arası bekleme)

Kullanıcı şikayeti: "mini pette göz kırpma çok hızlı". Sebep: bekleme pozunda
`/afu/durum/bekleme.webp` kendi hızında oynuyordu; ölçülen döngü **732 ms**, yani
göz kırpma ~0,73 sn'de bir tekrarlanıyordu. Görsel dosyalarına **hiç dokunulmadı**.

## Ne yapıldı

### 1. Kare kare oynatıcı (yeni dosya `windows/src/afu/oynatma.ts`)
Animasyonlu webp `<img>` ile bırakılmadı; tarayıcının **ImageDecoder** API'siyle
kare kare çözülüp `<canvas>` üzerine çiziliyor:
- `cozKareler()` → `fetch` → `new ImageDecoder(...)` → `tracks.selectedTrack`
  (`animated`, `frameCount`) → her kare `decode({ completeFramesOnly: true })` →
  `createImageBitmap` → `VideoFrame.duration` ms olarak saklanır.
- Kareler bir kez çözülüp önbelleğe alınır (en fazla 4 dosya), çizim
  `drawImage` ile senkron ve darboğazsızdır.
- **Geri düşüş:** `ImageDecoder` / `createImageBitmap` / webp desteği yoksa veya
  dosya animasyonsuzsa çözücü `null` döner, oynatıcı hiç açılmaz
  (`aktif === false`), `#afu-pet` üzerindeki `pet-oynuyor` sınıfı hiç eklenmez →
  eski `<img>` davranışı **aynen** sürer.

### 2. Ayar tablosu `PET_OYNATMA` (PET_AYAR'ın yanında, tek tabloda)
`windows/src/afu/pet.ts`, `// STÜDYO AYAR BAŞLANGIÇ/SON` bloğu içinde
`Record<PetPose, { hiz: number; donguArasi: number }>`:
- `hiz`: 0,25–2 (varsayılan 1) · `donguArasi`: ms (varsayılan 0)
- **bekleme → hiz 0,5 + donguArasi 3500** (kullanıcı isteği: "animasyonu yavaşlatalım")
- diğer 14 poz → hiz 1, donguArasi 0 (değişmez)

Gerçek dosya ölçümüyle: döngü 732 ms → hız 0,5 ile **1464 ms**, + 3500 ms bekleme =
**bir kırpma ~4,96 sn'de bir** (±%30 rastgele → 3,5–6,5 sn). Öncesi 0,73 sn:
**kırpma ~7 kat yavaşladı.** Döngü arası bekleme her döngüde **rastgele ±%30**
değişir (`rastgeleBekleme`) → mekanik değil, doğal ritim.

### 3. Zamanlama saf ve test edilebilir
`kareSecimi(kareMs, hiz, donguArasi, gecenMs, rnd)` — döngü süresi
`toplam / hiz`; döngü bittiğinde **ilk karede** bekleme; döngü uzunluğu temel
(değer) değerle bulunur, sapma yalnız beklemeyi değiştirir.
`WebpOynatici` sınıfının **çözücü, saat, zamanlayıcı, rastgele ve çizim** uçları
enjekte edilebilir → sahte decoder + sahte saatle tam olarak test ediliyor.

### 4. P6 sığdırma ve P3 ense canvas'ta da aynen
`paint()` içindeki `// STÜDYO ÇİZİM` döngüsü artık
`[this.image, this.previous, this.canvas]` üzerinde çalışır: `sigdir(...)`,
`transform-origin` (`50% 100%` / sürüklemede `50% 35.15625%`), `translate`, `scale`
ve ense `extraTransform` (rotate/scaleY/translateY) **aynı değerlerle** canvas'a da
uygulanır. Sadece "önceki kare" koşulu tersine çevrildi
(`image === this.previous ? <önceki kare> : next`) — `image` ve `previous` için
sonuç bit bit aynıdır, P3/P6'ın hiçbir satırı silinmedi; `sigdir` ve `PET_BOYUT`
dokunulmadı (P6 testleri yeşil).

### 5. Diğer ayarlar
- `pet-canvas` `<canvas class="pet-image pet-canvas" width=256 height=256>`
  (`windows/src/style.css`): varsayılan `display:none`; `#afu-pet.pet-oynuyor`
  aktifken görünür, `.pet-gizli` img'ler gizlenir. Kare `<img>` ile aynı biçimde
  (`contain`, alt-ortalanmış) çizilir.
- `setVisible()` oynatıcıyı da durdurur/başlatır (gizliyken döngü yok).
- `prefers-reduced-motion` tercihinde oynatıcı hiç açılmaz (statik `<img>`).
- **`studyo/uygula.py`**: `oynatma: {sekans: {hiz, donguArasi}}` alanı
  doğrulamalı eklendi — sekanslarla birebir eşleşmeli, `hiz` 0,25–2,
  `donguArasi` 0–60000, tam anahtar kümesi. Alan gelmezse uygulama
  **kendisi** `{hiz: 1, donguArasi: 0}` tablosunu yazar, yani stüdyo çıktısı
  `pet.ts`'i derlenebilir bırakır. `PET_OYNATMA`, `PET_AYAR` hemen ardından
  `PET_TUTMA`/`studyoKareYolu` öncesinde yazılır ve **idempotenttir**
  (tekrar uygulama aynı sonucu verir). Doğrulandı: gerçek `pet.ts` üzerinde
  kuru çalıştırma → `PET_OYNATMA` yazıldı, `PET_NORMALIZE` korundu.

## Test

`windows/tests/pet-oynatma.test.ts` (yeni, **15 test**) — sahte zamanlayıcı + sahte
decoder: hız kare sürelerini doğru bölüyor (0,5 → kare 200 ms) · döngü bitince ilk
karede bekleme (800–4300 ms arası `bekliyor: true`) ve 4300'de yeniden başlama ·
beklemesiz akış kesintisiz · rastgele bekleme ±%30 bandında · sınır kırpma
(0,25 / 2 / 60000, NaN, boş kare listesi) · `PET_OYNATMA` her pozda var,
bekleme = {0,5, 3500}, diğerleri {1, 0} · **çözücü null → `aktif` false, hiç çizim
yok, `durum` hiç `true` çağırmıyor (yani `<img>` kalır)** · gizliyken döngü durur ·
hareket azaltmada kapanır · aynı kaynak/ayar yeniden çözmez.

`tests/test_studyo_uygula.py` (yeni, **12 test**): `oynatma` yazılır ve idempotenttir ·
alan yoksa hız 1 / bekleme 0 varsayılanı yazılır · eksik/fazla sekans, hiz 0,2 / 2,1,
negatif veya 60001 bekleme, `__proto__`, boolean, eksik anahtar, boş nesne →
dönüşümden **önce** reddedilir.

```
$ node node_modules/typescript/bin/tsc --noEmit
TSC EXIT=0

$ npm test
> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 Test Files  38 passed (38)
      Tests  463 passed (463)
   Start at  02:46:03
   Duration  5.35s (transform 2.27s, setup 2ms, import 4.61s, tests 5.54s, environment 11ms)

$ python -m pytest tests -q
170 passed in 20.76s
```

## Başsız görüntü (kanıt)

`windows/scripts/p7-coz-kanit.mjs` — Vite sunucusu + Playwright/Chromium, pencere
açılmaz. Gerçek `ImageDecoder` ile ölçüm (`docs/kanit/p7/manifest.json`):

```
ANIM /afu/durum/bekleme.webp kare=6 dongu=732ms hiz0.5=1464ms 1 kirpma=4964ms
ANIM /afu/durum/gulumseme.webp kare=14 dongu=1733ms hiz0.5=3466ms 1 kirpma=6966ms
tek  /afu/pet/akis_normal.webp kare=1 dongu=0ms
  t=0ms dongu#0 kare=0
  t=700ms dongu#0 kare=5
  t=3000ms dongu#0 kare=0 (ilk karede bekleme)
  t=4900ms dongu#0 kare=0 (ilk karede bekleme)
  t=6300ms dongu#1 kare=5
PASS ImageDecoder kare kare cozdu -> docs\kanit\p7/manifest.json
```

Ölçülen `bekleme.webp` **6 kare / 732 ms** (görevde tahmin 11 kare ≈ 0,7 sn; döngü
süresi doğru, kare sayısı farklı — sonucu değiştirmiyor). Animasyonsuz dosya
(`akis_normal.webp`) çözücü tarafından elenir → `<img>` yolu.

## Kural uyumu

Exe paketleme yok · git yok · görünür pencere yok · görsel/ses dosyası
değiştirilmedi veya yeniden kodlanmadı · `island.rs` dokunulmadı · P3 ense ve
P6 sığdırma kodu korundu (yalnız döngüdeki eleman listesi ve "önceki kare" koşulu
canvas'ı kapsayacak kadar genişletildi) · stüdyo `paint()` yeniden üretimi P3/P6
işini **kasten silmeye devam ediyor** (bu görevin kapsamı dışında, `oynatma`
alanı doğrulaması eklendiği için ileride ayrı bir iş gerekir).

Dosyalar: `windows/src/afu/oynatma.ts` (yeni), `windows/src/afu/pet.ts`,
`windows/src/style.css`, `windows/tests/pet-oynatma.test.ts` (yeni),
`windows/scripts/p7-coz-kanit.mjs` (yeni), `studyo/uygula.py`,
`tests/test_studyo_uygula.py`, `docs/kanit/p7/manifest.json`.
