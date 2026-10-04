SONUC: YARIM - Stüdyo boyut eşitlemesi tamamlandı; genel pytest paketindeki görev dışı 5 protokol hatası nedeniyle tüm testler yeşil değil.

Görev adımları
1. scripts/boyut_olc.py, 44 eski pet ve 27 yeni animasyon olmak üzere 71 WebP dosyasını yalnız okuyarak ölçüyor. Animasyonların bütün iç karelerinin alfa sınır kutuları birleştiriliyor. Tuval boyutu, karakter boyu/genişliği, alt boşluk, yatay merkez ve bunların oranları docs/kanit/boyut_esitle/olcum.csv içinde.
2. Referans eski pet/idle_normal.webp. Ölçek, referans karakter boyunun dosyanın ekranda sığdırılmış karakter boyuna oranı. Yatay merkez referansa geliyor; ayak çizgisi çubuğun üstüne oturuyor. Tablo studyo/boyut_tablosu.json içinde; görevdeki sonraki ve açık talimat uyarınca windows/public/afu altına yazılmadı. olcek çarpan, x/y görüntüleme karesine oran; sahnede 128 px ile çarpılıyor. Eksik/saydam görselin güvenli dönüşümü olcek=1, x=0, y=0.
3. studyo/hazirla.py tabloyu animasyon_studyo.html içine gömüyor; Git bağımlılığı kaldırıldı, eski sekanslar HTML'deki varsayılanlardan korunuyor. “Ayaklar çubuğa değsin” yanında aynı görünümde “Boyutları eşitle”, “Tümüne” ve “Geri al” bulunuyor. Seçili sekansa veya bütün sekanslara uygulanıyor, tekrar basmak ölçeği katlamıyor. Kare küçük resimleri, görsel kütüphanesi ve büyük önizleme normalize. Sekansın kullanıcı ölçek/x/y ayarları normalizasyonun üzerine uygulanıyor. İlk kullanımda kısa yönlendirme bir kez gösteriliyor.
4. JSON dışa aktarımında normalize: true ve normalizeSekanslar kapsamı korunuyor. İçe aktarım, otomatik kayıt ve yeniden açma doğrulandı. studyo/uygula.py bu alanları doğruluyor; sonraki ayrı uygulama işlemi için normalizasyon tablosunu ve kullanıcı ayarı birleşimini üretilen kodda koruyor. Mevcut windows/src dosyalarına uygulanmadı; yazma testleri yalnız geçici test hedeflerinde yapıldı.
5. EXE üretilmedi. windows/src, pet/durum görselleri ve island.rs değiştirilmedi. Kaynak/görsel SHA256 kontrolünde 201 dosyanın içeriği ve dosya listesi aynı. Görseller yeniden kaydedilmedi, sıkıştırılmadı veya silinmedi; görünür pencere, ses ve Git işlemi yok.

Doğrulama
- python -m pytest tests/test_boyut_olc.py tests/test_studyo_uygula.py -q: 27 geçti. Sabit test görselleri, animasyonlu WebP'nin bütün karelerinin birleşimi, tablo/CSV üretimi, dönüşüm hesabı, eksik/saydam dosya varsayılanı, JSON doğrulaması, tekrar uygulamanın aynı sonucu üretmesi ve üretilen JavaScript dönüşümünün Node ile çalıştırılması kontrol edildi.
- python studyo/dogrula_boyut.py: başsız Chromium başarılı. 71 dosyanın alfa birleşimi gerçek CSS matrisleriyle kontrol edildi; en büyük boy farkı %0,00034404, ayak farkı 0,00000413 px. Boy ≤%3, ayak ≤2 px sınırları sağlandı; yatay merkez de kontrol edildi. Sayfa hatası yok.
- node studyo/boyut_dogrula.cjs: başsız Chromium başarılı. Gerçek çizimde idle_normal ile durum/bosta_nefes boy farkı %1,282012; ayak farkı 0,00002362 px. Normalizasyon tüm iç karelerin birleşimini temel alır; animasyonun doğal poz hareketleri korunur.
- node studyo/dogrula.cjs: mevcut stüdyonun oynatma, sıralama, kopyalama/silme, konum, hizalama, kayıt, önizleme, JSON aktarımı ve dar ekran regresyon kontrolleri başarılı.
- python -m py_compile scripts/boyut_olc.py studyo/hazirla.py studyo/uygula.py studyo/dogrula_boyut.py: başarılı.
- Ekran görüntüleri: docs/kanit/boyut_esitle/idle_normal.png, durum_bekleme.png, durum_basari.png, eski_normalize.png, yeni_normalize.png, studyo_900.png ve studyo_390.png.
- Ayrıntılı kanıt: pytest_hedefli.txt, tarayici_dogrulama.json, chromium_sonuc.json, studyo_regresyon.txt ve hash_kontrol.json. Zaman damgalı ADIM/HATA/SON kaydı: docs/kanit/boyut_esitle/log.txt.

Genel pytest koşulunun kalan kısmı
python -m pytest tests -q son koşusu: 138 geçti, 5 başarısız (23,67 saniye); ayrıntılar docs/kanit/boyut_esitle/pytest_son.txt içinde. Başarısız testlerin tamamı tests/test_protokol_completion.py dosyasında:
1. test_agent_event_alias_and_nested_codex_failure: beklenen ajan adı yerine claude geliyor.
2. test_single_file_deletion_requires_approval[rm report.txt]: risk/onay beklentisi uyuşmuyor.
3. test_single_file_deletion_requires_approval[Remove-Item -LiteralPath report.txt]: aynı sorun.
4. test_single_file_deletion_requires_approval[del report.txt]: aynı sorun.
5. test_approval_storage_failure_denies: deny yerine ask dönüyor.

Bu testler ayrı koşuda da aynı şekilde başarısız oldu. İlk geniş koşuda ayrıca test_f17_boru_yokken_kisa_sure_sonra_acilan_sunucuya_ulasir zamanlamadan dolayı başarısızdı; ayrı koşuda ve son geniş koşuda geçti. İlk sonuç 131 geçti/6 başarısız idi; sonrasında eklenen 6 görev testiyle son sonuç 138 geçti/5 başarısız oldu. Görev dışı köprü/protokol kodu değiştirilmedi. Stüdyo geliştirmesi ve görev doğrulamaları tamamlandı; genel pytest yeşil şartı karşılanmadığı için durum YARIM.
