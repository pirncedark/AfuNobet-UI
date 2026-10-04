// P7 kanıtı: animasyonlu webp gerçekten kare kare çözülüyor (başsız ölçüm).
// Görsel dosyalarına dokunmaz, pencere açmaz; yalnızca kanıt üretir.
import { createServer } from "vite";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "../docs/kanit/p7");
await mkdir(output, { recursive: true });

const KAYNAK = ["/afu/durum/bekleme.webp", "/afu/durum/gulumseme.webp", "/afu/pet/akis_normal.webp"];
const HIZ = 0.5;
const DONGU_ARASI = 3500;

const server = await createServer({ root, configFile: path.join(root, "vite.config.ts"), logLevel: "error", server: { port: 0 } });
await server.listen();
const port = server.config.server.port ?? server.httpServer.address().port;
const browser = await chromium.launch({ headless: true });
const kanit = { kaynak: [], zaman: [] };
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  for (const kaynak of KAYNAK) {
    const sonuc = await page.evaluate(async ({ url, hiz, bekleme }) => {
      if (typeof ImageDecoder === "undefined") return { destek: false };
      const cozucu = new ImageDecoder({ data: await (await fetch(url)).arrayBuffer(), type: "image/webp" });
      await cozucu.tracks.ready;
      const iz = cozucu.tracks.selectedTrack;
      const kareMs = [];
      for (let kare = 0; kare < (iz?.frameCount ?? 0); kare++) {
        const { image } = await cozucu.decode({ frameIndex: kare, completeFramesOnly: true });
        kareMs.push(Math.round(image.duration / 1000));
        image.close();
      }
      const dongu = kareMs.reduce((toplam, ms) => toplam + ms, 0);
      cozucu.close();
      return { destek: true, animasyonlu: !!iz?.animated, kareSayisi: iz?.frameCount ?? 0, kareMs, donguMs: dongu, hizli: Math.round(dongu / hiz), birKirpmaMs: Math.round(dongu / hiz + bekleme) };
    }, { url: kaynak, hiz: HIZ, bekleme: DONGU_ARASI });
    kanit.kaynak.push({ kaynak, ...sonuc });
    assert.ok(sonuc.destek, "ImageDecoder yok: oynatıcı açılmaz, <img> oynar");
    console.log(`${sonuc.animasyonlu ? "ANIM" : "tek "} ${kaynak} kare=${sonuc.kareSayisi} dongu=${sonuc.donguMs}ms hiz${HIZ}=${sonuc.hizli}ms 1 kirpma=${sonuc.birKirpmaMs}ms`);
  }
  // Zamanlama kanıtı: bekleme.webp gerçek kare süreleriyle döngü + bekleme takvimi.
  const bekleme = kanit.kaynak.find(k => k.kaynak === "/afu/durum/bekleme.webp");
  assert.ok(bekleme.animasyonlu && bekleme.kareSayisi > 1, "bekleme.webp animasyonlu çözülmeli");
  for (const gecen of [0, 700, 1399, 1400, 3000, 4899, 4900, 6300, 9800]) {
    const dongu = bekleme.donguMs / HIZ;
    const temel = dongu + DONGU_ARASI;
    const donguNo = Math.floor(gecen / temel);
    const kalan = gecen - donguNo * temel;
    let kare = 0, bekliyor = kalan >= dongu, atlanan = 0;
    if (!bekliyor) {
      for (let i = 0; i < bekleme.kareMs.length; i++) {
        const ms = bekleme.kareMs[i] / HIZ;
        if (kalan < ms) { kare = i; break; }
        atlanan = i + 1;
      }
      if (atlanan === bekleme.kareMs.length) kare = bekleme.kareMs.length - 1;
    }
    kanit.zaman.push({ gecenMs: gecen, kare, bekliyor, donguNo });
    console.log(`  t=${gecen}ms dongu#${donguNo} kare=${kare}${bekliyor ? " (ilk karede bekleme)" : ""}`);
  }
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
await writeFile(path.join(output, "manifest.json"), JSON.stringify(kanit, null, 2), "utf8");
console.log(`PASS ImageDecoder kare kare cozdu -> ${path.relative(path.join(root, ".."), output)}/manifest.json`);