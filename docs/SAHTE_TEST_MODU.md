# AfuNöbet Bağımsız UI Geliştirme Modu

AfuNöbet arayüzünü (UI) test ederken gerçek ajanları (Codex, Gemini) çalıştırmak veya API kotası harcamak zorunda değilsiniz. Sahte olay betiği sayesinde arayüzün farklı durumlara (çalışma, soru sorma, kota dolması, hata) nasıl tepki verdiğini güvenle test edebilirsiniz.

## Nasıl Çalışır?

Arayüz ve test betiği `state.json` dosyası ve `sorular`/`cevaplar` klasörleri üzerinden haberleşir. Gerçek ajanların durumunu bozmamak için testler varsayılan olarak **ayrı bir test klasöründe** (`test_durum`) çalıştırılır.

### Hangi ortam değişkeni neyi okuyor? (doğrulandı)

| Değişken | Kim okur | Nereden |
|---|---|---|
| `AFUNOBET_UI_STATE` | Ada | `windows/src-tauri/src/state.rs:8` — `state.json` dosyasının **mutlak** yolu |
| `AFUNOBET_DB` | Ada | `windows/src-tauri/src/state.rs:12` — veritabanı yolu; aynı klasördeki `state.json` okunur |
| `AFUNOBET_SORU_DIZINI` | Ada | `windows/src-tauri/src/questions.rs:49` — `sorular/` ve `cevaplar/` kökü; verilmezse `state.json` klasörü kullanılır |

Yani `AFUNOBET_UI_STATE` tek başına yeterlidir; `AFUNOBET_SORU_DIZINI` verilirse soru kökü ayrıca sabitlenir. Ada dosyayı **salt okunur** açar (asla oluşturmaz/onarımaz) ve yalnızca **dizin olaylarını** izler — bu yüzden betik her yazımı geçici dosya + yeniden adlandırma (atomik) ile yapar ve periyodik kontrol yoktur.

## Kullanım

### Tek komut: "sahte modda aç"

`scripts/sahte_modda_ac.ps1` betiği test klasörünü hazırlar, iki ortam değişkenini
ona bağlar ve tek bir senaryo oynatır. **Pencereyi açmaz** — açmak kullanıcının isteğidir:

```powershell
# Yalnızca ortamı hazırla (pencere açılmaz)
powershell -ExecutionPolicy Bypass -File scripts/sahte_modda_ac.ps1

# Hazırla ve uygulamayı sahte modda başlat
powershell -ExecutionPolicy Bypass -File scripts/sahte_modda_ac.ps1 -Ac -Senaryo codex_soru
```

| Parametre | İş |
|---|---|
| `-Ac` | Sahte modda uygulamayı da başlatır (görünür pencere). Verilmezse sadece ortam hazırlanır. |
| `-Senaryo` | `bos` (varsayılan), `codex_soru`, `gemini_kota`, `hata`, `bayat` |
| `-Hedef` | Test klasörü. Varsayılan: `<proje>/test_durum` |

Betik gerçek AfuNöbet klasörüne **dokunmaz**; yalnızca test klasörüne yazar.

### Elle kurulum

Arayüzü test modunda başlatmanın elle yolu.

Arayüzün sahte durumu okuması için `AFUNOBET_UI_STATE` ortam değişkenini test klasöründeki `state.json` dosyasına ayarlayarak başlatmanız gerekir. (Dosya yolu mutlak olmalıdır).

**PowerShell ile:**
```powershell
$env:AFUNOBET_UI_STATE = "C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\test_durum\state.json"
# Arayüzü normal şekilde başlatın (örneğin npm run tauri dev)
```

`AFUNOBET_SORU_DIZINI` soru/cevap kökünü de aynı test klasörüne bağlar; verilmezse
uygulama kendisi `state.json` klasörünü kullanır.

**Komut Satırı (cmd) ile:**
```cmd
set AFUNOBET_UI_STATE=C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\test_durum\state.json
set AFUNOBET_SORU_DIZINI=C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\test_durum
# Arayüzü normal şekilde başlatın
```

### 2. Senaryo Oynatma

Yeni bir terminal açın (arayüz çalışırken) ve `scripts/sahte_olay.py` betiğini kullanarak bir senaryo başlatın:

```bash
python scripts/sahte_olay.py --senaryo codex_soru
```

**Kullanılabilir Senaryolar:**
- `codex_soru` (varsayılan): Ajan başlar, bir komut izni ister, siz arayüzden cevaplayana kadar bekler, sonra tamamlanır.
- `gemini_kota`: Ajan başlar ve kota sınırına (429) çarpar. Arayüzün bunu "Duraklatıldı" olarak göstermesi beklenir.
- `hata`: Ajan başlar ve rastgele bir hata ile kesilir.
- `bayat`: Ajan başlar ancak hiçbir ilerleme kaydetmez (askıda kalma senaryosu).
- `bos`: Görev yok, arayüz boş tahtayla bağlanır.

Ek bayraklar: `--hedef <klasör>` (özel test klasörü), `--bekleme 0` (anında),
`--oto-cevap evet` (arayüzü beklemeden cevaplar), `--sabit` (fixture/test için
sabit kimlikler), `--fixture <klasör>` (üretilen dosyaları ayrıca oraya kopyalar).

### Otomatik doğrulama

`sahte_olay.py` senaryolarının **uygulamanın kendi ayrıştırıcıları** tarafından
doğru okunduğu iki katmanda test edilir:

```bash
# Üreticinin kendisi: sözleşme, atomiklik, cevap akışı, fixture kayması
python -m pytest tests/test_sahte_mod.py tests/test_sahte_olay.py -q

# Uygulamanın ayrıştırıcıları (state.ts + question.ts) üretilen dosyaları okur
cd windows && npm test
```

`windows/tests/fixtures/sahte_*.json` dosyaları gerçek üreticinin çıktısıdır.
Yenilemek için (sabit kimlik + beklemesiz çalıştırma):

```bash
python scripts/sahte_olay.py --senaryo hata --hedef <geçici> --bekleme 0 --sabit --fixture <çıktı>
```

### Gerçek Klasöre Yazma (Tehlikeli)

Testleri gerçek AfuNöbet klasöründe yapmak isterseniz (önerilmez), `--gercek` bayrağını kullanabilirsiniz. Bu işlem mevcut `state.json`'un üzerine yazar. **Mutlaka yedek alın.**

```bash
python scripts/sahte_olay.py --gercek
```
