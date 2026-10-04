# AfuNobet UI V1 implementation

Specification: GOREV_COUCOU_AFU.md and AfuNobet/docs/UI_SOZLESME.md.
The user requested implementation of this supplied design, without commits.

- [ ] Preserve src-tauri/src/island.rs byte for byte and the upstream spring/close animation primitives.
- [ ] Replace all action, integration and hook plumbing with an allowlisted read-only state snapshot and directory change events. Missing or malformed files clear the UI to Baglanti bekleniyor. Atomic file replacement and late creation must work without polling.
- [ ] Cut six transparent mascot assets from the supplied reference, keep original RGB pixels, generate inspection sheet and Afu app/tray icons.
- [ ] Adapt the existing hidden → petit → home state machine, greeting, geometry and hit testing to Afu DOM images. Park animation frames when geometry settles; animate images and agent pills with CSS.
- [ ] Show one main task, four other rows and +N, recorded progress only, agent pills, locked Claude badge, a second-level quota panel and one-time orientation.
- [ ] Remove upstream character, audio, macOS app, integration/chat/upload code, legacy media and release hooks. Document attribution and preserved files.
- [ ] Run contract/FSM tests, TypeScript build, Cargo tests and headless screenshots of seven states; build offline executable and publish its SHA256 locally.

Review focus: technical/secret strings, false quota pauses on completed work, malformed snapshots, atomic replacements, startup event/read races, hidden CPU, stale task focus and bounds inside the fixed 720×320 transparent window.
