import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "..", "docs", "kanit", "studyo_uygula");

await mkdir(output, { recursive: true });
const server = await createServer({
  root, configLoader: "runner",
  server: { port: 0 }
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const address = server.httpServer.address();
const origin = `http://127.0.0.1:${address.port}`;

const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 2 });
await page.goto(`${origin}/tests/preview.html?case=idle`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
await page.waitForTimeout(1000);

await page.screenshot({ path: path.join(output, "pet_studyo_bekleme.png") });

const transform = await page.evaluate(() => {
  const img = document.querySelector('.pet-image');
  return {
    src: img.getAttribute("src"),
    translate: img.style.translate,
    scale: img.style.scale
  };
});
console.log("PET BEKLEME:", transform);

// trigger hover (yuzme/uyan_yuzme)
await page.hover('#afu-pet');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(output, "pet_studyo_hover.png") });

const transformHover = await page.evaluate(() => {
  const img = document.querySelector('.pet-image');
  return {
    src: img.getAttribute("src"),
    translate: img.style.translate,
    scale: img.style.scale
  };
});
console.log("PET HOVER:", transformHover);

await browser.close();
await server.close();
