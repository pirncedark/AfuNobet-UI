SONUC: TAMAM

# P8 — Görev kartı 1,5 kat büyük + yazılar okunur + sağlık şeridi düzgün
Tarih: 2026-10-03 · Dizin: `C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI`

## 1. Kart 1,5 kat büyüdü — tek ölçek değişkeniyle

**Karar:** Tasarım 720x320 CSS px'te *aynı* kaldı; büyütme tek bir değişkenle yapıldı:
CSS `zoom` (yerleşimi de büyüttüğü için yazı yeniden akıtılır, bulanıklaşmaz) + pencerenin
bütünü aynı karla büyütülmesi. Hiçbir CSS kuralı tek tek güncellenmedi.

| Yer | Değişiklik |
|---|---|
| `windows/src/core/layout.ts` | `KART_OLCEK = 1.5`, `DESIGN_W/H = 720/320`, `PANEL_W/H = 1080/480` |
| `windows/src/style.css` | `#island{zoom:var(--kart-olcek,1)}` |
| `windows/src/island/island.ts` | Ada açıkken `--kart-olcek = 1.5`, kompakt/gizli modda `1` |
| `windows/src-tauri/src/dpi.rs` | `KART_OLCEK: f64 = 1.5` → `PANEL_W = 720.0*1.5`, `PANEL_H = 320.0*1.5` |

**Pencere boyutu island.rs DIŞINDAN değişti — `island.rs` bayt bayt korundu.**
Gerçek pencere ölçüsünü `dpi::place()` belirliyor (island.rs'in `apply_geometry`'ı
çağrılmıyor, dpi.rs zaten "island.rs'in aynası" olarak kendi sabitlerini taşıyor ve
fiziksel/CSS ölçü düzeltmesini yapan yer burası). Test bunu açıkça doğruluyor:
`p8_kart_buyut.test.ts` → island.rs hâlâ `pub const PANEL_W: f64 = 720.0;`.

Büyüyen her şey aynı karla büyüdü: yazı, boşluk, düğme, karakter, rozetler.
Ölçülen (headless, `docs/kanit/p8/olcum-sonra.json`): tasarım 640x286 → çizilen **960x429**,
pencere 1080x480, ortalı (60px / 60px boşluk).

**DPI bozulmadı:** `fitScale` artık 1080x480'e göre hesaplanıyor; 1.0/1.25/1.5/2.0'de
`EXPANDED_W * fit * KART_OLCEK <= PANEL_W/k` test ediliyor. `hit.ts` **değişmedi**:
kart açıkken tıklama kutusu zaten pencerenin tamamıydı (`hitRect`), yeni boyutla örtüşüyor.
Kompakt/gizli ada ve mini pet ölçüsünde kalıyor (pet penceresi 256, `pet.ts`'e dokunulmadı).

## 2. Yazı alt sınırları (1,5 sonrası gerçek px)

`zoom` bütün yazıyı 1,5 kat büyüttü; sadece 8px'lik en küçük değerler 13px sınırının
altında kaldığı için taban değerler yükseltildi (8px→9px, alt menü/sayfa düğmesi 9px→10px,
`.more-menu .menu-item` 10px→11px, `.claude-lock` 9px→10px).

- En küçük yazı: 9px × 1,5 = **13,5 px** (sınır 13) ✓
- Alt menü / sayfa düğmeleri: 10-11px × 1,5 = **15-16,5 px** (sınır 14) ✓
- Başlık `h1`: 16px × 1,5 = **24 px** (sınır 20) ✓

## 3. Sağlık şeridi

- **Ham metin → haplar:** `.health-strip` artık flex satırı; her öğe `.health-pill`
  (yeşil `✓` = çalışıyor, gri `✗` = kapalı), `aria-label` + `title` + `data-ok` ile.
- **Çelişki çözüldü — tek kaynak:** Yeni `windows/src/core/kopru.ts` Claude köprüsünü
  tanımlar: *son 5 dakikada mesaj **ya da** ada canlı iş*. Hem üstteki bağlantı satırı
  hem şerit bu dosyayı okur.
- **İki satırdan biri kaldırıldı:** `message.ts`'teki "Afu bağlantısı: Claude — Codex ✓ …"
  satırı silindi (şerit aynı bilgiyi daha zengin veriyor). `Bridge.mesajlar()`
  (`mesajlar_list`) eklendi; `BalonModeli.bagli()` da aynı kuralı kullanıyor.
- Tıklama davranışı korundu: ✗ olana tıklayınca tek cümle (`aktivasyon_kontrol.test.ts` yeşil).

## 4. Ekrana sığma (taşma yok)

Pencere mantıksal 1080x480; `dpi.rs` testi 1366x768 @%100 ve 1920x1080 @%150
(1280x720 mantıksal) için "sığar" diye ölçüyor. Ölçüm: her senaryoda ada 960x429,
içerik taşması (`scrollHeight-clientHeight`) = **0**, konsol hatası yok.
Kanıt: `docs/kanit/p8/` (15 senaryo × 3 ekran).

## Değişen dosyalar
`windows/src/core/layout.ts`, `windows/src/core/kopru.ts` (yeni), `windows/src/core/bridge.ts`,
`windows/src/style.css`, `windows/src/island/island.ts`, `windows/src/views/views.ts`,
`windows/src/message/message.ts`, `windows/src-tauri/src/dpi.rs`,
`windows/tests/p8_kart_buyut.test.ts` (yeni, 15 test), `windows/scripts/p8-kanit.mjs` (yeni).
**Dokunulmayan:** `windows/src-tauri/src/island.rs`, `windows/src/afu/pet.ts`, exe/git yok,
görünür pencere yok, görsel/ses dosyası yok.

## Test çıktısı

### cd windows; tsc --noEmit
```
(çıktı yok — hatasız)
```

### cd windows; npm test
```
 Test Files  37 passed (37)
      Tests  447 passed (447)
   Duration  5.08s
```

### cd windows/src-tauri; cargo test --offline
```
running 126 tests -> test result: ok. 124 passed; 0 failed; 2 ignored
running  34 tests -> test result: ok. 34 passed; 0 failed
running  12 tests -> test result: ok. 12 passed; 0 failed
running   8 tests -> test result: ok. 8 passed; 0 failed
running  19 tests -> test result: ok. 19 passed; 0 failed
...
toplam geçen: 243   kalan: 0
```
(Yeni: `dpi::tests::buyutulmus_kart_hedef_masaustlerine_sigar`; 720x320'e bağlı iki eski
DPI testi yeni pencere ölçüsüne göre güncellendi: 1080×1,25 = 1350 px, 1920'de ortalama
(1920-1080)/2 = 420.)

## Kanıt (başsız ekran görüntüleri)
- Önce: `docs/kanit/p8/once-*.png` + `olcum-once.json` (pencere 720x320, yazı 8-16px, şerit
  "AfuNöbet ✓Codex ✗Sesler ✗Claude ✗" ham metin, üstte çelişen bağlantı satırı)
- Sonra: `docs/kanit/p8/sonra-*.png` + `olcum-sonra.json` (pencere 1080x480, `zoom: 1.5`,
  ada 960x429, yazı 9-16px taban → 13,5-24px gerçek, şerit 4 hap)
- Üretici: `node scripts/p8-kanit.mjs once|sonra` (headless Chromium + yerel vite;
  görünür pencere açmaz, `tests/preview.html` fixture'ını kullanır)

## Bilinen not
- "Hook kurulu" ayrı bir Rust komutu yok (`hook_kur.rs` yalnız önizleme/uygular). Köprü
  canlılığı mesaj akışıyla ölçülür: hook kurulu değilse mesaj hiç gelmez, dolayısıyla
  "Claude ✗" doğru görünür. Ayrı sorgu istenirse `hook_durum` komutu eklenebilir.
