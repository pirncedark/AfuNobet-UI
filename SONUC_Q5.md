SONUC: TAMAM

# Q5 — Sahte test modu uygulamaya bağlandı (E10)

## Ne yapıldı

1. **Ortam değişkeni desteği DOĞRULANDI** (kod değişikliği gerekmedi):
   - `windows/src-tauri/src/state.rs:8` — `AFUNOBET_UI_STATE` ile `state.json` yolu çözülüyor.
   - `windows/src-tauri/src/questions.rs:49` — `AFUNOBET_SORU_DIZINI` soru/cevap kökü olarak okunuyor (verilmezse `state.json` klasörüne düşüyor).
   - Uygulama tarafında hiçbir değişiklik yapılmadı. `src/views` ve `island` dosyalarına dokunulmadı.

2. **Tek komutluk başlatıcı eklendi**: `scripts/sahte_modda_ac.ps1`
   - Test klasörünü (`state.json`, `sorular/`, `cevaplar/`) oluşturur.
   - `AFUNOBET_UI_STATE` + `AFUNOBET_SORU_DIZINI` değişkenlerini bu klasöre bağlar.
   - Bir senaryo oynatır (`-Senaryo`, varsayılan `bos`).
   - **Pencereyi kendisi açmaz.** `-Ac` verilirse başlatır; verilmezse yalnızca ortamı hazırlayıp komutu yazdırır. Gerekçe: görünür pencere kullanıcının isteğine bağlı kalmalı.
   - Gerçek AfuNöbet klasörüne yazmaz; yalnızca test klasörüne yazar.

3. **`docs/SAHTE_TEST_MODU.md`** güncellendi: "sahte modda aç" tek komutu, `-Ac`/`-Senaryo`/`-Hedef` tablosu, `AFUNOBET_SORU_DIZINI` açıklaması, otomatik doğrulama komutları, `bos` senaryosu.

4. **`windows/tests/q5_sahte_mod.test.ts`** (15 test): `scripts/sahte_olay.py`'nin ürettiği dosyalar **uygulamanın kendi ayrıştırıcılarıyla** okunur — `parseState` (state.ts) ve `sorulariAyikla`/`SoruModeli` (question.ts). Altı fixture gerçek üreticinin çıktısıdır.

5. **`tests/test_sahte_olay.py`** mevcuttu ve geçti (8 test) — üreticinin kendisi.

## Düzeltilen iki test hatası

Vitest ilk çalıştırmada 2 test kırmızıydı. İkisi de **uygulama hatası değil, test yazım hatasıydı**:

- `süresi geçen soru kart olmaz`: `coz(simdi + 200000)` çağrısı saat kaydırıldığında `canli()` de o saatten türetildiği için soru yine canlı kalıyordu. Artık kayıt sabit, yalnızca okuma saati ileri alınıyor.
- `surum: 2` atılır deniyordu: sürüm sözleşmesi Rust tarafında süzülüyor (`questions.rs:154`), TS ayrıştırıcıda değil. Test artık sürümü iddia etmiyor; bunun yerine gerçekten süzülen alanları sınıyor (kimlik, tür, boş metin, seçeneksiz kayıt).

## Doğrulama

Fixture'lar yeniden üretildi ve **üreticinin çıktısıyla birebir aynı** olduğu doğrulandı (yalnızca zaman damgaları farklı; test bunları tazeler):

```
=== bos ===        AYNI
=== bayat ===      AYNI
=== hata ===       yalnızca started_at/updated_at farklı
=== gemini_kota === yalnızca started_at/updated_at/checked_at farklı
```

`scripts/sahte_modda_ac.ps1` geçici bir klasörle çalıştırıldı: klasörü kurdu, ortamı bağladı, `bos` senaryosunu oynattı, çıkış kodu 0.

### tsc --noEmit (çıktının son satırı)

```
TSC_EXIT=0
```

### npm test (çıktının son satırları)

```
> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner


 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows


 Test Files  43 passed (43)
      Tests  544 passed (544)
   Start at  10:13:35
   Duration  6.71s (transform 2.51s, setup 0s, import 5.32s, tests 7.07s, environment 8ms)
```

(Not: yukarıdaki `setup 0s` değeri terminalin satır kaydırmasıyla oluşmuş görünüm; gerçek çıktı `setup 0ms, environment 8ms`'dir.)

### pytest

```
........                                                                 [100%]
8 passed in 1.11s
```

## Kural uyumu

- `windows/src/views` ve `island` dosyalarına **dokunulmadı**.
- `windows/src-tauri/src/island.rs` **değişmedi**.
- Sadece `scripts/`, `docs/` ve `tests/` altına yazıldı.
- Exe üretilmedi, git commit yapılmadı, görünür pencere açılmadı, görsel/ses dosyası eklenmedi.
