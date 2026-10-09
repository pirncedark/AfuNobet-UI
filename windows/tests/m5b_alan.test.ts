import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { build } from "esbuild";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
let browser: Browser;
let script: string;
const css = ["src/style.css", "src/apps.css", "src/message/message.css"].map(f => readFileSync(f, "utf8").replace(/^\uFEFF/, '')).join("\n");
beforeAll(async () => {
  const result = await build({ stdin: { contents: `
    import { KonusanAfu } from './src/message/message';
    import { AfuViews } from './src/views/views';
    import { State, parseState } from './src/core/state';
    State.snapshot = parseState({ version:1, tasks:[{ id:'focus', agent:'codex', status:'Hata', task:'Görselleri hazırla', mesaj:'HTTP 429', updated_at:new Date().toISOString() }] });
    const noop = () => {};
    const v = new AfuViews({collapse:noop,quota:noop});
    document.querySelector('#island-clip').append(v.el); v.sync('overview',true);
    const k = new KonusanAfu(document.querySelector('#afu-pet'), document.querySelector('#afu-pet-balon'), document.querySelector('#afu-character'), v.overview, () => k.guncelle('expanded',true));
    k.guncelle('expanded',true);
    const msg = id => ({surum:1,id,ajan:'claude',tur:'bilgi',metin:'Claude: Görseller hazır\\n- Kart ve pet ekranları kontrol edildi\\n- Menü etiketleri okunuyor',zaman:Date.now()});
    k.ekle(msg('first'));
    window.m5b = {k,v,msg};`, resolveDir: process.cwd(), loader: 'ts' },
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
  browser = await chromium.launch({headless:true});
});
afterAll(async () => { await browser?.close(); });
async function screen(scale = 1, width = 640) {
  const page = await browser.newPage({viewport:{width:width < 640 ? width : 1200,height:700}});
  await page.setContent(`<style>${css}</style><div id="afu-pet"></div><div id="afu-pet-balon" style="--pet-balon-h:120px"></div><div id="island" data-mode="expanded" style="width:${width}px;height:300px;--kart-olcek:${scale}"><div id="island-clip"><div id="afu-character"></div></div></div>`);
  await page.evaluate(() => Object.defineProperty(window,'localStorage',{value:{getItem:()=> 'seen',setItem:()=>{}}}));
  await page.addScriptTag({content:script});
  return page;
}
it('expanded card shows no message balloon above the mascot', async () => {
  const page = await screen();
  try {
    const shown = await page.locator('#afu-character > .afu-konusma-balonu').evaluate(el => getComputedStyle(el).display);
    expect(shown).toBe('none');
  } finally { await page.close(); }
});
for (const width of [360, 640]) it(`quota task has no silent vertical overflow at ${width}px`, async () => {
  const page = await screen(1, width);
  try {
    const m = await page.locator('.main-task').evaluate(el => ({ height: el.clientHeight, scroll: el.scrollHeight }));
    expect(m.scroll).toBeLessThanOrEqual(m.height); expect(m.height).toBeGreaterThanOrEqual(94);
  } finally { await page.close(); }
});
it('agent pills and project action have 28px hit areas and one pill row', async () => {
  const page = await screen();
  try {
    const metrics = await page.locator('.agent-pill, .main-task .task-project').evaluateAll(els => els.map(el => {
      const r = el.getBoundingClientRect(); return { height: r.height, top: r.top, project: el.classList.contains('task-project') };
    }));
    expect(metrics.length).toBeGreaterThan(1);
    for (const r of metrics) expect(r.height).toBeGreaterThanOrEqual(28);
    const tops = metrics.filter(r => !r.project).map(r => Math.round(r.top));
    expect(Math.max(...tops)-Math.min(...tops)).toBeLessThanOrEqual(2);
  } finally { await page.close(); }
});
it('narrow quota panel exposes all renewal and last-check text', async () => {
  const page = await screen(1, 360);
  try {
    await page.evaluate(() => (window as any).m5b.v.sync('quota', true));
    const metrics = await page.locator('.quota-row small').evaluateAll(els => els.map(el => {
      const s = getComputedStyle(el); return { wrap: s.whiteSpace, width: el.clientWidth, scroll: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight };
    }));
    expect(metrics.length).toBeGreaterThan(0);
    for (const r of metrics) { expect(r.wrap).toBe('normal'); expect(r.scroll).toBeLessThanOrEqual(r.width); expect(r.scrollHeight).toBeLessThanOrEqual(r.height); }
  } finally { await page.close(); }
});
