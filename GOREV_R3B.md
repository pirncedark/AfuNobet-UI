# GOREV R3B (R3'ün 2. parçası)
Ana görev: GOREV_R3_MESAJ_PET_BICIMI.md. R3A bitti (SONUC_R3A.md oku; windows/src/message/bicim.ts hazır).
Bu parçada "Davranış 2, 3, 4, 5" maddelerini yap: pet modunda balonda temiz mesaj, soru ise seçenek/cevap bekleme, bildirim sekmelerle çakışmasın.
Kurallar ana görevdeki gibi. Doğrula: pytest -q tests ; windows içinde tsc + vitest ; src-tauri içinde cargo test --offline → 0 fail.
Sonuç: SONUC_R3.md ilk satır "SONUC: TAMAM - ..." ya da "SONUC: YARIM - neden".
