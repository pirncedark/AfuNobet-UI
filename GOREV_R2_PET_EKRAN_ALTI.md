# GOREV R2: Başlat menüsü olmayan yerde mini pet ekranın en altında dursun

Önce CLAUDE.md, GOREV_COUCOU_AFU.md, AFU_CHANGES.md oku. R1 (mesajda öne gelme) yeni bitti; onun değişikliklerini bozma.

Kullanıcı isteği (3 Eki): "Başlat menüsü olmadığı yerlerde sayfanın en altında olsun."

## Davranış
1. Mini pet bugün görev çubuğundaki Başlat düğmesinin yanına yaslanıyor. Bu kalsın.
2. Petin bulunduğu ekranda görev çubuğu / Başlat düğmesi YOKSA, pet o ekranın en altında, alt kenara yaslı durur. Bu durumlar: görev çubuğu olmayan ikinci monitör, otomatik gizlenen görev çubuğu, görev çubuğu yanda ya da üstte. Yaslanma ve geri dönüş animasyonları aynı kalır. Pet ekran dışına taşmaz.
3. Sürükle-bırak sonrası pet "yerine döner". Yeri bu kurala göre hesaplanır.
4. Ekran eklenip çıkınca, çözünürlük ya da ölçek (%100/%125/%150) değişince yeri yeniden hesaplanır.

## Kurallar
- windows/src-tauri/src/island.rs bayt bayt DEĞİŞMEZ. Konum hesabını başka modüle koy (saf fonksiyon: ekran alanı + çalışma alanı + görev çubuğu dikdörtgeni → pet konumu). Böylece başsız test edilebilir.
- Süreç kontrolü, ağ, sır yok. Görünür test penceresi açma.
- Testler: saf konum fonksiyonu için Rust ve/veya vitest. Örnekler: görev çubuğu altta; yok; üstte; solda; otomatik gizli; %150 ölçek; ikinci monitör negatif koordinat.

## Doğrula
python -m pytest -q tests ; windows içinde npx tsc --noEmit ; npx vitest run ; windows/src-tauri içinde cargo test --offline. Hepsi 0 fail.
Exe, git ve commit YOK.

Sonuç: SONUC_R2.md. İlk satır "SONUC: TAMAM - ..." ya da "SONUC: YARIM - neden". Altına değişen dosyalar ve elle deneme adımı (tek cümle).
Log: _gorev/2026-10-03/log/codex_r2_pet_ekran_alti.log (zaman damgalı ADIM/HATA/SON).
