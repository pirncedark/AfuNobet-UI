# Q5: Sahte test modu uygulamaya bağlansın (E10)
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakika. Exe YOK, git YOK, görünür pencere YOK, island.rs DEĞİŞMEZ, görsel/ses dosyası YOK. Düzenlemeden önce dosyayı yeniden oku; önceki işlerin değişikliklerini silme. TAMAM yazmadan önce: cd windows; node node_modules/typescript/bin/tsc --noEmit; npm test — çıktının son satırlarını SONUC dosyasına AYNEN yapıştır. Okuduktan sonra DURMA.
Sonuç: SONUC_Q5.md
- scripts/sahte_olay.py senaryoları (codex_soru, gemini_kota, hata, bayat) bir test klasörüne state.json/sorular yazıyor; uygulama AFUNOBET_UI_STATE / AFUNOBET_SORU_DIZINI ortam değişkeniyle o klasörü okuyabilsin (zaten destekliyorsa doğrula). docs/SAHTE_TEST_MODU.md'ye tek komutluk kullanım: "sahte modda aç" (ps1 betiği: ortam değişkenleri + exe; pencere açması kullanıcının isteğiyle).
- pytest/vitest: her senaryo üretilen dosyayı adanın ayrıştırıcısı doğru okur.
