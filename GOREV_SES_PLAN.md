# Afu sesli sohbet — kullanıcı planı (2 Eki 2026, bağlayıcı)

**SES HEDEFİ (açık):** Afu'nun sesi KÜÇÜK ÇOCUK tınılı, özgün bir ÇİZGİ FİLM KARAKTERİ sesi olacak (gerçek bir çocuğu taklit etmeden). Yetişkin kadın sesi veya yalnız perdesi yükseltilmiş ses hedefi karşılamaz. Her aday bu hedefe göre ayarlanır ve raporda hedefe ne kadar yaklaştığı ölçülebilirlerle (ortalama perde, formant/spektral merkez, konuşma hızı) belirtilir.

İş iki ajana bölündü (ayrı dosya kapsamı):
- **A (sohbet):** GOREV_SES_SOHBET.md + bu planın 1, 2, 3, 5, 6, 8, 9. maddeleri. Kapsam: `ses_deneme/` (ses_adaylari/ HARİÇ). Rapor: `ses_deneme/SONUC_SES_SOHBET.md`.
- **B (ses adayları):** bu planın 4. maddesi + adayların Whisper karşılaştırması. Kapsam: yalnız `ses_deneme/ses_adaylari/`. Rapor: `ses_deneme/ses_adaylari/SONUC_SES_ADAYLAR.md`. A, B'nin seçilen adayını ön-ayar adıyla (`--ses <ad>`) kullanabilecek şekilde bırakır.
- 7. madde (uygulama ekranı: tek konuşma düğmesi, ilk kullanımda ses seçimi, gelişmiş filtre bölümü) **Kapı 1 sonrası Faz B**'de windows/ içine yapılır; şimdi yalnız prototipte karşılığı (seçimi `ses_deneme/ayar.json`'a kaydetme, tek cümle hatalar) hazırlanır. windows/, afu-character/, tests/, dist/ DOKUNMA.
- GPU ortak: Chatterbox aynı anda iki süreçte OOM verirse bekleyip tekrar dene (kilit dosyası `ses_deneme/.gpu.lock` kullanın).

## 1. Mevcut bağlantıyı doğrula
ChatGPT girişi, ChatGPT/Codex sesinin uygulamada kullanılabildiğinin kanıtı DEĞİLDİR. ChatGPT sohbetinde duyulan sesi uygulamada kullanmanın desteklenen, üyelikle çalışan ve ücretsiz bir yolu varsa hesap/ücret koşullarıyla doğrula; yoksa (realtime → "requires API key auth" zaten kanıtlı) yerel Chatterbox ile devam. Desteklenmeyen ses yakalama (ekran/ses kaydı, gayriresmi uç) YOK.

## 2. Kalıcı Codex sohbeti
İlk mesajda gerçek Codex thread'i; sonrakiler aynı thread'e. Thread kaydı, yeniden açılışta devam. "hatayı bul" → "tamam düzelt" bağlamı korunur. Codex'in mevcut onay/sandbox sınırları gevşetilmez.

## 3. Afu karakteri baştan
Talimat thread başında Codex'e (developerInstructions vb.). Sıcak, neşeli, doğal, kısa; gerektiğinde ayrıntılı ve doğru. İkinci yapay zekâya yeniden yazdırma yok. Afu yapay zekâ olduğunu gizlemez/yanıltmaz.

## 4. Çocuk tınılı ses adayları
Gerçek bir çocuğu taklit etmeyen özgün çizgi film karakteri sesi. Yalnız perde değil: tını (formant), ritim (hız/duraklama), enerji (Chatterbox exaggeration/cfg) birlikte. Türkçe net; tiz/metalik/yorucu değil.
Aynı kısa ve uzun Türkçe metinlerle 3 aday:
- `yumusak_sicak` — yumuşak, sıcak, çocuk tınılı
- `neseli_hareketli` — neşeli, hareketli, çizgi film karakterine yakın
- `sakin_dogal` — sakin, doğal, uzun konuşmada rahat
Karşılaştırma örneği olarak kullanıcının önceki seçimi **notr + sicak filtre** (`ses_deneme/filtre/notr_01_sicak.wav`) korunur ve şimdiki VARSAYILAN odur; seçim yapılana kadar değişmez. Mevcut 9 filtre dosyası tam (sakin dahil). Dosya adları açık: `<aday>_kisa.wav`, `<aday>_uzun.wav`. Seçilen ses her cevapta aynı kimlik; kısa/uzun arasında yalnız enerji değişir.

## 5. Ekran metni / ses metni ayrımı
Tam cevap ekranda. Seslendirmede kod blokları, uzun yollar, ham bağlantılar, teknik çıktılar yerelde ayıklanır; "Kodu ekrana yazdım", "Ayrıntıları ekranda görebilirsin" gibi kısa ifadeler. İkinci yapay zekâ çağrısı yok; anlam ve önemli sonuçlar korunur.

## 6. Kota tasarrufu
"İşlem sürüyor mu / bitti mi" gibi sorular uygulamanın bildiği GERÇEK durumdan yerelde; durum bilinmiyorsa tahmin yok, "bilmiyorum" der. Sohbet/kod/analiz/karar Codex'e. Gereksiz durum sorgusu veya yeniden yazdırma çağrısı yok.

## 7. Basit kullanım (Faz B, yukarıya bak)
Tek belirgin konuşma düğmesi; teknik seçimleri uygulama yönetir; ses seçimi kısa ilk kullanım adımı, kaydedilir; filtre ayrıntıları gelişmişte; hatalar tek cümle (ne oldu + ne yapmalı); eksik ses bileşeni için mümkünse tek dokunuş çözüm.

## 8. Gerçek uçtan uca deneme
Login'li gerçek Codex thread'inde ≥2 mesaj; 2. mesajın 1. mesaj bağlamını kullandığı kanıtlanır. Süreç kapatılıp yeniden açılır, aynı thread sürer. Kısa ve uzun cevap sesleri üretilir; tam metnin ekranda kaldığı ve kodların okunmadığı doğrulanır. Whisper ile geri çevir; beklenen ses metniyle karşılaştır, eksik/yanlış kelimeleri kaydet. Dinleme değerlendirmesi (doğallık/anlaşılırlık/yoruculuk) KULLANICIYA aittir; ajan yalnız ölçülebilirleri yazar, "dinledim güzel" yazmaz.

## 9. Teslim
Deneme sesleri açık adlarla `ses_deneme/` altında. Rapor: gerçek ses kaynağı, thread devamlılığı, yeniden açma testi, 3 aday, Whisper karşılaştırmaları, kalan sorunlar. Yapılmamış test başarılı gösterilmez. Son satır `SONUC: TAMAM` veya `SONUC: EKSIK - <neden>`.
