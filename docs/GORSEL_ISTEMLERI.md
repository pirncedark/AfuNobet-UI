# Afu Pet — Görsel Üretim İstemleri

Her görseli ayrı ayrı üretin. Her istemin başına **ORTAK BLOK**'u, sonuna o görselin **satırını** ekleyin. Referans olarak her seferinde `afu-character/kaynak/maskot_sayfa.png` ve `pet_bekleme_dongu.png` görsellerini de yükleyin ("bu karakterin aynısı" diye).

Dosya adlarını aynen kullanıp `logo_ignorant courage/orgin/` klasörüne koyun; Claude oradan alır.

---

## ORTAK BLOK (her istemin başına)

```text
Use the uploaded character as the exact reference: a chibi kid whose hair is a brain made of soft round puffs, left half bright blue and right half orange; big glossy eyes (left eye blue, right eye amber); navy blue outfit with a red-gold patterned shawl, a gold crescent-and-star brooch, a brown leather backpack with a rolled blanket, dark blue gloves. Keep the face, proportions, colors and clothing IDENTICAL to the reference. Do not redesign, do not add accessories, no text, no watermark.

Style: same glossy 3D render as the reference, soft studio light from the upper left, no cast shadow on the background.

Canvas and framing (very important for animation):
- Square 2048x2048 image.
- Background: one flat solid color #00B140 (chroma green), completely uniform, no gradient, no floor, no shadow, no environment, no Windows taskbar, no desktop icons.
- A simple flat horizontal bar the color #D9DEE8 spans the full width with its TOP EDGE exactly at 1536 px from the top (75 percent height). This is the "ledge" the character leans on. Nothing below the bar except the bar itself.
- The character is centered horizontally. Its head top is at about 25 percent height. Same camera distance and same scale in every image of this set.
```

---

## A. Pet durumları (görev çubuğu üstünde, eller çıtaya dayalı)

Hepsi aynı kadraj: karakter belden yukarı görünür, iki eli ve kolları çıtanın üst kenarında durur, sırt çantası ve şal görünür.

| Dosya adı | Bu satırı ekleyin |
|---|---|
| `pet_01_idle.png` | `Pose: resting, both forearms on the ledge, chin slightly up, soft calm smile, eyes open looking at the viewer.` |
| `pet_02_nefes.png` | `Same as a resting pose but the whole upper body raised 12 px higher as if inhaling, shoulders slightly lifted, same smile.` |
| `pet_03_goz_kapali.png` | `Same resting pose, eyes fully closed in a relaxed blink, same smile.` |
| `pet_04_sola_bakis.png` | `Same resting pose, only the eyes look to the left side of the image, head turned 5 degrees left.` |
| `pet_05_saga_bakis.png` | `Same resting pose, only the eyes look to the right side of the image, head turned 5 degrees right.` |
| `pet_06_cene.png` | `Resting with the chin on one gloved hand, elbow on the ledge, dreamy content look.` |
| `pet_07_mutlu.png` | `Big happy smile with closed curved eyes, cheeks blushing, both hands on the ledge, small gold sparkles near the head.` |
| `pet_08_dusunme.png` | `Thinking: one hand on chin, eyes looking up and to the left, slight frown, a single gold question mark floating above the right side of the head.` |
| `pet_09_uyari.png` | `Surprised alert: eyes wide, small open mouth, head lifted, hands gripping the ledge, a single bold gold exclamation mark above the right side of the head.` |
| `pet_10_hata.png` | `Sad and apologetic: eyebrows tilted up in the middle, small downturned mouth, head slightly lowered, hands on the ledge, no tears, no red color.` |
| `pet_11_uyku.png` | `Sleeping: head resting on crossed forearms on the ledge, eyes closed, peaceful, three small soft blue "Z" letters floating up on the right.` |
| `pet_12_basari.png` | `Celebrating success: one fist raised high, eyes closed happily, wide open smile, other hand on the ledge, gold sparkles and stars around.` |
| `pet_13_goz_kirpma.png` | `Friendly wink: left eye closed, right eye open, playful smile, one hand giving a small wave above the ledge.` |
| `pet_14_dinleme.png` | `Listening: one gloved hand cupped behind the ear, eyes attentive looking to the side, slight smile, a small soft blue sound-wave icon near the hand.` |
| `pet_15_konusma.png` | `Speaking: mouth open mid-word in a friendly way, eyebrows raised, one hand gesturing upward, small soft gold speech dots near the mouth.` |
| `pet_16_hover.png` | `Lifted 40 px above the ledge, floating, hands still reaching down toward the ledge, joyful closed-eye smile, the shawl gently flowing.` |

## B. Geçiş zinciri (kart → görev çubuğu)

Aynı ORTAK BLOK, ama çıta yalnız 4 ve 5'te gerekir; 1–3'te çıta YOK, sadece düz yeşil arka plan.

| Dosya adı | Bu satırı ekleyin |
|---|---|
| `gecis_1_normal.png` | `No ledge in this image. Full body standing, holding a dark book with a gold crescent, friendly smile, feet at 90 percent height.` |
| `gecis_2_kuculme.png` | `No ledge in this image. The character curled into a small ball shape mid-air, about 45 percent of normal size, centered, slight blue glow trail behind, eyes open.` |
| `gecis_3_suzulme.png` | `No ledge in this image. The character gliding down diagonally from upper right to lower left, about 55 percent of normal size, body tilted, shawl flowing up, a faint light trail.` |
| `gecis_4_gorunme.png` | `With the ledge. Only the top of the brain hair and the eyes are visible above the ledge, peeking up curiously, everything below the eyes hidden behind the ledge.` |
| `gecis_5_tutunma.png` | `With the ledge. Head and shoulders visible, both gloved hands just grabbing the top edge of the ledge, eager expression.` |

## C. Uyanma (uykudan / tam ekrandan dönüş)

| Dosya adı | Bu satırı ekleyin |
|---|---|
| `uyan_1_gizli.png` | `With the ledge. Only the top 25 percent of the brain hair visible above the ledge, the rest hidden.` |
| `uyan_2_gozler.png` | `With the ledge. Brain hair, eyebrows and eyes visible above the ledge, looking around curiously, mouth hidden.` |
| `uyan_3_yukselme.png` | `With the ledge. Whole head visible, fingertips appearing on the ledge, eyes wide and curious.` |

## D. Durum simgesi (bildirim alanı)

Bu görsel ORTAK BLOK'un kadraj kısmını kullanmaz.

```text
Use the uploaded character as the exact reference (same face, brain hair with blue left half and orange right half, eye colors). Create an app icon: ONLY the head and the brain hair, front view, neutral friendly expression, centered, filling 90 percent of a 1024x1024 transparent canvas. Simplify for small sizes: bold readable shapes, strong outline-free contrast, larger eyes, fewer hair puffs (about 14 big puffs), no shawl, no backpack, no background, no shadow, no text. It must stay recognizable at 16x16 and 32x32 pixels.
```
Dosya adı: `simge_1024.png`

## E. (İsteğe bağlı, Faz D) Katman parçaları

Yalnız Kapı 1'den sonra, V1 kareleri sert bulunursa. Her parça ayrı görsel, ORTAK BLOK'un kadraj kısmı yerine şu:

```text
Show ONLY the requested part, isolated, at the exact size and angle it has on the character in the front resting pose, centered on a 2048x2048 flat #00B140 background. The hidden area behind it must be painted complete (for example, a full eye white without the pupil, the full body without the arm).
```

Parçalar (her biri ayrı görsel): `rig_kafa`, `rig_govde_kolsuz`, `rig_sol_kol`, `rig_sag_kol`, `rig_sol_el`, `rig_sag_el`, `rig_goz_beyazi_bos` (bebeksiz), `rig_goz_bebegi_sol`, `rig_goz_bebegi_sag`, `rig_goz_kapagi`, `rig_kaslar`, `rig_agiz_normal`, `rig_agiz_gulumseme`, `rig_agiz_saskin`, `rig_kitap`, `rig_canta`, `rig_pelerin`.

---

## Kontrol listesi (göndermeden önce)

- Arka plan tek renk yeşil, gölge yok.
- Çıta her pet görselinde aynı yükseklikte (yaklaşık dörtte üç).
- Karakter her görselde aynı boyda ve ortada.
- Yüz, renkler ve kıyafet referansla aynı. Fark varsa o görseli yeniden üretin.

---

# İKİNCİ PAKET (15:55) — kart, özel tepkiler, efektler, uygulama simgesi

Hepsi ızgara olarak tek görsel: **2048×2048**, hücreler arasında ince beyaz çizgi, her hücrede düz `#00B140` yeşil arka plan, gölge yok, yazı yok. Başa yine ORTAK BLOK'un karakter ve stil kısmını koyun (kadraj kısmı yerine aşağıdaki ızgara tarifi geçerli).

## F. Açık kart karakteri (3×3) — `kart_3x3.png`

Kartın sol sütununda duran büyük karakter. Çıta YOK. Her hücrede karakter belden yukarı değil **dizden yukarı**, aynı ölçek, aynı kamera, hafif 3/4 açı, ortada.

```text
Make ONE 2048x2048 image as a 3x3 grid of equal square cells separated by thin white lines, each cell with the same flat #00B140 green background, no ledge, same camera, same scale, the character shown from the knees up, centered, slight three-quarter view.
1. Idle: standing relaxed, holding the dark book with the gold crescent closed at the side, calm friendly smile.
2. Working: reading the open book with focused eyes, small soft blue glow from the pages.
3. Thinking: one finger on chin, eyes up-left, a gold question mark above the head.
4. Paused / waiting for quota: holding a small golden hourglass, patient calm face, a gold exclamation mark above the head.
5. Success: jumping slightly with one fist up, eyes closed happily, gold sparkles and a small green check mark.
6. Error: sad apologetic face, eyebrows tilted up, book held to the chest, no red color, no tears.
7. Greeting: waving with one hand, big warm smile.
8. Listening: one hand cupped behind the ear, attentive eyes, small blue sound-wave lines near the hand.
9. Speaking: mouth open mid-word, one hand gesturing, small gold speech dots near the mouth.
```

## G. Özel tepkiler (2×3, pet kadrajında, çıtalı) — `ozel_2x3.png`

Pet kadrajı: belden yukarı, eller çıtada, çıta her hücrenin alt kenarında yüzde 88 yükseklikte, `#D9DEE8`.

```text
Make ONE 2048x1365 image as a 3-column by 2-row grid of equal cells separated by thin white lines, each cell with the same flat #00B140 green background and the same flat light grey ledge (#D9DEE8) along the bottom at 88 percent of the cell height, same camera and scale as a taskbar pet sheet, character from the waist up with hands on the ledge.
1. Dizzy (after being clicked three times fast): spiral eyes, head tilted, three small gold stars circling above the head, wobbly smile.
2. Catching a dropped file: both hands up catching a small plain white document sheet falling from above, excited eyes.
3. Holding the received file: hugging the white document sheet to the chest, proud smile, a small green check mark nearby.
4. Goodbye (app closing): waving with one hand, gentle smile, eyes slightly closed.
5. Paused notifications: a finger on the lips in a quiet "shh" gesture, calm eyes, a small grey crossed-out bell icon nearby.
6. Busy / many tasks: looking left and right quickly with a small determined smile, three tiny floating paper sheets around the head.
```

## H. Efekt katmanları (3×3, karaktersiz) — `efektler_3x3.png`

Bunlar karakterden ayrı, üstüne bindirilen küçük işaretler. Hepsi aynı stilde (parlak, hafif ışıltılı 3D).

```text
Make ONE 2048x2048 image as a 3x3 grid of equal square cells separated by thin white lines, each cell with the same flat #00B140 green background, NO character, one centered icon per cell filling about 60 percent of the cell, glossy 3D style matching a cute chibi mascot, soft glow, no text.
1. Gold exclamation mark.
2. Gold question mark.
3. Three soft blue Z letters rising diagonally (sleep).
4. A cluster of four gold four-pointed sparkles.
5. A green rounded check mark.
6. A small soft pink heart.
7. Three short curved soft blue sound-wave lines.
8. A small white speech bubble with three gold dots.
9. Three small gold stars arranged in a circle (dizzy).
```

## I. Uygulama simgesi (exe ve görev çubuğu) — `uygulama_simgesi.png`

Bildirim alanı simgesi (3×3'ün 9. hücresi) zaten var; bu, exe dosyası ve kısayol için arka planlı sürüm.

```text
Use the uploaded character as the exact reference. App icon, 1024x1024: the head and brain hair only, front view, friendly smile, centered on a rounded-square tile (corner radius about 22 percent) with a deep navy to midnight blue vertical gradient and a very subtle gold rim light at the top edge; no text, no shadow outside the tile, transparent outside the rounded square. Must stay recognizable at 16x16 and 32x32.
```

## Öncelik

| Sıra | Görsel | Ne için | Gerekli mi |
|---|---|---|---|
| 1 | `kart_3x3.png` | Açık kartın büyük karakteri (A12) | **Evet**, şu an kart 3 ifade + CSS ile idare ediyor |
| 2 | `efektler_3x3.png` | `!` `?` `Zz` parıltı ✓ kalp ses dalgası konuşma baş dönmesi işaretleri ayrı katman (A12, A17, B4) | **Evet**, efektleri karakterden bağımsız oynatmak için |
| 3 | `uygulama_simgesi.png` | exe/kısayol simgesi (A13) | Evet, kısa iş |
| 4 | `ozel_2x3.png` | baş dönmesi (3 tık), dosya yakalama (B3), veda, sessiz mod, yoğun iş | Faz B'den önce yeterli |
| 5 | Grup E (katman parçaları) | Faz D | Yalnız Faz D açılırsa |
