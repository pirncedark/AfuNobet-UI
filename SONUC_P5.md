SONUC: TAMAM

# P5 — Stüdyoda enseden tutma önizlemesi

Önce okundu: `SONUC_P1.md` (stüdyo 256 px) ve `SONUC_P4.md` (pet.ts enseden tutma sarkacı).

Değişen dosyalar (başka hiçbir dosyaya dokunulmadı):
- `studyo/animasyon_studyo.html`
- `windows/src/afu/pet.ts`
- `tests/test_studyo_uygula.py`

## 1. Stüdyoda aynı ense + aynı sarkaç

`studyo/animasyon_studyo.html` içindeki tutma önizlemesi artık P4'ün matematiğinin birebir
kopyasıdır (sayılar ve sönümlü-yay adımı `pet.ts` ile aynı):

| Stüdyo | Değer | pet.ts karşılığı |
| --- | --- | --- |
| `SARKAC_MAX_ACI` | 25 | `SARKAC_MAX_ACI` |
| `SARKAC_HIZ_TAM` | 1200 | `SARKAC_HIZ_TAM` |
| `SARKAC_YAY` / `SARKAC_SONUM` | 0.3 / 0.7 | aynı (tutarken) |
| `SARKAC_DONUS_YAY` / `SARKAC_DONUS_SONUM` | 0.1 / 0.85 | aynı (bırakınca) |
| `SARKAC_UZAMA_MAX` | 1.06 | aynı (`scaleY`) |
| `SARKAC_NEFES_MS` / `SARKAC_NEFES_PIK` | 600 / 2 | aynı (nefes + bacak) |
| `ENSE_PX` | 90 (256 pencerenin 90 px'i) | `transform-origin: 50% 90/PET_PENCERE*100%` |

- **Ense:** Dönme noktası artık eski 26 px değil, pencerenin 90 px'indeki ense noktasıdır.
  `#pet` `transform-origin: 50% 100%` kaldığı için (konum/boyut kaymasın diye) eksen kaydırma
  yerine `ENSE_OFSET = 256-90 = 166` px'lik `translate(0,-166px) … translate(0,166px)` çiti
  kullanılır — pet.ts'in 166 px ense kaymasıyla aynı geometri.
- **Sarkaç artık kare hızından bağımsız:** Eski sürümde her karede "adım = adım + hız" idi;
  artık `sarkac(adim, hiz, dt, hedef, sert)` kullanılır, `dt` 60 fps'e normalize edilir
  (en fazla 8 kare). Sürükleme anında hedef, yatay hızın EMA'sından (0,35) gelir; bırakılınca
  hedef 0 olur ve yumuşak yay + güçlü sönüm dik konuma çeker, 0,1° altında döngü kendini durdurur.
- **Uzama ve nefes:** `scaleY = sarkacUzama(swingVel)` (1…1,06), `nefes/bacak = sarkacNefes(...)`
  (0,6 sn periyot). Dönme açısına `bacak * 0.5` derece eklenir — pet.ts ile aynı bileşim sırası:
  `rotate(a) scaleY(s) translateY(nefes) translateX(bacak)`.
- `window.studyo` üzerinden `sarkac, sarkacHedef, sarkacUzama, sarkacNefes, ENSE_PX` dışa açıldı
  (mevcut `exportData/validate/normalization` desenine uyarak), testler bunları çalıştırıyor.

## 2. "Sallanma gücü" kaydırıcısı

- Etiket `Sallanma (Tutma)` → **`Sallanma gücü`**, kaydırıcıya `aria-label` eklendi.
- Değer `state.tutma.guc` (0–100). Kaydırıcı hem önizlemeyi hem kaydı günceller, durum satırına
  "Sallanma gücü N · uygulamada aynı savrulma görünür." yazar.
- Karpan `tutma.guc / 50`: **50 = pet.ts'in tam gücü**, 0 = sarkaç yok, 100+ = ±25° sınırında.
  Kullanıcı gördüğü salınım uygulamada birebir aynıdır.

## 3. Dışa aktarılan JSON: `tutma:{guc}`

- `DEFAULT` içinde `"tutma": {"guc": 50}` var; `validate()` `tutma` nesnesini zorunlu kılar
  (0–100 sayı, `{guc}` dışında anahtar yok), yoksa 50 yazar → `exportData()` ve indirilen
  `afu_animasyon.json` her zaman `tutma.guc` taşır.

## 4. `studyo/uygula.py`: doğrulama + pet.ts'e taşıma + `--dene`

- `validate()` `tutma` alanını doğrular (olmayan alan → `{guc: 50}`).
- `transform()` stüdyo ayar bloğuna `export const PET_TUTMA = {"guc": N};` yazar
  (`// STÜDYO AYAR BAŞLANGIÇ … SON` bloğu, yani tekrar uygulamada idempotent).
- `--dene` (varsayılan) farkı gösterir; `--yaz` yazmadan önce tüm doğrulamaları bitirir.
- `windows/src/afu/pet.ts`: P4'ün bıraktığı not uygulandı — `PET_TUTMA.guc` artık sarkaç hedefini
  ölçekliyor: `sarkacHedef(this.fareHiz * (PET_TUTMA.guc / 50))`. Varsayılan 50 özdeş davranış
  (P4 testleri yeşil kaldı), stüdyodan gelen değer artık uygulamada gerçekten etkili.

## Test çıktısı

```
$ python -m pytest tests/test_studyo_uygula.py -k "tutma or sarkac or studio or dry_run_diff" -v
tests\test_studyo_uygula.py::test_tutma_gucu_is_carried_to_pet_source PASSED
tests\test_studyo_uygula.py::test_missing_tutma_defaults_to_fifty PASSED
tests\test_studyo_uygula.py::test_invalid_tutma_is_rejected_before_transform[negative] PASSED
tests\test_studyo_uygula.py::test_invalid_tutma_is_rejected_before_transform[high] PASSED
tests\test_studyo_uygula.py::test_invalid_tutma_is_rejected_before_transform[nan] PASSED
tests\test_studyo_uygula.py::test_invalid_tutma_is_rejected_before_transform[bool] PASSED
tests\test_studyo_uygula.py::test_invalid_tutma_is_rejected_before_transform[string] PASSED
tests\test_studyo_uygula.py::test_invalid_tutma_is_rejected_before_transform[missing] PASSED
tests\test_studyo_uygula.py::test_invalid_tutma_is_rejected_before_transform[extra] PASSED
tests\test_studyo_uygula.py::test_invalid_tutma_is_rejected_before_transform[not_object] PASSED
tests\test_studyo_uygula.py::test_invalid_tutma_is_rejected_before_transform[array] PASSED
tests\test_studyo_uygula.py::test_dry_run_diff_shows_the_hold_strength PASSED
tests\test_studyo_uygula.py::test_studio_has_sallanma_gucu_slider_and_exports_hold PASSED
tests\test_studyo_uygula.py::test_studio_html_script_blocks_compile PASSED
tests\test_studyo_uygula.py::test_studio_sarkac_matches_pet_source PASSED
====================== 15 passed, 36 deselected in 0.21s ======================
```

`test_studio_sarkac_matches_pet_source` HTML'deki sarkac bloğunu node'da çalıştırıp (a) dokuz sabiti
`pet.ts`'ten regex ile okuyup eşitliğini, (b) ense noktasını `pet.ts`'in
`transform-origin ... \${90 / PET_PENCERE` ifadesiyle eşitliğini, (c) davranışı
`[sarkacHedef(600), sarkacHedef(-600), sarkacHedef(99999), sarkacHedef(0), sarkacHedef(NaN)]
 == [-12.5, 12.5, -25, 0, 0]`, `uzama ∈ [1, 1.06]`, `nefes(150 ms) = 2`,
`nefes(300 ms) = 0` (bacak sıfır geçişi), 240 kare sonra `|adım| + 12 < 0,5` ve bırakınca
`|açı| < 0,1` olduğunu denetler.

```
$ python -m pytest -q tests/test_studyo_uygula.py
...................................................                      [100%]
51 passed in 0.47s

$ python -m pytest -q tests
185 passed, 1 warning in 21.70s      (uyarı: test_onay_cevapsiz_sure_dolunc0 — önceden var olan tempfile PermissionError)

$ node -e "…<script> bloklarını new Function ile derle…"
1 script bloğu derlendi (new Function).

$ node -e "…"   # HTML script derleme kontrolü (test içinde de çalışıyor)
All script blocks compiled.

$ cd windows; npx tsc --noEmit
(çıktı yok — hata yok, exit code 0)

$ npm test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner
 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows
 Test Files  41 passed (41)
      Tests  521 passed (521)
   Duration  5.57s
```

### `--dene` farkı (gerçek `pet.ts` üzerinde, `tutma.guc = 70` ile)

```
$ python studyo/uygula.py afu_animasyon.json --dene
…
+export const PET_TUTMA = {"guc": 70};
…
-export const PET_TUTMA = { guc: 50 };
```

## Kural denetimi
- Exe paketleme yapılmadı, git commit/push yapılmadı, görünür pencere açılmadı.
- Görsel/ses dosyalarına dokunulmadı; `island.rs` okunmadı/değiştirilmedi.
- Başka ajanın değişikliği silinmedi: `pet.ts` ve HTML düzenlenmeden hemen önce yeniden okundu;
  P3'ün tutuş geometrisi (256 px, transform-origin) ve P4'ün sarkaç sabitleri korundu, tüm testler
  yeşil (python 185, vitest 41 dosya / 521 test, tsc temiz).

## Notlar / sonraki adım
- Stüdyo `DEFAULT` sekansları arasında `surukleme` / `geri_donus` / `yaslanma` yok; bu yüzden
  stüdyodan çıkan JSON'u olduğu gibi `uygula.py`'ye vermek "gerekli sekanslar eksik" hatası verir
  (P3/P4'ten gelen, bu görevle ilgisiz kural). `tutma.guc` alanı bu kapıdan geçmeden de doğrulanır
  ve taşınır (bkz. `test_tutma_gucu_is_carried_to_pet_source`).
- Bir sonraki adımda stüdyoya `surukleme` sekansı eklenirse tutma önizlemesi o kareyle de
  otomatik olarak aynı sarkacı kullanacaktır (tek kaynak `tutma.guc`).
