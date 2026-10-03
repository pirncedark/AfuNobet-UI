"""Produce recovery coverage from observed source contracts, never invented runs."""
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/kanit/tum_test'


def generate():
    spec = importlib.util.spec_from_file_location('recovery_contracts', OUT / 'kapsam.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    features = json.loads((OUT / 'inventory.json').read_text(encoding='utf-8'))
    headless = json.loads((OUT / 'headless.json').read_text(encoding='utf-8'))
    coverage, missing = {}, []
    lines = ['# Kurtarma kapsam raporu', '',
             'GEÇTİ yalnız kaynak belirteci ve kanıt dosyası varlığıdır; Windows davranışı yeniden çalıştırılmadı. cargo.log geçmiş oturum çıktısıdır.', '',
             '| Özellik | Sonuç | Not |', '| --- | --- | --- |']
    for i, item in enumerate(features, 1):
        path, tokens, proof = module.CONTRACTS[i]
        source = (ROOT / path).read_text(encoding='utf-8-sig')
        contains = getattr(module, 'source_contract_contains', lambda text, token: token in text)
        absent = [token for token in tokens if not contains(source, token)]
        evidence = [ROOT / 'windows/tests' / proof, ROOT / 'tests' / proof, OUT / proof]
        if proof == 'source_hashes.json':
            evidence.append(ROOT / 'docs/kanit/kurtarma_source_hashes.json')
        issues = ['eksik belirteç: ' + token for token in absent]
        if not any(p.is_file() for p in evidence):
            issues.append('kanıt dosyası eksik: ' + proof)
        name = item['name']
        if name == "E7 Servis pill'leri":
            services = (ROOT / 'windows/src-tauri/src/servis.rs').read_text(encoding='utf-8-sig') + source
            for service in ('vercel', 'n8n', 'stripe', 'notion'):
                if not re.search(r'["\x27]' + service + r'["\x27]', services, re.I):
                    issues.append('servis uygulaması eksik: ' + service)
        if name == 'Orkestra: manuel ajan seçimi ve iş verme':
            before = source.split('pub async fn orkestra_send', 1)[1].split('cmd.spawn()', 1)[0]
            if not (re.search('codex', before, re.I) and re.search(r'return\s+Err|Err\(', before)):
                issues.append('orkestra_send içinde cmd.spawn öncesi Codex ret kapısı eksik')
        if name == 'E11 Credential Manager' and not re.search(r'secret\.len\(\)\s*>\s*2560\b', source):
            issues.append('eksik belirteç: secret.len() > 2560')
        if name in ('Context göstergesi', 'Maliyet bilgisi'):
            info = [r for r in headless['results'] if r['name'] == 'bilgi']
            if any(not row['passed'] for row in info):
                issues.append('başsız bilgi kabul testi başarısız')
        status = 'KALDI' if issues else 'GEÇTİ'
        note = 'olası hata: ' + '; '.join(issues) if issues else 'Kaynak sözleşmesi ve referans dosyası mevcut; native davranış doğrulanmadı.'
        coverage[name] = dict(status=status, kind='Kurtarma kaynak denetimi', evidence=path, note=note)
        lines.append(f'| {name} | {status} | {note} |')
        if issues:
            missing.append(dict(feature=name, path=path, issues=issues))
    (OUT / 'coverage.json').write_text(json.dumps(coverage, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (OUT / 'rapor.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    (ROOT / 'docs/kanit/kurtarma_eksikler.json').write_text(json.dumps(missing, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(features)} özellik raporlandı; {len(missing)} eksik özellik/kanıt.')


if __name__ == '__main__':
    generate()
