# AfuNobet-UI project guidance

Read GOREV_COUCOU_AFU.md and AFU_CHANGES.md before editing.
Keep windows/src-tauri/src/island.rs byte-for-byte unchanged.
The application only reads AfuNobet state.json via directory events.
Do not add model APIs, hook installation, process control (exception: AfuNöbet CLI windowless for Orkestra), uploads or secrets.
Claude appears only as the locked Claude KORUNUYOR badge.
Use existing offline dependencies, headless tests and no visible windows.

Exception (user-approved 2026-10-02): agent question flow reads <AfuNobet>/sorular/*.json and writes only cevaplar/<id>.json (docs/SORU_SOZLESMESI.md); for codex/gemini/opencode only, no Claude Code hook.
