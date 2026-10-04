SONUC: TAMAM

# P10 — Mini pet (Başlat yanında) iken görev mesajı başının üstünde

Dizin: `C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI`
Kurallara uyuldu: Exe YOK, git YOK (commit/push yok), görünür pencere YOK, **`island.rs` DEĞİŞMEDİ**, görsel/ses dosyası yok, test silinmedi/atlınmadı.

## Önceki denemenin kırmızı hatası nasıl giderildi

`tsc` kırmızıydı; beş hatanın beşi de bu turda kökten çözüldü (sembolü silmek/baştaki hatayı susturmak yerine):

| Hata | Kök neden | Çözüm |
|---|---|---|
| `island.ts(4,66) TS6133 'PET_PENCERE' kullanılmıyor` | `island.ts` P10 ölçüsünü hiç kullanmıyordu; balon katmanı hiç bağlanmamıştı | `applyGeometry()` pet dalında artık gerçek pencere ölçüsünü kullanıyor, yedek ölçü `PET_PENCERE` / `petPencereYuksekligi(...)` |
| `island.ts(4,117) TS6133 'petBalonUst'` | `hitRect`'in 4. argümanı (`petUstPay`) hiç gönderilmiyordu | `hitRect("pet", …, petBalonUst(this.petBalon))` — şeffaf tepe isabet kutusuna girmiyor |
| `island.ts(4,130) TS6133 'petPencereYuksekligi'` | aynı | aynı |
| `island.ts(91,20) TS2554 Expected 5-6 arguments, but got 4` | `KonusanAfu` 6. parametreye (`onBalon`) büyümüştü, çağrı 4 argümandaydı | 6. argüman bağlandı: `() => this.syncPetBalon()` |
| `message.ts(50,8) TS6133 'now'` | P11 otomatik kapanmayı kaldırdı, `tick(now)` artık `now` kullanmıyor | Eşzamanlı çalışan **P11 ajanı** aynı satırı `_now` ile düzeltti; P10 bu değişikliği kullandı, üstüne yazmadı |

`message.ts` içinde P10 için **tek satır bile** değişmedi (P11 ajanı ile çakışma önlemi); P10 değişiklikleri `island.ts`, `core/layout.ts`, `core/bridge.ts`, `message.css` (tek ek blok) ve Rust tarafında (`glide.rs`, `lib.rs`).

## Yapılanlar

### 1. Balon katmanı (pet modunda)
- `island.ts`: ayrı bir `#afu-pet-balon` kutusu eklendi (`root.append(…, this.pet.el, this.petBalonEl)`). `#afu-pet` `overflow:hidden` olduğu için balon içine konulamıyordu; kutu pencerenin altına `PET_BALON_TABAN` (256+14=270 px) mesafeyle bağlı, yani **karakterin başının üstünde**, `::after` kuyruk ucu aşağı bakıyor.
- `KonusanAfu` hem pet kutusuna hem pet-altı balon kutusuna (`petUst`) çizim yapabiliyor; mod değişince balon taşınır (`mode === "pet" ? this.petUst : this.karakter`).

### 2. Pencere YUKARI büyür (alt kenar sabit)
- Yeni komut: `pet_balon` (`lib.rs`) → `glide::balon` (`glide.rs`). `PetRuntime.balon` durumu eklendi.
- Ölçü tek yerden: `pet_pencere_yuksekligi(true) = 270 + 120 + 24 = 414`, `false = 256`. Ön yüz (`core/layout.ts`) ve Rust (`glide.rs`) **aynı sabitleri** kullanıyor; test bunu metinle de doğruluyor.
- Konum `balon_olcu()`: alt kenar (`taban`, görev çubuğunun üstü) **sabit**, büyüme yalnız yukarı. `watch_fullscreen` döngüsü de hedefi artık balon durumundan hesaplıyor, yani balon açıkken gözlemci onu 256'ya küçültmüyor.
- Zamanlama kenarları: balon **pete geçiş sırasında** açılırsa geçiş bitince, **sürükleme sırasında** açılırsa bırakılınca uygulanır (`uygula()`).
- Konum hesabı mevcut `taskbar::pet_konumu` mantığını kullanır (görev çubuğu kenarı + Başlat düğmesi), yani **DPI %100 / %125 / %150**'te aynı yol; üçünde de test edildi.

### 3. Kesme (pencere ekrana sığmazsa)
- Pencere dışarı taşmaz: `balon_olcu` yüksekliği ekranın üst sınırına göre kısar (yayma yok, kırpma var).
- Ön yüz aynı kırpılmış yüksekliği görür ve balon kutusunu kısaltır: `petBalonKutusu()` → `--pet-balon-h` (CSS'te tek ek blok, `var(--pet-balon-h,120px)`). Böylece **kuyruk ucu hep görünür**, yalnız metnin üstü kırpılır.

### 4. Tıklama geçişi (boş kısım)
- Balon açıkken pencerenin tepesinde 24 px şeffaf pay (`PET_BALON_PAY`) kalır ve bu pay `hitRect`'e girmez (`y = 24`). 24 > `HIT_MARGIN` (14) olduğu için boş kısım tıklamayı yutmaz, masaüstüne geçer. Balon kapanınca pay 0'a döner, pet kutusu yine tümüyle tıklanabilir.

### 5. P11 ortak balon kuralları
`BalonModeli` / `balonOlustur` / `balonMetni` yeniden yazılmadı — pet balonu aynı fonksiyonu kullanıyor: **× ile kapanana kadar kalır** (otomatik kapanma yok), temiz metin, `+N` rozeti, tıklayınca tam metin kartta açılır.
**Tam ekran:** gösterim yok — `glide::watch_fullscreen` pencereyi gizler, `pet_balon` yalnız pet etkin/geçiş hâlinde çalışır.

## Testler (silinmedi, atlana yok)

### `cd windows; tsc --noEmit`
```
### tsc --noEmit
cikis=0
```
(önceki denemenin 5 hatası + 2 ek hata: hepsi gitti)

### `cd windows; npm test`
```
 Test Files  39 passed (39)
      Tests  490 passed (490)
   Duration  5.17s
```

Yeni dosya: `windows/tests/pet-balon.test.ts` — 10 test, hepsi yeşil:
```
 Test Files  1 passed (1)
      Tests  10 passed (10)
```
- **Pencere yüksekliği (balonlu/balonsuz):** 256 ↔ 414; alt kenar sabit; Rust/TS sabitlerinin aynı olduğu.
- **Kesme:** `petBalonUst(true)=24 > HIT_MARGIN`; isabet kutusu `{y:24,h:390}`; `petBalonKutusu` 0..120 arası, asla taşmaz.
- **Kuyruk:** otomatik kapanma yok, `×` ile sıradakine geçilir, en fazla 5, aynı olay iki kez yeniden kurmaz.

### `cd windows/src-tauri; cargo test --offline`
```
test result: ok. 127 passed; 0 failed; 2 ignored   (lib)
test result: ok. 34 passed; 0 failed               (apps_contract)
test result: ok. 12 passed; 0 failed
test result: ok. 8 passed; 0 failed
test result: ok. 18 passed; 0 failed; 1 ignored
test result: ok. 5 passed; 0 failed
test result: ok. 4 passed; 0 failed
test result: ok. 2 passed; 0 failed  /  2 passed; 0 failed
test result: ok. 1 passed; 0 failed
test result: ok. 32 passed; 0 failed; 1 ignored
```
0 kırmızı. `glide.rs` içindeki yeni P10 testleri:
```
test glide::tests::pet_window_grows_only_upwards_at_every_dpi ... ok
test glide::tests::balloon_window_is_clipped_at_the_screen_top_never_below_the_taskbar ... ok
test glide::tests::pet_transition_resets_the_balloon ... ok
```
(ikisi de %100/%125/%150 ölçekte; `cargo build` uyarı listesi değişmedi, yeni uyarı yok)

## Not (bilgi)
Bu dosya yazılırken aynı depoda **P11 ajanı** (GOREV_P11_BALON_KALICI) eşzamanlı çalışıyordu ve `message.ts` / `message.css` dosyalarını değiştiriyordu. Çakışmamak için P10 bu iki dosyada yalnız `message.css`'in **sonuna** 2 satırlık `--pet-balon-h` bloğu eklendi; `message.ts`'ye dokunulmadı. Yukarıdaki tsc/vitest/cargo çıktıları iki ajanın işi birlikte yeşil olduğu anda alınmıştır.
