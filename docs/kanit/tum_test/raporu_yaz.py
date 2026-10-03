"""Render the complete feature matrix from fresh, local evidence only."""
from collections import Counter
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
from kapsam import CONTRACTS

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
features = json.loads((OUT / "inventory.json").read_text(encoding="utf-8"))

def logread(name):
    raw = (OUT / name).read_bytes()
    return raw.decode("utf-16") if raw.startswith((b"\xff\xfe", b"\xfe\xff")) else raw.decode("utf-8-sig")

native = logread("cargo.log")
ts = logread("npm-test.log")
py = logread("pytest.log")
headless = json.loads((OUT / "headless.json").read_text(encoding="utf-8"))
assert "Tests  690 passed (690)" in ts
draft = '--draft' in sys.argv
if not draft:
    assert re.search(r"5 failed, 297 passed", py), "Inspect unexpected final Python result before generating report"
assert not re.search(r"test result: FAILED", native)
assert all(item["passed"] for item in headless["results"])
hashes = json.loads((OUT / "source_hashes.json").read_text(encoding="utf-8"))
assert all(hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest for name, digest in hashes.items())

manual = {
 6: "Mevcut bir PR'ın GitHub Checks ekranında Node, Rust ve Python işlerinin çalıştığını kontrol et.",
20: "Mini pete bir kez tıkla ve görev kartının bir kez açıldığını kontrol et.",
21: "Kart açıkken masaüstüne tıkla ve mini pete döndüğünü kontrol et.",
22: "Kartın düğmesine tıkla ve alttaki masaüstü öğesinin açılmadığını, pet dışındaki boş alana tıklamanın geçtiğini kontrol et.",
24: "Gizli ada alanına fareyi getir ve küçük durumun uyandığını kontrol et.",
25: "Kartı açıp Küçült'e bas ve petin görev çubuğunun üstünde kaldığını kontrol et.",
26: "Başka bir pencereyi öne getir ve mini petin üstte kaldığını kontrol et.",
27: "Tepsi simgesine sağ tıkla ve Aç, Gizle, Durum, Afu uygulamaları ve Çıkış öğelerini kontrol et.",
28: "Tam ekran bir uygulamaya geçip geri dön ve petin gizlenip yeniden göründüğünü kontrol et.",
29: "Sohbet'te kendi hesabınla oturum açıp kısa bir mesaj gönder ve yanıtın geldiğini kontrol et.",
33: "Zararsız bir metin dosyasını kartın üstüne bırak ve gönderilmeden önce ek olarak göründüğünü kontrol et.",
35: "Uygulamalar'dan kurulu bir Afu uygulamasının Aç düğmesine bas ve doğru uygulamanın açıldığını kontrol et.",
39: "Bir işin bitiş bildiriminde kısa metnin Windows bildirim alanında göründüğünü kontrol et.",
52: "Sesleri açıp bir iş bitişini bekle ve tek kısa bitiş sesinin duyulduğunu kontrol et.",
55: "Anahtar ayarı varsa deneme anahtarını kaydet, uygulamayı yeniden aç ve anahtarın düz metin görünmeden hatırlandığını kontrol et.",
57: "Taşınmış ses klasörüyle kısa bir bas-konuş denemesi yap ve yazıya dönüşüm ile yanıt sesini kontrol et.",
60: "Animasyon stüdyosunda bir kare süresini değiştirip dışa aktar ve indirilen dosyada yeni değeri kontrol et.",
}
failures = {
14: "olası hata: proje kuralında Codex otomatik görev yürütmesi yasak olmasına rağmen orkestra_send, Codex kontrolü yapmadan build_command ve cmd.spawn yoluna giriyor; mevcut Rust testi Codex için calistir --ajan codex argümanlarını doğruluyor. Hiçbir gerçek görev gönderilmedi.",
51: "olası hata: takip sayfası GitHub, Vercel, n8n, Stripe ve Notion bildiriyor; servis.rs ve sistem/servis.ts yalnız GitHub uyguluyor. Vercel/n8n/Stripe/Notion için dört kabul testi KALDI; GitHub açık/kapalı kapısı ve yenileme testleri GEÇTİ.",
}
notes = {
 2: "Geçici başlangıç kartı, 30 sn uyarı ve durum eşleşmesi sahte zamanlayıcıyla sınandı; gerçek ajan başlatılmadı.",
 4: "Renk/parıltı CSS sözleşmesi ve gerçek DOM görüntüsü; tasarım beğenisi veya native paket bağlantısı sonucu değildir.",
 5: "Kurulu/kurulu değil düğmeleri sahte listede; resmi indirme adresleri Rust sözleşmesinde; indirme yapılmadı.",
11: "Rust dizin olayları, yarım yayın ve idle timer yokluğu; yalnız geçici test dizinlerinde.",
12: "Codex/Gemini/OpenCode sekmeleri; GLM yalnız kaydı varsa; gerçek tık yerine DOM/model davranışı.",
13: "Kayıtlı ve okunamayan kota fixture değerleri; gerçek hesap kotası ölçülmedi.",
18: "🔒 Claude KORUNUYOR metni var; Claude hedefli devir reddediliyor. Proje Codex kilidiyle çelişki 14. maddede ayrıca KALDI.",
30: "Bir altın ana düğme, yerel yanıt ve serbest sorunun Codex yönlendirmesi; gerçek model çağrısı yapılmadı.",
32: "Seçenek/serbest metin, süre sınırı, yinelenen kimlik ve cevap doğrulama; gerçek ajan köprüsü kurulmadı.",
34: "Tehlikeli işlem ve 110 sn zaman aşımı Python fixture'larında; izin olmadan ilerleme reddediliyor.",
36: "Ham yol/komut/kota hatası güvenli kullanıcı metnine dönüşüyor; tüm arka uç istisnalarının evrensel denetimi değildir.",
38: "Mevcut uygulama/bağlantı yeniden dene yolları; her olası hata için genel bir kurtarma garantisi değildir.",
41: "İlk kullanım işareti yalnız geçici app_data altında bir defa oluşturuluyor; kullanıcı ayarı sıfırlanmadı.",
42: "Tek ana düğme, gizli gelişmiş bölüm ve metin filtresi sözleşmeleri; teknik içerik kullanıcı metninde aynen kalabilir.",
43: "Dosya yayını toparlanması, IPC yeniden bağlanma ve servis istek hatası sonrası yeniden deneme fixture'ları.",
46: "Geçici Windows named pipe uçlarında bağlantı/boyut/süre sınırları Rust testlerinde gerçekten çalıştı.",
48: "AFU kapalı/yavaş, zaman aşımı ve bilinmeyen olay fixture'ları; gerçek ajan/hook ayarları değiştirilmedi.",
49: "Yedek/diff/yabancı kayıt koruma ve kaldırma yalnız geçici settings.json üzerinde; hook kurulumu yapılmadı.",
50: "Aynı kullanıcı, uzak istemci reddi, satır/bağlantı sınırı ve stalled-client testleri; başka Windows hesabıyla elle denenmedi.",
53: "Maskeleme, ev dizini gizleme ve 2 MB/3 dosya rotation Rust geçici loglarında.",
54: "Beş senaryo, atomik yayın, cevap ve bayat veri yalnız geçici dizinlerde.",
56: "HTTP/HTTPS adres sözleşmesi ve sohbetin ajan metnini çalıştırılabilir linke çevirmemesi; gerçek URL açılmadı.",
62: "Konuşan Afu bu maddede metin balonu anlamındadır: kalıcılık/kuyruk/cevap yolları sınandı; gerçek ses 52/57'de elle.",
70: "Bu başlık yalnız TEST nesnesinde var; F'deki pet animasyonu başlıklarıyla birlikte eşleme/oynatma sınandı.",
}
visual = {
 1:'working-100.png', 2:'working-100.png', 3:'working-100.png', 4:'working-100.png',
 7:'working-100.png', 8:'working-100.png', 9:'working-100.png', 10:'bilgi.png',
12:'working-100.png', 13:'quota-panel-100.png', 15:'bilgi.png', 16:'bilgi.png',17:'bilgi.png',
18:'working-100.png',19:'idle-100.png',20:'petit-100.png',21:'petit-100.png',22:'working-100.png',
23:'working-100.png',24:'petit-100.png',25:'hidden-100.png',29:'sohbet-100.png',
30:'working-100.png',32:'soru-100.png',36:'hata-karti-100.png',37:'idle-100.png',38:'disconnected-100.png',
40:'busy-100.png',42:'working-100.png',58:'petit-100.png',59:'petit-100.png',61:'petit-100.png',
62:'working-100.png',63:'working-100.png',64:'petit-150.png',65:'working-150.png',66:'soru-150.png',
67:'uzun-100.png',68:'petit-100.png',69:'petit-100.png',70:'petit-100.png',
}
report = ["# Tüm özelliklerin test raporu", "", f"Tarih: {datetime.now().astimezone().isoformat(timespec='seconds')}", "",
 "Kapsam: TEST nesnesindeki ‘test edilecek’ başlıklarının ve F dizisindeki ok/build maddelerinin birleşimi: **70 benzersiz özellik**. Kalan/atlanmış madde yok.", "",
 "GEÇTİ yalnız tabloda belirtilen otomatik katmanı ifade eder. Kaynak sözleşmesi, mock/fixture, başsız tarayıcı ve gerçek Windows masaüstü birbirinin yerine geçmez. YALNIZ ELLE maddelerinin otomatik alt katmanları da çalıştırıldı; tam kabul için tek cümlelik kontrol aşağıda. KALDI maddelerinin kaynağı görev gereği düzeltilmedi.", "",
 "Önceki yarım denemeden tum_ozellik_gorev.test.ts ve tum_ozellik_pet.test.ts aynen kullanıldı. Yeni etkileşim testleri, 70 özellik kaynak sözleşmesi, kabul/güvenlik testleri ve 41 başsız görüntü eklendi. Her madde test_tum_ozellik_kapsam.py içinde ayrı parametreyle denetlenir; bu kaynak kontrolünün yanında davranış kanıtı aşağıda bağlıdır.", "",
 "| Özellik | Test türü | Sonuç (GEÇTİ / KALDI / YALNIZ ELLE) | Kanıt dosyası | Not |",
 "|---|---|---|---|---|"]
statuses = []
rows = []
for i, feature in enumerate(features, 1):
    impl, required, proof = CONTRACTS[i]
    status = 'KALDI' if i in failures else 'YALNIZ ELLE' if i in manual else 'GEÇTİ'
    statuses.append(status)
    evidence = [f"[Kaynak sözleşmesi](kapsam.log)"]
    if proof.endswith('.test.ts'):
        evidence += [f"[{proof}](../../../windows/tests/{proof})", "[Vitest](npm-test.log)"]
        kind = 'Yeni kaynak sözleşmesi + Vitest model/mock'
    elif proof.endswith('.py'):
        evidence += [f"[{proof}](../../../tests/{proof})", "[pytest](pytest.log)"]
        kind = 'Yeni kaynak sözleşmesi + pytest'
    elif proof == 'cargo.log':
        evidence.append('[Rust](cargo.log)')
        kind = 'Yeni kaynak sözleşmesi + Rust headless'
    else:
        evidence.append(f"[{proof}]({proof})")
        kind = 'Yeni kaynak sözleşmesi'
    if i in visual:
        file = f'ozellik-{i:02d}.png'
        shutil.copyfile(OUT / visual[i], OUT / file)
        evidence.append(f'[Görüntü]({file})')
        kind += ' + başsız DOM'
    if i in failures:
        evidence.append('[Başarısız kabul testi](pytest.log)')
    note = failures.get(i, notes.get(i, 'Kaynak sözleşmesi ve belirtilen davranış testleri geçti; donanım/hesap gerektiren uçtan uca kabul iddiası yok.'))
    if i in manual:
        note += ' Elle (1 dakika): ' + manual[i]
    name = feature['name'].replace('|', '\\|')
    report.append(f"| {name} | {kind} | {status} | {' · '.join(evidence)} | {note.replace('|', '/')} |")
    rows.append({**feature, 'index': i, 'result': status, 'test': proof, 'implementation': impl, 'note': note})
counts = Counter(statuses)
report += ["", f"Sonuç dağılımı: **{counts['GEÇTİ']} GEÇTİ · {counts['KALDI']} KALDI · {counts['YALNIZ ELLE']} YALNIZ ELLE**.", "",
 "41 yeni görüntü: 20 arayüz senaryosu × %100/%150 + aşama/model/bağlam/maliyet fixture'ı. Başsız assertion'lar: çalışma zamanı hatası yok, ada pencereye sığıyor, ana yüzeylerde düğme var, bilgi fixture'ındaki dört alan görünür. Tek kare göz kırpma hızı veya fiziksel sürükleme kanıtı değildir; bunlar zaman çizelgesi/model testleriyle sınandı.", "",
 "Rust: 246 geçti, 4 ignored. Ignore edilen gerçek model/elle ses testleri başarılı sayılmadı; mikrofon/gerçek ses ve Windows native kabulü tabloda elle olarak kaldı.", "",
 "Kaynak koruması: windows/src ve windows/src-tauri/src altındaki 79 dosyanın SHA256 özeti görev başındakiyle aynı; island.rs dahil. Gerçek state.json/state.db yazılmadı; uygulama exe/paket derlenmedi veya başlatılmadı; cargo yalnız test ikililerini çalıştırdı. Git, görünür pencere, hook kurulumu, model/API çağrısı, indirme veya gerçek ajan görevi yok.", "",
 "## KALDI kanıtlarının anlamı", "",
 "E7 testi takip sayfasındaki beş servis iddiasının kaynak kabulünü sınar; dört eksik servis uygulaması için hata verir. GitHub'ın mevcut uygulaması geçti. Orkestra testi bu oturumda verilen proje Codex kilidi kuralını sınar; görev başlatılmaz ve native komut yalnız okunur. Her iki bulgu olası hata olarak bırakıldı.", ""]
(OUT / 'rapor.md').write_text('\n'.join(report), encoding='utf-8')
(OUT / 'feature-results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
(OUT / 'coverage.json').write_text(json.dumps({row['name']: {
    'status': row['result'], 'kind': row['test'], 'evidence': 'docs/kanit/tum_test/feature-results.json',
    'note': row['note'],
} for row in rows}, ensure_ascii=False, indent=2), encoding='utf-8')
if draft:
    print('Draft feature matrix generated; final result and SON log not written.')
    raise SystemExit(0)

def tail(name, n):
    return '\n'.join(logread(name).splitlines()[-n:])

result = ["SONUC: TAMAM", "", "Test görevi tamamlandı; bu ifade bütün özelliklerin başarılı olduğu anlamına gelmez.", "",
 f"70/70 özellik incelendi: {counts['GEÇTİ']} GEÇTİ, {counts['KALDI']} KALDI, {counts['YALNIZ ELLE']} YALNIZ ELLE. Atlanan özellik yok.", "",
 "Rapor: [docs/kanit/tum_test/rapor.md](docs/kanit/tum_test/rapor.md). Görüntüler, tam test logları, kapsam listesi ve SHA256 kanıtı aynı klasörde.", "",
 "Bulunan sorunlar: E7'de GitHub dışındaki dört servis eksik; Orkestra, proje kuralındaki Codex kilidini gönderim öncesinde uygulamıyor. Beş kabul testi bu iki özellik için başarısız. Kaynak kodu görev gereği değiştirilmedi.", "",
 "Önceki iki tum_ozellik test dosyası korunarak devam edildi. Yeni dosyalar: windows/tests/tum_ozellik_etkilesim.test.ts, windows/tests/tum_ozellik_kanit.mjs, tests/test_tum_ozellik_sozlesme.py, tests/test_tum_ozellik_kapsam.py. Yeni kaynak sözleşmesinde 70 özellik + tam kapsam kontrolü geçti. 41 yeni başsız görüntü geçti. Rust: 246 geçti, 4 ignored (gerçek donanım/model kabulü değildir).", "",
 "windows/src ve windows/src-tauri/src altındaki 79 kaynak dosyası, island.rs dahil, bayt bayt korundu. Uygulama exe'si/paketi üretilmedi, gerçek durum dosyası ve hesap/hook ayarları değiştirilmedi; git veya görünür pencere kullanılmadı.", "",
 "İstenen son komutların çıktıları aşağıda **aynen** yer alır; TypeScript başarıda çıktı üretmediği için boş blok kullanıldı (exit 0).", "",
 "`cd windows; node node_modules/typescript/bin/tsc --noEmit`", "```text", logread('tsc.log'), "```", "",
 "`npm test`", "```text", tail('npm-test.log', 8), "```", "",
 "`cd ..; python -m pytest -q tests`", "```text", tail('pytest.log', 7), "```", "",
 "Log: [_gorev/2026-10-03/log/codex_oc_tum_test.log](_gorev/2026-10-03/log/codex_oc_tum_test.log).", ""]
(ROOT / 'SONUC_OC_TUM_TEST.md').write_text('\n'.join(result), encoding='utf-8')
with (ROOT / '_gorev/2026-10-03/log/codex_oc_tum_test.log').open('a', encoding='utf-8') as f:
    f.write(f"{datetime.now().astimezone().isoformat()} HATA İki özellik KALDI: E7 eksik dört servis; Orkestra Codex kilidi yok; pytest 5 başarısız kabul testi.\n")
    f.write(f"{datetime.now().astimezone().isoformat()} SON SONUC: TAMAM; 70/70 kapsam, {dict(counts)}, kaynak SHA256 değişmedi.\n")
print(dict(counts))
