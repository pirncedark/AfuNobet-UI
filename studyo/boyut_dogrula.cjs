// Başsız Chromium: görünür pencere, ses veya uygulama değişikliği yok.
const {chromium} = require('../windows/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('url');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'docs/kanit/boyut_esitle');
const log = (kind, message) => fs.appendFileSync(path.join(evidence,'log.txt'), `${new Date().toISOString()} ${kind} ${message}\n`);
(async()=>{
 const browser = await chromium.launch({headless:true,args:['--allow-file-access-from-files']});
 try {
  const context = await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'animasyon_studyo.html')).href);
  await page.click('#play');
  const original = await page.evaluate(()=>JSON.parse(JSON.stringify(studyo.exportData())));
  await page.click('#normalize');
  const selected = await page.evaluate(()=>JSON.parse(JSON.stringify(studyo.exportData())));
  assert.equal(selected.normalize,true);
  assert.deepEqual(selected.normalizeSekanslar,['bekleme']);
  await page.click('#undo');
  assert.deepEqual(await page.evaluate(()=>studyo.exportData()),original);
  await page.check('#normalizeAll');
  await page.click('#normalize');
  const all = await page.evaluate(()=>JSON.parse(JSON.stringify(studyo.exportData())));
  assert.deepEqual(all.normalizeSekanslar.sort(),Object.keys(all.sekanslar).sort());
  assert.deepEqual(await page.evaluate(()=>studyo.normalization('missing')), {olcek:1,x:0,y:0});
  // Import a mixed old/new sequence through the real file input.
  const payload = JSON.parse(JSON.stringify(all));
  payload.sekanslar.bekleme=[{kare:'idle_normal',ms:null},{kare:'durum/bosta_nefes',ms:null}];
  await page.locator('#file').setInputFiles({name:'mixed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await page.waitForFunction(()=>studyo.exportData().sekanslar.bekleme.length===2);
  await page.getByRole('button',{name:'bekleme',exact:true}).click();
  const measurements=JSON.parse(fs.readFileSync(path.join(evidence,'browser_measurements.json'),'utf8'));
  const geometry = await page.evaluate(measurements=>{
   const ref=measurements.idle_normal.boy*256;
   let maxHeight=0,maxFeet=0,maxCenter=0;
   for(const asset of studyo.assets){
    const item=measurements[asset.kare],n=studyo.normalization(asset.kare);
    const height=item.boy*n.olcek*256;
    const feet=(1+(item.ayak-1)*n.olcek+n.y)*256;
    const center=(.5+(item.merkez-.5)*n.olcek+n.x)*256;
    maxHeight=Math.max(maxHeight,Math.abs(height-ref)/ref*100);
    maxFeet=Math.max(maxFeet,Math.abs(feet-256));
    maxCenter=Math.max(maxCenter,Math.abs(center-measurements.idle_normal.merkez*256));
   }
   return {count:studyo.assets.length,maxHeightPercent:maxHeight,maxFeetPx:maxFeet,maxCenterPx:maxCenter};
  },measurements);
  assert.ok(geometry.maxHeightPercent<=3);
  assert.ok(geometry.maxFeetPx<=2);
  // Verify actual image/canvas CSS, including sequential user transforms.
  async function checkStage(kare){
   await page.waitForFunction(k=>document.querySelector('#petImage').complete && document.querySelector('#petImage').getAttribute('src').includes(k.split('/').pop()+'.webp'),kare);
   const actual=await page.evaluate(()=>{
    const img=document.querySelector('#petImage'),pet=document.querySelector('#pet');
    const bounds=img.getBoundingClientRect(),parent=pet.getBoundingClientRect();
    const canvas=document.querySelector('#frozen');
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let top=canvas.height,bottom=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
    const ratio=bounds.width/Math.max(canvas.width,canvas.height);
    return {imageTransform:getComputedStyle(img).transform,canvasTransform:getComputedStyle(canvas).transform,parentTransform:getComputedStyle(pet).transform,height:(bottom-top)*ratio,feet:bounds.bottom-(canvas.height-bottom)*ratio,parentWidth:parent.width};
   });
   assert.equal(actual.imageTransform,actual.canvasTransform);
   return actual;
  }
  const old=await checkStage('idle_normal');
  await page.screenshot({path:path.join(evidence,'eski_normalize.png'),fullPage:true});
  await page.click('#forward');
  const recent=await checkStage('durum/bosta_nefes');
  await page.screenshot({path:path.join(evidence,'yeni_normalize.png'),fullPage:true});
  const screenHeightDiff=Math.abs(old.height-recent.height)/old.height*100;
  const screenFeetDiff=Math.abs(old.feet-recent.feet);
  assert.ok(screenHeightDiff<=3,`Rendered height difference ${screenHeightDiff}%`);
  assert.ok(screenFeetDiff<=2,`Rendered feet difference ${screenFeetDiff}px`);
  await page.locator('#scale').evaluate(el=>{el.value='120';el.dispatchEvent(new Event('input'));});
  await page.locator('#x').evaluate(el=>{el.value='12';el.dispatchEvent(new Event('input'));});
  const custom=await checkStage('durum/bosta_nefes');
  assert.ok(Math.abs(custom.height/recent.height-1.2)<.001);
  assert.ok(Math.abs(custom.parentWidth-307.2)<.01);
  const downloadPromise=page.waitForEvent('download');
  await page.click('#export');
  const download=await downloadPromise;
  await download.saveAs(path.join(evidence,'afu_animasyon.json'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(evidence,'afu_animasyon.json'),'utf8')).normalize,true);
  assert.deepEqual(errors,[]);
  await page.locator('#gallery .tile').first().hover();
  assert.equal(await page.locator('#preview img').count(),1);
  assert.equal(await page.locator('#preview img').evaluate(el=>el.naturalWidth>0),true);
  assert.ok(await page.locator('#frames .mini img').evaluateAll(images=>images.every(el=>getComputedStyle(el).transform!=='none')));
  const results={...geometry,screenHeightDiffPercent:screenHeightDiff,screenFeetDiffPx:screenFeetDiff,old,recent,button:true,undo:true,allSequences:true,export:true,userSettings:true,pageErrors:errors};
  fs.writeFileSync(path.join(evidence,'chromium_sonuc.json'),JSON.stringify(results,null,2));
  log('ADIM','Başsız Chromium: düğme, tümüne, geri al, dışa aktar, kullanıcı ayarı ve ekran ölçümleri başarılı.');
  console.log(JSON.stringify(results,null,2));
 } catch(error){log('HATA',error.stack);throw error;} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
