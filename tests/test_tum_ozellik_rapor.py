"""Ensure the final report has exact, traceable coverage rather than silent omissions."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/kanit/tum_test'


def test_every_requested_feature_has_one_evidenced_report_row():
    inventory = json.loads((EVIDENCE / 'inventory.json').read_text(encoding='utf-8'))
    coverage = json.loads((EVIDENCE / 'coverage.json').read_text(encoding='utf-8'))
    report = (EVIDENCE / 'rapor.md').read_text(encoding='utf-8')
    assert set(coverage) == {item['name'] for item in inventory}
    for name, row in coverage.items():
        assert report.count('| ' + name + ' |') == 1
        assert row['status'] in {'GEÇTİ', 'KALDI', 'YALNIZ ELLE'}
        assert (ROOT / row['evidence']).is_file()
        assert row['note']
        if row['status'] == 'KALDI':
            assert 'olası hata:' in row['note']


def test_headless_claims_have_matching_successful_cases_and_images():
    result = json.loads((EVIDENCE / 'headless.json').read_text(encoding='utf-8'))
    assert result['nativeWindowsVerified'] is False
    main = [r for r in result['results'] if r['name'] != 'bilgi']
    assert len(main) == 40
    assert {(r['name'], r['scale']) for r in main} == {
        (name, scale) for name in {r['name'] for r in main} for scale in (1, 1.5)
    }
    for case in main:
        assert case['passed'] and not case['errors']
        assert (EVIDENCE / case['file']).is_file()
    # A later, stronger UI acceptance case must be represented as a failure,
    # not silently counted among the 40 successful layout fixtures.
    coverage = json.loads((EVIDENCE / 'coverage.json').read_text(encoding='utf-8'))
    extra = [r for r in result['results'] if r['name'] == 'bilgi']
    assert len(extra) == 1
    assert (EVIDENCE / extra[0]['file']).is_file()
    if not extra[0]['passed']:
        assert coverage['Context göstergesi']['status'] == 'KALDI'
        assert coverage['Maliyet bilgisi']['status'] == 'KALDI'


def test_failed_acceptance_checks_are_not_relabelled_passed():
    coverage = json.loads((EVIDENCE / 'coverage.json').read_text(encoding='utf-8'))
    assert coverage['E7 Servis pill\'leri']['status'] == 'KALDI'
    assert coverage['Orkestra: manuel ajan seçimi ve iş verme']['status'] == 'KALDI'
