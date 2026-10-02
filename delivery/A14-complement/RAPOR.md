# A14 tamamlayıcı görsel teslimi

Karar: **PARTIAL**.

Mevcut uygulama/üretim pet dosyalarına yazılmadı. Kaynaklar değiştirilmedi; model veya yeni çizim kullanılmadı.

50/50 ana PNG mevcut; yapı/rengi kontrol edilen 50/50. Ek 4 türev: ICO + 16/32/64 durum PNG.

30 pet = 16 durum + 8 geçiş/uyanma + 6 özel; kart 9 + efekt 9 + simge 2 = 50.
Görevdeki 16+5+3+6 ifadesi 30 eder; geçişte 8 pet ve 1 simge hücresi esas alındı.

Izgara çizgileri görüntüden bulundu; grup tuvalları en büyük kutu + 8 piksel, karakterler yatay ortalı ve altta hizalı; pet/kart/efekt küçültülmedi.

## Kabulü engelleyen kaynak/içerik sınırları

- Kaynak idle_bakis_a/b karşıt sol/sağ bakış sağlamıyor; bu iki kare uydurulmadı.
- efekt/tik.png: gerçek yeşil tik korunuyor (85.40%); eşik teknik olarak geçmiyor

Bakış ölçümü:

```json
{
  "idle_bakis_a": {
    "direction": "right",
    "delta": 17.9902,
    "iris_x": 167.537,
    "white_x": 149.5468
  },
  "idle_bakis_b": {
    "direction": "right",
    "delta": 16.672,
    "iris_x": 161.9728,
    "white_x": 145.3008
  }
}
```

Yeşil tikin doğal rengini bozarak eşiği geçirmek yanlış olur; tik renk istisnasının kabulü ve karşıt bakış kaynağı gerekir.

## Tekrar çalıştırma

```powershell
python .\a14_complement.py --out .
python .\a14_complement.py --out . --dogrula
```

--dogrula tüm koşullar sağlanırsa 0, kaynak/içerik sınırı veya hata varsa 1 döndürür. PASS 50/50 iddiası mevcut sınırlarda yapılmaz.

## Üretime birleştirme

birlestirme-manifesti.json tüm 54 çıktı için kaynak/hedef/SHA-256 verir. Mevcut pet dosyaları KEEP_EXISTING_REVIEW_ONLY, diğerleri COPY_IF_ABSENT. Otomatik uygulama yok; public/webp eşlemesi ana uygulama sahibinde.

Görsel kontrol dosyaları: kesim-kontrol-pet.png, kesim-kontrol-kart.png, kesim-kontrol-efekt.png, kesim-kontrol-simge.png.
