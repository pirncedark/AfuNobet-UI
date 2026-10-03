// P9 kanıtı: soru kartında seçenekler ve "Diğer" alanı HER ZAMAN görünür.
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

const suffix = process.argv[2] ?? "sonra";
const out = path.join(root, "..", "docs", "kanit", "p9");
await mkdir(out, { recursive: true });

// Kartın sığması gereken gerçek ekranlar: gerçek pencere ölçüsü ve 1366x768 @%100.
const targets = [
  { name: `normal-${PANEL.w}x${PANEL.h}`, width: PANEL.w, height: PANEL.h, scale: 1 },
  { name: "ekran-1366x768-yuzde100", width: 1366, height: 768, scale: 1 },
];
const cases = ["soru"];

const server = await createServer({
  root, configLoader: "runner",
  optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
  server: { port: 0, strictPort: false, host: "127.0.0.1", watch: { ignored: /(?:^|[\\/])(?:target|dist|test-results)(?:[\\/]|$)/ } },
});
const report = { panel: PANEL, olcumler: [], sorular: [] };
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
        const kutu = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), alt: Math.round(r.bottom) }; };
        const icinde = (s, ust) => {
          const a = document.querySelector(s), b = document.querySelector(ust);
          if (!a || !b) return false;
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          return ra.top >= rb.top - 1 && ra.bottom <= rb.bottom + 1 && ra.width > 0 && ra.height > 0;
        };
        const digerler = [...document.querySelectorAll(".soru-secenekler .soru-dugme")]
          .map(e => { const r = e.getBoundingClientRect(); return { yazi: e.textContent, alt: Math.round(r.bottom), yukseklik: Math.round(r.height) }; });
        const alan = document.querySelector(".soru-alan");
        const kap = document.querySelector(".soru-kap");
        return {
          viewport: { w: window.innerWidth, h: window.innerHeight },
          island: kutu("#island"), content: kutu("#content"), kap: kutu(".soru-kap"),
          kart: kutu(".soru-karti"), secenekler: kutu(".soru-secenekler"), yazi: kutu(".soru-yazi"),
          ayrintiDugme: kutu(".soru-karti .soru-ayrinti-dugme"), ayrintiKutu: kutu(".soru-ayrinti"),
          altMenuGorunur: (() => { const f = document.querySelector("footer"); return f ? getComputedStyle(f).display !== "none" : null; })(),
          digerDugmeler: digerler,
          // Her seçenek ve cevap alanı kartın içinde, kartın alt yarısında mı?
          seceneklerIcinde: digerler.every(d => d.yukseklik > 0 && d.alt <= (kutu(".soru-karti")?.alt ?? 0)),
          alanIcinde: alan ? icinde(".soru-alan", ".soru-karti") : null,
          kapTasma: kap ? kap.scrollHeight - kap.clientHeight : null,
          govdeKaydirma: (() => { const g = document.querySelector(".soru-govde"); return g ? { tasma: g.scrollHeight - g.clientHeight, kaydirilabilir: g.scrollHeight > g.clientHeight } : null; })(),
        };
      });
      report.olcumler.push({ case: name, hedef: target.name, ...olcum, hatalar: errors });
      const ok = !olcum.altMenuGorunur && olcum.seceneklerIcinde && olcum.alanIcinde === true && errors.length === 0
        && olcum.digerDugmeler.length === 4 && olcum.digerDugmeler.every(d => d.yukseklik > 0);
      if (!ok) report.sorular.push(`${name}/${target.name}`);
      await page.screenshot({ path: path.join(out, `${suffix}-${target.name}.png`) });
      await page.close();
    }
  }
} finally {
  await browser?.close();
  await server.close();
}
await writeFile(path.join(out, `olcum-${suffix}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ panel: report.panel, sorular: report.sorular }, null, 2));
