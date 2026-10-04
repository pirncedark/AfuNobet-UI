# Ajan protokolü (sürüm 1)

Herhangi bir ajan (Codex, Gemini, OpenCode, Claude, ya da yarın gelecek
"yeni-ajan") adaya **aynı biçimde** olay gönderir. Ada kod değişmeden yeni ajanı
gösterir. Kanal yalnız yereldir: Windows adlandırılmış boru (named pipe). Ağ yok,
model çağrısı yok.

## Kanal

- Boru adı: `\\.\pipe\afunobet-ajan-<kullanıcı>` (`<kullanıcı>` = `USERNAME`
  küçük harf, yalnız `[a-z0-9_-]`, boşsa `kullanici`). Test için
  `AFUNOBET_AJAN_PIPE` tam boru adını verir.
- Her satır bir JSON nesnesi (UTF-8, `\n` ile biter). Bir bağlantıda birden çok
  satır gönderilebilir.
- Ada her satıra tek satır cevap yazar: `{"ok":true}` ya da
  `{"ok":false,"neden":"..."}`. Gönderenin cevabı beklemesi **gerekmez**.

## Güvenlik ve sınırlar (E5)

| Sınır | Değer | Aşılınca |
|---|---|---|
| Kim bağlanabilir | Yalnız aynı Windows kullanıcısı (boru DACL'i yalnız kendi SID'imiz; uzak istemci reddi `PIPE_REJECT_REMOTE_CLIENTS`; bağlanan istemcinin SID'i ayrıca doğrulanır) | Bağlantı kapatılır |
| Satır boyutu | 16 384 bayt | `{"ok":false,"neden":"boyut"}`, bağlantı kapanır |
| Bağlantı başına satır | 64 | `{"ok":false,"neden":"sinir"}`, bağlantı kapanır |
| Sessiz bekleme | 2 sn içinde veri gelmezse | Bağlantı kapanır |
| Eşzamanlı bağlantı | 4 | Fazlası hemen kapatılır |
| Aynı adlı sahte boru | `FILE_FLAG_FIRST_PIPE_INSTANCE` | Ada boruyu açmaz, sonra yeniden dener |

## Olay biçimi (E1)

```json
{
  "surum": 1,
  "ajan": "yeni-ajan",
  "olay": "working",
  "oturum": "y-42",
  "gorev": "Testleri yaz",
  "zaman": 1790000000000
}
```

| Alan | Kural |
|---|---|
| `surum` | `1`; yoksa 1 sayılır, başka değer reddedilir |
| `ajan` | Zorunlu, `[a-z0-9_-]{1,32}`. Liste yok: yeni ad yeni ajandır |
| `olay` | Zorunlu. Standart ad ya da ajanın kendi olay adı (aşağıdaki tabloyla çevrilir). Tanınmayan ad reddedilir |
| `oturum` | `[A-Za-z0-9_.:-]{1,80}`; yoksa `ajan` adı kullanılır |
| `gorev` | İsteğe bağlı, ≤ 120 karakter; gizli bilgi maskelenir, yol/teknik metin gösterilmez |
| `alt_oturum`, `alt_tur` | Yalnız `subagent_start` / `subagent_stop` için: alt ajanın kimliği ve türü |
| `zaman` | Unix ms; yoksa alındığı an |

## Ortak olay standardı (E1b)

Standart adlar: `thinking`, `working`, `question`, `finished`, `error`,
`rate_limit`; alt ajan için `subagent_start`, `subagent_stop`.

| Standart | Claude Code kancası | Codex | Gemini CLI | OpenCode |
|---|---|---|---|---|
| `thinking` | `UserPromptSubmit`, `SessionStart` | `turn/started`, `item/reasoning/*` | `BeforeAgent`, `BeforeModel` | `session.status` (busy değilse) , `message.updated` |
| `working` | `PreToolUse`, `PostToolUse` | `item/started`, `item/completed`, `exec_command_begin` | `BeforeTool`, `AfterTool` | `tool.execute.before`, `tool.execute.after`, `message.part.updated` |
| `question` | `PermissionRequest`, `Notification` | `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`, `item/tool/requestUserInput`, `execCommandApproval`, `applyPatchApproval` | `Notification` | `permission.asked`, `permission.updated` |
| `finished` | `Stop`, `SessionEnd` | `turn/completed`, `agent-turn-complete` | `AfterAgent`, `SessionEnd` | `session.idle` |
| `error` | `StopFailure` | `error`, `turn/failed` | `Error` | `session.error` |
| `rate_limit` | — | `usageLimitExceeded`, `usage_limit_exceeded` | `RESOURCE_EXHAUSTED` | `rate_limit` |
| `subagent_start` | `SubagentStart` | — | — | — |
| `subagent_stop` | `SubagentStop` | — | — | — |

Büyük/küçük harf ve `_`/`.`/`/` farkı önemsenmez (`turn_completed` = `turn/completed`).
`error` olayı metninde `429`, `rate limit`, `usage limit`, `quota`, `kota` geçerse
`rate_limit` sayılır.

## Alt ajan takibi (E3)

`subagent_start` gelince görev akışında ana oturumun altında **ayrı satır** açılır
(`ust` = ana oturum, `alt` = true). `subagent_stop` o satırı `finished` yapar.
Biten satırlar 10 dk sonra listeden düşer; liste en fazla 64 satırdır.

Ada arayüze `ajan-olaylari` olayıyla şu listeyi verir (Rust `protokol::Kayit`,
TS `State.ajanlar`):

```json
{ "surum": 1, "satirlar": [
  { "oturum": "c-1", "ajan": "claude", "durum": "working", "gorev": "Planı uygula",
    "ust": null, "alt": false, "baslangic": 1790000000000, "guncelleme": 1790000004000, "bitti": false },
  { "oturum": "ag-7", "ajan": "claude", "durum": "working", "gorev": "Explore",
    "ust": "c-1", "alt": true, "baslangic": 1790000002000, "guncelleme": 1790000002000, "bitti": false }
] }
```

## Fail-open köprü (E4)

`scripts/afu_ajan_koprusu.py` ajanın kancasından çağrılır, stdin'deki kanca
JSON'unu protokol satırına çevirip boruya yazar. AFU kapalı, çökmüş ya da yavaşsa
**en geç `--zaman-asimi` (varsayılan 0,3 sn)** içinde sessizce çıkar, çıkış kodu
her zaman 0'dır; ajan AFU yüzünden beklemez.

## İnsan onay kapısı (F18)

Geri dönüşü zor işler (silme, force push, yayın/release, paket yayınlama,
`reset --hard`, güvenlik ayarı) köprüde yakalanır ve
[SORU_SOZLESMESI](SORU_SOZLESMESI.md) üzerinden adada soru kartı açılır:

- Kullanıcı "İzin ver" derse işlem sürer.
- "Reddet" ya da süre dolarsa işlem durur.
- AFU kapalıysa karar ajanın kendi onay ekranına bırakılır (`ask`); işlem yine
  onaysız ilerlemez.

## Örnek

```powershell
'{"surum":1,"ajan":"yeni-ajan","olay":"working","oturum":"y-1","gorev":"Rapor hazırla"}' |
  python scripts/afu_ajan_koprusu.py --ham
```
