# GÖREV (OpenCode): Durum çubuğuna OpenCode kuyruk satırı

Dosya: C:\Users\afuuu\.claude\statusline-command.sh (yedek: statusline-command.sh.yedek-kuyruk-20261003 — Claude aldı)
Sonuç: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\SONUC_OC_CUBUK.md (ilk satır SONUC: TAMAM / YARIM) + test çıktısı AYNEN.

Kullanıcı: "Durum çubuğunu güncelle, OpenCode'un yaptığı işler görünsün."
Kaynak: C:\Users\afuuu\.claude\.gece_kuyruk — tek satır, örn. "OpenCode kuyruk: P5 Q2 | 5 tamam 3 hata | 04:02" (scripts/gece_kuyruk.py yazar).

Yap:
1. Çubukta, NOBET satırının hemen altına yeni satır: dosya varsa ve son değişikliği 6 saatten yeniyse içeriğini göster (önüne "🟢 " çalışıyorsa, "🔴 " içinde DURDU varsa, "✅ " bitti varsa). Dosya yoksa/eskiyse satır HİÇ çıkmaz.
2. Okuma python bloğu içinde open() ile; YENİ SÜREÇ/.exe ÇAĞIRMA (powershell, cmd, tasklist YASAK — süreç fırtınası dersi).
3. KRİTİK TUZAK: dosyadaki python bloğu bash tek tırnak içinde; eklediğin python kodunda ve yorumlarda APOSTROF (') KULLANMA — çubuk tamamen ölür. Yalnız çift tırnak.
4. Test: `echo '{}' | bash C:/Users/afuuu/.claude/statusline-command.sh` → çıktıda yeni satır görünmeli, hata olmamalı; dosyayı geçici olarak yeniden adlandırıp satırın kaybolduğunu da dene (sonra geri al). Mevcut satırlar (MODEL, NOBET vb.) aynen kalmalı — önce/sonra çıktıyı SONUC'a yapıştır.
5. Bozulursa yedekten geri yükle ve SONUC: YARIM yaz.
YASAK: başka dosya, git, görünür pencere. Okuduktan sonra DURMA.
