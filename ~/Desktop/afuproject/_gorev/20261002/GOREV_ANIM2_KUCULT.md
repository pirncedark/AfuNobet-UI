# GÖREV (gemini pro): 9 yeni animasyonu bağla + uygulama animasyonlarını küçült (exe 77 MB oldu)

Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sorun: 18:45 exe 77 MB — windows/public/afu/durum/*.webp kaynak boyutunda (420 px, 15 fps, kalite 92) gömülmüş. Kart karakter alanı 145×184 px.
1. Uygulama kopyalarını yeniden üret (kaynak afu-character/video/durumlar/*.webp DEĞİŞMEZ): yükseklik 368 px (2× DPI), 12 fps, kalite 82, animasyonlu webp, şeffaflık korunur (Python PIL ile: kareleri oku, yeniden boyutla LANCZOS, kare atla 15→12, kaydet). Toplam hedef < 15 MB. 23 dosya (eski 14 + yeni 9).
2. Yeni 9 animasyonu windows/public/afu/durum/'a ekle ve eşle (state.ts expressionFor / character.ts mevcut yapısı; en küçük değişiklik):
   uyanma → pet uyuyorken kart açılırken / uzun boşta sonrası ilk olay · konusma → Afu cevap verirken (sor/sohbet cevabı gösterilirken) · kota_doldu → Duraklatildi + quotaPaused · veda / veda_yakin → küçültme / gizlenme öncesi kısa oynat · inis → pet görev çubuğuna inerken · inis_oturma → pet boşta oturma · yatay_suzulme → pet yer değiştirirken (varsa) · kitap_selam → ilk açılış alternatifi.
   Pet modu kareleri (public/afu/pet) ayrı sistem; pet için yeni animasyon bağlamak gerekiyorsa yalnız eşleme ekle, pet karelerini değiştirme.
3. Testler: eşleme testleri + dosya varlığı + toplam boyut < 15 MB testi. tsc --noEmit + npm test + cargo test --offline tamamı geçmeli.
Exe derleme YOK, GUI yok, commit/push yok, Claude çağırma. Başka ajan apps görünümünde (indirme bağlantısı) çalışıyor: apps.rs / uygulamalar bölümüne dokunma.
Log: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\log\gemini_anim2.log
Çıktı: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\SONUC_ANIM2.md ilk satır SONUC: TAMAM|YARIM + toplam boyut.
