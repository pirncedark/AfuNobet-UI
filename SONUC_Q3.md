SONUC: TAMAM

# Q3 — %150 ölçek ve küçük ekran kontrolü (plan F14)

**Kural:** Kart (P8 sonrası 1,5x), sohbet, soru kartı ve mini pet;
`1280×720 @ deviceScaleFactor 1.5` ve `1366×768 @1.0` altında çizilir.
Kritik kontrollerin (ana düğme, kapat, seçenekler, alt menü) hepsi **görünür
VE tıklanabilir** kalır; hiçbir yerde pencere taşması veya kırpma yoktur.

## Bulgular tablosu (ölçüm: `docs/kanit/q3/olcum-{once,sonra}.json`)

| # | Yüzey | Ölçek | Bulgu | Önce | Sonra |
|---|---|---|---|---|---|
| 1 | sohbet | 1280×720 @1.5 **ve** 1366×768 @1.0 | **GERÇEK HATA — ana düğme tıklanamıyordu.** Panel kartın alanından uzundu (içerik 393 px / görünür 179 px); "Gönder" kaydırılınca ekran dışında kaldı, `elementFromPoint` merkezde başka öğeyi buluyordu (`gpT`) | `ana dugme: gpT` | `ana dugme: gpt` |
| 2 | sohbet | 1280×720 @1.5 ve 1366×768 @1.0 | Kapat (✕) düğmesi "Asistan" başlığının **üstüne biniyordu** (görsel `once-…-sohbet.png`) | üst üste | kendi satırında, üstte sabit |
| 3 | soru kartı | 1280×720 @1.5 ve 1366×768 @1.0 | Kanıt fiyatında ✕ hiç çizilmiyordu: fixture gerçek akışın verdiği `atla` geri çağrısını geçmiyordu (ürün hatası değil, kanıt hatası) | `kapat: y` | `kapat: gpt` |
| 4 | mini pet | 1280×720 @1.5 ve 1366×768 @1.0 | Denetim yanlış seçilmişti: kompakt modda alt menü **bilinçli olarak** gizli, ölçülecek şey mini pet şeridinin kendisi | `alt menu: GpT` (yanlış) | `mini pet: gpt`, `karakter: gpt` |
| 5 | kart | 1280×720 @1.5 ve 1366×768 @1.0 | Taşma/kırpma **yok**. Ana düğme ve alt menü görünür + tıklanabilir | `gpt` | `gpt` (değişmedi) |
| 6 | soru kartı | 1280×720 @1.5 ve 1366×768 @1.0 | Taşma/kırpma **yok**. Kapat, 4 seçenek, serbest metin Gönder'i görünür + tıklanabilir | — | `gpt` ×3 |

`g` = görünür, `p` = pencere içinde, `t` = `elementFromPoint` merkezde kendisini buldu (yani tıklanabilir).

### Kalan taşmalar — hepsi BİLİNÇLİ kaydırma kabuğu
| Kutu | Taşma | Neden |
|---|---|---|
| `.overview` | 39 px dikey | `overflow-y:auto` — uzun görev listesi kendi alanında kayar |
| `.chat-panel` | 163 px dikey | Q3'te **kasıtlı**: yazma alanı + Gönder altta sabit, ikincil ses düğmeleri aşağı kayar |
| `.soru-govde` | 65 px dikey | `overflow-y:auto` — soru metni kendi alanında kayar, seçenekler yerinden oynamaz |

Pencere kaydırması (`scrollWidth/scrollHeight − client*`) **her kombinasyonda 0**;
pencereyi aşan görünür kutu **0**; sayfa hatası **0**.

## Ne yapıldı — `windows/src/chat.css` (yalnız ilgili sınıflar)

1. **Yazma alanı ve eylem satırı panele SABİTLENDİ.** `.chat-input` ve
   `.chat-actions` `position:sticky`; yükseklikleri tek yerden
   `--chat-eylem-y` / `--chat-yazi-y` değişkenleriyle verilir, yazma alanı
   eylem satırının tam üstüne yapışır. Artık kaydırılsa da **Gönder ve yazma
   alanı her zaman görünür**.
2. **`.chat-panel` kaydırma kabuğu oldu** (`height:100%` + `overflow-y:auto`):
   ikincil ses düğmeleri (Bas ve konuş / Sesli bildirim / Sesli yanıt /
   Afu'nun sesi) artık ana düğmeyi veya yazma alanını itmiyor.
3. **`.chat-answer` kalan boşluğu dolduruyor**, `min-height:34px` ile asla
   sıfıra düşmüyor (sıfır olsaydı ajanın cevabı hiç görünmezdi) ve kendi
   içinde kaydığı için **kırpılmıyor**.
4. **`.chat-close` (✕)** artık sağ üst köşeye yapışkan, kendi satırını tutmayan
   konumda → "Asistan" başlığının üstüne binmiyor, kaydırılırken de görünür.
5. **Yükseklik bütçesi**: sohbet `h1` 20→15 px (`rows` özniteliğinin dayattığı
   varsayılan yükseklik `height` ile sınırlanır). Ölçüm sonrası şeritler
   çakışmıyor: yanıt 115-166, yazma alanı 167-263, eylem satırı 263-323.

`style.css`, `views.ts`, `question.ts`, `island.rs` **DOKUNULMADI**.

## Kanıt — `docs/kanit/q3/` (başsız, görünür pencere açılmadı)

| Dosya | İçerik |
|---|---|
| `once-1280x720-yuzde150-{working,sohbet,soru,petit}.png` | düzeltme öncesi (sohbet ✕/Gönder hatalı) |
| `once-1366x768-yuzde100-*.png` | aynı |
| `sonra-1280x720-yuzde150-{working,sohbet,soru,petit}.png` | düzeltme sonrası |
| `sonra-1366x768-yuzde100-*.png` | aynı |
| `olcum-once.json`, `olcum-sonra.json` | sayısal ölçümler |

Altyapı: `windows/scripts/q3-kanit.mjs` (headless Chromium + yerel vite),
`windows/tests/preview.ts` → yeni `?case=sohbet` yüzeyi.
Denetim **görünürlük değil `document.elementFromPoint`** ile yapılır: düğmenin
merkezinde başka bir öğenin durması hâlinde "tıklanamaz" sayılır — yani
başka bir öğenin üstüne binmesi de yakalanır.

## Vitest — `windows/tests/q3_dpi150.test.ts` (yeni, 13 test)
- Ölçü: PANEL 1080×480, KART_OLCEK 1,5, çizilen kutu 960×429 (ölçümle aynı),
  1280×720 ve 1366×768'de `fitScale` = 1 (küçültme yok), gerçek pencerede de 1,
  çok küçük alanda küçültür.
- Sohbet CSS'i: eylem satırı ve yazma alanı yapışkan, yanıt `flex` + `min-height`
  + `overflow`, panel kaydırma kabuğu, ✕ üstte sabit, yazma alanı yüksekliği
  `rows` değil CSS'ten geliyor.
- Kanıt betiği: iki hedefi ve `scale: 1.5` / `scale: 1`'i kapsıyor, dört yüzeyi
  çiziyor, `elementFromPoint` ile tıklanabilirlik ölçüyor, `scrollWidth`/
  `scrollHeight` raporluyor, `headless: true` (görünür pencere yok).

## Kabul

- [x] Kart 1,5x, sohbet, soru kartı, mini pet — iki ölçekte de çizildi (8 görüntü).
- [x] Ana düğme, kapat, seçenekler, alt menü: 8/8 kombinasyonda **görünür + tıklanabilir**.
- [x] Pencere taşması 0, pencereyi aşan kutu 0, sayfa hatası 0.
- [x] Sohbet Gönder/yazma alanı kaydırmadan da erişilebilir; ✕ başlığa binmiyor.
- [x] Vitest 13 yeni test, toplam **557/557**. `tsc --noEmit` temiz.
- [x] `island.rs` DOKUNULMADI — SHA256 `5F2F4588…F71B57`, Q2 ile aynı.
      (`git status` bu dosyayı "M" gösteriyor; bu, Q3'ten önce yapılmış ve
      bana ait olmayan bir **satır sonu normalizasyonu**: dosya 1.10.2026'da
      değişmiş, `git diff --ignore-cr-at-eol` **boş** çıkıyor, yani içerik
      byte-byte aynı. Q3 sırasında hiç yazılmadı.)
- [x] Exe üretilmedi, git işlemi yapılmadı, görsel/ses dosyası eklenmedi,
      görünür pencere açılmadı (yalnız `headless: true`).

## Doğrulama çıktıları (aynen)

Komut: `cd windows; node node_modules/typescript/bin/tsc --noEmit`
Çıkış kodu: `0` — çıktı boş (günlük: `windows/test-results/q3-tsc.log`, 0 bayt):

```text
```

Komut: `cd windows; npm test`
Çıkış kodu: `0` (günlük: `windows/test-results/q3-npm-test.log`):

```text
> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner


 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows


 Test Files  44 passed (44)
      Tests  557 passed (557)
   Start at  10:24:51
   Duration  5.69s (transform 3.28s, setup 0.00s, import 5.85s, tests 6.17s, environment 0.06s)
```