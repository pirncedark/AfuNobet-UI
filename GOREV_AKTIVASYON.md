# GÖREV: "Çalıştığını göreyim" aktivasyonları (SONUC_AKTIFLIK.md önerileri)

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_AKTIVASYON.md (ilk satır `SONUC: TAMAM` / `SONUC: YARIM - <neden>`)
Log: docs/kanit/aktivasyon/log.txt
Önce oku: SONUC_AKTIFLIK.md, SONUC_KONUSAN_AFU.md (balon + Claude köprüsü onun işi; tekrar yapma, üstüne kur).

1. Orkestra "İş ver" anında geri bildirim: basınca hemen "Başlıyor…" geçici kartı + karakter tepkisi; state.json'da iş görünce gerçek karta dönüşür; 30 sn'de görünmezse tek cümle uyarı.
2. Olay sesleri: iş bitti / hata / soru bekliyor için kısa, yormayan sesler gerçekten çalsın (ses.rs olayları neden sessiz — bul ve düzelt). Tepsi menüsünde "Sesler açık/kapalı". Mevcut ses dosyalarını kullan; yeni ses üretme.
3. Afu'ya sor → Codex: YALNIZ Codex LOGIN (üyelik) ile; ÜCRETLİ API YOK. Oturum yoksa tek düğme "Codex'e giriş yap". Cevap geldikçe sohbet balonuna akış. Gerçek denemeyi Claude kendi terminalinde yapacak (codex sandbox'ta HOME hatası) — sen kodu + sahte Codex ile testleri yap, `ses_deneme/dene_sohbet.ps1` benzeri tek komutluk canlı deneme betiği bırak.
4. Her özellik için "çalışıyor" işareti: kartın altında tek satır sağlık şeridi — AfuNöbet ✓/✗ (state.json yaşı), Codex oturumu ✓/✗, Sesler ✓/✗, Claude köprüsü ✓/✗ (son 5 dk). Tıklayınca tek cümle "ne yapmalısın".
5. "BAĞLI DEĞİL / GÖRÜNMÜYOR / VERİ YOK" çıkan maddelerden kodla çözülebilenleri bağla; AfuNöbet verisi gerekenleri SONUC'a liste olarak yaz (AfuNöbet'e kod yazma).

Test: vitest + gerekirse Rust; tsc, npm test, cargo test --offline yeşil. EXE PAKETLEME YAPMA — Claude ayrı derleyecek. Not: başka Gemini aynı anda pet boyutunu (pet.ts, style.css içindeki afu-pet, taskbar.rs) değiştiriyor; o bölgelere dokunma, onun değişikliklerini silme.
YASAK: ücretli API, ~/.claude yazma, görsel dosyaları, pet.ts sekans/boyut, studyo/, island.rs, git, görünür pencere. Basit/sade: teknik terim yok, tek cümle hata.
