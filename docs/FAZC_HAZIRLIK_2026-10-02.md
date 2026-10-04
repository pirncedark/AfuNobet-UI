# Faz C (Afu Merkez) Hazırlık ve Karşılaştırma Raporu

Tarih: 2026-10-02  
Çalışma Dizini: `C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI`  
Referans Belgeler: `docs/AFU_MERKEZ_KESIF.md`, `superpowers/plans/2026-10-01-afunobet-ui-tum-fazlar.md` (Faz C), `docs/KABUL_FAZ_B_C.md`.

---

## 1. AfuDM, AfuDesk ve PadKöprü Gerçek Çalıştırılabilir Dosyaları

Aşağıdaki tabloda `afuproject` dizini altındaki çalıştırılabilir dosyaların, dist paketlerinin ve masaüstü kısayollarının fiziksel inceleme sonuçları yer almaktadır:

| Uygulama | Tür | Tam Dosya Yolu | Boyut (Bayt) | Son Değişiklik Tarihi | Durum |
|---|---|---|---|---|---|
| **AfuDM** | Windows EXE (Tek dosya / PyInstaller) | `C:\Users\afuuu\Desktop\afuproject\AfuDM\AfuDM.exe` | 20.551.810 (19,60 MB) | 2026-09-30 23:53:11 | **VAR** |
| **AfuDesk** | Windows EXE (Flutter Runner / Sürüm Paketi) | `C:\Users\afuuu\Desktop\afuproject\AfuDesk\dist\v140\AfuDesk\afudesk.exe` | 79.872 (78 KB) | 2026-09-25 18:26:38 | **VAR** |
| *AfuDesk (Alternatif/Runner)* | Windows EXE (Derleme Çıktısı) | `C:\Users\afuuu\Desktop\afuproject\AfuDesk\app\build\windows\x64\runner\Release\afudesk.exe` | 79.872 (78 KB) | 2026-09-24 15:06:15 | **VAR** |
| **PadKöprü** | Windows EXE (PyInstaller dağıtımı) | `C:\Users\afuuu\Desktop\afuproject\PadKopru\dist\PadKopru\PadKopru.exe` | 2.890.525 (2,76 MB) | 2026-09-16 20:01:55 | **VAR** |
| *PadKöprü (Kaynak)* | Python Penceresiz Betik | `C:\Users\afuuu\Desktop\afuproject\PadKopru\PadKopru.pyw` | 150 | 2026-09-16 19:59:18 | **VAR** |

### Masaüstü Kısayolları (.lnk)
- `C:\Users\afuuu\Desktop\AfuDM.exe - Kısayol.lnk` -> Hedef: `C:\Users\afuuu\Desktop\afuproject\AfuDM\AfuDM.exe`
- `C:\Users\afuuu\Desktop\AfuNobet UI.lnk` -> Hedef: `C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\dist\afunobet-ui.exe`

### Diğer Ekosistem Bileşenleri ve "Kurulu Değil" Algılama Mantığı
- **AfuTube**: `C:\Users\afuuu\Desktop\afuproject\AfuDM\AfuTube` dizini boştur; bağımsız çalıştırılabilir `.exe` dosyası bulunamamıştır.
- **AfuRemote**: Yalnızca Android istemci projesidir; Windows üzerinde çalıştırılabilir bağımsız bir sunucu/yardımcı masaüstü `.exe` bulunamamıştır.

### "Kurulu Değil" Durumunun Algılanması
Bir uygulamanın menüde ve pet arayüzünde "Kurulu değil" olarak işaretlenmesi için şu kurallar işletilir:
1. `uygulamalar.json` içindeki `yol` alanının `null` olması veya dosya yolunun diskte fiziksel olarak mevcut olmaması (`Path::exists() == false`).
2. Hedef dosyanın uzantısının `.exe` olmaması veya dosya boyutu/erişim izninin geçersiz olması.
3. Uygulamanın türü `"android"` veya harici bir ortam olarak tanımlanmışsa (örneğin AfuRemote), "Kurulu değil" yerine doğrudan `"Telefonda"` etiketi verilmesi; masaüstü yürütme düğmesinin pasif (soluk) hale getirilmesi.

---

## 2. Plandaki Faz C Görevleri ile Gerçek Durumun Karşılaştırılması (Uyuşmazlıklar ve Varsayımlar)

Plan belgesindeki (`2026-10-01-afunobet-ui-tum-fazlar.md`) Faz C bölümü incelendiğinde 4 temel eksik/yanlış varsayım tespit edilmiştir:

1. **PadKöprü Yürütme Şekli Yanılgısı:**
   - *Plandaki varsayım:* Plan (Satır 1122 ve 1171), PadKöprü'nün bir `.venv` içinde Python betiği olarak çalıştırılacağını ve `pythonw.exe` mi yoksa betik mi olacağının C1'de sorulacağını varsaymaktadır.
   - *Gerçek durum:* PadKöprü'nün `dist/PadKopru/PadKopru.exe` yolunda hazır, derlenmiş tek parça PyInstaller EXE dosyası bulunmaktadır (2,76 MB). Python ortamı veya `pythonw.exe` çağırmaya gerek yoktur; doğrudan `ShellExecuteW` ile açılabilir.

2. **AfuDesk Dağıtım Klasörü ve Dinamik Yol Varsayımı:**
   - *Plandaki varsayım:* Planda `bul_en_yeni(&kok, "v*/AfuDesk/afudesk.exe")` fonksiyonu ile `dist/v*` altındaki en yeni sürümün dinamik bulunması planlanmıştır.
   - *Gerçek durum:* Şu anda diskte yalnızca `dist/v140/AfuDesk/afudesk.exe` bulunmaktadır. Statik bir yol veya tek bir sürüm klasörü mevcuttur; sürüm tarayıcı testleri sahte klasörlerle geçse de yerel konfigürasyonda doğrudan `dist/v140/AfuDesk/afudesk.exe` yolu kaydedilmelidir.

3. **AfuTube'un Bağımsız Bir Uygulama Olarak Bulunacağı Varsayımı:**
   - *Plandaki varsayım:* C1 sırasında diskte bulunabileceği umulmuş, bulunamazsa `null` atanacağı belirtilmiştir.
   - *Gerçek durum:* `AfuDM/AfuTube` dizini boştur ve masaüstünde/sistemde çalıştırılabilir binary yoktur. `uygulamalar.json` içinde doğrudan `yol: null` ve arayüzde `"Kurulu değil"` etiketiyle başlatılmalıdır.

4. **AfuRemote İçin PC Helper/Yürütülebilir Dosya Beklentisi:**
   - *Plandaki varsayım:* Planda AfuRemote'un durumu "PC'de açılacak exe yok; yalnız durum veya 'telefonda' etiketi" olarak özetlenmiş, ancak `uygulamalar.json` şemasına `tur: "android"` alanı C3'te sonradan dahil edilmiştir.
   - *Gerçek durum:* AfuRemote tamamen bir Android projesidir. Tıklamayla açma girişimi yapılmamalı, `ShellExecuteW` çağrısı engellenmeli ve arayüzde yalnızca `"Telefonda"` etiketi gösterilmelidir.

---

## 3. Kapı 3 — Faz C Kullanıcı Kontrol Listesi

Kullanıcının gerçek Windows ortamında Faz C işlevselliğini test ederken takip edeceği sade Türkçe kontrol listesi:

- [ ] **1. Görev Çubuğu Durum Simgesi Menüsü:**
  - Görev çubuğundaki Afu simgesine sağ tıklandığında "Afu Uygulamaları" listesi açılıyor mu?
  - Kurulu olanlar (AfuDM, AfuDesk, PadKöprü) net, kurulu olmayanlar (AfuTube) soluk "Kurulu değil", AfuRemote ise "Telefonda" olarak görünüyor mu?
  - *Sonuç:* `[ ] GEÇTİ  /  [ ] KALDI`

- [ ] **2. Tek Dokunuşla Uygulama Açma (AfuDM / AfuDesk / PadKöprü):**
  - Menüden veya pet balonundan "AfuDM" seçildiğinde uygulama sorunsuz açılıyor mu?
  - Menüden "AfuDesk" ve "PadKöprü" seçildiğinde ilgili pencereler ekrana geliyor mu?
  - Bir uygulama açılırken AfuNöbet-UI donmadan, çökmeden veya odağı kaybetmeden çalışmaya devam ediyor mu?
  - *Sonuç:* `[ ] GEÇTİ  /  [ ] KALDI`

- [ ] **3. Mini Pet Üzerinden Menü Erişimi:**
  - Mini pet karakterine sağ tıklandığında aynı uygulama listesi küçük ve şık bir balon menü olarak açılıyor mu?
  - Boş bir yere tıklandığında veya Escape tuşuna basıldığında menü düzgünce kapanıyor mu?
  - Pet'e sol tıklandığında ana AfuNöbet kartı tek ana işlem kuralına uygun şekilde açılıyor mu?
  - *Sonuç:* `[ ] GEÇTİ  /  [ ] KALDI`

- [ ] **4. Süreç Bağımsızlığı ve Çıkış Yalıtımı:**
  - AfuNöbet-UI üzerinden AfuDM / AfuDesk açıldıktan sonra AfuNöbet-UI tamamen kapatıldığında, açılan uygulamalar kapanmadan arka planda çalışmaya devam ediyor mu?
  - AfuNöbet arayüzü hiçbir harici süreci zorla öldürmüyor veya izinsiz yeniden başlatmıyor mu?
  - *Sonuç:* `[ ] GEÇTİ  /  [ ] KALDI`

- [ ] **5. Durum Gösterimi ve Senkronizasyon (Varsa Durum Dosyası):**
  - Kurulu uygulamalar durum dosyası (`%LOCALAPPDATA%\Afu\durum\<id>.json`) ürettiğinde, simge yanındaki nokta rengi ve menüdeki özet metin doğru güncelleniyor mu?
  - 5 dakikadan eski (bayat) durumlar otomatik temizlenip normal duruma dönüyor mu?
  - *Sonuç:* `[ ] GEÇTİ  /  [ ] KALDI`

---

SONUC: 3/3 uygulama bulundu, 4 plan uyusmazligi.
