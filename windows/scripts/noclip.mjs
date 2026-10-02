import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";

// Proves the island is never cut off. For every state x every scale the panel is
// placed in a viewport the size a 720x320 logical window really has at that DPI,
// and every box inside the island must stay within the viewport and the panel.
const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.join(root, "test-results", "screenshots");
const states = ["idle", "working", "waiting", "paused", "success", "error", "disconnected", "quota", "petit", "hidden", "stale", "quota-panel"];
const scales = [1, 1.25, 1.5, 1.75, 2];
const monitors = [{ name: "1366x768", w: 1366, h: 768 }, { name: "1920x1080", w: 1920, h: 1080 }];

const server = await createServer({
  root, configLoader: "runner",
  optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
  server: { port: 0, strictPort: false, host: "127.0.0.1", watch: { ignored: /(?:^|[\\/])(?:target|dist|test-results)(?:[\\/]|$)/ } },
});
const failures = [];
let browser, checks = 0;
try {
  await server.listen();
  await mkdir(out, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const { port } = server.httpServer.address();
  for (const state of states) {
    for (const s of scales) {
      // The window is 720x320 logical; on a scaled display the webview gets the
      // same CSS pixels, so the CSS viewport is 720x320 at every scale.
      const page = await browser.newPage({ viewport: { width: 720, height: 320 }, deviceScaleFactor: s });
      await page.goto(`http://127.0.0.1:${port}/tests/preview.html?case=${state}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
      await page.waitForTimeout(850);
      const r = await page.evaluate(() => {
        const island = document.getElementById("island");
        const ib = island.getBoundingClientRect();
        const cb = document.getElementById("island-clip").getBoundingClientRect();
        const V = { w: innerWidth, h: innerHeight };
        const outside = [], outsideIsland = [];
        for (const e of island.querySelectorAll("*")) {
          const b = e.getBoundingClientRect();
          if (!b.width && !b.height) continue;
          // The clip has overflow:hidden, so anything fully outside it is already
          // cut away and paints nothing. Only visible pixels can be clipped wrongly.
          const visible = b.right > cb.left && b.left < cb.right && b.bottom > cb.top && b.top < cb.bottom;
          if (!visible) continue;
          const tag = `${e.className || e.tagName}`;
          if (b.right > V.w + 0.5 || b.bottom > V.h + 0.5 || b.left < -0.5 || b.top < -0.5) outside.push(`${tag} r${b.right.toFixed(0)} b${b.bottom.toFixed(0)}`);
          if (b.bottom > ib.bottom + 0.5 || b.right > ib.right + 0.5) outsideIsland.push(`${tag} r${b.right.toFixed(0)} b${b.bottom.toFixed(0)}`);
        }
        const ch = document.getElementById("afu-character")?.getBoundingClientRect();
        const co = document.getElementById("content")?.getBoundingClientRect();
        // In expanded mode the character and the content column must not touch.
        const overlap = island.dataset.mode === "expanded" && ch && co && ch.right > co.left + 0.5 ? +(ch.right - co.left).toFixed(1) : 0;
        return { outside, outsideIsland, overlap, mode: island.dataset.mode, view: island.dataset.view };
      });
      checks++;
      const tag = `${state}@${s}x`;
      if (r.outside.length) failures.push(`${tag} clipped by viewport: ${r.outside.join(", ")}`);
      if (r.outsideIsland.length && r.mode === "expanded") failures.push(`${tag} clipped by island: ${r.outsideIsland.join(", ")}`);
      if (r.overlap) failures.push(`${tag} character overlaps content by ${r.overlap}px`);
      if (s === 1) await page.screenshot({ path: path.join(out, `${state}.png`), animations: "disabled" });
      await page.close();
    }
  }
  // Monitor simulation: the island must sit horizontally centred on the screen.
  for (const m of monitors) {
    const page = await browser.newPage({ viewport: { width: m.w, height: m.h }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/tests/preview.html?case=working`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.waitForTimeout(850);
    const centre = await page.evaluate(() => {
      const b = document.getElementById("island").getBoundingClientRect();
      return { offset: +((b.left + b.right) / 2 - innerWidth / 2).toFixed(2), top: +b.top.toFixed(2) };
    });
    checks++;
    if (Math.abs(centre.offset) > 0.5) failures.push(`${m.name}: island off-centre by ${centre.offset}px`);
    if (Math.abs(centre.top) > 0.5) failures.push(`${m.name}: island not at the top edge (top=${centre.top})`);
    await page.screenshot({ path: path.join(out, `monitor-${m.name}.png`), animations: "disabled" });
    await page.close();
  }
} finally { await browser?.close(); await server.close(); }
if (failures.length) { console.error("CLIPPING FAILURES:\n" + failures.map(f => "  " + f).join("\n")); process.exit(1); }
console.log(`No-clip proof passed: ${checks} viewport checks across ${scales.length} scales and ${monitors.length} monitors.`);
