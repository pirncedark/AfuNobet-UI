import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root, configLoader: "runner",
  optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
  server: { port: 0, strictPort: false, host: "127.0.0.1", watch: { ignored: /(?:^|[\\/])(?:target|dist|test-results)(?:[\\/]|$)/ } },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const { port } = server.httpServer.address();
  const page = await browser.newPage({ viewport: { width: 720, height: 320 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/tests/preview.html?case=working`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await page.waitForTimeout(900);
  console.log(JSON.stringify(await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; };
    const clip = document.getElementById("island-clip");
    const ch = document.getElementById("afu-character");
    const co = document.getElementById("content");
    return {
      viewport: [innerWidth, innerHeight],
      island: r(document.getElementById("island")),
      clip: r(clip),
      clipRows: getComputedStyle(clip).gridTemplateRows,
      clipCols: getComputedStyle(clip).gridTemplateColumns,
      char: r(ch),
      charPos: getComputedStyle(ch).position,
      charTop: getComputedStyle(ch).top,
      charAlign: getComputedStyle(ch).alignSelf,
      content: r(co),
      contentPos: getComputedStyle(co).position,
      contentScrollH: co.scrollHeight,
      contentClientH: co.clientHeight,
    };
  }), null, 1));
} finally { await browser?.close(); await server.close(); }
