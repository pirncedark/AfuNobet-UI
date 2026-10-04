// Development-only diagnostic: measure whether the island fits inside the
// window rectangle at the real panel size. Headless, no visible window.
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root, configLoader: "runner",
  optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
  server: { port: 0, strictPort: false, host: "127.0.0.1", watch: { ignored: /(?:^|[\\/])(?:target|dist|test-results)(?:[\\/]|$)/ } },
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const address = server.httpServer.address();
const origin = `http://127.0.0.1:${address.port}`;
const page = await browser.newPage({ viewport: { width: 720, height: 320 }, deviceScaleFactor: 1 });
page.on("pageerror", e => console.log("PAGEERROR", e.message));
await page.goto(`${origin}/tests/preview.html?case=working`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
await page.waitForTimeout(900);
const report = await page.evaluate(() => {
  const pick = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { sel, x: +r.x.toFixed(1), y: +r.y.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const sels = ["#island", "#content", "header", ".agent-pills", ".main-task", ".other-tasks", "footer", "#afu-character", ".claude-lock", ".task-row", ".more-count"];
  return {
    win: { w: innerWidth, h: innerHeight },
    items: sels.map(pick),
    scroll: { sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight },
  };
});
console.log(JSON.stringify(report, null, 1));
await browser.close();
await server.close();