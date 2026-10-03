import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'test-results/pet-screenshots');
await mkdir(output, { recursive: true });
const server = await createServer({ root, configFile: false, server: { host: '127.0.0.1', port: 5174, strictPort: false }, clearScreen: false });
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 720, height: 320 } });
  await page.goto(`http://127.0.0.1:${address.port}/tests/preview.html?case=idle`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const proofs = [];
  for (const pose of ['bekleme', 'uyari', 'hata', 'basari', 'uyku', 'yuzme']) {
    await page.evaluate(pose => {
      const { island } = window.afuTest;
      island.fsm.toPet();
      island.pet.model.setPose(pose);
      island.pet.paint();
    }, pose);
    await page.waitForFunction(() => [...document.querySelectorAll('#afu-pet img')].every(image => image.complete && image.naturalWidth > 0));
    await page.waitForTimeout(150);
    const proof = await page.evaluate(() => {
      const pet = document.querySelector('#afu-pet');
      const image = pet.querySelector('img:not(.pet-previous)');
      const rect = pet.getBoundingClientRect();
      return { visible: !pet.hidden && getComputedStyle(pet).display !== 'none', frame: image.getAttribute('src'), width: rect.width, height: rect.height };
    });
    assert(proof.visible && proof.width > 0 && proof.height > 0, `${pose}: pet gizli`);
    const file = `${pose}.png`;
    await page.screenshot({ path: path.join(output, file), omitBackground: true, animations: 'disabled' });
    proofs.push({ pose, ...proof, file });
  }
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ headless: true, nativeWindowsSmokeVerified: false, proofs }, null, 2));
  console.log(`PASS ${proofs.length} headless pet görünümü; gerçek Windows konumu sınanmadı`);
} finally {
  await browser?.close();
  await server.close();
}
