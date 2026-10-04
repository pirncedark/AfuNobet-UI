SONUC: TAMAM - Mini pet modundaki balon P10 tasarımına uyarlandı, mesaj metni `bicimle()` kullanılarak biçimlendirildi ve kart balona tıklanınca "Ayrıntı" sekmesi altında açılacak şekilde düzenlendi. Yeni vitest kanıtı oluşturuldu.

- `windows/src/message/message.ts`: `KonusanAfu.tamMetin` güncellendi, tam metin "Ayrıntı" başlığı altında, biçimlendirilmiş şekilde (`bicim.ayrinti` veya fallback) gösterilecek şekilde ayarlandı. `balonOlustur` hali hazırda `bicimle`'yi kullanıyordu.
- `windows/tests/r3b1.test.ts`: Pet balon ve bildirim geçişini test eden yeni vitest testleri eklendi, ━ ve ` gibi markdown işaretlerinin filtrelendiği, kartın kapalı başladığı ve balona tıklandığında açıldığı kanıtlandı.
- `tsc` ve `vitest` ile tüm kontroller sağlandı, 0 hata onaylandı.
