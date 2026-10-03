# GOREV (codex): Kullanicinin sectigi sesi (5b) her cevapta sabit varsayilan yap + exe derle

Calisma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI

Kullanici karari (2 Eki): ses_deneme/DINLE/5b_CODEX_canli_uzun_cevap.wav "cok iyi, bunu kullan".
5b'nin gercek ayari (ses_deneme/cikti/e2e.json 2. turn, voice_parameters): voice=notr, energy=sakin, exaggeration=0.35, cfg_weight=0.5, filter=sicak.
Su an enerji cevap uzunluguna gore degisiyor (kisa=enerjik 0.5, uzun=sakin 0.35). Kullanici bu sesi istiyor.

Yapilacak:
1. ses_deneme/afu_konus.py ve windows/ icindeki Afu sesi yolu: varsayilan ses = notr + sakin enerji (0.35/0.5) + sicak filtre; KISA ve UZUN tum cevaplarda ayni. Bunu adi acik bir varsayilan ses olarak tanimla (or. "afu_5b"); ses_deneme/ayar.json varsayilani buna gecsin. Uzunluga gore otomatik enerji degisimi varsayilan seste kapali (diger adaylar/gelismis secenek mevcut davranisini koruyabilir).
2. Ilk kullanim ses seciminde bu ses "Onerilen" ve secili gelsin; diger adaylar listede kalsin.
3. Testleri guncelle/ekle: python -B ses_deneme/test_sohbet.py, windows/ npm test, cargo test — hepsi gercekten kosulsun, sayilar raporda.
4. Exe: dist/afunobet-ui-coucou.exe'yi once dist/onceki/ icine yedekle (GERI_AL.ps1 korunur), sonra `node node_modules/@tauri-apps/cli/tauri.js build --no-bundle` + `node scripts/pack.mjs` (windows/ icinde). Yeni sha256'yi raporla. Derleme basarisizsa yedegi GERI_AL.ps1 ile geri koy.
5. Exe'yi ACMA (pencere yok); headless ses uretim kaniti (kisa bir cumle WAV) yeterli; WAV'in voice_parameters'inda 0.35/0.5/sicak oldugu gorulsun.

Yasak: git commit/push yok; yeni pencere yok; ses_adaylari/ ve afu-character/ dokunma; ucretli API yok.

Rapor: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\SONUC_SES_5B_SABIT.md — degisen dosyalar, test sayilari, sha256, kisa WAV yolu + parametreleri. Son satir: SONUC: TAMAM | SONUC: EKSIK - <neden>.
