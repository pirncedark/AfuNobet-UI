SONUC: TAMAM - vitest 715 gecti, cargo 247 test, pytest 297 test hatasız tamamlandı.

- `windows/src/message/notifications.ts` düzeltmelerinin ve `windows/tests/notifications.test.ts` içindeki "pet modu üstte + görünür → bildirim → 8 sn sonra hâlâ üstte + görünür" vitest senaryosunun zaten mevcut olduğu ve hatasız geçtiği doğrulandı.
- `windows/src/message/bicim.ts` oluşturuldu, metinden Markdown, süs çizgileri, ANSI kodları ve başlık emojileri çıkararak temiz bir dönüşüm sağlayan (ve soru formatlarını algılayan) `bicimle` fonksiyonu yazıldı.
- `windows/tests/bicim.test.ts` eklendi, belirtilen ekran görüntüsü örneği (Commit atıldı: 0068b0a) ve soru formatları (❓, 1 = / 2 =) dâhil tüm dönüşüm senaryoları doğrulandı.
- Pytest içindeki R3 kaynak doğrulama kuralları (`r3_source_hashes.json` ve `test_tum_ozellik_sozlesme.py`) yeni dosyayı içerecek şekilde güncellendi.
