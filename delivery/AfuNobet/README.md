# Üretici teslim dosyaları

Bu dizin UI uygulamasına paketlenmez. İlk teslimde kurulum BLOCKED idi. 2026-10-02 kontrolünde kardeş ../AfuNobet/afu/ui_state.py ve ui_state_loop.py mevcut; kurulu üreticinin41 hedefli testi geçti. Bu tur dış depoya yazılmadı ve sürekli yenileyici/autostart başlatılmadı. Gerçek canlı kullanım Kapı1’de doğrulanır.

`afu/ui_state_loop.py` dosyası AfuNobet/afu klasörüne kopyalanınca mevcut `afu.ui_state.build_state` üreticisini kullanır. Motor veya kota yenileyicisi değişmez. Son geçerli state.json korunur; SQLite mevcut üreticide mode=ro/query_only ile okunur. OS dosya kilidi ikinci örneği engeller ve süreç ölünce otomatik bırakılır; kilit dosyasını silmek gerekmez.

AfuNobet dizininden başlat:

```powershell
python -m afu.ui_state_loop --aralik 15
```

Penceresiz başlatma (kullanıcı işlemi): `pythonw -m afu.ui_state_loop --aralik 15`.

Durdurma: `python -m afu.ui_state_loop --durdur` veya ön planda Ctrl+C. Özel `--output` kullanıldıysa durdururken aynı hedefi ver. Sinyal yalnız yenileyiciyi durdurur; ajanlara dokunmaz. Otomatik başlatma kaydı yapılmaz. Bu oturumda canlı yenileyici başlatılmadı.

Headless doğrulama: repo kökünde `python -m pytest -q -p no:cacheprovider tests/test_ui_state_loop_delivery.py`.

`ui_state.patch` mevcut tek seferlik üreticiye isteğe bağlı başlık/aksiyon/model/başlangıç alanları ve salt okunur kota önbelleği tüketimini ekler. Mevcut üretici dosyasını körlemesine ezmek yerine hedef depoda farkı inceleyip bu yamayı uygula; aynı depoda başka bir oturum çalışıyor olabilir. `afu/ui_state.py` burada test edilen teslim kopyasıdır. Kota okuyucu/yenileyici dosyalarına değişiklik yoktur; Claude kotası okunmaz. UI kaynak alanlarını aynen göstermeden filtreler.
