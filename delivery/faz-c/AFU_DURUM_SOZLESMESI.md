# Afu uygulama durum sözleşmesi — C2 hazırlığı

İsteğe bağlı üretici hedefi: %LOCALAPPDATA%\Afu\durum\<id>.json. UI salt okur; hazırlık burada dosya oluşturmaz ve herhangi bir uygulamaya üretici eklemez. Üretici geliştirmesi her uygulamanın kendi deposunda ayrı yetkilendirilir.

```json
{"surum":1,"id":"afudm","durum":"calisiyor","ozet":"3 indirme sürüyor","guncelleme":"2026-10-01T12:03:00Z"}
```

- surum: tam sayı 1; diğer sürümler ve yanlış tür reddedilir.
- id: C1 kayıt kimliğiyle birebir aynı; başka uygulamanın durumuna güvenilmez.
- durum: yalnız bos, calisiyor, uyari, hata. Bilinmeyen değer reddedilir.
- ozet: en fazla 60 Unicode skaler karakter; boş metin olabilir. Kontrol/bidi karakteri, dosya yolu, PID/port/IP gibi teknik sözcük, IPv4/IPv6 ve URL kabul edilmez. Üretici/UI ile aynı gizli bilgi biçimleri de reddedilir: api_key/api key/api-key/apikey, token, secret veya password alanına : ya da = ile değer atama; Bearer yetkilendirme metni; e-posta; sk/ghp/gho/AIza anahtar önekleri ile en az 12 anahtar karakteri. Token yenileniyor veya Anahtar hazır gibi değer taşımayan insan cümleleri korunur. Sınır aşılırsa kesilmez; kayıt reddedilir. Türkçe karakterler korunur, bayt sayısı karakter sınırı değildir.
- guncelleme: RFC3339 dar altkümesi, YYYY-MM-DDTHH:MM:SS[.1-9-basamak]Z veya ±HH:MM. Gerçek takvim günü ve saat aralıkları doğrulanır. Yerel saat, artık saniye, 1970 öncesi zaman ve biçim fazlalığı reddedilir.

ayristir(json, beklenen_id, simdi) ve oku_icin(beklenen_id, yol, simdi) doğrulanmış AppDurum veya None döner. oku(yol, simdi) yalnız .json dosyası kabul eder ve beklenen kimliği dosya adından alır. Testlerde saat dışarıdan verilerek sabit ve bağımsız doğrulanır.

Tam 300 saniyelik durum geçerlidir; 300 saniyeden eski ve 1 nanosaniye dahi gelecekteki timestamp reddedilir. JSON en fazla 4096 bayttır; okuyucu File::open ile yalnız okur, en fazla 4097 bayt alır, büyük dosyayı reddeder. Bozuk/yarım JSON, eksik dosya, okunamayan dosya, UTF-8 hatası, dizin, yanlış kimlik veya bilinmeyen durum çökme üretmez; None olur. Bilinmeyen ek alanlar gösterime taşınmaz.

None için kullanıcı durum noktası yoktur; uygulamanın açılabilmesi bağımsızdır. Bu hazırlık son geçerli durum önbelleği, watcher, zamanlayıcı veya UI bağlamaz. Üretim entegrasyonu A7 mevcut izleyicisiyle, Kapı 1 sonrasında ayrı yapılır. İnsan metni doğrulaması küçük teknik biçimleri engeller; her olası teknik metni anlamsal olarak tanıdığı iddia edilmez. Uygulama üreticisi zaten kısa insan cümlesi yazmalıdır.

