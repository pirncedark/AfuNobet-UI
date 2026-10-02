# Üretim A14 bağımsız denetimi

Karar: **PARTIAL** (kaynak kabul sınırları + eski manifest tutarsızlığı).

Yeni ana set 50/50 mevcut. Bağımsız RGBA, köşe alfa, gerçek hücre alanı, yeşil artık ve SHA denetiminde 0 yapısal hata.
ICO tüm 7 boyutu, durum PNG 16/32/64 boyutu ve alfa kontrolü sağlandı.

Üretim kesim-kontrol-pet/kart/efekt.png dosyaları gözle incelendi: gerekli 30/9/9 set görünür, gri çıta temizlenmiş, doğal yeşil tik korunmuş. Masaüstü çalışan uygulama bu denetimde açılmadı.

## Somut bulgular

- Eski pet/kesim.json 29 karede boyut/SHA ile artık eşleşmiyor; eski core doğrulaması yeniden çalışmaz.
- idle_sol ve idle_sag karşıt yön sağlamıyor; yeni --dogrula bu görsel kabul koşulunu test etmiyor.
- Eski teknik sayfadan 8 düşük çözünürlüklü durum PNG halen mevcut; yeni 50 manifestinin kapsamında değiller.
- Yeşil tik %0.5 yeşil-artık şartının gerçek renk istisnası; üretim doğrulayıcısı bunu bilinçli atlıyor.

## Düzeltme önerileri

- Eski pet/kesim.json kaydını yeni üretilen birleşik sete göre yenile veya geçersiz eski manifesti açıkça arşiv durumuna taşı; doğrulayıcı gerçek tüketilen tüm kareleri kapsasın.
- Karşıt bakış kaynakta bulunmadığından idle_sol adının anlamı doğrulanamıyor; yeni kaynak veya bu iki kareyi genel bakış olarak kabul kararı gereklidir. Ters çevirme/yeni çizim yapılmadı.
- Yeşil tik istisnası kullanıcıya açık raporlansın; düz eşik testinden PASS 50/50 çıkması tüm sözleşmenin tamamlandığı anlamına gelmez.
- Teknik8 ek karelerinin 183×115 kaynak çözünürlüğü korunarak 'düşük çözünürlük' işaretlensin; 512² tuval görüntünün detayını yükseltmez.

Bu rapor sırasında üretim dosyalarına yazılmadı. a14_audit_production.py tekrar çalıştırılabilir; raporlar yalnız bu delivery alanına yazılır.
