# GÖREV: Afu ses sohbeti — gerçek e2e testinde çıkan hataları düzelt

Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI. Kurallar GOREV_SES_PLAN.md ile aynı (yalnız ses_deneme/, ses_adaylari/ dokunma, commit yok, ücretli API yok).

Claude normal terminalde `dogrula_e2e.py`'yi koştu (2 Eki 13:51). Kanıt: `ses_deneme/cikti/e2e.json`.
GEÇTİ: gerçek Codex login thread'i, 2. mesaj bağlamı (özel sözcük hatırlandı), yeniden açılışta aynı thread.
KALDI:
1. **Kod okundu** (`code_cleanup_verified=false`): karakter talimatı "kod bloğu yok" dediği için Codex kodu ``` çitsiz düz satırlarla yazdı; temizleyici yakalamadı ve `def ... return` seslendirildi. Düzelt: (a) karakter.md: kod gerekiyorsa EKRAN için normal ``` kod bloğu kullan, sesli kısım düz Türkçe cümle olsun; markdown yasağı yalnız konuşma cümleleri için. (b) Temizleyici çitsiz kodu da yakalasın (def/class/import/if..:/return/{ } ; = gibi satır sezgisi, girinti), ham bağlantılar, yollar, hash/kimlik benzeri harf+rakam karışık uzun belirteçler (örn. afu92e5c46319) seslendirmeden çıksın/“ekrandaki kod” gibi kısa söze dönsün.
2. **Uzun metin bozuldu** (WER 0.73) ve kısa metin kimlik belirtecinden sonra uydurma tekrara girdi (WER 3.0, "Hacibet Hesed..." döngüsü; Chatterbox token_repetition/forcing EOS uyarısı). Düzelt: seslendirmeyi cümle/≈200 karakter parçalarına böl, her parçayı ayrı üret, kısa duraklamayla birleştir; parça Whisper'ı/süre oranı aşırıysa (karakter başına süre veya tekrar) o parçayı bir kez yeniden üret. Seslendirmeden önce rakam/kısaltmaları Türkçe okunur hale getir veya at.
3. Her düzeltme için test_sohbet.py'ye test ekle (çitsiz kod, kimlik belirteci, parçalama). Sonra yerel olarak (Codex çağırmadan) e2e.json'daki iki gerçek cevap metnini aynı boru hattından seslendir, Whisper ile ölç; hedef: kod okunmaz, her iki WER ≤ 0.15. Çıktı `cikti/duzeltme_*.wav` + `cikti/duzeltme.json`.
4. `SONUC_SES_SOHBET.md` sonuna "Düzeltme turu" bölümü ekle; gerçek Codex tekrar testini Claude normal terminalde koşacak, onu başarılı yazma. Son satır `SONUC: TAMAM` veya `SONUC: EKSIK - <neden>`.
