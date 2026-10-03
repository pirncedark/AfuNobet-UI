SONUC: TAMAM

### Yapılan Değişiklikler ve Doğrulama

1. **TypeScript Hatası (`src/island/island.ts`)**:
   - `IslandViewName` tipine `"sor"` görünüm adı eklendi (`src/core/layout.ts`).

2. **Test Ortamı Hataları (`ReferenceError: window is not defined`)**:
   - `src/views/views.ts` constructor'ı içindeki `window.addEventListener` çağrısı `if (typeof window !== "undefined")` koşuluyla korundu.

3. **`toggle` Hatası (`TypeError: Cannot read properties of undefined (reading 'toggle')`)**:
   - Testlerde kullanılan mock `FakeElement` sınıfına sahte bir `classList` (içinde `toggle` fonksiyonu olan) eklendi (`tests/chat.test.ts`).

4. **"Afu'ya sor" Arayüzü Hataları (`tests/sor_ui.test.ts`)**:
   - `codexStatus` döngü değerinin çözümlenmesi düzeltildi; `raw.status === "hazir"` ve `raw === "hazir"` doğru bir biçimde desteklenecek şekilde mantık güncellendi (`src/sor/sor.ts`).

5. **`voiceHint` ve `cancelButton` Mantık Hataları (`tests/chat.test.ts`)**:
   - `this.cancelButton.hidden` koşulu eksik `this.responses?.speaking` durumunu içerecek şekilde düzenlendi.
   - `this.voiceHint.hidden`'ın gereksiz yere her `render()` çağrısında tetiklenip testlerde yan etki (ilk denemede gizlenme sorunu) oluşturması düzeltildi; yalnızca `onVoiceState` (durum değiştiğinde) değerlendirilecek şekilde taşındı.

### Doğrulama Sonuçları
- **`tsc`**: 0 hata
- **`npm test`**: Tüm testler geçti (385 başarılı, 32 dosya)
- **`cargo test --offline`**: Tüm testler geçti (242 başarılı, 0 hata, 4 atlanan)