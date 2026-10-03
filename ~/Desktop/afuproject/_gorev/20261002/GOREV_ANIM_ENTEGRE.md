# GÖREV (gemini pro): Yeni Afu durum animasyonlarını uygulamaya bağla + premium görünüm

Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Kullanıcı onayladı ("çok güzel olmuş"). Önizleme: https://claude.ai/artifact/2xHFEie7hYkRtuoLxsMXUx (referans görünüm).
Kaynak: afu-character/video/durumlar/*.webp (14 animasyon, şeffaf, 15 fps, 420 px yükseklik; renkler referansa göre ayarlı).

1. Animasyonları windows/public/afu/durum/ altına kopyala (orijinaller kalsın). windows/public/afu/pet/ ve afu-character/pet/'e DOKUNMA (orada Codex pet kesim testini düzeltiyor).
2. Büyük karakter (kart) ifadeleri için eşleme (windows/src/core/state.ts expressionFor ve karakter bileşeni; mevcut yapıyı oku, en küçük değişiklik):
   - idle → bosta_nefes.webp · working → dusunme.webp (Hazirlaniyor/Bekliyor) / kitap_buyu.webp (Calisiyor) · success → basari.webp (kısa: gulumseme.webp) · question/Duraklatildi/soru bekliyor → sasirma.webp · error → mevcut hata görseli (yeni yok) · uzun boşta → uyku_masa.webp · bas-konuş açık → dinleme.webp · ilk açılış/karşılama → selam_masa.webp.
   Mevcut statik görseller yedek olarak kalsın (animasyon yüklenemezse statik).
3. Premium görünüm (yalnız CSS/render; görselleri değiştirme): merkezi değişkenler --pet-brightness:1.11; --pet-saturation:1.18; --pet-contrast:1.06; --pet-glow (iki renkli hafif drop-shadow: sol mavi rgba(70,150,255,.16), sağ turuncu rgba(255,150,70,.14), alt gölge); --preview-bg (karakter arkasında radial-gradient aydınlanma). Durum vurgusu: working mavi, success altın, question amber, error kırmızı, idle nötr. Karakter alanında karartan overlay varsa azalt. Hover %2 büyüme 180–250 ms. prefers-reduced-motion'da hareket yok. Neon olmasın. Layout ve boyutlar bozulmasın.
4. Bellek/CPU: aynı anda yalnız görünen animasyon yüklü olsun (img src değişimi); gizli modlarda animasyon durur.
5. Testler (TDD): durum→animasyon eşleme testi; yedek statik görsel testi. `node node_modules/typescript/bin/tsc --noEmit` temiz + `npm test` + `cargo test --offline` (windows/ içinde) tamamı geçmeli.
Exe derleme YOK (pet kesim işi bitince ayrı teslim). GUI açma yok, commit/push yok, Claude çağırma.
Log: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\log\gemini_anim_entegre.log
Çıktı: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\SONUC_ANIM_ENTEGRE.md ilk satır SONUC: TAMAM|YARIM; dosya:satır + test adları.
