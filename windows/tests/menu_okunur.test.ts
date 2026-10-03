import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

// Gerçek AfuViews ve CSS kullanılır; kopyalanmış düğmeler regresyonu kaçırır.
// Inline CSS, dosya yüklemesindeki gibi UTF-8 BOM'dan arındırılır.
const css = ["src/style.css", "src/apps.css"].map(f => readFileSync(f, "utf8").replace(/^\uFEFF/, '')).join('\n');
const screenshots = resolve("../gorsel");
let browser: Browser;
let page: Page;
let script: string;
beforeAll(async () => {
  const result = await build({
    stdin: { contents: `import { AfuViews } from './src/views/views';
      import { State, parseState } from './src/core/state';
      State.snapshot = parseState({version:1,tasks:[{id:'menu-test',agent:'codex',status:'Calisiyor',title:'Menüyü düzenle',updated_at:new Date().toISOString()}]});
      const noop = () => {};
      const v = new AfuViews({collapse:noop,quota:()=>v.sync(v.quota.hidden?'quota':'overview',true),apps:()=>v.sync(v.apps.hidden?'apps':'overview',true),chat:()=>v.sync(v.chat.hidden?'chat':'overview',true),orkestra:noop,sor:noop});
      document.querySelector('#island-clip').append(v.el);
      v.sync('overview',true); window.menuViews = v;`, resolveDir: process.cwd(), loader: "ts" },
    bundle: true, write: false, format: "iife", tsconfigRaw: {},
    // Node okuması, Windows sandbox'ında esbuild'in üst dizin taramasını önler.
    plugins: [{ name: "local-source", setup(builder) {
      const require = createRequire(import.meta.url);
      builder.onResolve({ filter: /.*/ }, args => {
        const base = args.importer ? dirname(args.importer) : process.cwd();
        const path = args.path.startsWith('.') ? resolve(base, args.path) : require.resolve(args.path);
        const file = [path, `${path}.ts`, `${path}.js`].find(existsSync)!;
        return { path: file, namespace: "source" };
      });
      builder.onLoad({ filter: /.*/, namespace: "source" }, args => ({
        contents: args.path.endsWith('.css') ? '' : readFileSync(args.path, 'utf8'),
        loader: args.path.endsWith('.ts') ? 'ts' : 'js',
      }));
    } }],
  });
  script = result.outputFiles[0].text;
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1600, height: 650 } });
  mkdirSync(screenshots, { recursive: true });
});
afterAll(async () => { await browser?.close(); });

async function mount(width: number, scale: number) {
  await page.setContent(`<!doctype html><html lang="tr"><style>${css}</style><body><div id="root"><div id="island" data-mode="expanded" style="width:${width}px;height:286px;--kart-olcek:${scale};border-radius:22px"><div id="island-clip"></div></div></div></body></html>`);
  await page.addScriptTag({ content: script });
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
}

for (const scale of [1, 1.5]) for (const width of [420, 640, 960]) {
  describe(`M2 gerçek kart ${width}px / %${scale * 100}`, () => {
    it("footer tek satır, etiketler kesilmez; sayfalar erişilebilir", async () => {
      await mount(width, scale);
      const measure = () => page.evaluate(() => {
        const f = document.querySelector('footer')!.getBoundingClientRect();
        return [...document.querySelectorAll<HTMLButtonElement>('footer button')].filter(b => !b.hidden).map(b => {
          const r = b.getBoundingClientRect(); const label = b.querySelector<HTMLElement>('.btn-label');
          return { text: b.textContent, rect: {left:r.left,right:r.right,top:r.top,bottom:r.bottom}, footer: {left:f.left,right:f.right,top:f.top,bottom:f.bottom}, fits: b.scrollWidth <= b.clientWidth,
            labelFits: !label || label.scrollWidth <= label.clientWidth,
            inside: r.left >= f.left - .5 && r.right <= f.right + .5 && r.top >= f.top - .5 && r.bottom <= f.bottom + .5,
            title: b.title, aria: b.getAttribute('aria-label') };
        });
      });
      for (const b of await measure()) {
        expect(b.fits, b.text ?? '').toBe(true); expect(b.labelFits, b.text ?? '').toBe(true);
        expect(b.inside, JSON.stringify(b)).toBe(true); expect(b.title).toBeTruthy(); expect(b.aria).toBeTruthy();
      }
      expect(await page.locator('footer .sor-button').isVisible()).toBe(true);
      if (width < 960) {
        await page.locator('.more-button').click();
        await page.keyboard.press('End');
        expect(await page.locator('.menu-close').evaluate(el => el === document.activeElement)).toBe(true);
        await page.keyboard.press('Home');
        expect(await page.getByRole('menuitem', { name: 'Kota durumu', exact: true }).evaluate(el => el === document.activeElement)).toBe(true);
        for (const name of ['Kota durumu', 'Uygulamalar', 'Orkestra', 'Sohbet'])
          expect(await page.getByRole('menuitem', { name, exact: true }).isVisible()).toBe(true);
        await page.getByRole('menuitem', { name: 'Uygulamalar', exact: true }).click();
        expect(await page.locator('.apps-view').isVisible()).toBe(true);
        for (const b of await measure()) expect(b.inside, b.text ?? '').toBe(true);
        await page.locator('.back-button').click();
        expect(await page.locator('.overview').isVisible()).toBe(true);
      }
      await page.locator('#island').screenshot({ path: resolve(screenshots, `menu-${scale * 100}${width === 640 ? '' : `-${width}`}.png`) });
    });
    it("Görev ara koyu ve eşit alanlar, ikon kapatma ve çalışan filtre", async () => {
      await mount(width, scale);
      await page.evaluate(() => (window as unknown as { menuViews: { openSearch(): void } }).menuViews.openSearch());
      const fields = await page.locator('.search-input,.search-select').evaluateAll(els => els.map(e => {
        const s = getComputedStyle(e); return { bg: s.backgroundColor, height: e.getBoundingClientRect().height, border: s.borderRadius };
      }));
      expect(fields).toHaveLength(3);
      for (const f of fields) { expect(f.bg).toBe('rgb(8, 14, 27)'); expect(f.height).toBe(fields[0].height); expect(f.border).toBe('7px'); }
      expect(await page.locator('.modal-close').getAttribute('class')).toContain('icon-button');
      expect(await page.getByRole('dialog', { name: 'Görev ara' }).isVisible()).toBe(true);
      const layout = await page.locator('.modal-dialog').evaluate(dialog => {
        const bounds = dialog.getBoundingClientRect();
        const elements = [...dialog.querySelectorAll('.modal-title,.modal-close,.search-bar,.search-input,.search-select,.search-results,.search-row')];
        return elements.map(el => {
          const r = el.getBoundingClientRect();
          return { name: el.className, inside: r.left >= bounds.left && r.right <= bounds.right && r.top >= bounds.top && r.bottom <= bounds.bottom };
        });
      });
      for (const item of layout) expect(item.inside, item.name).toBe(true);
      expect(await page.locator('.search-row').count()).toBe(1);
      const selects = page.locator('.search-select');
      await selects.nth(0).selectOption('gemini');
      expect(await page.locator('.search-row').count()).toBe(0);
      await selects.nth(0).selectOption('codex');
      expect(await page.locator('.search-row').count()).toBe(1);
      await selects.nth(1).selectOption('biten');
      expect(await page.locator('.search-row').count()).toBe(0);
      await selects.nth(1).selectOption('calisan');
      expect(await page.locator('.search-row').count()).toBe(1);
      await selects.nth(0).selectOption('hepsi');
      await selects.nth(1).selectOption('hepsi');
      await page.locator('.search-input').fill('bulunamayan');
      expect(await page.locator('.search-empty').textContent()).toBe('Eşleşen görev yok.');
      await page.locator('.search-input').fill('Menüyü');
      expect(await page.locator('.search-row').count()).toBe(1);
      await page.locator('#island').screenshot({ path: resolve(screenshots, `ara-${scale * 100}${width === 640 ? '' : `-${width}`}.png`) });
      await page.locator('.modal-close').click();
      expect(await page.locator('.modal-backdrop').isVisible()).toBe(false);
      await page.evaluate(() => (window as unknown as { menuViews: { openSearch(): void } }).menuViews.openSearch());
      await page.keyboard.press('Escape');
      expect(await page.locator('.modal-backdrop').isVisible()).toBe(false);
    });
  });
}
