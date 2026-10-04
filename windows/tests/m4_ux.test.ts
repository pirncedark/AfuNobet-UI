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
    State.snapshot = parseState({ version:1, tasks:[{ id:'focus', agent:'codex', status:'Calisiyor', task:'Görselleri hazırla', stage:'VERIFY', updated_at:new Date().toISOString() }] });
    const noop = () => {};
    const v = new AfuViews({collapse:noop,quota:noop});
    document.querySelector('#island-clip').append(v.el); v.sync('overview',true);
    const k = new KonusanAfu(document.querySelector('#afu-pet'), document.querySelector('#afu-pet-balon'), document.querySelector('#afu-character'), v.overview, () => k.guncelle('expanded',true));
    k.guncelle('pet',true);
    const msg = id => ({surum:1,id,ajan:'claude',tur:'bilgi',metin:'Claude: Görseller hazır. Kartları kontrol ettim.',zaman:Date.now()});
    k.ekle(msg('first'));
    window.m4 = {k,v,msg};`, resolveDir: process.cwd(), loader: 'ts' },
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
  const page = await browser.newPage({viewport:{width:1200,height:700}});
  await page.setContent(`<style>${css}</style><div id="afu-pet"></div><div id="afu-pet-balon" style="--pet-balon-h:120px"></div><div id="afu-character"></div><div id="island" data-mode="expanded" style="width:${width}px;height:300px;--kart-olcek:${scale}"><div id="island-clip"></div></div>`);
  await page.evaluate(() => Object.defineProperty(window,'localStorage',{value:{getItem:()=> 'seen',setItem:()=>{}}}));
  await page.addScriptTag({content:script});
  return page;
}
it('pet balloon acknowledges only the visible message', async () => {
  const page = await screen();
  try {
    const balloon = page.locator('#afu-pet-balon > .afu-konusma-balonu');
    const ok = balloon.getByRole('button',{name:/Okudum/});
    expect(await ok.isVisible()).toBe(true);
    const metrics = await balloon.evaluate(el => {const s=getComputedStyle(el);return {width:el.getBoundingClientRect().width,bg:s.backgroundColor,border:parseFloat(s.borderWidth),font:parseFloat(s.fontSize),arrow:getComputedStyle(el,'::after').content};});
    expect(metrics.width).toBeGreaterThanOrEqual(200); expect(metrics.bg).not.toBe('rgba(0, 0, 0, 0)'); expect(metrics.border).toBeGreaterThan(0); expect(metrics.font).toBeGreaterThanOrEqual(12); expect(metrics.arrow).not.toBe('none');
    await page.evaluate(() => {const {k,msg}= (window as any).m4;k.ekle(msg('second'));});
    await ok.click();
    expect(await page.evaluate(() => (window as any).m4.k.model.aktif?.id)).toBe('second');
    await ok.click(); expect(await balloon.count()).toBe(0);
  } finally {await page.close();}
});
it('detail acknowledges its message and preserves the next', async () => {
  const page=await screen();
  try {
    await page.evaluate(() => {const {k,msg}=(window as any).m4;k.ekle(msg('second'));});
    await page.locator('#afu-pet-balon .afu-balon-metin').click();
    expect(await page.evaluate(() => (window as any).m4.k.model.aktif?.id)).toBe('first');
    const detail=page.locator('.afu-mesaj-detayi');
    await detail.getByRole('button',{name:'Okudum',exact:true}).click();
    expect(await detail.isVisible()).toBe(false);
    expect(await page.evaluate(() => (window as any).m4.k.model.aktif?.id)).toBe('second');
  } finally {await page.close();}
});
it('detail closes the captured external message, not a newer notification', async () => {
  const page = await screen();
  try {
    await page.evaluate(() => {
      const {k,msg} = (window as any).m4;
      (window as any).readIds = [];
      k.setHarici(msg('external-first'), () => (window as any).readIds.push('external-first'));
    });
    await page.locator('#afu-pet-balon .afu-balon-metin').click();
    await page.evaluate(() => {
      const {k,msg} = (window as any).m4;
      k.setHarici(msg('external-second'), () => (window as any).readIds.push('external-second'));
    });
    await page.locator('.afu-mesaj-detayi').getByRole('button', {name:'Okudum',exact:true}).click();
    expect(await page.evaluate(() => (window as any).readIds)).toEqual(['external-first']);
    expect(await page.locator('#afu-character .afu-konusma-balonu').count()).toBe(1);
  } finally {await page.close();}
});
for (const scale of [1,1.5]) for (const width of [640,420]) it(`stage labels fit: ${width}px x${scale}`, async () => {
  const page=await screen(scale,width);
  try {
    const result=await page.evaluate(() => {
      const bar=document.querySelector('.main-task .stage-bar')!,health=document.querySelector('.health-strip')!,card=document.querySelector('.main-task')!;
      const a=bar.getBoundingClientRect(),b=health.getBoundingClientRect(),c=card.getBoundingClientRect();
      return {overlap:a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top,inside:a.bottom<=c.bottom,items:[...bar.children].map(el=>({scroll:el.scrollWidth,width:el.clientWidth}))};
    });
    expect(result.overlap).toBe(false);expect(result.inside).toBe(true);
    for(const item of result.items) expect(item.scroll).toBeLessThanOrEqual(item.width);
  } finally {await page.close();}
});
