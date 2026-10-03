SONUC: YARIM - 3 maddenin testleri yesil ama EXE A icin eski; ayrica baska seriden gelen 1 vitest hatasi ve 3 pytest hatasi var.

# DOGRULA_KALAN — 2026-10-03 13:39

Yalniz dogrulama yapildi. Kod DEGISTIRILMEDI. EXE derlenmedi. Commit/push yapilmadi.

## Madde satirlari (istenen bicim)

- **A: YESIL** — testler: `notifications.test.ts` (15), `queue.test.ts` (1), `message_flow.test.ts` (2), `mesaj.test.ts` (17), `question.test.ts` (10), `pet-bildirim-sekme.test.ts` (1) = **6 dosya, 43 test, 0 kirmizi**. Kaynak kanit: `windows/src/sistem.ts:34` "Mesaj gelince öne gel", `windows/src/core/settings.ts` varsayilan acik, `windows/src/message/notifications.ts` 8000 ms + `setAlwaysOnTop`. Koruma: `island.rs` SHA256 `5f2f4588…71b57`, SONUC_R1.md ile ayni, `git status` temiz. **exe: YENI GEREK** (en yeni kaynak `message/message.ts` 13:37 > exe 12:20)
- **B: YESIL** — testler: `chat.test.ts` (36), `afu_voice.test.ts` (4), `voice.test.ts` (12), `sor_ui.test.ts` (8) = **4 dosya, 60 test, 0 kirmizi**. `SONUC_BAS_KONUS.md`in bahsettiği vitest kirmizilari **YOK**. Kaynak kanit: `chat/chat.ts:39` "Codex'e giriş yap", `:40` "Çıkış yap", `:43` `advancedMenu` "Daha fazla", `:87` `refresh()` + "Codex kurulu değil. Kurmak için dokun.", `core/bridge.ts:29` `codex_install`, `src-tauri/src/codex.rs` + `lib.rs` komutu. **exe: var** (en yeni kaynak `chat/chat.ts` 09:57 < exe 12:20)
- **C: YESIL** — testler: `cargo test --offline voice` 2 hedef × 32 gecti 1 atlandi (0 kirmizi); `python -B ses_deneme/test_sohbet.py` 17 OK; `python -B ses_deneme/test_uygulama.py` 6 OK; TS ses tarafi B icinde 60 test ile yesil. **exe: var** (en yeni kaynak `chat/chat.css` 10:20 < exe 12:20)

## Tam dogrulama (hepsi 0 fail olmaliydi)

| Kontrol | Sonuc | Kanit |
| --- | --- | --- |
| `windows/` `npx tsc --noEmit` | cikis 0, 0 hata | `log/dk_tsc.log` |
| `windows/` `vitest run tests` | 53 dosya, **716 test gecti**, 0 test hatasi; **1 collector hatasi** | `log/dk_vitest_tum.log` |
| `windows/src-tauri/` `cargo test --offline` | cikis 0, 247 gecti, 0 kirmizi, 4 atlandi | `log/dk_cargo_tum.log` |
| kok `python -m pytest -q tests` | 294 gecti, **3 kirmizi** | `log/dk_pytest_tum.log` |

## Kirmizilar — BASKA SERIDEN, A/B/C DEGIL, DUZELTILMEDI

1. **vitest collector hatasi**: `windows/tests/r3b1.test.ts` (13:36, baska terminalde yeni yazildi) `@vitest-environment happy-dom` istiyor; `happy-dom`/`jsdom` `windows/node_modules` altinda **yok** ve `package.json`da da yok. Bu dosya hic calismiyor. Kapsam disi — R3B1'in.
2. **pytest `test_feature_source_regression_contract[04-Premium karakter görünümü]`**: sozlesme `windows/styles.css` icinde `--pet-brightness:1.03` ariyor, yok. PREMIUM_GORUNUM isinin sonucu.
3. **pytest `test_task_scope_exactly_matches_requested_feature_union`**: `docs/kanit/ozellik/inventory.json` sayfa listesinden geride kalmis. E2_PILL / SAYFA_ESKI5 islerinin sonucu.
4. **pytest `test_sources_outside_authorized_r1_scope_including_island_are_byte_identical`**: kapsam disi sayim iki yeni sey goruyor — 16 adet `windows/src/**/*.rej` dosyasi (13:33, R3B patch reddi kalintisi) ve `windows/src/core/ajan_kimlik.ts`. `.rej` iceriklerinin ayni satirlari kaynak dosyalarda **zaten var** (orn. `chat.ts:39-43`, `bridge.ts:29`) — yani eksik kod degil, atilmis patch artigi. Bunlar silinmeli (R3B sahibinin isi).

## EXE

- `dist/afunobet-ui-yeni.exe` 12:20, 34.551.808 bayt, SHA256 `b6e768dd1d3b11964f232aabae63506f386ef567bf1b33554af5705dea109fe5` — `dist/SHA256SUMS.txt` ve `dist/build-manifest.json` ile ayni.
- **A icin yeni EXE gerek**: R1/R3 kaynaklarinin hepsi 12:20'den sonra degisti (`bildirim.rs` 12:29, `questions.rs` 12:35, `core/state.ts` 12:28, `sistem.ts` 12:29, `core/settings.ts` 12:27, `queue.ts` 12:27, `island/fsm.ts` 12:49, `question.ts` 12:54, `bicim.ts` 13:09, `notifications.ts` 13:20, `island/island.ts` 13:21, `message/message.ts` 13:37).
- B ve C icin exe yeterli.

## Kapsam disi birakilanlar

- Gercek Windows masaustu kabulu (pencere odagi, mikrofon, hoparlor, DPI) — bu turda **gorulmedi**, otomatik testlerle dogrulanamaz; kullanicinin kendi bilgisayarinda denemesi lazim.
- `dist/afunobet-ui-coucou.exe` (02:02) eski; gecerli teslim `afunobet-ui-yeni.exe`.
- `windows/patch.diff` (0 bayt) ve `windows/src/**/*.rej` dosyalari duruyor.

Gunluk: `_gorev/2026-10-03/log/dogrula_kalan.log` (+ `dk_*.log`).
