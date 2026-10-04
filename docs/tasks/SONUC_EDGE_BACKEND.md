# Backend üst-kenar geri açılma sonucu

Yalnız windows/src-tauri/src/island.rs ve aynı dosyanın testleri değiştirildi.

- Sonsuz inactive condvar beklemesi 100 ms timeout ile değiştirildi. Aynı native thread hidden/pet/tray durumunda global kenarı kontrol eder; aktif cursor/click-through akışı 16 ms aralıkla sürer.
- Kenar alanı seçili monitörün fiziksel orijini, genişliği ve DPI değerinden hesaplanır (240 x 6 mantıksal piksel). Pet penceresinin alttaki konumu kullanılmaz.
- WINDOW_LABEL için edge-wake yalnız kenara girişte yayılır; sabit fare spam oluşturmaz. Çıkıp giriş yeni olay üretir. Sol tuş basılı giriş sürükleme sayılır ve bırakınca da aynı giriş yeniden tetiklenmez.
- Hidden durumda monitör her poll'da, aktif durumda ilk tick ve yaklaşık 480 ms aralıkla yenilenir; değişimde screen-changed sürer.

Gerçek komut: `cargo test --offline --lib edge_tests -- --nocapture`
Çıkış kodu: 0. Gerçek test çıkışı:

```text
running 3 tests
test island::edge_tests::edge_entry_rearms_only_after_exit_and_suppresses_drag ... ok
test island::edge_tests::edge_physical_origin_dpi_and_boundaries ... ok
test island::edge_tests::inactive_poll_returns_without_activation ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 156 filtered out; finished in 0.11s
```

Sınırlar: Gerçek masaüstü hidden/pet/tray, çoklu monitör ve sürükleme etkileşimi elle denenmedi; Windows etkileşim PASS iddiası yok. 100 ms örnekleme arası çok kısa kenar girişleri kaçabilir. Mevcut derleme uyarıları var, hata yok. Commit/push yapılmadı.
