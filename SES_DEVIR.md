# SES İŞİ — Devir notu (2 Eki 2026)

Bu iş ayrı terminalde yürütülecek. Faz A işi bu klasörde ayrı bir Codex ajanıyla sürüyor: **uygulama koduna (windows/, afu-character/, tests/, dist/) dokunma**, yalnız `ses_deneme/` içinde çalış. Commit/push yok, ücretli API yok, yeni pencere açma.

## Kanıtlanan
- Codex realtime ses üyelikle YOK: codex-cli 0.159.2, account.type=chatgpt; `thread/realtime/listVoices` çalışıyor (v1: juniper maple spruce ember vale breeze arbor sol cove; v2: alloy ash ballad coral echo sage shimmer verse marin cedar), `thread/realtime/start` → **"realtime conversation requires API key auth"**. Kanıt: `ses_deneme/codex_log.jsonl`, `codex_stderr.log`. Yeniden deneme: `ses_deneme/dene.ps1` (codex sandbox'ında "Could not find home directory" verir; normal terminalde koş).
- Chatterbox yerel çalışıyor (CUDA, çevrimdışı): `_deneme/ses/cbenv`, referans `_deneme/ses/2-Afu-Minik-Kiz.mp3`. Adaylar: `ses_deneme/chatterbox/{enerjik,notr,sakin}.wav`, Whisper ile geri çevrildi. Ayrıntı: `SONUC_SES_DENEME.md`.

## Hedef yol (plana yazıldı, Faz B)
Codex LOGIN metin sohbeti → Afu karakter talimatı → Chatterbox seslendirme → yerel filtreler (pitch/formant/EQ/hız) → Afu karakteri. Mikrofon: yerel Whisper, gönderilmeden önce metin düzeltilebilir.

## Yarım kalan (bu terminalde durduruldu)
1. `ses_deneme/filtre/`: 3 adaya 3 filtre ayarı (ffmpeg rubberband/asetrate+atempo, sox, librosa, pyworld); parametreler + referansla ortalama pitch ve spektral merkez karşılaştırması. Doğal/anlaşılır, aşırı ince değil. Kısmi çıktı olabilir, kontrol et.
2. `ses_deneme/karakter.md`: Afu karakter talimatı (Türkçe, sıcak-tatlı-neşeli-doğal, kısa cevap; kısa bildirim enerjik, uzun cevap sakin) + metin sohbetinde hangi protokol alanına gittiği (thread/start / turn/start: developerInstructions, baseInstructions vb.) şemadan kanıt (`ses_deneme/schema/`).
3. Kullanıcı dinleme turu: hangi aday + filtre beğenildi.
