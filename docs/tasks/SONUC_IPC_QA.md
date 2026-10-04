# IPC QA — çoklu satır testi

Yalnız ipc.rs içindeki tek_baglantida_coklu_satir_ve_satir_siniri test gövdesi değişti. Üretim IPC kodu değişmedi. İlk üç istek tek BufReader.get_mut üzerinden gönderilip her başarı yanıtı hemen read_line ile sırayla doğrulanıyor. Ardından limit aşan dördüncü/beşinci istek gönderiliyor; kapanış sonrası sıfır veya tek sinir bildirimi kabul ediliyor. İşlenen event sayısı kesin üç assert'i korundu.

İlk hedefli 5 tekrar denemesi ve eşzamanlı cargo test --offline çalıştırması kaynak derlemesinde durdu: dpi.rs:183 ile lib.rs:325 aynı kart_yukseklik tauri command makrolarını ürettiği için E0255/E0659. Test başlamadı; PASS iddiası yok. Sahiplik dışı dosyalar değiştirilmedi. İlgili ajan/root düzeltmesinden sonra doğrulama tekrarlanacak.

## Derleme engeli sonrası son doğrulama

İlgili frontend ajanı macro çakışmasını giderdikten sonra komutlar yeniden çalıştırıldı. İki komut aynı anda başlatıldı; Cargo derleme kilidi gereken bölümü sıraya aldı. Test harness normal paralel varsayılanıyla çalıştı.

Hedefli tekrar komutu:
```powershell
1..5 | ForEach-Object {
  cargo test --offline --lib tek_baglantida_coklu_satir_ve_satir_siniri -- --nocapture
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```
Sonuç: 5/5 tekrar geçti, komut exit 0. Her turda bir test geçti, başarısız yok. Gerçek ilk/son test özeti:
```text
test ipc::tests::tek_baglantida_coklu_satir_ve_satir_siniri ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 159 filtered out; finished in 0.12s
```

Tam doğrulama: `cargo test --offline` — exit 0. Lib harness 160 test ve tüm integration/doc test ikilileri tamamlandı; başarısız test yok. Mevcut gerçek login/network/model gerektiren ignored testler aynen kaldı; bu çalışma hiçbir testi skip/ignore yapmadı. Gerçek son ikili özeti:
```text
test result: ok. 37 passed; 0 failed; 3 ignored; 0 measured; 0 filtered out; finished in 2.14s
Doc-tests afunobet_ui_lib
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

Üretim IPC davranışı, FlushFileBuffers politikasına dokunulmadı. İlk üç başarı cevabı zorunlu ve tek tek doğrulanıyor; limit sonrası yalnız mevcut opsiyonel sinir bildirimi kabul ediliyor. İşlenen event sayısı kesin 3. Commit/push yok.

## Python sahte soru akışı — Windows okuma yarışı

Yalnız tests/test_codex_soru_koprusu.py sahte worker koduna süre sınırı olan okuma yardımcısı eklendi. PermissionError, FileNotFoundError ve kısmi JSONDecodeError için en çok 500 ms, 5 ms aralıkla tekrar deneniyor. Kalıcı hata deadline sonunda yeniden yükseltiliyor; ValueError gibi diğer hatalar hemen yükseliyor. Durdurma sinyali gelirse fake thread okumayı bırakıyor. Üretim köprü kodu ve mevcut davranış assert'leri değişmedi.

İki regresyon testi: geçici izin/dosya/kısmi JSON hatası ardından başarılı okuma; kalıcı izin hatasının süre sonunda ve diğer hatanın hemen saklanmadan yükselmesi.

Gerçek hedefli komut: python -m pytest -q tests/test_codex_soru_koprusu.py -W error::pytest.PytestUnhandledThreadExceptionWarning
Çıkış 0: 18 passed in 2.35s.

Gerçek tam komut: python -m pytest -q tests -W error::pytest.PytestUnhandledThreadExceptionWarning
Çıkış 0: 298 passed in 28.08s. Thread exception warning dahil uyarı yok.
Gerçek tam çıktı docs/kanit/uiux-python-final.log içinde. Commit/push yok.

## Son yeniden okuma yarışı düzeltmesi

Root sonraki QA'da Windows WinError32 gördü: cevap verilmiş soru, fake worker tarafından cleanup sırasında yeniden açılıyordu. Fakeworker artık yol.stem/id görülmüşse read_text çağrısından önce dosyayı atlıyor; read sonrası id kontrolü de korunuyor. Üretim temizleme koduna dokunulmadı.

Hedefli komut 10 kez çalıştırıldı: python -m pytest -q tests/test_codex_soru_koprusu.py -W error::pytest.PytestUnhandledThreadExceptionWarning
10/10 tur geçti, her tur 18 passed; döngü exit 0. Son tur: 18 passed in 2.34s.

Tam komut bütün uyarılar hata sayılarak: python -m pytest -q tests -W error
Exit 0; gerçek çıktı: 298 passed in 26.17s. Warning yok.
Son gerçek log: windows/test-results/uiux-python-final.log. Bu kayıt önceki Python sonuçlarının ardından yapılan son doğrulamadır.
