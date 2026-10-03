# Changes


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

