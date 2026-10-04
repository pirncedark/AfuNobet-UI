# GOREV: upstream Afu UI - UI/UX DUZELT + KALDIGIN YERDEN DEVAM
Once GOREV_AFU_TEMEL.md (EK KABUL OLCUTLERI dahil) ve GOREV_AFU_DEVAM.md oku. Sandbox internetsiz (CARGO_NET_OFFLINE=true). Yeni pencere ACMA. Commit etme. Apostrof yok.
## KULLANICININ GORDUGU HATALAR (ekran goruntusu, dist/afunobet-ui.exe 13:40)
1. Pencere iceriginden KUCUK: sag ve alt kenardan kirpiliyor ("Claude KORUNU...", "Tamam..." satirlari kesik, alt satir yok). Muhtemel kok neden: pencere boyutu PhysicalSize (island.rs ~220) ile CSS pikseli arasinda DPI olcek (scale_factor 125/150%) uyusmazligi, veya icerik pencereden genis. Kok nedeni bul (Windows scale_factor ile mantiksal/fiziksel boyut), duzelt; 100/125/150/175% olceklerde kirpilma olmadigini test et (headless viewport ile).
2. Ada ustte ORTALANMIYOR; sol uste yapismis, ekranin ust-merkezinden kayarak cikmiyor. Orijinal upstream konumlandirmasi (monitor ortasi, ust kenar) korunmali; monitor/DPI hesabini duzelt.
3. Karakter ve kart/sekmeler cakisiyor; karakter kartin soluna tasiyor, "!" efekti basliga biniyor. Duzen: sol karakter sutunu (sabit genislik), sag icerik; tasma yok; her metin tek satir ellipsis.
4. Ust satir "88/231 tamamlandi" ve +227 gorev eski kayitlari ana ekrana basiyor. Kural: ana ekranda yalniz aktif/duraklayan gorevler (en fazla 3 satir), tamamlananlar sayilir ama listelenmez; eski kayit listesi yok.
5. Hata kartinda ham dosya adi (GOREV_UYGULA.md) gorunuyor: dosya satiri yalniz proje icindeki kisa goreli yol veya gizli olsun; "Gorev tamamlanamadi - yeniden deneyin" tek cumle kalir ama aciklama ajan adini tekrar etmesin.
6. Sekmeler (CODEX GLM GEMINI OPENCODE) pil gorunumlu ama GLM soluk/tiklanamaz anlasilmiyor: aktif olmayan ajan acik gri, aktif vurgulu; sekmeler satir sonunda kirpilmasin.
7. Pencere kenarlari yuvarlak ada sekli; koseler seffaf; arka plana (masaustu) tasan kirpik/dikdortgen kalmasin.
Her duzeltme icin headless ekran goruntusu al (1x, 1.25x, 1.5x, 2x DPI; 1366x768 ve 1920x1080 monitor simulasyonu) ve kirpilma yok kaniti (icerik sinirlari <= pencere sinirlari testi) yaz.
## DEVAM (onceki gorevden eksikler)
AFU_CHANGES.md, 7 durum ekran goruntusu, kota hatasi duzeltmesi (Windows okuyucudan arayuze kaybolan kota mesaji), Claude kod taramasi, TEMIZDEN yeniden derleme, asil target/release exe ile dist/afunobet-ui.exe ayni SHA256, gercek Windows smoke testi maddeleri "dogrulanmadi" olarak listelenir.
Son satir tek satir JSON: {"karar":"TAMAM"|"RET","ozet":"...","dosyalar":[...],"test":"...","commit":"-"}
## EK (opencode icin)
- Codex kotasi dolu; bu isi opencode yapiyor. Derleme icin windows/ de: CARGO_NET_OFFLINE=true npm run build ve tauri build (bagimliliklar indirilmis). Cikti exe yi dist/afunobet-ui.exe ye kopyala.
- Her derlemeden SONRA su komutu calistir: powershell -File C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/kisayol_guncelle.ps1 (masaustu kisayolunu tazeler).
- Pencere boyutu/konum hatasini (kirpilma, sol ust) onceki iki ekran goruntusunden cikar: pencere icerikten kucuk; DPI scale_factor kontrolu zorunlu.
