# GÖREV (OpenCode): Yeni özellikler için eksik testler

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\windows
Sonuç: ..\SONUC_OC_TEST.md — İLK SATIR `SONUC: TAMAM` ya da `SONUC: YARIM - <neden>`; altına `npm test` çıktısının son 5 satırını AYNEN yapıştır.

1. Oku: ..\SONUC_AKTIVASYON.md, ..\SONUC_KONUSAN_AFU.md, ..\SONUC_BAS_KONUS.md.
2. Şu davranışlar için YENİ vitest dosyası `tests/aktivasyon_kontrol.test.ts` yaz (mevcut test dosyalarını DEĞİŞTİRME):
   - Sağlık şeridi: 4 öğe (AfuNöbet, Codex, Sesler, Claude) çizilir; ✗ olana tıklayınca tek cümle görünür.
   - Orkestra "Başlıyor…" geçici kartı: iş verince görünür; 30 sn sonra iş gelmezse uyarı (sahte zamanlayıcı).
   - Konuşma balonu: 120 karakterden uzun metin "…" ile kesilir; 8 sn sonra kaybolur; kuyrukta en fazla 5.
   - Codex giriş satırı: bağlı / giriş yapılmadı metinleri.
3. Kaynak kodu (src/) DEĞİŞTİRME. Kırmızı kalan test için atlama yok; SONUC'a "olası hata: …" ve kanıt yaz.
4. `node node_modules/typescript/bin/tsc --noEmit` ve `npm test` koştur.
YASAK: exe paketleme, src/ değişikliği, git, görünür pencere.
