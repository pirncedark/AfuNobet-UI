# GÖREV: Bas-konuş + sohbet uçtan uca çalışsın

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_BAS_KONUS.md (ilk satır `SONUC: TAMAM` / `SONUC: YARIM - <neden>`)
Log: docs/kanit/bas_konus/log.txt
Önce oku: SONUC_AKTIVASYON.md (Afu'ya sor → Codex bağlantısı orada yapıldı; üstüne kur), SONUC_SES_5B_SABIT.md, SONUC_TASIMA.md, ses_deneme/SONUC_SES_SOHBET.md, windows/src/chat/chat.ts + voice.ts (mevcut kod).

Kullanıcı: "Bas-konuş ve sohbet kısmını ekleyelim." Basit, sade, kullanışlı.


## 0) Codex ile giriş (kullanıcı: "Codex ile login kısmı olsun") — ÖNCE BU
- SONUC_AKTIVASYON.md'de giriş düğmesi yapıldıysa doğrula, yapılmadıysa ekle.
- Oturum durumu: `codex login status` (pencere açmadan, CREATE_NO_WINDOW) → "Codex: bağlı (ChatGPT hesabı)" / "Codex: giriş yapılmadı". Sağlık şeridinde ve sohbet panelinin üstünde tek satır.
- "Codex'e giriş yap" düğmesi: `codex login` (ChatGPT ile giriş; tarayıcı açılır — tarayıcı açılması serbest, KONSOL penceresi açılmaz). Giriş bitince durum kendiliğinden "bağlı"ya döner (5 sn'de bir kontrol, en fazla 3 dk).
- "Çıkış yap" gelişmiş/küçük bağlantı olarak (Daha fazla menüsünde).
- API anahtarıyla giriş seçeneği GÖSTERME (ücretli API yok).
- codex.exe yolu: PATH + bilinen kurulum yerleri (%LOCALAPPDATA%\OpenAI\Codexin\*\codex.exe); bulunamazsa tek cümle: "Codex kurulu değil. Kurmak için dokun." → resmi indirme sayfasını aç.
- Test: sahte codex ile durum ayrıştırma (bağlı/değil/kurulu değil), düğme akışı.

## Akış
1. Sohbet: "Afu'ya sor" → sohbet paneli; yazı kutusu + gönder; cevaplar akış halinde balonlarda; geçmiş son 20 mesaj; YALNIZ Codex LOGIN (üyelik), ücretli API YOK. Oturum yoksa tek düğme "Codex'e giriş yap".
2. Bas-konuş: sohbet panelinde büyük mikrofon düğmesi — BASILI TUT konuş, bırak. (Kısayol: boşluk tuşu basılı, panel odaktayken.)
   - Kayıt: yerel mikrofon; dinlerken Afu "dinleme" animasyonu + ses seviyesi halkası.
   - Yazıya çevirme: YEREL faster_whisper (`_deneme/ses/cbenv` python'unda kurulu; yol çözümü SONUC_TASIMA mantığıyla — AFU_SES_PYTHON / exe yanı / eski yol). Türkçe, küçük/orta model; CUDA varsa onu kullan.
   - Çıkan metin önce yazı kutusuna gelir (kullanıcı düzeltebilir), "Gönder" ile gider. Ayarlarda "Konuşunca hemen gönder" seçeneği (varsayılan KAPALI).
3. Sesli cevap: Codex cevabı Afu sesiyle (5b, sabit; mevcut Chatterbox + filtre hattı) okunur; konuşurken "konuşma" animasyonu; "Sesli cevap" aç/kapa düğmesi; kısa cevaplar enerjik, uzunlar sakin (mevcut ayar). Ses kurulu değilse tek cümle: "Afu sesi kurulu değil, yazıyla devam ediyorum."
4. Hata mesajları tek cümle (mikrofon izni, model yok, Codex oturumu yok).
5. Gecikme: Whisper modeli ilk kullanımda yüklenir ve sıcak tutulur (arka plan süreci, pencere AÇMADAN — CREATE_NO_WINDOW); 2 dk kullanılmazsa kapanır.

## Test
- Vitest: düğme basılı/bırak durumları, metnin kutuya düşmesi, otomatik gönder ayarı, hata cümleleri.
- Python: whisper köprüsü için sabit bir Türkçe wav örneğiyle (ses_deneme/DINLE veya cikti içinden mevcut bir dosya) yazıya çevirme testi — gerçek model ile, süre ve metin SONUC'a.
- tsc, npm test, cargo test --offline, pytest yeşil (sayılar SONUC'a).
- Canlı Codex denemesi için tek komutluk betik bırak (ses_deneme/dene_sohbet.ps1 benzeri); Claude kendi terminalinde koşacak.
EXE PAKETLEME YAPMA — Claude derleyecek.
YASAK: ücretli API; ses modeli/cbenv dosyalarını taşıma-silme; görsel dosyaları; pet boyutu/pet.ts (başka iş); island.rs; git; görünür pencere (konsol penceresi açan alt süreç YOK); ~/.claude.
