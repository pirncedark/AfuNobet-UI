# Afu Uygulamalarinin Disk Yerleri (Kesif Raporu)

Tarih: 2026-10-01

| Uygulama | Tür | Çalıştırılacak Dosya Tam Yolu | Sürüm | Kanıt |
|---|---|---|---|---|
| AfuDM | exe | C:\Users\afuuu\Desktop\afuproject\AfuDM\AfuDM.exe | 2.4.0 | AfuDM.exe mevcut, AfuDM.spec'te sürüm tanımlanmış |
| AfuDesk | exe | C:\Users\afuuu\Desktop\afuproject\AfuDesk\dist\v140\AfuDesk\afudesk.exe | v140 | dist/v140 en yüksek sürüm klasörü, afudesk.exe var |
| PadKöprü (AfuGamepad) | exe (PyInstaller) | C:\Users\afuuu\Desktop\afuproject\PadKopru\dist\PadKopru\PadKopru.exe | 0.1.0 | docs/DURUM.md'te Sürüm 0.1.0, dist/PadKopru/PadKopru.exe var, kaynak PadKopru.pyw |
| AfuTube | - | bulunamadi | - | C:\Users\afuuu\Desktop\afuproject\AfuDM\AfuTube klasörü boş, Program Files/AppData/Local/Masaüstü'nde exe yok |
| AfuRemote | - | bulunamadi | - | C:\Users\afuuu\Desktop\afuproject\AfuRemote Android projesi, PC helper exe yok |

## Masaüstü Afu*.lnk Kısayolları

| Kısayol Adı | Hedef Tam Yolu |
|---|---|
| AfuDM.exe - Kısayol.lnk | C:\Users\afuuu\Desktop\afuproject\AfuDM\AfuDM.exe |
| AfuNobet UI.lnk | C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\dist\afunobet-ui.exe |

## Başka Kurulu Kopyalar

- **AfuDM**: C:\Users\afuuu\Desktop\afuproject\AfuDM\AfuDM.exe dışında başka kopya bulunamadı (Program Files, AppData\Local içinde arandı)
- **AfuDesk**: Yalnız dist\v140\AfuDesk\afudesk.exe (Release build: app\build\windows\x64\runner\Release\afudesk.exe; Debug build: app\build\windows\x64\runner\Debug\afudesk.exe de mevcut)
- **PadKöprü**: Yalnız dist\PadKopru\PadKopru.exe

## Özet

✓ AfuDM (exe, 2.4.0)
✓ AfuDesk (exe, v140)
✓ PadKöprü/AfuGamepad (exe, 0.1.0)
✗ AfuTube (bulunamadi)
✗ AfuRemote PC tarafı (bulunamadi)

```json
{"karar":"TAMAM","ozet":"5 Afu uygulamasi; 3 tane bulundu (AfuDM, AfuDesk, PadKopru), 2 tane bulunamadi (AfuTube, AfuRemote PC helper)","dosyalar":["docs/AFU_MERKEZ_KESIF.md"]}
```
