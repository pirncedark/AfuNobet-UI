# Premium Görünüm Tamamlandı

AfuNöbet UI içindeki premium görünüme dair CSS ve JS güncellemeleri başarıyla tamamlanmıştır.

## Değişiklikler
1. **Durum Sınıfları ve CSS Filtreleri**:
   - `style.css` içerisinde tanımlanmış olan `--pet-*` değişkenleri üzerinden karakterin çalışıyor, düşünüyor, hata, başarı, onay bekliyor veya boşta olma durumlarına göre arka plan ışığı ve filtre renkleri tam olarak uygulanmıştır.
   - `[data-durum]` öznitelikleri (calisiyor, dusunuyor, hata, vb.) `island.ts` ve `character.ts` içerisinden `#afu-character` ve `#afu-pet` elementlerine aktarılacak şekilde entegre edildi.
   - Işıltı (`--pet-brightness`) CSS değişkeninin karakter görüntülerinde filtrenin içinde (`filter: brightness(var(--pet-brightness, 1)) var(--pet-filtre)`) kullanılması sağlandı. `none` değeri `drop-shadow(0 0 0 transparent)` ile değiştirilerek filtre diziliminin kırılmasının önüne geçildi.

2. **Animasyon ve Statik Görselin Yerleşimi**:
   - Yeni WebP animasyonları için oluşturulan `.afu-anim` görselinin, statik `.afu-image` ile CSS konumlandırma çatışması önlendi. Her iki element `position: absolute;` yapılarak hizalandı ve `object-fit: contain;` ile merkezlendi.
   - `.compact` modundayken her iki görselin de `object-position: center;` alması sağlandı.

3. **Test Doğrulaması**:
   - `windows/tests/premium.test.ts` üzerinden çalıştırılan eşleme durumları ve `AfuCharacter.sync()` testleri başarıyla doğrulandı.
   - Vitest ile 736 test, Cargo ile 247 test (%100) başarıyla geçmiştir.

Bütün bu değişiklikler sonucu, Afu karakteri ve tepsi pet görünümü tüm durumlara uygun parlayan gölge ve animasyonlarla premium hissiyata kavuşturulmuştur.