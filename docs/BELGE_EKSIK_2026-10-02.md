# Belge Uyum ve Eksiklik Analizi (2026-10-02)

Bu belge, `README.md` ve `docs/KULLANIM_REHBERI.html` dosyalarının Faz A gereksinimleri ve gerçekleşen geliştirmeler (`docs/ILERLEME_MASTER.md` A1–A19 adımları) ile uyumunu denetler.

---

## 1. Tespit Edilen Eksiklik ve Tutarsızlıklar

### A. `README.md` Analizi

1. **A14–A19 Mini Pet ve Görev Çubuğu Özelliklerinin Eksikliği:**
   - `README.md`, uygulamanın yalnızca "üstte duran küçük ada" (upstream benzeri) görünümünü anlatmakta; Faz A'nın en kritik çıktısı olan **Mini Pet modu**, görev çubuğuna iniş/kayma (glide), uyanma döngüleri ve tepsi üzerinden pet açma/kapama özelliklerine yer vermemektedir.
2. **Karakter Kesim Bilgisi Güncel Değil:**
   - Satır 50'de *"Altı PNG bu resimdeki mevcut karelerden kesilir"* yazmaktadır. Oysa A14 sonrasında kesim sistemi 50 kareye (pet 34 durum karesi, kart 9 karesi, efekt 9 karesi ve durum simgeleri) çıkarılmıştır.
3. **Teslim Dosya Yolları ve Kısayol:**
   - `dist/afunobet-ui.exe` ve masaüstündeki `AfuNobet UI.lnk` kısayolundan bahsedilmemiştir.
4. **Kota ve Sağlayıcı Durumu Eksikliği:**
   - A9 kapsamında geliştirilen `.ajan_kota.cache` üzerinden kota paneli, Claude KORUNUYOR rozetinin yanı sıra kota gösterimi açıkça açıklanmamıştır.

### B. `docs/KULLANIM_REHBERI.html` Analizi

1. **Faz B ve C Özelliklerinin Faz A ile Karıştırılması:**
   - `KULLANIM_REHBERI.html` içinde "Sohbet" (hesap bağlama, mesaj gönderme, dosya ekleme) ve "Ses" (mikrofon bas-konuş, STT, TTS yanıt) başlıkları aktif kullanımdaymış gibi anlatılmıştır. Oysa bu özellikler Faz B ve Faz C kapsamındadır; Faz A yalnızca salt-okunur durum izleme ve mini pet adasını içermektedir.
   - Gerçek Windows üzerinde sohbet ve ses kabulü yapılmamıştır; kullanıcının ilk etapta bu özellikleri çalışır beklemesi kafa karışıklığı yaratabilir.
2. **Karakter Tepkileri ve Jestler Eksik Anlatılmış:**
   - A12 kapsamındaki jestler (3 hızlı tıklamada baş dönmesi tepkisi, fare üzerinde 2 saniye beklemede pozitif tepki, tıklamada kart açılması) kullanım rehberinde açıkça adım olarak listelenmemiştir.
3. **Kota Paneli Detayları:**
   - Kota yüzdelerinin nereden geldiği, stale (bayat) durumlarda `-` gösterilmesi ve Claude için kota okunmaması gibi kullanıcı güvenini ilgilendiren A9 kuralları rehberde bulunmamaktadır.
4. **Pencere Davranışları (Always-on-top, Click-through, DPI):**
   - Şeffaf alanlara tıklayınca arkadaki uygulamanın tıklanabilmesi (click-through) ve Alt-Tab listesinde yer almama özellikleri kullanıcıya bir rehber bilgisi olarak sunulmamıştır.

---

## 2. Düzeltme ve Güncelleme Önerileri

1. **`README.md` Güncelleme Önerisi:**
   - "Özellikler" bölümü eklenerek:
     - Üst ada görünümü (Ada modu)
     - Görev çubuğu maskotu (Mini Pet modu - 50 durum karesi)
     - Canlı durum ve kota takibi (A1–A10)
     - Tepsi simgesi entegrasyonu (A18)
   - Karakter bölümündeki "Altı PNG" ifadesi "50 sözleşme karesi ve türevleri" olarak düzeltilmeli.
2. **`docs/KULLANIM_REHBERI.html` Güncelleme Önerisi:**
   - Faz A (Masaüstü Durum Adası ve Mini Pet) ile Faz B/C (Sohbet ve Ses Asistanı) başlıkları belirgin faz etiketleriyle birbirinden ayrılmalı.
   - Mini Pet ile etkileşim (tek tık, 3 tık, hover, sağ tık menüsü) ayrıntılandırılmalı.
   - Kota paneli okuma rehberi eklenmeli.

---

## 3. Belge Eksiklik Sayısı

Toplam **7** temel belge eksikliği/tutarsızlığı tespit edilmiştir:
1. `README.md`: Mini pet (A14–A19) özelliklerinin ve görev çubuğu davranışının bulunmaması.
2. `README.md`: Kesim karesi sayısının eski kalması (6 vs 50).
3. `README.md`: Kota paneli ve gösterim kurallarının (A9) bulunmaması.
4. `README.md`: Kısayol ve teslim exe adlandırma/hedef bilgisinin eksikliği.
5. `KULLANIM_REHBERI.html`: Faz A ile Faz B/C ayrımının net yapılmaması, sohbet/sesin tamamlanmış gibi sunulması.
6. `KULLANIM_REHBERI.html`: Karakter jest ve tepki tetikleyicilerinin (A12) anlatılmaması.
7. `KULLANIM_REHBERI.html`: Şeffaf alan click-through ve Alt-Tab gizlilik davranışlarının açıklanmaması.
