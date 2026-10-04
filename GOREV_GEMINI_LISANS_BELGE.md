# GOREV (gemini): Lisans taramasi + belgeler + Kapi 1 kontrol listesi

Calisma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
YASAK: windows/src, afu-character, tests, dist ve ses_deneme/ icindeki dosyalari degistirme (orada Codex calisiyor). Commit/push yok. Claude cagirma.

1. Lisans taramasi: windows/package.json + package-lock, windows/src-tauri/Cargo.toml + Cargo.lock, Python bagimliliklari, afu-character/ gorsel kaynaklari. Her bagimliligin lisansini cikar (npm: node_modules/*/package.json license alani; cargo: Cargo.lock + ~/.cargo/registry icindeki Cargo.toml license). GPL/AGPL/bilinmeyen olanlari isaretle. THIRD_PARTY.md ve LICENSE-ASSETS.md ile karsilastir; eksikleri listele. Sonuc: docs/LISANS_TARAMA_2026-10-02.md (THIRD_PARTY.md'yi DEGISTIRME, yalniz oneri yaz).
2. Belgeler: README.md ve docs/KULLANIM_REHBERI.html Faz A ozellikleriyle (docs/ILERLEME_MASTER.md A1-A19) uyumlu mu? Eksik/yanlis yerleri docs/BELGE_EKSIK_2026-10-02.md'ye yaz (dosyalari degistirme).
3. Kapi 1 kontrol listesi: docs/KABUL_FAZ_A.md'den kullanicinin gercek Windows'ta deneyecegi sade Turkce, madde madde liste (kirpilma, DPI 100/125/150, hover, click-through, ustte kalma, tray, sekmeler, kota, canli guncelleme, pet: kucultunce gorev cubuguna inis, uyanma, ac/kapat, tam ekran oyunda gizlenme). Her madde: ne yap, ne gormelisin, gecti/kaldi kutusu. Cikti: docs/KAPI1_KONTROL_LISTESI.md.

Son satir: SONUC: <lisans sorunlu sayisi> sorunlu lisans, <belge eksik sayisi> belge eksigi, kontrol listesi <madde sayisi> madde.
