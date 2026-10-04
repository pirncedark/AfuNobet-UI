# Changes


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

