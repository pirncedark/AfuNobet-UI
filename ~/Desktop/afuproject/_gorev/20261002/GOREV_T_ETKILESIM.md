# GÖREV (GEMINI-ETKILESIM) — önce C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\ORTAK_KURALLAR_TOPLU.md oku
Maddeler:
1. E6 dosyayı adaya/pete sürükle-bırak → aktif ajana bağlam (mevcut dosya bırakma B3 / dosya_yakalama sürükleme olayları main.ts'te var; bırakınca dosya yolu aktif Codex sohbetine eklenir; oturum yoksa tek cümle uyarı). Test.
2. Bağlı ama tetiklenmeyen animasyonları tetikle (SONUC_ANIM3.md): uyanma (uzun boşta sonrası ilk olay / kart açılış), veda/veda_yakin (küçültme/gizleme öncesi kısa), inis (pet görev çubuğuna inerken), inis_oturma (pet boşta oturma), yatay_suzulme (pet yer değiştirirken), kitap_selam (ilk açılış alternatifi). Tek seferlik oynat → sonra normal duruma dön. Test (sahte zamanlayıcı).
3. tests/character.test.ts "kompakt ve karşılama durumlarını doğru ayırır" testi kararsız (bazen düşüyor) — kök nedeni bul (zaman/sıra bağımlılığı), düzelt; 5 ardışık koşu yeşil.
4. Sahte test modu: AFUNOBET_UI_STATE ortam değişkeni verilirse state.json yolu o olsun (docs/SAHTE_TEST_MODU.md güncelle). Rust tarafı gerekiyorsa lib.rs'e küçük ekleme.
Kanıtsız "yaptım" deme: her madde için dosya:satır ve test adı yaz.
Log: log/gemini_etkilesim.log  Çıktı: SONUC_T_ETKILESIM.md
