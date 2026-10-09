import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { build } from "esbuild";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
let browser: Browser;
let script: string;
import { createHash } from "node:crypto";
import { PET_BALON_GENISLIK, petPencereYuksekligi } from "../src/core/layout";
const output = "test-results/m8";
const css = ["src/style.css", "src/apps.css", "src/message/message.css"].map(f => readFileSync(f, "utf8").replace(/^\uFEFF/, '')).join("\n");
beforeAll(async () => {
  const result = await build({ stdin: { contents: `
    import { Island } from './src/island/island';
    import { State, parseState } from './src/core/state';
    State.snapshot = parseState({version:1,tasks:[]});
    const island = new Island(document.querySelector('#root'));
    island.fsm.state = 'pet'; island.setMode('pet'); island.pet.setActive(true);
    window.m8 = {island,k:island.konusan};`, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, write: false, format: "iife", tsconfigRaw: {},
    // Node okuması, Windows sandbox'ında esbuild'in üst dizin taramasını önler.
    plugins: [{ name: "local-source", setup(builder) {
      const require = createRequire(import.meta.url);
      builder.onResolve({ filter: /.*/ }, args => {
        const base = args.importer ? dirname(args.importer) : process.cwd();
        const path = args.path.startsWith('.') ? resolve(base, args.path) : require.resolve(args.path);
        const file = [path, `${path}.ts`, `${path}.js`].find(existsSync)!;
        return { path: file, namespace: "source" };
      });
      builder.onLoad({ filter: /.*/, namespace: "source" }, args => ({
        contents: args.path.endsWith('.css') ? '' : readFileSync(args.path, 'utf8'),
        loader: args.path.endsWith('.ts') ? 'ts' : 'js',
      }));
    } }],
  });
  script = result.outputFiles[0].text;
  browser = await chromium.launch({headless:true});
  mkdirSync(output,{recursive:true});
});
afterAll(async () => { await browser?.close(); });

async function screen(scale: number, text: string) {
  const page = await browser.newPage({viewport:{width:320,height:petPencereYuksekligi(true)},deviceScaleFactor:scale,reducedMotion:'reduce'});
  await page.route('**/afu/**', async route => {
    const file = resolve('public', new URL(route.request().url()).pathname.slice(1));
    if(existsSync(file)) await route.fulfill({body:readFileSync(file),contentType:'image/webp'});
    else await route.abort();
  });
  await page.route('http://afu.test/', route => route.fulfill({body:'<html></html>',contentType:'text/html'}));
  await page.goto('http://afu.test');
  await page.setContent(`<style>${css}</style><div id="root"></div>`);
  await page.evaluate(() => Object.defineProperty(window,'localStorage',{value:{getItem:()=> 'seen',setItem:()=>{}}}));
  await page.addScriptTag({content:script});
  page.setDefaultTimeout(2000);
  await page.evaluate(({text,scale}) => {
    const {island,k}=(window as any).m8; island.setNativeScale(scale);
    k.ekle({surum:1,id:'m8',ajan:'claude',tur:'bilgi',metin:text,zaman:Date.now()});
    island.applyGeometry();
  }, {text,scale});
  await page.waitForTimeout(100);
  // Image decoding is asynchronous; capture only after the visible pet is ready.
  await page.locator('#afu-pet > img:not(.pet-previous)').evaluate(async (el: HTMLImageElement) => {
    await el.decode();
  });
  return page;
}
for(const scale of [1,1.25,1.5]) for(const [name,text] of [
 ['kisa','Claude: Görseller hazır.'],
 ['uzun','Claude: '+ 'Durum çubuğu temizlendi, yeni istekler hazırlandı ve bütün kartlar kontrol edildi. '.repeat(3).slice(0,200)],
 ['tasma','Claude: '+ 'Bütün kartlar kontrol edildi. '.repeat(100)],
] as const) it(`real pet window: ${name} x${scale}`,async()=>{
 const page=await screen(scale,text);
 try {
  const balloon=page.locator('#afu-pet-balon > .afu-konusma-balonu');
  const metrics=await balloon.evaluate(el=>{
   const r=el.getBoundingClientRect(), s=getComputedStyle(el);
   const text=el.querySelector('.afu-balon-metin')!, t=text.getBoundingClientRect();
   const pet=document.querySelector('#afu-pet')!.getBoundingClientRect();
   return {w:r.width,h:r.height,bg:s.backgroundColor,right:r.right,top:r.top,bottom:r.bottom,
    textBottom:t.bottom,textTop:t.top,textRight:t.right,textLeft:t.left,left:r.left,petW:pet.width,
    fullHeight:text.scrollHeight,visibleHeight:text.clientHeight,value:text.textContent};
  });
  expect(metrics.w).toBeGreaterThanOrEqual(260); expect(metrics.w).toBeLessThanOrEqual(320);
  expect(metrics.h).toBeLessThanOrEqual(340); expect(metrics.bg).toBe('rgb(23, 40, 63)');
  expect(metrics.top).toBeGreaterThanOrEqual(0); expect(metrics.right).toBeLessThanOrEqual(320);
  expect(metrics.textBottom).toBeLessThanOrEqual(metrics.bottom-2);
  expect(metrics.textTop).toBeGreaterThan(metrics.top); expect(metrics.petW).toBe(256);
  expect(metrics.fullHeight).toBeLessThanOrEqual(metrics.visibleHeight+1);
  if(name==='tasma') expect(metrics.value).toMatch(/\u2026$/);
  if(name==='uzun') expect(metrics.value!.length).toBeGreaterThan(80);
  await expectPixelsInside(page,balloon,`${name}-${scale}`);
  await balloon.getByRole('button',{name:/Okudum/}).click();
  expect(await balloon.count()).toBe(0);
 }finally{await page.close();}
});
async function expectPixelsInside(page: any, balloon: any, name:string) {
 const rect=await balloon.boundingBox();
 const proofShot=await page.screenshot({path:`${output}/${name}.png`,omitBackground:true});
 // A decoded WebP can repaint between captures even with CSS motion reduced.
 // Hide only the separate mascot sibling in both glyph comparison images;
 // balloon glyphs outside their box remain visible and must still fail.
 await page.addStyleTag({content:'#afu-pet{visibility:hidden!important}'});
 const shot=await page.screenshot({omitBackground:true});
 // Hide glyphs without changing layout, then compare actual raster pixels.
 await page.addStyleTag({content:'.afu-balon-metin,.afu-balon-etiket,.afu-balon-kapat{color:transparent!important;text-shadow:none!important}'});
 const blank=await page.screenshot({omitBackground:true});
 const {decodePng}=await import('../scripts/png.mjs');
 const a=decodePng(shot), b=decodePng(blank), scale=a.width/320;
 let glyphs=0, outside=0;
 for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
  const i=(y*a.width+x)*a.channels;
  if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]){
   glyphs++; if(x<rect.x*scale||x>=(rect.x+rect.width)*scale||y<rect.y*scale||y>=(rect.y+rect.height)*scale)outside++;
  }
 }
 expect(glyphs).toBeGreaterThan(0);expect(outside).toBe(0);
 const proof={name,rect,glyphs,outside,md5:createHash('md5').update(proofShot).digest('hex')};
 writeFileSync(`${output}/${name}.json`,JSON.stringify(proof,null,2));
 console.log(JSON.stringify(proof));
}
it('card detail has one sender, no repeated heading, and a separated right aligned button',async()=>{
 const page=await screen(1,'Claude: Ayrıntı: Görseller hazır.');
 try{
  await page.locator('#afu-pet-balon .afu-balon-metin').click();
  await page.setViewportSize({width:1080,height:480});
  await page.evaluate(()=>{const i=(window as any).m8.island;i.setMode('expanded');i.applyGeometry();});
  const detail=page.locator('.afu-mesaj-detayi');
  expect(await detail.innerText()).not.toContain('Ayrıntı');
  const geometry=await detail.evaluate(el=>{
   const p=el.querySelector('p')!.getBoundingClientRect(), b=el.querySelector('button')!.getBoundingClientRect();
   const s=getComputedStyle(el.querySelector('button')!);
   return {gap:b.top-p.bottom,h:b.height,left:b.left,right:b.right,pr:p.right,radius:s.borderRadius};
  });
  expect(geometry.gap).toBeGreaterThanOrEqual(8);expect(geometry.h).toBeGreaterThanOrEqual(28);
  expect(geometry.right).toBeCloseTo(geometry.pr,0);expect(geometry.radius).toBe('8px');
  await page.screenshot({path:`${output}/kart-detay-okudum.png`});
 }finally{await page.close();}
});
