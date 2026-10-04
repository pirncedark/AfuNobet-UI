# Yetkilendirilmiş edge-wake kaynak sözleşmesi

Eski kurtarma manifesti değiştirilmedi. tests/test_tum_ozellik_sozlesme.py içindeki island.rs testi yeniden adlandırıldı ve geçmiş baseline ya da docs/kanit/edge_wake_authorized_patch.json içindeki tam, LF-normalize edilmiş yetkili hash'i kabul ediyor.

Yetki manifesti kapsamı yalnız windows/src-tauri/src/island.rs. Test manifest anahtarlarını, tek dosya kapsamını, tarihi, açık kullanıcı bugfix gerekçesini, hash normalizasyonunu ve SHA256 biçimini kontrol ediyor. historicalBaselineHash hem değiştirilmemiş kurtarma manifestiyle hem testte sabit geçmiş hash ile karşılaştırılıyor. Yetkili hash tarihsel hash'ten farklı olmalı. Kaynakta sonraki herhangi bir değişiklik hash kapısını yeniden kırar.

Gerçek komut: python -m pytest -q tests/test_tum_ozellik_sozlesme.py -k island_rs
Çıkış kodu 0:
```text
.                                                                        [100%]
1 passed, 17 deselected in 0.07s
```

Bu test kaynak yetkisi/bütünlüğü sözleşmesidir; Windows davranış testi değildir. Edge geometri/giriş/sürükleme/liveness Rust davranış testleri SONUC_EDGE_BACKEND.md içinde kayıtlıdır. Tam pytest tekrarını root çalıştıracak. CLAUDE.md ve eski hash manifestine dokunulmadı. Commit/push yok.
