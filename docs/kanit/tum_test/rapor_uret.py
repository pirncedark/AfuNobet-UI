"""Generate the evidence matrix only; never modify application state or sources."""
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
inventory = json.loads((HERE / 'inventory.json').read_text(encoding='utf-8'))

# Per-feature scope; GEÇTİ always refers to this stated offline scope.
rows = [
('Vitest', 'tum_ozellik_gorev.test.ts', 'Dört sağlık rozeti, zaman penceresi, durum işareti ve kısa yönlendirme sözleşmesi.'),
('Vitest', 'f1_f5.test.ts', 'Geçici başlangıç kartı ve 30 saniye uyarısı; gerçek CLI çalıştırılmadı.'),
('Pytest + Vitest', 'test_tum_ozellik_sozlesme.py', '27 WebP dosyası tamamen çözümleniyor; karakter durum eşlemesi de test edildi.'),
('Başsız Chromium', 'working-150.png', 'Önizleme görünümü ve pencereye sığma; estetik değerlendirme kullanıcıya aittir.'),
('Vitest + Rust', 'apps.test.ts', 'Kurulu olmayan uygulama ve izinli indirme adresi sözleşmesi; indirme yapılmadı.'),
('Pytest kaynak sözleşmesi', 'test_tum_ozellik_sozlesme.py', 'PR tetikleyicisi, üç dil test komutu ve salt-okur izinler; GitHub üzerinde CI çalışması doğrulanmadı.'),
('Vitest', 'tum_ozellik_gorev.test.ts', 'Durumlar, zaman ve 30 dakika bayatlık sınırı.'),
('Vitest + başsız Chromium', 'uzun-150.png', 'Görev kartı, teknik içerik maskesi ve uzun metin görünümü.'),
('Vitest', 'live_flow.test.ts', 'Son adım, bayat akışın kesilmesi ve teknik içerik filtresi.'),
('Vitest', 'tum_ozellik_gorev.test.ts', 'Beş aşama, sıra ve bilinmeyen aşama davranışı.'),
('Pytest + Rust', 'test_tum_ozellik_sozlesme.py', 'Kaynak hashleri sabit; dizin olayı, atomik yayın ve son geçerli durum Rust testleri.'),
('Vitest', 'tum_ozellik_etkilesim.test.ts', 'Ana ajanlar korunur; kullanılmayan GLM gizli, aktif pill doğru seçilir.'),
('Vitest + başsız Chromium', 'quota-panel-150.png', 'Kota satırları, bilinmeyen değer ve kota paneli önizlemesi.'),
('Pytest kabul sözleşmesi', 'pytest.log', 'olası hata: orkestra_send Codex için ret kontrolü yapmadan build_command ve cmd.spawn yoluna giriyor; build_command codex argümanını kabul ediyor, KORUNUYOR kuralı ihlal edilebilir.'),
('Vitest', 'tum_ozellik_gorev.test.ts', 'Model, effort ve thinking biçimlendirme; bilinmeyen ve boş değerler.'),
('Vitest + başsız kabul testi', 'bilgi.png', 'olası hata: context biçimlendirme birim testleri geçiyor ama gerçek ayrıştırıcıdan karta verilen used=60000/total=200000 değeri %30 olarak görüntülenmiyor; headless.json bilgi senaryosu KALDI.'),
('Vitest + başsız kabul testi', 'bilgi.png', 'olası hata: cost biçimlendirme birim testleri geçiyor ama gerçek ayrıştırıcıdan karta verilen cost=1.23 değeri $1.23 olarak görüntülenmiyor; headless.json bilgi senaryosu KALDI.'),
('Vitest + başsız Chromium', 'idle-150.png', 'Claude kilit rozeti önizlemede mevcut; Claude kayıtları ve devirleri görev listesinde gizli. Codex kilidi ayrı Orkestra satırında KALDI.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Pet sekans dosyaları, zamanlama, normalize boyut ve pose davranışları.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Tıklama/sürükleme ayrımı ve kart açma eşiği; yerel pencere testi değildir.'),
('Gerçek Windows', 'pet-geri.test.ts', 'Kart açıkken masaüstüne tıkla ve mini petin geri geldiğini kontrol et; model testleri geçse de gerçek dış tıklama doğrulanmadı.'),
('Gerçek Windows', 'hit.test.ts', 'Kart üzerindeki düğmeye sonra kart dışındaki masaüstüne tıkla ve yalnız dış tıklamanın masaüstüne ulaştığını kontrol et; hitRect birim testleri ayrıca geçti.'),
('Vitest kaynak sözleşmesi', 'arayuz.test.ts', 'Hover, basma, odak ve aria geri bildirimi; gerçek fare davranışı değildir.'),
('Gerçek Windows', 'fsm.test.ts', 'Pasif adanın üzerine fareyi getir ve kartın uyandığını kontrol et; FSM testleri ayrıca geçti.'),
('Vitest + başsız Chromium', 'petit-150.png', 'Hidden/petit/home FSM ve önizleme; native pencere konumu doğrulanmadı.'),
('Gerçek Windows', 'cargo.log', 'Başka bir pencereyi aç ve mini petin onun üzerinde kaldığını kontrol et.'),
('Gerçek Windows', 'test_tum_ozellik_sozlesme.py', 'Tepsi simgesine sağ tıkla ve Aç, Gizle, Durum, Çıkış menülerini kontrol et; menü kaynak sözleşmesi ayrıca geçti.'),
('Gerçek Windows', 'cargo.log', 'Bir uygulamayı tam ekran aç ve petin gizlenip tam ekrandan çıkınca döndüğünü kontrol et.'),
('Gerçek Codex oturumu', 'chat.test.ts', 'Açık Codex oturumunda kısa bir mesaj gönder ve yanıtı gördüğünü kontrol et; mock sohbet/iptal testleri ayrıca geçti.'),
('Vitest + başsız Chromium', 'sohbet-150.png', 'Tek sor girişinin ve ana düğmenin sözleşmesi; yerel soru testleriyle birlikte.'),
('Vitest', 'tum_ozellik_etkilesim.test.ts', 'Yedi yerel niyet ağ çağrısız cevaplanır; serbest soru yalnız yönlendirme döndürür.'),
('Vitest + Rust', 'tum_ozellik_etkilesim.test.ts', 'Tekilleştirme, 110 saniye sınırı, seçenek kimliği, boş/uzun cevap ve cevap dosyası sözleşmeleri; gerçek hook kurulmadı.'),
('Gerçek Windows + oturum', 'chat.test.ts', 'Zararsız bir metin dosyasını karta sürükleyip ek olarak göründüğünü ve yalnız Gönder ile işlendiğini kontrol et; mock ek testleri ayrıca geçti.'),
('Vitest soru sözleşmesi', 'tum_ozellik_etkilesim.test.ts', 'İzin/ret seçenek kimliği ve cevap sınırı test edildi; tüm dış araçlarda silme/yayın engeli doğrulanmış değildir.'),
('Gerçek Windows uygulamaları', 'apps.test.ts', 'Uygulamalar sayfasında kurulu bir Afu uygulamasına dokun ve doğru uygulamanın açıldığını kontrol et; registry/model ve Rust sözleşmeleri ayrıca geçti.'),
('Vitest', 'tum_ozellik_gorev.test.ts', 'Hata mesajında PID, token, traceback, yol ve 429 sızmıyor.'),
('Vitest + başsız Chromium', 'idle-100.png', 'Afu hazır boş durumu ve kaynak yoksa kısa öneri.'),
('Vitest', 'tum_ozellik_etkilesim.test.ts', 'Kaynak yoksa tekrar dene; GitHubPanel isteği hata sonrası yeniden denenir.'),
('Gerçek Windows bildirimi', 'events.test.ts', 'Bir iş tamamlandığında tek bildirim geldiğini ve tekrar okumada yinelenmediğini kontrol et; olay türetme/dedup testleri ayrıca geçti.'),
('Vitest', 'tum_ozellik_gorev.test.ts', 'Arama, ajan/durum filtresi ve birlikte uygulama.'),
('Rust sözleşme', 'cargo.log', 'İlk kullanım kayıt ve ipucu sözleşmeleri; kullanıcı profilinde ayar değiştirilmedi.'),
('Vitest sözleşme', 'tum_ozellik_gorev.test.ts', 'Kısa etiketler, teknik hata filtresi ve menü ana eylemi; tüm ekranlarda kullanıcı deneyimi kabulü değildir.'),
('Vitest', 'tum_ozellik_etkilesim.test.ts', 'Panel ağ hatasından toparlanır ve kapalıyken yeniden sorgulamaz; her sürücü/izin sorunu otomatik çözülür iddiası doğrulanmadı.'),
('Vitest + Rust', 'protokol.test.ts', 'Ortak olay/ajan biçimi ve bilinmeyen ajan sözleşmesi.'),
('Vitest + Rust', 'protokol.test.ts', 'thinking/working/question/finished/error/rate_limit olay dönüşümü.'),
('Gerçek Windows IPC', 'test_tum_ozellik_sozlesme.py', 'Yerel köprüden zararsız bir thinking olayı gönder ve ajanın göründüğünü kontrol et; pipe kaynak ve parser testleri ayrıca geçti.'),
('Vitest + Rust', 'tum_ozellik_gorev.test.ts', 'Alt ajan ayrı satır/parent ilişkisi; ana görev listesinde yinelenmez.'),
('Pytest + Rust', 'test_afu_ajan_koprusu.py', 'AFU yok/yavaş olduğunda fail-open ve zaman sınırı; gerçek ajan başlatılmadı.'),
('Gerçek hook kurulumu', 'test_claude_hook.py', 'Köprü kurulumunun gösterdiği yedek ve farkı inceleyip yalnız AFU kaydının eklendiğini kontrol et; geçici dizin hook testleri ayrıca geçti, gerçek kurulum yapılmadı.'),
('Pytest kaynak + Rust', 'test_tum_ozellik_sozlesme.py', 'Aynı kullanıcı/SID, uzak bağlantı reddi, 16384 bayt, 4 bağlantı ve iptal sözleşmeleri; gerçek saldırı testi değildir.'),
('Pytest kabul sözleşmesi', 'pytest.log', 'olası hata: servis.rs ve sistem/servis.ts yalnız GitHub uyguluyor; Vercel, n8n, Stripe, Notion için dört ayrı kabul testi KALDI.'),
('Pytest + Vitest + Rust', 'test_tum_ozellik_sozlesme.py', 'Gömülü kısa PCM sesler ve olay eşlemesi; gerçek hoparlör/mikrofon doğrulanmadı.'),
('Pytest + Rust', 'test_tum_ozellik_sozlesme.py', 'Maskeleme, 2 MB sınırı ve üç döndürülmüş log sözleşmesi.'),
('Pytest + Vitest', 'test_sahte_mod.py', 'Ayrı test klasörü, sahte senaryolar ve yönlendirme sözleşmesi; gerçek state yazılmadı.'),
('Gerçek Windows Credential Manager', 'test_tum_ozellik_sozlesme.py', 'Bir deneme kaydını Kimlik Bilgileri Yöneticisinde kaydet/oku/sil akışıyla kontrol et; native çağrı/sınır sözleşmeleri ayrıca geçti ve bu görev sır yazmadı.'),
('Vitest', 'security_links.test.ts', 'Ajan metni HTML/link olarak yürütülmez; http/https dahil düz metin kalır. İzinli uygulama indirme bağlantıları ayrı apps testinde.'),
('Gerçek ses/donanım', 'test_ses_paths.py', 'Taşınmış uygulamada Bas-konuş ile kısa bir cümle söyle ve metne dönüştüğünü kontrol et; yol/taşınabilirlik testleri ayrıca geçti, gerçek mikrofon denenmedi.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Sürükleme, tık eşiği ve 0,5 saniyelik dönüş modeli; gerçek taskbar yerleşimi değildir.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Sekans başına boyut/konum, frame dosyaları ve oynatma ayarları.'),
('Pytest', 'test_studyo_uygula.py', 'Stüdyo dışa aktarma/uygulama verisi, kare/süre ve boyut sözleşmeleri; masaüstü kısayolu ve sekiz efektin tüm görsel sonuçları elle kontrol gerektirir.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Ense sarkacı, sınır açı, uzama, nefes ve bırakma sönümü.'),
('Vitest', 'tum_ozellik_etkilesim.test.ts', 'Konuşma ifadesi önceliği; mesaj kuyruğu/temiz metin diğer pet testlerinde; canlı Claude oturumu denenmedi.'),
('Vitest', 'tum_ozellik_gorev.test.ts', 'Dört sekme ve sor düğmesi, aria-pressed ve footer görünürlüğü.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Bütün karelerde sigdir ve %88 normalize alan; native DPI testi değildir.'),
('Vitest + başsız Chromium', 'uzun-150.png', 'Zoom, kart ölçüleri ve %150 önizleme; gerçek Windows metin ölçeklemesi değildir.'),
('Vitest + başsız Chromium', 'uzun-soru-150.png', 'Seçenek/serbest metin/doğrulama ve uzun soru görünümü.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Balon kuyruğu kapanana kadar korunur, metin temizlenir ve sınırlandırılır.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Pet balon kutusu, üst boşluk, pencere yüksekliği ve tıklama alanı.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Bekleme hızı 0,5 ve döngü arası 3500 ms; diğer pozlar değişmez.'),
('Vitest', 'tum_ozellik_pet.test.ts', 'Bütün pose/kare yolları ve oynatma süreleri; yeni sekanslar gerçek assetleri kullanır.'),
]
assert len(rows) == len(inventory) == 70
manual = {20, 21, 23, 25, 26, 27, 28, 32, 34, 38, 45, 48, 54, 56}
failed = {13, 15, 16, 50}
evidence = {}
lines = ['# Tüm özellikler test raporu', '',
         'Kapsam: TEST nesnesindeki “test edilecek” ve F dizisindeki ok/build birleşimi: 70 benzersiz özellik.',
         'GEÇTİ yalnız Not sütununda belirtilen otomatik kapsam içindir; native Windows, gerçek hesap, mikrofon ve görsel kullanıcı kabulü anlamına gelmez.',
         'YALNIZ ELLE satırlarında yardımcı otomatik testler ayrıca gösterilir; kontrol adımları bu görevde çalıştırılmadı.',
         'Önceki turun test/görüntü kanıtları korundu; üretim kaynaklarına dokunulmadı. İlk hedefli Vitest denemesindeki üç test varsayımı düzeltilmiş, son npm test tamamı geçmiştir.',
         '', '| Özellik | Test türü | Sonuç (GEÇTİ / KALDI / YALNIZ ELLE) | Kanıt dosyası | Not |',
         '| --- | --- | --- | --- | --- |']
for i, (item, (kind, file, note)) in enumerate(zip(inventory, rows)):
    status = 'KALDI' if i in failed else 'YALNIZ ELLE' if i in manual else 'GEÇTİ'
    if file.endswith('.test.ts'):
        path = ROOT / 'windows/tests' / file
        log = 'npm-test.log'
    elif file.endswith('.py'):
        path = ROOT / 'tests' / file
        log = 'pytest.log'
    else:
        path = HERE / file
        log = 'headless.json' if file.endswith('.png') else file
    assert path.exists(), path
    relative = '../../../' + path.relative_to(ROOT).as_posix() if path.parent != HERE else file
    evidence[item['name']] = {'status': status, 'kind': kind, 'evidence': path.relative_to(ROOT).as_posix(), 'note': note}
    lines.append(f"| {item['name']} | {kind} | {status} | [{file}]({relative}), [{log}]({log}) | {note} |")
counts = Counter(x['status'] for x in evidence.values())
lines.extend(['', f"Sonuç: {counts['GEÇTİ']} GEÇTİ, {counts['KALDI']} KALDI, {counts['YALNIZ ELLE']} YALNIZ ELLE; listeden atlanan özellik yok.", '',
    '## Kanıt sınırları', '',
    '- Chromium: 20 senaryo × 2 deviceScaleFactor = 40 başarılı görüntü; ayrıca bilgi.png alan kabul testi KALDI (context ve cost eksik). Toplam 41 senaryo. %150 deviceScaleFactor Windows DPI testi değildir.',
    '- Rust önceki tur: 246 geçti, 4 ignored; ignored testler geçmedi sayılmaz. cargo.log bütün paket sonuçlarını içerir.',
    '- new-vitest.log geçmiş başarısız ilk denemedir; kesin sonuç npm-test.log dosyasındadır. vitest.json yeni etkileşim dosyasından önceki ilk başarılı tam koşudur.',
    '- KALDI kabul testleri bilerek skip/xfail yapılmadı; uygulama hatalarının raporlanması test görevinin tamamlanmasını engellemez.',
    '- Kaynak bütünlüğü source_hashes.json ile tüm windows/src ve windows/src-tauri/src dosyalarında denetlenir; island.rs dahildir.',
    '- Gerçek state.json/state.db, kullanıcı hookları, hesaplar ve kimlik bilgileri bu görev kapsamında yazılmadı; görünür pencere ve exe oluşturulmadı.',
    '', '## Ek bir dakikalık kontroller', '',
    '- Animasyon stüdyosunda bir kare süresini değiştir, boyutları eşitle ve dışa aktarılan dosyada değişikliklerin bulunduğunu kontrol et.',
    '- Bildirim sesini etkinleştirip bir tamamlanma olayında kısa ses duyulduğunu kontrol et.',
    '- Codex soru köprüsünde zararsız bir onayı Reddet ile cevaplayıp ajanın cevabı aldığını kontrol et.',
])
(HERE / 'rapor.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
(HERE / 'coverage.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(dict(counts))
