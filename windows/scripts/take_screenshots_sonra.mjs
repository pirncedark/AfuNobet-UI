import { createServer } from "vite";
import { chromium } from "playwright";
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
  const page = await browser.newPage({ viewport: { width: 720, height: 400 } });
  await page.goto(`http://127.0.0.1:${port}/tests/preview.html?case=idle`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await page.waitForTimeout(600);

  // Setup long question in island
  await page.evaluate(async () => {
    const { kartOlustur } = await import("/src/question/question.ts");
    const island = window.afuTest.island;
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
  });

  const islandEl = await page.locator("#island");
  await islandEl.screenshot({ path: "../docs/kanit/sorukart/sorukart-normal-sonra.png" });

  // 256px snapshot
  await page.evaluate(async () => {
    const { kartOlustur } = await import("/src/question/question.ts");
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
    const wrap = document.createElement("div");
    wrap.id = "wrap-256";
    wrap.style.cssText = "position:fixed;top:0;left:0;width:256px;padding:8px;background:#080e1b;z-index:99999;box-sizing:border-box;";
    const kart = kartOlustur(document, longQuestion, async () => {}, 1);
    wrap.append(kart);
    document.body.append(wrap);
  });

  const wrap256 = await page.locator("#wrap-256");
  await wrap256.screenshot({ path: "../docs/kanit/sorukart/sorukart-256px-sonra.png" });

  console.log("Sonra ekran goruntuleri kaydedildi.");
} finally {
  await browser.close();
  await server.close();
}
