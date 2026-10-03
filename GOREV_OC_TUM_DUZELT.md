# GOREV: OC_TUM_TEST sonrası 2 KALDI düzeltmesi (yalnız test + takip sayfası)

Bağlam: docs/kanit/tum_test/rapor.md 2 KALDI + 5 başarısız pytest verdi. İkisi de yanlış iddia/yanlış test; ürün koduna DOKUNMA.

1. Orkestra "Codex kilidi" bulgusu YANLIŞ. CLAUDE.md yalnız CLAUDE için otomatik görev yürütmeyi yasaklar; Codex/Gemini/OpenCode'a Orkestra'dan iş vermek İZİNLİ ve beklenen davranış. tests/test_tum_ozellik_sozlesme.py içindeki Codex kilidi testini kaldır ya da tersine çevir (Claude hedefi reddedilir, codex/gemini/opencode kabul edilir).
2. E7 servis pill'leri: proje kuralı token/secret/upload yasaklıyor, bu yüzden Vercel/n8n/Stripe/Notion EKLENMEYECEK. Kabul testlerini gerçek kapsama (yalnız GitHub) göre düzelt. docs/kanit/ozellik/ozellikler.html içindeki E7 metnini "GitHub (diğer servisler proje kuralı gereği yok)" olacak şekilde gerçeğe uydur; yeşil kalsın.
3. docs/kanit/tum_test/rapor.md içinde bu iki satırı GEÇTİ olarak güncelle, not sütununa düzeltme gerekçesini tek cümle yaz; sonuç dağılımını yeniden say.
4. Doğrula: python -m pytest -q tests (KOK'te) 0 fail; windows içinde npx tsc --noEmit ve npx vitest run yeşil.

Yasak: windows/src ve windows/src-tauri/src kaynak dosyaları değişmez (island.rs dahil). Git yok, pencere yok, exe yok.
Sonuç: SONUC_OC_TUM_DUZELT.md — ilk satır "SONUC: TAMAM - pytest X gecti 0 kaldi" ya da "SONUC: YARIM - neden".
Log: _gorev/2026-10-03/log/codex_oc_tum_duzelt.log (zaman damgalı ADIM/HATA/SON).
