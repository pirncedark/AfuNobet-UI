# Hızlı petten panel açılışı

- glide.rs pure transition_timing helper: geri dönüş 320+250+180=750 ms yerine 100+80+60=240 ms (3,125 kat hız). İniş 180+250+200 ve son 120 ms hareket aynı kaldı. Generation/cancel/show/mode akışı korunuyor; adimlar minimum 1.
- timing.ts: panelOpen=70, petReturn=240 eklendi; diğer süreler değişmedi.
- open_speed.test.ts frontend bütçeyi ve tüm eski süreleri sabitliyor; Rust testi helper geri dönüş bütçesini, iniş sürelerini ve hareket adım alt sınırını kontrol ediyor.

Gerçek doğrulama:

`cargo test --offline --lib open_speed_tests -- --nocapture` — exit 0
```text
running 1 test
test glide::open_speed_tests::pet_return_timing_is_three_times_faster_and_descent_unchanged ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 159 filtered out; finished in 0.00s
```

`node node_modules/vitest/vitest.mjs run tests/open_speed.test.ts --configLoader runner` — exit 0
```text
Test Files  1 passed (1)
Tests  2 passed (2)
Duration 189ms
```

Gerçek Windows hareketi elle ölçülmedi; süreler belirlenen animasyon bütçesidir, işletim sistemi çizim/çağrı maliyeti buna eklenebilir. EXE build root tarafından yapılacak. Commit/push yok.
