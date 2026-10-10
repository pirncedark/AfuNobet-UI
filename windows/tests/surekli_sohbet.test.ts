import { sesIptal } from "../src/chat/voice";
import { afterEach, expect, test, vi } from "vitest";
import { SurekliSohbet } from "../src/chat/voice";
import { ChatView } from "../src/chat/chat";
class Element {
 children:Element[]=[]; textContent="";value="";hidden=false;disabled=false;
 classList={toggle(){}}; listeners=new Map<string,(()=>void)[]>();
 setAttribute(){} append(...c:Element[]){this.children.push(...c);} replaceChildren(...c:Element[]){this.children=c;}
 addEventListener(n:string,f:()=>void){this.listeners.set(n,[...this.listeners.get(n)??[],f]);}
 click(){for(const f of this.listeners.get("click")??[])f();}
}
function dom(){vi.stubGlobal("document",{createElement:()=>new Element(),createTextNode:(text:string)=>Object.assign(new Element(),{textContent:text})});}
afterEach(async()=>{await sesIptal({voiceSilence:async()=>{}});vi.unstubAllGlobals();vi.useRealTimers();});
function fakeVoice(){return {voiceStart:async()=>{},voiceStop:async()=>"",voiceCancel:vi.fn(async()=>{}),voiceSpeak:async()=>{},voiceSilence:async()=>{},voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:true}),voiceListenTurn:vi.fn(async()=>""),voiceResponse:vi.fn(async()=>({warning:null}))};}
test("Bitir düşünürken geç gelen yanıtı okutmaz",async()=>{
 const actions=fakeVoice();actions.voiceListenTurn.mockResolvedValue("soru");
 let answer!:(text:string)=>void;const send=vi.fn(()=>new Promise<string>(r=>answer=r));
 const c=new SurekliSohbet(actions,{send});const running=c.baslat();
 await vi.waitFor(()=>expect(c.state).toBe("thinking"));await c.bitir();answer("geç cevap");await running;
 expect(c.state).toBe("idle");expect(actions.voiceResponse).not.toHaveBeenCalled();expect(send).toHaveBeenCalledOnce();
});
test("Bitir konuşurken yeni dinleme başlatmaz",async()=>{
 const actions=fakeVoice();actions.voiceListenTurn.mockResolvedValue("soru");
 let finish!:(value:{warning:null})=>void;actions.voiceResponse.mockImplementation(()=>new Promise(r=>finish=r));
 const c=new SurekliSohbet(actions,{send:async()=>"cevap"});const running=c.baslat();
 await vi.waitFor(()=>expect(c.state).toBe("speaking"));await c.bitir();finish({warning:null});await running;
 expect(actions.voiceListenTurn).toHaveBeenCalledOnce();expect(actions.voiceCancel).toHaveBeenCalledOnce();
});
test("seslendirme hatası tek cümleyle döngüyü bitirir",async()=>{
 const actions=fakeVoice();actions.voiceListenTurn.mockResolvedValue("soru");actions.voiceResponse.mockRejectedValue(Error("technical"));
 const c=new SurekliSohbet(actions,{send:async()=>"cevap"});await c.baslat();
 expect(c.state).toBe("idle");expect(c.message).toBe("Ses okunamadı; yeniden dene.");expect(actions.voiceListenTurn).toHaveBeenCalledOnce();
});

test("SurekliSohbet - 2 tur sohbet", async () => {
  let dinlemeSayisi = 0;
  const turns:string[]=[];const replies:string[]=[];const limits:number[]=[];
  const actions: Partial<import("../src/chat/voice").VoiceActions> = {
    voiceStart: async () => {},
    voiceStop: async () => "",
    voiceCancel: async () => {},
    voiceSpeak: async () => {},
    voiceListenTurn: async (maxMs: number) => {
      limits.push(maxMs);
      dinlemeSayisi++;
      if (dinlemeSayisi === 1) return "merhaba";
      if (dinlemeSayisi === 2) return "nasılsın";
      return ""; // sessizlik (biter)
    },
    voiceResponse: async (text: string) => { replies.push(text);return { warning: null }; }
  };
  const chat = {
    send: async (text: string) => { turns.push(text);return `Cevap: ${text}`; }
  };

  const sohbet = new SurekliSohbet(actions as unknown as import("../src/chat/voice").VoiceActions, chat);

  await sohbet.baslat();

  expect(dinlemeSayisi).toBe(3);
  expect(limits).toEqual([60000,60000,60000]);
  expect(turns).toEqual(["merhaba","nasılsın"]);
  expect(replies).toEqual(["Cevap: merhaba","Cevap: nasılsın"]);
  expect(sohbet.state).toBe("idle");
});

test("SurekliSohbet - sessizlikte bitiş", async () => {
  const actions: Partial<import("../src/chat/voice").VoiceActions> = {
    voiceStart: async () => {},
    voiceStop: async () => "",
    voiceCancel: async () => {},
    voiceSpeak: async () => {},
    voiceListenTurn: async () => "" // hemen sessizlik
  };
  const chat = { send: async () => "" };

  const sohbet = new SurekliSohbet(actions as unknown as import("../src/chat/voice").VoiceActions, chat);
  await sohbet.baslat();

  expect(sohbet.state).toBe("idle");
});

test("SurekliSohbet - bitir() kesme", async () => {
  let bitirdi = false;
  let pResolver: (val: string) => void;
  const delay = new Promise<string>(r => { pResolver = r; });
  const actions: Partial<import("../src/chat/voice").VoiceActions> = {
    voiceStart: async () => {},
    voiceStop: async () => "",
    voiceCancel: async () => { bitirdi = true; pResolver(""); },
    voiceSilence: async () => {},
    voiceSpeak: async () => {},
    voiceListenTurn: async () => delay
  };
  const chat = { send: async () => "" };

  const sohbet = new SurekliSohbet(actions as unknown as import("../src/chat/voice").VoiceActions, chat);
  const p = sohbet.baslat();
  await sohbet.bitir();
  await p;

  expect(sohbet.state).toBe("idle");
  expect(bitirdi).toBe(true);
});

test("ChatView - oturum yokken giriş", async () => {
  dom(); vi.useFakeTimers();
  let loginCagrisi = 0;
  const actions: Partial<import("../src/chat/chat").ChatActions> = {
    codexStatus: async () => "oturum_yok",
    codexSend: async () => {},
    codexCancel: async () => {},
    codexLogin: async () => { loginCagrisi++; },
    codexLoginCancel: async () => {},
    codexInstall: async () => {}
  };
  const view = new ChatView(actions as unknown as import("../src/chat/chat").ChatActions);
  await view.refresh();

  // Baslat düğmesine tıkla
  (view.mainVoiceBtn as unknown as Element).click();

  await Promise.resolve();
  expect(loginCagrisi).toBe(1);
  await view.detach();
});

test("giriş tamamlanınca dinler ve Codex yanıtı tamamlandıktan sonra konuşur",async()=>{
 dom(); vi.useFakeTimers(); let status="oturum_yok";
 const a={codexStatus:async()=>status,codexSend:vi.fn(async()=>{}),codexCancel:vi.fn(async()=>{}),codexLogin:vi.fn(async()=>{}),codexLoginCancel:vi.fn(async()=>{}),codexInstall:vi.fn(async()=>{})};
 const s={voiceStart:async()=>{},voiceStop:async()=>"",voiceCancel:vi.fn(async()=>{}),voiceSpeak:async()=>{},voiceSilence:async()=>{},voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:true}),voiceListenTurn:vi.fn().mockResolvedValueOnce("Merhaba").mockResolvedValue(""),voiceResponse:vi.fn(async()=>({warning:null}))};
 const context=vi.fn(()=>"bağlam");const v=new ChatView(a,context,s);await v.refresh();
 (v.mainVoiceBtn as unknown as Element).click();await Promise.resolve();
 expect(a.codexLogin).toHaveBeenCalledOnce();expect(s.voiceListenTurn).not.toHaveBeenCalled();
 status="hazir";await v.refresh();await vi.waitFor(()=>expect(a.codexSend).toHaveBeenCalledExactlyOnceWith("Merhaba",[]));
 expect(context).not.toHaveBeenCalled();
 expect(s.voiceResponse).not.toHaveBeenCalled();
 v.onEvent({method:"turn/started",params:{threadId:"t",turn:{id:"1"}}});
 v.onEvent({method:"item/agentMessage/delta",params:{threadId:"t",turnId:"1",delta:"Selam"}});
 v.onEvent({method:"turn/completed",params:{threadId:"t",turn:{id:"1",status:"completed"}}});
 await vi.waitFor(()=>expect(s.voiceResponse).toHaveBeenCalledExactlyOnceWith("Selam"));
 expect(v.conversationList.textContent).toContain("Merhaba");expect(v.conversationList.textContent).toContain("Selam");
 await v.detach();
});
