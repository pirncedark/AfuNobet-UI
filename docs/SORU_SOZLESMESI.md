# Soru sözleşmesi (sürüm 1)

Bir ajan (Codex, sonra Gemini/OpenCode) çalışırken kullanıcıdan onay ya da cevap
isterse soru **adada** görünür; kullanıcı tek tıkla ya da kısa metinle cevaplar,
cevap ajana geri gider. Kanal yalnız **yerel dosyalardır**: ağ yok, model çağrısı
yok.
*(İstisna - 2026-10-03: Kullanıcı isteğiyle Claude Code için yalnız bildirim/soru köprüsü (hook) serbest bırakıldı. Ancak Claude'un otomatik iş yapması hâlâ yasaktır.)*
## Örnek aldığımız akış (upstream, upstream/main)

| Konu | upstream | Bizde |
|---|---|---|
| Kanal | Claude Code `PermissionRequest` hook'u → `upstream hook` → adlandırılmış boru (`windows/hook/src/main.rs:13-15`, `windows/src-tauri/src/pipe.rs:1-20`) | Ajan köprüsü → `sorular/<id>.json`, ada → `cevaplar/<id>.json` |
| Veri | hook JSON'u (`tool_name`, `tool_input`, `request_id`), cevap yalın `allow`/`deny` (`pipe.rs:288-296`, `hook/src/main.rs:73-86`) | Aşağıdaki soru/cevap kayıtları |
| Arayüz | Tek onay kartı: hedef metni + `Deny`/`Allow` (`windows/src/views/views.ts:289-316`), hedef metni `approvalTarget` ile seçilir (`windows/src/island/hooks.ts:95-121`) | `windows/src/question/question.ts` soru kartı |
| Tek kart | İkinci istek ilkini asla ezmez; geri çevrilir (`hooks.ts:281-289`) | Kart sırayla gösterilir; en eski soru önce |
| Zaman aşımı | Hook 110 s bekler, ada 108 s içinde cevaplar, kart 110 s sonra kapanır (`hook/src/main.rs:27`, `pipe.rs:36-37`, `hooks.ts:315-327`) | `sonGecerlilik` geçince kart kapanır; köprü **varsayılan cevabı** (güvenli olan: reddet) kullanır |
| Cevapsız kalma | Hiçbir şey yazılmaz, terminal sorar (`pipe.rs:218-219`) | Köprü varsayılanı döndürür; ada hiçbir şey yazmaz |
| Uzun alanlar | 2000 karakterde kesilir, büyük alanlar atılır (`hook/src/main.rs:30-35`) | Metin 2000, ayrıntı 4000 karakterde kesilir |

## Klasörler

Kök: AfuNöbet'in `state.json` dosyasının bulunduğu klasör
(`AFUNOBET_UI_STATE` / `AFUNOBET_DB` ile değişebilir; ayrıca `AFUNOBET_SORU_DIZINI`
doğrudan kökü verir).

```
<kök>/sorular/<id>.json   ← köprü yazar, ada okur
<kök>/cevaplar/<id>.json  ← ada yazar, köprü okur
```

- Her iki taraf da **atomik** yazar: önce `<id>.json.tmp`, sonra yeniden adlandırma.
- Ada klasörleri oluşturmaz; köprü oluşturur. Klasör yoksa ada bekler.
- Köprü cevabı okuyunca **iki dosyayı da siler**. Zaman aşımında da soru dosyasını siler.
- Dosya boyutu sınırı 64 KiB; aşan dosya yok sayılır.

## Soru kaydı (`sorular/<id>.json`)

```json
{
  "surum": 1,
  "id": "codex-7f3a",
  "ajan": "codex",
  "tur": "komut",
  "baslik": "Komut çalıştırılsın mı?",
  "metin": "npm test",
  "ayrinti": "C:\\proje",
  "secenekler": [
    { "id": "evet", "etiket": "İzin ver" },
    { "id": "hayir", "etiket": "Reddet" }
  ],
  "serbestMetin": false,
  "gizli": false,
  "varsayilan": "hayir",
  "olusturma": 1790000000000,
  "sonGecerlilik": 1790000110000
}
```

| Alan | Kural |
|---|---|
| `surum` | `1` dışı yok sayılır |
| `id` | `[A-Za-z0-9_-]{1,64}`; dosya adıyla aynı olmalı |
| `ajan` | `[a-z0-9_-]{1,32}` (ör. `codex`, `gemini`, `opencode`) |
| `tur` | `komut` (komut izni), `dosya` (dosya değişikliği), `izin` (ek yetki), `soru` (açık uçlu) |
| `baslik` | ≤ 120 karakter, kullanıcı dili; teknik terim yok |
| `metin` | ≤ 2000 karakter; **gizli bilgi maskelenir** |
| `ayrinti` | isteğe bağlı, ≤ 4000 karakter, maskelenir |
| `secenekler` | 0–6 seçenek; `id` `[A-Za-z0-9_-]{1,32}`, `etiket` ≤ 40 karakter |
| `serbestMetin` | `true` ise kısa metin alanı gösterilir |
| `gizli` | `true` ise metin alanı parola gibi gizlenir (Codex `isSecret`) |
| `varsayilan` | Zaman aşımında köprünün kullanacağı seçenek `id`'si (yalnız köprü kullanır) |
| `olusturma`, `sonGecerlilik` | Unix ms; `sonGecerlilik` geçmiş soru gösterilmez, cevaplanamaz |

Seçenek ya da serbest metin yoksa soru geçersizdir.

## Cevap kaydı (`cevaplar/<id>.json`)

```json
{ "surum": 1, "id": "codex-7f3a", "secim": "evet", "metin": null, "zaman": 1790000005000, "kaynak": "ada" }
```

- `secim` sorudaki seçeneklerden biri ya da `null`; `metin` ≤ 2000 karakter ya da `null`.
- İkisinden en az biri dolu; `metin` yalnız `serbestMetin: true` sorularda kabul edilir.
- Aynı soruya ikinci cevap yazılmaz (ilk cevap geçerlidir).
- Ada cevap metnini günlüğe yazmaz.

## Gizli bilgi maskeleme

Köprü yazarken, ada okurken (iki kat) şu kalıplar `•••` olur:
`sk-…`, `ghp_…`/`gho_…`/`github_pat_…`, `xox…-…`, `AKIA…`, `Bearer …`,
`password=`/`passwd=`/`token=`/`secret=`/`api_key=`/`apikey=` değerleri.
Kullanıcının yazdığı cevap maskelenmez (ajanın ihtiyacı vardır); gizli sorularda
alan ekranda gizlenir ve günlüğe yazılmaz.

## Codex eşlemesi (`scripts/codex_soru_koprusu.py`)

Codex app-server şemasındaki sunucu istekleri (`ses_deneme/schema/ServerRequest.json`):

| Codex isteği | `tur` | Seçenekler → Codex cevabı | Varsayılan |
|---|---|---|---|
| `item/commandExecution/requestApproval` | `komut` | `evet`→`accept`, `oturum`→`acceptForSession`, `hayir`→`decline` | `decline` |
| `item/fileChange/requestApproval` | `dosya` | `evet`→`accept`, `oturum`→`acceptForSession`, `hayir`→`decline` | `decline` |
| `item/permissions/requestApproval` | `izin` | `evet`→istenen izinler `scope: turn`, `hayir`→boş izin | boş izin |
| `item/tool/requestUserInput` | `soru` | seçenek etiketi ya da serbest metin → `answers[<soruId>].answers` | boş cevap |
| `execCommandApproval` (v1) | `komut` | `evet`→`approved`, `oturum`→`approved_for_session`, `hayir`→`denied` | `denied` |
| `applyPatchApproval` (v1) | `dosya` | `evet`→`approved`, `oturum`→`approved_for_session`, `hayir`→`denied` | `denied` |
| `mcpServer/elicitation/request` ve diğerleri | — | Köprü soru açmaz | — |

`requestUserInput` birden çok soru taşırsa her biri ayrı soru dosyası olur; cevaplar
toplanıp tek Codex cevabı döner. Codex'in `availableDecisions` listesi varsa yalnız
orada olan seçenekler gösterilir.

## Zaman aşımı

Varsayılan süre 110 s (upstream ile aynı). Köprü süre dolunca `varsayilan`ı uygular
ve soru dosyasını siler; ada `sonGecerlilik` anında kartı kendisi kapatır.
