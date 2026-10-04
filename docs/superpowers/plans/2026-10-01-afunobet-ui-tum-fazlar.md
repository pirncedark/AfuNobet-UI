## Öncelik sırası (2 Eki, kullanıcı onaylı)

Öncelik: canlı durum -> sağlam pet/pencere -> yerel durum cevapları -> Codex sohbeti -> ses. Yeni görsel/Blender (Faz D) gerçek Windows testinden (Kapı 1) sonra.

1. **Güvenilir canlı durum:** Görev başlayınca hemen görünsün, bitince güncellensin; bağlantı kesilince eski veri güncelmiş gibi gösterilmesin (bayat işareti + son güncelleme zamanı). Animasyondan önce gelir.
2. **Pet sakin ve faydalı:** Boşta hafif nefes; yalnız önemli olaylarda tepki; tam ekran oyunlarda gizlen; tıklanınca görev kartı açılsın, kendiliğinden sürekli açılmasın.
3. **Tek ana düğme "Afu'ya sor":** Sohbet ve bas-konuş aynı yerde; ajan seçimi, model ve bağlantı ayrıntılarını uygulama yönetir (gelişmiş gizli).
4. **Durum soruları yerelde cevaplanır:** "Codex ne yapıyor?", "Hangi iş bitti?" gibi sorular mevcut görev verisinden kota harcamadan yerelde cevaplanır; açıklama/değerlendirme gerekenler Codex'e gider.
5. **Ses önce metin:** Konuşma yazıya dönünce göndermeden önce düzeltilebilsin; "işi devam ettir" gibi eylemlerde ne yapılacağı açıkça gösterilsin (onay).
6. **Karakter sesi ile konuşma tarzı ayrı:** Doğal Türkçe ve anlaşılırlık öncelik; aşırı ince ses yorar; kısa bildirimler tatlı-enerjik, uzun cevaplar sakin.
7. **Her sürüm tek hareketle geri alınabilir:** Yeni exe doğrulandıktan sonra kısayol güncellenir; önceki çalışan sürüm `dist/onceki/` altında saklanır (`dist/onceki/GERI_AL.ps1` mevcut — kalıcı kural).


## Güncel kullanıcı kararı — seçenek 2

Kullanıcı "2 den devam" mesajıyla paketli uygulama ve çevrimiçi Windows SpeechRecognizer yedeğini seçti. Whisper mevcutsa önceliklidir; yerel model yoksa Windows yedeği kullanılır. Bu karar eski tek-exe/yalnız yerel STT tercihinin yerine geçer. İlk kullanımda internet kullanımı açıklanır; bas-konuş açık kullanıcı hareketiyle başlar, metin otomatik gönderilmez. Ücretli OpenAI API yedeği eklenmez. Gerçek mikrofon, çevrimiçi tanıma ve Windows kabul kapıları hâlâ kullanıcı testi olarak doğrulanacaktır. Önceki karar bekleniyor/engel kayıtları tarihsel durumdur; bu karar geliştirmeyi yeniden başlatır.

Uygulama ve MSIX hazırlığı sürüyor; tamamlandı/PASS iddiası henüz yok.

> Güncel yürütme kaydı (1 Ekim): Kullanıcının sonraki tam-plan yetkisiyle A→C→B geliştirmesi sürüyor. A otomatik kontrolleri geçti; C1/C2/C3 üretime bağlı; B1–B5 üretime bağlı, son gizlilik/yaşam döngüsü incelemesi ve B6 güncel paket geçti;153 TS/full Rust/120 ekran kontrolü PASS. Gerçek Kapı1/2/3, kaynak kullanımı ölçümü, R1/R2 yayın UNVERIFIED/pending. B4 yanıt TTS+working/speaking zinciri son153-test pakette tamamlandı. Windows STT yedeği paket kimliği+çevrimiçi servis gereksinimi nedeniyle yerel/tekexe hedefiyle çelişiyor; kullanıcı tercihi pending, tamamlanmış sayılmaz. Yerel Whisper mevcut, eksik modelde yazı öneriliyor. Koşullu D tetiklenmedi. Bu eski adım kutularının tamamını otomatik PASS kabul etmeyin; güncel kanıt tablosu docs/DEVAM_2026-10-01.md içinde.

# AfuNobet UI (tüm fazlar) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Bu projede yürütücü Codex'tir** (`afunobet calistir --ajan codex`). Claude görev dosyası yazar, kapıları denetler, commit/push yapar. Codex sandbox'ı internetsizdir; paket indirme gerekiyorsa DURUR ve paket adını raporlar.

**Goal:** Afu karakterli, canlı görev HUD'u ve görev çubuğunda yaşayan mini pet (Faz A); tek durum simgesinden tüm Afu uygulamalarına erişim (Faz C); üyelikle çalışan Codex sohbeti ve çevrimdışı Türkçe sesli asistan (Faz B).

**Architecture:** Üç ayrı süreç: AfuNöbet motoru (dokunulmaz) → `state.json` üreticisi (`afu/ui_state_loop.py`, AfuNobet deposunda) → `afunobet-ui.exe` (Tauri, salt okur, dosya olayıyla yenilenir). Faz B'de UI, tek bir `codex app-server` alt sürecini stdio JSON-RPC ile yönetir; kimlik doğrulamayı app-server'ın kendi ChatGPT oturumu yapar, UI token görmez.

**Tech Stack:** Tauri 2 + Rust (windows 0.61, notify 8) · TypeScript + Vite 6 + Vitest 4 (node ortamı) · Python 3 (AfuNobet, pytest) · Codex CLI 0.159.2 `app-server` (v2 protokolü).

**Spec:** `AfuNobet-UI/GOREV_MASTER.md` (kapsam kilidi, checkpoint ve STOP kuralları dahil). Yardımcı: `GOREV_COUCOU_AFU.md`, `GOREV_COUCOU_UX.md`, `GOREV_COUCOU_ICERIK.md`, `AfuNobet/docs/UI_SOZLESME.md`, Codex protokol şeması (`codex app-server generate-json-schema --out <klasör>`).

## Ürün Haritası (tüm fikirler tek yerde)

| Fikir | Kullanıcıya görünen | Kaynak | Faz / Görev |
|---|---|---|---|
| Canlı görev adası | Ekranın üst ortasında açılan kart: ajan, görev, dosya, ilerleme, en fazla 3 satır | Coucou (MIT) pencere/FSM | A1–A2 (A1–A10) |
| Afu karakteri | Beyin saçlı Afu; nefes, göz kırpma, imleç takibi, ifadeler | `afu-character/` resmî görseller | A3 (A12) |
| Doğru Türkçe | Görev, Çalışıyor, Duraklatıldı, Küçült… | kullanıcı kuralı | A3 (A11) |
| Mini pet | Küçültünce Afu görev çubuğuna kayar (750 ms zincir), Başlat'ın yanında 128 px bekler, uyur, uyanır, tepki verir | kullanıcı görselleri (9 sayfa, 34 kare) | A4 (A14–A17) |
| Tek durum simgesi | Pet kapatılınca sağda (bildirim alanı) Afu simgesi + durum noktası | kullanıcı isteği | A4 (A18) |
| Afu Merkez | Aynı simgeden ve petten AfuDM, AfuDesk, PadKöprü, AfuTube'a erişim ve kısa durum | kullanıcı isteği | C (C1–C3) |
| Codex sohbeti | Kartta Sohbet görünümü; ChatGPT üyeliğiyle, API anahtarı yok | yerel `codex app-server` şeması | B (B1–B2) |
| Dosya bırakma | Adaya bırakılan dosya sohbete ek olur, hiçbir yere gönderilmez | Coucou drop davranışı | B (B3) |
| Sesli asistan | Bas-konuş; çevrimdışı Türkçe Whisper; cevabı Windows sesiyle okur | MurMur (yalnız yerel ses kısmı) | B (B0, B4) |
| Sesli bildirim | "Codex görevi tamamladı." bir kez, tekrar yok | — | B (B5) |
| Daha akıcı pet (V2) | Katmanlı rig: göz takibi, kol ve baş hareketleri | Codex önerisi, `pet_teknik_sayfa.png` katman parçaları, Blender 3.6 | D (isteğe bağlı) |
| Claude kilidi | Yalnız `🔒 Claude KORUNUYOR` rozeti | kullanıcı kuralı | tümü |

## Yol Haritası ve Kapılar

```text
Faz 0 (Claude) ─▶ Faz A: A1 pencere ─▶ A2 canlı durum ─▶ A3 karakter+Türkçe ─▶ A4 mini pet+durum simgesi
                                                                                   │
                                               KAPI 1 (kullanıcı, Windows) ◀───────┘
                                                   │  FAZ A = ACCEPTED
                                                   ▼
                                    R1 kayıt (commit+push, Claude)
                                                   │
                                    Faz C: Afu Merkez (C1–C3) ─▶ KAPI 3
                                                   │
                                    B0 ses hazırlığı (Claude) ─▶ Faz B: sohbet, dosya, ses (B1–B6) ─▶ KAPI 2
                                                   │
                                    R2 sürüm (Claude, kullanıcı onayıyla)
                                                   ┆
                                    (isteğe bağlı) Faz D: katmanlı rig V2 ─▶ KAPI 4
```

Kurallar: Bir kapı geçilmeden sonraki faz başlamaz. Aynı anda tek ajan dosyaya yazar. Her checkpoint `docs/ILERLEME_MASTER.md`'ye yazılır; kota keserse oradan devam edilir. Faz C ile Faz B'nin sırası Karar 2'ye bağlıdır (öneri: önce C).

## Global Constraints

- Claude: API yok, süreç başlatma yok, hook yok, sohbet yok, yedek (fallback) yok. Arayüzde yalnızca `🔒 Claude KORUNUYOR`.
- Mochi / Coucou adı, ikonu, sesi, medyası derlemeye girmez. MIT `LICENSE` ve upstream atfı korunur.
- Arayüz metinleri UTF-8 ve doğru Türkçe: `Görev`, `Çalışıyor`, `Duraklatıldı`, `Küçült`, `Tamamlandı`, `Düşünüyor`, `Bekliyor`, `Kota yenilenince devam edecek`. `state.json` içindeki durum anahtarları (`Calisiyor` vb.) sözleşme gereği ASCII kalır; yalnızca gösterim etiketi Türkçedir.
- Ham hata, `429`, stacktrace, PID, port, IP, tam dosya yolu ana arayüzde görünmez.
- Gerçek değer yoksa `—`; tahmin yok.
- Arayüz hiçbir süreci öldürmez, arka planda süreç başlatmaz. İki istisna: (Faz C) kullanıcının tıklamasıyla kayıtlı Afu uygulamasının `.exe`'sini `ShellExecuteW` ile açmak; (Faz B) tek örnek `codex app-server` alt süreci (uygulama kapanınca sonlanır).
- Sandbox internetsiz: `CARGO_NET_OFFLINE=true`, `npm --offline`. Yeni bağımlılık eklemek yasak; `windows` crate'ine yeni **feature** eklemek serbest (kaynak zaten indirilmiş). **Tek istisna (Faz B, Görev B4):** `whisper-rs = "=0.11.1"`, `cpal = "0.15"`, `hound = "3.5"`; Claude Görev B0'da önceden indirir.
- MurMur (github.com/Mr-ABX/MurMur, commit `0be0d1b`; README'de MIT, depoda LICENSE dosyası yok) yalnızca **yerel ses yakalama ve yerel Whisper çevirisi** için örnek alınır. Bulut çevirisi (Groq/Gemini/Deepgram), API anahtarı, başka pencerelere otomatik yapıştırma (`enigo`), genel kısayol (`rdev`/global-shortcut), ekran asistanı ve model indirici ALINMAZ. Uyarlanan dosyaların başına atıf yorumu; `AFU_CHANGES.md` ve `THIRD_PARTY.md`'de kaynak ve commit.
- Yeni pencere açma, exe çalıştırma yok (Codex için). Gerçek Windows davranışı `UNVERIFIED` kalır, kullanıcı test eder.
- Faz D'de Blender yalnız arka planda (`blender -b`), pencere açmadan çalışır.
- Commit/push yalnızca kapılardan sonra, Claude tarafından (bkz. Görev R1). Faz içinde ilerleme `docs/ILERLEME_MASTER.md` ile tutulur.
- Apostrof yok (kabuk ve Python kuralı).

## Review Focus

1. **Gerçek `state.json`'da hiç `Calisiyor` kaydı yok, yüzlerce eski `Duraklatildi`/`Hata` var.** Beklenen: ana ekran eski kayıtlarla dolmaz, en fazla 3 satır, sayaç doğru. Test: Görev A6.
2. **Üretici yazarken arayüz okur (yarım dosya) veya üretici çöker.** Beklenen: arayüz son geçerli görünümü korur, üretici bozuk dosya yazmaz. Test: Görev A5 ve A7.
3. **Monitör/DPI değişimi ve ölçek uyuşmazlığı (125/150/175).** Beklenen: ada kırpılmaz, üst ortada kalır. Test: Görev A2 + kullanıcı testi.
4. **Görev çubuğu farklı yerde veya otomatik gizli, ya da tam ekran oyun açık.** Beklenen: pet çubuğun Başlat tarafında; çubuk gizliyse ekranın alt kenarında; tam ekran uygulamada görünmez. Test: Görev A15, A17.
5. **Aynı olayın tekrar tekrar bildirilmesi (dosya her yenilendiğinde).** Beklenen: bir iş için bir kez rozet/ses. Test: Görev A10 ve B5.
6. **Kayıttaki Afu uygulaması silinmiş/taşınmış ya da exe olmayan bir yol.** Beklenen: menüde "Kurulu değil", tıklanınca tek cümle; hiçbir şey çalıştırılmaz. Test: Görev C1.
7. **Codex oturumu yok veya app-server bulunamadı.** Beklenen: tek cümle "Codex oturumu açık değil.", çökme yok, Claude'a düşme yok. Test: Görev B2.

---

## Dosya Haritası

| Dosya | Sorumluluk | Faz |
|---|---|---|
| `windows/src/island/fsm.ts` | hidden/petit/home/greeting durum makinesi ve zamanlayıcılar | A1 |
| `windows/src-tauri/src/island.rs` | Upstream pencere davranışı (non-activating, click-through, imleç yoklaması). **Upstream'e geri döner.** | A1 |
| `windows/src-tauri/src/dpi.rs` | Afu konum/DPI hesabı (monitör yoksa varsayılan, ortalama) | A1 |
| `windows/src-tauri/src/tray.rs` | Tepsi: Aç / Bildirimleri duraklat / Çıkış | A1 |
| `windows/src/core/labels.ts` (yeni) | Türkçe gösterim etiketleri | A3 |
| `windows/src/core/state.ts` | `state.json` ayrıştırma, başlık önceliği, sekme durumları, kota | A2 |
| `windows/src/core/events.ts` (yeni) | Anlık görüntü farkından olay türetme + tekilleştirme | A2 |
| `windows/src/views/views.ts` | Kart, satırlar, sekmeler, kota paneli | A2/A3 |
| `windows/src/afu/character.ts` | Karakter ifadeleri ve mikro animasyonlar | A3 |
| `windows/src/afu/gestures.ts` (yeni) | Tık/hover sayaçları (dizzy, pozitif tepki) | A3 |
| `AfuNobet/afu/ui_state.py` | Mevcut tek seferlik üretici (alan ekleme) | A2 |
| `AfuNobet/afu/ui_state_loop.py` (yeni) | Periyodik, tek örnek, atomik üretici | A2 |
| `windows/src-tauri/src/codex.rs` (yeni) | app-server yaşam döngüsü + JSON-RPC çerçeveleme | B |
| `windows/src/chat/*.ts` (yeni) | Sohbet görünümü, akış, bağlam, ekler | B |
| `windows/src-tauri/src/voice/capture.rs` (yeni) | Mikrofon yakalama, 16 kHz mono (MurMur `audio.rs` uyarlaması) | B |
| `windows/src-tauri/src/voice/whisper.rs` (yeni) | Yerel Whisper çevirisi (MurMur `transcriber.rs` yerel yolu) | B |
| `windows/src-tauri/src/voice/winrt.rs` (yeni) | Windows TTS + yedek STT | B |
| `windows/src-tauri/src/voice/mod.rs` (yeni) | Tauri komutları, motor seçimi | B |
| `THIRD_PARTY.md` (yeni) | Coucou ve MurMur atıfları | B |
| `afu-character/kaynak/*.png` | Kullanıcının verdiği kaynak sayfalar (pet konsepti, sahneler, senaryo) | A4 |
| `afu-character/pet/*.png` (yeni) | Kesilmiş pet pozları | A4 |
| `windows/src-tauri/src/taskbar.rs` (yeni) | Görev çubuğu konumu, Başlat düğmesi, tam ekran algısı | A4 |
| `windows/src-tauri/src/glide.rs` (yeni) | Pencereyi üstten görev çubuğuna kaydırma yolu | A4 |
| `windows/src/afu/pet.ts` (yeni) | Pet durumları, kare sekansları ve görünümü | A4 |
| `windows/src-tauri/src/tray_icon.rs` (yeni) | Sağdaki durum simgesi (Afu + durum noktası) | A4 |
| `windows/src-tauri/src/apps.rs`, `apps_state.rs`, `windows/src/core/apps.ts` (yeni) | Afu Merkez: uygulama kaydı, durum okuma, menü | C |
| `docs/ILERLEME_MASTER.md` | Checkpoint kaydı | tümü |
| `AFU_CHANGES.md`, `docs/KULLANIM_REHBERI.html` | Değişiklik kaydı, kullanıcı rehberi | A3/B |

Test komutları (her görevde aynı):
- TS: `cd windows && npm test`
- Rust: `cd windows/src-tauri && CARGO_NET_OFFLINE=true cargo test`
- Python: `cd AfuNobet && python -m pytest -q`
- Derleme: `cd windows && npm run build && CARGO_NET_OFFLINE=true npx tauri build --no-bundle`

---

## FAZ 0 — Hazırlık (Claude, 15 dk)

### Görev 0: Çalışma alanını sabitle

**Files:** `docs/ILERLEME_MASTER.md` (yeni), `.gitignore`

- [ ] **Adım 1:** Masaüstü exe'nin kapalı olduğunu doğrula: `ps -W | grep -ci afunobet-ui-coucou` → `0`.
- [ ] **Adım 2:** Çalışan başka ajan olmadığını doğrula: `Get-Process opencode,gemini -ErrorAction SilentlyContinue` → boş.
- [ ] **Adım 3:** Yerel yedek dal oluştur (push yok): `git -C AfuNobet-UI switch -c afu/faz-a` ve mevcut durumu `git stash list` ile kontrol et; çalışma ağacını **commit etmeden** koru.
- [ ] **Adım 4:** `docs/ILERLEME_MASTER.md` oluştur:

```markdown
# İlerleme (GOREV_MASTER)
| Zaman | Checkpoint | Durum | Testler | Kalan | Sonraki adım |
|---|---|---|---|---|---|
| 2026-10-01 15:5x | Hazırlık | TAMAM | ts ?, rust ?, py 189 | A1 | Görev A1 |
```

- [ ] **Adım 5:** Taban testleri koş ve sayıları tabloya yaz (TS, Rust, Python). Bilinen kırık: `scripts/screenshots.mjs` "busy" beklentisi (Görev A13'te düzelir).

---

## FAZ A — Ürün (Codex)

### A1 — Pencere ve durum makinesi

### Görev A1: FSM zamanlayıcıları ve zorlama geçişleri

**Files:**
- Modify: `windows/src/island/fsm.ts`
- Test: `windows/tests/fsm.test.ts`

**Interfaces:**
- Produces: `IslandStateMachine` (`launch, mouseEntered, mouseLeft, click, greetComplete, reveal, forceHome, forcePetit, forceHidden, pinned, homeToPetitDelay=15, petitToHiddenDelay=60`)

- [ ] **Adım 1: Eksik davranış testlerini yaz**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IslandStateMachine } from "../src/island/fsm";

describe("ada zamanlayıcıları", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("açık hâl 15 sn fare yokken küçük hâle, 60 sn sonra gizliye iner", () => {
    const fsm = new IslandStateMachine();
    fsm.forceHome();
    fsm.mouseLeft();
    vi.advanceTimersByTime(15_000);
    expect(fsm.state).toBe("petit");
    fsm.mouseLeft();
    vi.advanceTimersByTime(60_000);
    expect(fsm.state).toBe("hidden");
  });

  it("sabitlenmiş uyarı fare ayrılsa da açık kalır", () => {
    const fsm = new IslandStateMachine();
    fsm.forceHome();
    fsm.pinned = true;
    fsm.mouseLeft();
    vi.advanceTimersByTime(120_000);
    expect(fsm.state).toBe("home");
  });

  it("fare üzerindeyken zamanlayıcı durur", () => {
    const fsm = new IslandStateMachine();
    fsm.forceHome();
    fsm.mouseLeft();
    vi.advanceTimersByTime(10_000);
    fsm.mouseEntered();
    vi.advanceTimersByTime(30_000);
    expect(fsm.state).toBe("home");
  });

  it("forceHidden bekleyen zamanlayıcıları iptal eder", () => {
    const fsm = new IslandStateMachine();
    fsm.forceHome();
    fsm.mouseLeft();
    fsm.forceHidden();
    vi.advanceTimersByTime(100_000);
    expect(fsm.state).toBe("hidden");
  });
});
```

- [ ] **Adım 2:** `npm test -- fsm` → yeni testlerden geçmeyenleri not et.
- [ ] **Adım 3:** Yalnızca geçmeyen davranışı `fsm.ts` içinde düzelt (upstream `IslandStateMachine.swift` mantığına sadık kal; `pinned` iken `scheduleHomeCollapse` çağrılmaz).
- [ ] **Adım 4:** `npm test` → hepsi PASS.
- [ ] **Adım 5:** `docs/ILERLEME_MASTER.md` satırı ekle.

### Görev A2: island.rs'i upstream'e döndür, Afu konumunu dpi.rs'te topla

Neden: `CLAUDE.md` `island.rs`'in upstream ile bayt bayt aynı kalmasını ister; OpenCode bu kurala aykırı değişiklik yaptı ve aynı hesap `dpi.rs`'te de var (çifte hesap).

**Files:**
- Modify: `windows/src-tauri/src/island.rs` (upstream'e dönüş)
- Modify: `windows/src-tauri/src/dpi.rs`, `windows/src-tauri/src/lib.rs`
- Test: `windows/src-tauri/src/dpi.rs` içindeki `#[cfg(test)]`

**Interfaces:**
- Produces: `dpi::place(app, pref, collapsed)`, `dpi::physical_for(logical, scale) -> u32`, `dpi::centred_x(left, width, window_w) -> i32`, `dpi::fallback_bounds() -> (i32, i32, i32)` (yeni: monitör listelenemezse birincil ekran varsayılanı)

- [ ] **Adım 1:** Farkı gör: `git diff HEAD -- windows/src-tauri/src/island.rs > $TEMP/island.diff` ve hangi fonksiyonların Afu tarafından gerçekten çağrıldığını `grep -n "island::" windows/src-tauri/src/*.rs` ile listele.
- [ ] **Adım 2: Test yaz** (`dpi.rs` test modülüne ekle)

```rust
#[test]
fn monitor_yoksa_varsayilan_genislikte_ortalar() {
    let (left, _top, width) = fallback_bounds();
    assert!(width >= 800, "varsayilan genislik makul olmali");
    let x = centred_x(left, width, physical_for(720.0, 1.5));
    assert!(x >= left && x + physical_for(720.0, 1.5) as i32 <= left + width);
}

#[test]
fn olcek_bozuksa_bire_duser() {
    assert_eq!(physical_for(720.0, f64::NAN), 720);
    assert_eq!(physical_for(720.0, 0.0), 720);
}
```

- [ ] **Adım 3:** `cargo test dpi` → yeni testler FAIL (`fallback_bounds` yok).
- [ ] **Adım 4:** `fallback_bounds` ekle (`GetSystemMetrics(SM_CXSCREEN)`; `windows` crate'inde `Win32_UI_WindowsAndMessaging` zaten açık). `display_bounds` monitör `None` olduğunda bunu kullansın.
- [ ] **Adım 5:** `git checkout HEAD -- windows/src-tauri/src/island.rs`. `lib.rs`'te konum için yalnızca `dpi::place` çağrıldığını doğrula; `island::apply_geometry` çağrısı varsa kaldır.
- [ ] **Adım 6:** `cargo test` ve `cargo check` → PASS. `git diff --stat HEAD -- windows/src-tauri/src/island.rs` → boş.
- [ ] **Adım 7:** `AFU_CHANGES.md`'ye "island.rs upstream ile aynı; Afu konumu dpi.rs" yaz.

### Görev A3: Tepsi menüsü ve bildirim duraklatma

**Files:**
- Modify: `windows/src-tauri/src/tray.rs`, `windows/src-tauri/src/lib.rs`
- Modify: `windows/src/core/state.ts`, `windows/src/main.ts`
- Test: `windows/tests/state.test.ts`

**Interfaces:**
- Produces (Rust): tepsi olayı `"tray"` yükü `"open" | "pause" | "resume"`.
- Produces (TS): `State.notificationsPaused: boolean`, `State.setPaused(paused: boolean): void`. Duraklatma yalnızca rozet/ses/otomatik açılmayı durdurur; veri yine güncellenir.

- [ ] **Adım 1: Test yaz**

```ts
it("bildirimler duraklatılınca görünüm güncellenir ama otomatik açılma istenmez", () => {
  State.setPaused(true);
  State.apply({ version: 1, tasks: [row({ status: "Tamamlandi" })], mesaj: "" });
  expect(State.snapshot.tasks).toHaveLength(1);
  expect(State.shouldAnnounce()).toBe(false);
  State.setPaused(false);
  expect(State.shouldAnnounce()).toBe(true);
});
```

- [ ] **Adım 2:** `npm test -- state` → FAIL.
- [ ] **Adım 3:** `state.ts`'e `notificationsPaused`, `setPaused`, `shouldAnnounce()` ekle. `tray.rs` menüsü: `Aç`, `Bildirimleri duraklat` (seçilince etiketi `Bildirimleri sürdür` olur), `Çıkış`. Etiketler UTF-8.
- [ ] **Adım 4:** `main.ts`'te `onEvent("tray", ...)` → `open` ise `forceHome`, `pause/resume` ise `State.setPaused`.
- [ ] **Adım 5:** `npm test`, `cargo check` → PASS.

### Görev A4: Pencere davranışı denetimi (kod, birim test)

Gerçek davranış kullanıcı testindedir; burada yapılandırmanın doğru olduğunu kanıtlarız.

**Files:**
- Test: `windows/src-tauri/tests/config.rs` (yeni)

- [ ] **Adım 1: Test yaz**

```rust
use serde_json::Value;

#[test]
fn pencere_ayarlari_ada_icin_dogru() {
    let raw = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/tauri.conf.json")).unwrap();
    let conf: Value = serde_json::from_str(&raw).unwrap();
    let w = &conf["app"]["windows"][0];
    assert_eq!(w["decorations"], false);
    assert_eq!(w["transparent"], true);
    assert_eq!(w["alwaysOnTop"], true);
    assert_eq!(w["skipTaskbar"], true);
    assert_eq!(w["focus"], false);
}
```

- [ ] **Adım 2:** `cargo test --test config` → eksik alan varsa FAIL.
- [ ] **Adım 3:** `tauri.conf.json`'u eksik alanlarla tamamla. Alt-Tab dışında kalma `island.rs` (upstream) `WS_EX_TOOLWINDOW` ile sağlanıyor mu, `grep -n TOOLWINDOW` ile kontrol et ve raporla.
- [ ] **Adım 4:** PASS → **A1 checkpoint**: tüm testler + `cargo check` + `npm run build` yeşil ise `ILERLEME_MASTER.md`'ye `A1 TAMAM` yaz; gerçek Windows maddeleri `UNVERIFIED`.

---

### A2 — Canlı durum, sekmeler, kota, olaylar

### Görev A5: state.json üreticisi (AfuNobet tarafı)

**Files:**
- Create: `AfuNobet/afu/ui_state_loop.py`
- Test: `AfuNobet/tests/test_ui_state_loop.py`

**Interfaces:**
- Consumes: `afu.ui_state.build_state(db_path=None) -> dict`, `afu.ui_state.write_state(db_path=None, output_path=None)`
- Produces: `run_once(db_path, output_path) -> bool`, `main(argv)` → `python -m afu.ui_state_loop --aralik 15`

- [ ] **Adım 1: Test yaz**

```python
import json
import pytest
from afu import ui_state_loop as loop


def test_hata_olursa_son_gecerli_dosya_korunur(tmp_path, monkeypatch):
    out = tmp_path / "state.json"
    out.write_text(json.dumps({"version": 1, "tasks": [], "mesaj": "eski"}), encoding="utf-8")
    def patlat(db_path=None):
        raise RuntimeError("db kilitli")
    monkeypatch.setattr(loop, "build_state", patlat)
    assert loop.run_once(None, out) is False
    assert json.loads(out.read_text(encoding="utf-8"))["mesaj"] == "eski"
    assert not (tmp_path / "state.json.tmp").exists()


def test_ikinci_ornek_baslamaz(tmp_path):
    kilit = tmp_path / "ui_state_loop.lock"
    with loop.tek_ornek(kilit):
        with pytest.raises(loop.ZatenCalisiyor):
            with loop.tek_ornek(kilit):
                pass


def test_basarili_yazim_atomik(tmp_path, monkeypatch):
    out = tmp_path / "state.json"
    monkeypatch.setattr(loop, "build_state", lambda db_path=None: {"version": 1, "tasks": [], "mesaj": ""})
    assert loop.run_once(None, out) is True
    assert json.loads(out.read_text(encoding="utf-8"))["version"] == 1
```

- [ ] **Adım 2:** `python -m pytest tests/test_ui_state_loop.py -q` → FAIL (modül yok).
- [ ] **Adım 3: Uygula**

```python
"""state.json u periyodik yenileyen tek ornek uretici. Motora dokunmaz."""
import argparse
import contextlib
import json
import os
import time
from pathlib import Path

from afu.ui_state import _db_path, build_state


class ZatenCalisiyor(RuntimeError):
    pass


@contextlib.contextmanager
def tek_ornek(kilit_yolu):
    kilit_yolu = Path(kilit_yolu)
    try:
        fd = os.open(kilit_yolu, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise ZatenCalisiyor(str(kilit_yolu))
    try:
        os.write(fd, str(os.getpid()).encode())
        yield
    finally:
        os.close(fd)
        with contextlib.suppress(OSError):
            kilit_yolu.unlink()


def run_once(db_path, output_path):
    output_path = Path(output_path)
    gecici = output_path.with_name(output_path.name + ".tmp")
    try:
        veri = build_state(db_path)
        gecici.write_text(json.dumps(veri, ensure_ascii=False), encoding="utf-8")
        os.replace(gecici, output_path)
        return True
    except Exception:
        with contextlib.suppress(OSError):
            gecici.unlink()
        return False


def main(argv=None):
    p = argparse.ArgumentParser(description="AfuNobet UI durum dosyasini periyodik yenile")
    p.add_argument("--db")
    p.add_argument("--output")
    p.add_argument("--aralik", type=float, default=15.0)
    a = p.parse_args(argv)
    db = _db_path(a.db)
    out = Path(a.output) if a.output else Path(db).with_name("state.json")
    with tek_ornek(out.with_name("ui_state_loop.lock")):
        while True:
            run_once(db, out)
            time.sleep(a.aralik)


if __name__ == "__main__":
    main()
```

Not: Bayat kilit (süreç ölmüş) durumunda kilitteki PID canlı değilse kilit silinip yeniden alınmalı; bunu da testle ekle (`test_bayat_kilit_temizlenir`, kilide var olmayan PID `999999` yaz).

- [ ] **Adım 4:** pytest → PASS; tüm suite (189+) yeşil.
- [ ] **Adım 5:** `AfuNobet/docs/UI_SOZLESME.md`'ye başlatma/durdurma komutunu yaz: `pythonw -m afu.ui_state_loop` (otomatik başlatmaya **kaydetme**).

### Görev A6: Başlık önceliği, yeni alanlar, eski kayıt sınırı

**Files:**
- Modify: `AfuNobet/afu/ui_state.py` (`_task_record`: `title`, `current_action`, `model`, `started_at` alanlarını varsa ekle)
- Modify: `windows/src-tauri/src/state.rs` (alanları geçir), `windows/src/core/state.ts`
- Test: `windows/tests/state.test.ts`, `AfuNobet/tests/test_ui_state.py`

**Interfaces:**
- Produces (TS): `Task` alanlarına `title: string`, `model: string | null`, `startedAt: number | null` eklenir. `taskTitle(raw) -> string` sırası: `title > current_action > description > job/task adı > "Görev"`. `elapsedText(task, now) -> string` (`"12 dk"`, bilinmiyorsa `"—"`).

- [ ] **Adım 1: Test yaz**

```ts
it.each([
  [{ title: "Kota panelini bitir", current_action: "x", task: "y" }, "Kota panelini bitir"],
  [{ current_action: "Testleri koşuyor", task: "y" }, "Testleri koşuyor"],
  [{ description: "Açıklama", task: "y" }, "Açıklama"],
  [{ task: "UYGULA" }, "UYGULA"],
  [{}, "Görev"],
])("başlık önceliği %#", (changes, expected) => {
  expect(snapshot(row({ task: undefined, ...changes })).tasks[0].title).toBe(expected);
});

it("gerçek veriye benzer 240 eski kayıtta ana ekran en fazla 3 satır gösterir", () => {
  const old = Date.now() - 3 * 86_400_000;
  const rows = Array.from({ length: 240 }, (_, i) =>
    row({ id: `j${i}`, status: i % 2 ? "Duraklatildi" : "Hata", updated_at: new Date(old).toISOString() }));
  const tasks = snapshot(...rows).tasks;
  expect(listedTasks(tasks).length).toBeLessThanOrEqual(3);
});

it("geçen süre bilinmiyorsa tire gösterir", () => {
  expect(elapsedText(snapshot(row()).tasks[0], Date.now())).toBe("—");
});
```

- [ ] **Adım 2:** `npm test` → FAIL.
- [ ] **Adım 3:** `parseState` içinde `taskTitle`, `elapsedText` uygula. `listedTasks` sonucu `slice(0, 3)` ile sınırlansın (şu an çağıran tarafta sınırlanıyor; sınırı fonksiyona taşı ki test gerçek kuralı ölçsün). Duraklatılmış eski kayıtlar: `IN_FLIGHT` içinde `Duraklatildi` varsa, `updatedAt` 24 saatten eskiyse **güncel sayılmasın** (Review Focus 1).
- [ ] **Adım 4:** Python tarafı test: `_task_record` `title` yoksa alanı hiç yazmaz (sözleşme geriye uyumlu). pytest + npm test → PASS.

### Görev A7: Canlı yenileme (dosya değişimi, yeniden başlatmadan)

**Files:**
- Modify: `windows/src-tauri/src/watch.rs`
- Test: `windows/src-tauri/src/watch.rs` `#[cfg(test)]`

**Interfaces:**
- Consumes: `state::read_snapshot(path) -> Option<Value>`
- Produces: değişimde `"state"` olayı; okunamazsa olay **yayılmaz** (son geçerli görünüm korunur).
- Kullanıcı onaylı kural (Madde 1): Güvenilir canlı durum — görev başlayınca hemen görünür, bitince anında güncellenir; animasyondan önce gelir. Dosya güncellenmez veya bağlantı kesilirse eski veri güncelmiş gibi gösterilmez: bayat işareti (`bayat: true`, soluk nokta/rozet) + son güncelleme zamanı (`son_guncelleme` / `checked_at`) arayüzde açıkça gösterilir.

- [ ] **Adım 1: Test yaz**

```rust
#[test]
fn atomik_degisim_ve_yarim_dosya() {
    let dir = std::env::temp_dir().join(format!("afu-watch-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("state.json");
    std::fs::write(&path, r#"{"version":1,"tasks":[],"mesaj":""}"#).unwrap();
    assert!(crate::state::read_snapshot(&path).is_some());
    std::fs::write(&path, r#"{"version":1,"tasks":["#).unwrap();
    assert!(crate::state::read_snapshot(&path).is_none(), "yarim dosya yok sayilmali");
    let tmp = dir.join("state.json.tmp");
    std::fs::write(&tmp, r#"{"version":1,"tasks":[],"mesaj":"yeni"}"#).unwrap();
    std::fs::rename(&tmp, &path).unwrap();
    assert!(crate::state::read_snapshot(&path).is_some());
    let _ = std::fs::remove_dir_all(&dir);
}
```

- [ ] **Adım 2:** `cargo test watch` → sonucu kaydet.
- [ ] **Adım 3:** `watch.rs`: `relevant()` olayı `.tmp → state.json` yeniden adlandırmasını kapsamalı (`EventKind::Modify(ModifyKind::Name(_))`). Okuma başarısızsa 250 ms sonra bir kez daha dene, yine olmazsa olay yayma.
- [ ] **Adım 4:** PASS.
- [ ] **Adım 5 (Madde 1 kabul ölçütü):** Canlı durum güvenilirliği: Motor veya loop durduğunda ya da `state.json` güncellemesi geciktiğinde arayüz durumu güncel gibi göstermez; bayat işareti ve son güncelleme zamanı belirir. Görev bitiş/başlangıç olayları algılandığı anda arayüz gecikmeden yenilenir.

### Görev A8: Ajan sekmeleri

**Files:**
- Modify: `windows/src/core/state.ts`, `windows/src/views/views.ts`
- Test: `windows/tests/state.test.ts`

**Interfaces:**
- Produces: `pillStates(tasks: Task[], focus: Task | undefined) -> Record<"codex"|"glm"|"gemini"|"opencode", "active" | "idle" | "disabled">`

- [ ] **Adım 1: Test yaz**

```ts
it("sekme durumları: odaktaki parlak, görevli soluk, görevsiz kapalı", () => {
  const tasks = snapshot(row({ id: "a", agent: "codex" }), row({ id: "b", agent: "gemini", status: "Bekliyor" })).tasks;
  expect(pillStates(tasks, tasks[0])).toEqual({ codex: "active", glm: "disabled", gemini: "idle", opencode: "disabled" });
});
```

- [ ] **Adım 2–4:** FAIL → `pillStates` uygula, `views.ts` sekmeleri bu fonksiyondan boyasın (`data-state`), CSS'te üç durum görsel olarak ayrışsın → PASS.

### Görev A9: Kota paneli

**Files:**
- Modify: `AfuNobet/afu/ui_state.py` (kota satırına `checked_at` ekle; kaynak: mevcut `afu/supervisor/quota_reader.py` önbelleği — yeni yenileyici yazma)
- Modify: `windows/src/core/state.ts`, `windows/src/views/views.ts`
- Test: `windows/tests/state.test.ts`

**Interfaces:**
- Produces: `quotaRows(snapshot, now) -> { agent, percent: string, reset: string, checked: string, stale: boolean }[]`; bilinmeyen değer `"—"`; `checked_at` 30 dk'dan eskiyse `stale: true`. Claude satırı **yok**.

- [ ] **Adım 1: Test yaz**

```ts
it("kota: değer yoksa tire, eskiyse bayat, Claude yok", () => {
  const now = Date.parse("2026-10-01T15:00:00Z");
  const s = snapshot(
    row({ agent: "codex", quota: { remaining_percent: 40, reset_at: "2026-10-01T15:51:00Z", checked_at: "2026-10-01T14:00:00Z" } }),
    row({ id: "c", agent: "claude", quota: { remaining_percent: 10, reset_at: null } }),
  );
  const rows = quotaRows(s, now);
  expect(rows.map(r => r.agent)).toEqual(["codex", "glm", "gemini", "opencode"]);
  expect(rows[0]).toMatchObject({ percent: "%40", stale: true });
  expect(rows[1].percent).toBe("—");
});
```

- [ ] **Adım 2–4:** FAIL → uygula → PASS. Panel düğmesi metni `Kota durumu` ↔ `Görevlere dön`.

### Görev A10: Olay türetme ve tekilleştirme

Motor olay yayınlamıyor; olaylar ardışık iki anlık görüntünün farkından türetilir.

**Files:**
- Create: `windows/src/core/events.ts`
- Test: `windows/tests/events.test.ts`

**Interfaces:**
- Produces: `type AfuEvent = { kind: "JOB_STARTED"|"FILE_EDIT"|"WAITING"|"RATE_LIMIT"|"JOB_FINISHED"|"JOB_FAILED"; taskId: string; agent: Agent | null }`; `deriveEvents(prev: Task[], next: Task[]) -> AfuEvent[]`; `class EventDeduper { accept(e: AfuEvent, now: number): boolean }` (aynı `kind+taskId` bir kez; 60 sn bekleme).

- [ ] **Adım 1: Test yaz**

```ts
import { describe, expect, it } from "vitest";
import { deriveEvents, EventDeduper } from "../src/core/events";
import { parseState } from "../src/core/state";

const t = (status: string, file = "a.ts") => parseState({ version: 1, mesaj: "", tasks: [{ id: "j1", agent: "codex", task: "X", status, file, progress: null, quota: { remaining_percent: null, reset_at: null } }] }).tasks;

describe("olaylar", () => {
  it("durum geçişlerinden olay üretir", () => {
    expect(deriveEvents([], t("Calisiyor")).map(e => e.kind)).toEqual(["JOB_STARTED"]);
    expect(deriveEvents(t("Calisiyor", "a.ts"), t("Calisiyor", "b.ts")).map(e => e.kind)).toEqual(["FILE_EDIT"]);
    expect(deriveEvents(t("Calisiyor"), t("Bekliyor")).map(e => e.kind)).toEqual(["WAITING"]);
    expect(deriveEvents(t("Calisiyor"), t("Duraklatildi")).map(e => e.kind)).toEqual(["RATE_LIMIT"]);
    expect(deriveEvents(t("Calisiyor"), t("Tamamlandi")).map(e => e.kind)).toEqual(["JOB_FINISHED"]);
    expect(deriveEvents(t("Calisiyor"), t("Hata")).map(e => e.kind)).toEqual(["JOB_FAILED"]);
  });

  it("aynı dosya tekrar okununca olay üretmez", () => {
    expect(deriveEvents(t("Tamamlandi"), t("Tamamlandi"))).toEqual([]);
  });

  it("ilk yüklemede eski bitmiş işler için olay üretmez", () => {
    expect(deriveEvents([], t("Tamamlandi"))).toEqual([]);
  });

  it("tekilleştirici aynı olayı bir kez kabul eder", () => {
    const d = new EventDeduper();
    const e = { kind: "JOB_FINISHED" as const, taskId: "j1", agent: "codex" as const };
    expect(d.accept(e, 0)).toBe(true);
    expect(d.accept(e, 1_000)).toBe(false);
  });
});
```

- [ ] **Adım 2–4:** FAIL → uygula. `island.ts`: `applySnapshot` önceki görevleri tutsun, olayları `EventDeduper`'dan geçirip başarı/hata rozetini 4 sn göstersin; `RATE_LIMIT` ve `JOB_FAILED` `fsm.pinned = true` yapsın (kullanıcı Tamam/Küçült'e basınca `false`). `State.shouldAnnounce()` false ise rozet ve otomatik açılma yok → PASS.
- [ ] **Adım 5:** **A2 checkpoint**: testler + build yeşil → `ILERLEME_MASTER.md`.

---

### A3 — Karakter, Türkçe, belgeler, derleme

### Görev A11: Türkçe gösterim etiketleri

**Files:**
- Create: `windows/src/core/labels.ts`
- Modify: `windows/src/views/views.ts`, `windows/src/core/state.ts` (`taskMessage`), `windows/src-tauri/src/tray.rs`
- Test: `windows/tests/labels.test.ts`

**Interfaces:**
- Produces: `STATUS_TR: Record<Status, string>` = `{ Hazirlaniyor: "Hazırlanıyor", Calisiyor: "Çalışıyor", Bekliyor: "Bekliyor", Duraklatildi: "Duraklatıldı", Tamamlandi: "Tamamlandı", Hata: "Hata" }`; `UI_TR` (tüm sabit metinler).

- [ ] **Adım 1: Test yaz**

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const ASCII_TURKCE = /\b(Gorev|Calisiyor|Duraklatildi|Kucult|Tamamlandi|Hazirlaniyor|Baglanti|Dusunuyor|yenilenince devam edecek|tamamlandi|gorev)\b/;

describe("Türkçe metin", () => {
  it.each(["src/views/views.ts", "src/core/labels.ts", "src/main.ts", "src/island/island.ts"])("%s ASCII Türkçe gösterim metni içermez", file => {
    const src = readFileSync(file, "utf8").split("\n").filter(l => /text:|textContent|label|"[A-ZÇĞİÖŞÜ]/.test(l) && !/STATUS_TR|Status|status ===|case "/.test(l));
    expect(src.filter(l => ASCII_TURKCE.test(l))).toEqual([]);
  });
});
```

- [ ] **Adım 2–4:** FAIL → tüm görünür metinleri `labels.ts` üzerinden ver; `taskMessage` "Codex duraklatıldı. Kota yenilenince devam edecek." üretsin; tepsi etiketleri `Aç`, `Bildirimleri duraklat`, `Çıkış` → PASS. `scripts/screenshots.mjs` beklentilerini yeni metinlere göre güncelle.

### Görev A12: Karakter durumları ve mikro animasyonlar

**Files:**
- Create: `windows/src/afu/gestures.ts`
- Modify: `windows/src/afu/character.ts`, `windows/src/style.css`
- Test: `windows/tests/gestures.test.ts`

**Interfaces:**
- Consumes: `Expression` (`state.ts`) — genişletilir: `"idle"|"working"|"thinking"|"alert"|"happy"|"error"|"waiting"|"paused"` (Faz B: `listening`, `speaking`).
- Produces: `class Gestures { click(now): "squash" | "dizzy"; hoverStart(now): void; hoverTick(now): "cheer" | null; hoverEnd(): void }`

- [ ] **Adım 1: Test yaz**

```ts
import { describe, expect, it } from "vitest";
import { Gestures } from "../src/afu/gestures";

describe("karakter jestleri", () => {
  it("1 sn içinde 3 tık dizzy, yoksa squash", () => {
    const g = new Gestures();
    expect(g.click(0)).toBe("squash");
    expect(g.click(300)).toBe("squash");
    expect(g.click(600)).toBe("dizzy");
    expect(g.click(5_000)).toBe("squash");
  });
  it("2 sn hover bir kez pozitif tepki verir", () => {
    const g = new Gestures();
    g.hoverStart(0);
    expect(g.hoverTick(1_000)).toBeNull();
    expect(g.hoverTick(2_000)).toBe("cheer");
    expect(g.hoverTick(3_000)).toBeNull();
  });
});
```

- [ ] **Adım 2–4:** FAIL → uygula → PASS.
- [ ] **Adım 5:** `character.ts`: ifade → kare eşlemesi (`idle/waiting=front`, `working=front + odak`, `thinking=thinking + ?`, `alert/paused=alert + !`, `happy=happy + parıltı + zıplama`, `error=alert + 300 ms sarsıntı`). Göz kırpma: 4–7 sn rastgele aralıkla 120 ms `scaleY(.1)` kaplaması. Tüm animasyonlar `prefers-reduced-motion`'da kapalı. Yeni çizim yok.
- [ ] **Adım 6:** Ekran görüntüsü aracı her ifade için bir kare üretsin (`scripts/screenshots.mjs` vakalarına `waiting`, `paused` ekle).

### Görev A13: Lisans taraması, Claude taraması, derleme, belgeler

**Files:**
- Create: `windows/scripts/denetim.mjs`
- Modify: `AFU_CHANGES.md`, `docs/KULLANIM_REHBERI.html`, `LICENSE-ASSETS.md`

- [ ] **Adım 1: Denetim betiği yaz** (çıkış kodu 1 = başarısız)

```js
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
const roots = ["src", "src-tauri/src", "dist", "public"];
const yasak = [/anthropic/i, /api\.anthropic\.com/i, /claude\s*(-p|--print|code)/i, /Command::new\(/, /mochi/i, /coucou/i];
const izinli = new Set(["src-tauri/src/codex.rs"]); // yalnız Faz B, yalnız codex app-server
const bulgular = [];
const gez = d => { for (const f of readdirSync(d)) { const p = path.join(d, f); statSync(p).isDirectory() ? gez(p) : tara(p); } };
const tara = p => {
  if (!/\.(ts|js|rs|html|css|json|svg|png)$/.test(p)) return;
  if (/\.(png|svg)$/.test(p)) { if (/mochi|coucou/i.test(p)) bulgular.push(`varlik: ${p}`); return; }
  readFileSync(p, "utf8").split("\n").forEach((l, i) => {
    for (const r of yasak) if (r.test(l) && !izinli.has(p.replace(/\\/g, "/")) && !/upstream|Louis|MIT/.test(l)) bulgular.push(`${p}:${i + 1}: ${l.trim().slice(0, 80)}`);
  });
};
roots.forEach(r => { try { gez(r); } catch {} });
console.log(bulgular.length ? bulgular.join("\n") : "denetim temiz");
process.exit(bulgular.length ? 1 : 0);
```

- [ ] **Adım 2:** `node scripts/denetim.mjs` → bulguları temizle (upstream atıf satırları ve `LICENSE` dosyası hariç) → `denetim temiz`.
- [ ] **Adım 3:** Derle: `npm run build` ve `CARGO_NET_OFFLINE=true npx tauri build --no-bundle`. Kopyala: `target/release/afunobet-ui.exe` → `dist/afunobet-ui-coucou.exe`. Kilitliyse `dist/afunobet-ui-coucou-yeni.exe`. İki SHA256 eşit olmalı. Ardından `powershell -File ../kisayol_guncelle.ps1`.
- [ ] **Adım 3b (Madde 7 kalıcı kuralı):** Tek hareketle geri alma güvencesi: Yeni exe doğrulanıp kısayol güncellenmeden önce önceki çalışan sürüm mutlaka `dist/onceki/afunobet-ui-coucou.exe` altına yedeklenir. Sorun çıkarsa tek komutla geri dönüş sağlanır (`powershell -NoProfile -File dist/onceki/GERI_AL.ps1` kalıcı kural olarak işletilir). Yeni exe doğrulanmadan eski çalışan kopya silinmez veya üzerine yazılmaz.
- [ ] **Adım 4:** `AFU_CHANGES.md`: korunan upstream dosyaları, değişenler ve gerekçe, kaldırılan varlıklar, `UNVERIFIED` listesi. `KULLANIM_REHBERI.html`: doğrulama tablosunu yeni durumlarla güncelle; yeni özellikler yalnızca test geçtiyse "görüldü/headless" etiketiyle.
- [ ] **Adım 5:** **A3 checkpoint ve Faz A son raporu**: her özellik `PASS (headless)` / `FAIL` / `PARTIAL` / `UNVERIFIED (kullanıcı)`.

---

---

### A4 — Mini pet (küçültülünce görev çubuğunda bekleyen Afu)

Kaynak senaryo (`afu-character/kaynak/animasyon_senaryosu.png`): **1 Açık kart → 2 Küçülme (spring) → 3 Kompakt form → 4 Aşağıya geçiş (slide) → 5 Görev çubuğuna yaklaşma (peek) → 6 Mini pet bekleme (idle)**. Pet konsepti (`pet_konsept_3poz.png`): **Bekleme**, **Bakış**, **Uyanma/Hover** (görev çubuğunun biraz üstüne havalanır).

Varsayılan tasarım kararları (kullanıcı onayı bekleniyor, bkz. Karar 1):
- Ada artık üstte gizlenmez; **küçültülünce dinlenme yeri görev çubuğudur** (pet açıksa) ya da **sağdaki durum simgesidir** (pet kapalıysa, A18). `Küçült`, `Esc` ve açık hâlde 15 sn hareketsizlik → pet. Üst kenar şeridi pet modunda devre dışı (tek yer kuralı).
- Pete tıklamak kartı açar (ters yol: havalanır, yukarı kayar, kart açılır).
- Fare petin üstüne gelince **Uyanma** pozu (hafif havalanma), açmaz.
- Olaylar: `JOB_FINISHED` → mutlu zıplama ve parıltı; `RATE_LIMIT`/`JOB_FAILED` → **Bakış** pozu + `!` balonu, kart kendiliğinden açılmaz.
- Tam ekran uygulama (oyun, sunum) öndeyken pet gizlenir, çıkınca geri gelir.

**Hareket süreleri (tek kaynak, `windows/src/afu/timing.ts` içinde sabit; testler bu sabitleri kullanır):**

| Hareket | Süre | Nerede |
|---|---|---|
| Kart küçülme (shrink, spring) | 180 ms | A17 |
| Aşağı süzülme (float-down / kayma) | 250 ms | A16 |
| Yavaşça görünme (reveal / peek, `akis_gorunme`) | 200 ms | A17 |
| Görev çubuğuna tutunma (grab + iniş, `akis_tutunma`) | 120 ms | A16, A17 |
| Nefes döngüsü (idle-breathe, `translateY` 1–2 px + `scaleY` 1.015) | 2,8 sn | A17 |
| Göz kırpma (blink; `idle_goz_kapali` karesi) | 90 ms | A17 |
| Hover yükselmesi (hover-rise, 2–4 px) | 160 ms | A17 |
| Başarı zıplaması (success-jump) | 300 ms | A17 |
| Hata sarsıntısı (error-shake) | 220 ms | A17 |
| Tıklama sıkışması (click squash + geri yay) | 100 ms + 160 ms | A12, A17 |
| Tıklama tepkisi (mutlu, `tepki_mutlu`) | 300 ms | A17 |

Geçiş zinciri (teknik sayfa bölüm 1 ile birebir): `HOME (akis_normal) → küçülme 180 (akis_kuculme) → aşağı süzülme 250 (akis_suzulme) → yavaşça görünme 200 (akis_gorunme) → tutunma 120 (akis_tutunma) → PET_IDLE (akis_bekleme → bekleme döngüsü)`. Toplam 750 ms.

### Görev A14: Pet karelerini kaynak sayfalardan kes

Kaynak sayfalar `afu-character/kaynak/` (kullanıcının verdiği, hepsi 1672×941, 3×2 panel; her panelde üstte numara/başlık, bazılarında altta açıklama şeridi vardır, bunlar kesime girmez):

| Sayfa | Panel sırası (soldan sağa, üstten alta) | Çıktı adları |
|---|---|---|
| `pet_bekleme_dongu.png` | normal, nefes, göz kapanış, göz açılış, sola bakış, sağa bakış | `idle_normal`, `idle_nefes`, `idle_goz_kapali`, `idle_goz_acilis`, `idle_sol`, `idle_sag` |
| `pet_tepkiler.png` | mutlu, düşünme `?`, uyarı `!`, göz kırpma, uyku `Zz`, başarı | `tepki_mutlu`, `tepki_dusunme`, `tepki_uyari`, `tepki_goz_kirpma`, `tepki_uyku`, `tepki_basari` |
| `pet_uyanma_dongu.png` | gizli, gözükme, yükselme, tam görünüm, dikkat çekme, hover yüzme | `uyan_gizli`, `uyan_gozukme`, `uyan_yukselme`, `uyan_tam`, `uyan_dikkat`, `uyan_yuzme` |
| `animasyon_senaryosu.png` | 3. panel kompakt, 4. panel kayma | `gecis_kompakt`, `gecis_kayma` (kompakt hap CSS ile çizilir, yalnız karakter kesilir) |
| `pet_teknik_sayfa.png` (1536×1024) bölüm 1, üst sıra 6 panel | normal boyut, küçülme, aşağı süzülme, yavaşça görünme, tutunma, pet bekleme | `akis_normal`, `akis_kuculme`, `akis_suzulme`, `akis_gorunme`, `akis_tutunma`, `akis_bekleme` |
| `pet_teknik_sayfa.png` bölüm 2, 8 panel | idle, bakış takibi, göz kırpma, mutlu, şaşkın `!`, düşünme `?`, uyku `Zz`, etkileşim | `durum_idle`, `durum_bakis`, `durum_goz_kirpma`, `durum_mutlu`, `durum_saskin`, `durum_dusunme`, `durum_uyku`, `durum_etkilesim` |

Toplam 34 kare. **Öncelik:** geçiş zinciri için `akis_*` kareleri (`gecis_*` yerine) kullanılır; durumlar için büyük ve net olan `pet_tepkiler`/`pet_bekleme_dongu` kareleri esastır, `durum_*` kareleri küçük (yaklaşık 180 px) olduğundan yalnız yedek ve `bakış takibi`/`etkileşim` için kullanılır. Bölüm 3 (katman parçaları) ve bölüm 4 (yüz ifadeleri) Faz D'nin girdisidir, A14'te kesilmez. **GELDİ (15:49): `afu-character/kaynak/pet_durumlar_4x4.png`** (1254×1254, 4×4 ızgara, hücre yaklaşık 313 px, düz yeşil arka plan, gri çıta). Hücre sırası soldan sağa, üstten alta = `pet_01..pet_16` (aşağıdaki eşleme aynen geçerli). Çıta üst kenarı hücreye göre 272–278 px arasında oynar, uyku hücresinde kollar çıtayı örter, son sırada çıta hücre altındadır: **çıta her hücrede ayrı tespit edilir** (gri satır taraması; bulunamazsa satırdaki diğer hücrelerin ortalaması) ve tüm kareler çıta çizgisine hizalanır. Gözlerin baktığı yön (hücre 4 ve 5) piksel ölçümüyle doğrulanıp `idle_sol`/`idle_sag` buna göre atanır. Bu sayfa A grubunun **birincil kaynağıdır**; `pet_bekleme_dongu`/`pet_tepkiler` yedektir. B/C/D grubu (geçiş, uyanma, simge) için ikinci 3×3 sayfa beklenir; gelmezse `pet_teknik_sayfa.png` ve `pet_uyanma_dongu.png` kullanılır.

**Standart görseller gelirse öncelik onlarındır:** Kullanıcı `docs/GORSEL_ISTEMLERI.md`'deki istemlerle tek tek, 2048×2048, düz `#00B140` yeşil arka plan ve sabit yükseklikte (üstten 1536 px) çıta ile görsel üretir (`pet_01..16`, `gecis_1..5`, `uyan_1..3`, `simge_1024`). Bunlar varsa kesim `rembg` yerine **yeşil anahtarlama** ile yapılır (yeşil kenar taşmasına karşı kenar renk temizleme), çıta satırı alt kenar olarak kullanılır ve hizalama kendiliğinden tutar. Eşleme: `pet_01`→`idle_normal`, `pet_02`→`idle_nefes`, `pet_03`→`idle_goz_kapali`, `pet_04`→`idle_sol`, `pet_05`→`idle_sag`, `pet_06`→`akis_bekleme`, `pet_07`→`tepki_mutlu`, `pet_08`→`tepki_dusunme`, `pet_09`→`tepki_uyari`, `pet_10`→`tepki_hata` (yeni, `JOB_FAILED` bunu kullanır), `pet_11`→`tepki_uyku`, `pet_12`→`tepki_basari`, `pet_13`→`tepki_goz_kirpma`, `pet_14`→`tepki_dinleme` (Faz B), `pet_15`→`tepki_konusma` (Faz B), `pet_16`→`uyan_yuzme`, `gecis_1..5`→`akis_normal/kuculme/suzulme/gorunme/tutunma`, `uyan_1..3`→`uyan_gizli/gozukme/yukselme`. Gelmeyen kareler için sayfa kesimleri kullanılır; `kesim.json` her karenin kaynağını yazar.

Yedek kaynaklar (`pet_konsept_3poz.png`, `pet_bakis_sahne.png`, `pet_bekleme_sahne.png`) yalnızca bir kare kötü kesilirse kullanılır.

**Files:**
- Create: `afu-character/pet/<ad>.png` (34 kare), `afu-character/pet/kesim.json`, `afu-character/pet/kesim-kontrol.png`
- Create: `windows/scripts/pet_kes.py`

Kurallar: Yeni çizim yok; yüz, renk, kıyafet değişmez; ölçek küçültme yok (UI CSS ile küçültür). Hedef gösterim boyutları (teknik sayfadan): **pet 128×128 px**, normal karakter 512×512 px (mantıksal piksel; DPI ile çarpılır). Kaynak kareler bu boyutun en az 2 katı değilse `kesim.json`'a `dusuk_cozunurluk: true` yazılır ve kullanıcıya raporlanır. Dağıtım biçimi: kesimler PNG olarak saklanır; derlemede `windows/scripts/pet_kes.py --webp` ile kayıpsız WebP üretilir (yeni paket yok, Pillow mevcut). Arka plan, Windows görev çubuğu, masaüstü simgeleri ve panel başlık/açıklama yazıları silinir. Elleri görev çubuğuna dayalı karelerde kesim çizgisi **çubuğun üst kenarıdır** (eller kalır, çubuk gider). Efektler (`?`, `!`, `Zz`, parıltılar) karakterden ayrı ise ayrı katman olarak `pet/efekt_<ad>.png` kaydedilir; ayrılamıyorsa karede kalır. **Hizalama:** her döngünün kareleri aynı tuval boyutuna ve aynı çubuk çizgisine (alt kenar) hizalanır ki kareler arasında karakter zıplamasın; hizalama ofsetleri `kesim.json`'da.

- [ ] **Adım 1:** `pet_kes.py`: panel ızgarası `kesim.json`'dan (sayfa başına 6 kutu, başlık ve açıklama yükseklikleri); arka plan `rembg` + `isnet-general-use` (çevrimdışı, `~/.u2net`; indirme yasak); alt kenar `alt_kenar_y` ile düz kesilir; yazı artıkları için panel başlık bölgesi önceden maskelenir.
- [ ] **Adım 2: Doğrulama** (`--dogrula`): her kare RGBA; dört köşe saydam (alfa < 10); karakter alanı panelin %20'sinden büyük; çubuklu karelerde alt kenarda en az 20 opak piksel; aynı döngüdeki karelerin tuval boyutu eşit ve karakter yüz merkezi sapması < 6 px; kaynak ile ortalama renk farkı < 8.
- [ ] **Adım 3:** `python windows/scripts/pet_kes.py && python windows/scripts/pet_kes.py --dogrula` → `PASS 34/34`. `kesim-kontrol.png`: üç döngüyü dama arka plan üstünde satır satır gösterir; kullanıcı Kapı 1'de gözle onaylar.

### Görev A15: Görev çubuğu ve Başlat konumu

**Files:**
- Create: `windows/src-tauri/src/taskbar.rs`
- Modify: `windows/src-tauri/Cargo.toml` (yalnız `windows` feature: `Win32_UI_Shell`, `Win32_UI_Accessibility`, `Win32_System_Com`, `Win32_System_Registry`)
- Test: `taskbar.rs` `#[cfg(test)]`

**Interfaces:**
- Produces: `pub enum Kenar { Alt, Ust, Sol, Sag }`; `pub struct Cubuk { rect: (i32, i32, i32, i32), kenar: Kenar, oto_gizli: bool }`; `pub fn cubuk() -> Option<Cubuk>` (`SHAppBarMessage(ABM_GETTASKBARPOS)` + `ABM_GETSTATE`); `pub fn baslat_rect() -> Option<(i32, i32, i32, i32)>` (UI Automation: `Shell_TrayWnd` altında `AutomationId == "StartButton"`); `pub fn tam_ekran_acik() -> bool` (`SHQueryUserNotificationState` → `QUNS_RUNNING_D3D_FULL_SCREEN | QUNS_BUSY | QUNS_PRESENTATION_MODE`); `pub fn pet_konumu(cubuk: &Cubuk, baslat: Option<(i32,i32,i32,i32)>, pet_w: i32, pet_h: i32, ekran: (i32,i32,i32,i32)) -> (i32, i32)` (saf fonksiyon).

Konum kuralı (`pet_konumu`): Alt çubukta pet, Başlat düğmesinin hemen solunda, alt kenarı çubuğun üst kenarına değecek şekilde; Başlat bulunamazsa çubuğun sol ucundan 24 px içeride. Üst/sol/sağ çubukta çubuğun Başlat tarafındaki köşesine bitişik. Oto-gizli çubukta ekranın alt kenarı. Sonuç her zaman ekran sınırları içinde.

- [ ] **Adım 1: Test yaz**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    const EKRAN: (i32, i32, i32, i32) = (0, 0, 1920, 1080);

    fn alt() -> Cubuk { Cubuk { rect: (0, 1032, 1920, 1080), kenar: Kenar::Alt, oto_gizli: false } }

    #[test]
    fn alt_cubuk_baslat_solunda_ve_cubugun_ustunde() {
        let (x, y) = pet_konumu(&alt(), Some((780, 1032, 828, 1080)), 120, 110, EKRAN);
        assert_eq!(y + 110, 1032);
        assert!(x + 120 <= 780);
    }

    #[test]
    fn baslat_bulunamazsa_sol_uc() {
        let (x, _) = pet_konumu(&alt(), None, 120, 110, EKRAN);
        assert_eq!(x, 24);
    }

    #[test]
    fn oto_gizli_cubukta_ekran_alti() {
        let c = Cubuk { oto_gizli: true, ..alt() };
        let (_, y) = pet_konumu(&c, None, 120, 110, EKRAN);
        assert_eq!(y + 110, 1080);
    }

    #[test]
    fn sag_cubuk_ekran_icinde() {
        let c = Cubuk { rect: (1872, 0, 1920, 1080), kenar: Kenar::Sag, oto_gizli: false };
        let (x, y) = pet_konumu(&c, None, 120, 110, EKRAN);
        assert!(x >= 0 && x + 120 <= 1872 && y >= 0 && y + 110 <= 1080);
    }
}
```

- [ ] **Adım 2:** `cargo test taskbar` → FAIL.
- [ ] **Adım 3:** `pet_konumu` saf fonksiyonunu uygula; ardından Win32 sarmalayıcıları (`cubuk`, `baslat_rect`, `tam_ekran_acik`). UI Automation başarısızsa `None` (çökme yok). COM başlatma bir kez, ayrı iş parçacığında.
- [ ] **Adım 4:** `cargo test` → PASS. Gerçek konumlar kullanıcı testi (Kapı 1 #15–#18).

### Görev A16: Kayma yolu (üstten görev çubuğuna)

**Files:**
- Create: `windows/src-tauri/src/glide.rs`
- Modify: `windows/src-tauri/src/lib.rs` (komut `pet_mode(on: bool)`)
- Test: `glide.rs` `#[cfg(test)]`

**Interfaces:**
- Produces: `pub fn yol(bas: (i32, i32), son: (i32, i32), t: f64) -> (i32, i32)` (yumuşak eğri: x ease-in-out, y ease-in, hafif yay); `pub fn adimlar(sure_ms: u32, fps: u32) -> u32`; komut `pet_mode(on)`: `on` ise pencereyi kompakt boyuta getirir, 250 ms içinde `yol` boyunca `set_position` ile görev çubuğu konumuna taşır (aşağı süzülme), 120 ms tutunma (son 6 px yavaşlayarak), sonra pet boyutuna geçer ve `"pet"` olayı yayar; `off` ise ters yol.

- [ ] **Adım 1: Test yaz**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uclar_tam() {
        assert_eq!(yol((800, 0), (40, 960), 0.0), (800, 0));
        assert_eq!(yol((800, 0), (40, 960), 1.0), (40, 960));
    }

    #[test]
    fn monoton_iner() {
        let mut onceki = -1;
        for i in 0..=30 {
            let (_, y) = yol((800, 0), (40, 960), i as f64 / 30.0);
            assert!(y >= onceki);
            onceki = y;
        }
    }

    #[test]
    fn adim_sayisi() {
        assert_eq!(adimlar(250, 60), 15);
        assert_eq!(adimlar(120, 60), 7); // tutunma
    }
}
```

- [ ] **Adım 2–4:** FAIL → uygula → PASS. Kayma iş parçacığı yalnızca geçiş sırasında yaşar; bitince sonlanır (sızıntı yok). Kayma sırasında yeni `pet_mode` çağrısı gelirse mevcut kayma iptal edilir.

### Görev A17: Pet durumları ve görünümü

**Files:**
- Create: `windows/src/afu/pet.ts`
- Modify: `windows/src/island/fsm.ts` (yeni durum `pet`), `windows/src/island/island.ts`, `windows/src/style.css`
- Test: `windows/tests/pet.test.ts`, `windows/tests/fsm.test.ts`

**Interfaces:**
- Consumes: `AfuEvent` ve `EventDeduper` (A10), `Gestures` (A12), Tauri olayı `"pet"`, komut `pet_mode`.
- Produces: `windows/src/afu/timing.ts` (`export const T = { shrink: 180, floatDown: 250, reveal: 200, grab: 120, breathe: 2800, blink: 90, hoverRise: 160, clickHappy: 300, successJump: 300, errorShake: 220, squash: 100, squashBack: 160 } as const`); `FsmState` = `"hidden" | "petit" | "home" | "greeting" | "pet"`; `IslandStateMachine.toPet()`, `fromPet()`; `type PetPose = "gecis" | "bekleme" | "dusunme" | "uyari" | "mutlu" | "basari" | "uyku" | "uyanma" | "yuzme" | "etkilesim"`; `const SEKANSLAR: Record<PetPose, { kare: string; ms: number }[]>`; `class PetModel { pose: PetPose; frame: string; balloon: "!" | "?" | null; onEvent(e: AfuEvent): void; hover(on: boolean): void; tick(now: number): void }`.
- Kullanıcı onaylı kural (Madde 2): Pet sakin ve faydalı — boşta hafif nefes alır; yalnız önemli olaylarda (hata, kota, iş bitimi) tepki verir; gereksiz kıpırdanıp dikkat dağıtmaz; tam ekran oyunlarda/uygulamalarda gizlenir; tıklandığında görev kartı açılır, kendi kendine sürekli açılmaz.

Sekanslar (kare adları A14'ten):
- `bekleme` (döngü): `idle_normal` 2400 ms → `idle_nefes` 900 → `idle_normal` 1800 → `idle_goz_kapali` `T.blink` (90) → `idle_goz_acilis` 90 → `idle_normal` 2000 → `idle_sol` 1400 → `idle_normal` 600 → `idle_sag` 1400 → başa. Göz kırpma 4–8 sn rastgele aralıkla ayrıca araya girer. Nefes `T.breathe` (2,8 sn) CSS döngüsüyle karelerin üstünde sürer.
- `gecis` (kart → pet, bir kez): `akis_kuculme` `T.shrink` → `akis_suzulme` `T.floatDown` → `akis_gorunme` `T.reveal` → `akis_tutunma` `T.grab` → `akis_bekleme` 600 → `bekleme`. Ters yön (pet → kart) aynı kareler tersten.
- `uyanma` (uykudan veya tam ekrandan dönüşte): `uyan_gizli` 300 → `uyan_gozukme` 500 → `uyan_yukselme` 400 → `uyan_tam` 600 → `uyan_dikkat` 900 → `bekleme`.
- `etkilesim` (tık): `durum_etkilesim` + squash `T.squash`/`T.squashBack`, ardından `tepki_mutlu` `T.clickHappy`.
- `yuzme` (hover): `uyan_yuzme` + CSS 2–4 px yukarı (`T.hoverRise` 160 ms); fare çıkınca `bekleme`.
- `dusunme` (`WAITING`, 6 sn) `tepki_dusunme`; `uyari` (`RATE_LIMIT`/`JOB_FAILED`, tıklanana kadar) `tepki_uyari`; `basari` (`JOB_FINISHED`, 2,5 sn) `tepki_basari` + zıplama (`T.successJump`); hata (`JOB_FAILED`) `tepki_uyari` + sarsıntı (`T.errorShake`); `mutlu` (kart kapanıp pete dönülünce 1,5 sn veya fare ilk geldiğinde) `tepki_mutlu`, ardından bir kez `tepki_goz_kirpma`.
- `uyku`: 10 dk hiç olay ve fare hareketi yoksa `tepki_uyku` (Zz); herhangi bir olay/fare → `uyanma` sekansı.
- Kareler arası geçiş 120 ms çapraz geçiş; titreme yok. `prefers-reduced-motion`'da yalnız `idle_normal` ve durum kareleri, döngü yok.

- [ ] **Adım 1: Test yaz**

```ts
import { describe, expect, it, vi } from "vitest";
import { IslandStateMachine } from "../src/island/fsm";
import { PetModel, SEKANSLAR } from "../src/afu/pet";
import { T } from "../src/afu/timing";

describe("pet", () => {
  it("küçült ve 15 sn hareketsizlik pete götürür, tık kartı açar", () => {
    vi.useFakeTimers();
    const fsm = new IslandStateMachine();
    fsm.forceHome();
    fsm.mouseLeft();
    vi.advanceTimersByTime(15_000);
    expect(fsm.state).toBe("pet");
    fsm.click();
    expect(fsm.state).toBe("home");
    fsm.toPet();
    expect(fsm.state).toBe("pet");
    vi.useRealTimers();
  });

  it("pet modunda üst şerit uyandırmaz", () => {
    const fsm = new IslandStateMachine();
    fsm.toPet();
    fsm.mouseEntered();
    expect(fsm.state).toBe("pet");
  });

  it("kota olayı uyarı karesi, tıklanana kadar kalır", () => {
    const p = new PetModel(0);
    p.onEvent({ kind: "RATE_LIMIT", taskId: "j", agent: "codex" });
    expect(p.pose).toBe("uyari");
    expect(p.frame).toBe("tepki_uyari");
    p.tick(60_000);
    expect(p.pose).toBe("uyari");
  });

  it("hover yüzme, bırakınca beklemeye döner", () => {
    const p = new PetModel(0);
    p.hover(true);
    expect(p.frame).toBe("uyan_yuzme");
    p.hover(false);
    expect(p.pose).toBe("bekleme");
  });

  it("bekleme döngüsü sırayla ilerler ve başa sarar", () => {
    const p = new PetModel(0);
    const gorulen = new Set<string>();
    for (let t = 0; t <= 30_000; t += 100) { p.tick(t); gorulen.add(p.frame); }
    expect([...gorulen]).toEqual(expect.arrayContaining(["idle_normal", "idle_nefes", "idle_goz_kapali", "idle_sol", "idle_sag"]));
  });

  it("10 dk sessizlikte uyur, olayla uyanır", () => {
    const p = new PetModel(0);
    p.tick(10 * 60_000 + 1);
    expect(p.pose).toBe("uyku");
    p.onEvent({ kind: "JOB_STARTED", taskId: "j", agent: "codex" });
    expect(p.pose).toBe("uyanma");
  });

  it("pete geçiş zinciri süreleri tek kaynaktan", () => {
    expect(T.shrink + T.floatDown + T.reveal + T.grab).toBe(750);
    const blink = SEKANSLAR.bekleme.find(k => k.kare === "idle_goz_kapali");
    expect(blink?.ms).toBe(T.blink);
  });

  it("her sekanstaki kare adı A14 çıktılarında var", () => {
    const kareler = new Set(["idle_normal", "idle_nefes", "idle_goz_kapali", "idle_goz_acilis", "idle_sol", "idle_sag",
      "tepki_mutlu", "tepki_dusunme", "tepki_uyari", "tepki_goz_kirpma", "tepki_uyku", "tepki_basari",
      "uyan_gizli", "uyan_gozukme", "uyan_yukselme", "uyan_tam", "uyan_dikkat", "uyan_yuzme", "gecis_kompakt", "gecis_kayma",
      "akis_normal", "akis_kuculme", "akis_suzulme", "akis_gorunme", "akis_tutunma", "akis_bekleme",
      "durum_idle", "durum_bakis", "durum_goz_kirpma", "durum_mutlu", "durum_saskin", "durum_dusunme", "durum_uyku", "durum_etkilesim"]);
    for (const seq of Object.values(SEKANSLAR)) for (const k of seq) expect(kareler.has(k.kare)).toBe(true);
  });
});
```

- [ ] **Adım 2:** `npm test -- pet fsm` → FAIL.
- [ ] **Adım 3:** `fsm.ts`: `home` → (15 sn / `Küçült` / `Esc`) → `toPet()`; `pet` durumunda `mouseEntered` geçiş yapmaz; `click` → `fromPet()` → `home`. Upstream davranışından sapma `AFU_CHANGES.md`'ye yazılır. `island.ts`: `pet` durumunda `invoke("pet_mode", { on: true })`, görsel sıra `gecis` sekansıdır (teknik sayfa bölüm 1): `akis_kuculme` (kart spring ile kapanırken) → `akis_suzulme` (pencere A16 yolunda kayarken) → `akis_gorunme` → `akis_tutunma` → `akis_bekleme` → `bekleme` döngüsü. Tıklamada ters sıra.
- [ ] **Adım 4:** `pet.ts` + CSS: kareler önceden yüklenir (`<img>` önbelleği, ilk görünümde boş kare yok); kareler arası 120 ms çapraz geçiş; zıplama/süzülme yalnız CSS `transform`; görünmezken (`document.hidden` veya pencere gizli) sekans saati durur.
- [ ] **Adım 5:** Rust: `tam_ekran_acik()` 2 sn'de bir **yalnız pet modunda** yoklanır; `true` ise pencere gizlenir, `false` olunca geri gelir. Pet görünürken pencere dışı alan click-through (upstream `set_ignore_cursor` mantığı, pet dikdörtgeni için).
- [ ] **Adım 6:** `npm test`, `cargo test` → PASS. Ekran görüntüsü aracına `pet-cene`, `pet-bakis`, `pet-uyanma`, `pet-kayma` vakaları (headless, sabit 1920×1080 görev çubuğu çizimi üstünde).
- [ ] **Adım 7 (Madde 2 kabul ölçütü):** Pet sakinlik ve tetikleme davranışı: Boşta hafif nefes döngüsünde kalır; sürekli veya anlamsız pencere açılması engellenir; görev kartı ancak kullanıcı tıkladığında açılır; tam ekran oyun/uygulama algılandığında pet gizlenir; yalnız önemli olaylarda (`JOB_FINISHED`, `RATE_LIMIT`, `JOB_FAILED`) belirgin tepki verir.

### Görev A18: Pet aç/kapat ve sağda durum simgesi

Kullanıcı isteği: pet uygulamanın içinden açılıp kapatılabilir; kapatılınca uygulama en sağda (bildirim alanı) **durum simgesi** olarak yaşar.

**Files:**
- Create: `windows/src-tauri/src/tray_icon.rs` (durum simgesi çizimi)
- Modify: `windows/src-tauri/src/tray.rs`, `windows/src-tauri/src/lib.rs` (`Settings.pet: bool`, varsayılan `true`, dosyada saklanır), `windows/src/views/views.ts` (kartın altında tek anahtar: `Mini pet`), `windows/src/island/fsm.ts`
- Test: `tray_icon.rs` `#[cfg(test)]`, `windows/tests/pet.test.ts`

**Interfaces:**
- Produces (Rust): `pub enum Durum { Bos, Calisiyor, Bekliyor, Uyari, Basari, Hata }`; `pub fn simge(durum: Durum, boyut: u32) -> Vec<u8>` (RGBA; taban: varsa `afu-character/pet/simge.png` (kullanıcının `simge_1024.png`'sinden kesilir, 16/32 px'de okunur), yoksa `afu-character/mini-icon.png` küçültülmüş + sağ altta durum noktası: Çalışıyor mavi, Bekliyor gri, Uyarı turuncu, Başarı yeşil, Hata kırmızı, Boş nokta yok); komut `set_tray_status(durum: String)`; komut `set_pet(on: bool)`.
- Produces (TS): `IslandStateMachine` küçültme hedefi `Settings.pet ? "pet" : "tray"`; `tray` durumunda pencere tamamen gizli, olaylar yalnız simgeyi ve ipucu metnini günceller (`"CODEX çalışıyor: Kota panelini bitir"`).

Davranış:
- `Mini pet` açık (varsayılan): küçültünce görev çubuğundaki pete iner (A17).
- `Mini pet` kapalı: küçültünce pencere gizlenir, yalnız sağdaki simge kalır. Simgeye sol tık kartı açar; sağ tık menü: `Aç`, `Mini peti göster`/`Mini peti gizle`, `Bildirimleri duraklat`, `Çıkış`.
- Simge her iki modda da durum gösterir (simge her zaman var; pet modunda da).
- Uyarı (`RATE_LIMIT`/`JOB_FAILED`) tray modunda: simge turuncu/kırmızı noktaya döner, kart kendiliğinden açılmaz; balon bildirimi YOK (sessiz kural).

- [ ] **Adım 1: Test yaz**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simge_boyutu_ve_saydam_kose() {
        let px = simge(Durum::Calisiyor, 32);
        assert_eq!(px.len(), 32 * 32 * 4);
        assert!(px[3] < 10, "sol ust kose saydam olmali");
    }

    #[test]
    fn durumlar_birbirinden_farkli() {
        let a = simge(Durum::Basari, 32);
        let b = simge(Durum::Hata, 32);
        assert_ne!(a, b);
        assert_eq!(simge(Durum::Bos, 32), simge(Durum::Bos, 32));
    }
}
```

```ts
it("pet kapalıyken küçültme tepsiye gider ve tepsi tıkı kartı açar", () => {
  const fsm = new IslandStateMachine();
  fsm.petEnabled = false;
  fsm.forceHome();
  fsm.collapse();
  expect(fsm.state).toBe("tray");
  fsm.trayClick();
  expect(fsm.state).toBe("home");
});

it("pet açıkken küçültme pete gider", () => {
  const fsm = new IslandStateMachine();
  fsm.petEnabled = true;
  fsm.forceHome();
  fsm.collapse();
  expect(fsm.state).toBe("pet");
});
```

- [ ] **Adım 2:** `cargo test tray_icon`, `npm test -- pet` → FAIL.
- [ ] **Adım 3:** Uygula. `FsmState`'e `"tray"` eklenir; `collapse()` ve `trayClick()` yeni yöntemler (A17'deki `toPet()` `collapse()` içinden çağrılır). Simge `include_bytes!` ile `mini-icon.png`'den, `image` paketi YOK: PNG çözme için Tauri'nin `Image::from_bytes` (tauri `image-png` feature, yeni paket değil) kullanılır; nokta çizimi elle piksel.
- [ ] **Adım 4:** `views.ts`: kartın alt satırında tek anahtar `Mini pet` (açık/kapalı); ayar `Settings.pet` ile kalıcı. Tepsi menüsü etiketi duruma göre `Mini peti gizle`/`Mini peti göster`.
- [ ] **Adım 5:** PASS. Kapı 1'e #20–#22 eklenir.

### Görev A19: A4 checkpoint

- [ ] Testler + derleme + `denetim.mjs` yeşil; `kesim-kontrol.png` ve pet ekran görüntüleri `ILERLEME_MASTER.md`'de; gerçek konum/kayma/tam ekran davranışı `UNVERIFIED (kullanıcı)`.
- [ ] `KULLANIM_REHBERI.html`: "Küçültünce Afu görev çubuğuna iner" bölümü, doğrulama durumuyla.

## KAPI 1 — Faz A kullanıcı kabul testi (kullanıcı, ~15 dk)

Claude bu listeyi `docs/KABUL_FAZ_A.md` olarak üretir; kullanıcı her satıra PASS/FAIL yazar.

| # | Adım | Beklenen |
|---|---|---|
| 1 | Kısayolu aç | "Afu yanında" karşılaması, sonra küçük hâl |
| 2 | 60 sn bekle | Ada gizlenir, üstte ince şerit kalır |
| 3 | Fareyi üst ortaya götür | Küçük hâle uyanır |
| 4 | Küçük hâle tıkla | Tam kart açılır, odak başka pencereden çalınmaz (yazdığın yazı kesilmez) |
| 5 | Adanın yanındaki şeffaf alana tıkla | Alttaki uygulama tıklanır |
| 6 | Başka bir pencereyi büyüt | Ada hep üstte kalır; Alt-Tab listesinde ve görev çubuğunda görünmez |
| 7 | Sekmelere bas | Görevli olan açılır, görevsiz olan tepki vermez |
| 8 | Kota durumu | Panel açılır, değer yoksa "—" |
| 9 | Esc / Küçült | Küçük hâle iner |
| 10 | Tepsi › Bildirimleri duraklat | Rozet/otomatik açılma durur, ajanlar etkilenmez |
| 11 | `pythonw -m afu.ui_state_loop` başlat, bir iş başlat | Yeniden başlatmadan kart güncellenir |
| 12 | Ekran ölçeğini %125 / %150 yap | Ada kırpılmadan üst ortada |
| 13 | Karaktere 3 kez hızlı tıkla, 2 sn üstünde dur | Dizzy, sonra pozitif tepki |
| 14 | 10 dk açık bırak | Görev Yöneticisi: CPU ~%0, RAM < 80 MB, yeni konsol penceresi yok |
| 15 | Küçült'e bas | Kart kapanır, kompakt hapa döner, aşağı kayar, görev çubuğunun üstünden bakar, Başlat düğmesinin yanında çenesini eline dayayıp bekler |
| 16 | Petin üstüne gel, sonra tıkla | Hafifçe havalanır; tıklayınca yukarı çıkıp kart açılır |
| 17 | Görev çubuğunu sola hizala / otomatik gizle | Pet yine çubuğun Başlat tarafında / ekran altında, kırpılmadan |
| 18 | Tam ekran bir oyun veya video aç | Pet görünmez; çıkınca geri gelir |
| 19 | `kesim-kontrol.png` | 34 karenin yüzü, renkleri, kıyafeti kaynakla aynı; kenarlarda arka plan veya yazı artığı yok; döngüde karakter zıplamıyor |
| 20 | Kartta `Mini pet` anahtarını kapat, Küçült'e bas | Pet çıkmaz, pencere gizlenir, sağda (bildirim alanı) Afu simgesi kalır |
| 21 | Bir iş başlasın / bitsin / kotaya takılsın | Simgedeki nokta mavi / yeşil / turuncu olur; ipucu metni görevi yazar; kart kendiliğinden açılmaz |
| 22 | Simgeye sol tık; sağ tık › Mini peti göster | Kart açılır; pet tekrar görev çubuğuna iner |
| 23 | Peti 10 dk kendi hâline bırak | Bekleme döngüsü (nefes, göz kırpma, sola/sağa bakış), sonra uyku `Zz`; fare gelince uyanır |

Kapı kuralı: 1–11 ve 15–23 PASS olmadan Faz B başlamaz. FAIL satırları ilgili A görevine geri döner (Claude yeni görev dosyası yazar). Hepsi tamamsa kullanıcı "FAZ A = ACCEPTED" der.

### Görev R1: Faz A kaydı (Claude)

- [ ] `git -C AfuNobet-UI add -A` öncesi `git status` incele; `GOREV_*.md`, `UX_LOG_*`, `test-results/`, `*.yedek-*` gibi geçici dosyaları `.gitignore`'a ekle veya taşı.
- [ ] Commit (İngilizce başlık, Türkçe ayrıntı): `feat(windows): AfuNobet island v0.2.0 (Phase A)` + Co-Authored-By satırı.
- [ ] `git push -u origin afu/faz-a` → `pirncedark/AfuNobet-UI`. PR açılırsa CI yok; `main`'e birleştirme kullanıcı onayıyla.
- [ ] AfuNobet deposunda `ui_state_loop.py` ayrı commit (o deponun kendi kuralı ve CI'ı ile).

---

## FAZ C — Afu Merkez: tüm ekosistem tek simgeden (Kapı 1 sonrası; önerilen sıra: Faz B'den önce)

Kullanıcı isteği: bütün Afu ekosistemi bu pete ve sağdaki tek durum simgesine bağlansın; her uygulamaya oradan ulaşılsın.

İlke: AfuNöbet UI uygulamaları **yönetmez**, yalnızca **açar ve durumlarını gösterir**. Her uygulama kendi başına çalışmaya devam eder; Afu Merkez çökerse hiçbiri etkilenmez. Faz A'daki "arayüz süreç başlatmaz" kuralına tek istisna: kullanıcının tıklamasıyla, sabit listedeki Afu uygulamasını açmak (öldürme, yeniden başlatma, arka planda başlatma YOK).

Bilinen uygulamalar (2026-10-02 disk taramasıyla doğrulanmış gerçek yollar ve türler):

| Uygulama | Tür | Bilinen yol / Durum |
|---|---|---|
| AfuNöbet | bu uygulama | — |
| AfuDM | Windows exe (PyInstaller tek dosya) | `afuproject/AfuDM/AfuDM.exe` (Masaüstü kısayolu: `AfuDM.exe - Kısayol.lnk`) |
| AfuDesk | Windows exe (Flutter Runner sürüm paketi) | `afuproject/AfuDesk/dist/v140/AfuDesk/afudesk.exe` (Alternatif runner: `app/build/windows/x64/runner/Release/afudesk.exe`) |
| PadKöprü | Windows exe (PyInstaller dağıtımı) | `afuproject/PadKopru/dist/PadKopru/PadKopru.exe` (Kaynak betik: `PadKopru.pyw`, doğrudan exe çalıştırılır) |
| AfuTube | Bağımsız binary yok | `afuproject/AfuDM/AfuTube` dizini boş; bağımsız `.exe` yok → `yol: null`, "Kurulu değil" |
| AfuRemote | Android istemci | PC'de açılacak exe/helper yok; `tur: "android"` alanı ile tıklama engellenir, doğrudan "Telefonda" etiketi gösterilir |
### Görev C1: Uygulama kaydı

**Files:**
- Create: `%LOCALAPPDATA%\AfuNobet-UI\uygulamalar.json` (kullanıcıya özel, depoya girmez), `windows/src-tauri/src/apps.rs`, `docs/AFU_MERKEZ.md` (kayıt biçimi)
- Test: `apps.rs` `#[cfg(test)]`

**Interfaces:**
- Produces: `pub struct AfuApp { id: String, ad: String, yol: Option<PathBuf>, durum_dosyasi: Option<PathBuf>, simge: Option<PathBuf>, tur: Option<String> }`; `pub fn yukle(json: &str) -> Vec<AfuApp>` (bozuk satırı atlar, çökmez); `pub fn bul_en_yeni(kok: &Path, desen: &str) -> Option<PathBuf>` (ör. `dist/v*/AfuDesk/afudesk.exe` içinden en yüksek sürüm; yerel konfigürasyonda doğrudan `dist/v140/AfuDesk/afudesk.exe` kullanılır); `pub fn ac(app: &AfuApp) -> Result<(), String>` (yalnız kayıttaki `.exe`, `ShellExecuteW` ile; `tur == "android"` ise çalıştırmayı reddeder; yol yoksa veya dosya yoksa "AfuDM bulunamadı." tek cümle).
- [ ] **Adım 1: Test yaz**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bozuk_kayit_atlanir() {
        let j = r#"[{"id":"afudm","ad":"AfuDM","yol":"C:/x/AfuDM.exe"},{"id":5},{"id":"afudesk","ad":"AfuDesk"}]"#;
        let a = yukle(j);
        assert_eq!(a.iter().map(|x| x.id.as_str()).collect::<Vec<_>>(), vec!["afudm", "afudesk"]);
        assert!(a[1].yol.is_none());
    }

    #[test]
    fn en_yeni_surum_klasoru_secilir() {
        let kok = std::env::temp_dir().join(format!("afu-apps-{}", std::process::id()));
        for v in ["v130", "v140", "v99"] {
            let d = kok.join(v).join("AfuDesk");
            std::fs::create_dir_all(&d).unwrap();
            std::fs::write(d.join("afudesk.exe"), b"x").unwrap();
        }
        let yol = bul_en_yeni(&kok, "v*/AfuDesk/afudesk.exe").unwrap();
        assert!(yol.to_string_lossy().contains("v140"));
        let _ = std::fs::remove_dir_all(&kok);
    }

    #[test]
    fn exe_olmayan_yol_acilmaz() {
        let app = AfuApp { id: "x".into(), ad: "X".into(), yol: Some("C:/Windows/system32/cmd.bat".into()), durum_dosyasi: None, simge: None };
        assert!(ac(&app).is_err());
    }
}
```

- [ ] **Adım 2–4:** FAIL → uygula → PASS. `ac` yalnız `.exe` uzantılı ve kayıtta bulunan yolu açar; argüman geçmez; `CREATE_NO_WINDOW` gerekmez (GUI uygulaması). PadKöprü için diskte derlenmiş PyInstaller dağıtımı (`dist/PadKopru/PadKopru.exe`) mevcuttur; `.venv` veya `pythonw.exe` çalıştırmaya gerek yoktur, doğrudan `ShellExecuteW` ile açılır. AfuRemote için `tur: "android"` ise `ac` çağrısı engellenir.
- [ ] **Adım 5:** Claude, gerçek doğrulanmış yollarla `uygulamalar.json`'u doldurur: AfuDM (`AfuDM/AfuDM.exe`), AfuDesk (`AfuDesk/dist/v140/AfuDesk/afudesk.exe`), PadKöprü (`PadKopru/dist/PadKopru/PadKopru.exe`). AfuTube diskte bulunamadığı için `yol: null` ve menüde soluk "Kurulu değil"; AfuRemote ise `tur: "android"`, `yol: null` ve arayüzde "Telefonda" etiketiyle kaydedilir.
### Görev C2: Durum sözleşmesi (isteğe bağlı, uygulama başına)

Her Afu uygulaması isterse `%LOCALAPPDATA%\Afu\durum\<id>.json` dosyasına küçük bir durum yazar; Afu Merkez bunu salt okur (A7'deki izleyiciyle aynı yöntem). Yazmayan uygulama yalnızca "aç" seçeneğiyle görünür. Bu görev yalnızca **sözleşmeyi ve okuyucuyu** kurar; uygulamaların kendisine dokunmaz (her uygulamaya eklemek ayrı görevdir, o depoların kendi kuralları ve özellik dondurmaları geçerlidir: ör. AfuDM'de yeni özellik dondurması).

**Files:**
- Create: `docs/AFU_DURUM_SOZLESMESI.md`, `windows/src-tauri/src/apps_state.rs`
- Test: `apps_state.rs` `#[cfg(test)]`

**Interfaces:**
- Sözleşme: `{ "surum": 1, "id": "afudm", "durum": "bos" | "calisiyor" | "uyari" | "hata", "ozet": "3 indirme sürüyor", "guncelleme": "<ISO zaman>" }`; `ozet` en fazla 60 karakter, yol/PID/port yok.
- Produces: `pub fn oku(yol: &Path, simdi: SystemTime) -> Option<AppDurum>` (5 dk'dan eski → `None`, bayat sayılır).

- [ ] **Adım 1: Test yaz**

```rust
#[test]
fn bayat_ve_bozuk_durum_yok_sayilir() {
    let d = std::env::temp_dir().join(format!("afu-durum-{}.json", std::process::id()));
    std::fs::write(&d, r#"{"surum":1,"id":"afudm","durum":"calisiyor","ozet":"3 indirme","guncelleme":"2026-10-01T12:00:00Z"}"#).unwrap();
    let simdi = humantime_parse("2026-10-01T12:03:00Z");
    assert_eq!(oku(&d, simdi).unwrap().ozet, "3 indirme");
    let gec = humantime_parse("2026-10-01T12:10:00Z");
    assert!(oku(&d, gec).is_none());
    std::fs::write(&d, "{bozuk").unwrap();
    assert!(oku(&d, simdi).is_none());
    let _ = std::fs::remove_file(&d);
}
```

(`humantime_parse` test içi yardımcı: ISO metni `SystemTime`'a çevirir; yeni paket yok, `chrono` kullanılmaz, elle ayrıştırılır.)

- [ ] **Adım 2–4:** FAIL → uygula → PASS.

### Görev C3: Tek simgeden menü ve pet üzerinden erişim

**Files:**
- Modify: `windows/src-tauri/src/tray.rs`, `windows/src/views/views.ts` (yeni görünüm `apps`), `windows/src/afu/pet.ts`
- Test: `windows/tests/apps.test.ts`

**Interfaces:**
- Produces (TS): `appRows(apps, durumlar) -> { id, ad, etiket: "Aç" | "Kurulu değil" | "Telefonda", ozet: string, nokta: "mavi" | "turuncu" | "kirmizi" | null }[]`; birleşik simge durumu `enOnemli(durumlar) -> Durum` (hata > uyarı > çalışıyor > boş). "Kurulu değil" algılama mantığı: `yol == null` veya dosya diskte fiziksel olarak yoksa / uzantısı `.exe` değilse "Kurulu değil" (soluk buton); `tur === "android"` ise çalıştırma engellenerek doğrudan "Telefonda" etiketi gösterilir.

Davranış:
- Sağdaki tek simgenin sağ tık menüsü: üstte `AfuNöbet` (kartı aç), altında `Afu uygulamaları` alt menüsü: her uygulama adı + kısa durum (ör. `AfuDM · 3 indirme`), tıklayınca açar. Sonra `Mini peti göster/gizle`, `Bildirimleri duraklat`, `Çıkış`.
- Simgenin durum noktası tüm ekosistemin en önemli durumunu gösterir (A18'deki `simge()` ile).
- Pete sağ tık → aynı uygulama listesi küçük bir balon menüde; pete sol tık yine AfuNöbet kartını açar (tek ana işlem kuralı).
- Kartta `Uygulamalar` sekmesi: liste, her satırda tek düğme `Aç`.

- [ ] **Adım 1: Test yaz**

```ts
import { describe, expect, it } from "vitest";
import { appRows, enOnemli } from "../src/core/apps";

describe("Afu Merkez", () => {
  it("kurulu olmayan soluk, Android telefonda etiketi", () => {
    const rows = appRows(
      [{ id: "afudm", ad: "AfuDM", yol: "C:/a/AfuDM.exe" }, { id: "afutube", ad: "AfuTube", yol: null }, { id: "afuremote", ad: "AfuRemote", yol: null, tur: "android" }],
      { afudm: { durum: "calisiyor", ozet: "3 indirme" } },
    );
    expect(rows.map(r => r.etiket)).toEqual(["Aç", "Kurulu değil", "Telefonda"]);
    expect(rows[0]).toMatchObject({ ozet: "3 indirme", nokta: "mavi" });
  });

  it("birleşik durum en önemliyi seçer", () => {
    expect(enOnemli(["calisiyor", "hata", "uyari"])).toBe("hata");
    expect(enOnemli([])).toBe("bos");
  });
});
```

- [ ] **Adım 2–4:** FAIL → `windows/src/core/apps.ts` uygula, menü ve görünüm → PASS.
- [ ] **Adım 5:** `denetim.mjs`: `ShellExecuteW` yalnız `apps.rs` içinde izinli; başka yerde süreç başlatma yok kuralı korunur.

## KAPI 3 — Faz C kullanıcı testi

| # | Adım | Beklenen |
|---|---|---|
| 1 | Simgeye sağ tık › Afu uygulamaları | Kurulu uygulamalar listelenir (AfuDM, AfuDesk, PadKöprü: "Aç"); kurulu olmayan AfuTube soluk "Kurulu değil"; AfuRemote ise "Telefonda" olarak görünür |
| 2 | AfuDM'yi buradan aç | AfuDM açılır; AfuNöbet etkilenmez |
| 3 | Pete sağ tık | Aynı liste küçük menüde |
| 4 | AfuNöbet'i kapat | Açtığı uygulamalar çalışmaya devam eder |
| 5 | (Durum yazan bir uygulama varsa) o uygulamada iş başlat | Simgedeki nokta ve menü özeti güncellenir |

Faz C sonrası (ayrı görevler, her depoda ayrı): AfuDM, AfuDesk, PadKöprü ve AfuTube'a `AFU_DURUM_SOZLESMESI.md`'deki küçük durum dosyasını yazdırmak. AfuDM'de özellik dondurması olduğu için orada önce kullanıcı onayı gerekir.

## FAZ B — Asistan (Codex, Kapı 1 sonrası)

## Faz B ses yönü — 2 Ekim 2026 (yalnız belge)

Güncel kullanıcı eki önceki ses seçimi paragrafının yerine geçer. Ses yolu üç katmandır:

1. **Codex LOGIN:** Mikrofon → ChatGPT üyelik oturumuyla Codex sesli oturumu → Codex sesli cevap. API anahtarı istenmez. Kurulu sürümde üyelikli ses giriş/çıkışı gerçek oturumla doğrulanmadan destekleniyor sayılmaz.
2. **Afu rol-model karakteri:** Codex oturumunun talimat alanına kalıcı olarak “Türkçe konuş; sıcak, tatlı, neşeli ve doğal bir ton kullan; kısa cevaplar ver. Kısa bildirimlerde enerjik, uzun cevaplarda sakin ol.” yazılır. Kalıcılık yeni oturumda ve devam ettirilen oturumda sınanır. Dinlerken dinleme, cevap sırasında konuşma animasyonu kullanılır.
3. **Yerel ses filtreleri:** Codex sesli cevabı ücretsiz yerel araçla pitch, formant, EQ ve hız filtrelerinden geçirilerek `2-Afu-Minik-Kız.mp3` tınısına yaklaştırılır. Doğallık ve Türkçe anlaşılabilirlik korunur; birebir ses dönüşümü varsayılmaz. Araç ve sayısal ayarlar `ses_deneme/` gerçek denemesinin sonuçlarından alınır, tahmin edilmez. Ana ekranda teknik filtre ayarları gösterilmez.

`ses_deneme/codex_stderr.log` ve `codex_desktop_stderr.log` mevcut denemelerde “Could not find home directory” hatası içeriyor; başarılı Codex sesli cevap veya doğrulanmış filtre profili kanıtı yok. Mevcut `measurements.json` yerel ses adaylarının ölçümleridir; Codex üyelikli ses veya filtre zincirinin kabulü değildir. Faz B'de bu deneme tamamlanıp araç/sürüm, ayarlar, giriş/çıkış sesleri ve dinleme sonucu aynı klasöre kaydedilecek.

Üyelikli yol çalışmazsa yerel Whisper + seslendirme yedeği kullanılır. Ücretli API’ye geçilmez. Kapı 2 gerçek mikrofonla LOGIN erişimini, API anahtarı olmadan sesli yanıtı, talimat kalıcılığını, kısa/uzun cevap tonunu, filtreli Türkçe anlaşılabilirliği ve referans tınıya yakınlığı, animasyonları ve mikrofonun bırakılmasını doğrular. Filtre öncesi/sonrası kayıtlar karşılaştırılır; başarısız yol ve kullanılan yedek açıkça raporlanır. Henüz destek/başarı iddiası yok.

Bu tur yalnız belge; Faz B koduna başlanmaz. Kapı 1 gerçek Windows testi kullanıcıya aittir.


Protokol doğrulandı (yerel şema, codex-cli 0.159.2): istemci istekleri `initialize`, `thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`, `model/list`, `account/read`, `account/login/start`, `account/rateLimits/read`, `thread/attachment/add`; istemci bildirimi `initialized`; sunucu bildirimleri `turn/started`, `turn/completed`, `item/started`, `item/completed`, `item/agentMessage/delta`. **Uygulamadan önce** Görev B1 Adım 1 ile şemayı depoya üret ve parametre adlarını oradan al.

### Görev B0: Ses hazırlığı (Claude, Faz B başlamadan, internetli)

- [ ] LLVM kur (libclang, `whisper-rs` bindgen için): `winget install -e --id LLVM.LLVM`, ardından kullanıcı ortam değişkeni `LIBCLANG_PATH=C:\Program Files\LLVM\bin`. Kontrol: `clang --version`.
- [ ] Visual Studio 2022 içindeki cmake'in PATH'te devkitPro/msys cmake'ten önce geldiğini doğrula (msys cmake MSVC ile derleyemez): `where cmake`.
- [ ] `windows/src-tauri/Cargo.toml`'a üç bağımlılığı ekle, `cargo fetch` (internetli). Ardından `CARGO_NET_OFFLINE=true cargo build` bir kez dene; whisper.cpp derlemesinin geçtiğini ve süresini `ILERLEME_MASTER.md`'ye yaz.
- [ ] Model: `ggml-small.bin` (yaklaşık 466 MB, Türkçe için önerilen) resmî kaynaktan indir: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin` → `%LOCALAPPDATA%\AfuNobet-UI\models\ggml-small.bin`. SHA256'yı `THIRD_PARTY.md`'ye yaz. Model exe'ye gömülmez, depoya eklenmez (`.gitignore`).
- [ ] Test sesi: Windows TTS ile "Merhaba Afu" cümlesini 16 kHz mono WAV olarak üret → `windows/src-tauri/tests/ses/merhaba_16k.wav`.
- [ ] Derleme veya model başarısızsa: Faz B, B4 hariç ilerler; B4 yalnızca Windows yedeğiyle yapılır ve karar kullanıcıya sorulur.

**B0 durumu (Claude, 1 Eki 16:2x):**
- TAMAM: `libclang` pip ile kullanıcı alanına kuruldu (UAC penceresi yok): `LIBCLANG_PATH=C:\Users\afuuu\AppData\Roaming\Python\Python311\site-packages\clang\native`. LLVM/winget KURULMADI, gerek yok.
- TAMAM: `ggml-small.bin` → `%LOCALAPPDATA%\AfuNobet-UI\models\ggml-small.bin` (487.601.967 bayt, SHA256 `1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b`).
- TAMAM: `whisper-rs =0.11.1`, `cpal 0.15`, `hound 3.5` crate kaynakları indirildi (`cargo fetch`; çevrimdışı derleme için hazır).
- TAMAM: Windows Türkçe sesi var: **Microsoft Tolga (tr-TR)**. Test sesi: `afuproject/_deneme/whisper/merhaba_16k.wav` (Tolga, 16 kHz mono); B4'te `windows/src-tauri/tests/ses/merhaba_16k.wav` olarak kopyalanır.
- AÇIK (Codex, B4 başında): whisper.cpp derlemesi. Bulunanlar: (1) derleme Visual Studio geliştirici ortamı ister: `vcvars64.bat` çağrısı; (2) PATH'te devkitPro msys `cmake` önde, VS cmake öne alınmalı; (3) `CMAKE_GENERATOR=Ninja` (VS cmake klasöründeki ninja) ile configure ve C++ derlemesi geçiyor; (4) çok uzun yol (scratchpad) C1083 verir, kısa `CARGO_TARGET_DIR` kullan; (5) SON HATA: bağlamada `could not find native static library whisper`. Kütüphane `out/build/whisper.lib` ve `out/lib/static/whisper.lib` olarak üretiliyor; whisper-rs-sys 0.9.0 `build.rs` MSVC'de `out/build/Release`'i arıyor (Ninja bu alt klasörü üretmez). Çözüm adayları: Ninja yerine `Visual Studio 17 2022` üreticisini VS cmake ile kullanmak (msys cmake değil), ya da `RUSTFLAGS=-L native=<out/lib/static>`. Hazır betik: `afuproject/_deneme/whisper_derle.bat`, deneme projesi `afuproject/_deneme/whisper`.

### Görev B1: app-server yaşam döngüsü ve JSON-RPC çerçeveleme

**Files:**
- Create: `windows/src-tauri/src/codex.rs`, `docs/codex-protocol/` (üretilmiş şema, yalnız ihtiyaç duyulan dosyalar)
- Modify: `windows/src-tauri/src/lib.rs`
- Test: `codex.rs` `#[cfg(test)]`

**Interfaces:**
- Produces (Rust): `CodexBridge::start() -> Result<Self, CodexHata>` (tek örnek; `codex` PATH'te yoksa `CodexHata::Bulunamadi`), `request(method: &str, params: Value) -> Result<Value, CodexHata>`, bildirimler Tauri olayı `"codex"` ile `{ method, params }`; `Drop` alt süreci sonlandırır. Tauri komutları: `codex_send(text, attachments)`, `codex_status() -> "hazir"|"oturum_yok"|"bulunamadi"`.

- [ ] **Adım 1:** `codex app-server generate-json-schema --out docs/codex-protocol` (yerel, internet gerekmez). `InitializeParams`, `ThreadStartParams`, `TurnStartParams`, `AccountReadResponse` alanlarını oku ve `ILERLEME_MASTER.md`'ye yaz.
- [ ] **Adım 2: Çerçeveleme testi**

```rust
#[test]
fn satir_basina_bir_jsonrpc_mesaji() {
    let mut c = Cerceve::default();
    let mut cikan = c.besle(b"{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{}}\n{\"jsonrpc\":\"2.0\",\"method\":\"turn/started\",\"par");
    assert_eq!(cikan.len(), 1);
    cikan = c.besle(b"ams\":{}}\n");
    assert_eq!(cikan[0]["method"], "turn/started");
}

#[test]
fn codex_yoksa_tek_cumle_durum() {
    let durum = durum_metni(&CodexHata::Bulunamadi);
    assert_eq!(durum, "Codex bulunamadı.");
}
```

- [ ] **Adım 3–4:** FAIL → `Cerceve` (satır tamponu) ve `durum_metni` uygula; `start()` `std::process::Command::new("codex").args(["app-server"])` ile `CREATE_NO_WINDOW` bayrağıyla başlatır (konsol penceresi açılmaz), stdin/stdout borularını ayrı iş parçacıklarında okur → PASS.
- [ ] **Adım 5:** Tek örnek: `Shared` içinde `Mutex<Option<CodexBridge>>`; ikinci `start` mevcut olanı döndürür. Uygulama çıkışında `Drop` → `child.kill()`; yetim süreç testi kullanıcı testine yazılır.

### Görev B2: Oturum durumu ve sohbet görünümü

**Files:**
- Create: `windows/src/chat/chat.ts`, `windows/src/chat/context.ts`
- Modify: `windows/src/views/views.ts` (üçüncü görünüm `chat`), `windows/src/core/layout.ts`
- Test: `windows/tests/chat.test.ts`

**Interfaces:**
- Consumes: Tauri olayı `"codex"`, komutlar `codex_send`, `codex_status`.
- Produces: `class ChatModel { append(method, params): void; get text(): string; get busy(): boolean }`, `buildContext(snapshot, focus) -> string` (en fazla 1.500 karakter; job id, proje, görev başlığı, durum, aktif dosya; log yok, yol yok).
- Kullanıcı onaylı kural (Madde 3): Tek ana düğme "Afu'ya sor" — sohbet ve bas-konuş aynı giriş noktasında birleşir; ajan seçimi, model ve bağlantı ayrıntılarını uygulama arka planda kendisi yönetir; teknik detaylar ve gelişmiş ayarlar gizlidir (Afu basitlik kuralı).
- Kullanıcı onaylı kural (Madde 4): Durum soruları yerelde cevaplanır — "Codex ne yapıyor?", "Hangi iş bitti?", "Durum ne?" gibi sorular mevcut yerel görev verisinden (`state.json` / bellek) anında ve kota harcamadan cevaplanır; yalnızca açıklama, kod yorumu veya değerlendirme gerektiren karmaşık sorular Codex'e yönlendirilir.

- [ ] **Adım 1: Test yaz**

```ts
import { describe, expect, it } from "vitest";
import { ChatModel } from "../src/chat/chat";
import { buildContext } from "../src/chat/context";
import { parseState } from "../src/core/state";

describe("sohbet", () => {
  it("delta parçalarını birleştirir, turn/completed ile biter", () => {
    const m = new ChatModel();
    m.append("turn/started", {});
    m.append("item/agentMessage/delta", { delta: "Codex " });
    m.append("item/agentMessage/delta", { delta: "çalışıyor." });
    expect(m.busy).toBe(true);
    m.append("turn/completed", {});
    expect(m.text).toBe("Codex çalışıyor.");
    expect(m.busy).toBe(false);
  });

  it("bağlam kısa ve gizli bilgi içermez", () => {
    const s = parseState({ version: 1, mesaj: "", tasks: [{ id: "is_1", agent: "codex", task: "UI", repo: "AfuNobet-UI", status: "Calisiyor", file: "C:\\Users\\afuuu\\gizli\\main.ts", progress: 40, quota: { remaining_percent: null, reset_at: null } }] });
    const ctx = buildContext(s, s.tasks[0]);
    expect(ctx.length).toBeLessThanOrEqual(1500);
    expect(ctx).toContain("main.ts");
    expect(ctx).not.toContain("afuuu");
  });
});
```

- [ ] **Adım 2–4:** FAIL → uygula (delta alan adını Adım B1-1 şemasından doğrula) → PASS.
- [ ] **Adım 5:** `codex_status` `oturum_yok` ise sohbet alanında yalnızca "Codex oturumu açık değil." ve **Oturum aç** düğmesi (`account/login/start`; dönen URL'yi varsayılan tarayıcıda açmak kullanıcı eylemidir). Claude'a düşme yok, API anahtarı alanı yok.
- [ ] **Adım 6 (Madde 3 kabul ölçütü):** Tek ana işlem: Arayüzde "Afu'ya sor" tek ve belirgin ana giriş noktasıdır; kullanıcı model veya bağlantı parametresi seçmek zorunda kalmaz; bas-konuş ve metin girişi bu alanda bütünleşiktir.
- [ ] **Adım 7 (Madde 4 kabul ölçütü):** Yerel durum sorgulama: "Codex ne yapıyor?", "Hangi iş bitti?", "Son durum ne?" gibi basit durum soruları yerel veri tablosundan anında üretilir; gereksiz yere app-server turn başlatılmaz, kota korunur. Codex yalnızca analiz/üretim gerektiren sorularda devreye girer.

### Görev B3: Dosya bırakma

**Files:**
- Modify: `windows/src/island/island.ts`, `windows/src/chat/chat.ts`
- Test: `windows/tests/chat.test.ts`

**Interfaces:**
- Produces: `ChatModel.attach(paths: string[]): void`, `ChatModel.attachments: { name: string; path: string }[]`, `ChatModel.outbox: { text: string; attachments: string[] }[]` (yalnızca kullanıcı Gönder'e basınca dolar); gönderilene kadar hiçbir yere iletilmez.

- [ ] **Adım 1: Test**

```ts
it("bırakılan dosya yalnızca ek olarak bekler, gönderilmez", () => {
  const m = new ChatModel();
  m.attach(["C:\\proje\\rapor.md"]);
  expect(m.attachments).toEqual([{ name: "rapor.md", path: "C:\\proje\\rapor.md" }]);
  expect(m.outbox).toEqual([]);
});
```

- [ ] **Adım 2–4:** FAIL → uygula; gönderimde ek, şemada `turn/start` girdisi dosya/yerel görüntü türünü destekliyorsa onunla, desteklemiyorsa metne "Ek dosya: <yol>" olarak eklenir (karar ILERLEME'ye yazılır). Karakter bırakma sırasında `happy` + kısa ölçek animasyonu → PASS.

### Görev B4: Yerel ses (bas-konuş): Whisper STT + Windows TTS

Kaynak: MurMur `src-tauri/src/audio.rs` (cpal yakalama, 16 kHz'e doğrusal yeniden örnekleme) ve `src-tauri/src/transcriber.rs` (yalnız yerel `whisper-rs` yolu: `WhisperContext::new_with_params`, `FullParams` Greedy `best_of: 1`, `set_language`, `set_translate(false)`, yazdırmaları kapat, `n_threads = min(4, çekirdek)`). Kopyala-yapıştır değil; bu yapıya göre Afu'ya uyarlanır. Ayar dosyası, model indirici, bulut fonksiyonları (`transcribe_gemini/groq/deepgram`) ve VoxCoder alınmaz.

**Files:**
- Create: `windows/src-tauri/src/voice/mod.rs`, `voice/capture.rs`, `voice/whisper.rs`, `voice/winrt.rs`, `windows/src/chat/voice.ts`, `THIRD_PARTY.md`
- Modify: `windows/src-tauri/Cargo.toml` (B0'daki üç paket + `windows` feature: `Media_SpeechSynthesis`, `Media_SpeechRecognition`, `Media_Playback`, `Media_Core`, `Foundation`, `Foundation_Collections`, `Storage_Streams`), `windows/src-tauri/src/lib.rs`
- Test: `voice/capture.rs` ve `voice/whisper.rs` `#[cfg(test)]`, `windows/tests/voice.test.ts`

**Interfaces:**
- Produces (Rust):
  - `capture::Recorder::start() -> Result<Recorder, SesHata>`, `Recorder::stop(self) -> Vec<f32>` (16 kHz mono; `Drop` mikrofonu bırakır)
  - `capture::resample(input: &[f32], in_rate: u32, out_rate: u32) -> Vec<f32>`, `capture::to_mono(interleaved: &[f32], channels: u16) -> Vec<f32>`
  - `whisper::kisa_mi(ses: &[f32]) -> bool` (0,3 sn'den kısa), `whisper::Motor::yukle(model_yolu: &Path) -> Result<Motor, SesHata>`, `Motor::cevir(&self, ses: &[f32]) -> Result<String, SesHata>` (dil sabit `"tr"`; kısa ses boş metin döner, hata değil)
  - `winrt::konus(metin: &str) -> Result<(), SesHata>`, `winrt::dinle_yedek() -> Result<String, SesHata>`
  - Tauri komutları: `voice_start()`, `voice_stop() -> Result<String, String>` (Whisper; model yoksa Windows yedeği), `voice_speak(text)`, `voice_supported() -> { whisper: bool, winrt_stt: bool, tts: bool }`
  - `SesHata` kullanıcı metni tek cümle: `"Mikrofon bulunamadı."`, `"Ses modeli yüklenemedi."`, `"Ses anlaşılamadı, tekrar dene."`
- Produces (TS): `VoiceController` (`press()`, `release()`, `micOpen`, `message`), durumlar `idle → listening → thinking → working → speaking → idle`; TTS tek düğmeyle kapanır (`Settings.tts: boolean`).
- Kullanıcı onaylı kural (Madde 5): Ses önce metin — konuşma yazıya dönünce doğrudan gönderilmez; kullanıcı göndermeden önce metni düzenleyebilir; "işi devam ettir" veya benzeri eylem komutlarında ne yapılacağı açıkça gösterilir ve onay istenir.

- [ ] **Adım 1: Saf fonksiyon testleri (donanımsız)**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stereo_mono_ortalama() {
        assert_eq!(to_mono(&[1.0, -1.0, 0.5, 0.5], 2), vec![0.0, 0.5]);
    }

    #[test]
    fn yeniden_ornekleme_uzunlugu() {
        let bir_saniye = vec![0.0f32; 48_000];
        let r = resample(&bir_saniye, 48_000, 16_000);
        assert!((r.len() as i64 - 16_000).abs() <= 1);
    }

    #[test]
    fn ayni_oran_degismez() {
        let x = vec![0.1, 0.2, 0.3];
        assert_eq!(resample(&x, 16_000, 16_000), x);
    }
}
```

```rust
#[test]
fn cok_kisa_ses_model_gerekmeden_ayirt_edilir() {
    assert!(kisa_mi(&vec![0.0f32; 3_000]));   // 0,19 sn
    assert!(!kisa_mi(&vec![0.0f32; 16_000])); // 1 sn
}

#[test]
fn model_yoksa_tek_cumle_hata() {
    let e = Motor::yukle(std::path::Path::new("Z:/yok/ggml-small.bin")).unwrap_err();
    assert_eq!(e.to_string(), "Ses modeli yüklenemedi.");
}
```

- [ ] **Adım 2:** `CARGO_NET_OFFLINE=true cargo test voice` → FAIL (modül yok).
- [ ] **Adım 3:** `capture.rs` (cpal varsayılan giriş aygıtı; f32/i16/u16 örnek türleri; `to_mono` + `resample`) ve `whisper.rs` uygula. Model yolu: `%LOCALAPPDATA%\AfuNobet-UI\models\ggml-small.bin`; ortam değişkeni `AFUNOBET_WHISPER_MODEL` ile değişir. Model ilk bas-konuşta arka plan iş parçacığında bir kez yüklenir.
- [ ] **Adım 4:** `cargo test voice` → PASS.
- [ ] **Adım 5: Gerçek model testi (model yoksa atlanır)**

```rust
#[test]
#[ignore = "model gerekir: cargo test -- --ignored"]
fn turkce_ornek_ses_cevrilir() {
    let model = std::env::var("AFUNOBET_WHISPER_MODEL").unwrap();
    let m = Motor::yukle(std::path::Path::new(&model)).unwrap();
    let mut r = hound::WavReader::open(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/ses/merhaba_16k.wav")).unwrap();
    let ses: Vec<f32> = r.samples::<i16>().map(|s| s.unwrap() as f32 / 32768.0).collect();
    assert!(m.cevir(&ses).unwrap().to_lowercase().contains("merhaba"));
}
```

- [ ] **Adım 6: TS durum makinesi testi**

```ts
import { expect, it } from "vitest";
import { VoiceController } from "../src/chat/voice";

it("bas-konuş durum sırası ve mikrofonun bırakılması", async () => {
  const log: string[] = [];
  const v = new VoiceController({
    start: async () => {}, stop: async () => "Codex ne yapıyor",
    send: async () => "Çalışıyor.", speak: async () => {}, onState: s => log.push(s), tts: () => true,
  });
  await v.press();
  await v.release();
  expect(log).toEqual(["listening", "thinking", "working", "speaking", "idle"]);
  expect(v.micOpen).toBe(false);
});

it("boş çeviri gönderilmez, kullanıcıya tek cümle döner", async () => {
  const sent: string[] = [];
  const v = new VoiceController({
    start: async () => {}, stop: async () => "", send: async t => { sent.push(t); return ""; },
    speak: async () => {}, onState: () => {}, tts: () => false,
  });
  await v.press();
  await v.release();
  expect(sent).toEqual([]);
  expect(v.message).toBe("Ses anlaşılamadı, tekrar dene.");
});
```

- [ ] **Adım 7:** FAIL → `voice.ts` uygula (düğmeye basılı tutunca `voice_start`, bırakınca `voice_stop` → metin → `codex_send` → akış bitince TTS açıksa `voice_speak`) → PASS.
- [ ] **Adım 8:** `winrt.rs`: `SpeechSynthesizer` ile TTS (Türkçe ses varsa `tr-TR`, yoksa varsayılan); `dinle_yedek` `SpeechRecognizer` dikte. Birim testte yalnız `voice_supported()` dönüş türü. Gerçek mikrofon/hoparlör kullanıcı testidir.
- [ ] **Adım 9:** `THIRD_PARTY.md`: Coucou (MIT, Louis Raillé) ve MurMur (README'ye göre MIT; depoda LICENSE yok; commit `0be0d1b`; uyarlanan dosyalar). `capture.rs` ve `whisper.rs` başına: `// Uyarlama: Mr-ABX/MurMur src-tauri/src/audio.rs ve transcriber.rs @0be0d1b (MIT, README).`
- [ ] **Adım 10:** Performans: boşta CPU %0; bas-konuş bitince `Recorder` düşer (Windows mikrofon simgesi kapanır). Exe boyutu ve RAM (model yüklü/yüksüz) `ILERLEME_MASTER.md`'ye.
- [ ] **Adım 11 (Madde 5 kabul ölçütü):** Ses önce metin: Konuşma metne çevrildiğinde girdi alanına yazılır, otomatik ateşlenmez; kullanıcı metni inceleyip düzeltebilir; eylem/devam komutlarında gerçekleştirilecek işlem kartta net gösterilir ve onay mekanizması işletilir.

### Görev B5: Sesli bildirimler

**Files:**
- Modify: `windows/src/core/events.ts`, `windows/src/chat/voice.ts`
- Test: `windows/tests/events.test.ts`

**Interfaces:**
- Consumes: `EventDeduper` (A10), `State.shouldAnnounce()` (A3).
- Produces: `announcement(e: AfuEvent) -> string | null` (`JOB_FINISHED` → "Codex görevi tamamladı.", `RATE_LIMIT` → "Codex kota bekliyor.", `JOB_FAILED` → "OpenCode görevi hata verdi.", diğerleri `null`); en az 30 sn aralık.
- Kullanıcı onaylı kural (Madde 6): Karakter sesi ile konuşma tarzı ayrı — doğal Türkçe ve anlaşılırlık önceliklidir; aşırı ince/çocuksu ses kulağı yorar, net tını korunur; kısa bildirimler tatlı-enerjik tonla sunulur, uzun açıklamalar ve cevaplar sakin/dingin tonla aktarılır.

- [ ] **Adım 1: Test**

```ts
it("sesli bildirim metni ve sessiz olaylar", () => {
  expect(announcement({ kind: "JOB_FINISHED", taskId: "j", agent: "codex" })).toBe("Codex görevi tamamladı.");
  expect(announcement({ kind: "FILE_EDIT", taskId: "j", agent: "codex" })).toBeNull();
});
```

- [ ] **Adım 2–4:** FAIL → uygula → PASS. Duraklatılmışken ve TTS kapalıyken konuşmaz.
- [ ] **Adım 5 (Madde 6 kabul ölçütü):** Konuşma tarzı ve ses tınısı ayrımı: Kısa bildirimlerde ("Codex görevi tamamladı", kota uyarısı) tatlı-enerjik ton; uzun cevaplarda sakin ve yormayan ton kullanılır. Aşırı tiz veya yapay filtrelere kaçılmaz; Türkçe telaffuz ve anlaşılırlık bozulmaz.

### Görev B6: Gizlilik ve Faz B derlemesi

- [ ] **Adım 1:** UI hiçbir token görmez (kimlik app-server'da). Test: `codex.rs` olay yayınlarken `account/*` yanıtlarından yalnızca `{ loggedIn: bool, planType }` geçirir; `log::line` çağrılarında `token|refresh|access` geçmediğini `denetim.mjs`'e kural olarak ekle.
- [ ] **Adım 2:** `denetim.mjs` (codex.rs izinli), tüm testler, derleme, kopya, SHA256, kısayol (A13 Adım 3). Kalıcı geri alma kuralı (Madde 7): Önceki çalışan sürüm `dist/onceki/` altında korunur, `dist/onceki/GERI_AL.ps1` tek hareketle geri alma için hazır tutulur; kısayol ancak yeni exe testleri geçince güncellenir.
- [ ] **Adım 3:** `AFU_CHANGES.md`, `KULLANIM_REHBERI.html` (Sohbet ve Ses bölümleri, doğrulama durumlarıyla), Faz B son raporu.

## KAPI 2 — Faz B kullanıcı testi

| # | Adım | Beklenen |
|---|---|---|
| 1 | Sohbet görünümünü aç, oturum yoksa Oturum aç | Tarayıcıda ChatGPT girişi, sonra "hazır" |
| 2 | "Codex ne yapıyor?" yaz | Akarak gelen Türkçe cevap |
| 3 | Bir dosyayı adaya bırak | Ek olarak görünür, gönderilmeden hiçbir yere gitmez |
| 4 | İnternet kapalıyken bas-konuş, Türkçe bir soru sor | Mikrofon açılır, Türkçe metne döner (Whisper, çevrimdışı), cevap seslendirilir, mikrofon simgesi kapanır |
| 4b | Model dosyasını geçici olarak taşı, bas-konuş | Windows yedeği devreye girer ya da tek cümle hata; çökme yok |
| 5 | Bir Codex işi bitsin | Bir kez "Codex görevi tamamladı." |
| 6 | Uygulamayı kapat | Görev Yöneticisi'nde `codex` alt süreci kalmaz |
| 7 | 10 dk açık bırak | CPU/RAM makul, konsol penceresi yok |

### Görev R2: Sürüm (Claude, kullanıcı onayıyla)

- [ ] Faz B commit'i, `afu/faz-b` dalı, push.
- [ ] `main`'e birleştirme ve `v0.3.0` etiketi kullanıcı onayıyla. GitHub Release başlığı ve ilk açıklama İngilizce, ayrıntı Türkçe; ek olarak `afunobet-ui-coucou.exe` ve SHA256.
- [ ] Hafızaya proje durumu notu (Claude).

---

## FAZ D — (İsteğe bağlı, V2) Katmanlı rig ile daha akıcı pet

**Ne zaman:** Yalnızca Kapı 1'de kullanıcı "kareler arası geçiş resim değişiyor gibi sert" derse. V1 (20 hazır kare + CSS) yeterliyse bu faz yapılmaz.

**Neden ayrı:** Kaynak görseller tek parça çizim. Göz bebeği, göz kapağı, ağız, kollar ayrı katman yapılınca arkalarında kalan alanlar (göz beyazı, gövde) boş kalır; bu alanların aynı stilde yeniden boyanması gerekir. Bu bir resim düzenleme işidir; Blender ancak katmanlar hazır olduktan sonra iskelet ve render için kullanılır. Çıktı yine PNG kare olduğu için uygulama tarafı (A17 `SEKANSLAR`) değişmez; yalnız kareler sıklaşır.

Katmanlar: pelerin, sırt çantası, gövde, baş/beyin, göz beyazları, sol/sağ göz bebeği, üst göz kapakları, kaşlar, ağız (normal/gülümseme/şaşkın), sol kol+el, sağ kol+el, kitap, efektler (`?`, `!`, parıltı, `Zz`).

### Görev D1: Katmanları üret (Claude + kullanıcı onayı)

**Mevcut girdi:** `pet_teknik_sayfa.png` bölüm 3 hazır parçaları içerir: kafa (beyin), gövde, sol/sağ kol, sol/sağ el, göz beyazı, göz bebeği (L/R), göz kapakları, kaşlar, 4 ağız, kitap, sırt çantası, pelerin/şal, botlar, efektler (`✦`, `?`, `!`, `Zz`, kalp); bölüm 4: 9 yüz ifadesi (default, mutlu, göz kırpma, şaşkın, kararlı, meraklı, düşünme, üzgün, uyku). **Uyarı:** bu parçalar karakterin gerçek ayrıştırması değil, ayrıca çizilmiş örneklerdir ve küçüktür (yaklaşık 100–200 px). Birleşince ana karaktere tam oturmayabilir. D1'in ilk adımı bunları kesip `idle_normal` üstüne yerleştirerek uyum ölçmektir; uyum yetersizse aynı parçalar bu sayfa referans verilerek yüksek çözünürlükte yeniden üretilir.

- [ ] Yöntem seçimi (kullanıcı): (a) aynı stilde parça üretimi (`gemini-gorsel` veya Codex `gpt-image-2`, kaynak `maskot_sayfa.png` ve `pet_bekleme_dongu.png` referans verilerek, şeffaf arka plan); (b) elle ayırma (Krita, ücretsiz). Öneri: (a) ile üret, kullanıcı gözle onaylar.
- [ ] Çıktı: `afu-character/rig/<katman>.png`, aynı tuval (2048×2048), pivot noktaları `rig/pivot.json` (her katmanın dönme merkezi, ör. kol omuzdan).
- [ ] Doğrulama: katmanlar üst üste bindirilince `idle_normal` karesine benzerlik (ortalama renk farkı < 10, yüz bölgesinde < 6); kontrol görseli `rig/birlesim-kontrol.png`.

### Görev D2: Blender'da 2B iskelet ve sprite render (Codex, Blender 3.6 kurulu)

**Files:**
- Create: `afu-character/rig/afu_pet.blend`, `windows/scripts/blender_rig.py` (bpy betiği; `blender -b -P blender_rig.py` ile arka planda, pencere açmadan)

- [ ] `blender_rig.py`: her katmanı görüntü dokulu düzlem olarak yükler, `pivot.json`'a göre iskelet kemiklerine bağlar, ortografik kamera, şeffaf arka plan (`film_transparent`), Eevee.
- [ ] Hareketler (Codex listesi): idle (gövde 1–2 px, baş hafif sallanma, 2,8 sn), blink 90 ms, göz takibi (göz bebeği kemiği 9 yön pozu), hover (baş 2–4 px yukarı, eller sıkı tutunur), peeking (gözler → baş → eller), sleep (baş iner, gözler kapanır, `Zz`), alert (baş hızlı yukarı, gözler büyür, `!`, sarsıntı), thinking (gözler yukarı-sola, baş eğik, `?`), success (iki el yukarı, zıplama, parıltı), click (squash 100 ms + yay).
- [ ] Render: her hareket 24 fps kare dizisi → `afu-character/pet/v2/<hareket>/0001.png…`; göz takibi için 9 yönlük ayrı göz bebeği katmanı (çalışma anında CSS ile, render değil).
- [ ] Test: `blender -b -P blender_rig.py -- --dogrula` her hareketin kare sayısı = süre × 24 / 1000 (±1); kareler aynı tuvalde; ilk ve son kare döngülü hareketlerde aynı (dikiş yok).

### Görev D3: Uygulamada V2 kareleri

- [ ] `pet.ts`: `SEKANSLAR` V2 kare dizilerine geçer (`Settings.petV2`, varsayılan V1); göz bebeği katmanı imleç yönüne göre 9 yönden seçilir (`requestAnimationFrame`, yalnız pet görünürken).
- [ ] Test: V1 ve V2 sekanslarının durum → hareket eşlemesi aynı (`pet.test.ts` ortak tablo).
- [ ] Bellek/CPU ölçümü: V2 kareleri RAM'i 80 MB sınırının altında tutuyor mu; tutmuyorsa WebP ve tembel yükleme.

## KAPI 4 — Faz D kullanıcı testi

| # | Adım | Beklenen |
|---|---|---|
| 1 | V1 ve V2'yi yan yana izle (ayar) | V2 daha akıcı; karakterin yüzü, renkleri ve kıyafeti aynı |
| 2 | Fareyi petin etrafında gezdir | Gözler fareyi takip eder |
| 3 | 10 dk açık bırak | CPU ~%0 (pet görünmüyorken), RAM < 80 MB |

## Yürütme ve Kota Planı

| Sıra | Adım | Kim | Yaklaşık |
|---|---|---|---|
| 1 | Faz 0 | Claude | 15 dk |
| 2 | A1 (Görev A1–A4) | Codex | 1 tur |
| 3 | A2 (A5–A10) | Codex | 1–2 tur |
| 4 | A3 (A11–A13) | Codex | 1 tur |
| 5 | A4 (A14–A19) mini pet + durum simgesi | Codex | 2 tur |
| 6 | Kapı 1 | Kullanıcı | 20 dk |
| 7 | R1 | Claude | 10 dk |
| 8 | C1–C3 Afu Merkez (+ kayıt dosyası Claude) | Codex | 1 tur |
| 9 | Kapı 3 | Kullanıcı | 10 dk |
| 10 | B0 ses hazırlığı (LLVM, paketler, model) | Claude | 30 dk |
| 11 | B1–B3 sohbet, dosya | Codex | 1–2 tur |
| 12 | B4–B6 ses, bildirim, gizlilik | Codex | 1–2 tur |
| 13 | Kapı 2 + R2 sürüm | Kullanıcı + Claude | 20 dk |
| 14 | (isteğe bağlı) D1 katmanlar | Claude + kullanıcı onayı | 1–2 saat |
| 15 | (isteğe bağlı) D2–D3 Blender rig + uygulama | Codex | 2 tur |

Her Codex turu `GOREV_MASTER.md` + bu plan ile başlar; kota keserse `ILERLEME_MASTER.md`'deki son satırdan devam eder. Aynı anda tek ajan yazar. OpenCode yalnızca test koşturmak için, dosyaya yazma yetkisi olmadan kullanılabilir. Gemini bu projede kod yazmaz (önceki denemede stilleri sildi).

## Karar Bekleyen Konular (kullanıcı)

Her birinin bir varsayılanı var; cevap gelmezse varsayılanla ilerlenir. "Engeller" sütunu, kararın hangi görevden önce gerektiğini gösterir.

| # | Konu | Varsayılan (öneri) | Engeller |
|---|---|---|---|
| 1 | **Mini pet dinlenme yeri** | Küçültünce ada üstte gizlenmez, görev çubuğuna iner; üst kenar şeridi pet modunda kapalı (tek yer). Uyarılarda kart kendiliğinden açılmaz, petin `!` balonu yeter. Alternatif: üst şerit de açık kalsın. | A17 |
| 2 | **Faz C ve Faz B sırası** | Önce Faz C (Afu Merkez), sonra Faz B (sohbet+ses). C daha küçük ve hemen günlük fayda verir. | R1 sonrası |
| 3 | **Afu Merkez ayrıntıları** | (a) PadKöprü için giriş noktası C1'de sorulur. (b) AfuTube diskte aranır, bulunamazsa "Kurulu değil". (c) Uygulamalara durum dosyası yazdırmak her depoda ayrı iş; AfuDM özellik dondurması nedeniyle ayrıca onay. | C1 |
| 4 | **"Projeyi aç / Terminali aç"** | Faz C'ye taşınır, yalnız `explorer.exe <klasör>` ile proje klasörünü açar (C1'deki `ShellExecuteW` ile aynı kanal); terminal açma yok. | C1 |
| 5 | **Whisper modeli** | `small` (yaklaşık 466 MB, Türkçe için önerilen). Disk/RAM kısıtı varsa `base` (yaklaşık 148 MB, Türkçede daha zayıf). | B0 |
| 6 | **MurMur lisansı** | README MIT diyor, depoda LICENSE yok. Yazara LICENSE eklemesini isteyen kısa bir issue; metni Claude hazırlar, gönderim sizin onayınızla. Cevap gelmese de README'deki MIT beyanına ve atfa dayanarak uyarlama yapılır. | B4 |
| 7 | **Codex kota kaynağı** | Faz B'de kota panelinin Codex satırı `account/rateLimits/read` gerçek değerinden beslenir; diğer ajanlar mevcut önbellekten. | B2 sonrası |
| 8 | **Katmanlı rig (Faz D)** | Yapılmaz; Kapı 1'de V1 kareleri sert bulunursa açılır. Açılırsa katmanlar aynı stilde görsel üretimiyle yapılır (D1-a). | Kapı 1 sonrası |

---

## Faz E — coucou'dan çekirdek paket: çoklu-ajan kontrol katmanı (2 Eki 2026, kullanıcı onaylı)

Amaç: AFU Ada'yı görsel bir pet olmaktan çıkarıp gerçek bir çoklu-ajan kontrol katmanına dönüştürmek. Kaynak: upstream coucou (Louis-CFM/coucou), analiz `_gorev/20261002/SONUC_COUCOU_ESITLIK.md`. Öncelik (en kritik 5): **E1 genel ajan protokolü, E2 ajan pill sistemi, E3 alt ajan takibi, E4 fail-open köprü, E5 güvenli IPC**.

```
AFU ADA
 ├── Agent Protocol (Codex, Gemini, OpenCode, Claude*, gelecekteki ajanlar)
 ├── Agent Pills · Subagent Tracking · File Drop · Service Pills · Sound Events
 └── Safe Bridge (fail-open, named pipe güvenliği, hook yedek/diff, hassas log filtresi, sahte test modu)
```
\* Claude yalnız protokolde desteklenen bir ajan olarak; otomatik yedek/koordinatör DEĞİL (2 Eki kararı).

| Görev | Kapsam | Kabul ölçütü |
|---|---|---|
| **E1 Genel ajan entegrasyon protokolü** | Her ajan için ayrı entegrasyon yerine ortak olay formatı: `agent=codex|gemini|opencode|…` | Yeni ajan yalnız aynı protokole olay yazarak görünür; ana uygulamada kod değişmez (test: sahte "yeni-ajan") |
| **E1b Ortak olay standardı** | Farklı olay adları tek forma: `thinking, working, question, finished, error, rate_limit` | Codex/Gemini/OpenCode eşleme tablosu + birim test |
| **E1c Yerel generic agent API** | Named pipe/socket üzerinden basit JSON gönderen ajanı otomatik tanıma | Sahte istemci JSON gönderir → adada görünür |
| **E2 Ajan pill sistemi** | Her ajana küçük görsel kimlik (Codex, Gemini, OpenCode, Orkestra, Claude*); sık kullanılan ama çalışmayanlar "idle" kalır | Pill durumları: aktif/idle/kota/kapalı; test |
| **E3 Alt ajan takibi** | Ana ajan alt ajan başlatınca SubagentStart/SubagentStop olayları görev akışında ayrı satır | Sahte akışta başlat/bitir satırları görünür |
| **E4 Tam fail-open köprü** | AFU kapalı/çökmüş/yavaşsa ajanlar AFU yüzünden beklemez; çok kısa zaman aşımı sonrası sessiz çıkış | AFU kapalıyken ajan gecikmesi ≤ zaman aşımı (ölçülü test) |
| **E4b Güvenli hook kurulumu** | settings.json değişmeden önce otomatik yedek, kullanıcıya diff, kaldırırken yalnız AFU kayıtları silinir | Kur/kaldır döngüsü testi; yabancı kayıtlar korunur |
| **E5 Güvenli IPC** | Windows named pipe yalnız aynı kullanıcı; mesaj boyutu, zaman aşımı, bağlantı sınırları | Sınır aşımı ve başka kullanıcı reddi testleri |
| **E6 Dosyayı Ada'ya sürükleme** | Dosya AFU karakterine/adaya bırakılır → ilgili aktif ajana bağlam olarak gider | Sürükle-bırak testi (bkz. GOREV_CANLI_SURUKLE) |
| **E7 Servis pill'leri** | GitHub, Vercel, n8n, Stripe, Notion vb. küçük durum göstergeleri (GitHub ✓, Vercel Deploying, n8n Error) | Panel açıkken sorgular; kapalıyken ağ/CPU yok |
| **E7b İhtiyaç oldukça çalışma** | Servis izleyicileri yalnız panel açıkken/gerektiğinde sorgu | Panel kapalıyken sıfır istek (test) |
| **E8 Olaylara bağlı ses** | Görev başladı/tamamlandı/hata/onay bekleniyor için 5–8 kısa, ayrı ses (coucou 28 kullanıyor) | Olay→ses eşlemesi; tekrar etmeyen bildirim |
| **E9 Gizlilik odaklı log** | Tam komut, API anahtarı, tam URL, hassas payload loglanmaz; 1–5 MB sınır + rotation | Maskeleme ve rotation testleri |
| **E10 Bağımsız UI geliştirme modu** | Gerçek ajan/kota tüketmeden sahte olaylarla ada testi (fake Codex → working → permission → finished) | Tek komutla senaryo oynatılır |
| **E11 Credential Manager** | İleride API anahtarı gerekirse .env/JSON yerine Windows Credential Manager | Anahtar diske düz yazılmaz (test) |
| **E12 Web link güvenliği** | Ajan çıktısında yalnız güvenli http/https tıklanabilir; file://, özel protokol, komut benzeri link açılmaz | Link filtre testleri |

Bağımlılık: E1 → (E1b, E1c) → E2, E3 → E4, E5 → diğerleri. Soru/onay kartı (Opus, `SONUC_SORU_AKISI.md`) E1 protokolünün ilk kullanıcısıdır.

---

## Faz F — Ürün özellik listesinden kalanlar (2 Eki 2026, kullanıcı listesi)

Özet: **AfuNöbet = görevleri ve ajanları canlı izleyen, gerektiğinde kullanıcıdan onay alan, kota/ajan geçişlerini yöneten ve bütün teknik karmaşıklığı sade bir AFU karakteri üzerinden sunan masaüstü kontrol merkezi.**
Ana ekran hedefi: yalnız **Afu karakteri + "Afu'ya sor" + aktif görev + aktif ajan + kota/durum**; ayrıntı tıklanınca açılır.
Önceki fazlarda karşılığı olmayan maddeler:

| Görev | Kapsam | Kabul ölçütü |
|---|---|---|
| **F1 Görev akışı aşamaları** | `TRIAGE → SPLIT → RUN → VERIFY → MERGE` aşamaları görev kartında küçük adım çubuğu | state.json'daki aşama alanından; alan yoksa gizli; test |
| **F2 Ajan devri gösterimi** | Kota/hata/duraklamada görev başka ajana geçtiyse sebebiyle: "Codex kotası doldu → Gemini devraldı" ya da "→ bekliyor" | Claude otomatik yedek DEĞİL (2 Eki kararı); yalnız elle seçilirse görünür |
| **F3 Model bilgisi** | Aktif model + gerektiğinde thinking/effort küçük bilgi alanında | AfuNöbet status MODEL/NOBET satırından; okunamazsa "?" |
| **F4 Context göstergesi** | Kullanılan/kalan context, cache, saved — ayrıntı görünümünde | Ana ekranda yok; sağlayıcı vermezse gizli |
| **F5 Maliyet bilgisi** | Sağlayıcı destekliyorsa kullanım maliyeti, ayrıntı görünümünde | Uydurma sayı yok; yoksa gizli |
| **F6 Tray tam menü** | Tepsiden aç, gizle, durum gör, çıkış | 4 eylem de tek tıkla çalışır |
| **F7 Arama ve filtre** | Çok görevde ajan/durum/ad filtresi | 10+ görevde görünür; test |
| **F8 Uzun metin kontrolü** | Uzun görev adı kırpılır + tooltip/detay | Taşma testi |
| **F9 Empty state** | Görev yokken anlaşılır başlangıç görünümü ("Afu hazır…") | Görsel test |
| **F10 Tekrar dene** | Offline/bağlantı/geçici hatada gerçekten çalışan "Tekrar dene" | Hata simülasyonu testi |
| **F11 Modal sistemi** | X, Esc, backdrop, odak; pencere kilitlenmez | Klavye+fare testleri |
| **F12 Klavye erişilebilirliği** | Temel işlemler (aç, sekme, düğmeler, kapat) mouse olmadan | Tab/Enter/Esc testleri |
| **F13 TR/EN dayanıklılığı** | Dil değişiminde ve uzun çeviride arayüz bozulmaz | EN metinlerle taşma testi |
| **F14 Ekran ölçekleme** | 1280×720 @ %150 ve metin ölçeği %132'de kritik düğmeler erişilebilir | DPI/ölçek testleri (hit.ts ile uyumlu) |
| **F15 İlk kullanım ipucu** | Yalnız ilk açılışta kısa yönlendirme, bir daha gösterilmez | Ayar bayrağı testi |
| **F16 Bildirim sistemi** | Yalnız önemli olaylar: tamamlandı, hata, kota doldu, cevap gerekiyor; tekrar etmez | Olay→bildirim eşlemesi (E8 ses ile birlikte) |
| **F17 Otomatik toparlanma** | Eksik izin/servis/bağlantı mümkünse kendiliğinden çözülür; teknik ayrıntı gösterilmez | Yeniden bağlanma testi |
| **F18 İnsan onay kapısı** | Silme, force push, yayın, güvenlik, geri dönüşü zor işlemler onaysız ilerlemez | Soru kartı (SORU_SOZLESMESI) üzerinden; test |
| **F19 "Afu'ya sor" tek ana düğme + yerel durum cevapları** | Sohbet + bas-konuş tek yerde; "Codex ne yapıyor?" gibi sorular state'ten, model çağrısız | Yerel soru kalıpları testi |
