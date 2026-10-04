// Chromium layout with the Tauri branch enabled; this is not a Windows native test.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { build } from "esbuild";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

let browser: Browser;
let script: string;
const css = ["src/style.css", "src/apps.css", "src/chat.css", "src/message/message.css"]
  .map(file => readFileSync(file, "utf8").replace(/^\uFEFF/, "")).join("\n");
beforeAll(async () => {
  const result = await build({
    stdin: { contents: `
      import { Island } from './src/island/island';
      import { State, parseState } from './src/core/state';
      State.snapshot = parseState({version:1,tasks:[]});
      const island = new Island(document.querySelector('#root'));
      island.fsm.state = 'home'; island.setMode('expanded');
      window.layoutTest = {island};
    `, resolveDir: process.cwd(), loader: "ts" },
    bundle: true, write: false, format: "iife", tsconfigRaw: {},
    plugins: [{ name: "native-layout-fixture", setup(builder) {
      const require = createRequire(import.meta.url);
      builder.onResolve({ filter: /.*/ }, args => {
        if (args.path.startsWith("@tauri-apps/api/")) return { path: args.path, namespace: "native-mock" };
        const base = args.importer ? dirname(args.importer) : process.cwd();
        const path = args.path.startsWith(".") ? resolve(base, args.path) : require.resolve(args.path);
        return { path: [path, `${path}.ts`, `${path}.js`].find(existsSync)!, namespace: "source" };
      });
      builder.onLoad({ filter: /.*/, namespace: "native-mock" }, args => ({ contents:
        args.path.endsWith("/core") ? `export const invoke = (command,args) => window.nativeInvoke(command,args);` :
        args.path.endsWith("/event") ? `export const listen = async () => () => {};` :
        `export const getCurrentWindow = () => ({scaleFactor: async () => window.fixtureNativeScale, onDragDropEvent: async () => () => {}, onFocusChanged: async () => () => {}});`, loader: "js" }));
      builder.onLoad({ filter: /.*/, namespace: "source" }, args => ({
        contents: args.path.endsWith(".css") ? "" : readFileSync(args.path, "utf8"),
        loader: args.path.endsWith(".ts") ? "ts" : "js",
      }));
    } }],
  });
  script = result.outputFiles[0].text;
  browser = await chromium.launch({ headless: true });
});
afterAll(async () => { await browser?.close(); });

const cases = [420, 640, 850, 1080].flatMap(width => [1, 1.25, 1.5].map(dpi => ({ width, dpi, nativeScale: dpi })));
cases.push({ width: Math.round(1080 / 1.32), dpi: 1.32, nativeScale: 1 });
for (const { width, dpi, nativeScale } of cases) {
  it(`native branch keeps apps/chat footer inside ${width}px at DPR ${dpi}, native ${nativeScale}`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 480 }, deviceScaleFactor: dpi, reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const heights: number[] = [];
    let resizeQueue = Promise.resolve();
    await page.exposeFunction("resizeNativeClient", (h: number) => {
      heights.push(h);
      // dpi.rs clamps height in native logical units. The mock monitor is 900px tall.
      resizeQueue = resizeQueue.then(() => page.setViewportSize({ width, height: Math.max(1, Math.round(Math.min(h, 900 * dpi / nativeScale * .85) * nativeScale / dpi)) }));
      return resizeQueue;
    });
    await page.route("**/afu/**", route => {
      const file = resolve("public", new URL(route.request().url()).pathname.slice(1));
      return existsSync(file) ? route.fulfill({ body: readFileSync(file) }) : route.abort();
    });
    await page.route("http://afu.test/", route => route.fulfill({ body: "<!doctype html><html></html>", contentType: "text/html" }));
    try {
      await page.goto("http://afu.test/");
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div id="root"></div></body></html>`);
      await page.evaluate(nativeScale => {
        (window as any).fixtureNativeScale = nativeScale;
        (window as any).__TAURI_INTERNALS__ = {};
        Object.defineProperty(screen, "availHeight", { value: 900 });
        (window as any).nativeInvoke = async (command: string, args: any) => {
          if (command === "kart_yukseklik") await (window as any).resizeNativeClient(args.h);
          return null;
        };
      }, nativeScale);
      await page.addScriptTag({ content: script });
      for (const view of ["apps", "chat"]) for (const long of [false, true]) {
        await page.evaluate(({ view, long, nativeScale }) => {
          const island = (window as any).layoutTest.island;
          island.setNativeScale(nativeScale);
          if (view === "apps") island.views.setApps({ apps: Array.from({ length: long ? 24 : 2 }, (_, i) => ({
            id: `test-${i}`, ad: `Afu uygulaması ${i}`, kurulu: true, telefonda: false, durum: "bos", ozet: "Kullanıma hazır",
          })), durumlar: {} });
          island.setView(view);
          if (view === "chat") {
            island.chat.model.text = long ? "Uzun sohbet yanıtı. ".repeat(500) : "Merhaba.";
            island.chat.render();
          }
        }, { view, long, nativeScale });
        // Wait for observer-driven native resizes to settle, not just the first IPC.
        let settled = false;
        for (let attempt = 0; attempt < 20; attempt++) {
          await resizeQueue;
          const count = heights.length;
          await page.waitForTimeout(100);
          if (count === heights.length) { settled = true; break; }
        }
        const resizeMetrics = await page.evaluate(() => {
          const island = (window as any).layoutTest.island;
          const active = document.querySelector('.apps-view:not([hidden]), .chat-view:not([hidden])') as HTMLElement;
          return { innerHeight, activeScrollHeight: active?.scrollHeight, headerHeight: island.views.header.offsetHeight, footerHeight: island.views.footer.offsetHeight };
        });
        expect(settled, `${view}/${long}: native resize observer did not settle; heights=${JSON.stringify(heights.slice(-20))}; metrics=${JSON.stringify(resizeMetrics)}`).toBe(true);
        const box = await page.evaluate(() => {
          const panel = document.querySelector("#island")!.getBoundingClientRect();
          const panelEl = document.querySelector("#island") as HTMLElement;
          const footer = document.querySelector("#content footer")!.getBoundingClientRect();
          const content = document.querySelector("#content") as HTMLElement;
          const active = content.querySelector(".apps-view:not([hidden]), .chat-view:not([hidden])") as HTMLElement;
          return { panel: { left: panel.left, right: panel.right, bottom: panel.bottom },
            footer: { left: footer.left, right: footer.right, bottom: footer.bottom },
            viewport: { width: innerWidth, height: innerHeight },
            overflowX: content.scrollWidth - content.clientWidth,
            metrics: { height: panelEl.style.height, zoom: getComputedStyle(panelEl).zoom, fit: getComputedStyle(panelEl).getPropertyValue('--fit'), offsetHeight: panelEl.offsetHeight, clientHeight: panelEl.clientHeight, innerHeight, animatedHeight: (window as any).layoutTest.island.height.value },
            bodyOverflowX: active.scrollWidth - active.clientWidth,
            bodyOverflowY: active.scrollHeight - active.clientHeight,
            answerText: (document.querySelector('.chat-view .chat-answer:not([hidden])') as HTMLElement)?.innerText ?? '',
            chatMascotHeight: document.querySelector('.chat-view .chat-mascot img')?.getBoundingClientRect().height ?? 0,
            protruding: Array.from(content.querySelectorAll('*')).filter(el => {
              const r = el.getBoundingClientRect(); return r.width > 0 && r.right > content.getBoundingClientRect().right + 1;
            }).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.slice(0, 60) })) };
        });
        mkdirSync("test-results/uiux-native", { recursive: true });
        await page.screenshot({ path: `test-results/uiux-native/${width}-${dpi}-${nativeScale}-${view}-${long ? "long" : "short"}.png` });
        expect(box.panel.left, `${view}/${long}: panel left`).toBeGreaterThanOrEqual(-1);
        expect(box.panel.right, `${view}/${long}: panel right`).toBeLessThanOrEqual(box.viewport.width + 1);
        expect(box.panel.bottom, `${view}/${long}: panel bottom ${JSON.stringify(box.metrics)}`).toBeLessThanOrEqual(box.viewport.height + 1);
        expect(box.footer.bottom, `${view}/${long}: footer clipped`).toBeLessThanOrEqual(box.panel.bottom + 1);
        expect(box.footer.right, `${view}/${long}: footer right`).toBeLessThanOrEqual(box.panel.right + 1);
        expect(box.footer.left, `${view}/${long}: footer left`).toBeGreaterThanOrEqual(box.panel.left - 1);
        expect(box.overflowX, `${view}/${long}: content horizontal overflow ${JSON.stringify(box.protruding)}`).toBeLessThanOrEqual(1);
        expect(box.bodyOverflowX, `${view}/${long}: active body horizontal overflow`).toBeLessThanOrEqual(1);
        if (view === "chat") {
          expect(box.answerText.trim()).toBe(long ? "Uzun sohbet yanıtı. ".repeat(500).trim() : "Merhaba.");
          if (long) expect(box.bodyOverflowY, "long chat must scroll in its body").toBeGreaterThan(0);
          expect(box.chatMascotHeight, "chat mascot must be visible").toBeGreaterThan(0);
          expect(box.chatMascotHeight * dpi / nativeScale, "chat mascot must fit 170 native logical pixels").toBeLessThanOrEqual(171);
        }
      }
      expect(heights.length).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 15000);
}
