SONUC: TAMAM

# AfuNöbet UI verisi — gerçek sütunlara bağlandı

Kapsam: `afu/ui_state.py` (yalnız okuma mantığı), `tests/test_ui_state_veri.py`, `tests/test_ui_state.py`,
`..\AfuNobet-UI\windows\tests\fixtures\state_uctan.json`, `..\AfuNobet-UI\windows\tests\veri_uctan.test.ts`.
Gerçek `state.db`/`state.json` yalnız SELECT ile okundu, supervisor'a dokunulmadı, git işlemi yapılmadı,
görünür pencere açılmadı, EXE paketlenmedi.

Kanıt kaynağı: `..\AfuNobet-UI\SONUC_OC_VERI.md` "UYUŞMAZLIK" 1, 2 ve 3 maddeleri.

## 1. effort: gerçek sütun `jobs.subagent_effort`

`jobs` şeması (salt okunur ölçüm, `sqlite3 state.db ".schema jobs"` ile aynı):

```
job_id, status, provider, checkpoint_data, created_at, updated_at,
subagent, subagent_model, subagent_effort, subagent_fast
```

- effort okuması artık `job.get("subagent_effort")` → `job.get("effort")` → `checkpoint["effort"]` sırası.
- model okuması: gerçek sütun `subagent_model` (zaten doğruydu); sıra `subagent_model` → `model` → `checkpoint["model"]`.
- `subagent_fast` (off) UI'de karşılığı olmadığı için okunmuyor.

Gerçek `state.db` üzerinden üretici çalıştırıldı (build_state, salt okunur bağlantı):

```
asama: Counter({'RUN': 143, 'MERGE': 103, 'TRIAGE': 4})
effort: Counter({None: 226, 'low': 13, 'high': 11})
model dolu: 24
```

UYUŞMAZLIK 1 kapandı: 24 gerçek kaydın `subagent_effort` değeri artık `state.json`'a yazılıyor
(daha önce 24 kayıtta effort boş gidiyordu).

## 2. stage: gerçek durumların tamamı eşlendi

Gerçek dağılım `SELECT DISTINCT status`: `HATA 142, COMPLETED 93, done 10, BEKLIYOR 4, DURAKLADI 1`;
`create_job` yeni kayda `RUNNING` yazıyor (`afu/supervisor/jobs.py:14`). Eşleme tablosu
(`afu/ui_state.py` `STAGE_MAP`; anahtarlar küçük harf + Türkçe ASCII katlanmış):

| jobs.status | stage | gerekçe |
| --- | --- | --- |
| `BEKLIYOR` | TRIAGE | kuyrukta, henüz başlamadı |
| `QUEUED`, `PENDING`, `WAITING`, `kuyrukta` | TRIAGE | aynı anlam |
| `PREPARING`, `HAZIRLANIYOR`, `bölünüyor` | SPLIT | görev hazırlanıyor/(adımlara) bölünüyor |
| `RUNNING`, `CALISIYOR` | RUN | çalışıyor |
| `HATA`, `FAILED`, `ERROR`, `LOST` | RUN | hata çalışma sırasında oluşur |
| `DURAKLADI`, `PAUSED` | RUN | çalışma ortasında duraklatıldı (kota) |
| `DOGRULAMA`, `VERIFY` | VERIFY | doğrulama adımı |
| `COMPLETED`, `done`, `BITTI`, `birlestirme`, `MERGE`, `tamamlandi` | MERGE | bitti; ada tarafı `Tamamlandi + merge` kombinasyonunda çubuğu tamamlanmış çiziyor |

Bilinmeyen durumda `stage` **yazılmaz** (null): `bilinmiyor`, `BILINMIYOR`, boş string, `None`.

UYUŞMAZLIK 3 kapandı: gerçek veride 250 kaydın **250'sinde** de aşama üretiliyor (RUN 143, MERGE 103, TRIAGE 4);
daha önce 0 kayıtta üretiliyordu.

## 3. handoff / context / cost: kaynak sütun yok, türetilemiyor

- `jobs` tablosunda `handoff`, `context`, `cost` sütunu **yok**.
- 250 kaydın `checkpoint_data` anahtarlarında da yok (`handoff 0, context 0, cost 0`).
- Devir (handoff) türetimi denendi, bulunamadı: `update_job_provider` (`afu/supervisor/jobs.py:41`) yeni
  sağlayıcıyı **üzerine yazıyor**, önceki sağlayıcıyı bırakmıyor; olay tablosu/tablosu yok.
  `logs/devret_*` (7 klasör) ajan çıktı logudur ve hiçbiri `sha256(job_id)[:16]` ile eşleşmiyor (0/250).
  Token/maliyet tarafında yalnız **ajan geneli** toplamlar var (`local_monitor.read_agent_metrics`,
  `fiyatlar.json`), görev bazında bağlam penceresi veya maliyet kaydı yok.
- Sonuç: bu üç alan yalnız `checkpoint_data` ile gelirse üretilir, aksi halde **yazılmaz** (mevcut
  doğru davranış korundu, kod değişmedi). Ada tarafı alan adlarını birebir karşılıyor, alan adı uyuşmazlığı yok.

UYUŞMAZLIK 2 "yazma yok" olarak doğrulandı ve kapatıldı; sütun/olay eklenmesi gerekiyorsa bu ayrı bir iş.

## 4. Testler

- `tests/test_ui_state_veri.py` yeniden yazıldı: gerçek sütun adları (`subagent_effort`, `subagent_model`,
  `subagent_fast`), gerçek DDL ile (geçici DB, `CREATE TABLE jobs ...`) üretim, gerçek durum değerlerinin
  tamamı için aşama testi, Türkçe karakterli durumlar, bilinmeyen durumda alan yazılmaması,
  kaynaksız alanlar (handoff/context/cost) ve bozuk değer testleri. 15 test.
- `tests/test_ui_state.py::test_contract_has_clean_fields_and_measured_values`: sözleşme alan kümesine
  `stage` eklendi (`RUNNING` → `stage "RUN"`) ve `row["stage"] == "RUN"` doğrulaması kondu.

## 5. Ada fixture'ı gerçek üreticiyle yeniden üretildi

- Geçici DB: `%TEMP%\opencode\afunobet_scratch\gecici.db` (gerçek DDL: jobs, provider_state, router_pref, shells).
- Üretim: `python afu/ui_state.py --db <gecici.db> --output <gecici>\state_uctan.json` (gerçek üretici),
  kota cache `AFUNOBET_QUOTA_CACHE` ile geçici klasöre yönlendirildi.
- Çıktı birebir `windows\tests\fixtures\state_uctan.json` (2853 bayt) olarak kopyalandı.
- Fixture 3 → **4 kayıt**: 1) `RUNNING` + `subagent_effort=high` (devir/bağlam/maliyet), 2) `RUNNING` Claude hedefli
  devir (üretici eler), 3) `BEKLIYOR` → `stage TRIAGE` (gerçek durum kanıtı), 4) `BILINMIYOR` → hiçbir alan üretilmez.
- `windows\tests\veri_uctan.test.ts` yalnız fixture sırasına göre güncellendi (4 kayıt, TRIAGE ve
  "bilinmeyen durumda alan yok" kontrolleri eklendi); `src/` altında hiçbir dosya değişmedi.

## Koşulan komutlar ve çıktılar (aynen)

### AfuNobet tam test paketi (doğrulama komutu)

```
$ python -m pytest -q tests
........................................................................ [ 97%]
..........                                                               [100%]
370 passed in 22.36s
```

Pytest'in son satırı: **370 passed in 22.36s**

### Gerçek DB'de aşama/effort dağılımı (build_state, salt okunur)

```
asama: Counter({'RUN': 143, 'MERGE': 103, 'TRIAGE': 4})
effort: Counter({None: 226, 'low': 13, 'high': 11})
model dolu: 24
```

### Fixture üretimi (gerçek üretici, geçici DB)

```
$ python %TEMP%\opencode\afunobet_scratch\uret.py %TEMP%\opencode\afunobet_scratch\gecici.db
gecici db: C:\Users\afuuu\AppData\Local\Temp\opencode\afunobet_scratch\gecici.db
$ AFUNOBET_QUOTA_CACHE=%TEMP%\opencode\afunobet_scratch\yok.cache python afu/ui_state.py --db %TEMP%\opencode\afunobet_scratch\gecici.db --output %TEMP%\opencode\afunobet_scratch\state_uctan.json
cikis=0
```

Üretilen kayıtların ölçülen alanları:

```
uctan-1  codex     Calisiyor  stage=RUN     model=gpt-x effort=high  handoff=var context=var cost=0.42
uctan-2  codex     Calisiyor  stage=RUN     model=gpt-x effort=low   handoff=YOK (Claude hedefli elendi)
uctan-3  gemini    Bekliyor   stage=TRIAGE  model=yok  effort=yok
uctan-4  opencode  Hazirlaniyor stage=YOK  model=yok  effort=yok  handoff/context/cost=YOK
```

### Ada hedefli test

```
$ npx vitest run tests/veri_uctan.test.ts

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  02:17:56
   Duration  313ms (transform 107ms, setup 0ms, import 103ms, tests 71ms, environment 0ms)

cikis=0
```

### Ada tam paket + tsc

```
$ npm test

 Test Files  36 passed (36)
      Tests  432 passed (432)
   Duration  5.40s

$ node node_modules/typescript/bin/tsc --noEmit
tsc cikis=0
```

## Değişen dosyalar

- `afu/ui_state.py` — `STAGE_MAP` + `_fold()`/`_stage_of()`, effort `subagent_effort`, model `subagent_model`.
- `tests/test_ui_state_veri.py` — gerçek sütun ve gerçek durum değerleriyle yeniden yazıldı.
- `tests/test_ui_state.py` — sözleşme alan kümesine `stage` eklendi.
- `..\AfuNobet-UI\windows\tests\fixtures\state_uctan.json` — gerçek üretici çıktısı (yeniden üretildi).
- `..\AfuNobet-UI\windows\tests\veri_uctan.test.ts` — 4 kayıtlı fixture'a göre güncellendi.

## Değişmeyenler

`state.db` (589824 bayt, sha256 `555d446e949049b8…`) ve `state.json` (127447 bayt, sha256 `33c5c35c9c2a68f3…`)
yalnız SELECT ile okundu; supervisor, router, daemon ve komut satırı dosyalarına dokunulmadı.
