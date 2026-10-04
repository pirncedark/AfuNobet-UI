import { it, expect, afterAll } from "vitest";
import { chromium, Browser } from "playwright";
import { readFileSync } from "node:fs";

let browser: Browser | null = null;
afterAll(async () => { if (browser) await browser.close(); });

it("Mini pet açık bildirimi sekmelerin üstüne binmez", async () => {
  const css = readFileSync("src/style.css", "utf8") + "\n" + readFileSync("src/message/message.css", "utf8");
  
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="tr">
    <head><style>${css}</style></head>
    <body>
      <div id="content" style="height: 400px; display: flex; flex-direction: column; overflow: hidden; padding: 12px;">
        <div class="overview"><div style="height: 800px;">Tall content</div></div>
        <p class="tik-bildirim">Mini pet açık</p>
        <footer class="footer" style="margin-top: auto; height: 29px;"></footer>
      </div>
    </body>
    </html>
  `);
  
  const bildirimBox = await page.locator(".tik-bildirim").boundingBox();
  const footerBox = await page.locator("footer").boundingBox();
  
  expect(bildirimBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  
  // Bildirim, footer'ın (sekmelerin bulunduğu yerin) üstünde bitmelidir.
  // Çakışmamalıdır.
  expect(bildirimBox!.y + bildirimBox!.height).toBeLessThanOrEqual(footerBox!.y);
});
