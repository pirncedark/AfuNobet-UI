# P11: Konuşma balonu kullanıcı kapatana kadar kalsın + temiz metin
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakika. Exe YOK, git YOK, görünür pencere YOK, island.rs DEĞİŞMEZ, pet.ts'e dokunma. Düzenlemeden önce dosyayı yeniden oku (P8 kart büyütmesini koru). TAMAM'dan önce testleri koştur, çıktıyı SONUC'a yapıştır.
Sonuç: SONUC_P11.md
Önce oku: SONUC_KONUSAN_AFU.md (balon katmanı: windows/src/island/island.ts KonusanAfu), windows/tests/aktivasyon_kontrol.test.ts (balon testleri).
Kanıt: docs/kanit/pet_anim/kullanici_balon_0230.png — "Bu yazı ben kapamadan kapanmasın." Ayrıca metinde ham çizgi/markdown kalıntısı var ("────", emoji + yarım satır).

Yap:
1. Balon OTOMATİK KAPANMAZ (8 sn zamanlayıcıyı kaldır). Sağ üstte küçük "×" kapatma; balona tıklayınca tam metin kartta açılır ve balon kapanır. Esc ile de kapanır.
2. Kuyruk: yeni mesaj gelirse eskisi kapanmaz; balonun altında küçük "+2 mesaj" rozeti; × ile kapatınca sıradaki gösterilir. Kuyruk en fazla 5 (eski düşer).
3. Metin temizleme: markdown/çizgi kalıntıları (──, ===, ---, **, `, #, tablo |) atılır; emoji kalabilir; boş satırlar birleşir; ilk anlamlı 2 cümle, en fazla ~140 karakter + "…". Başlık satırı "Claude:" ayrı küçük etiket olarak (gövdenin içinde tekrar etmez).
4. Mini pet balonu (P10 henüz yapılmadı) ileride aynı kuralı kullanacak şekilde ortak fonksiyon (ör. balonMetni(), BalonKuyrugu) olarak yaz.
5. windows/tests/aktivasyon_kontrol.test.ts'teki "8 sn sonra kaybolur" beklentisini yeni davranışa göre güncelle (kullanıcı kararı) + yeni testler: × ile kapanır, kendiliğinden kapanmaz, +N rozeti, metin temizleme.
Doğrula: cd windows; tsc --noEmit; npm test tümü yeşil.
