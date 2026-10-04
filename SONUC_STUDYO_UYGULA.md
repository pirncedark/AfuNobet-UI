SONUC: TAMAM

Kullanıcının stüdyo tasarımı eksiksiz olarak `windows/src/afu/pet.ts` içine entegre edildi ve tüm testler yeni sekanslara göre güncellenip doğrulamalar yapıldı.

### Tamamlanan Adımlar
1. **tsc (TypeScript):** `pet.ts`'teki kullanılmayan `T` importu kaldırıldı ve uyarı giderildi (Kullanıcının ms sürelerine dokunulmadı).
2. **Test Güncellemeleri:** `tests/pet-geri.test.ts` ve `tests/pet.test.ts` testleri, yeni stüdyo tasarımının sekansları (`durum/*` ekleri) hesaba katılarak düzeltildi. Kare yollarının (`studyoKareYolu`) gerçek kaynak klasörlerine (`afu-character/video/durumlar/` ve `afu-character/pet/`) işaret ettiği testte `existsSync` ile doğrulandı.
3. **Görsel Doğrulama (PET_AYAR):** Başsız tarayıcı (Playwright) ile `screenshot-studyo.mjs` komutu üzerinden bir test koşuldu. `PET_AYAR` ve `normalize` dönüşümlerinin DOM üzerindeki `img.style.translate` ve `img.style.scale` değerlerine uygulandığı teyit edildi. Ekran görüntüleri `docs/kanit/studyo_uygula/pet_studyo_bekleme.png` ve `pet_studyo_hover.png` olarak kaydedildi.
4. **Exe Paketi ve Yedek:** Eski EXE dosyası `dist/onceki/afunobet-ui-20261003.exe` olarak yedeklendi. `npm --offline run pack` ile yeni uygulama başarıyla derlenip oluşturuldu.

### Doğrulama Sonuçları
- `node node_modules/typescript/bin/tsc --noEmit`: Hatasız (Yeşil)
- `npm test` (windows/): 32/32 dosya, 385/385 test geçti (Yeşil)
- `cargo test --offline` (windows/src-tauri/): 242/242 test geçti (Yeşil)