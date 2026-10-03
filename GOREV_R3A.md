# GOREV R3A (R3'ün 1. parçası, ~8 dk)
Ana görev: GOREV_R3_MESAJ_PET_BICIMI.md. Bu parçada YALNIZ şunları yap:
- "## 0." maddesi: notifications.ts pencere durumunu geri yükleme düzeltmesi + vitest.
- "Davranış 1": saf dönüştürücü fonksiyon (yeni dosya windows/src/message/bicim.ts) + vitest (ekran görüntüsü örneği dahil).
Not: önceki Codex turu zaman aşımına uğradı; ağaçta yarım değişiklik olabilir. Önce windows içinde npx tsc --noEmit ve npx vitest run koş, kırık varsa önce onu düzelt.
Kurallar ana görevdeki gibi (island.rs değişmez, git/exe yok, görünür pencere yok).
Doğrula: windows içinde npx tsc --noEmit ; npx vitest run → 0 fail.
Sonuç: SONUC_R3A.md ilk satır "SONUC: TAMAM - vitest X gecti" ya da "SONUC: YARIM - neden".
