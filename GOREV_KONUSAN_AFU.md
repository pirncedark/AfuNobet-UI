# GÖREV: Konuşan Afu — terminal mesajları maskotun başında, sorular maskottan cevaplanır

Dizin: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
Sonuç: SONUC_KONUSAN_AFU.md (ilk satır `SONUC: TAMAM` veya `SONUC: YARIM - <neden>`)
Log: docs/kanit/konusan_afu/log.txt (zaman damgalı ADIM/HATA/SON)

## Kullanıcı (3 Eki 00:5x)
"Özellikler var ama çalışıp çalışmadığını anlamıyorum. PowerShell'e (terminale) gelen mesajlar maskotun kafasında çıkmalı. Claude bana soru sorduğunda maskot benden cevap almalı ve Claude'a vermeli. BASİT, SADE ve KULLANIŞLI olmalı."
KURAL DEĞİŞİKLİĞİ (kullanıcı istedi): Claude Code için yalnız bildirim/soru köprüsü serbest; Claude otomatik İŞ YAPTIRMA hâlâ yasak (KORUNUYOR rozeti kalır). CLAUDE.md ve docs/SORU_SOZLESMESI.md'ye bu istisnayı tarihle yaz.

## 1) Konuşma balonu (ada tarafı)
- Yeni klasör `<kök>/mesajlar/<id>.json` (kök = SORU_SOZLESMESI'ndeki kök; atomik yazım, 64 KiB sınırı): {surum:1, id, ajan:"claude"|"codex"|"gemini"|"opencode", tur:"bitti"|"bilgi"|"uyari", metin, zaman}.
- Ada okur → maskotun başında (mini pet de, kart da) küçük balon: ajan adı + en fazla ~120 karakter (devamı "…"), 8 sn görünür, tıklayınca tam metin kartta. Aynı anda tek balon; sıradakiler kuyrukta. Okunan dosyayı siler.
- Konuşma animasyonu: balon görünürken karakter eski pet karesiyle hafif "konuşma" tepkisi (yeni görsel yok).
- Mini pet gizliyken/tam ekran oyundayken balon gösterme, kuyrukta tut (en fazla 5, eskisi düşer).

## 2) Claude Code köprü betikleri (KURULMAYACAK — yalnız depoda; kurulumu Claude yapacak)
`scripts/claude_kopru/afu_hook.py` (tek dosya, yalnız standart kütüphane, Windows; stdin'den hook JSON okur):
- `Stop` olayı: transcript_path JSONL'den SON asistan metnini al → markdown/kod bloklarını sadeleştir → ilk 2 cümle → mesajlar/ (tur "bitti").
- `Notification` olayı: `message` → mesajlar/ (tur "bilgi").
- `PreToolUse` + tool_name "AskUserQuestion": tool_input.questions'tan İLK soruyu sorular/ dosyasına yaz (seçenekler = options label'ları; "Diğer" için kısa metin alanı), cevaplar/<id>.json'u 100 sn bekle:
  - cevap gelirse stdout'a: {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Kullanıcı Afu üzerinden cevapladı. Soru: <soru> Cevap: <cevap>. Bu cevabı kullanıcının cevabı say ve devam et."}} , exit 0.
  - cevap yoksa/ada kapalıysa: hiçbir şey yazma, exit 0 (terminalde normal soru çıkar).
- FAIL-OPEN: ada çalışmıyorsa (ada'nın yazdığı `<kök>/ada_canli` kalp atışı dosyası 10 sn'den eskiyse) HEMEN çık; hiçbir durumda Claude'u 100 sn'den fazla bekletme; her hata → sessiz exit 0 + log dosyası (`<kök>/log/claude_kopru.log`, maskeli).
- Ada tarafı: `ada_canli` dosyasını 3 sn'de bir güncelle.
- `scripts/claude_kopru/ayar_ornegi.json`: settings.json'a eklenecek hooks bloğu (Stop, Notification, PreToolUse matcher "AskUserQuestion"; komut `python "<tam yol>/afu_hook.py"`, timeout 110).
- Aynı balon için codex/gemini/opencode: mevcut AfuNöbet olaylarında iş bitti/hata/soru → balon (state.json değişiminden üret; AfuNöbet'e kod yazma).

## 3) Sade kullanım
- Kartta tek satır "Afu bağlantısı": Claude ✓ / Codex ✓ … (son 5 dk'da mesaj gelen yeşil). Teknik terim yok.
- İlk açılışta bir kerelik ipucu: "Ajanların mesajları burada, Afu'nun başında görünür. Soruları buradan cevaplayabilirsin."

## Test
- afu_hook.py için pytest: örnek Stop/Notification/PreToolUse JSON'ları, ada kapalı → anında çıkış (<1 sn), cevap var → doğru JSON, zaman aşımı → boş çıkış, bozuk JSON → sessiz.
- Vitest: balon kuyruğu, kesme, 8 sn, tıklayınca kart, gizliyken bekletme.
- tsc, npm test, cargo test --offline yeşil (sayılar SONUC'a).
- Exe: dist exe → dist/onceki/ zaman damgalı yedek, `npm --offline run pack`. Kısayolu Claude günceller.

YASAK: ~/.claude/ altına YAZMA (kurulum Claude'da); git yok; görsel dosyaları; ses dosyaları; island.rs; pet.ts sekans/boyut DEĞİŞTİRME (yalnız balon katmanı eklenebilir); studyo/ (başka Codex çalışıyor); görünür pencere açma.
