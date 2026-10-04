SONUC: TAMAM

# P9 — Soru kartında seçenekler görünmüyor

**Sorun:** Uzun soruda metin + kod kutusu kartı dolduruyor, "CEVAP SEÇENEKLERİ" ve
"Diğer" (serbest metin) alanı alt menünün altında kalıyordu. Kullanıcı soruyu
cevaplayamıyordu.

## Ne yapıldı

### 1. `windows/src/question/question.css`
- **Alt menü gizlenir:** `#content:has(.overview > .soru-kap:not([hidden])) > footer{display:none!important}`
  → "Kota durumu / Uygulamalar / Orkestra / Sohbet / Daha fazla / Küçült / Afu'ya sor"
  satırı soru kartı açıkken yok olur, kart kapanınca kendiliğinden geri gelir.
- **Kart tüm yüksekliği kaplar:** `.overview` soru varken `display:flex; column; overflow:hidden`,
  `.soru-kap` `flex:1 1 auto; min-height:0`, `.soru-karti` `flex:1 1 auto; height:100%`.
  → `kapTasma` **145px → 0px**.
- **Soru metni kendi içinde kayar:** yeni `.soru-govde` sarmalayıcı
  (`flex:1 1 auto; min-height:0; max-height:100%; overflow-y:auto; overflow-x:hidden`).
  Metin ve (açılınca) kod kutusu yalnız bu alanda kayar.
- **Seçenekler + cevap alanı alta sabit:** `.soru-secenekler`, `.soru-yazi`, `.soru-hata`
  → `flex:0 0 auto` (asla sıkışmaz, asla dışarı taşmaz).
- **Dikey bütçe:** kart `gap:6px`, `padding:9px 10px`; düğme `min-height:32px`,
  `flex:1 1 88px` (4 seçenek tek satıra sığar), boşluklar 6px. Böylece metin alanı
  boş kalmaz.
- **Ayrıntı düğmesi küçük:** `.soru-karti .soru-ayrinti-dugme` (22px yükseklik, `flex:0 0 auto`).
  Bu kural `.soru-dugme`'dan **sonra ve daha yüksek özgüllükte** yazıldı; önceki denemede
  `.soru-dugme{flex:1 1 120px}` kazanıp düğmeyi 42px'e şişiriyordu.

### 2. `windows/src/question/question.ts` (`kartOlustur`)
- Metin artık doğrudan karta değil `.soru-govde` içine konur.
- `ayrinti` (kod kutusu) **varsayılan kapalı**: `pre.hidden = true`, üstünde
  `aria-expanded="false"` olan küçük bir **"Ayrıntı"** düğmesi. Tıklayınca açılır,
  düğmenin yazısı "Ayrıntıyı kapat" olur. Düğme seçeneklerin ÜSTÜNDE, sabit
  konumda — soru metni kaydırılsa bile hep görünür.

### 3. Kanıt altyapısı (yalnız geliştirme/test dosyaları)
- `windows/tests/preview.ts`: yeni `?case=soru` — ada ortamında başsız tarayıcıda
  uzun soru (~150 karakter) + 4 seçenek + "Diğer" alanı + ayrıntı kutusu.
- `windows/scripts/p9-kanit.mjs`: P8'in kanıt betiğinin aynısı; headless Chromium +
  yerel vite. **Görünür pencere açılmaz.** Ölçtüğü: alt menü görünür mü, 4 seçenek
  ve cevap alanı kartın içinde mi, kapta taşma var mı, metin alanı kayıyor mu.
- `windows/tests/question.test.ts`: yeni "Ayrıntı" düğmesi için beklenti eklendi
  (kapalı başlar, tıklayınca açılır, seçenek düğmeleri listesine karışmaz).
- **`island.rs` ve `pet.ts` DOKUNULMADI.** Exe üretilmedi, git işlemi yapılmadı.

## Kanıt görüntüleri — `docs/kanit/p9/`

| Dosya | Durum |
|---|---|
| `once-normal-1080x480.png` | ÖNCE: seçenekler ve "Cevabını yaz" **yok**, alt menü görünür |
| `sonra-normal-1080x480.png` | SONRA: 4 seçenek + "Cevabını yaz"/Gönder görünür, alt menü gizli |
| `once-ekran-1366x768-yuzde100.png` | ÖNCE (1366×768 @%100) |
| `sonra-ekran-1366x768-yuzde100.png` | SONRA (1366×768 @%100) |
| `olcum-once.json` / `olcum-sonra.json` | sayısal ölçümler |

## Sayısal doğrulama (p9-kanit.mjs ölçümü)

| Ölçüm | Önce | Sonra |
|---|---|---|
| Alt menü görünür | **evet** | hayır |
| 4 seçenek düğmesi kartın içinde | 4 düğme var ama **görünmüyor** | 4/4 görünür |
| Cevap alanı ("Cevabını yaz") görünür | **hayır** | evet |
| `soru-kap` taşması | **145px** | **0px** |
| Metin alanı kendi içinde kayıyor | — | evet (`kaydirilabilir: true`) |
| Sayfa hatası | 0 | 0 |

## Test çıktısı (yapıştırıldı)

```
> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 Test Files  38 passed (38)
      Tests  468 passed (468)
   Start at  02:59:41
   Duration  5.02s (transform 2.27s, setup 0.00s, import 3.30s, tests 5.28s)
```

`node node_modules/typescript/bin/tsc --noEmit` → **çıktı yok (0 hata)**.

## Kabul

- [x] Seçenek düğmeleri ve cevap alanı her zaman görünür, kartın altına sabit.
- [x] Soru metni + ayrıntı kendi içinde kayar (`max-height` + `overflow-y:auto`).
- [x] Ayrıntı varsayılan kapalı, "Ayrıntı" düğmesiyle açılır.
- [x] Soru kartı açıkken alt menü gizli, kart kapanınca geri geliyor.
- [x] Başsız görüntü: uzun soru + 4 seçenek + Diğer → normal ve 1366×768 alındı.
- [x] `tsc --noEmit` temiz, `npm test` 468/468.
- [x] island.rs, pet.ts, exe, git: dokunulmadı.

## Kalan not (kapsam dışı, bilgi amaçlı)

1080×480 pencerede kartın yüksekliği 355px (P8'in 1,5 katı). Kimden satırı + başlık +
"Ayrıntı" + 4 seçenek + cevap alanı sabit olduğu için **soru metni ~2,5 satır** görünüyor
ve kendi içinde kayıyor. Bu, kartın "seçenekler daima görünür" kuralından gelen
kaçınılmaz pay; metnin tamamı okunabilir durumda. Daha fazla metin istenirse P10'da
soru metni alanına `min-height` verip kart yüksekliğini 1 kat artırmak gerekir.
