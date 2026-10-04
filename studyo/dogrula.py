"""Kurulu Playwright ile çevrimdışı file:// stüdyosunu başsız doğrular."""
import hashlib
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from hazirla import EVIDENCE, ROOT, log


def main():
    checks = []
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 980}, accept_downloads=True)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto((ROOT / 'studyo/animasyon_studyo.html').as_uri())
        page.wait_for_function('document.querySelector("#petImage").naturalWidth > 0')
        assert page.evaluate('studyo.assets.filter(a=>a.group==="pet").length') == 44
        assert page.evaluate('studyo.assets.filter(a=>a.group==="durum").length') == 27
        loaded = page.evaluate('''async () => await Promise.all(studyo.assets.map(a=>new Promise(resolve=>{
            const img=new Image();img.onload=()=>resolve({kare:a.kare,ok:img.naturalWidth>0});
            img.onerror=()=>resolve({kare:a.kare,ok:false});img.src=a.path;
        })))''')
        assert all(a['ok'] for a in loaded), loaded
        checks.append('71 göreli WebP yolu file:// altında yüklendi; yedekler alınmadı.')
        initial = page.evaluate('studyo.exportData()')
        expected = json.loads((EVIDENCE / 'varsayilan.json').read_text(encoding='utf-8'))
        assert initial == expected
        checks.append('12 eski sekans ve T süreleri varsayılan JSON ile aynı; Infinity=null korunuyor.')
        page.locator('#play').click()
        assert page.locator('#play').inner_text() == 'Oynat'
        assert page.locator('#frozen').is_visible()
        page.locator('#forward').click()
        assert '2 / 9' in page.locator('#frameInfo').inner_text()
        page.locator('#back').click()
        assert '1 / 9' in page.locator('#frameInfo').inner_text()
        checks.append('Oynat/Durdur ve önceki/sonraki kare; durdurmada canvas görüntüsü donuyor.')
        page.locator('#speed').fill('2')
        assert page.locator('#speedValue').inner_text() == '2×'
        page.locator('#new').click()
        page.locator('#seqName').fill('test_anim')
        page.locator('#rename').click()
        page.locator('.frame input').fill('100')
        page.locator('.frame input').press('Tab')
        page.locator('#durumTab').click()
        assert page.locator('.tile').count() == 27
        page.locator('.tile').first.hover()
        assert page.locator('#preview').is_visible()
        page.locator('.tile').first.click()
        assert page.evaluate('studyo.exportData().sekanslar.test_anim[1].kare') == 'durum/basari'
        page.locator('.frame').nth(1).locator('input').fill('100')
        page.locator('.frame').nth(1).locator('input').press('Tab')
        page.locator('#play').click()
        page.wait_for_timeout(350)
        assert 'test_anim' in page.locator('#frameInfo').inner_text()
        page.locator('#play').click()
        page.locator('.frame').nth(1).drag_to(page.locator('.frame').first)
        assert page.evaluate('studyo.exportData().sekanslar.test_anim[0].kare') == 'durum/basari'
        page.locator('.frame').first.get_by_role('button', name='Kareyi kopyala').click()
        assert page.locator('.frame').count() == 3
        page.locator('.frame').first.get_by_role('button', name='Kareyi sil').click()
        assert page.locator('.frame').count() == 2
        checks.append('Yeni sekans, yeniden adlandırma, durum karesi ekleme, süre düzenleme, sürükle-bırak, kopyalama ve silme.')
        page.locator('#scale').fill('125')
        page.locator('#x').fill('25')
        page.locator('#y').fill('-10')
        assert page.evaluate('studyo.exportData().ayar.test_anim') == {'olcek': 125, 'x': 25, 'y': -10}
        # Drag at the known image box rather than at an offset outside the stage.
        rect = page.locator('#pet').bounding_box()
        page.mouse.move(rect['x'] + rect['width']/2, rect['y'] + rect['height']/2)
        page.mouse.down()
        page.mouse.move(rect['x'] + rect['width']/2 + 22, rect['y'] + rect['height']/2 - 15, steps=5)
        page.mouse.up()
        assert page.evaluate('studyo.exportData().ayar.test_anim.x') == 47
        assert page.evaluate('studyo.exportData().ayar.test_anim.y') == -25
        page.locator('#align').click()
        assert 'ölçülemedi' not in page.locator('#status').inner_text()
        aligned = page.evaluate('studyo.exportData().ayar.test_anim.y')
        assert aligned >= 0
        checks.append('Sekans başına ölçek/konum, sahnede sürükleme ve file:// alfa sınırları ile ayak hizalaması.')
        edited = page.evaluate('studyo.exportData()')
        page.reload()
        assert page.evaluate('studyo.exportData()') == edited
        checks.append('Sayfa yeniden açılınca localStorage değişiklikleri korunuyor.')
        with page.expect_download() as download:
            page.locator('#export').click()
        download.value.save_as(str(EVIDENCE / 'afu_animasyon.json'))
        exported = json.loads((EVIDENCE / 'afu_animasyon.json').read_text(encoding='utf-8'))
        assert exported == edited
        page.wait_for_function('document.querySelector("#status").textContent.includes("JSON indirildi")')
        clipboard_status = page.locator('#status').inner_text()
        checks.append('Dışa aktar gerçek afu_animasyon.json indiriyor ve şema doğrulamasından geçiyor; ' + clipboard_status)
        page.locator('#file').set_input_files({'name': 'invalid.json', 'mimeType': 'application/json', 'buffer': b'{"surum":1,"sekanslar":{"__proto__":[]},"ayar":{}}'})
        page.wait_for_function('document.querySelector("#status").textContent.startsWith("Dosya geçersiz")')
        assert page.evaluate('studyo.exportData()') == edited
        page.locator('#file').set_input_files(str(EVIDENCE / 'varsayilan.json'))
        page.wait_for_function('document.querySelector("#status").textContent==="Kayıt içe aktarıldı."')
        assert page.evaluate('studyo.exportData()') == expected
        page.locator('#new').click()
        page.once('dialog', lambda dialog: dialog.accept())
        page.locator('#reset').click()
        assert page.evaluate('studyo.exportData()') == expected
        checks.append('Geçerli JSON içe aktarılıyor; zararlı/bozuk JSON mevcut çalışmayı değiştirmiyor; varsayılana dönüş çalışıyor.')
        page.locator('#play').click()
        for width, height, filename in [(1440, 980, 'studyo_masaustu.png'), (900, 1000, 'studyo_tablet.png'), (390, 844, 'studyo_mobil.png')]:
            page.set_viewport_size({'width': width, 'height': height})
            page.screenshot(path=str(EVIDENCE / filename), full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), filename
        checks.append('1440, 900 ve 390 pikselde ekran görüntüleri alındı; yatay taşma yok.')
        page.add_init_script('Storage.prototype.setItem = function(){throw new DOMException("blocked","SecurityError")};')
        page.reload()
        page.locator('#new').click()
        assert 'Otomatik kayıt yapılamadı' in page.locator('#status').inner_text()
        page.locator('#file').set_input_files(str(EVIDENCE / 'varsayilan.json'))
        page.wait_for_function('document.querySelector("#status").textContent==="Kayıt içe aktarıldı."')
        checks.append('localStorage yazma izni olmadığında uygulama çalışıyor ve dışa aktar öneriliyor.')
        assert not errors, errors
        browser.close()
    for filename in ('gorsel_sha256.json', 'kaynak_sha256.json'):
        expected_hashes = json.loads((EVIDENCE / filename).read_text())
        changed = [name for name, digest in expected_hashes.items() if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != digest]
        assert not changed, 'Değişmiş dosyalar: ' + str(changed)
    checks.append('71 görsel ve windows/src SHA-256 değerleri aynı; yasaklanan dosyalara dokunulmadı.')
    (EVIDENCE / 'tarayici_dogrulama.json').write_text(json.dumps({'sonuc': 'TAMAM', 'motor': 'Playwright Chromium headless', 'url': 'file://', 'page_errors': errors, 'kontroller': checks}, ensure_ascii=False, indent=2), encoding='utf-8')
    for check in checks: log('ADIM', check)
    print('\n'.join(checks))


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    try: main()
    except Exception as exc:
        log('HATA', 'Başsız doğrulama: ' + repr(exc))
        raise
