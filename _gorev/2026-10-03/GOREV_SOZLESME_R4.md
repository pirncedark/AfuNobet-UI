# GOREV: 3 kirmizi sozlesme testini yeni yetkili islere gore guncelle (R4)

Calisma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Log: _gorev/2026-10-03/log/gemini_sozlesme_r4.log

Bugun iki yetkili is bitti ve kodu degistirdi:
- E2 pill + ajan devri (SONUC: _gorev/2026-10-03/SONUC_E2_PILL_DEVIR.md): windows/src/core/ajan_kimlik.ts (YENI), windows/src/views/model.ts, windows/src/views/views.ts, scripts/sahte_olay.py, windows/tests/e2_pill_devir.test.ts
- Premium gorunum (SONUC: _gorev/2026-10-03/SONUC_PREMIUM_GORUNUM.md): windows/src/style.css, windows/src/afu/character.ts, windows/src/island/island.ts, windows/tests/premium.test.ts

Kirmizi testler (python -m pytest -q tests):
1. tests/test_tum_ozellik_kapsam.py::test_feature_source_regression_contract[04-Premium karakter gorunumu] — "--pet-brightness:1.03" ariyor, kaynakta "--pet-brightness: 1.03". Sozlesme belirtecini yeni gercek koda gore guncelle (anlami koruyarak: premium degiskenleri + durum siniflari var mi).
2. tests/test_tum_ozellik_sozlesme.py::test_task_scope_exactly_matches_requested_feature_union — docs/kanit/tum_test/inventory.json (ya da EVIDENCE klasorundeki) envanteri, takip sayfasinda "ok"/"build" olacak maddelerle eslesmeli. Sayfada su maddeler yakinda "ok" olacak, envantere ekle (mevcut kayit bicimini kopyala, kanit = SONUC dosyasi + test dosyasi): "E2 Ajan pill sistemi", "Ajan devri gosterimi", "Codex ile giris + bas-konus", "Bas-konus ve ses". Sayfa dosyasi docs/kanit/ozellik/ozellikler.html — ICINDE F dizisindeki bu 4 satirin durumunu "ok" yap (baska satira dokunma), sonra test yesil olsun.
3. tests/test_tum_ozellik_sozlesme.py::test_sources_outside_authorized_r1_scope_including_island_are_byte_identical — R3'un yaptigi gibi AYRI bir yetki dosyasi olustur: docs/kanit/r4_source_hashes.json (yukaridaki E2 + premium kaynak dosyalarinin guncel sha256 i). Testi R4 kumesini de kabul edecek sekilde genislet. Gecmis kanit dosyalarini (source_hashes.json, r3_source_hashes.json) DEGISTIRME. island.ts hem R3 hem R4 kapsaminda: R3 kilidi island.ts hash ini sabitliyorsa, island.ts icin R4 hash i gecerli olsun (R4 daha yeni yetki) ve bunu test yorumuna yaz.

Kurallar:
- Uygulama kodunu (windows/src) DEGISTIRME; yalniz tests/, docs/kanit/ ve sayfa satirlari.
- Baska bir terminal R3B (windows/src/message/*, question/*) uzerinde calisiyor; dokunma.
- Bitince: python -m pytest -q tests → 0 fail; windows icinde npx vitest run → 0 fail.

SONUC: _gorev/2026-10-03/SONUC_SOZLESME_R4.md ilk satir `SONUC: TAMAM - pytest X gecti` ya da `SONUC: YARIM - neden`.
