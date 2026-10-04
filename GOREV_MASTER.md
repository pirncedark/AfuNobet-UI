
## Güncel kullanıcı kararı — seçenek 2

Kullanıcı "2 den devam" mesajıyla paketli uygulama ve çevrimiçi Windows SpeechRecognizer yedeğini seçti. Whisper mevcutsa önceliklidir; yerel model yoksa Windows yedeği kullanılır. Bu karar eski tek-exe/yalnız yerel STT tercihinin yerine geçer. İlk kullanımda internet kullanımı açıklanır; bas-konuş açık kullanıcı hareketiyle başlar, metin otomatik gönderilmez. Ücretli OpenAI API yedeği eklenmez. Gerçek mikrofon, çevrimiçi tanıma ve Windows kabul kapıları hâlâ kullanıcı testi olarak doğrulanacaktır. Önceki karar bekleniyor/engel kayıtları tarihsel durumdur; bu karar geliştirmeyi yeniden başlatır.

Uygulama ve MSIX hazırlığı sürüyor; tamamlandı/PASS iddiası henüz yok.

# Güncel yetki ve durum — 1 Ekim 2026

Kullanıcı bu dosyadaki eski A-only kilidinden sonra tüm planı sürdürme ve paralel çalışma yetkisi verdi. Güncel kapsam A→C→B geliştirmesi ve doğrulamadır. Gerçek Windows kabulü UNVERIFIED; bu kapılar/yayın tamamlanmış sayılmaz. Koşullu D tetiklenmedi. Commit/push/merge/release yapılmaz. Güncel kanıt: docs/DEVAM_2026-10-01.md; geçmiş: docs/ILERLEME_MASTER.md.

---

# GOREV MASTER: AfuNobet UI - Coucou ozellik esdegerligi + Codex sohbet + ses
## UYGULAMA PLANI (zorunlu)
Adim adim plan: docs/superpowers/plans/2026-10-01-afunobet-ui-tum-fazlar.md . Bu turda yalniz Faz 0 kontrolu + Faz A gorevleri (A1..A19; A4 = mini pet + durum simgesi) sirayla; her gorevdeki testi once yaz, sonra uygula. Plandaki Karar Bekleyen Konular a dokunma.

## KAPSAM KILIDI (en uste, hepsinden once)
Bu is YALNIZ FAZ A yi kapsar (A1, A2, A3). FAZ B (bolum 8-11 ve 15: Codex sohbet, dosya birakma, ses) bu islerde YAPILMAZ; kullanici Faz A yi Windows da test edip "FAZ A = ACCEPTED" demeden baslamaz. Faz B metni bu dosyada yalniz gelecek referansidir, dokunma.
### Checkpointler (docs/ILERLEME_MASTER.md ye her birinin sonunda yaz: yapilan, test sonucu, kalan, sonraki adim)
- A1 = Coucou/FSM/pencere (bolum 2, 12, 13 tray)
- A2 = canli state + ajan pill + kota + event esleme (bolum 4-7) + state.json yenileyici
- A3 = karakter (bolum 3) + Turkce UTF-8 + dokuman + build + lisans taramasi + rapor
- A4 = mini pet: kucultulunce gorev cubugu ustunde bekleyen Afu (plan Gorev A14-A19; 34 kare, kaynak gorseller afu-character/kaynak/ (pet_teknik_sayfa.png dahil); pet kapatilinca sagda durum simgesi)
Kota/zaman asimi ile kesilirsen docs/ILERLEME_MASTER.md den kaldigin checkpointten devam et; repo kesfini bastan yapma.
### Faz A cikis kapisi (hepsi saglanmadan TAMAM deme)
state.json canli yenileme, hidden>petit>home, hover wake, tray, ajan sekmeleri, kota paneli, UTF-8 Turkce, karakter durumlari ve tum otomatik testler yesil. Gercek always-on-top, click-through, DPI, hover/tray gercek tiklama gibi Windows testleri Codex tarafindan PASS yazilamaz: durum UNVERIFIED, kullanici testi listesinde kalir.
### state.json yenileyici sartlari (A2)
Uretici ile goruntuleyici AYRI kalir; UI veri URETMEZ. Yenileyici: tek instance (kilit dosyasi/mutex), atomik yazma (tmp + replace), hata olursa son gecerli state.json i KORUR (bozuk/bos dosya yazmaz), DB yi salt-okur acar, AfuNobet motoruna dokunmaz, otomatik baslatmaya KAYDEDILMEZ.
### Bagimlilik kurali
Paket yuklemeye veya internetten binary cekmeye KALKMA. Eksik varsa tam paket adi, surumu ve neden gerektigini raporla (BLOCKED); kullanici Claude tarafinda indirir.
### Faz B icin not (simdilik uygulama)
Codex app-server bulunamazsa kendi protokolunu UYDURMA: yerel codex --help, kurulu dosyalar ve binary uzerinden dogrula; bulunamazsa BLOCKED/DOGRULANMADI yaz.
Repo: C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI (upstream Louis-CFM/coucou, MIT). Once CLAUDE.md, AFU_CHANGES.md (varsa), GOREV_COUCOU_AFU.md, GOREV_COUCOU_UX.md, GOREV_COUCOU_ICERIK.md oku. Mevcut calisan UI tasarimini bozma. Once upstream ile farki incele, KISA PLAN yaz, sonra uygula, test et, raporla.
## KOSULLAR (zorunlu)
- Sandbox internetsiz: CARGO_NET_OFFLINE=true, npm --offline. Indirme gerekiyorsa DUR ve hangi paket oldugunu raporla (kullanici Claude tarafinda onceden indirir). Bagimlilik ekleme.
- YENI PENCERE ACMA, exe calistirma. Gercek Windows smoke testi, OAuth girisi ve ses/mikrofon gercek testi Codex tarafindan YAPILAMAZ: bunlar "KULLANICI TESTI" listesine yazilir, PASS sayilmaz. Mock/birim/headless testi PASS olabilir ama etiketi "headless" olur.
- Codex app-server / OAuth ayrintilari (RPC adlari, ChatGPT oturumu) internetten dogrulanamaz. Yerel Codex kurulumundan (codex --help, codex app-server --help, varsa uretilen sema: codex app-server generate-json-schema) kesfet; dogrulanamayani "DOGRULANMADI" yaz, uydurma.
- Is cok buyuk: FAZ A ve FAZ B olarak ayri bitir. FAZ A bitip testleri gecmeden FAZ B ye gecme. Her fazin sonunda ara rapor satiri yaz (docs/ILERLEME_MASTER.md). Zaman asimi olursa kaldigin yerden devam edilecek.
- COMMIT YOK, PUSH YOK. Eski calisan exe yi korusuz silme. Apostrof yok. Turkce arayuz metinleri UTF-8 ve DOGRU Turkce karakterli (Gorev degil Görev; duraklatildi degil duraklatıldı).
## 1. CLAUDE KESIN KURAL
Claude: API yok, process baslatma yok, hook kurma yok, chat yok, fallback yok, otomatik ajan yok. UI da yalniz "🔒 Claude KORUNUYOR". Kod taramasi ile kanitla.
## FAZ A - Coucou parity + canli durum
2. Island: hidden->petit->home FSM (karsilama "Afu yaninda"), hover wake, home->petit 15sn, petit->hidden 60sn, pinned uyari (kota/hata/bekleyen), force home/petit/hidden; Windows: seffaf, always-on-top, taskbar ve Alt-Tab disi, odak calmama (non-activating), ust-orta konum, island disi click-through, island sekli hit-test, fare izleme (hidden iken poll park), monitor/DPI degisince yeniden konum, Esc ile kucult, tray Ac / Bildirimleri duraklat / Cikis. Upstream island.rs davranisini koru; island.rs degisikligini AFU_CHANGES.md de gerekcelendir (CLAUDE.md kuralini guncelle).
3. Afu karakter: afu-character/ assetleri; yeni cizim YOK, CSS/transform ile. Durumlar: idle, listening, thinking, working, speaking, waiting, alert, paused, success, error. Animasyon: nefes, goz kirpma, hafif imlec takibi, hover tepkisi, tik squash, 3 hizli tik = kisa dizzy, 2sn hover = kucuk pozitif tepki, thinking ?, kota !, success ziplama+tik+parilti, error kisa sarsinti, gecislerde flicker yok. Mochi/Coucou ikon, ses, medya KULLANMA.
4. Canli state: state.json salt-okunur izle, yeniden baslatmadan guncelle. CODEX GLM GEMINI OPENCODE; goster: agent, model, proje, gorev basligi, aksiyon, aktif dosya, ilerleme, gecen sure, durum. Baslik onceligi: task.title > current_action > description > job adi > "Görev". En fazla 3 guncel alt gorev; eski biten yuzlerce kayit ana gorunumde birikmez. Dosya yok/bozuk/yarim/eski: crash YOK, son gecerli state korunur, hic yoksa "AfuNöbet bekleniyor". Ek: state.json kendiliginden yenilenmiyor (son uretim 10:43). AfuNobet motoruna DOKUNMADAN, AfuNobet/afu/ui_state.py yi periyodik (ornegin 15 sn) cagiran, tek ornek (kilitli), salt-okur DB okuyan kucuk bir yenileyici yaz (yeni dosya, ornegin AfuNobet/afu/ui_state_loop.py) ve baslatma/durdurma komutu docs a yaz; otomatik baslatmayi KAYDETME, kullaniciya birak.
5. Ajan pill leri: aktif parlak, pasif soluk, gorevsiz disabled; pill tiki o ajanin isini, satir tiki gorevi odaklar.
6. Kota: mevcut quota cache/refresher i tuket (yeni refresher YAZMA); provider, yuzde, reset, son yenileme, stale; gercek deger yoksa "—", TAHMIN YOK. Kota paneli <-> Gorevlere don. Claude kotasi sorgulama YOK.
7. Event esleme: JOB_STARTED/FILE_EDIT/COMMAND->working, WAITING->thinking, RATE_LIMIT->alert/paused, JOB_FINISHED->success, JOB_FAILED->error, is yok->idle. Success/error rozeti kisa sure. Ham stacktrace/429/exception ana UI da gorunmez; tek cumle insan mesaji.
12. Terminal/Proje: aktif gorev icin calisma klasoru/job id/ajan biliniyorsa "Projeyi ac" (explorer ile klasor); terminal odagi guvenilir degilse klasor ac; basarisizlikta sessiz cokme yok.
13. Tray: Ac / Bildirimleri duraklat / Cikis. Duraklat yalniz UI bildirim ve gosterimini durdurur, ajanlari OLDURMEZ. Cikis yalniz UI yi kapatir.
16-18 (FAZ A kapsami). Performans: hidden minimum CPU, timer/poller sizintisi yok, orphan process yok. Testler (birim/entegrasyon): FSM, timer, state parser, bozuk/eksik/yarim/eski JSON, gorev basligi fallback, kota stale, event esleme. Lisans taramasi: build te Mochi/Coucou ikon/ses/medya yok, MIT atif korunur.
## FAZ B - Codex sohbet + dosya + ses (FAZ A tamamen yesil olunca)
8. Sohbet gorunumu: yerel Codex app-server (stdin/stdout JSON-RPC) uzerinden, ChatGPT oturumu ile. API key ISTEME; ucretli API ye sessiz fallback YOK. Akis (kesfet, dogrula): initialize/initialized, model/list, thread/start, thread/resume, turn/start, agentMessage delta, turn/completed. Streaming cevap. Thread id guvenli saklanabilir. Baglam: aktif job id, state.json ozeti, proje, dosya, gorev durumu, log OZETI (devasa logu koyma). Oturum yoksa: "Codex oturumu açık değil." Claude fallback YOK. Tek yasam dongusu yoneticisi, gereksiz yeni process yok. Mock ile test et; gercek OAuth KULLANICI TESTI.
9. Dosya birakma: island a birakilan dosya otomatik gonderilmez/yuklenmez; sohbette Codex baglam eki olarak gorunur, kullanici gonderince eklenir; karakter drop animasyonu.
10. Ses V1: bas-konus (hot mic YOK): Windows yerel STT -> metin -> Codex app-server -> streaming cevap -> Windows yerel TTS. OpenAI Realtime/Transcription API KULLANMA. Durumlar: mic listening, STT thinking, Codex working, TTS speaking. TTS tek dugmeyle kapatilabilir; gelismis ayar paneli YOK. Konusma bitince mikrofon birakilir. Windows API erisimi mevcut bagimlilikla (windows crate vb.) saglanamiyorsa DUR, hangi paket gerektigini raporla.
11. Sesli bildirim: onemli eventlerde kisa cumleler ("Codex görevi tamamladı."); tekrar/spam yok (dedup + cooldown).
15. Gizlilik: telemetri yok; OAuth token loglanmaz/gosterilmez; Windows Credential Manager veya guvenli saklama; dosya disari gonderilmez.
## TESLIM
AFU_CHANGES.md guncelle; docs/KULLANIM_REHBERI.html YALNIZ dogrulanmis davranislari anlatsin (sadece yeni ozellikler PASS ise ekle; dogrulanmamis olani "dogrulanmadi" ile isaretli birak). Temiz derle: windows/ de npm run build ve CARGO_NET_OFFLINE=true npx tauri build --no-bundle; target/release/afunobet-ui.exe yi dist/afunobet-ui-coucou.exe ye kopyala (exe acik/kilitliyse Copy-Item hata verir: o durumda dist/afunobet-ui-coucou-yeni.exe olarak koy ve raporla); SHA256 esit olmali; sonra powershell -File C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/kisayol_guncelle.ps1 calistir.
## SON RAPOR
Her ozellik PASS / FAIL / PARTIAL / KULLANICI-TESTI-GEREKIR; "kod yazildi" PASS degildir. Degisen dosyalar, korunan upstream dosyalar, bilinen sinirlar, hashler, kod taramasi sonucu (Anthropic/Claude cagrisi yok).
Son satir tek satir JSON: {"karar":"TAMAM"|"KISMI"|"RET","ozet":"...","dosyalar":[...],"test":"...","commit":"-"}
## CHECKPOINT TAMAMLANMA KURALI (kesin)
A1/A2/A3 "tamamlandi" demek icin: ilgili otomatik testler yesil + build basarili + docs/ILERLEME_MASTER.md guncel (zaman damgali). Yalniz kod yazilmasi yetmez. Gercek Windows davranislari (always-on-top, click-through, DPI, hover wake, tray tiklama) kullanici test edene kadar UNVERIFIED kalir.
## KOTA KESERSE (STOP kurali)
Mevcut checkpoint i docs/ILERLEME_MASTER.md ye kaydet: hangi dosyada kaldin, hangi test kaldi, sonraki adim. Sonraki oturum ayni checkpoint ten devam eder.
## ONCEDEN YAPILAN PREFLIGHT (15:5x, Claude)
python -m afu.ui_state gecerli JSON uretiyor (242 kayit: 96 Duraklatildi, 92 Tamamlandi, 54 Hata, 0 Calisiyor). Masaustu exe 14:35 tarihli, kisayol dist/afunobet-ui-coucou.exe yi gosteriyor. docs/KULLANIM_REHBERI.html mevcut. Not: hic Calisiyor kaydi yok; canli gorev kartini test etmek icin test verisi (fixture) kullan.

## KAYNAK EKI (15:53)
afu-character/kaynak/pet_gecis_3x3.png geldi (3x3): 1 normal ayakta, 2 kuculme top, 3 suzulme (sola ucuyor), 4 gorunme gozler, 5 tutunma, 6 uyan gizli, 7 uyan gozler, 8 uyan yukselme, 9 durum simgesi. Plan A14 B/C/D grubu bu sayfadan kesilir (akis_*, uyan_*, pet/simge.png).
Not: AfuNobet deposunda baska bir oturum afu/supervisor/quota_refresher.py uzerinde calisiyor; quota_* dosyalarina DOKUNMA. Masaustu AfuNobet UI acik olabilir; dist exe kilitliyse -yeni.exe kuralini uygula.

## A14 DEVRI (16:12)
A14 (kare kesimi) OpenCode tarafindan GOREV_A14_KESIM.md ile ayri yapiliyor. Codex: windows/scripts/pet_kes.py, afu-character/pet|kart|efekt|simge ve kesim.json dosyalarina YAZMA. A14 e geldiginde yalniz afu-character/KESIM_LOG.md ve pet_kes.py --dogrula sonucunu kontrol et; PASS ise A14 TAMAM say, degilse ILERLEME ye not dus ve A15 e gec. Kare adlari GOREV_A14_KESIM.md de; A17 SEKANSLAR bu adlari kullanir (idle_sol/idle_sag, tepki_hata, tepki_dinleme, tepki_konusma, ozel_*, kart/*, efekt/*). Uygulama simgesi: afu-character/simge/uygulama.ico (A13 exe simgesi).

## A14 DEVRI IPTAL (16:16)
OpenCode A14 u yapmadi (hic dosya uretmedi). A14 yine Codexindir: GOREV_A14_KESIM.md deki kaynak eslemesi, cikti adlari ve dogrulama kurallarini aynen uygula (50 kare, yesil anahtarlama, cita hizalama). Yukaridaki "A14 DEVRI" notu gecersiz.
