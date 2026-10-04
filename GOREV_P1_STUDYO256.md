# P1: Stüdyo sahnesi 256 px
Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kurallar: KÜÇÜK iş, 8 dakikada bitir. Exe paketleme YOK, git YOK, görünür pencere YOK, görsel/ses dosyalarına dokunma, island.rs dokunma. TAMAM yazmadan önce kendi testini koştur ve çıktısını SONUC dosyasına yapıştır. Başka ajanın değişikliğini silme; dosyayı düzenlemeden hemen önce yeniden oku.
Sonuç: SONUC_P1.md
Uygulamada mini pet penceresi 128 → 256 px oldu (windows/src/core/layout.ts PET_PENCERE=256; PET_AYAR bekleme olcek=100).
Yap: studyo/animasyon_studyo.html sahnesindeki pet kutusu 256 px olsun (gerçek boyut önizleme); x/y ofset hesapları, "Ayaklar çubuğa değsin", "Boyutları eşitle" 256'ya göre çalışsın. studyo/uygula.py ve tests/test_studyo_uygula.py 256'ya uysun (128 sabiti kalmasın).
Test: python -m pytest -q tests/test_studyo_uygula.py tests/test_boyut_olc.py ; node ile HTML script bloklarını new Function ile derlet.
