// Capture the real application components with offline provider state.
// No generated markup, replacement CSS, native windows or live agent calls.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(process.argv[2] || path.join(root, 'test-results/tanitim'));
await mkdir(out, { recursive: true });
const log = [];
const results = [];
const say = line => { log.push(line); console.log(line); };
const server = await createServer({ root, configLoader: 'runner',
  optimizeDeps: { noDiscovery: true, include: [], exclude: ['@tauri-apps/api'] },
  server: { port: 0, strictPort: false, host: '127.0.0.1', watch: { ignored: /(?:target|dist|test-results)/ } } });
let browser;
const cases = ['balon-okudum', 'kart-mesaj', 'kart-bilgi', 'quota-360', 'quota-panel-360', 'working-640-150'];
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const name of cases) {
    // fitScale * KART_OLCEK = 1: 640px standard card, 100% text.
    const viewport = name.startsWith('quota-') ? { width: 360, height: 320 }
      : name === 'working-640-150' ? { width: 640, height: 480 }
      : name === 'balon-okudum' ? { width: 256, height: 414 } : { width: 720, height: 320 };
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.addInitScript(showHint => {
        if (!showHint) localStorage.setItem('afu-konusan-ipucu-v1', 'seen');
      }, name === 'ipucu');
      const previewCase = name === 'quota-360' ? 'quota' : name === 'quota-panel-360' ? 'quota-panel' : name === 'working-640-150' ? 'working' : 'idle';
      await page.goto(`${origin}/tests/preview.html?case=${previewCase}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
      await page.evaluate(async name => {
        const { island, State } = window.afuTest;
        const { Bridge } = await import('/src/core/bridge.ts');
        // Keep provider responses offline; start voice through the real button.
        Bridge.codexStatus = async () => ({ status: 'hazir' });
        Bridge.voiceSupported = async () => ({ whisper: true, winrt_stt: false, tts: true, afu_tts: true });
        Bridge.voiceListenTurn = () => new Promise(() => {});
        Bridge.voiceCancel = Bridge.voiceSilence = async () => {};
        Bridge.orkestraProjects = async () => ['AfuNobet-UI'];
        if (name.startsWith('quota-') || name === 'working-640-150') {
          island.fsm.pinned = true;
          if (name === 'working-640-150') document.body.style.zoom = '1.5';
          return;
        }
        const now = new Date().toISOString();
        const task = (id, agent, status, title, extra = {}) => ({ id, agent, status, task: title, repo: 'AfuNobet-UI', updated_at: now, ...extra });
        island.applySnapshot({ version: 1, mesaj: '', tasks: [
          task('focus', 'codex', 'Calisiyor', name === 'menu' ? 'Görevlerini tek yerden izle' : 'Tanıtım sayfasını hazırla', { stage: 'VERIFY', model: 'gpt-6.1-sol', effort: 'high', progress: 72 }),
          task('review', 'gemini', 'Calisiyor', 'Kartların okunurluğunu denetle'),
          task('tests', 'opencode', 'Hazirlaniyor', 'Ekran görüntülerini doğrula'),
        ], quotas: Object.fromEntries([['codex', 42], ['gemini', 78], ['opencode', 65]].map(([agent, n]) => [agent, { remaining_percent: n, checked_at: now, reset_at: new Date(Date.now() + 3600000).toISOString() }])) });
        State.setFocus('focus');
        island.fsm.pinned = true;
        if (name === 'soru-onay') {
          const { kartOlustur, sorulariAyikla } = await import('/src/question/question.ts');
          const [q] = sorulariAyikla([{ id: 'demo-question', ajan: 'claude', tur: 'izin', baslik: 'Tanıtım sayfası hazır', metin: 'Görselleri sayfaya ekleyip önizlemeyi hazırlayayım mı?', secenekler: [{ id: 'yes', etiket: 'Evet, devam et' }, { id: 'no', etiket: 'Önce göster' }], serbestMetin: true, olusturma: Date.now(), sonGecerlilik: Date.now() + 3600000 }], Date.now());
          const host = document.querySelector('.soru-kap');
          host.hidden = false;
          host.append(kartOlustur(document, q, async () => {}, 1, undefined, () => {}));
        }
        if (['balon-okudum', 'kart-mesaj'].includes(name)) {
          if (name === 'balon-okudum') island.fsm.toPet();
          const { showNotification } = await import('/src/message/notifications.ts');
          const text = name === 'balon-okudum'
            ? 'Claude: Tanıtım hazır\n- Gerçek ekranlar alındı\n- Görseller kontrol edildi'
            : 'Claude: Görseller hazır\n- Kart ve pet ekranları kontrol edildi\n- Menü etiketleri okunuyor\nAyrıntı:\nTanıtım sayfasındaki görüntüler gerçek arayüzden alınır. Kart, soru ve sohbet ekranları ayrı ayrı incelenir. Her dosyanın boyutu ve özeti kayıt altına alınır.';
          const raw = { surum: 1, id: name, ajan: 'claude', tur: 'bilgi', metin: text, zaman: Date.now() };
          showNotification({ id: name, type: 'notification', timestamp: Date.now(), text, ajan: 'claude', raw });
        }
        if (['sesli-sohbet', 'sesli-dinliyor'].includes(name)) { island.setView('chat'); await island.chat.refresh(); }
        if (name === 'devir') island.applySnapshot({ version: 1, tasks: [task('focus', 'gemini', 'Calisiyor', 'Tanıtım sayfasını tamamla', { handoff: { from: 'codex', to: 'gemini', reason: 'quota' } })] });
        if (name === 'kota') island.setView('quota');
        if (name === 'orkestra') island.setView('orkestra');
      }, name);
      await page.waitForTimeout(800);
      if (name === 'kart-mesaj') await page.locator('.afu-konusma-balonu').click();
      if (name === 'ayarlar') { await page.locator('.more-button').click(); await page.locator('.menu-advanced summary').click(); }
      if (name === 'ara') await page.locator('.search-button').click();
      if (name === 'sesli-sohbet') await page.getByRole('button', { name: 'Sesli sohbeti başlat' }).scrollIntoViewIfNeeded();
      if (name === 'sesli-dinliyor') { await page.getByRole('button', { name: 'Sesli sohbeti başlat' }).click(); await page.getByText('Dinliyor…', { exact: true }).waitFor(); await page.getByText('Dinliyor…', { exact: true }).scrollIntoViewIfNeeded(); }
      if (name === 'orkestra') { await page.locator('.orkestra-input').waitFor(); await page.locator('.orkestra-input').fill('Tanıtım ekranlarını kontrol et'); await page.locator('.orkestra-input').scrollIntoViewIfNeeded(); }
      await page.waitForTimeout(name === 'balon-okudum' ? 2400 : 150);
      const checks = {
        'balon-okudum': ['.afu-balon-etiket', '.afu-balon-metin li', 'text=Okudum'],
        'kart-mesaj': ['.afu-mesaj-detayi', 'text=Ayrıntı', 'text=Okudum'],
        'soru-onay': ['.soru-secenekler', '.soru-alan'],
        menu: ['footer'], ayarlar: ['.ifade-toggle', '.alert-toggle', '.pet-toggle', '.studio-open'],
        ara: ['.search-input', '.search-select', '.search-row'],
        'kart-bilgi': ['.agent-pills', '.main-task'],
        'quota-360': ['.main-task', '.task-message'],
        'quota-panel-360': ['.quota-view', '.quota-row small'],
        'working-640-150': ['.agent-pills', '.main-task'],
        'sesli-sohbet': ['text=Sesli sohbeti başlat'], 'sesli-dinliyor': ['text=Dinliyor…'],
        ipucu: ['.afu-mesaj-ipucu'], devir: ['.task-handoff'], kota: ['.quota-view'], orkestra: ['.orkestra-select', '.orkestra-input'],
      };
      for (const selector of checks[name]) {
        const el = page.locator(selector).first();
        if (!await el.isVisible()) { errors.push(`Görünür öğe eksik: ${selector}`); continue; }
        const inside = await el.evaluate(el => {
          const r = el.getBoundingClientRect();
          let bounds = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
          for (let p = el.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p), b = p.getBoundingClientRect();
            if (['hidden', 'auto', 'scroll', 'clip'].includes(s.overflowX)) { bounds.left = Math.max(bounds.left, b.left); bounds.right = Math.min(bounds.right, b.right); }
            if (['hidden', 'auto', 'scroll', 'clip'].includes(s.overflowY)) { bounds.top = Math.max(bounds.top, b.top); bounds.bottom = Math.min(bounds.bottom, b.bottom); }
          }
          return r.left >= bounds.left - 1 && r.right <= bounds.right + 1 && r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1;
        });
        if (!inside) errors.push(`Öğe kırpılıyor: ${selector}`);
      }
      if (name === 'balon-okudum') {
        const balloon = await page.locator('#afu-pet-balon .afu-konusma-balonu').boundingBox();
        if (!balloon || balloon.width < 200) errors.push('Gerçek pet balonu standart genişlikte çizilmiyor');
      }
      if (name === 'balon-okudum' && await page.locator('.afu-balon-metin li').count() !== 2) errors.push('İki madde görünmüyor');
      if (name === 'kart-mesaj') {
        const m = await page.locator('#afu-character > .afu-konusma-balonu').evaluate(el => {
          const text = el.querySelector('.afu-balon-metin'), ok = el.querySelector('.afu-balon-kapat');
          const p = el.parentElement.getBoundingClientRect();
          return { clamp: getComputedStyle(text).webkitLineClamp, overflow: el.scrollHeight > el.clientHeight,
            overlaps: ok.getBoundingClientRect().bottom > text.getBoundingClientRect().top,
            covers: el.getBoundingClientRect().bottom > p.top + p.height / 2 };
        });
        if (m.clamp !== '3' || m.overflow || m.overlaps || m.covers) errors.push(`Kart balonu: ${JSON.stringify(m)}`);
      }
      if (['quota-360', 'working-640-150'].includes(name)) {
        const m = await page.locator('.main-task').evaluate(el => ({ h: el.clientHeight, scroll: el.scrollHeight }));
        if (m.scroll > m.h) errors.push(`Görev dikey kırpılıyor: ${JSON.stringify(m)}`);
      }
      if (name === 'quota-panel-360') {
        const cut = await page.locator('.quota-row small').evaluateAll(els => els.some(el => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight));
        if (cut) errors.push('Kota yenilenme metni kırpılıyor');
      }
      if (name === 'menu') for (const label of ['Kota', 'Uygulamalar', 'Orkestra', 'Sohbet', 'Daha fazla', 'Küçült', "Afu'ya sor"]) {
        if (!await page.locator('footer button').filter({ hasText: label }).first().isVisible()) errors.push(`Menü etiketi eksik: ${label}`);
      }
      if (name === 'kart-bilgi') for (const text of ['Doğrulama', 'gpt-6.1-sol']) if (!(await page.locator('.main-task').innerText()).includes(text)) errors.push(`Bilgi eksik: ${text}`);
      if (name === 'devir' && !(await page.locator('.task-handoff').innerText()).includes('Codex kotası doldu → Gemini devraldı')) errors.push('Devir metni eksik');
      const clip = await page.evaluate(pet => {
        const els = pet ? [document.querySelector('#afu-pet'), document.querySelector('#afu-pet-balon')] : [document.querySelector('#island')];
        const rs = els.map(el => el.getBoundingClientRect());
        const x = Math.max(0, Math.floor(Math.min(...rs.map(r => r.x))));
        const y = Math.max(0, Math.floor(Math.min(...rs.map(r => r.y))));
        return { x, y, width: Math.ceil(Math.max(...rs.map(r => r.right))) - x, height: Math.ceil(Math.max(...rs.map(r => r.bottom))) - y };
      }, name === 'balon-okudum');
      const file = `${name}.png`;
      await page.screenshot({ path: path.join(out, file), clip, omitBackground: true });
      const bytes = await readFile(path.join(out, file));
      const row = { file, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length, md5: createHash('md5').update(bytes).digest('hex'), errors };
      results.push(row);
      say(`${errors.length ? 'KALDI' : 'GEÇTİ'} ${file}: ${row.width}x${row.height}, ${row.bytes} bayt, md5=${row.md5}${errors.length ? ' — ' + errors.join('; ') : ''}`);
    } catch (error) { results.push({ file: `${name}.png`, errors: [String(error)] }); say(`KALDI ${name}: ${error}`); }
    finally { await page.close(); }
  }
} finally {
  await browser?.close();
  await server.close();
}
const files = results.filter(r => r.md5);
const unique = new Set(files.map(r => r.md5)).size === files.length;
say(`MD5 kontrolü: ${files.length} dosya, ${unique ? 'tümü farklı' : 'TEKRAR VAR'}`);
const failed = results.filter(r => r.errors.length);
const complete = failed.length === 0 && unique && files.length === cases.length;
const report = `${complete ? `SONUC: TAMAM - ${cases.length} görüntü` : 'SONUC: YARIM - ' + failed.map(r => r.file + ': ' + r.errors.join('; ')).join(' | ')}\n\nGerçek ürün DOM ve CSS; başsız Chromium; deviceScaleFactor=1; standart kart 640px; ürün kodu değişmedi.\n\nÇıktı: ${out}\n\n${files.length} PNG üretildi; ${results.filter(r => !r.errors.length).length} senaryo kabul kontrolünden geçti. Başarısız kareler tanıtım için kabul edilmemelidir; gerçek mevcut davranışın kanıtıdır.\n\nPet balonu ve kart ayrıntısı Okudum düğmesi gösterir.\n\n| Dosya | Ölçü | Bayt | MD5 |\n|---|---|---:|---|\n${files.map(r => `| ${r.file} | ${r.width}×${r.height} | ${r.bytes} | ${r.md5} |`).join('\n')}\n\nGerçek konsol çıktısı:\n\n\`\`\`text\n${log.join('\n')}\n\`\`\`\n`;
await writeFile(path.join(out, 'SONUC_TANITIM_GORUNTU.md'), report);
await writeFile(path.join(out, 'verification.json'), JSON.stringify({ complete, unique, results }, null, 2));
process.exitCode = complete ? 0 : 1;
