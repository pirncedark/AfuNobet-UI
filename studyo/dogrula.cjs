// Yerel Playwright ile file:// doğrulaması; indirme veya görünür pencere açmaz.
const { chromium } = require('../windows/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('url');
const { createHash } = require('crypto');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'docs/kanit/anim_studyo');
function log(kind, message) { fs.appendFileSync(path.join(evidence, 'log.txt'), `${new Date().toISOString()} ${kind} ${message}\n`); }
function hashes(dir) {
 const result = {};
 for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
  const file = path.join(dir, entry.name);
  if (entry.isDirectory()) Object.assign(result, hashes(file));
  else result[path.relative(root,file)] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 }
 return result;
}
async function main() {
 const before = {...hashes(path.join(root,'windows/src')), ...hashes(path.join(root,'windows/public/afu/pet')), ...hashes(path.join(root,'windows/public/afu/durum'))};
 const browser = await chromium.launch({headless:true});
 const context = await browser.newContext({viewport:{width:1440,height:1000}, acceptDownloads:true});
 const page = await context.newPage();
 const errors = [], failed = [], requests = [];
 page.on('pageerror', e => errors.push(e.message));
 page.on('requestfailed', r => failed.push(r.url()));
 page.on('request', r => requests.push(r.url()));
 const url = pathToFileURL(path.join(__dirname,'animasyon_studyo.html')).href;
 try {
  await page.goto(url);
  await page.click('#play');
  const payload = await page.evaluate(() => studyo.exportData());
  assert.deepEqual(payload, JSON.parse(fs.readFileSync(path.join(evidence,'varsayilan.json'),'utf8')));
  const assets = await page.evaluate(() => studyo.assets);
  assert.equal(assets.filter(a=>a.group==='pet').length,44);
  assert.equal(assets.filter(a=>a.group==='durum').length,27);
  assert.ok(assets.every(a=>!a.file.includes('.yedek')));
  const imageFailures = await page.evaluate(async () => (await Promise.all(studyo.assets.map(a=>new Promise(resolve=>{
   const img=new Image();img.onload=()=>resolve(img.naturalWidth>0?null:a.path);img.onerror=()=>resolve(a.path);img.src=a.path;
  })))).filter(Boolean));
  assert.deepEqual(imageFailures,[]);
  const geometry = await page.evaluate(() => {
   const pet=document.getElementById('pet').getBoundingClientRect(),img=document.getElementById('petImage').getBoundingClientRect();
   const bar=document.querySelector('.taskbar').getBoundingClientRect(),start=document.querySelector('.start').getBoundingClientRect();
   return {width:pet.width,height:pet.height,imageWidth:img.width,imageHeight:img.height,bottom:pet.bottom,barTop:bar.top,right:pet.right,startLeft:start.left};
  });
  assert.equal(geometry.width,256);assert.equal(geometry.height,256);
  assert.equal(geometry.imageWidth,256);assert.equal(geometry.imageHeight,256);
  assert.equal(geometry.bottom,geometry.barTop);assert.equal(geometry.right,geometry.startLeft);
  await page.locator('#frames input').first().fill('123');
  await page.locator('#frames input').first().dispatchEvent('change');
  assert.equal((await page.evaluate(()=>studyo.exportData())).sekanslar.bekleme[0].ms,123);
  await page.getByRole('button',{name:'Kareyi kopyala',exact:true}).first().click();
  assert.equal((await page.evaluate(()=>studyo.exportData())).sekanslar.bekleme.length,10);
  await page.getByRole('button',{name:'Kareyi sil',exact:true}).first().click();
  await page.evaluate(()=>{
   const rows=document.querySelectorAll('.frame'),dataTransfer=new DataTransfer();
   rows[0].dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));
   rows[2].dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer}));
  });
  assert.equal((await page.evaluate(()=>studyo.exportData())).sekanslar.bekleme[2].ms,123);
  await page.click('#new');await page.fill('#seqName','deneme');await page.click('#rename');
  await page.click('#durumTab');assert.equal(await page.locator('.tile').count(),27);
  await page.getByRole('button',{name:'durum/basari karesini ekle',exact:true}).click();
  let current = await page.evaluate(()=>studyo.exportData());
  assert.equal(current.sekanslar.deneme[1].kare,'durum/basari');
  await page.getByRole('button',{name:'Kareyi sil',exact:true}).first().click();
  await page.waitForFunction(()=>document.getElementById('petImage').complete);
  await page.locator('#scale').evaluate(e=>{e.value='150';e.dispatchEvent(new Event('input'));});
  await page.click('#align');
  const aligned = await page.evaluate(()=>{
   const a=studyo.exportData().ayar.deneme,asset=studyo.assets.find(a=>a.kare==='durum/basari');
   const ratio=Math.min(256/asset.width,256/asset.height);
   return {actual:a.y,expected:Math.round((asset.height-asset.alphaBottom-1)*ratio*a.olcek/100)};
  });
  assert.equal(aligned.actual,aligned.expected);
  const pet = await page.locator('#pet').boundingBox();
  await page.mouse.move(pet.x+pet.width/2,pet.y+pet.height/2);await page.mouse.down();
  await page.mouse.move(pet.x+pet.width/2+25,pet.y+pet.height/2-20);await page.mouse.up();
  current = await page.evaluate(()=>studyo.exportData());assert.equal(current.ayar.deneme.x,25);
  assert.equal(current.ayar.deneme.y,aligned.actual-20);
  await page.reload();assert.deepEqual(await page.evaluate(()=>studyo.exportData()),current);
  await page.locator('#sequences button').filter({hasText:/^deneme$/}).click();
  await page.click('#forward');assert.match(await page.locator('#play').innerText(),/Oynat/);
  await page.click('#back');
  await page.locator('.tile').first().hover();assert.equal(await page.locator('#preview').isVisible(),true);
  await page.mouse.move(10,10);
  await page.evaluate(()=>{window.copiedText=null;Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>window.copiedText=t},configurable:true});});
  const downloadPromise=page.waitForEvent('download');await page.click('#export');const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'afu_animasyon.json');
  await download.saveAs(path.join(evidence,'disari_aktar.json'));
  const exported=JSON.parse(fs.readFileSync(path.join(evidence,'disari_aktar.json'),'utf8'));
  assert.deepEqual(exported,current);assert.deepEqual(JSON.parse(await page.evaluate(()=>window.copiedText)),current);
  await page.locator('#file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"surum":1}')});
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Dosya geçersiz'));
  assert.deepEqual(await page.evaluate(()=>studyo.exportData()),current);
  await page.locator('#file').setInputFiles(path.join(evidence,'varsayilan.json'));
  await page.waitForFunction(()=>document.getElementById('status').textContent==='Kayıt içe aktarıldı.');
  assert.deepEqual(await page.evaluate(()=>studyo.exportData()),payload);
  await page.locator('#scale').evaluate(e=>{e.value='125';e.dispatchEvent(new Event('input'));});
  page.once('dialog',d=>d.accept());await page.click('#reset');
  assert.deepEqual(await page.evaluate(()=>studyo.exportData()),payload);
  await page.click('#play');await page.screenshot({path:path.join(evidence,'studyo_masaustu.png'),fullPage:true});
  await page.click('#durumTab');await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(evidence,'studyo_dar_ekran.png'),fullPage:true});
  const blocked = await context.newPage();
  await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}}));
  await blocked.goto(url);await blocked.click('#new');assert.match(await blocked.locator('#status').innerText(),/Dışa aktar/);
  await blocked.close();
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.ok(requests.every(r=>r.startsWith('file:')||r.startsWith('blob:')));
  assert.deepEqual({...hashes(path.join(root,'windows/src')), ...hashes(path.join(root,'windows/public/afu/pet')), ...hashes(path.join(root,'windows/public/afu/durum'))},before);
  const report={browser:'Chromium headless',url,pet:44,durum:27,sekans:12,pageErrors:errors,failedRequests:failed,geometry,checks:['71 görsel yükleme','varsayılan kaynak eşleşmesi','256×256 ve Başlat yanı konum','süre/kopyalama/silme/sıralama','yeni sekans/adlandırma','durum karesi ekleme','ölçek/alfa hizalama/fare sürükleme','localStorage yeniden açma ve erişim engeli','ileri/geri','önizleme','JSON indirme ve pano','geçersiz/geçerli içe aktar','varsayılana dönüş','dar ekran','kaynak ve görsel SHA256 koruma']};
  fs.writeFileSync(path.join(evidence,'dogrulama.json'),JSON.stringify(report,null,2));
  log('ADIM','Başsız Chromium: 71 görsel ve düzenleme/kayıt/JSON akışları doğrulandı; iki ekran görüntüsü kaydedildi.');
  console.log(JSON.stringify(report,null,2));
 } finally {await browser.close();}
}
main().catch(e=>{log('HATA',e.message);console.error(e);process.exitCode=1;});
