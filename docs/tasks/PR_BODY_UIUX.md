## Problem and change
The panel could disappear after its first opening, return slowly from the pet, clip its controls when content grew, and display inconsistent mascot sizes. Restore top-edge hover wake-up and return to the mini pet when the pointer leaves. Reduce return timing from750ms to240ms. Measure natural content height, constrain the card to the native viewport, keep footer actions visible, and normalize mascot size across DPI scales.

## Validation
Full frontend, Rust and Python suites; real Chromium native-branch layout tests with short/long apps and chat content, four widths, and a native/WebView DPI mismatch;60 preview screenshot combinations. Exact results are recorded in SONUC_UIUX_FIX.md. Real Windows/WebView2 interaction remains unverified. EXE artifacts and local test screenshots are excluded from this source change.
