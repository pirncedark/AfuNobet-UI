import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { build } from "esbuild";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

// M5A: gezintide kalan iki adım. Gerçek AfuViews ve gerçek CSS kullanılır.
// "Küçült" tek tıkla çökmeli (ada kapanmadan önce sırayla kapanan ajan
// bildirimleri vardır) ve Kota her genişlikte gerçekten tıklanabilir olmalı.
const css = ["src/style.css", "src/apps.css"].map(f => readFileSync(f, "utf8").replace(/^﻿/, '')).join('\n');
let browser: Browser;
let page: Page;
let script: string;

// island.ts'teki collapse() ile aynı davranış: açık bir ajan bildirimi varsa
// önce O kapatılır ve çökme olmaz. `kalan` kaç bildirimin sırada olduğudur.
const kurulum = `import { AfuViews } from './src/views/views';
  import { State, parseState } from './src/core/state';
  State.snapshot = parseState({version:1,tasks:Array.from({length:4},(_,i)=>({id:'m5a-'+i,agent:'codex',status:'Calisiyor',title:'Gezinti adimi '+i,updated_at:new Date().toISOString()}))});
  const noop = () => {};
  const v = new AfuViews({ collapse: () => m5a.collapse(), quota: () => v.sync(v.quota.hidden ? 'quota' : 'overview', true),
    apps: () => v.sync(v.apps.hidden ? 'apps' : 'overview', true), chat: () => v.sync(v.chat.hidden ? 'chat' : 'overview', true),
    orkestra: () => v.sync(v.orkestra.hidden ? 'orkestra' : 'overview', true), sor: noop });
  document.querySelector('#island-clip').append(v.el);
  v.sync('overview', true);
  window.m5a = { v, kalan: 0, cagri: 0, collapse() {
    this.cagri++;
    if (this.kalan > 0) { this.kalan--; v.sync('overview', true); return; }
    v.sync('overview', false);
  } };`;

beforeAll(async () => {
  const result = await build({
    stdin: { contents: kurulum, resolveDir: process.cwd(), loader: "ts" },
    bundle: true, write: false, format: "iife", tsconfigRaw: {},
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
});
afterAll(async () => { await browser?.close(); });

async function mount(width: number, scale = 1) {
  await page.goto('about:blank');
  // setContent'te origin yoktur: bellek depolaması gerçek DOM tıklamasını sınar.
  await page.evaluate(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    } });
  });
  await page.setContent(`<!doctype html><html lang="tr"><style>${css}</style><body><div id="root"><div id="island" data-mode="expanded" style="width:${width}px;height:320px;--kart-olcek:${scale};border-radius:22px"><div id="island-clip"></div></div></div></body></html>`);
  await page.addScriptTag({ content: script });
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
}
/** Kart genişliğini değiştirip ResizeObserver'ın işini bitmesini bekle. */
async function genislet(width: number) {
  await page.evaluate(w => { document.querySelector<HTMLElement>('#island')!.style.width = `${w}px`; }, width);
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
}
const sayfalar = () => page.locator('.page-button').count();
const menuIcinde = () => page.locator('.more-menu .page-button').count();
const footerIcinde = () => page.locator('footer .page-button').count();
const acikMi = () => page.evaluate(() => !(window as unknown as { m5a: { v: { el: HTMLElement } } }).m5a.v.el.hidden);

describe("M5A Küçült", () => {
  for (const kalan of [0, 1, 3]) {
    it(`sıradaki ${kalan} ajan bildirimi olsa da tek tıkla çöker`, async () => {
      await mount(640);
      await page.evaluate(s => { (window as unknown as { m5a: { kalan: number; cagri: number } }).m5a.kalan = s; }, kalan);
      await page.locator('footer .collapse-button').click();
      await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => done())));
      expect(await acikMi()).toBe(false);
    });
  }
  it("bildirim kuyruğu taşsa da tıklama sınırlı denemede durur", async () => {
    await mount(640);
    const cagri = await page.evaluate(() => {
      const m = (window as unknown as { m5a: { kalan: number; cagri: number; collapse(): void } }).m5a;
      m.kalan = 50; m.cagri = 0;
      document.querySelector<HTMLButtonElement>('footer .collapse-button')!.click();
      return m.cagri;
    });
    expect(cagri).toBeGreaterThan(0);
    expect(cagri).toBeLessThanOrEqual(8);
  });
});

describe("M5A Kota her durumda erişilebilir", () => {
  // Geniş kart: dört sayfa düğmesi alt satırdadır, doğrudan tıklanır.
  it("geniş kartta Kota alt satırdan açılır ve geri döner", async () => {
    await mount(960);
    expect(await footerIcinde()).toBe(4);
    await page.locator('footer .page-button[data-page="quota"]').click();
    expect(await page.locator('.quota-view').isVisible()).toBe(true);
    await page.locator('footer .back-button').click();
    expect(await page.locator('.overview').isVisible()).toBe(true);
  });
  // Dar kart: düğmeler menüdedir; menüyü açan kullanıcı hepsini görmeli.
  it("dar kartta menüdeki Kota açılır ve geri döner", async () => {
    await mount(360);
    expect(await footerIcinde()).toBe(0);
    expect(await menuIcinde()).toBe(4);
    await page.locator('footer .more-button').click();
    await page.locator('.more-menu .page-button[data-page="quota"]').click();
    expect(await page.locator('.quota-view').isVisible()).toBe(true);
    await page.locator('footer .back-button').click();
    expect(await page.locator('.overview').isVisible()).toBe(true);
  });
  // M5A regresyonu: menü açıkken alt satır genişler (kart açılma animasyonu).
  // Ölçü canlı olduğu için düğmeler menüden kaçıp menünün örtmesiyle kayboluyordu.
  for (const [baslangic, son] of [[460, 960], [360, 720]] as const) {
    it(`menü açıkken kart ${baslangic}px → ${son}px genişlese de düğmeler menüde kalır`, async () => {
      await mount(baslangic);
      expect(await menuIcinde()).toBe(4);
      await page.locator('footer .more-button').click();
      await genislet(son);
      expect(await menuIcinde()).toBe(4);
      expect(await footerIcinde()).toBe(0);
      expect(await sayfalar()).toBe(4);
      for (const name of ['Kota durumu', 'Uygulamalar', 'Orkestra', 'Sohbet'])
        expect(await page.getByRole('menuitem', { name, exact: true }).isVisible(), name).toBe(true);
      await page.locator('.more-menu .page-button[data-page="quota"]').click();
      expect(await page.locator('.quota-view').isVisible()).toBe(true);
      await page.locator('footer .back-button').click();
      expect(await page.locator('.overview').isVisible()).toBe(true);
    });
  }
  // Menü kapalıyken alt satır ölçüsü yine karar verir: geniş kartta düğmeler
  // alt satıra döner, yani menü kapalıyken hiçbir sayfa kaybolmaz.
  it("menü kapanınca düğmeler ölçülen genişliğe göre alt satıra döner", async () => {
    await mount(360);
    await page.locator('footer .more-button').click();
    expect(await menuIcinde()).toBe(4);
    await page.locator('.more-menu .menu-close').click();
    await genislet(960);
    expect(await footerIcinde()).toBe(4);
    expect(await menuIcinde()).toBe(0);
    await page.locator('footer .page-button[data-page="quota"]').click();
    expect(await page.locator('.quota-view').isVisible()).toBe(true);
  });
});