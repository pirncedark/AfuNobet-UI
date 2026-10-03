SONUC: TAMAM

# Q1 - Uzun metin + TR/EN dayanıklılığı (plan F8, F13)

**Kural:** 300+ karakterli metin, boşluksuz uzun kelime ve uzun URL hiçbir yerde
taşmaz; görünen metin "…" ile kırpılır, **tam metin `title` (tooltip) ile görünür**,
düzen bozulmaz. Arayüz metinleri Türkçe karakterlerle ve uzun İngilizce karşılıklarla
kırpılmadan/taşmadan durur.

## Ne yapıldı

### 1. Ortak kırpma kuralı — `windows/src/core/metin.ts` (yeni)
- `clipText(deger, max)` → `{ text, title }`: tek satır, boşluklar teke iner, aşılırsa
  "…". Kod noktası güvenli (emoji, İ/ş/ğ bozulmaz); boşluksuz uzun kelime ve uzun URL
  güvenli. `clipText` daha önce `views/model.ts` içindeydi; **kural buraya taşındı**,
  `views/model.ts` aynı imzayı yeniden dışa verir (F8 davranışı değişmedi).
- `clipBlock(deger, max)` → `{ text, title }`: **çok satırlı** metin (sohbet yanıtı,
  soru metni) — satır sonları korunur, taşarsa satır ortasından "…" ile kesilir.

### 2. Dört yüzey (hepsi aynı kuralı kullanır)
| Yüzey | Dosya | Kırpma | Tam metin |
|---|---|---|---|
| Görev adı | `views/views.ts` (zaten `clipText`) | 90 / 70 / 60 / 48 karakter | `title` (değişiklik yok, doğrulandı) |
| Ajan mesajı (balon) | `message/message.ts` | gövde 140 karakter + etiket 24 | balonun tam mesajı `title`'da; kırpılan gövde de `title`'da |
| Sohbet yanıtı | `chat/chat.ts` (`render`) | 1200 karakter, satır sonları korunur | `answer.title` = tam yanıt |
| Soru kartı | `question/question.ts` (`kartOlustur`) | başlık 90, metin 600, seçenek etiketi 40 | her birinde `title` = tam metin |

- Uzun seçenek etiketi artık kartta da kırpılıyor (gelen yük 40 karaktere indiriliyordu,
  kart tarafında da güvence var) → `Hayır, iptal` gibi kısa etiketlerde `title` boş kalır
  (gereksiz tooltip yok).

### 3. TR/EN — `windows/src/core/labels.ts`
- `uiFit(key, max)`: dar yer için kırpılmış metin + tam metin (title).
  `ui()` ile aynı sözlüğü okur, TR/EN değişince de aynı kural çalışır.
- `UI_KEYS`: iki sözlüğün anahtar listesi (eksik anahtar arayüzü bozmaz).
- Türkçe metinler korunur: `Küçült`, `Hâlâ bağlanamadı…`, `Afu hazır`.

### 4. CSS: boşluksuz kelime / uzun URL
`.soru-baslik`, `.soru-metin`, `.afu-balon-metin`, `.chat-answer` zaten
`overflow-wrap:anywhere` taşıyor; tek satırlı başlıklar `text-overflow:ellipsis`.
Headless ölçümde **hiçbir kutu pencere dışına taşmadı** (`tasan: 0`, `yatayTasma: 0`).

## Vitest — `windows/tests/q1_uzun_metin.test.ts` (yeni, 15 test)
- `clipText`: 300+ karakter kırpılır, title tam; kısa metne dokunmaz; boşluksuz kelime
  ve uzun URL; Türkçe karakter/emoji bozulmaz.
- `clipBlock`: satır sonları korunur, "…" eklenir, kısa metin aynen kalır.
- Balon: gövde kırpılır, tam mesaj `title`'da; kısa mesajda `title` yazılmaz.
- Soru kartı: başlık/metin kırpılır, `title` tam; uzun seçenek etiketi kırpılır;
  kısa soruda kırpma yok; 300+ karakterlik ham yükten kart yine çizilir.
- TR/EN: iki sözlükte aynı anahtarlar ve boş metin yok; Türkçe karakterler korunur;
  uzun İngilizce karşılık (`Still not connected. Try again in a moment.`) kırpılır ve
  tam metin `title`'da kalır; **dil değişimi arayüzü bozmaz** (her iki dilde tüm
  anahtarlar döner, `setLanguage("tr")` ile geri dönülür).

## Kanıt — `docs/kanit/q1/` (başsız, görünür pencere açılmadı)

| Dosya | İçerik |
|---|---|
| `sonra-normal-1080x480-uzun.png` | 300+ karakterlik görev adı + ajan mesajı balonu |
| `sonra-ekran-1366x768-yuzde100-uzun.png` | aynı, gerçek ekran ölçüsünde |
| `sonra-normal-1080x480-uzun-sohbet.png` | sohbette çok uzun yanıt (kırpılmış) |
| `sonra-ekran-1366x768-yuzde100-uzun-sohbet.png` | aynı |
| `sonra-normal-1080x480-uzun-soru.png` | uzun başlık + uzun metin + uzun seçenek etiketi |
| `sonra-ekran-1366x768-yuzde100-uzun-soru.png` | aynı |
| `olcum-sonra.json` | sayısal ölçümler |

Altyapı: `windows/tests/preview.ts` → yeni `?case=uzun`, `?case=uzun-sohbet`,
`?case=uzun-soru`; `windows/scripts/q1-kanit.mjs` → headless Chromium + yerel vite.
Görev adı gerçek akıştan gelir (ikinci anlık görüntü görevi bitirir, `JOB_FINISHED`
balonu doğar); sohbet yanıtı gerçek `ChatModel` olaylarıyla beslenir.

### Sayısal doğrulama (olcum-sonra.json, `sorular: []`)

| Ölçüm | `uzun` | `uzun-sohbet` | `uzun-soru` |
|---|---|---|---|
| Yatay taşma (px) | 0 | 0 | 0 |
| Pencereyi aşan kutu | 0 | 0 | 0 |
| Görev adı görünen / title | 90 ("…") / 119 | - | - |
| Balon görünen / title | 145 / 139 | - | - |
| Sohbet yanıtı görünen / title | - | 1200 ("…") / 2180 | - |
| Soru başlığı görünen / title | - | - | 90 ("…") / 120 |
| Soru metni görünen / title | - | - | 600 ("…") / 768 |
| Sayfa hatası | 0 | 0 | 0 |

Not: görev adı protokol katmanında 120 karakterle sınırlıdır (`state.ts` `label()`) ve
teknik içeren adlar (URL/uzun yol) elenir — bu yüzden uzun URL örneği sohbet ve soru
kartında gösterilmiştir; kanıt ölçümlerinde title uzunluğu bu yüzden metinden büyüktür.

## Test çıktısı (yapıştırıldı)

`cd windows; node node_modules/typescript/bin/tsc --noEmit`

```
(çıktı yok — 0 hata, TSC_EXIT=0)
```

`npm test`

```
> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner


 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows


 Test Files  40 passed (40)
      Tests  505 passed (505)
   Start at  03:22:42
   Duration  5.54s (transform 2.75s, setup 0.00s, import 5.10s, tests 5.90s, environment 0.06s)
```

## Kabul

- [x] Görev adı, ajan mesajı balonu, sohbet ve soru kartı: uzun metin "…" ile kırpılıyor.
- [x] Tam metin her yerde `title` ile görünür (kırpılan yerde yazılıyor, kırpılmayan yerde yazılmıyor).
- [x] 300+ karakter, boşluksuz uzun kelime, uzun URL: hiçbir yerde taşma yok (`tasan: 0`).
- [x] TR karakterler (İ, ş, ğ, ü, ö, ç, Hâlâ) ve uzun İngilizce karşılıklar bozulmadan duruyor.
- [x] Vitest: 15 yeni test (kırpma + title + TR/EN), toplam 505/505.
- [x] `tsc --noEmit` temiz. Başsız görüntüler `docs/kanit/q1/`.
- [x] **Dil değişimi yok** (arayüzde dil düğmesi/ayarı bulunmuyor; `setLanguage` yalnız
      testlerde ve TR/EN eşitliği test edildi).
- [x] `island.rs` DOKUNULMADI. Exe üretilmedi, git işlemi yapılmadı, görsel/ses dosyası eklenmedi.
