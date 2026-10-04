# GOREV: Gercek pencerede icerik kayboluyor - geri getir ve kanitla
Once GOREV_COUCOU_AFU.md, GOREV_COUCOU_UX.md, CLAUDE.md oku. Sandbox internetsiz (CARGO_NET_OFFLINE=true). Yeni pencere ACMA, commit etme, apostrof yok.
## Kullanici bulgusu (gercek exe, masaustu kisayolu, 14:26 derlemesi)
Pencere artik kirpilmiyor ve yuvarlak, AMA: 1) kart gövdesi yok: yalniz "CODEX - AfuNobet" baslik satiri ve ~18px yukseklikte bir serit gorunuyor (gorev adi, mesaj, dosya, yuzde yok); 2) alttaki "Kota durumu" ve "Kucult" dugmeleri (kullanicinin dedigi opsiyonlar) YOK; 3) "0/5 tamamlandi" sayaci dogru. Kullanici: icerik gitti, geri getir.
## Benim bulgularim
- scripts/screenshots.mjs ile (sahte durum) 720x320 ta icerik DOGRU gorunuyor: kart, satirlar, dugmeler var. Yani hata gercek veriye veya gercek webview olcusune bagli. Gercek durum dosyasi: C:/Users/afuuu/Desktop/afuproject/AfuNobet/state.json (234 kayit; Codex ve AfuNobet projeli kayitlar var). Bu gercek dosyayi harness a ver ve bozulmayi UYGULAMA ICINDE yeniden uret.
- Gemini style.css i 1455 satirdan 95 satira indirdi; .task-row, .other-tasks satirlari stilsiz (gri varsayilan dugme, "Bekliyor" yazisi basliga yapisik). Stilleri geri kur.
- .main-task height:96px sabit; gercekte ~18px gorunuyor -> flex/grid sikismasi veya --fit olcegi veya webview yuksekligi suphesi. #content overflow:hidden iken footer disarida kaliyor olabilir. Kok nedeni bul.
- scripts/screenshots.mjs su an "busy" durumunda bozuk: ozet artik "0/5 tamamlandi" oldugu icin /^\d{1,2}\/\d{1,2}$/ beklentisi basarisiz; testi yeni metne uyarla (davranisi bozma).
- CLAUDE.md "island.rs byte-for-byte unchanged" diyor ama OpenCode island.rs yi degistirdi (target_monitor_or_default, usable_scale). Bu degisiklik sol-ust konum hatasini cozuyor olabilir. Git HEAD ile farki incele; geri alma veya CLAUDE.md kuralini guncelleyip AFU_CHANGES.md de gerekce yazma kararini testle ver. Konum hatasini geri getirme.
## Kabul
- Gercek state.json ile 1x,1.25x,1.5x,2x ve 1366x768 ekran goruntuleri: kart govdesi (ad, mesaj, ilerleme), en fazla 3 satir, "Kota durumu" ve "Kucult" dugmeleri GORUNUR; icerik pencere sinirlari icinde (olcum testi).
- Boyut/kirpilma icin: icerik toplam yuksekligi <= pencere yuksekligi; sigmayorsa satir sayisi dinamik azalir ama dugmeler her zaman gorunur.
- AFU_CHANGES.md (yoksa olustur: upstream e gore degisen/korunan dosyalar, gercek Windows smoke testi maddeleri DOGRULANMADI olarak), npm run build + tauri build, exe yi dist/afunobet-ui-coucou.exe ye kopyala, SHA256 asil ile ayni, sonra powershell -File C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/kisayol_guncelle.ps1 calistir.
Son satir tek satir JSON: {"karar":"TAMAM"|"RET","ozet":"...","dosyalar":[...],"test":"...","commit":"-"}
