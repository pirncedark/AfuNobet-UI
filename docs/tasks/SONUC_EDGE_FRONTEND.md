# Üst kenar frontend sonucu

Son kullanıcı tercihi uygulandı: panelden ayrılınca mevcut gecikmeyle mini pet; üst kenara gelince tam panel. Sürekli kompakt çubuk kararı son tercihle geçersiz olduğundan FSM otomatik küçülme davranışı değiştirilmedi.

- main.ts null payload edge-wake dinler. DOM wake-strip ve compact hover aynı onEdgeWake yoluyla hidden/compact/pet/tray durumundan home açar.
- Edge wake önce wasInIsland işaretler; panel açılışında kapanma timerı kurulmaz. Açık panelde tekrarlı event yeniden render veya geçiş üretmez, bekleyen kapanma timerını temizler.
- Mini pet native dönüş animasyonu ve pet(false) akışı korunur; dönüşte hover durumu silinmez. Cursor gerçekten ayrılınca normal timer çalışır.
- Canvas ölçümü görünür metnin intrinsic satır genişliğini hesaplar. Kısa metin 640 tasarım px; ihtiyaç varsa mevcut 1080 pencerenin izin verdiği 720 tasarım px'e kadar büyür. Fit ve 1.5 zoom gerçek CSS viewport sınırına göre hesaba katılır; device/native DPI tekrar uygulanmaz. Pencere ötesindeki uzun metin mevcut sarma/scroll davranışını kullanır. Daha geniş alan için Rust pencere ölçüsünü de büyütmek gerekir; bu görev kapsamında Rust değiştirilmedi.
- Ölçüm mevcut genişliğe değil font ve metne bağlı olduğundan ResizeObserver genişlik geri besleme döngüsü oluşturmaz.

Doğrulama: edge_wake.test.ts + content_width.test.ts + fsm.test.ts: 3 dosya, 17 test PASS. TypeScript tsc --noEmit PASS. Genişlik helperı 100/150 DPI viewport senaryolarıyla sınandı; edge testleri DOM headless ortamında gerçek Island.onEdgeWake ve FSM timerlarını kullanır. Gerçek Windows görsel/cursor/DPI testi çalıştırılmadı; PASS iddiası yok. Commit/push/indirme/pencere açma yapılmadı.
