# GÖREV: AfuNobet-UI — Faz A devam (2 Eki 2026)

Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Önce oku: docs/ILERLEME_MASTER.md, docs/superpowers/plans/2026-10-01-afunobet-ui-tum-fazlar.md, docs/KABUL_FAZ_A.md, GOREV_MASTER.md, GOREV_A14_KESIM.md.

KURALLAR: Claude çağırma/kullanma. commit/push YOK. Yeni pencere açma (headless/konsol). Ücretli API yok. Kalite ölçümünü kanıtla (komut çıktısı), "tamam" deme kanıtsız.

## Adım 1 — Gerçek durum (yeni iş başlatmadan önce)
Önceki codex işi `is_1790859225944538` (A1–A10 raporlandı; son mesaj "105 görüntü kontrolü, pet kareleri kesildi", tamamlanma kaydı yok).
- Bu işin çıktısını/logunu bul (AfuNobet state, logs, ILERLEME_MASTER). Hâlâ çalışan codex süreci var mı kontrol et; varsa ona dokunma, raporla ve DUR.
- Kesilen pet karelerini kontrol et (sayı, boyut, şeffaflık, eksik kare).
- Son exe'nin tarihini bul; 1 Eki 14:35'ten yeni mi, A1–A10 değişikliklerini içeriyor mu? Testler + derleme şu an geçiyor mu? (çıktıyla)
- Faz A görevlerini tek tek DOĞRULANDI / YARIM / YOK olarak docs/ILERLEME_MASTER.md'ye yaz.

## Adım 2 — Faz A'nın kalanını bitir (sırayla, her biri test ile)
Türkçe + karakter tepkileri; pet kareleri; küçültülünce görev çubuğuna iniş; uyanma hareketleri; pet aç/kapat; durum simgesi; yenileyicinin AfuNöbet'e teslimi; lisans taraması; belgeler; testler; yeni exe derle; masaüstü kısayolunu yeni exe'ye güncelle.
Her alt görev bitince ILERLEME_MASTER.md'yi güncelle (zaman aşımında kaldığın yerden devam edilebilsin).

## Adım 3 — Plan dosyasına Faz B ses değişikliğini yaz (yalnız belge, kod yok)
Faz B'ye ekle: Önce doğrudan Codex sesli oturumu denenir: Mikrofon → Codex sesli oturumu → sesli cevap → Afu karakteri (dinlerken dinleme, cevapta konuşma animasyonu). Karakter yönlendirmesi: "Türkçe konuş; sıcak, tatlı, neşeli ve doğal bir ton kullan; kısa cevaplar ver." Tını sistemin sunduğu seslerden seçilir; 2-Afu-Minik-Kiz.mp3'e birebir dönüşüm varsayılmaz. Üyelikle çalıştığı ve Türkçe kalite doğrulanırsa kullanılır; değilse yerel Whisper + seslendirme yolu kalır. Ücretli API'ye kendiliğinden geçilmez. Kapı 2 bunu gerçek testle doğrular.

## Faz B'ye BAŞLAMA. Kapı 1 (gerçek Windows testi) kullanıcıya aittir.

## Çıktı
SONUC_FAZ_A_DEVAM.md: tek satır SONUC: (TAMAM/YARIM) + doğrulanan/yarım/kalan liste + exe yolu ve tarihi + kısayol durumu + test çıktısı özeti.
