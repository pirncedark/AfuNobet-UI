// Offline headless evidence; development fixture never connects to real agents.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(root, '../docs/kanit/tum_test');
await mkdir(out, { recursive: true });
const server = await createServer({ root, configLoader: 'runner',
  optimizeDeps: { noDiscovery: true, include: [], exclude: ['@tauri-apps/api'] },
  server: { port: 0, host: '127.0.0.1', watch: { ignored: /(?:target|dist|test-results|kanit)/ } } });
const results = [];
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const cases = ['idle','working','waiting','paused','success','error','disconnected','quota','petit',
    'hidden','stale','quota-panel','busy','hata-karti','selam','soru','sohbet','uzun','uzun-soru','uzun-sohbet'];
  for (const scale of [1, 1.5]) for (const name of cases) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(`${origin}/tests/preview.html?case=${name}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
      await page.waitForTimeout(350);
      const measured = await page.evaluate(() => {
        const rect = document.querySelector('#island-clip')?.getBoundingClientRect();
        const text = document.body.innerText;
        const controls = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0);
        return { text, controls: controls.length,
          fits: !rect || (rect.x >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1) };
      });
      const file = `${name}-${scale === 1 ? '100' : '150'}.png`;
      await page.screenshot({ path: path.join(out, file), omitBackground: true });
      const failures = [...errors];
      if (!measured.fits) failures.push('Ada pencere sınırını aşıyor');
      if (['working','soru','sohbet'].includes(name) && measured.controls === 0) failures.push('Görünür düğme yok');
      results.push({ name, scale, file, ...measured, errors: failures, passed: failures.length === 0 });
      console.log(`${failures.length ? 'KALDI' : 'GEÇTİ'} ${name} @${scale}: ${failures.join('; ')}`);
    } catch (e) {
      results.push({ name, scale, passed: false, errors: [String(e)] });
      console.log(`KALDI ${name} @${scale}: ${e}`);
    } finally { await page.close(); }
  }
  // A dedicated optional-field fixture proves data reaches the rendered card,
  // rather than merely proving the pure formatting functions.
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.goto(`${origin}/tests/preview.html?case=working`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    await page.evaluate(() => {
      window.afuTest.island.applySnapshot({ version: 1, mesaj: '', tasks: [{
        id: 'focus', agent: 'codex', status: 'Calisiyor', task: 'Kabul testlerini denetle',
        updated_at: new Date().toISOString(), stage: 'VERIFY', model: 'gpt-6.1-sol', effort: 'high',
        context: { used: 60000, total: 200000, cached: 40000, saved: 1200 }, cost: 1.23,
      }] });
    });
    await page.waitForTimeout(350);
    // Context and cost deliberately live in task details, keeping the main
    // surface simple. Open the real card rather than asserting hidden text.
    await page.locator('.main-task').click();
    await page.waitForTimeout(200);
    const text = await page.locator('body').innerText();
    const errors = ['Doğrulama', 'gpt-6.1-sol', '%30', '$1.23'].filter(s => !text.includes(s)).map(s => `Eksik gösterim: ${s}`);
    await page.screenshot({ path: path.join(out, 'bilgi.png'), omitBackground: true });
    results.push({ name: 'bilgi', scale: 1, file: 'bilgi.png', text, errors, passed: errors.length === 0 });
    console.log(`${errors.length ? 'KALDI' : 'GEÇTİ'} bilgi: ${errors.join('; ')}`);
  } finally { await page.close(); }
} catch (e) {
  results.push({ name: 'headless-start', passed: false, errors: [String(e)] });
} finally {
  await browser?.close();
  await server.close();
  await writeFile(path.join(out, 'headless.json'), JSON.stringify({ nativeWindowsVerified: false, results }, null, 2));
}
process.exitCode = results.some(r => !r.passed) ? 1 : 0;
