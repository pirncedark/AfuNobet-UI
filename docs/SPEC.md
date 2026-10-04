# AfuNobet UI V1

The implementation follows GOREV_AFU_TEMEL.md and the read-only published
snapshot schema in AfuNobet/docs/UI_SOZLESME.md.

The native window remains a transparent 720×320 always-on-top island centered
at the display top. Hidden mode collapses it to a 240×6 wake strip. The logical
states remain hidden → petit → home; upstream greeting timing is retained under
the neutral greeting name. Spring expansion and 340ms eased collapse use the
original core/anim.ts.

One main task is followed by three compact secondary rows and +N remaining.
Four agent pills select existing records; Claude has no task/action entry.
Quota information is one level below the main view. Character expressions are
compositions of supplied transparent cutouts and separate effects.

The Rust watcher listens to directory events and retains the last valid
allowlisted snapshot during invalid publications. The frontend independently
filters labels and always renders external text as textContent.

