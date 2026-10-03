import { createServer } from '../../../windows/node_modules/vite/dist/node/index.js';
import { chromium } from '../../../windows/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../../windows/', import.meta.url));
const out = fileURLToPath(new URL('./', import.meta.url));
process.chdir(root);
const server = await createServer({root, configFile:false, optimizeDeps:{noDiscovery:true,include:[]}, server:{host:'127.0.0.1',port:5183,strictPort:false,watch:{ignored:['**/target/**','**/dist/**']}},clearScreen:false});
server.middlewares.use((req,res,next) => {
  if (req.url === '/pet-geri-fixture') { res.setHeader('Content-Type','text/html'); res.end('<!doctype html><html><head></head><body></body></html>'); }
  else next();
});
let browser;
try {
  await server.listen(); browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:128,height:128}});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/pet-geri-fixture`);
  await page.evaluate(async () => {
    const { AfuPet } = await import('/src/afu/pet.ts');
    const { Bridge } = await import('/src/core/bridge.ts');
    const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = '/src/style.css'; document.head.append(style);
    document.body.replaceChildren();
    let opened = 0, release;
    Bridge.petDrag = () => new Promise(resolve => { release = resolve; });
    const pet = new AfuPet(() => { opened++; });
    document.body.append(pet.el); pet.setActive(true);
    window.proofPet = {pet, get opened() { return opened; }, release: value => release(value)};
  });
  // A real browser click waits for the native threshold verdict, then opens once.
  await page.mouse.move(64,64); await page.mouse.down(); await page.mouse.up();
  assert.equal(await page.evaluate(() => window.proofPet.opened), 0);
  await page.evaluate(() => window.proofPet.release(false));
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.proofPet.opened), 1);
  // A real drag/release click must never open the task card.
  await page.mouse.down(); await page.mouse.move(80,70); await page.mouse.up();
  await page.evaluate(() => window.proofPet.release(true));
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.proofPet.opened), 1);
  // Keyboard activation preserves the old single-click action.
  await page.locator('#afu-pet').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.proofPet.opened), 2);
  await page.mouse.move(0,0);
  const images = [];
  for (const pose of ['bekleme','gecis','donus','uyku','uyanma','surukleme','geri_donus','yaslanma']) {
    const result = await page.evaluate(pose => {
      const p = window.proofPet.pet; p.model.setPose(pose); p.paint();
      const r = p.el.getBoundingClientRect();
      return {pose, src: p.image.getAttribute('src'), box:[r.width,r.height], inlineLayout:p.image.style.cssText};
    }, pose);
    assert.ok(result.src.startsWith('/afu/pet/')); assert.deepEqual(result.box,[128,128]); assert.equal(result.inlineLayout,'');
    await page.locator('.pet-image:not(.pet-previous)').evaluate(img => img.decode());
    await page.waitForTimeout(140);
    await page.screenshot({path:`${out}component-${pose}.png`,omitBackground:true}); images.push(result);
  }
  await writeFile(`${out}component-check.json`,JSON.stringify({click:true,dragSuppressesClick:true,keyboard:true,images},null,2));
  console.log('PASS: real pointer click, drag click suppression, keyboard, 8 original pet poses');
} finally { await browser?.close(); await server.close(); }
