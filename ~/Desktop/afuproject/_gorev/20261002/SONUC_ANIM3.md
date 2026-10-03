SONUC: TAMAM — toplam 17.09 MB, 27 dosya

## 1. Küçültme
- Betik: `AfuNobet-UI/scripts/kucult_durum.py [yukseklik] [fps] [kalite]` (PIL, multiprocessing, LANCZOS, kare atlama + süre korunur, loop=0, RGBA şeffaflık, method 6). Kaynak `afu-character/video/durumlar/*.webp` değiştirilmedi.
- Turlar: 256px/10fps/q72 = 25.85 MB (fazla) → 256px/8fps/q60 = 19.19 MB (fazla) → **240px/8fps/q55 = 17.09 MB (17 921 922 B)** kabul.
- Dosya bazında boyutlar: `_gorev/20261002/log/kucult_cikti.txt`.
- Önce: 23 dosya 54 MB.

## 2. Eşleme (durum → webp)
| Durum (Expression) | webp | Yer |
|---|---|---|
| studying (görev "Calisiyor") | calisma_yazma.webp (eskiden kitap_buyu) | windows/src/afu/character.ts:7, state.ts:152 |
| error (JOB_FAILED rozeti) | hata.webp (eskiden boş) | character.ts:8 |
| awaiting (soru kartı açıkken) — YENİ | onay_bekleme.webp | character.ts:12, 16-20; island.ts:112 (questionOpen → syncDom), island.ts:366 |
| catching (dosya adaya sürüklenirken) — YENİ | dosya_yakalama.webp | character.ts:12; island.ts:119 setDragging; main.ts:19 (Tauri drag enter/over → açık, leave/drop → kapalı) |
| idle/working/success/question/sleeping/listening/speaking/waking/quota_paused/leaving/leaving_soon/landing/sitting/gliding/greeting_alt | bosta_nefes/dusunme/basari/sasirma/uyku_masa/dinleme/konusma/uyanma/kota_doldu/veda/veda_yakin/inis/inis_oturma/yatay_suzulme/kitap_selam | character.ts:6-13 (ANIM_HARITASI) |

Öncelik (characterExpression): sürükleme > sesli sohbet > açık soru kartı > görev durumu.
Not: önceki 9'un eşlemesi tamamdı; ancak waking/leaving/leaving_soon/landing/sitting/gliding/greeting_alt için uygulamada tetikleyen kod yok (eşleme hazır duruyor). Kullanılmayan varlıklar: kitap_buyu, dusunme_masa, kalkis, masa_cikis, ucus, bekleme (greeting'te selam_masa/kitap_selam, compact success'te gulumseme kullanılıyor).

## 3. CSS
`windows/src/style.css:71` → `--pet-brightness:1.03; --pet-saturation:1.06; --pet-contrast:1.03` (eski 1.11/1.18/1.06).

## 4. Testler
- Yeni: `windows/tests/anim_durum.test.ts` (27 dosya varlığı, kaynak↔kopya, toplam < 18 MB, eşlemedeki dosyalar diskte, 4 yeni eşleme + öncelik, önceki 9 eşleme). `character.test.ts` studying beklentisi güncellendi.
- `tsc --noEmit`: temiz
- `npm test`: 23 dosya, 291 test geçti
- `cargo test --offline` (src-tauri): 187 geçti, 0 hata, 4 yok sayıldı

Yapılmadı (yasak): exe derleme, GUI, commit/push, apps.rs, ses dosyaları.
