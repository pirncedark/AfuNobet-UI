# AfuNobet-UI project guidance

Read GOREV_COUCOU_AFU.md and AFU_CHANGES.md before editing.
Keep windows/src-tauri/src/island.rs unchanged except for the user-authorized top-edge wake fix recorded in docs/kanit/edge_wake_authorized_patch.json. Preserve the historical recovery baseline and require the exact audited patch hash plus native edge regression tests.
The application only reads AfuNobet state.json via directory events.
Do not add model APIs, hook installation, process control (exception: AfuNöbet CLI windowless for Orkestra), uploads or secrets.
Claude appears only as the locked Claude KORUNUYOR badge.
Use existing offline dependencies, headless tests and no visible windows.

Exception (user-approved 2026-10-02): agent question flow reads <AfuNobet>/sorular/*.json and writes only cevaplar/<id>.json (docs/SORU_SOZLESMESI.md); for codex/gemini/opencode only.
Exception (user-approved 2026-10-03): Claude Code hook is allowed ONLY for notification/question bridge (Afu reads messages and answers questions). Claude automatic task execution remains FORBIDDEN (KORUNUYOR badge stays).
