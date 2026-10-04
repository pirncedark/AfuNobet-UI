import { createServer } from "vite";
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  configLoader: "runner",
  optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
  server: { port: 0, host: "127.0.0.1" },
});

await server.listen();
const port = server.httpServer.address().port;
const browser = await chromium.launch({ headless: true });

try {
  // Test html page that mounts Island or question card directly
  const page = await browser.newPage({ viewport: { width: 720, height: 400 } });
  
  // Navigate to preview.html
  await page.goto(`http://127.0.0.1:${port}/tests/preview.html?case=idle`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");

  // In the page, inject the question card into island
  const result = await page.evaluate(async () => {
    const { kartOlustur } = await import("/src/question/question.ts");
    const island = window.afuTest.island;
    
    // Create sample question
    const longQuestion = {
      id: "q-test-1",
      ajan: "claude",
      tur: "soru",
      baslik: "Kullanıcı Onayı Gerekiyor",
      metin: "src-tauri ve windows dizinlerindeki derleme ayarlarını güncelleyip eski önbellek dosyalarını temizlemek üzeresiniz. Bu işlem bağımlılıkları yeniden indirebilir (yaklaşık 150 karakterlik uzun soru metni).",
      ayrinti: "cargo clean && npm cache clean --force\nHedef dizin: C:\\Users\\afuuu\\Desktop\\afuproject\\AfuNobet-UI",
      secenekler: [
        { id: "opt1", etiket: "Tüm bağımlılıkları ve önbellek dosyalarını temizleyip devam et" },
        { id: "opt2", etiket: "Yalnızca yapılandırma dosyalarını güncelle ve temizliği atla" }
      ],
      serbestMetin: true,
      gizli: false,
      olusturma: Date.now(),
      sonGecerlilik: Date.now() + 600000,
    };

    const host = island.views.overview.querySelector(".soru-kap");
    host.hidden = false;
    while (host.firstChild) host.removeChild(host.firstChild);
    
    const kart = kartOlustur(document, longQuestion, async () => {}, 1);
    host.append(kart);
    island.questionOpen = true;
    island.syncDom();
    
    // Return dimensions and bounding rects
    const hostRect = host.getBoundingClientRect();
    const kartRect = kart.getBoundingClientRect();
    const overviewRect = island.views.overview.getBoundingClientRect();
    const contentRect = document.querySelector("#content").getBoundingClientRect();
    const islandRect = document.querySelector("#island").getBoundingClientRect();
    
    return {
      host: { width: hostRect.width, height: hostRect.height, top: hostRect.top, bottom: hostRect.bottom },
      kart: { width: kartRect.width, height: kartRect.height, scrollWidth: kart.scrollWidth, scrollHeight: kart.scrollHeight },
      content: { width: contentRect.width, height: contentRect.height },
      island: { width: islandRect.width, height: islandRect.height },
      buttons: [...kart.querySelectorAll("button")].map(b => ({ text: b.textContent, width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height })),
      input: kart.querySelector(".soru-alan") ? { width: kart.querySelector(".soru-alan").getBoundingClientRect().width, height: kart.querySelector(".soru-alan").getBoundingClientRect().height } : null
    };
  });

  console.log("Evaluation result:", JSON.stringify(result, null, 2));

  // Take screenshot of island (normal width ~640px)
  const islandElement = await page.$("#island");
  if (islandElement) {
    await islandElement.screenshot({ path: "../docs/kanit/sorukart/sorukart-normal-once.png" });
  }

  // Also take screenshot at 256px width container
  // Let's create an isolated test page or resize
  await page.evaluate(() => {
    const wrap = document.createElement("div");
    wrap.id = "test-256-wrap";
    wrap.style.cssText = "position:fixed;top:0;left:0;width:256px;padding:8px;background:#080e1b;z-index:9999;";
    const kart = document.querySelector(".soru-karti").cloneNode(true);
    wrap.append(kart);
    document.body.append(wrap);
  });

  const wrap256 = await page.$("#test-256-wrap");
  if (wrap256) {
    await wrap256.screenshot({ path: "../docs/kanit/sorukart/sorukart-256px-once.png" });
  }

} finally {
  await browser.close();
  await server.close();
}
