SONUC: TAMAM

# GOREV_OC_TEST — Yeni özellikler için eksik testler

Dizin: `windows/` · Yeni dosya: `windows/tests/aktivasyon_kontrol.test.ts` (22 test)
`src/` değiştirilmedi. Mevcut test dosyalarına dokunulmadı. Git işlemi, exe paketleme, görünür pencere yok.

## 1. Yeni test dosyası

`tests/aktivasyon_kontrol.test.ts` — sahte DOM (`FakeEl`, `FakeWindow`), `Bridge` komutları
`vi.spyOn` ile taklit edildi; zamanlayıcılar `vi.useFakeTimers()` ile sahte.

| # | Davranış | Test sayısı | Sonuç |
|---|---|---|---|
| 1 | Sağlık şeridi: 4 öğe + ✗ olana tıklayınca tek cümle | 6 | geçti |
| 2 | Orkestra "Başlıyor…" geçici kartı + 30 sn uyarısı | 4 | geçti |
| 3 | Konuşma balonu: 120 karakter, 8 sn, en fazla 5 | 6 | geçti |
| 4 | Codex giriş satırı: bağlı / giriş yapılmadı | 6 | geçti |

### 1) Sağlık şeridi (`src/views/views.ts` `updateHealth`, satır 147-170)
- Dört öğe sırayla çizilir: `AfuNöbet ✓`, `Codex ✓`, `Sesler ✓`, `Claude ✓`.
- `Bridge.codexStatus` reddedilince (Codex yok) yalnız `Codex ✗` olur, kalanlar ✓ kalır.
- Şeride tıklanınca `flash()` tek cümle yazar. Her hata için ayrı cümle doğrulandı:
  `AfuNöbet kapalı…`, `Codex oturumu yok…`, `Sesler kapalı…`, `Claude görünmüyor…`,
  hepsi tek nokta ile biten tek cümle (satır sonu/`;`/ikinci cümle yok).
- Cümle 2600 ms sonra kendiliğinden gizlenir (sahte zamanlayıcı ile ölçüldü).

### 2) Orkestra "Başlıyor…" geçici kartı (`src/core/state.ts` `setPendingOrkestra`, satır 247-258)
- `State.setPendingOrkestra("codex", "Denetimi yap")` sonrası ana kartta
  `Başlıyor...` ve görev başlığı görünür; `focusTask.status === "Hazirlaniyor"`.
- 30 saniye iş gelmezse `afu-flash` olayıyla tam olarak bir uyarı düşer:
  `Görev 30 saniye içinde başlayamadı, arka planı kontrol edin.` (tek cümle, 30 sn sahte sayaçla).
- Uyarıdan sonra geçici kart kaybolur (`focusTask` boş, kartta `Başlıyor...` yok).
- 30 saniye içinde `state.json` işi gelirse (`State.apply`): geçici kart düşer, kart gerçek
  görevi gösterir ve **uyarı hiç oluşmaz** (`flashes` boş kalır).

### 3) Konuşma balonu (`src/message/message.ts`)
- `kisalt`: 160 karakterlik metin ve 200 emoji, `Array.from` ile 120 karaktere iner ve `…` ile biter;
  tam 120 karakterlik metne dokunulmaz.
- `BalonModeli.tick`: 7999 ms'de balon durur, 8000 ms'de kaybolur (`sonrakiBitis` null).
- Kuyruk sınırı: görünürken 8 mesaj → kuyruk `["3","4","5","6","7"]` (5);
  gizliyken 9 mesaj → `["4","5","6","7","8"]` (5), görünür olunca sıradaki `4` açılır.
- `balonOlustur`: kesilmiş metni gösterir (`Codex: ` + 120 karakter, `…` ile biter),
  tıklayınca tam mesajı açar ve olayın pet sürüklemesine yayılmasını engeller.

### 4) Codex giriş satırı (`src/chat/chat.ts` `refresh`)
- `hazir` → `Codex: bağlı (ChatGPT hesabı)`, giriş düğmesi gizli, yazı yazılınca Gönder açık.
- `oturum_yok` → `Codex: giriş yapılmadı`, giriş düğmesi görünür, Gönder kapalı.
- Nesne biçimi (`{status:"hazir"}`) de bağlı sayılır (Rust `status_from_account`: `hazir` ⟺ `logged_in`).
- Giriş düğmesi metni `Codex'e giriş yap`; tıklayınca `codexLogin` çağrılır ve tek cümle çıkar:
  `Açılan sayfada hesabını bağla.`
- `Codex bulunamadı.` hatasında `Codex kurulu değil. Kurmak için dokun.` + tıklanabilir kurma düğmesi;
  düğme `codexInstall`'i bir kez çağırır.

## 2. Testlerin boş olmadığının kanıtı

Dört davranışın beklentisi geçici olarak bozulup yeniden koşturuldu; dördü de kırmızı oldu
(hemen ardından geri alındı):

```
 × dört öğe çizer: AfuNöbet, Codex, Sesler, Claude      (AfuNöbet ✓ → ✗)
 × iş verince 'Başlıyor...' kartı görünür               (kart metni eşleşmedi)
 × 120 karakterden uzun metni '…' ile keser              (120 → 119)
 × hazırsa bağlı yazar ve giriş düğmesini gizler          (metin eşleşmedi)
 Tests  4 failed | 18 passed (22)
```

## 3. Derleme ve test

- `node node_modules/typescript/bin/tsc --noEmit` → **çıktı boş, hata yok** (tsconfig yalnız `src`'i kapsar).
- `npm test` → **34 dosya / 408 test geçti**, kırmızı test yok, atlama (skip) yok.

## 4. Kırmızı kalan test / olası hata

Yok. Dört davranış da kaynakta mevcut ve testlerle ölçüldü. Gözlenen küçük ayrıntılar (hata değil):
- `State.setPendingOrkestra` uyarıyı `window.dispatchEvent` ile yollar; testte `window` sahte
  pencereyle değiştirildi. Gerçek uygulamada `src/views/views.ts` bu olayı dinler.
- `chat.ts` `refresh` yalnız `status` alanına bakar (`status === "hazir"`); backend'de
  `hazir` değeri yalnız `logged_in === true` iken üretildiği için iki alan tutarlıdır
  (`src-tauri/src/codex.rs:80-93`).

## 5. `npm test` çıktısının son 5 satırı

```
 Test Files  34 passed (34)
      Tests  408 passed (408)
   Start at  02:06:05
   Duration  6.65s (transform 3.81s, setup 0ms, import 6.21s, tests 6.53s, environment 6ms)

```