# AfuNobet-UI

AfuNobet gorevlerini ekranin ustunde ve gorev cubugunda salt okunur izleyen Windows durum adasi ve mini pet uygulamasi.

Kaynak: [Louis-CFM/coucou](https://github.com/Louis-CFM/coucou), MIT.
Fork: pirncedark/AfuNobet-UI. Upstream LICENSE korunur.

Afu uzerine gelin, kucuk adaya dokunun ve gorevleri izleyin. Yeni is gelince ada gorunur. CODEX, GLM, GEMINI ve OPENCODE kayitlari gosterilir. Claude KORUNUYOR yalniz kilitli bir rozettir. Uygulama ajan calistirmaz veya durdurmaz.

## Ozellikler (Faz A — Dogrulandi)

- **Masaustu Durum Adasi (Ada Modu):** Ekranin ust ortasinda asili durur. En ustte kalir (`always-on-top`), baska pencereye odak kaybetmeden yazi yazilabilir, seffaf alanlar arkasindaki uygulamaya tiklama gecirir (`click-through`) ve Alt-Tab listesinde yer kaplamaz. Ekran olcegi (%100, %125, %150) degisse de kirpilmadan calisir.
- **Gorev Cubugu Mini Peti (A14–A19):** Kucult dugmesi veya Esc ile Afu karakteri ekranin ustunden suzulerek gorev cubuguna (Baslat yani) iner. Mini pete tiklayinca ana kart geri acilir. Fare yaklasinca selam verir, 5-10 dakika bosta uykuya gecer, 3 hizli tiklamada bas donmesi tepkisi gosterir.
- **Canli Durum ve Kota Takibi (A1–A10):** Ajan sekmeleri ve kotalar salt okunur `.ajan_kota.cache` uzerinden okunur. Guncel veri yoksa veya son kontrol belirsizse `-` gosterilir, sahte deger uretilmez. Claude icin kota okunmaz (kilitli rozet korunur).
- **Sistem Tepsisi Entegrasyonu (A18):** Sag alttaki Afu simgesine sag tiklayarak mini peti gizleyip gosterebilir, bildirimleri duraklatabilir veya uygulamadan cikabilirsiniz.
- **Faz B ve C Ozellikleri (Sohbet ve Ses):** Henuz yok / gelistirme asamasinda (Faz A kapsaminda aktif degildir).

## Veri

Varsayilan kaynak:
`C:/Users/afuuu/Desktop/afuproject/AfuNobet/state.json`

Uzman baslatma secenekleri: `AFUNOBET_UI_STATE` dogrudan kaynak dosyayi secer. `AFUNOBET_DB` belirtilirse ayni klasordeki `state.json` okunur. Dosya salt okunur acilir; dizin degisimi olaylari izlenir, periyodik dosya kontrolu yapilmaz. Eksik veya bozuk kaynakta son gecerli gorevler korunur ve Baglanti bekleniyor gosterilir. Tam yol, komut, ham hata, PID, port ve ozel bilgiler filtrelenir.

## Teslim ve Geri Alma

- **Teslim Calistirilabilir Dosyasi:** `dist/afunobet-ui-coucou.exe` (9.080.832 bayt, SHA256: `9828bd980efed101de39a8d80d28750d6fd85a60bbeb225e3ac9a7e2bfd3c246`).
- **Masaustu Kisayolu:** `C:/Users/afuuu/Desktop/AfuNobet UI.lnk` dogrudan bu teslim dosyasini hedefler.
- **Geri Alma (Rollback):** Onceki kar kararli surum `dist/onceki/afunobet-ui-coucou.exe` altinda korunur. Uygulama kapaliyken tek komutla geri alinabilir:
  ```powershell
  powershell -NoProfile -File dist/onceki/GERI_AL.ps1
  ```

## Gelistirme ve Dogrulama

Calisma dizini `windows`. Yerel bagimliliklar hazirken:

```powershell
$env:CARGO_NET_OFFLINE = "true"
$env:npm_config_offline = "true"
npm --offline test
npm --offline run build
cargo test --offline
npm --offline run screenshots
npm --offline run pack
```

`pack` ham Windows uygulamasini uretir; NSIS kurucusu veya WebView indirmez. Asil dosya `windows/target/release/afunobet-ui.exe`; teslim kopyasi `dist/afunobet-ui-coucou.exe`. `SHA256SUMS.txt` ve `build-manifest.json` kopya esitligini kaydeder. Uygulama kurulu Windows WebView2 ortaminda calisir. Eski `AfuNobet/dist/afunobet-ui.exe` bu projenin disindadir.

Test goruntuleri `windows/test-results/screenshots` ve `windows/test-results/pet-screenshots` klasorundedir. Bunlar basiniz (headless) ekran testleridir; gercek Windows her zaman ustte kalma, tiklama gecirme ve fare uzerinde bekleme kabul kontrolleri `docs/KAPI1_KONTROL_LISTESI.md` ile kullanici tarafindan dogrulanir. Ayrintilar `AFU_CHANGES.md` icindedir.

## Karakter

`afu-character/REFERANS.png` kullanici tarafindan saglanan resmi Afu kaynagidir. Guncel kesim sistemi bu kaynaktan 50 sozlesme karesi ve turevlerini uretir (34 pet durum karesi, 9 kart karesi, 9 efekt karesi ve durum simgeleri; sol/sag bakis dengeli). Yuz, beyin, renkler ve kiyafet yeniden cizilmez. `windows/scripts/pet_kes.py` mevcut Pillow, NumPy ve SciPy ile kayipsiz WebP/PNG uretimi saglar. Lisans kapsami `LICENSE-ASSETS.md` icindedir.
