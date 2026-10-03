# P3 Sonuçları

`AfuPet` sürükleme davranışı istendiği gibi güncellendi:
1. Sürükleme (drag) için JS tarafında 5px'lik bir hareket eşiği eklendi. Tek tıklamalar doğal `onclick` üzerinden kart açmaya devam ediyor.
2. Eşik aşıldığında karakterin `transform-origin` değeri ense noktasına (50% 35.15625%) taşınarak karakterin enseden tutulduğunda gövdesinin aşağı sarkması sağlandı.
3. Karakterin kayarak (120ms içinde) ense noktasının imlecin altına gelmesi için dinamik bir easing ile x/y translation hesabı uygulandı.
4. Çizim, döndürme ve boyutlandırma güncellenen `transform-origin` üzerinden pürüzsüz çalışacak şekilde ayarlandı.
5. `windows/tests/pet-surukle.test.ts` adı altında DOM özelliklerini mocklayan kapsamlı bir unit test yazılarak threshold ve transform origin hesapları Vitest ile denetlendi.

## Test Çıktısı

```
$ npx tsc --noEmit && npm test

> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 Test Files  34 passed (34)
      Tests  408 passed (408)
   Start at  02:04:59
   Duration  5.80s (transform 2.94s, setup 0ms, import 5.13s, tests 5.57s, environment 5ms)
```

Tüm yönergeler başarıyla tamamlandı.
