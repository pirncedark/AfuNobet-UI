# GOREV A14: Afu pet ve kart karelerini kaynak sayfalardan kes (OpenCode)

Calisma klasoru: C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI . Plan: docs/superpowers/plans/2026-10-01-afunobet-ui-tum-fazlar.md (Gorev A14). Codex ayni anda Faz A kodunu yaziyor: SADECE asagidaki dosyalara yaz, baska hicbir dosyaya (windows/src, windows/src-tauri, docs/ILERLEME_MASTER.md, GOREV_MASTER.md) DOKUNMA.

ZORUNLU ILERLEME: her adimdan sonra afu-character/KESIM_LOG.md dosyasina tek satir ekle: "HH:MM | adim | sonuc | siradaki". Ilk satiri ise baslamadan yaz.

## Yazabilecegin dosyalar
- windows/scripts/pet_kes.py (yeni)
- afu-character/kesim.json (yeni)
- afu-character/pet/*.png, afu-character/kart/*.png, afu-character/efekt/*.png, afu-character/simge/*.png|ico (yeni)
- afu-character/kesim-kontrol-*.png, afu-character/KESIM_LOG.md

## Kaynaklar (afu-character/kaynak/) ve cikti adlari
Izgaralar: hucreler arasinda ince beyaz cizgi var; hucre sinirini beyaz cizgiden tespit et, sabit bolme kullanma.
1. pet_durumlar_4x4.png (1254, 4x4, yesil zemin, gri cita): soldan saga ustten alta -> pet/idle_normal, idle_nefes, idle_goz_kapali, idle_bakis_a, idle_bakis_b, akis_bekleme, tepki_mutlu, tepki_dusunme, tepki_uyari, tepki_hata, tepki_uyku, tepki_basari, tepki_goz_kirpma, tepki_dinleme, tepki_konusma, uyan_yuzme. idle_bakis_a/b: goz bebegi konumunu olc; sola bakan idle_sol, saga bakan idle_sag olarak yeniden adlandir.
2. pet_gecis_3x3.png (1254, 3x3): 1 akis_normal (citasiz), 2 akis_kuculme (citasiz), 3 akis_suzulme (citasiz), 4 akis_gorunme, 5 akis_tutunma, 6 uyan_gizli, 7 uyan_gozukme, 8 uyan_yukselme, 9 simge/simge_kaynak (citasiz bas).
3. kart_3x3.png (1254, 3x3, citasiz): kart/idle, kart/calisiyor, kart/dusunme, kart/bekleme_kota, kart/basari, kart/hata, kart/selam, kart/dinleme, kart/konusma.
4. efektler_3x3.png (1254, 3x3, karaktersiz): efekt/unlem, efekt/soru, efekt/uyku_z, efekt/parilti, efekt/tik, efekt/kalp, efekt/ses_dalgasi, efekt/konusma_balonu, efekt/bas_donmesi.
5. ozel_2x3.png (1536x1024, 3 sutun x 2 satir, citali): pet/ozel_bas_donmesi, pet/ozel_dosya_yakala, pet/ozel_dosya_tut, pet/ozel_veda, pet/ozel_sessiz, pet/ozel_yogun.
6. uygulama_simgesi.png (1254, RGBA, disi zaten saydam): simge/uygulama.ico (16, 24, 32, 48, 64, 128, 256 icerir) + simge/uygulama_256.png. Yesil anahtarlama YAPMA (yesil yok).
7. simge/simge_kaynak.png -> simge/durum_16.png, durum_32.png, durum_64.png (bildirim alani simgesi tabani; yesil anahtarla, sonra kucult).

## Kesim kurallari
- Arka plan duz yesil (#00B140 civari): yesil anahtarlama (HSV veya G kanali baskinligi) + kenarda yesil tasmasi temizligi (spill suppression: kenar piksellerinde G yi max(R,B) ile sinirla). rembg KULLANMA (gerek yok).
- Citali karelerde cita (acik gri, R~G~B > 190) her hucrede ayri tespit edilir; citanin ust kenari karenin ALT kenari olur (cita kesilir, eller kalir). Bulunamazsa ayni satirdaki diger hucrelerin ortalamasi.
- Hizalama: ayni gruptaki kareler ayni tuval boyutunda (grup icindeki en buyuk sinirlayici kutu + 8 px pay), karakter yatayda ortali, citali karelerde alt kenar = cita cizgisi. Ofsetler kesim.json da.
- Olcek kucultme YOK (simge haric). Yeni cizim YOK, renk degistirme YOK.
- Efektler (efektler_3x3) tek tek kesilir; karakter karelerindeki efektler karede kalir.

## Dogrulama (--dogrula, cikis kodu 1 = basarisiz)
- Beklenen 50 karenin hepsi var: pet 16+5+3+6=30... (pet: 16 + akis 5 + uyan 3 + ozel 6 = 30), kart 9, efekt 9, simge 2 (+ico) = 50.
- Her kare RGBA; dort kose alfa < 10; opak alan hucrenin yuzde 15 inden buyuk (efektler yuzde 5).
- Yesil artigi: opak piksellerin yuzde 0.5 inden azinda G > R+40 ve G > B+40.
- Citali gruplarda alt 3 satirda en az 20 opak piksel.
- Grup ici tuval boyutlari esit.
- kesim-kontrol-pet.png, kesim-kontrol-kart.png, kesim-kontrol-efekt.png: kareler dama zemin uzerinde, altinda adlari.

Komut: python windows/scripts/pet_kes.py && python windows/scripts/pet_kes.py --dogrula -> "PASS 50/50".
Yeni pencere ACMA, commit etme, apostrof yok, internet yok (Pillow ve numpy kurulu).
Son satir tek satir JSON: {"karar":"TAMAM"|"RET","ozet":"...","dosyalar":[...],"test":"PASS n/50","commit":"-"}
