// Q1 kanıtı: uzun metin (300+ karakter, boşluksuz kelime, uzun URL) hiçbir yerde
// taşmıyor; görünen metin "…" ile kırpılıyor, tam metin title'da.
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
const out = path.join(root, "..", "docs", "kanit", "q1");
await mkdir(out, { recursive: true });

const targets = [
  { name: `normal-${PANEL.w}x${PANEL.h}`, width: PANEL.w, height: PANEL.h, scale: 1 },
  { name: "ekran-1366x768-yuzde100", width: 1366, height: 768, scale: 1 },
];
const cases = ["uzun", "uzun-sohbet", "uzun-soru"];

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
        const eleman = (s) => {
          const e = document.querySelector(s);
          if (!e) return null;
          const r = e.getBoundingClientRect();
          return { metinUzunluk: (e.textContent ?? "").length, kirpildi: (e.textContent ?? "").endsWith("…"),
            titleVar: !!e.getAttribute("title"), titleUzunluk: (e.getAttribute("title") ?? "").length,
            w: Math.round(r.width), alt: Math.round(r.bottom), sag: Math.round(r.right) };
        };
        const yatayTasma = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        return {
          viewport: { w: window.innerWidth, h: window.innerHeight },
          yatayTasma,
          ad: eleman(".main-task h1"),
          balon: eleman(".afu-konusma-balonu"),
          balonMetin: eleman(".afu-balon-metin"),
          sohbet: eleman(".chat-answer"),
          soruBaslik: eleman(".soru-baslik"),
          soruMetin: eleman(".soru-metin"),
          soruDugme: eleman(".soru-secenekler .soru-dugme"),
          // Görünen kutu pencereyi aşıyor mu? (gizli öğe sayılmaz)
          tasan: [...document.querySelectorAll("h1,.row-title,.afu-konusma-balonu,.chat-answer,.soru-baslik,.soru-metin,.soru-dugme")]
            .filter(e => { const r = e.getBoundingClientRect(); if (r.width <= 0 && r.height <= 0) return false; return r.right > window.innerWidth + 1; }).length,
        };
      });
      report.olcumler.push({ case: name, hedef: target.name, ...olcum, hatalar: errors });
      const kirpilanlar = [olcum.ad, olcum.balon, olcum.balonMetin, olcum.sohbet, olcum.soruBaslik, olcum.soruMetin, olcum.soruDugme]
        .filter(Boolean).filter(e => e.titleVar && e.titleUzunluk >= e.metinUzunluk && (e.kirpildi || e.metinUzunluk < e.titleUzunluk));
      const ok = errors.length === 0 && olcum.yatayTasma <= 0 && olcum.tasan === 0 && kirpilanlar.length > 0;
      if (!ok) report.sorular.push(`${name}/${target.name}`);
      await page.screenshot({ path: path.join(out, `${suffix}-${target.name}-${name}.png`) });
      await page.close();
    }
  }
} finally {
  await browser?.close();
  await server.close();
}
await writeFile(path.join(out, `olcum-${suffix}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ panel: report.panel, sorular: report.sorular, ozet: report.olcumler.map(o => ({ case: o.case, hedef: o.hedef, yatayTasma: o.yatayTasma, tasan: o.tasan, ad: o.ad, balon: o.balon, sohbet: o.sohbet, soruMetin: o.soruMetin })) }, null, 2));
