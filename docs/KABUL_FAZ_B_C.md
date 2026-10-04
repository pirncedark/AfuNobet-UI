# Faz B/C gerçek Windows kabulü

Durum: **UNVERIFIED**. Otomatik testler gerçek masaüstü kabulü değildir. Sonucu PASS/FAIL olarak ve kullanılan paket özetiyle kaydedin.

| Deneme | Beklenen | Sonuç |
|---|---|---|
| Pet sağ tık | Liste pencereye sığar; dışarı dokunma/Escape eski pet konumunu geri getirir | UNVERIFIED |
| Uygulama açma | Yalnız seçilen kurulu uygulama açılır; sessiz pencere oluşmaz | UNVERIFIED |
| Canlı uygulama durumu | Durum değişince listede/tepside yenilenir; bayat durum temizlenir | UNVERIFIED |
| Hesap bağlama | Kullanıcı düğmesiyle resmi giriş açılır; gizli bilgi arayüzde görünmez | UNVERIFIED |
| Sohbet | Kısa mesaj akışı görünür; Durdur çalışır; başka pencerenin odağı alınmaz | UNVERIFIED |
| Dosya bırakma | Ad görünür; Gönder öncesi dosya iletilmez; kaldırma çalışır | UNVERIFIED |
| Bas-konuş | Kısa Türkçe ses metne döner; Gönder kullanıcı seçimiyle olur | UNVERIFIED |
| Mikrofon bırakma | Bırakma/iptal/sohbetten ayrılma/çıkış sonrası mikrofon göstergesi kapanır | UNVERIFIED |
| Yanıt TTS | Sesli yanıt açıkken tamamlanan yanıt okunur; varsayılan sessizdir; kapatma/sohbetten ayrılma/bas-konuş/çıkış kalan parçaları durdurur | UNVERIFIED |
| Windows sesi | Türkçe varsa tercih edilir; yoksa Windows varsayılan sesi kullanılır | UNVERIFIED |
| Bas-konuş ve bildirim | Mikrofon önce devam eden bildirim sesini de kapatır; açılış/kayıt sırasında bildirim sesi başlamaz | UNVERIFIED |
| Ses bildirimleri | Varsayılan sessiz; açınca en az30 saniye ara; görev başlangıcı sessiz | UNVERIFIED |
| Uygulama çıkışı | Yalnız UI'nin açtığı Codex alt süreci kapanır; diğer ajanlar sürer | UNVERIFIED |
| Kaynak kullanımı | Boşta ve model yüklü/yüksüz CPU/RAM ölçümü kaydedilir | UNVERIFIED |

Sınır: Windows STT yedeği güvenli çevrimdışı yakalanmış ses akışıyla doğrulanmadığından kapalıdır. Eksik modelde yazı kullanılır. Faz D yalnız V1 geçişleri sert bulunursa açılır. R1/R2 kayıt/yayın kapıları tamamlanmadı; commit/push/merge/release yapılmadı.
