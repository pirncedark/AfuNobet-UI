SONUC: YARIM - Stüdyo tamamlandı; kök pytest keşfi yasaklanan yan etkiler üretti ve test_m6.webp dosyasının önceki baytları doğrulanamıyor.

Stüdyoyu `studyo/animasyon_studyo.html` dosyasına çift tıklayarak aç. Sunucu, kurulum veya internet gerekmez. Sekansı düzenledikten sonra **Dışa aktar** ile `afu_animasyon.json` dosyasını indir.

Üretilen dosyalar:

- `studyo/animasyon_studyo.html`: tek dosyada Türkçe koyu arayüz, satır içi CSS/JS.
- `studyo/uygula.py`: doğrulanan JSON'u eski pet kaynağına uygulayan betik; varsayılan yalnız fark gösterir, `--yaz` açıkça verilirse yazar.
- `tests/test_studyo_uygula.py`: veri doğrulaması, bilinmeyen kare, bozuk süre/konum, gerekli sekans, tekrar uygulama ve güvenli yazma testleri.
- `studyo/hazirla.py`: disk listesini, alfa sınırlarını ve eski HEAD sekanslarını HTML'e gömen üretim aracı; normal kullanımda çalıştırılmaz.
- `studyo/dogrula.py`: kurulu Playwright/Chromium ile başsız file:// doğrulaması.
- `docs/kanit/anim_studyo/log.txt`: zaman damgalı ADIM/HATA/SON kaydı.

Görev adımlarının durumu:

1. Sahte masaüstü, 48 px görev çubuğu ve ortada Başlat simgesi var. HEAD'deki eski pet CSS ölçüleri kullanıldı: 128 × 128 px pencere ve çizim alanı; pet Başlat'ın hemen solunda. Oynat/Durdur, 0,25×–2× sekans hızı ve kare adımlama çalışıyor.
2. Eski HEAD `SEKANSLAR` ve `T` değerlerinden 12 sekans çıkarıldı. Küçük resim, süre düzenleme, sürükle-bırak sıralama, silme, kopyalama, yeni sekans ve yeniden adlandırma var. Son kare silinemez; JSON'da boş sekans kabul edilmez.
3. Dizinlerden 44 eski pet karesi ve ayrı sekmede 27 durum animasyonu gömüldü. `.yedek*` dosyaları alınmadı. Görseller yalnız göreli yollarla gösteriliyor. Kareye tıklama sekansa ekliyor; üzerine gelme büyük önizleme ve dosya adını gösteriyor.
4. Sekans başına Boyut, Sağa/Sola ve Yukarı/Aşağı ayarları ile sahnede fareyle sürükleme var. Görev çubuğu üstünde kılavuz çizgi var. Ayak hizalaması canvas alfa okumayı dener; file:// güvenlik engelinde üretim sırasında görsellerden okunan sayısal alfa sınırını kullanır. Görsellerin içeriği HTML'e kopyalanmadı.
5. Değişiklikler try/catch ile localStorage'a kaydediliyor. İçe aktar doğrulandı; geçersiz JSON mevcut çalışmayı değiştirmiyor. Dışa aktar gerçek JSON indirmesi ve pano kopyalaması yapıyor. Pano engellenirse indirilen dosya kullanılabiliyor. Varsayılana dönüş onaydan sonra çalışıyor.
6. İstenen tek cümle ipucu üstte; uygulama ve kayıt ayrıntıları Gelişmiş bölümünde.

JSON biçimi `{sekanslar: {ad: [{kare, ms}]}, ayar: {ad: {olcek, x, y}}, surum: 1}`. `olcek` yüzde değeridir; x/y piksel ofsetidir. Eski pet kareleri uzantısız, durum kareleri `durum/ad` biçimindedir. JSON sonsuz sayıları desteklemediği için eski `Infinity` süreleri `ms: null` ile kayıpsız saklanır; arayüz ∞ gösterir, betik tekrar `Infinity` yazar. Sonlu süreler 1–600000 ms olabilir.

Animasyonlu WebP'nin iç kareleri dosyanın doğal hızında oynar; hız ayarı sekansın kare değiştirme sürelerini yönetir. Durdur, sahnenin görüntüsünü canvas'a alarak dondurur. Stüdyo WebP dosyasının iç animasyonunu düzenlemez.

Uygulama örneği (bu görev sırasında windows/src üzerinde çalıştırılmadı):

```powershell
python studyo/uygula.py afu_animasyon.json
python studyo/uygula.py afu_animasyon.json --dene
python studyo/uygula.py afu_animasyon.json --yaz
```

Betik eski pet çizim kodunu arar; tanınmayan/yeni animasyon kaynağında yazmadan hata verir. Uygulamanın kullandığı mevcut sekansları kaldıran/yeniden adlandıran JSON da reddedilir. `--hedef` ile farklı hedef dosya seçilebilir. Pet ayarları `PET_AYAR` olarak eklenir ve çizimde kullanılır; durum karelerinin yolları ayrıca çözülür. Yazma ancak tüm kontroller tamamlandıktan sonra atomik dosya değişimiyle yapılır.

Doğrulama:

- Stüdyo birim testleri: **13 geçti**; ayrıntı `docs/kanit/anim_studyo/studyo_tests.txt`.
- Chromium headless/file://: sayfa hatası yok; **71/71 görsel yüklendi**. Düzenleme, sürükleme, hizalama, kayıt, yeniden açma, JSON indirme/içe alma ve kayıt engeli senaryoları geçti. Kanıt `tarayici_dogrulama.json`.
- 1440, 900 ve 390 px genişliklerde yatay taşma yok. Görüntüler `studyo_masaustu.png`, `studyo_tablet.png`, `studyo_mobil.png`.
- Eski HEAD kaynağının kanıt kopyasında dönüşüm idempotent; dönüştürülmüş TypeScript'te sözdizimi hatası yok. Bu kontrol tam uygulama derlemesi değildir. Kanıtlar `eski_pet.ts`, `uygulanmis_pet.ts`, `uygulama_farki.txt`, `varsayilan.json`.
- Windows Vitest: **31 test dosyası / 378 test geçti**.
- Genel Python `tests/` kontrolü: **124 geçti, 5 başarısız**. Stüdyo dışındaki `test_protokol_completion.py` dosyasında başarısız testler: `test_agent_event_alias_and_nested_codex_failure`, `test_single_file_deletion_requires_approval` (rm/Remove-Item/del olmak üzere 3 durum), `test_approval_storage_failure_denies`. Ayrıntı `python_tests.txt`. Bu işin kapsamı dışında oldukları için ilgili kod değiştirilmedi.
- 71 pet/durum görselinin ve windows/src dosyalarının başlangıç/bitiş SHA-256 değerleri aynı. Stüdyo tarayıcı doğrulaması başsız çalıştı. İnternetten kütüphane kurulmadı; commit/push yapılmadı. Git yalnız HEAD kaynaklarını okuma ve aşağıdaki kurtarma kontrolü için kullanıldı.

Eksiksiz TAMAM olarak raporlamayı engelleyen olay:

Kök dizinde `python -m pytest -q` çalıştırılması, mevcut `test_m6.py` dosyasının import sırasında görsel üretmesini tetikledi. Süreç durdurulduğunda kökteki **test_m6.webp sıfır bayta düşmüştü**. Dosya HEAD'de bulunmadığı için önceki baytları Git'ten geri alınamadı; başlangıç hash'i de yok. Mevcut üretim betiği ile geri oluşturma başlatıldı. Bu, görevin görsel dosyalarını değiştirmeme yasağına aykırı bir yan etkidir. Pet/durum görselleri ve uygulama kaynakları bu olaydan etkilenmedi. Kök test dosyasının eski baytlarla aynı olduğunu doğrulayamadığım için sonuç YARIM olarak kaydedildi.

Aynı kök keşfi, `kapi_test.py` dosyasını da import edip mevcut GUI testini çalıştırdı. Bu betik Afu uygulamalarını ve bir test penceresini başlatıp 00:14:49'da kendi temizliğini bitirdi; kayıt `../_gorev/20261002/log/gemini_kapi_test.log` içinde. Bu da görünür pencere açmama yasağına aykırıydı. Sonraki Python kontrolleri yalnız `tests/` diziniyle sınırlandı. Bu iki yan etki nedeniyle görev bütün yasaklara uygun tamamlandı olarak sunulmuyor.
