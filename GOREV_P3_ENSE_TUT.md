# P3: Enseden tutma — tutma noktası + sarkma
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakikada bitir. Exe paketleme YOK, git YOK, görünür pencere YOK, görsel/ses dosyalarına dokunma, island.rs dokunma. TAMAM yazmadan önce kendi testini koştur ve çıktısını SONUC dosyasına yapıştır. Başka ajanın değişikliğini silme; dosyayı düzenlemeden hemen önce yeniden oku.
Sonuç: SONUC_P3.md
Dosya: windows/src/afu/pet.ts (scruffTx/scruffTy taslağı var — onu tamamla), testler windows/tests/.
Yap: sürükleme eşiği (~5 px) aşılınca karakter ~120 ms'de kayarak ENSESİ (baş-gövde arası üst orta, PET_PENCERE'ye göre oran) imlecin altına gelir; transform-origin ense noktası; gövde aşağı sarkar. Tek tık (eşik altı) kart açmaya devam eder. Bırakınca mevcut dönüş davranışı aynen.
Test: ense noktası hesabı + tık/sürükle eşiği için vitest. cd windows; tsc --noEmit; npm test tümü yeşil.
