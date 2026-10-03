SONUC: TAMAM

# Testler yeşile döndü (3 kırmızı → 158 geçti)

`docs/kanit/gece_kuyruk/baslangic.txt` içindeki üç kırmızının **tek bir kök nedeni** vardı:
ölçüm tablosunun şeması `kutu` alanını kazanmış, tabloyu doğrulayan iki yerde (ve onu üreten
Python işlevinin sözleşmesinde) bu genişleme yansımamıştı. Üçüncü kırmızı ise kuyruk
pythonw.exe (penceresiz) altında pytest çalıştırdığı için testlerin alt sürece devraldığı
stdin tutamaçının geçersiz olmasıydı.

## 1. `tests/test_boyut_olc.py::test_missing_and_transparent_safe_default`
Kök neden: `scripts/boyut_olc.py::normalization()` hem dönüşümü (olcek/x/y) hem de ölçülen
alfa sınır kutusunu (`kutu`) tek sözlükte döndürüyordu; bu yüzden "güvenli varsayılan"
sözlük eşitliği bozuldu (`{'olcek','x','y','kutu'}` != `{'olcek','x','y'}`).
`kutu` P6/P8 çerçeveye sığdırma işi için gerçek bir ihtiyaç (`windows/src/afu/pet.ts:1153`
`sigdir(kutu, ...)`), yani kaldırılamaz; oysa kutu **tek başına ölçümden** türetilir,
normalizasyon dönüşümüyle ilgisi yoktur.
Düzeltme: kutu ayrı bir ölçüm işlevine ayrıldı — `sinir_kutu(item)` — ve `generate()` iki
parçayı tabloya birleştiriyor. Böylece `normalization()` sözleşmesi (dönüşüm üçlüsü) korunur,
varsayılan kutuyu `sinir_kutu()` üretir (`[0, 0, 1, 1]`, pet.ts'in varsayılanıyla aynı).
Test **hiç değişmedi**, silinmedi, atlanmadı.

Kanıt — üretilen tablo depodaki tabloyla birebir aynı (şema bozulmadı):
```
python -c "generate(...)" -> esit: True adet: 71
normalization varsayilan: {'olcek': 1, 'x': 0, 'y': 0}
kutu varsayilan: [0, 0, 1, 1]
```

## 2. `tests/test_studyo_uygula.py::test_normalize_preserved_in_future_application_output`
Kök neden: `studyo/uygula.py:107` tablo kaydını `set(item) != {'olcek','x','y'}` ile tam
eşitlik zorunlu tutuyordu; `kutu`'lu 71 kayıt bu yüzden "Normalizasyon tablosu geçersiz."
diye reddediliyordu (dosyadaki hata çıktısının ilk satırı).
Düzeltme: doğrulama `kutu`'yu isteğe bağlı ama doğrulanmış bir alan kabul ediyor:
`sinir_kutusu_gecerli()` — 4 sayı, sınırlar içinde, sol<=sağ ve üst<=alt; bilinmeyen anahtar
yine reddediliyor. Üretilen TypeScript imzası da pet.ts ile aynı şemaya getirildi
(`kutu?: [number, number, number, number]`) — önceden kutu'lu tablo yazılsaydı tsc
fazla-alan hatası verirdi (dosyada sessiz bir latent hata).

Kanıt — gerçek tabloyla normalize=true üretimi:
```
export const PET_BOYUT: Record<string, { olcek: number; x: number; y: number; kutu?: [number, number, number, number] }> = {...}
kutu anahtarli kayit sayisi: 71
tekrar uygulama ayni mi: True
```
Bozuk kutu/ölçek denemelerinin hepsi reddedildi (ters kutu, 5 elemanlı kutu, liste olmayan
kutu, olcek=0, NaN) → `reddedildi: ... Normalizasyon tablosu geçersiz.`
Tip denetimi: `tsc --noEmit --strict` ile `kutu`li ve `kutu`suz kayıtların ikisi de kabul
ediliyor (fazla alan reddi yok).

## 3. `tests/test_studyo_uygula.py::test_cli_default_dry_run_and_explicit_write`
Kök neden: kuyruk betiği pytest'i `sys.executable` ile, o da **pythonw.exe** ile
penceresiz başlatıyor (`dogrula()` içinde). Pencere yokken üst sürecin stdin tutamaçları
geçersiz; `subprocess` bu tutamaçları devralmaya çalışınca `OSError: [WinError 6] İşleyici
geçersiz` veriyor. Testlerin hiçbiri stdin kullanmıyor, sadece devralıyorlardı.
Düzeltme: alt süreçler stdin'i devralmıyor, `stdin=subprocess.DEVNULL` alıyor (aynı desen
zaten `scripts/gece_kuyruk.py:78` içinde kullanılıyor). `input=` veren diğer iki test zaten
güvende (`test_codex_soru_koprusu.py`, `test_afu_ajan_koprusu.py`).
Doğrulama: aynı hata pythonw altında **4** kırmızı üretiyordu (node testi de), sonra **0**.

## Doğrulama çıktıları
Başlangıç kapısı (kuyruğun kendi sırası: tsc → vitest → pytest):
```
> node node_modules/typescript/bin/tsc --noEmit          # cd windows
tsc exit: 0
> node node_modules/vitest/vitest.mjs run tests --configLoader runner
 Test Files  37 passed (37) | Tests  448 passed (448)
> python -m pytest tests -q
158 passed in 20.26s          (önce: 3 failed, 155 passed)
> pythonw.exe -m pytest tests -q
158 passed in 19.89s          (önce: 4 failed, 154 passed — kuyruk ortamı)
> python -m py_compile scripts/boyut_olc.py studyo/uygula.py studyo/hazirla.py studyo/dogrula_boyut.py
py_compile exit: 0
```

## Değişen dosyalar
- `scripts/boyut_olc.py` — `sinir_kutu()` eklendi, `normalization()` yalnız dönüşüm döndürüyor, `generate()` ikisini birleştiriyor, docstring kutu'yu anlatıyor.
- `studyo/uygula.py` — `sinir_kutusu_gecerli()` + isteğe bağlı `kutu` doğrulaması; üretilen `PET_BOYUT` tipi `kutu?: [number, number, number, number]`.
- `tests/test_studyo_uygula.py` — 5 `subprocess.run` çağrısına `stdin=subprocess.DEVNULL` (yalnız çağrı biçimi; hiçbir doğrulama, eşitlik veya sayaç değişmedi).

## Notlar
- Test dosyasında **tek satır doğrulama/iddia değişmedi**; sadece alt süreç çağrısının
  çağrı biçimi sağlamlaştırıldı (yoksa pencere arkasından koşum kırılır).
- Exe derlenmedi, git işlemi yapılmadı, görünür pencere açılmadı, görsel/ses dosyası
  değiştirilmedi.
- `cargo test --offline` koşturulmadı: bu görev kırmızısı yalnız pytest'ti ve değişiklikler
  Python içindedir; Rust tarafına dokunulmadı. Kuyruğun son tam doğrulaması Rust'u kendisi
  koşturacaktır.