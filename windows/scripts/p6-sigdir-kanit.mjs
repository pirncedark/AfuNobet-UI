// P6 kanıtı: karakter 256x256 çerçeveden taşmıyor (başsız ölçüm + ekran görüntüsü).
// Görsel dosyalarına dokunmaz; yalnızca test çıktısı üretir.
import { createServer } from "vite";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import path from "node:path";
import { decodePng } from "./png.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "../docs/kanit/p6");
await mkdir(output, { recursive: true });

const KARE = {
  ucus: ["gecis", 0],
  masa_cikis: ["gecis", 1],
  kalkis: ["gecis", 2],
  bekleme: ["bekleme", 0],
};
const PAY = 6;
const ESIK = 24; // alfa > 24 sayılır (yumuşak kenarlar sayılmaz)

function alfaKutu(png) {
  let left = png.width, top = png.height, right = -1, bottom = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const index = (y * png.width + x) * png.channels;
      const alfa = png.channels === 4 ? png.data[index + 3] : 255;
      if (alfa <= ESIK) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return right < 0 ? null : { left, top, right, bottom };
}

const server = await createServer({ root, configFile: false, server: { host: "127.0.0.1", port: 5176, strictPort: false }, clearScreen: false });
let browser;
const proofs = [];
try {
  await server.listen();
  const { port } = server.httpServer.address();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 300, height: 300 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/tests/preview.html?case=idle`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");

  for (const [ad, [pose, kareIndex]] of Object.entries(KARE)) {
    await page.evaluate(([pose, kareIndex]) => {
      const { island } = window.afuTest;
      island.fsm.toPet();
      island.pet.setActive(true);
      island.pet.model.setPose(pose);
      // kareyi zaman içinde sabitle: model.frame bu kareyi versin, ölçek de buna göre hesaplanır
      island.pet.model.poseAt -= kareIndex * 500 + 10;
      island.pet.paint();
      island.pet.setVisible(false); // zamanlayıcı dursun, çizilen kare sabit kalsın
    }, [pose, kareIndex]);
    await page.waitForFunction(() => [...document.querySelectorAll("#afu-pet img")].every(image => image.complete && image.naturalWidth > 0));
    await page.waitForTimeout(120);

    const cerceve = await page.evaluate(() => {
      const pet = document.querySelector("#afu-pet");
      const r = pet.getBoundingClientRect();
      const image = pet.querySelector("img:not(.pet-previous)");
      return { x: r.x, y: r.y, width: r.width, height: r.height, src: image.getAttribute("src"), scale: image.style.scale, translate: image.style.translate, origin: image.style.transformOrigin };
    });
    assert(cerceve.width === 256 && cerceve.height === 256, `${ad}: pet penceresi 256x256 değil`);

    const dosya = path.join(output, `${ad}.png`);
    const buf = await page.screenshot({ path: dosya, omitBackground: true, animations: "disabled", clip: { x: cerceve.x, y: cerceve.y, width: cerceve.width, height: cerceve.height } });
    const kutu = alfaKutu(decodePng(buf));
    assert(kutu, `${ad}: görünür piksel yok`);

    const pay = {
      sol: kutu.left - PAY, sag: 256 - PAY - kutu.right,
      ust: kutu.top - PAY, alt: 256 - PAY - kutu.bottom,
    };
    assert(Object.values(pay).every(deger => deger >= -0.5), `${ad}: çerçeveden taştı ${JSON.stringify({ kutu, pay })}`);
    proofs.push({ ad, pose, kare: cerceve.src, olcek: cerceve.scale, kaydirma: cerceve.translate, kutu, pay, dosya: `docs/kanit/p6/${ad}.png` });
    console.log(`OK ${ad.padEnd(11)} kutu=${JSON.stringify(kutu)} pay=${JSON.stringify(pay)} scale=${cerceve.scale} translate=${cerceve.translate}`);
  }
  await writeFile(path.join(output, "manifest.json"), JSON.stringify({ basissiz: true, petPencere: 256, kenarPayi: PAY, alfaEsigi: ESIK, proofs }, null, 2));
  console.log(`PASS ${proofs.length} kare 256 pencerede taşmadan -> docs/kanit/p6/`);
} finally {
  await browser?.close();
  await server.close();
}