SONUC: TAMAM

# Q6 - Takip sayfası sade ve yeşil

Kapsam: yalnız `docs/kanit/ozellik/ozellikler.html` (görünüm). `F` dizisi (78 satır), `TEST`
nesnesi (30 anahtar) ve `<section id="gece-kuyruk">` (61 `<li>`) **dokunulmadı** — doğrulandı.

## Ne yapıldı

### Renk: yeşil tema
- Ana vurgu (`--accent`) yeşil: açık temada koyu yeşil `#1c7a4a` + açık yeşil zemin `#e5f2ea`,
  koyu temada açık yeşil `#4fbf85` + koyu yeşil zemin `#12291f`.
- Altın (`#c8952f`/`#e0b057`), mor (`--next`), mavi (`--build`) değişkenleri **kaldırıldı**.
- Durum renkleri: `ok` = yeşil; `build`/`work`/`next`/`unk` = tek gri tonu (`--st`/`--stbg`);
  kırmızı yalnız `no` ("Henüz yok").
- `.eyebrow`, seçili filtre çipi, satır hover ve not çizgisi yeşil (`--onaccent` ile açık/koyu
  temada okunabilir yazı rengi).
- Her iki tema korundu: `prefers-color-scheme` + `:root[data-theme="dark"]` blokları ve
  `color-scheme:dark` yerinde.

### Sade
- Büyük sayı kartları kaldırıldı; üstte **tek satır özet**: `66 / 78 hazır` + ince yeşil
  ilerleme çubuğu (6 px) + `%85` + küçük durum sayıları (`66 Exe'de var · 3 Kodda var…`).
  Özet satırı bilgilendiricidir; filtre çubuğu (`chips`) tek filtre denetimi olarak kaldı.
- Uzun açıklama paragrafı (4 cümle) **tek cümleye** indirildi: "AfuNöbet'in bugünkü özellikleri ve
  her birinin kanıtı."
- Gölge/çerçeve azaltıldı: kart gölgeleri ve `inset` çerçeveleri silindi, `.rows` tek ince
  çerçeve, `.note` yalnız 3 px yeşil sol çizgi (zemin/çerçeve kalktı).
- Uzun durum etiketleri taşmasın diye etiket sütunu 112 px → 152 px, etikette `nowrap` kaldırıldı
  ("Kodda var, bağlı değil" başlığa biniyordu — düzeltildi).
- Mobil: kenar 16 px; `overflow-wrap:anywhere` + `overflow-x:hidden`; 560 px altı tek sütun.

## Doğrulama

```
node --check (sayfa <script> bloğu)   -> JS OK
F sayımı 78 · TEST anahtarı 30 · gece-kuyruk <li> 61 (değişmedi)
Headless Chromium (--headless=new, dosya URL'si):
  rows=78  ticks=6  tally="66 / 78 hazır"
  dar görünüm (iframe 320 px): scrollW=305 clientW=305  -> yatay kaydırma YOK
  dar görünüm (iframe 390 px): scrollW=375 clientW=375  -> yatay kaydırma YOK
  768 px: scrollW=737 clientW=737                      -> yatay kaydırma YOK
  konsol: CONSOLE / Uncaught / net::ERR satırı YOK (hata yok)
```

Görüntüler: `docs/kanit/q6/`
- `q6-light.png` — açık tema, tam sayfa
- `q6-dark.png` — koyu tema, tam sayfa
- `q6-satir-light.png` / `q6-satir-dark.png` — özellik satırları (yeşil + gri etiketler)
- `q6-mobil.png` — 390 px gerçek dar görünüm

## Not
- Exe derlenmedi, git commit atılmadı, görünür pencere açılmadı.
- Tema testi için `data-theme` geçici kopyalar `%TEMP%\opencode` altında üretildi; depo içindeki
  dosyaya test kodu eklenmedi.
