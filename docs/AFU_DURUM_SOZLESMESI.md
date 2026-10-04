# Afu Merkez Durum Sözleşmesi

Her Afu uygulaması (AfuDM, AfuDesk vb.) isterse `%LOCALAPPDATA%\Afu\durum\<id>.json` dosyasına durumunu bildirir.
Afu Merkez bu dosyaları salt okur.

## Dosya Formatı (JSON)
Sözleşme tam olarak şu şekildedir:
```json
{
  "surum": 1,
  "id": "afudm",
  "durum": "bos", 
  "ozet": "3 indirme sürüyor",
  "guncelleme": "2026-10-01T12:00:00Z"
}
```

- **durum**: `"bos"` | `"calisiyor"` | `"uyari"` | `"hata"` değerlerinden biri.
- **ozet**: En fazla 60 karakterlik insan okuyabileceği kısa özet. Yol, PID, port gibi gizli/teknik bilgiler kesinlikle içermemelidir.
- **guncelleme**: Dosyanın yazıldığı zaman (ISO 8601, UTC). 5 dakikadan eski dosyalar Afu Merkez tarafından "bayat" sayılıp yok sayılır.
