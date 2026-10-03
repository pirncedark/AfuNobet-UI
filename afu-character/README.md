# Official Afu cutouts

All character PNG files come exclusively from `REFERANS.png`, the official
reference supplied for this task. No character was drawn, regenerated or
recoloured. Opaque output pixels retain the exact source RGB values.

Run `python scripts/cut-afu.py` from the repository root to reproduce the assets,
the public copies, the app/tray icons and `cut-control.png`. The script uses the
already available Pillow, NumPy and SciPy packages and does not download anything.
`crop-manifest.json` records the source SHA256, source rectangles and trimmed bounds.

The cuts use neutral-background segmentation, a largest-component flood fill,
enclosed-hole filling and explicit sole contours to remove connected floor shadows.
The mini portrait also uses a silhouette limit to remove its decorative tile.
Labels, punctuation, decorative stars and the mock application are outside the
character cuts. `question.svg`, `exclamation.svg` and `sparkle.svg` contain only
independent effects, never character artwork.

The six PNG files have transparent backgrounds. `cut-control.png` shows them on a
checkerboard for inspection. The source is a flattened sheet rather than a layered
master; a binary alpha mask deliberately preserves source colours instead of
repainting edge pixels. Small app/tray icons use Lanczos scaling with alpha.

The reference bust portraits retain their original lower cut line. No missing
body parts or new expressions were invented. Idle and working use `front.png`,
waiting uses `thinking.png`, paused/error uses `alert.png` or `thinking.png`, and
success uses `happy.png` with separate effects.

The official reference was user supplied; its upstream ownership/licensing was
not independently documented. These assets are not asserted to inherit the
Coucou source code MIT licence.
