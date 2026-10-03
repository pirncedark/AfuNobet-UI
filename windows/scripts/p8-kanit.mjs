// P8 kanıtı: kartın gerçek pencere boyutunda başsız ekran görüntüsü.
// Pencere ölçüsü src/core/layout.ts'ten okunur, böylece aynı betik kart
// eski (720x320) ve yeni (1080x480) ölçülerde de doğru çerçeve kullanır.
// Görünür pencere açılmaz; yalnız headless Chromium ve yerel vite sunucusu.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const layout = await readFile(path.join(root, "src/core/layout.ts"), "utf8");
const say = (ad) => Number(layout.match(new RegExp(`${ad} = (\\d+(?:\\.\\d+)?)`))?.[1] ?? 0);
const PANEL = { w: say("PANEL_W"), h: say("PANEL_H") };
const OLC = say("KART_OLCEK") || 1;

const suffix = process.argv[2] ?? "sonra";
const out = path.join(root, "..", "docs", "kanit", "p8");
await mkdir(out, { recursive: true });

// Kartın sığması gereken gerçek ekranlar: 1366x768 @%100 ve 1920x1080 @%150.
const targets = [
  { name: `pencere-${PANEL.w}x${PANEL.h}`, width: PANEL.w, height: PANEL.h, scale: 1 },
  { name: "ekran-1366x768-yuzde100", width: 1366, height: 768, scale: 1 },
  { name: "ekran-1920x1080-yuzde150", width: 1920, height: 1080, scale: 1.5 },
];
const cases = ["working", "quota-panel", "selam", "hata-karti", "petit"];

const server = await createServer({
  root, configLoader: "runner",
  optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
  server: { port: 0, strictPort: false, host: "127.0.0.1", watch: { ignored: /(?:^|[\\/])(?:target|dist|test-results)(?:[\\/]|$)/ } },
});
const report = { panel: PANEL, kartOlcek: OLC, olcumler: [], tasma: [] };
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const name of cases) {
    for (const target of targets) {
      const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: target.scale });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${origin}/tests/preview.html?case=${name}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
      await page.waitForTimeout(900);
      const olcum = await page.evaluate(() => {
        const kutu = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
        const yazi = (s) => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
        return {
          viewport: { w: window.innerWidth, h: window.innerHeight },
          island: kutu("#island"), clip: kutu("#island-clip"), content: kutu("#content"),
          fit: getComputedStyle(document.getElementById("island")).getPropertyValue("--fit").trim(),
          zoom: getComputedStyle(document.getElementById("island")).zoom,
          yazi: { enKucukH1: yazi("h1"), altMenu: yazi("footer .text-button"), ozet: yazi(".summary"), etiket: yazi(".task-eyebrow") },
          health: [...document.querySelectorAll(".health-strip > *")].map(e => e.className + ":" + e.textContent),
          tasma: (() => { const c = document.getElementById("content"); return c ? c.scrollHeight - c.clientHeight : 0; })(),
        };
      });
      report.olcumler.push({ case: name, hedef: target.name, ...olcum, hatalar: errors });
      if (olcum.island && (olcum.island.w > target.width || olcum.island.h > target.height)) report.tasma.push(`${name}/${target.name}`);
      await page.screenshot({ path: path.join(out, `${suffix}-${name}-${target.name}.png`) });
      await page.close();
    }
  }
} finally {
  await browser?.close();
  await server.close();
}
await writeFile(path.join(out, `olcum-${suffix}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ panel: report.panel, kartOlcek: report.kartOlcek, tasma: report.tasma }, null, 2));
