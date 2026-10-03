import { createServer } from "vite";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
const root=fileURLToPath(new URL("../",import.meta.url));
const out=path.join(root,"test-results/bc-screenshots");
await mkdir(out,{recursive:true});
const server=await createServer({root,configLoader:"runner",optimizeDeps:{noDiscovery:true,exclude:["@tauri-apps/api"]},server:{host:"127.0.0.1",port:0,strictPort:false,watch:{ignored:/(target|test-results)/}}});
let browser;
try {
 await server.listen();browser=await chromium.launch({headless:true});
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`; const results=[];
 for(const width of [720,480,360]) {
  const page=await browser.newPage({viewport:{width,height:320}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(`${origin}/tests/preview.html?case=working`,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.documentElement.dataset.ready==="true");
  const projectProof=await page.evaluate(()=>{
   const button=document.querySelector(".task-project"),card=document.querySelector(".main-task");
   if(!button||!card) return {exists:false};
   const title=card.querySelector("h1,h2,h3,.task-title"),message=card.querySelector(".task-message");
   if(title)title.textContent="Uzun görev başlığı ".repeat(30);
   if(message)message.textContent="Açıklama ".repeat(90);
   const b=button.getBoundingClientRect(),c=card.getBoundingClientRect();
   return {exists:true,fits:b.width>0&&b.height>0&&b.left>=c.left&&b.top>=c.top&&b.right<=c.right&&b.bottom<=c.bottom};
  });
  assert(projectProof.exists&&projectProof.fits,`proje düğmesi/${width}: kırpıldı`);
  for(const view of ["apps","chat","popup"]) {
   await page.evaluate(view=>{ const {island}=window.afuTest;
    if(view==="popup"){island.fsm.toPet();island.pet.el.dispatchEvent(new MouseEvent("contextmenu",{bubbles:true,cancelable:true}));}
    else {island.fsm.forceHome();island.setView(view);}
   },view);
   await page.waitForTimeout(100);
   const visible=await page.evaluate(view=>{
    const el=view==="popup"?document.querySelector(".pet-apps-menu"):view==="chat"?document.querySelector(".chat-input"):document.querySelector(".apps-view");
    if(!el)return false;const r=el.getBoundingClientRect();return !el.hidden && r.width>0 && r.height>0;
   },view);
   assert(visible,`${view}/${width}: görünür değil`);
   if(view==="chat"){
    const speechProof=await page.evaluate(()=>{
     const panel=document.querySelector(".chat-view"),footer=document.querySelector("footer"),content=document.querySelector("#content");
     const options=[...document.querySelectorAll(".chat-panel [role=switch]")];
     if(!panel||!footer||!content)return {options:0,fits:false,footer:false};
     const fits=options.every(option=>{option.scrollIntoView({block:"nearest"});const b=option.getBoundingClientRect(),v=panel.getBoundingClientRect();return b.width>0&&b.height>0&&b.top>=v.top-1&&b.bottom<=v.bottom+1;});
     const f=footer.getBoundingClientRect(),c=content.getBoundingClientRect();
     return {options:options.length,fits,footer:f.height>0&&f.bottom<=c.bottom+1};
    });
    assert(speechProof.options===2&&speechProof.fits&&speechProof.footer,`ses seçenekleri/${width}: erişilemiyor ${JSON.stringify(speechProof)}`);
   }

   assert.deepEqual(errors,[],`${view}/${width}: sayfa hatası`);
   const file=`${view}-${width}.png`;await page.screenshot({path:path.join(out,file),animations:"disabled"});results.push({view,width,file,visible});
  }
  await page.close();
 }
 await writeFile(path.join(out,"manifest.json"),JSON.stringify({nativeWindows:false,realAccount:false,realMicrophone:false,results},null,2));
 console.log(`B/C headless: ${results.length} PASS`);
} finally {await browser?.close();await server.close();}
