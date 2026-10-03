# GÖREV (gemini pro): "Kurulu değil" uygulamalara en son sürüm indirme bağlantısı

Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kullanıcı: Uygulamalar listesinde kurulu olmayanlar için en son sürümü indirme bağlantısı olsun.
Sürümler (GitHub, hepsi pirncedark):
- AfuDM: https://github.com/pirncedark/AfuDM/releases/latest
- AfuDesk: https://github.com/pirncedark/afudesk/releases/latest
- AfuRemote (telefon APK): https://github.com/pirncedark/AfuRemote/releases/latest
- AfuTube: AfuDM deposunda `afutube-v*` etiketleriyle yayınlanıyor (son: afutube-v1.6.0). "latest" AfuDM'i gösterdiği için AfuTube için https://github.com/pirncedark/AfuDM/releases?q=afutube adresini kullan (veya etiketi uygulama açılışında ağ çağırmadan sabit tut; en son etiketi elle güncellemek gerekmesin diye arama sayfası tercih).
- PadKöprü: yayın yok — bağlantı gösterme, "Kurulu değil" kalsın.
1. apps.rs / uygulama kaydına isteğe bağlı `indir_url` alanı ekle (yalnız https://github.com/pirncedark/ ile başlayan adresler kabul; E12 link güvenliği — mevcut safeWebURL/benzeri doğrulamayı kullan).
2. UI: kurulu değilse "Kurulu değil" yerine/yanında "İndir" düğmesi (tek tık, varsayılan tarayıcıda açar; Tauri shell/opener mevcut yöntemi). AfuRemote "Telefonda" satırında küçük "APK indir" bağlantısı. Afu basitlik kuralı: tek kısa kelime, teknik terim yok.
3. Testler: url doğrulama (izinli/izinsiz), kurulu değil → İndir görünür, kurulu → Aç görünür. tsc --noEmit + npm test + cargo test --offline tamamı geçmeli.
Ağ çağrısı yapma (sürüm sorgusu yok). Exe derleme YOK, GUI yok, commit/push yok, Claude çağırma. Başka ajan karakter animasyonlarında çalışıyor (state.ts, character.ts, public/afu/durum) — onlara dokunma.
Log: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\log\gemini_indir_link.log
Çıktı: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\SONUC_INDIR_LINK.md ilk satır SONUC: TAMAM|YARIM.
