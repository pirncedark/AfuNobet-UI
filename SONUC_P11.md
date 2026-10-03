SONUC: TAMAM

# P11 — Konuşma balonu kullanıcı kapatana kadar kalır + temiz metin

Kullanıcı kararı: balon **kendiliğinden kapanmaz**. Yalnız kullanıcı kapatır.

## Adım adım durum

| # | İstenen | Durum | Nerede |
|---|---------|-------|--------|
| 1 | 8 sn zamanlayıcı kalksın, × kapatma, tıklayınca tam metin, Esc | TAMAM | `windows/src/message/message.ts` (`BalonKuyrugu.kapat()`, `balonOlustur()`), `windows/src/island/island.ts:384-386` (Esc önce balonu kapatır) |
| 2 | Kuyruk: görünen mesaj değişmez, "+N mesaj" rozeti, × ile sıradaki, en fazla 5 | TAMAM | `BalonKuyrugu` (`BALON_KUYRUGU = 5`, `sira`, `bekleyen`), `balonOlustur(..., ekSayisi)` |
| 3 | Metin temizleme (── === --- ** ` # tablo \| atılır, emoji kalır, boş satırlar birleşir, ilk 2 cümle, ≤140 karakter + "…", "Claude:" ayrı etiket) | TAMAM | `temizSatirlar()`, `temizMetin()`, `bolunBaslik()`, `ilkCumle()`, `kisalt()`, `balonMetni()` |
| 4 | Mini pet aynı kuralı kullansın (ortak fonksiyon) | TAMAM | Ortak: `balonMetni()` + `BalonKuyrugu` (eski adı `BalonModeli` aynı sınıfa bağlı). Hem `KonusanAfu` hem mini pet testleri aynı modeli kullanıyor (`windows/tests/pet-balon.test.ts`) |
| 5 | Testler yeni davranışa göre güncellensin + yeni testler | TAMAM | `windows/tests/aktivasyon_kontrol.test.ts` "konuşma balonu" bloğu (8 sn beklentisi → "kendiliğinden kapanmaz" beklentisi; ×, +N rozeti, temizleme, tıklayınca tam metin) |

## Davranış özeti
- Balon açıldıktan sonra **hiçbir zaman kendiliğinden kapanmaz** (`tick()` içinde zaman aşımı yok; test bunu ayrıca doğruluyor).
- Yeni mesaj gelirse görünen balon **değişmez**; altında `+N mesaj` rozeti belirir, `×` ile kapanınca sıradaki gösterilir.
- Kuyruk en fazla 5 mesaj tutar, en eski düşer (görünür/gizli ayrımı yok — ikisinde de 5).
- Balon gövdesi: markdown/çizgi/tablo kalıntısı temizlenmiş, emoji korunmuş, ilk 2 cümle, en fazla 140 karakter + "…".
- Başlık satırındaki ajan adı gövdede tekrar etmez; `afu-balon-etiket` içinde ayrı küçük etiket olarak durur.

## Doğrulama (cd windows)

### `npx tsc --noEmit`
```
(çıktı yok — hata yok)
```

### `npm test` (tümü)
```
> afunobet-ui@0.1.1 test
> node node_modules/vitest/vitest.mjs run tests --configLoader runner

 RUN  v4.1.10 C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI/windows

 Test Files  39 passed (39)
      Tests  490 passed (490)
   Start at  03:11:41
   Duration  5.13s (transform 1.95s, setup 0ms, import 4.21s, tests 5.34s, environment 6ms)
```

### Balon testleri (ayrıntılı)
```
 ✓ tests/pet-balon.test.ts > P10 pet balonu — pencere yüksekliği > balonsuzken pet kutusu 256 px kalır
 ✓ tests/pet-balon.test.ts > P10 pet balonu — pencere yüksekliği > balon açıkken pencere YUKARI büyür: alt kenar görev çubuğu üstünde sabit
 ✓ tests/pet-balon.test.ts > P10 pet balonu — pencere yüksekliği > Rust tarafı aynı sayıları kullanır (glide.rs)
 ✓ tests/pet-balon.test.ts > P10 pet balonu — kesme ve tıklama geçişi > balonun üstündeki şeffaf pay isabet kutusuna girmez
 ✓ tests/pet-balon.test.ts > P10 pet balonu — kesme ve tıklama geçişi > pencere tepeden kırpılırsa balon kutusu kısalır, hiçbir zaman taşmaz
 ✓ tests/pet-balon.test.ts > P10 pet balonu — kesme ve tıklama geçişi > island.ts balon açıkken isabet payını ve kutu yüksekliğini gönderir
 ✓ tests/pet-balon.test.ts > P10 pet balonu — kuyruk > kuyruk arkaya mesaj alır, balon kendiliğinden kaybolmaz
 ✓ tests/pet-balon.test.ts > P10 pet balonu — kuyruk > × ile kapanınca sıradaki mesaj gösterilir
 ✓ tests/pet-balon.test.ts > P10 pet balonu — kuyruk > kuyruk en fazla beş mesaj tutar, en eski düşer
 ✓ tests/pet-balon.test.ts > P10 pet balonu — kuyruk > aynı olay iki kez balonu yeniden kurmaz
 ✓ tests/aktivasyon_kontrol.test.ts > sağlık şeridi > (6 test)
 ✓ tests/aktivasyon_kontrol.test.ts > orkestra geçici kart > (4 test)
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > 140 karakterden uzun metni '…' ile keser
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > kısa metne ve tam 140 karaktere dokunmaz
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > balon kendiliğinden kapanmaz: ne 8 saniye sonra ne daha sonra
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > × ile kapanır, sıradaki mesaj gösterilir
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > yeni mesaj geldiğinde görünen balon değişmez
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > görünürken kuyrukta en fazla beş mesaj tutar
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > gizliyken kuyruk da beşte kalır
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > balon etiketi ayrı, gövde temiz ve kısaltılmıştır
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > kuyruk rozeti '+N mesaj' yazar, × düğmesi kurar
 ✓ tests/aktivasyon_kontrol.test.ts > konuşma balonu > balon kesilmiş metni gösterir, tam metni tıklayınca açar
 ✓ tests/aktivasyon_kontrol.test.ts > codex giriş satırı > (6 test)

 Test Files  2 passed (2)
      Tests  36 passed (36)
```

## Kural uyumu
- Test silinmedi, atlanmadı, `skip`/`only`/`todo` eklenmedi; sadece **beklenti metni** kullanıcı kararına göre güncellendi (8 sn sonra kaybolur → kendiliğinden kaybolmaz) ve yeni testler eklendi.
- Exe üretilmedi, git işlemi yapılmadı, görünür pencere açılmadı, `island.rs` değişmedi, `pet.ts` değişmedi.
- P8 kart büyütmesi korundu (`windows/tests/p8_kart_buyut.test.ts` yeşil; tam koşüde 39 dosya / 490 test yeşil).
