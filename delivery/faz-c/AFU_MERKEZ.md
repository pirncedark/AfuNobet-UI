# Afu Merkez uygulama kaydı — C1 hazırlığı

Gerçek hedef planı: %LOCALAPPDATA%\AfuNobet-UI\uygulamalar.json. Hazırlık bu konuma yazmaz; örnek yalnız examples/uygulamalar.json içindedir.

Üst düzey JSON dizisi kullanılır. Her öğe id ve ad metni ile yol, durum_dosyasi, simge alanlarını içerir; son üçü metin veya null olabilir. Eksik seçenek alanları null sayılır. id en fazla 40 ASCII küçük harf/rakam/alt çizgi/tire; ad en fazla 60 Unicode skaler karakterdir. Boş kimlik/ad, yanlış tür ve bozuk satır atlanır. Aynı kimlikte ilk geçerli satır korunur. JSON bütünü bozuksa veya 64 KiB sınırını aşarsa boş kayıt döner.

```rust
let kayit = Kayit::yukle(registry_json);
let apps = kayit.uygulamalar();
// Yalnız açık kullanıcı tıklamasına bağlı olacak; bu teslimde çalıştırılmadı.
// kayit.ac_windows("afudm")?;
```

Kayit::ac(id, launcher) kayıt kimliğini doğrular, mevcut mutlak yerel exe dosyasını seçer; dizin, eksik dosya, göreli yol, UNC, alternatif veri akışı, kontrol karakteri veya exe dışı uzantı açılmaz. Launcher arayüzü yalnız bir Path kabul eder, parametre kanalı yoktur. Native adaptör ShellExecuteW open ile dosyanın kayıtlı yolunu iletir; lpParameters ve lpDirectory NULL olur. Hata tek cümledir ve dosya yolu/ham Windows hatası taşınmaz.

bul_en_yeni(kok, desen), örneğin v*/AfuDesk/afudesk.exe veya dist/v*/AfuDesk/afudesk.exe içinden mevcut exe dosyasını bulur. Tam olarak bir v* bileşeni, sayısal v99/v140/v1.10 gibi klasör adları desteklenir; v200beta gibi son ekler atlanır. Sıralama sayısaldır, eşit sayısal sürümde klasör adı belirleyicidir. Eksik en yüksek sürüm atlanır ve en yüksek mevcut exe seçilir. Desende mutlak yol, .. veya birden fazla wildcard kabul edilmez. Sürüm klasörü ve son exe symlink ise atlanır.

Güven sınırı: Kullanıcıya ait registry yerel güvenilir konfigürasyondur. Bu okuyucu exe imzası, yayıncı kimliği veya sürüm manifesti doğrulamaz; diskte bulunan dosyayı yalnız adından kayıtlı exe olarak tanır. Dosyanın kontrol ile ShellExecuteW çağrısı arasında değişmesi işletim sistemi düzeyinde mümkündür. Gerçek açma ve bu Windows davranışı kullanıcı testi gerektirir.

Durum dosyası null olan uygulama durum üretmiyor demektir. AfuDM/AfuDesk/PadKopru için durum üretimi bu çalışmada eklenmedi. AfuTube/AfuRemote yol null: tüketici Kurulu değil göstermelidir; C3 görünümü bu teslimin kapsamında değildir.
