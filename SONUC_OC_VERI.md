SONUC: TAMAM

# AfuNöbet → Ada veri uçtan uca doğrulama (yalnız test)

Kapsam: gerçek `../AfuNobet/afu/ui_state.py` çıktısı → ada `state.ts` ayrıştırıcısı → görünüm.
Kaynak kod, gerçek `state.json`/`state.db`, supervisor, git ve EXE değiştirilmedi.

## Yapılanlar

1. Okundu: `../AfuNobet/SONUC_UI_VERI.md`, `SONUC_F1_F5.md`, `../AfuNobet/afu/ui_state.py` (salt okunur), `windows/src/core/state.ts`, `windows/src/views/model.ts`, `windows/src/views/views.ts`.
2. Geçici klasörde sahte `state.db` üretildi (3 iş: çalışan+devirli, Claude hedefli devir, verisiz) ve **gerçek üretici** `ui_state.py` ile `state.json` yazıldı. Kota cache okuması izole edildi (`AFUNOBET_QUOTA_CACHE` scratch yoluna yönlendi).
3. Üretilen JSON birebir `windows/tests/fixtures/state_uctan.json` olarak kopyalandı (byte-for-byte doğrulandı).
4. Yeni test: `windows/tests/veri_uctan.test.ts` (12 test). Mevcut test dosyalarına dokunulmadı.
5. Doğrulama komutları çalıştırıldı: tsc 0, npm test 35 dosya / 420 test PASS, çıkış 0.

Fixture dondurulduğu için `isCurrent` canlılık penceresini test anında tazelemek adına testte `updated_at/started_at` alanları `new Date().toISOString()` ile yenilenir; ölçülen alanların kendisi (model/effort/stage/handoff/context/cost) fixture'dan okunur.

## Testin kanıtladığı davranış

| Gereksinim | Sonuç |
| --- | --- |
| Aşama çubuğu görünür | `stage: "RUN"` → `["Ayırma","Bölme","Çalışma","Doğrulama","Birleştirme"]`, aktif adım `Çalışma` (`aria-current="step"`), durumlar `done,done,current,todo,todo` |
| Model/effort gri yazı | `model: "gpt-x"`, `effort: "high"` → kartta `.f3-model-info` = ` · gpt-x · derin` |
| Devir satırı | `handoff {from:codex,to:gemini,reason:"kota doldu"}` → `Codex kotası doldu → Gemini devraldı` |
| Bağlam + maliyet (ayrıntı) | `context {25000/200000}` → `Bağlam: %13 dolu` + `aria-valuenow="12.5"`; `cost 0.42` → `Maliyet: $0.42` |
| Claude hedefli devir gösterilmez | Üreticinin elediği kayıtta `handoff` yok ve kartta `.task-handoff` çizilmiyor; ada tarafı ayrıca doğrudan `to:"claude"` ve `from:"claude"` kayıtlarını da gizliyor |
| Veri yoksa uydurma yok | 3. kayıtta `stage/effort/handoff/context/cost/model` alanlarının hiçbiri gelmiyor |

RED kontrolü: beklenti metinleri kasıtlı bozulduğunda 3 test düşüyor (9 pass / 3 fail) — test gerçekten veriye bağlı, sabit değere bağlı değil.

## UYUŞMAZLIK (test zorlanmadı, kaydedildi)

**UYUŞMAZLIK 1 — effort alan adı.** AfuNöbet `jobs` tablosunda `subagent_effort` yazıyor (gerçek veride 24 kayıt: 13 `low`, 11 `high`). `ui_state.py` ise `job.get("effort")` okuyor ve bu sütunu hiç okumuyor. Aynı sütunda `high` yazan bir kayıt üretildi, `checkpoint_data` içinde `effort` olmadan `ui_state.py` çalıştırıldı: `state.json` içinde `effort` alanı **hiç oluşmadı** (`model` oluştu). Ada `effort` bekliyor ve doğru gösteriyor; kopukluk üretici tarafta. Düzeltme `ui_state.py` içinde `job.get("subagent_effort")`, ama bu görevde yazma yasak.

**UYUŞMAZLIK 2 — handoff/context/cost için üretici sütunu yok.** `ui_state.py` `job.get("handoff")`, `job.get("context")`, `job.get("cost")` okuyor; `jobs` tablosunda bu sütunların hiçbiri yok ve gerçek `state.db`'de 250 kaydın `checkpoint_data` anahtarları arasında da yok (`stage`: 0, `effort`: 0, `handoff`: 0, `context`: 0, `cost`: 0, `model`: 0). Yani bu üç alan yalnız `checkpoint_data` ile gelirse üretilir. Fixture bu yolu kullandığı için alan adları ada ile birebir uyuşuyor; ada tarafında alan adı uyuşmazlığı yok.

**UYUŞMAZLIK 3 (risk, kırılma değil) — aşama yalnız Türkçe durumdan türetiliyor.** `ui_state.py` `stage`'i `job.status` sözlüğünden çeviriyor (`çalışıyor → RUN`). Gerçek `state.db` durum dağılımı `HATA 142, COMPLETED 93, done 10, BEKLIYOR 4, DURAKLADI 1`; hiçbiri `stage_map` anahtarı değil, dolayısıyla gerçek veride `stage` yine hiç üretilmiyor. Ada `stage` alanını doğru karşılıyor (`TRIAGE|SPLIT|RUN|VERIFY|MERGE`, büyük/küçük harf duyarsız).

## Değişen dosyalar

- `windows/tests/veri_uctan.test.ts` (yeni)
- `windows/tests/fixtures/state_uctan.json` (yeni, gerçek üretici çıktısı)

`src/` altında hiçbir dosya değiştirilmedi. `../AfuNobet/state.json` (137091 bayt, sha256 `91b4079f68d12622…`) ve `../AfuNobet/state.db` değişmedi; tüm üretim geçici klasörde (`%TEMP%\opencode\afunobet_scratch`) yapıldı. Git işlemi yapılmadı, görünür pencere açılmadı, EXE paketlenmedi.

## Koşulan komutlar ve çıktılar (aynen)

### 1) Sahte DB + gerçek üretici

```
python %TEMP%\opencode\afunobet_scratch\sahte_db.py %TEMP%\opencode\afunobet_scratch\sahte_state.db
AFUNOBET_QUOTA_CACHE=%TEMP%\opencode\afunobet_scratch\yok.cache python ../AfuNobet/afu/ui_state.py --db %TEMP%\opencode\afunobet_scratch\sahte_state.db --output %TEMP%\opencode\afunobet_scratch\state_uctan.json
```

```
scratch db: C:\Users\afuuu\AppData\Local\Temp\opencode\afunobet_scratch\sahte_state.db
```

Üretilen `state.json` (ilk görev, kısaltılmadan ilgili kısım):

```json
      "status": "Calisiyor",
      "current_action": "Metin duzenleniyor",
      "model": "gpt-x",
      "stage": "RUN",
      "effort": "high",
      "handoff": {
        "from": "codex",
        "to": "gemini",
        "reason": "kota doldu"
      },
      "context": {
        "used": 25000,
        "total": 200000
      },
      "cost": 0.42,
```

Son satırlar:

```json
      "mesaj": "Gorev sirada - hazir olunca baslayacak",
      "message": "Gorev sirada - hazir olunca baslayacak",
      "started_at": "2026-09-30T09:00:00+00:00"
    }
  ],
  "mesaj": "",
  "quotas": {}
}
```

### 2) effort uyuşmazlığı sondası (subagent_effort yazılı, checkpoint_data'de effort yok)

```
subagent_effout='high' yazili, checkpoint_data effort YOK
state.json model : gpt-x
state.json effort: None <- BOS: ui_state.py 'effort' okuyor, DB 'subagent_effort' yaziyor
```

Gerçek `state.db` ölçümü (salt okunur):

```
toplam is: 250
status dagilimi: [('HATA', 142), ('COMPLETED', 93), ('done', 10), ('BEKLIYOR', 4), ('DURAKLADI', 1)]
subagent_model dolu: 24
subagent_effout dolu: Counter({None: 226, 'low': 13, 'high': 11})
checkpoint icinde 'stage': 0
checkpoint icinde 'effort': 0
checkpoint icinde 'handoff': 0
checkpoint icinde 'context': 0
checkpoint icinde 'cost': 0
checkpoint icinde 'model': 0
```

### 3) Hedefli test

```
$ node node_modules/vitest/vitest.mjs run tests/veri_uctan.test.ts --configLoader runner

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  02:11:45
   Duration  409ms (transform 140ms, setup 0ms, import 104ms, tests 98ms, environment 0ms)

cikis kodu: 0
```

### 4) tsc

```
$ node node_modules/typescript/bin/tsc --noEmit
cikis kodu: 0
```

### 5) npm test

```
$ npm test

> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 Test Files  35 passed (35)
      Tests  420 passed (420)
   Start at  02:11:33
   Duration  6.73s (transform 3.54s, setup 0ms, import 5.97s, tests 6.87s, environment 7ms)

npm test cikis kodu: 0
```

`SONUC_F1_F5.md`'de kalan `pet-kirpma.test.ts` hatası artık yok: tüm 35 dosya ve 420 test yeşil, çıkış 0.

## Kalan iş (bu görevde yazma yasak)

`ui_state.py` içinde `job.get("effort")` → `job.get("subagent_effort")` okuması yapılmalı; handoff/context/cost için `jobs` tablosunda sütun veya `checkpoint_data` yazımı kararlaştırılmalı; `stage` için gerçek durum sözlüğü (`HATA/COMPLETED/done/BEKLIYOR/DURAKLADI`) `stage_map` ile eşleştirilmeli. Bu üçü düzeltilene kadar ada bu alanları doğru gösterir ama gerçek veride hep gizli kalır.
