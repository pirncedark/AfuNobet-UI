# Kapı 1 Kontrol Listesi: Faz A Gerçek Windows Kabulü

Bu liste, `docs/KABUL_FAZ_A.md` gereksinimlerinden türetilmiş, kullanıcının gerçek Windows ortamında masaüstünde bizzat deneyeceği adım adım test listesidir.

**Ön Koşul:** `dist/afunobet-ui.exe` veya masaüstündeki `AfuNobet UI` kısayolu üzerinden uygulama başlatılmış olmalıdır.

---

| No | Ne Yap? (İşlem) | Ne Görmelisin? (Beklenen Davranış) | Durum |
|:--:|---|---|:---:|
| **1** | Masaüstündeki **AfuNobet UI** kısayoluna çift tıkla. | Ekranın üst ortasında Afu maskotu ve durum adası açılmalı; ilk karşılama görünmeli. | [ ] Geçti<br>[ ] Kaldı |
| **2** | Kart açıkken arkasındaki başka bir programa (ör. Not Defteri veya Tarayıcı) tıkla ve yazı yaz. | Diğer uygulamada yazı yazabilmelisin; AfuNobet klavye odağını çalmamalı veya diğer pencereyi kilitlememeli. | [ ] Geçti<br>[ ] Kaldı |
| **3** | Kartın dışındaki şeffaf boşluklara tıkla. | Alttaki masaüstü simgesi veya alttaki pencere tıklanmalı (click-through çalışmalı). | [ ] Geçti<br>[ ] Kaldı |
| **4** | Başka bir pencereyi tam ekran yap ve **Alt + Tab** tuşlarına bas. | Durum adası her zaman en üstte kalmalı (`always-on-top`); fakat Alt-Tab listesinde ve görev çubuğu açık pencere listesinde ayrı bir kutu olarak yer almamalı. | [ ] Geçti<br>[ ] Kaldı |
| **5** | Windows Ekran Ayarlarından ölçeği **%100**, **%125** ve **%150** yap. | Ada ve karakter görseli bulanıklaşmadan, taşmadan veya kenarlardan kırpılmadan ekranın üst ortasında doğru ölçeklenmeli. | [ ] Geçti<br>[ ] Kaldı |
| **6** | Ana karttaki **Ajan sekmelerine** (Codex, GLM, Gemini, OpenCode) tıkla. | İlgili ajanın görev detayları görünmeli; görevi olmayan ajana tıklandığında hata vermemeli, sakin kalmalı. | [ ] Geçti<br>[ ] Kaldı |
| **7** | **Kota durumu** bölümünü incele. | Ajan kotaları yüzde ve kalan süre ile net görünmeli; bilinmeyen değerler için `-` yazmalı, asla sahte değer uydurmamalı. | [ ] Geçti<br>[ ] Kaldı |
| **8** | Arka planda `state.json` yenilendiğinde (veya yeni görev başladığında) kartı izle. | Uygulamayı kapatıp açmaya gerek kalmadan karttaki durum kendiliğinden (canlı) güncellenmeli. | [ ] Geçti<br>[ ] Kaldı |
| **9** | Ana kart açıkken **Esc** tuşuna bas veya **Küçült** düğmesine tıkla. | Afu karakteri ekranın üstünden süzülerek/kayarak görev çubuğuna (Başlat menüsü yanına) inmeli ve mini pet moduna geçmeli. | [ ] Geçti<br>[ ] Kaldı |
| **10** | Görev çubuğundaki **Mini Pet** üzerine fareyi getir (hover). | Afu göz kırpmalı, dikkat veya hafif selam tepkisi vermeli. | [ ] Geçti<br>[ ] Kaldı |
| **11** | Mini Pet üzerine **tek tıkla**. | Mini pet görev çubuğundan yukarı doğru açılmalı ve ana durum kartı ekrana geri gelmeli. | [ ] Geçti<br>[ ] Kaldı |
| **12** | Karakterin üzerine hızlıca **3 kez tıkla**. | Karakter kısa bir baş dönmesi / şaşkınlık ifadesi göstermeli, ardından normal haline dönmeli. | [ ] Geçti<br>[ ] Kaldı |
| **13** | Mini peti görev çubuğundayken 5-10 dakika kendi haline bırak. | Karakter yavaş nefes alıp vermeli, göz kırpmalı ve bir süre sonra uyku moduna geçmeli; fareyi yaklaştırınca uyanmalı. | [ ] Geçti<br>[ ] Kaldı |
| **14** | Sistem tepsisindeki (sağ alt saat yanı) **Afu simgesine sağ tıkla**. | Türkçe menü açılmalı: Duraklat, Mini Peti Göster/Gizle, Çıkış seçenekleri düzgün görünmeli. | [ ] Geçti<br>[ ] Kaldı |
| **15** | Tepsi menüsünden **"Mini Peti Gizle"** seçeneğine tıkla. | Görev çubuğundaki pet kaybolmalı; yalnızca sağ alttaki tepsi simgesi kalmalı. Tepsi simgesine tıklayınca ana kart açılabilmeli. | [ ] Geçti<br>[ ] Kaldı |
| **16** | Tepsi menüsünden **"Bildirimleri Duraklat"** seçeneğini aç. | Bildirimler duraklamalı; arkadaki veri akışı kesilmeden sessizce izlemeye devam etmeli. | [ ] Geçti<br>[ ] Kaldı |
| **17** | Tam ekran bir video (ör. YouTube tam ekran) veya oyun başlat. | Mini pet ve ada tam ekran uygulamanın üzerinde kalarak görüntüyü engellememeli, gizlenmeli; tam ekrandan çıkınca geri gelmeli. | [ ] Geçti<br>[ ] Kaldı |
| **18** | Uygulamayı 10 dakika boyunca açık bırak ve Görev Yöneticisi'nden kontrol et. | Boşta CPU kullanımı %0 - %1 aralığında kalmalı, RAM sızıntısı olmamalı ve ekranda boş siyah konsol/terminal pencereleri birikmemeli. | [ ] Geçti<br>[ ] Kaldı |

---

### Kabul Onayı
Kullanıcı tüm maddeleri başarıyla tamamladığında:
**FAZ A KABUL: [ ] ONAYLANDI / [ ] RED**
Tarih: ____________________
İmza / Not: ________________
