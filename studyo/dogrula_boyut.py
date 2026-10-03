"""Headless Chromium: studio controls, real CSS matrices and alpha-union geometry."""
import hashlib
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from boyut_olc import EVIDENCE, generate, log


def main():
    _, measurements = generate(ROOT / 'windows/public/afu')
    checks = []
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto((ROOT / 'studyo/animasyon_studyo.html').as_uri())
            page.wait_for_function('document.getElementById("petImage").naturalWidth>0')
            page.click('#play')
            initial = page.evaluate('studyo.exportData()')
            assert len(page.evaluate('studyo.assets')) == 71
            assert page.evaluate('studyo.normalization("missing")') == {'olcek': 1, 'x': 0, 'y': 0}
            page.click('#normalize')
            current = page.evaluate('studyo.exportData()')
            assert current['normalize'] is True and current['normalizeSekanslar'] == ['bekleme']
            assert current['ayar'] == initial['ayar']
            page.click('#undo')
            assert page.evaluate('studyo.exportData()') == initial
            checks.append('Seçili sekans, güvenli eksik-kare varsayılanı ve Geri al çalışıyor.')
            # A mixed sequence exercises one normalization per frame, not per sequence.
            payload = json.loads(json.dumps(initial))
            payload['sekanslar']['boyut_test'] = [{'kare': key, 'ms': None} for key in measurements]
            payload['ayar']['boyut_test'] = {'olcek': 100, 'x': 0, 'y': 0}
            page.locator('#file').set_input_files({'name': 'test.json', 'mimeType': 'application/json', 'buffer': json.dumps(payload).encode()})
            page.wait_for_function('document.getElementById("status").textContent==="Kayıt içe aktarıldı."')
            page.get_by_role('button', name='boyut_test', exact=True).click()
            page.check('#normalizeAll')
            page.click('#normalize')
            normalized = page.evaluate('studyo.exportData()')
            assert set(normalized['normalizeSekanslar']) == set(normalized['sekanslar'])
            # Idempotent: a second click must not compound the scale.
            page.click('#normalize')
            assert page.evaluate('studyo.exportData()') == normalized
            rows = []
            for index, (key, item) in enumerate(measurements.items()):
                page.locator('.frame').nth(index).locator('small').click()
                page.wait_for_function('(path)=>document.getElementById("petImage").getAttribute("src")===path && document.getElementById("petImage").complete && document.getElementById("petImage").naturalWidth>0', arg='../windows/public/afu/'+('durum/'+key[6:] if key.startswith('durum/') else 'pet/'+key)+'.webp')
                result = page.evaluate('''item=>{
                    const image=document.getElementById('petImage'),pet=document.getElementById('pet');
                    const n=new DOMMatrix(getComputedStyle(image).transform),u=new DOMMatrix(getComputedStyle(pet).transform);
                    const point=(x,y)=>{let p=n.transformPoint(new DOMPoint(x-64,y-128));p.x+=64;p.y+=128;p=u.transformPoint(new DOMPoint(p.x-64,p.y-128));return {x:p.x+64,y:p.y+128};};
                    const left=64+(item.bbox[0]-item.tuval_genislik/2)*128/Math.max(item.tuval_genislik,item.tuval_boy);
                    const right=64+(item.bbox[2]-item.tuval_genislik/2)*128/Math.max(item.tuval_genislik,item.tuval_boy);
                    const bottom=128-(item.tuval_boy-item.bbox[3])*128/Math.max(item.tuval_genislik,item.tuval_boy);
                    const top=bottom-item.boy*128;
                    const a=point(left,top),b=point(right,bottom);
                    return {boy:b.y-a.y,ayak:b.y,merkez:(a.x+b.x)/2,imageTransform:getComputedStyle(image).transform};
                }''', item)
                rows.append({'kare': key, **result})
                if key in ('idle_normal', 'durum/bekleme', 'durum/basari'):
                    page.screenshot(path=str(EVIDENCE / (key.replace('/', '_')+'.png')), full_page=True)
            target_height = measurements['idle_normal']['boy']*128
            height_error = max(abs(row['boy']/target_height-1)*100 for row in rows)
            feet_error = max(abs(row['ayak']-128) for row in rows)
            assert height_error <= 3, height_error
            assert feet_error <= 2, feet_error
            assert max(abs(row['merkez']-measurements['idle_normal']['merkez']*128) for row in rows) <= 2
            checks.append('71 dosya: alfa birleşimi, gerçek Chromium CSS matrisleri ile boy ≤%3, ayak ≤2 px ve merkez hizası doğrulandı.')
            # User settings stay above normalization and remain undoable.
            page.locator('#scale').fill('125')
            page.locator('#x').fill('15')
            page.locator('#y').fill('-7')
            assert page.evaluate('studyo.exportData().ayar.boyut_test') == {'olcek': 125, 'x': 15, 'y': -7}
            assert page.evaluate('new DOMMatrix(getComputedStyle(document.getElementById("pet")).transform).a') == 1.25
            page.click('#undo')
            assert page.evaluate('studyo.exportData().ayar.boyut_test.y') == 0
            # Thumbnails include normalization; metadata labels remain untransformed.
            assert page.locator('.frame .mini img').count() == 71
            page.click('#durumTab')
            assert page.locator('.tile .mini img').count() == 27
            assert page.locator('.tile .mini img').first.evaluate('e=>getComputedStyle(e).transform') != 'none'
            page.locator('.tile').first.hover()
            assert page.locator('#preview .mini img').is_visible()
            checks.append('Kullanıcı ayarları üst dönüşümde; küçük resimler ve büyük önizleme normalize.')
            with page.expect_download() as download:
                page.click('#export')
            download.value.save_as(str(EVIDENCE / 'afu_animasyon.json'))
            exported = json.loads((EVIDENCE / 'afu_animasyon.json').read_text(encoding='utf-8'))
            assert exported == page.evaluate('studyo.exportData()') and exported['normalize'] is True
            page.reload()
            assert page.evaluate('studyo.exportData()') == exported
            page.locator('#file').set_input_files(str(EVIDENCE / 'afu_animasyon.json'))
            page.wait_for_function('document.getElementById("status").textContent==="Kayıt içe aktarıldı."')
            assert page.evaluate('studyo.exportData()') == exported
            checks.append('normalize=true ve seçili sekanslar JSON indirme/içe aktar/yeniden açma ile korunuyor.')
            for width in (900, 390):
                page.set_viewport_size({'width': width, 'height': 1000})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.screenshot(path=str(EVIDENCE / f'studyo_{width}.png'), full_page=True)
            assert not errors, errors
        finally:
            browser.close()
    before = json.loads((EVIDENCE / 'once_sha256.json').read_text())
    after = {p.as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for folder in ('windows/src', 'windows/public/afu/pet', 'windows/public/afu/durum') for p in Path(folder).rglob('*') if p.is_file()}
    assert before == after, 'Kaynak veya görsel değişti.'
    assert not (ROOT / 'windows/public/afu/boyut_tablosu.json').exists()
    checks.append('Kaynak ve görsel SHA256 aynı; tablo yalnız studyo altında; görünür pencere açılmadı.')
    report = {'motor': 'Chromium headless', 'dosya_sayisi': len(rows), 'referans_boy_px': target_height,
              'en_buyuk_boy_farki_yuzde': height_error, 'en_buyuk_ayak_farki_px': feet_error,
              'page_errors': errors, 'kontroller': checks, 'olcumler': rows}
    (EVIDENCE / 'tarayici_dogrulama.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    for check in checks:
        log('ADIM', check)
    print(json.dumps({k: v for k, v in report.items() if k != 'olcumler'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        main()
    except Exception as exc:
        log('HATA', repr(exc))
        raise
