# Faz A gerçek Windows kabul testi

Durum: BEKLİYOR. Kullanıcı kabulü yapılmadı. Otomatik test veya kod taraması bu tablodaki gerçek davranışlara PASS yazmaz.

Ön koşul: son derleme testleri geçmeli, teslim exe SHA256 ile doğrulanmalı, kısayol son teslimi açmalı, ui_state_loop kurulmuş olmalı. Eski 14:35 exe ile yeni özellikleri sınamayın.

| No | Deneme | Beklenen | Sonuç |
|---|---|---|---|
| 1 | Kısayoldan aç | Afu yanında karşılaması ve ilk küçük görünüm | UNVERIFIED |
| 2 | İlk küçük görünümde 60 saniye bekle | Eski petit/hidden davranışı varsa doğru gizlenir; ana karttan küçültme #9/#15 ile ayrı sınanır | UNVERIFIED |
| 3 | Gizli ilk adanın üst ortasına gel | İlk petit/hidden modunda küçük ada uyanır; pet/tepsi modunda ikinci ada açılmaz | UNVERIFIED |
| 4 | Küçük adaya tıkla, diğer uygulamada yazmaya devam et | Kart açılır; diğer uygulamanın klavye odağı çalınmaz | UNVERIFIED |
| 5 | Şeffaf pencere alanına tıkla | Alttaki uygulama tıklanır | UNVERIFIED |
| 6 | Diğer pencereyi büyüt ve Alt-Tab aç | Ada üstte kalır, Alt-Tab ve görev çubuğu uygulama listesinde yer almaz | UNVERIFIED |
| 7 | Ajan sekmelerine bas | Görevli ajan seçilir; görevsiz ajan düğmesi etkisizdir | UNVERIFIED |
| 8 | Kota durumu panelini aç | Gerçek yüzde/zaman görünür; bilinmeyen değer —, Claude sorgulanmaz | UNVERIFIED |
| 9 | Ana kartta Esc veya Küçült | Mini pet açıksa pete, kapalıysa sağdaki durum simgesine küçülür | UNVERIFIED |
| 10 | Bildirimleri duraklat | Rozet/ses/otomatik açılma durur; ajanlar ve veri güncellemeleri sürer | UNVERIFIED |
| 11 | Belgelenen yenileyiciyi elle başlat ve yeni iş oluşmasını izle | Kart yeniden başlatmadan güncellenir; aynı yenileyicinin ikinci örneği açılmaz | UNVERIFIED |
| 12 | Ekran ölçeği %125 ve %150, monitör değişimi | Ada ve pet kırpılmadan doğru konuma gelir | UNVERIFIED |
| 13 | Karaktere 3 hızlı tık, 2 saniye hover | Kısa baş dönmesi/pozitif tepki, sonra normal ifade | UNVERIFIED |
| 14 | 10 dakika açık tut | Boşta CPU düşük, RAM plan sınırıyla ölçülür; konsol penceresi açılmaz | UNVERIFIED |
| 15 | Mini pet açıkken küçült | Afu üstten kayarak görev çubuğunun Başlat tarafında bekler | UNVERIFIED |
| 16 | Pet üstüne gel ve tıkla | Hafif tepki; tıklamada kart geri açılır | UNVERIFIED |
| 17 | Görev çubuğu hizası/otomatik gizlemeyi değiştir | Pet çubuk yanında veya ekran altına kırpılmadan yerleşir | UNVERIFIED |
| 18 | Tam ekran video/oyun aç ve çık | Pet gizlenir, çıkınca geri gelir | UNVERIFIED |
| 19 | Kesim kontrol görsellerini incele | Tüm gerekli kareler kaynak yüz/renk/kıyafetini korur; arka plan/yazı/çıta artığı yok | UNVERIFIED |
| 20 | Mini peti kapat ve küçült | Pencere gizlenir, sağdaki Afu durum simgesi kalır | UNVERIFIED |
| 21 | Bir iş başlasın, bitsin, kota beklesin | Nokta mavi/yeşil/turuncu; doğru görev ipucu; kart kendiliğinden açılmaz | UNVERIFIED |
| 22 | Simge sol tık; menüden Mini peti göster | Kart açılır, mini pet yeniden kullanılabilir; tercih uygulama yeniden açılınca korunur | UNVERIFIED |
| 23 | Peti 10 dakika bırak, sonra fareyle yaklaş | Nefes/göz kırpma/bakış döngüsü, sonra uyku ve uyanma | UNVERIFIED |

Bakış sınırı: kaynak iki kare aynı yöne bakıyorsa sol/sağ hareket tam kabul edilemez; kaynak düzeltmesi veya açık PARTIAL kaydı gerekir.

Kabul kaydı: gerçek denemeler tamamlandığında kullanıcı FAZ A = ACCEPTED yazar. Bu belge kabulün yerine geçmez.
