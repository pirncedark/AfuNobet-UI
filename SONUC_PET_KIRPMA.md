SONUC: TAMAM

Pet pencere boyutu büyütülmedi: 128×128 mantıksal piksel korunuyor. Karakterin çizim alanı 104×104 piksele küçültüldü; dört tarafta 12 piksel pay bırakıldı. `object-fit: contain` ve merkez konumu bütün animasyon çerçevesini sığdırıyor. Dar webview’da pet kutusu da pencereye sığıyor; 9 piksel zıplama ve yatay hareket kenarlardan taşmıyor.

Pet’in konumu monitörün fiziksel çalışma alanına göre sınırlandırılıyor. Görev çubuğu, monitör başlangıcı ve DPI hesaba katılıyor; başka monitördeki ana görev çubuğunun koordinatları pet’i çalışma alanı dışına itemiyor.

27 WebP’nin 1520 karesinin tamamında şeffaf alfa bulundu. Görseller yeniden sıkıştırılmadı, boyutlandırılmadı veya silinmedi. CSS arka planı ve WebView2 arka planı şeffaf olarak ayarlandı. Pet aktifken ada ve uyandırma şeridi derhal gizleniyor; ada kenarlığının yeniden boyutlandırma sırasında kafa üzerinde ince çizgi olarak kalması engellendi. Başsız tarayıcı görüntülerinde çizgi ve opak arka plan görülmedi.

Değiştirilen dosyalar:

- `windows/src/afu/pet.ts`
- `windows/src/style.css` (yalnız pet kuralları; diğer çalışmanın stilleri korundu)
- `windows/src-tauri/src/glide.rs`
- `windows/src-tauri/src/taskbar.rs`
- `windows/tests/pet-kirpma.test.ts`

Doğrulama:

- `tsc --noEmit`: başarılı, 0 hata.
- `npm test`: 29 dosya, 358 test başarılı, 0 başarısız.
- `cargo test --offline`: tüm paketlerde toplam 238 test başarılı, 0 başarısız, 4 mevcut test atlandı. Rust derlemesindeki mevcut uyarılar logda korunmuştur.
- Yerleşim birim testi: %100/%125/%150 DPI; 128/160/192 fiziksel piksel; 40/48/72 piksel görev çubuğu yüksekliği; negatif monitör başlangıcı ve başka monitördeki görev çubuğu.
- Tarayıcı regresyon testi düzeltmeden önce `left=-24` ile başarısız oldu, düzeltmeden sonra geçti. 80/102/128 piksel viewport’ta çerçeve, hareket payı, şeffaflık ve ada çiziminin gizlenmesi doğrulandı.
- Görsel bütünlüğü: `assets-after.json` içinde checksum karşılaştırması; değişen/silinen dosya yok. Bu karşılaştırmanın başlangıcı kod düzenlemelerinden sonra, paketlemeden öncedir; kod düzenlemeleri sırasında görsellere hiçbir yazma işlemi yapılmadı.

Paketleme:

- Paketleme öncesinde aktif cargo/rustc süreci yoktu; süreç komut satırı sorgusu sistemce reddedildi. Önceki EXE 23:40:32 tarihliydi. Diğer işin raporuna dokunulmadı.
- Yedek: `dist/onceki/afunobet-ui-20261002-234937.exe`.
- `windows/` içinde `npm --offline run pack`: başarılı, çıkış kodu 0.
- Yeni EXE: `dist/afunobet-ui.exe`.
- SHA256: `d72914dce326a1e9fa764bfb6584444a26d1e30b57234f8c2e353659aa879860`.
- Paketlenen EXE ile `windows/target/release/afunobet-ui.exe` birebir aynı.
- Kısayol değiştirilmedi; görevde belirtildiği üzere Claude güncelleyecek.

Kanıtlar: `docs/kanit/pet_kirpma/log.txt`, `tsc.txt`, `npm-test.txt`, `cargo-test.txt`, `pack.txt`, `alpha.json`, `assets-before.json`, `assets-after.json`, `pet-80px.png`, `pet-102px.png`, `pet-128px.png`.

Doğrulama sınırı: görünür pencere açma yasağı nedeniyle yeni EXE masaüstünde çalıştırılmadı; görsel doğrulama başsız Chromium’da yapıldı. Tam sığdırma kaynak animasyon çerçevesinin tamamı içindir: bazı kaynak karelerde çizim zaten alt/üst dosya kenarına dayanıyor. Kaynak dosyada bulunmayan beden/saç parçaları ölçeklemeyle geri getirilemez; görselleri değiştirme yasağı korundu. Git kullanılmadı, ses dosyalarına dokunulmadı.
