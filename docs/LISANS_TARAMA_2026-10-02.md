# Lisans Taraması Raporu (2026-10-02)

Bu rapor `GOREV_GEMINI_LISANS_BELGE.md` yönergesi doğrultusunda AfuNobet-UI projesindeki npm, Cargo, Python bağımlılıkları ve `afu-character/` görsel varlıklarının lisans durumunu belgeler.

---

## 1. Yönetici Özeti

- **NPM Bağımlılıkları:** 108 paket (tümü izin verici / MIT, Apache-2.0, ISC, BSD-3-Clause). GPL/AGPL veya bilinmeyen lisans **0**.
- **Cargo Bağımlılıkları:** 521 paket (455 benzersiz sandık). Tümü yerel Cargo önbelleğinde (`~/.cargo/registry`) eksiksiz bulundu. 519 paket saf MIT / Apache-2.0 / BSD / ISC / Unicode / MPL-2.0 / Zlib / CC0. Yalnızca 2 paket çoklu lisansında LGPL içerir (`r-efi` v5.3.0 ve v6.0.0; ancak `MIT OR Apache-2.0 OR LGPL-2.1-or-later` üçlü seçeneğe sahip olduğu için MIT/Apache altında güvenle kullanılabilir).
- **Python Bağımlılıkları:** 9 harici kütüphane (Pillow, NumPy, SciPy, SoundFile, Torch, Faster-Whisper, Pytest, Librosa, Chatterbox). SciPy içeriğindeki GCC runtime exception ve OpenBLAS BSD uyumludur. GPL kısıtlayıcı lisans **0**.
- **Görsel Varlıklar (`afu-character/`):** Referans görsel `REFERANS.png` kullanıcı tarafından sağlanmıştır; açık bir açık kaynak lisansı bildirilmemiştir (`LICENSE-ASSETS.md`'de tescil edilmiştir). Kod MIT lisansıyla dağıtılabilirken görsel varlıkların mülkiyeti ve kullanım hakkı sahibine aittir.
- **Sorunlu Lisans Sayısı:** **0** (Hukuki/katı telif riski oluşturan veya kapalı kaynakla/MIT ile bağdaşmayan hiçbir saf GPL/AGPL/bilinmeyen zorunlu bağımlılık yoktur).

---

## 2. NPM Bağımlılıkları (`windows/package.json` & `package-lock.json`)

Toplam **108** paket taranmıştır.

### Doğrudan Bağımlılıklar
| Paket | Sürüm | Tür | Lisans |
|---|---|---|---|
| `@tauri-apps/api` | ^2 (2.2.0) | Runtime | Apache-2.0 OR MIT |
| `@tauri-apps/cli` | ^2 (2.2.3) | Dev | Apache-2.0 OR MIT |
| `typescript` | ^5.6.0 (5.7.3) | Dev | Apache-2.0 |
| `vite` | ^6 (6.0.7) | Dev | MIT |
| `vitest` | 4.1.10 (0.34.6) | Dev | MIT |
| `playwright` | 1.61.1 | Dev | Apache-2.0 |

### Dolaylı Bağımlılıklar Lisans Dağılımı
- **MIT:** 88 paket
- **Apache-2.0 OR MIT:** 13 paket
- **Apache-2.0:** 4 paket
- **ISC:** 2 paket
- **BSD-3-Clause:** 1 paket
- **GPL / AGPL / Bilinmeyen:** **0 paket**

---

## 3. Cargo Bağımlılıkları (`windows/Cargo.lock` & `Cargo.toml`)

Toplam **521** paket kaydı taranmış, `~/.cargo/registry/src/` dizinindeki kaynak `Cargo.toml` dosyaları üzerinden lisans bildirimleri incelenmiştir.

### Doğrudan Bağımlılıklar
| Kutu (Crate) | Kilitli Sürüm | Lisans |
|---|---|---|
| `tauri` | 2.2.4 | MIT OR Apache-2.0 |
| `tauri-plugin-single-instance` | 2.2.0 | MIT OR Apache-2.0 |
| `tauri-build` | 2.0.5 | MIT OR Apache-2.0 |
| `serde` | 1.0.217 | MIT OR Apache-2.0 |
| `serde_json` | 1.0.135 | MIT OR Apache-2.0 |
| `notify` | 8.2.0 | CC0-1.0 |
| `windows` | 0.61.0 | MIT OR Apache-2.0 |
| `whisper-rs` | 0.11.1 | MIT |
| `cpal` | 0.15.3 | Apache-2.0 |
| `hound` | 3.5.1 | Apache-2.0 |

### Dolaylı Bağımlılıklar ve Çoklu Lisans Analizi
- Dağılımın ezici çoğunluğu Rust ekosistemi standart çift lisansı olan `MIT OR Apache-2.0` (191+ paket) ve saf `MIT` (114 paket) şeklindedir.
- **LGPL İncelemesi:**
  - `r-efi` (v5.3.0 ve v6.0.0): Lisans alanı `MIT OR Apache-2.0 OR LGPL-2.1-or-later` olarak tanımlıdır. Bu bir OR (veya) lisansıdır; dağıtım ve kullanımda `MIT` veya `Apache-2.0` seçeneği tercih edildiğinde herhangi bir LGPL copyleft yükümlülüğü doğurmaz.
- **MPL-2.0 (Mozilla Public License):**
  - `option-ext` (0.2.0), `unicode-ident` (1.0.14) vb. MPL-2.0 zayıf dosya düzeyinde copyleft içerir; ikili (binary) dağıtımda statik veya dinamik bağlama uygulamanın ana MIT lisansını etkilemez.
- **GPL / AGPL / Bilinmeyen:** **0 paket**.

---

## 4. Python Bağımlılıkları

Proje genelindeki script ve test dosyalarında (`windows/scripts/`, `ses_deneme/`, `tests/`, `delivery/`) kullanılan Python modülleri taranmıştır:

| Modül / Paket | Sürüm | Lisans | Kullanım Amacı / Kapsam |
|---|---|---|---|
| `Pillow` | 12.2.0 | MIT-CMU / HPND | Görsel kesim betikleri (`pet_kes.py`, `cut-afu.py`) |
| `numpy` | 2.4.6 | BSD-3-Clause | Görüntü matrisleri ve ses analizleri |
| `scipy` | 1.17.1 | BSD-3-Clause (GCC Exception ile) | Görüntü kontur/flood fill işlemleri |
| `soundfile` | 0.13.1 | BSD-3-Clause | Ses örnekleme ve dönüştürme |
| `torch` | 2.6.0+cu124 | BSD-3-Clause | TTS ve ses deneme modeli çalıştırma |
| `faster-whisper` | 1.2.1 | MIT | Yerel STT karşılaştırma ölçümleri |
| `pytest` | 8.3.3 | MIT | Test koşumu |
| `librosa` | 0.11.0 (deneme) | ISC | Ses denemeleri frekans/spektral merkez ölçümü |
| `chatterbox` | yerel snapshot | MIT / Resemble AI | Yerel Türkçe TTS sentezleme denemeleri |

*Not:* Python ortamı yalnızca çevrimdışı derleme, kesim ve araştırma süreçlerinde yardımcıdır; son derlenen `afunobet-ui-coucou.exe` ikili dosyasına gömülü Python kodu veya Python çalışma zamanı bulunmamaktadır.

---

## 5. Görsel Kaynakları (`afu-character/`)

- `afu-character/REFERANS.png`: Kullanıcı tarafından sağlanan resmi referans görseldir.
- `afu-character/pet/`: Referans görselden ve ek konsept sayfalarından (`pet_durumlar_4x4.png`, `pet_gecis_3x3.png` vb.) otomatik/yarı-otomatik kesilen 50 durum karesi ve türevleri.
- `afu-character/kart/`, `afu-character/efekt/`, `afu-character/simge/`: Kart durumları, durum simgeleri ve arayüz efektleri.
- **Telif ve Lisans Durumu:** `LICENSE-ASSETS.md` dosyasında belirtildiği üzere, bu görseller Coucou MIT lisansı kapsamında telif devrine tabi değildir; kullanım hakkı sağlayıcıya/sahibine aittir.

---

## 6. Mevcut Belgelerle Karşılaştırma ve `THIRD_PARTY.md` Önerileri

`THIRD_PARTY.md` dosyası şu anki haliyle yalnızca üst kaynak Coucou, MurMur, whisper-rs, cpal, hound ve Whisper modelini listelemektedir.

### `THIRD_PARTY.md` İçin Güncelleme Önerileri:
1. **Tauri v2 ve İlgili Çekirdek Kütüphaneler Eklenmeli:**
   - Tauri v2 (`tauri`, `tauri-plugin-single-instance`, `tauri-build`): MIT OR Apache-2.0
   - `notify` (8.2.0): Dosya izleme motoru, CC0-1.0
   - `serde` / `serde_json`: MIT OR Apache-2.0
   - `windows` crate (Microsoft): MIT OR Apache-2.0
2. **NPM Ön Yüz Kütüphaneleri Eklenmeli:**
   - `@tauri-apps/api`: Apache-2.0 OR MIT
   - `vite`: MIT
3. **Varlık ve Model Belgeleri Teyidi:**
   - `LICENSE-ASSETS.md` varlık durumunu doğru özetlemektedir, uyumludur.
