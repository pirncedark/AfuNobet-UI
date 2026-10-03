// Q3 kanıtı: %150 ölçek (1280x720 @ deviceScaleFactor 1.5) ve 1366x768 @1.0
// altında kart, sohbet, soru kartı ve mini pet çizilir; kritik kontrollerin
// (ana düğme, kapat, seçenekler, alt menü) görünür VE tıklanabilir olduğu
// elementFromPoint ile denetlenir. Görünür pencere açılmaz.
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
const out = path.join(root, "..", "docs", "kanit", "q3");
await mkdir(out, { recursive: true });

// 1280x720 @%150 -> CSS görüntü alanı 1280x720, fiziksel 1920x1080.
const targets = [
  { name: "1280x720-yuzde150", width: 1280, height: 720, scale: 1.5 },
  { name: "1366x768-yuzde100", width: 1366, height: 768, scale: 1 },
];
// Kart (P8 sonrası 1,5x), sohbet, soru kartı, mini pet.
const cases = ["working", "sohbet", "soru", "petit"];

/** Her yüzeyin kritik kontrolleri: [css seçici, ad] — ana düğme, kapat, seçenek, alt menü. */
const KRITIK = {
  working: [[".sor-button", "ana dugme"], ["footer .more-button", "alt menu"]],
  sohbet: [[".chat-close", "kapat"], [".chat-actions .primary-button", "ana dugme"], ["footer .more-button", "alt menu"]],
  soru: [[".soru-kapat", "kapat"], [".soru-secenekler .soru-dugme", "secenek"], [".soru-yazi .soru-dugme", "serbest metin dugmesi"]],
  // Mini pet (kompakt şerit): alt menü burada bilinçli olarak gizli; ölçülen
  // kritik denetim mini petin kendisi (tıklayınca kart açılır).
  petit: [["#island-clip", "mini pet"], ["#afu-character", "karakter"]],
};

const server = await createServer({
  root, configLoader: "runner",
  optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
  server: { port: 0, strictPort: false, host: "127.0.0.1", watch: { ignored: /(?:^|[\\/])(?:target|dist|test-results)(?:[\\/]|$)/ } },
});
const report = { panel: PANEL, kartOlcek: OLC, olcumler: [], sorular: [] };
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
      const olcum = await page.evaluate((kritik) => {
        const pencere = { w: window.innerWidth, h: window.innerHeight };
        const kutu = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), sag: Math.round(r.right), alt: Math.round(r.bottom) }; };
        const island = document.getElementById("island");
        const clip = document.getElementById("island-clip");
        const kok = (e) => { const b = clip?.getBoundingClientRect(); return b ? { x: b.x, y: b.y, sag: b.right, alt: b.bottom } : null; };
        // Pencere dışına taşan görünür kutu var mı?
        const tasan = [...document.querySelectorAll("#island *")].filter((e) => {
          const r = e.getBoundingClientRect();
          if (r.width <= 0 && r.height <= 0) return false;
          const st = getComputedStyle(e);
          if (st.visibility === "hidden" || st.display === "none") return false;
          return r.right > pencere.w + 1 || r.bottom > pencere.h + 1 || r.left < -1 || r.top < -1;
        }).map((e) => e.className || e.tagName).slice(0, 12);
        // Yatay/dikey kaydırma var mı?
        const tasma = {
          yatay: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          dikey: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        };
        // İçerik kutusu kendi taşma payını aşıyor mu (kırpma)?
        const icerikTasma = [...document.querySelectorAll("#content,.overview,.chat-view,.chat-panel,.soru-govde,.soru-kap,.other-tasks,footer,.more-menu")]
          .map((e) => ({ sec: e.className, dikey: e.scrollHeight - e.clientHeight, yatay: e.scrollWidth - e.clientWidth }))
          .filter((o) => o.dikey > 1 || o.yatay > 1);
        // Kritik kontroller: görünür + tıklanabilir (elementFromPoint merkezde kendisi mi?)
        const kontroller = kritik.map(([sec, ad]) => {
          const e = document.querySelector(sec);
          if (!e) return { ad, sec, var: false };
          const st = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          const gorunur = st.display !== "none" && st.visibility !== "hidden" && r.width > 0 && r.height > 0;
          const k = kok();
          const kutuIcinde = !!k && r.left >= k.x - 1 && r.right <= k.sag + 1 && r.top >= k.y - 1 && r.bottom <= k.alt + 1;
          const pencereIcinde = r.left >= -1 && r.right <= pencere.w + 1 && r.top >= -1 && r.bottom <= pencere.h + 1;
          const cx = Math.round(r.x + r.width / 2), cy = Math.round(r.y + r.height / 2);
          const ustte = document.elementFromPoint(cx, cy);
          const tiklanir = !!ustte && (ustte === e || e.contains(ustte));
          return {
            ad, sec, var: true, gorunur, kutuIcinde, pencereIcinde, tiklanir,
            kutu: kutu(e), enKucuk: Math.min(r.width, r.height),
            ustte: ustte ? (ustte.className || ustte.tagName) : null,
          };
        });
        return {
          viewport: pencere, dpr: window.devicePixelRatio,
          island: island ? kutu(island) : null,
          clip: clip ? kutu(clip) : null,
          zoom: island ? getComputedStyle(island).zoom : null,
          fit: island ? getComputedStyle(island).getPropertyValue("--fit").trim() : null,
          tasma, tasan, icerikTasma, kontroller,
        };
      }, KRITIK[name] ?? []);
      report.olcumler.push({ case: name, hedef: target.name, ...olcum, hatalar: errors });
      const bozuk = errors.length > 0
        || olcum.tasma.yatay > 0 || olcum.tasma.dikey > 0
        || olcum.tasan.length > 0
        || olcum.kontroller.some((k) => !k.var || !k.gorunur || !k.pencereIcinde || !k.tiklanir);
      if (bozuk) report.sorular.push(`${name}/${target.name}`);
      await page.screenshot({ path: path.join(out, `${suffix}-${target.name}-${name}.png`) });
      await page.close();
    }
  }
} finally {
  await browser?.close();
  await server.close();
}
await writeFile(path.join(out, `olcum-${suffix}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.olcumler.map((o) => ({
  case: o.case, hedef: o.hedef, dpr: o.dpr, zoom: o.zoom, island: o.island,
  tasma: o.tasma, tasan: o.tasan, icerikTasma: o.icerikTasma,
  kontroller: o.kontroller.map((k) => `${k.ad}:${k.var ? (k.gorunur ? "g" : "G") + (k.pencereIcinde ? "p" : "P") + (k.tiklanir ? "t" : "T") : "y"}`),
  hatalar: o.hatalar,
})), null, 2));
console.log("SORULAR:", JSON.stringify(report.sorular));
