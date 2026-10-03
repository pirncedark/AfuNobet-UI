"""Copy exact output tails into the delivery file after all checks have ended."""
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def read_log(name):
    data = (HERE / name).read_bytes()
    return data.decode('utf-16' if data.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig')


coverage = json.loads((HERE / 'coverage.json').read_text(encoding='utf-8'))
counts = Counter(row['status'] for row in coverage.values())
result = ['SONUC: TAMAM', '',
          'Test ve raporlama görevi tamamlandı; bu ifade uygulamanın tüm kabul testlerinin geçtiği anlamına gelmez.',
          f"70 özelliğin tamamı işlendi: {counts['GEÇTİ']} GEÇTİ, {counts['KALDI']} KALDI, {counts['YALNIZ ELLE']} YALNIZ ELLE. Atlanan özellik yok.", '',
          'Ayrıntılı tablo ve tek cümlelik elle kontroller: [rapor.md](docs/kanit/tum_test/rapor.md).',
          'Makine okunur kapsam: [coverage.json](docs/kanit/tum_test/coverage.json).', '',
          'KALDI olan özellikler:', '',
          '- Orkestra: Codex görevini başlatmadan önce ret kontrolü bulunmuyor; KORUNUYOR kuralına aykırı yol kaynakta mevcut.',
          '- E7 servisleri: GitHub dışında Vercel, n8n, Stripe ve Notion uygulaması bulunmuyor; dört kabul testi başarısız.',
          '',
          'Kanıtlar: [pytest.log](docs/kanit/tum_test/pytest.log), [headless.json](docs/kanit/tum_test/headless.json), [bilgi.png](docs/kanit/tum_test/bilgi.png).', '',
          'Önceki turun tamamlanan işleri tekrar oluşturulmadı; ek kanıtlar ve kapsam testleri dahil edilip rapor tamamlandı. İlk hedefli Vitest denemesinde yanlış test varsayımları düzeltilmiş; eski hata kaydı silinmemiştir.',
          'Yeni test dosyaları: windows/tests/tum_ozellik_gorev.test.ts, tum_ozellik_pet.test.ts, tum_ozellik_etkilesim.test.ts; tests/test_tum_ozellik_sozlesme.py, test_tum_ozellik_kapsam.py, test_tum_ozellik_rapor.py.',
          'Üretim kaynakları ve island.rs hash kontrolü geçti. Gerçek state.json/state.db yazılmadı; exe, görünür pencere, commit/push ve hook kurulumu yapılmadı.', '',
          'Başsız kanıtlar: 41/41 başarılı senaryo; görev ayrıntısında bağlam %30 ve maliyet $1.23 görünür. Önceki ana kart varsayımı düzeltildi. %150 deviceScaleFactor gerçek Windows DPI doğrulaması değildir.',
          'Önceki tur Rust sonucu: 246 passed, 0 failed, 4 ignored; kayıt cargo.log. Gerçek Windows, hesap, mikrofon ve dış araç kabulü yapılmadı.', '',
          'Zorunlu son komutların çıktı son satırları aşağıda aynen korunmuştur.', '',
          '`cd windows; node node_modules/typescript/bin/tsc --noEmit`',
          f"Çıkış kodu: {read_log('tsc.exit').strip()}; tsc.log boş, komut çıktı üretmedi.", '',
          '`npm test`', '```text', '\n'.join(read_log('npm-test.log').splitlines()[-8:]), '```', '',
          '`cd ..; python -m pytest -q tests`', '```text', '\n'.join(read_log('pytest.log').splitlines()[-9:]), '```', '',
          f"Python çıkış kodu: {read_log('pytest.exit').strip()}; kalan kabul hataları kaynak değiştirme yasağı gereği düzeltilmedi.", '',
          'Zaman damgalı ADIM/HATA/SON kaydı: [_gorev/2026-10-03/log/codex_oc_tum_test.log](_gorev/2026-10-03/log/codex_oc_tum_test.log).',
]
(ROOT / 'SONUC_OC_TUM_TEST.md').write_text('\n'.join(result) + '\n', encoding='utf-8')
with (ROOT / '_gorev/2026-10-03/log/codex_oc_tum_test.log').open('a', encoding='utf-8') as log:
    log.write(datetime.now().astimezone().isoformat() + f" SON Test görevi TAMAM; 70/70 raporlandı, {dict(counts)}; kaynak hashleri korundu.\n")
