import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { createServer, type ViteDevServer } from "vite";
let browser: Browser, server: ViteDevServer, origin: string;
beforeAll(async () => {
  server = await createServer({ configLoader: "runner", optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] }, server: { host: "127.0.0.1", port: 0, strictPort: false } });
  await server.listen();
  origin = `http://127.0.0.1:${(server.httpServer!.address() as {port:number}).port}`;
  browser = await chromium.launch({ headless: true });
});
afterAll(async () => { await browser?.close(); await server?.close(); });
for (const width of [420, 640]) for (const zoom of [1, 1.5]) it(`28px targets and footer fit at ${width}/${zoom}`, async () => {
  const page = await browser.newPage({ viewport: { width, height: 820 }, reducedMotion: "reduce" });
  try {
    await page.goto(`${origin}/tests/preview.html?case=working`);
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.evaluate(z => { document.body.style.zoom = String(z); }, zoom);
    await page.waitForTimeout(300);
    const rows = await page.locator('.other-tasks .task-row').evaluateAll(els => els.map(el => ({ rect: el.getBoundingClientRect().toJSON(), font: getComputedStyle(el).fontSize })));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) { expect(row.rect.height / zoom).toBeGreaterThanOrEqual(28); expect(row.font).toBe('11px'); }
    for (let i=1;i<rows.length;i++) expect((rows[i].rect.top-rows[i-1].rect.bottom)/zoom).toBeGreaterThanOrEqual(4);
    expect(await page.locator('.summary').getAttribute('title')).toBe(await page.locator('.summary').textContent());
    for (const selector of ['.search-button', 'footer .collapse-button']) {
      const r = await page.locator(selector).boundingBox();
      expect(r).not.toBeNull();
      expect(r!.width/zoom).toBeGreaterThanOrEqual(27.5);
      expect(r!.height/zoom).toBeGreaterThanOrEqual(27.5);
    }
    await page.evaluate(() => (window as any).afuTest.island.setView('quota'));
    await page.waitForTimeout(100);
    const footer = await page.locator('footer').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
    expect(footer.scroll).toBeLessThanOrEqual(footer.client+1);
    await page.locator('.more-button').click();
    const targets = await page.locator('.more-menu button:visible, .more-menu summary:visible').evaluateAll(els => els.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
    for (const target of targets) { expect(target.width/zoom).toBeGreaterThanOrEqual(27.5); expect(target.height/zoom).toBeGreaterThanOrEqual(27.5); }
    const gaps = await page.locator('.more-menu > button:visible, .more-menu > details:visible').evaluateAll(els => els.map(el => el.getBoundingClientRect().toJSON()));
    for (let i=1;i<gaps.length;i++) expect((gaps[i].top-gaps[i-1].bottom)/zoom).toBeGreaterThanOrEqual(4);
  } finally { await page.close(); }
}, 15000);

