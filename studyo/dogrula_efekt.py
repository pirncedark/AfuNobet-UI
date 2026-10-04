import json
from pathlib import Path
from playwright.sync_api import sync_playwright

def main():
    out_dir = Path('docs/kanit/studyo_efekt')
    out_dir.mkdir(parents=True, exist_ok=True)
    html_path = Path('studyo/animasyon_studyo.html').resolve()
    
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1200, 'height': 800})
        
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        
        page.goto(html_path.as_uri())
        page.wait_for_selector('#petImage')
        
        for preset in ['Sakin', 'Neseli', 'Uykulu', 'Heyecanli']:
            page.click(f'#preset{preset}')
            page.wait_for_timeout(500)
            page.screenshot(path=str(out_dir / f'preset_{preset.lower()}.png'))
            
        page.set_viewport_size({'width': 390, 'height': 844})
        page.wait_for_timeout(500)
        page.screenshot(path=str(out_dir / 'narrow_390.png'))
        
        state = page.evaluate('() => window.studyo.exportData()')
        with open(out_dir / 'export_sample.json', 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
            
        browser.close()
        
    if errors:
        print("Hatalar bulundu:")
        for err in errors:
            print("-", err)
        exit(1)
    print("Doğrulama başarılı.")

if __name__ == '__main__':
    main()
