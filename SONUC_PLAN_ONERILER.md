SONUC: TAMAM

7 kullanıcı onaylı öneri `docs/superpowers/plans/2026-10-01-afunobet-ui-tum-fazlar.md` planına görev ve kabul ölçütü olarak işlendi. İşlem öncesinde `docs/superpowers/plans/2026-10-01-afunobet-ui-tum-fazlar.md.yedek-20261002` yedeği alındı. Mevcut görev/adım numaraları ve Faz B ses yönü bölümü bozulmadı. Başka hiçbir dosyaya dokunulmadı; commit/push yapılmadı.

### Eklenen Bölümler ve Satır Numaraları

- **Başlık / Öncelik Sırası:**
  - Bölüm: `## Öncelik sırası (2 Eki, kullanıcı onaylı)`
  - Satır: 1–13
  - İçerik: Canlı durum -> sağlam pet/pencere -> yerel durum cevapları -> Codex sohbeti -> ses öncelik zinciri ve Kapı 1 kuralı.

- **Madde 1 (Güvenilir canlı durum):**
  - Bölüm: `### Görev A7: Canlı yenileme (dosya değişimi, yeniden başlatmadan)`
  - Kural tanımı: Satır 497
  - Kabul ölçütü: Satır 522 (`Adım 5 (Madde 1 kabul ölçütü)`)
  - Ayrıntı: Animasyondan önce canlı durum; bayat işareti (`bayat: true`) ve son güncelleme zamanı; motor/loop gecikmelerinde eski verinin güncel sanılmaması.

- **Madde 2 (Pet sakin ve faydalı):**
  - Bölüm: `### Görev A17: Pet durumları ve görünümü`
  - Kural tanımı: Satır 897
  - Kabul ölçütü: Satır 993 (`Adım 7 (Madde 2 kabul ölçütü)`)
  - Ayrıntı: Boşta hafif nefes döngüsü; sürekli açılmama, tıklandığında görev kartını açma; tam ekran oyunlarda/uygulamalarda otomatik gizlenme; yalnız kritik olaylarda tepki verme.

- **Madde 3 (Tek ana düğme "Afu'ya sor"):**
  - Bölüm: `### Görev B2: Oturum durumu ve sohbet görünümü`
  - Kural tanımı: Satır 1338
  - Kabul ölçütü: Satır 1373 (`Adım 6 (Madde 3 kabul ölçütü)`)
  - Ayrıntı: Sohbet ve bas-konuş aynı ana noktada; ajan, model ve bağlantı seçimini uygulamanın yönetmesi, gelişmiş ayarların gizli tutulması.

- **Madde 4 (Durum soruları yerelde cevaplanır):**
  - Bölüm: `### Görev B2: Oturum durumu ve sohbet görünümü`
  - Kural tanımı: Satır 1339
  - Kabul ölçütü: Satır 1374 (`Adım 7 (Madde 4 kabul ölçütü)`)
  - Ayrıntı: "Codex ne yapıyor?", "Hangi iş bitti?" gibi durum sorularının kota harcamadan yerel veriden anında karşılanması; Codex'e yalnızca açıklama ve derin analizlerin gönderilmesi.

- **Madde 5 (Ses önce metin):**
  - Bölüm: `### Görev B4: Yerel ses (bas-konuş): Whisper STT + Windows TTS`
  - Kural tanımı: Satır 1416
  - Kabul ölçütü: Satır 1511 (`Adım 11 (Madde 5 kabul ölçütü)`)
  - Ayrıntı: Konuşma metne çevrilince doğrudan gönderilmeyip düzenlemeye açık kalması; "işi devam ettir" vb. eylemlerde açık kart gösterimi ve kullanıcı onayı.

- **Madde 6 (Karakter sesi ile konuşma tarzı ayrı):**
  - Bölüm: `### Görev B5: Sesli bildirimler`
  - Kural tanımı: Satır 1522
  - Kabul ölçütü: Satır 1534 (`Adım 5 (Madde 6 kabul ölçütü)`)
  - Ayrıntı: Doğal Türkçe ve anlaşılırlık esası; aşırı tiz/yapay sesten kaçınma; kısa bildirimlerin tatlı-enerjik, uzun açıklamaların sakin tonla seslendirilmesi.

- **Madde 7 (Her sürüm tek hareketle geri alınabilir):**
  - Bölüm: `### Görev A13: Lisans taraması, Claude taraması, derleme, belgeler` & `### Görev B6: Gizlilik ve Faz B derlemesi`
  - A13 kuralı: Satır 723 (`Adım 3b (Madde 7 kalıcı kuralı)`)
  - B6 kuralı: Satır 1539 (`Adım 2 (Madde 7 kalıcı kuralı)`)
  - Ayrıntı: Yeni exe doğrulanıp kısayol güncellenmeden önce önceki çalışan sürümün `dist/onceki/` altında korunması; `dist/onceki/GERI_AL.ps1` ile tek komutla geri alma güvencesinin kalıcı kural olarak işletilmesi.
