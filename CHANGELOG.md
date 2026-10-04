# Changes


## 1.0.3 — 2026-10-04

Secret masking now recognises Google keys and other long secrets, so a key pasted into an agent never shows up as a task title.
Gizli bilgi maskesi artık Google anahtarlarını ve diğer uzun gizli dizeleri tanıyor; bir ajana yapıştırılan anahtar görev başlığı olarak görünmez.

### Fixed
- **Google API keys were shown as task titles:** A Gemini API key pasted into the Gemini CLI prompt appeared in the island as the task title, because the mask only knew OpenAI/GitHub/Slack/AWS formats. The mask (Rust core and Python bridge) now also covers `AIza…` and `AQ.…` Google keys, `ya29.…` Google access tokens, `4/0A…` Google sign-in codes, `hf_` (Hugging Face), `glpat-` (GitLab) and `sk_` (Stripe).
- **Unknown secret formats:** Any single word of 32+ characters that mixes upper case, lower case and digits (and has no `/`) is now masked too. Commit hashes and file paths are not affected. A masked prompt is never used as a task title.

### Düzeltildi
- **Google API anahtarları görev başlığı olarak görünüyordu:** Gemini CLI'ye yapıştırılan bir Gemini API anahtarı adada görev başlığı olarak çıktı, çünkü maske yalnız OpenAI/GitHub/Slack/AWS biçimlerini tanıyordu. Maske (Rust çekirdeği ve Python köprüsü) artık `AIza…` ve `AQ.…` Google anahtarlarını, `ya29.…` Google erişim belirteçlerini, `4/0A…` Google giriş kodlarını, `hf_` (Hugging Face), `glpat-` (GitLab) ve `sk_` (Stripe) öneklerini de kapsıyor.
- **Bilinmeyen gizli bilgi biçimleri:** Büyük harf, küçük harf ve rakamı birlikte içeren, `/` içermeyen 32+ karakterlik tek parça dizeler de artık maskelenir. Commit karmaları ve dosya yolları etkilenmez. Maskelenen bir istem asla görev başlığı yapılmaz.

## 1.0.2 — 2026-10-04

Smaller mini pet that keeps the same size in every animation, a portable download, and a clean-up of leftover upstream names.
Daha küçük ve her animasyonda aynı boyda kalan mini pet, taşınabilir (portable) indirme ve eski upstream adlarının temizliği.

### Added
- **Portable download:** Each release now ships a setup installer and a portable `.zip` (no installation; unzip and run `afunobet-ui.exe`).
- **Test:** `tests/mascot_size.test.ts` checks that every frame the pet can show has a measured head size, renders at that size and fits the window without shrinking.

### Changed
- **Mini pet is half the size:** Afu's head on the desktop is now about 72 px instead of about 145 px.
- **Same size in every animation:** The source frames draw Afu at different scales (bust or full body). Each frame used to be fitted to the same visible height, so the head jumped between about 35 px and 220 px from one animation to the next. Every frame now has a measured head width (`PET_KAFA` in `windows/src/afu/pet.ts`) and is drawn at the same head size, including while dragging.
- **No upstream names left:** The `GOREV_COUCOU_*` task files are now `GOREV_AFU_*` (`GOREV_AFU_TEMEL.md` holds the base rules), the build output is `afunobet-ui.exe`, and issue templates, docs and package metadata refer only to AfuNobet UI. The MIT copyright notice in `LICENSE` is kept, as the license requires.

### Eklendi
- **Taşınabilir indirme:** Her sürümde artık bir kurulum dosyası ve kurulum gerektirmeyen bir `.zip` var (zip'i aç, `afunobet-ui.exe`'yi çalıştır).
- **Test:** `tests/mascot_size.test.ts`, petin gösterebileceği her karenin ölçülmüş bir kafa boyu olduğunu, o boyda çizildiğini ve küçülmeden pencereye sığdığını denetler.

### Değişti
- **Mini pet yarı boyda:** Afu'nun masaüstündeki kafası yaklaşık 145 px yerine yaklaşık 72 px.
- **Her animasyonda aynı boy:** Kaynak karelerde Afu farklı ölçeklerde (büst ya da tam boy) çizilmiş. Önceden her kare aynı görünür yüksekliğe sığdırıldığı için kafa bir animasyondan ötekine yaklaşık 35 px ile 220 px arasında değişiyordu. Artık her karenin ölçülmüş kafa genişliği var (`windows/src/afu/pet.ts` içinde `PET_KAFA`) ve sürüklerken de dahil hepsi aynı kafa boyunda çizilir.
- **Upstream adları kalmadı:** `GOREV_COUCOU_*` görev dosyaları artık `GOREV_AFU_*` (temel kurallar `GOREV_AFU_TEMEL.md` içinde), derleme çıktısı `afunobet-ui.exe`; hata şablonları, belgeler ve paket bilgileri yalnız AfuNobet UI'yi anar. MIT lisansının şartı olduğu için `LICENSE` içindeki telif bildirimi korunur.

## 1.0.1 — 2026-10-04

Makes AfuNobet UI work on a computer other than the original developer's.
AfuNobet UI'nin asıl geliştiricinin bilgisayarı dışında da çalışmasını sağlar.

### Added
- **Claude Code sessions in the island:** Main sessions arriving over the agent pipe (e.g. from Claude Code hooks via `scripts/afu_ajan_koprusu.py`) are listed as read-only tasks. Claude is still never given work; the KORUNUYOR badge stays.
- **New README (English and Turkish):** what the app does, how it works, project structure, new-PC setup, Claude Code hooks, privacy, plus animated GIFs (`docs/media`).
- **Update script:** `scripts/gorev-cubugu-guncelle.ps1` builds, backs up the previous exe and installs the new one to a fixed location for a pinned taskbar shortcut (`-GeriAl` rolls back).

### Fixed
- **Portable data folder:** The default `state.json` location no longer points to one developer's user folder. An existing `Desktop\afuproject\AfuNobet` is kept; otherwise `%LOCALAPPDATA%\AfuNobet` is used (Rust and Python bridges).
- **Voice cancel with Python launchers:** Cancelling Afu voice now stops the whole worker tree and clears a stale GPU lock. Store/install-manager `python.exe` and venv redirectors start the real interpreter as a child, which previously kept running.
- **False "changed" signals:** Writing any file in a watched folder bumped the folder timestamp and woke the app-status watcher; folder timestamp events are now ignored.
- **Claude health pill:** The status panel showed "Claude ✗" when the hook used `afu_ajan_koprusu.py`; it is now recognised.
- **Session titles:** A tool name (e.g. "Edit") no longer replaces the task title taken from the user's prompt; it only fills an empty title.

### Eklendi
- **Adada Claude Code oturumları:** Ajan borusundan gelen ana oturumlar (ör. `scripts/afu_ajan_koprusu.py` ile Claude Code kancalarından) salt okunur görev olarak listelenir. Claude'a yine iş verilmez; KORUNUYOR rozeti kalır.
- **Yeni README (İngilizce ve Türkçe):** ne işe yaradığı, nasıl çalıştığı, proje yapısı, yeni bilgisayar kurulumu, Claude Code kancaları, gizlilik ve hareketli GIF'ler (`docs/media`).
- **Güncelleme betiği:** `scripts/gorev-cubugu-guncelle.ps1` derler, önceki exe'yi yedekler ve yenisini sabitlenmiş görev çubuğu kısayolu için sabit konuma kurar (`-GeriAl` geri alır).

### Düzeltildi
- **Taşınabilir veri klasörü:** Varsayılan `state.json` yeri artık tek bir geliştiricinin kullanıcı klasörünü göstermiyor. Mevcut `Desktop\afuproject\AfuNobet` korunur; yoksa `%LOCALAPPDATA%\AfuNobet` kullanılır (Rust ve Python köprüleri).
- **Python başlatıcılarıyla ses iptali:** Afu sesi iptal edilince işçi ağacının tamamı durur ve kalan GPU kilidi temizlenir. Store/yükleme yöneticisi `python.exe` ve venv yönlendiricileri asıl yorumlayıcıyı alt süreç olarak başlatır; önceden o süreç çalışmaya devam ediyordu.
- **Sahte "değişti" sinyalleri:** İzlenen klasöre herhangi bir dosya yazmak klasör zaman damgasını değiştirip uygulama durum izleyicisini uyandırıyordu; klasör zaman damgası olayları artık yok sayılır.
- **Claude sağlık rozeti:** Kanca `afu_ajan_koprusu.py` kullanınca durum panelinde "Claude ✗" görünüyordu; artık tanınır.
- **Oturum başlıkları:** Araç adı (ör. "Edit") kullanıcının isteminden gelen görev başlığının yerine geçmez; yalnız boş başlığı doldurur.


## Unreleased

### Added
- **General Agent Protocol & Standard Events:** Unified bilingual event format (`agent`/`ajan`, `event`/`olay`) and common state events (`thinking`, `working`, `question`, `finished`, `error`, `rate_limit`) across Codex, Gemini, OpenCode, and local subagents.
- **Subagent Tracking:** Real-time visibility of subagents directly within the status island.
- **Service Pills & GitHub Status:** Real-time service status pills including GitHub integration with on-demand HTTPS queries.
- **Drag-and-Drop Attachment:** Direct file attachment to the active agent by dragging and dropping onto the character island.
- **Full System Tray Menu:** Right-click context menu offering Pause, Show/Hide Mini Pet, Open, and Exit options.
- **First Run Guide:** Concise onboarding tip shown only on the first application launch.
- **Notification & Audio Feedback:** Event-driven sound effects for task completion, errors, and approvals, integrated with Windows notifications.
- **Human Approval Gate:** Interactive question card for approving critical and destructive agent actions.
- **Taskbar Mini Pet Mode:** Smooth glide transition to the taskbar on minimize or Escape, with reactive animations, sleep cycle, and hover actions.
- **Credential Security & Safe Web Links:** Windows Credential Manager integration and strict HTTPS-only link safety.

### Fixed
- **IPC Cleanup:** Resolved named pipe `FlushFileBuffers` hang during client disconnects.
- **Window Interaction:** Polished click-through transparency and non-stealing focus behavior on Windows.
## 0.1.1 AfuNobet adaptation

Read-only Afu task snapshots replace all upstream integrations and model hooks.
The official reference cutouts replace the upstream character and media.
Island geometry and animation primitives are retained; detailed verification
and native test limitations are recorded in AFU_CHANGES.md.

