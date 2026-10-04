import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatModel, ChatView, speechText } from "../src/chat/chat";
import { State } from "../src/core/state";
class Element {
 children:Element[]=[];textContent="";value="";hidden=false;disabled=false;className="";
 listeners=new Map<string,((e:any)=>void)[]>();classList={toggle(){}};
 append(...c:Element[]){this.children.push(...c);}setAttribute(){}replaceChildren(...c:Element[]){this.children=c;}
 addEventListener(n:string,f:(e:any)=>void){this.listeners.set(n,[...this.listeners.get(n)??[],f]);}
 fire(n:string){for(const f of this.listeners.get(n)??[])f({});}
}
function setup(){
 const a={codexStatus:vi.fn(async()=>({status:"bagli",loggedIn:true,accountId:"a"})),codexSend:vi.fn(async()=>({threadId:"t",turnId:"1"})),codexCancel:vi.fn(async()=>{}),codexLogin:vi.fn(async()=>{}),codexLoginCancel:vi.fn(async()=>{}),codexLogout:vi.fn(async()=>{}),codexNewChat:vi.fn(async()=>{}),codexInstall:vi.fn(async()=>{})};
 const s={voiceStart:vi.fn(async()=>{}),voiceStop:vi.fn(async()=>"Merhaba"),voiceCancel:vi.fn(async()=>{}),voiceSpeak:vi.fn(async(_text:string)=>{}),voiceResponse:vi.fn(async(_text:string)=>({warning:null})),voiceSilence:vi.fn(async()=>{}),voiceListenTurn:vi.fn(()=>new Promise<string>(()=>{})),voiceSupported:vi.fn(async()=>({whisper:true,winrt_stt:false,tts:true,afu_tts:true}))};
 const v=new ChatView(a,s);return {a,s,v};
}
function delta(v:ChatView,text:string){v.onEvent({method:"item/agentMessage/delta",params:{threadId:"t",turnId:"1",delta:text}});}
function start(v:ChatView){v.onEvent({method:"turn/started",params:{threadId:"t",turn:{id:"1"}}});}
function complete(v:ChatView){v.onEvent({method:"turn/completed",params:{threadId:"t",turn:{id:"1",status:"completed"}}});}
beforeEach(()=>{vi.stubGlobal("document",{createElement:()=>new Element(),createTextNode:(text:string)=>Object.assign(new Element(),{textContent:text})});State.settings.tts=false;});
afterEach(()=>{State.settings.tts=false;vi.unstubAllGlobals();});
describe("Sol Voice spec 17",()=>{
 it("PROMPT INTEGRITY: preserves whitespace and never calls legacy context",async()=>{
  const {a,s}=setup();const context=vi.fn(()=>"Görev: gizli");const v=new ChatView(a,context,s);
  await v.ask("  Merhaba\n");expect(a.codexSend).toHaveBeenCalledExactlyOnceWith("  Merhaba\n",[]);expect(context).not.toHaveBeenCalled();
 });
 it("NO FALLBACK: rejected Sol request produces no second request",async()=>{const {a,v}=setup();a.codexSend.mockRejectedValue(new Error("Bu hesapta GPT-5.6 Sol kullanılamıyor."));await v.ask("Merhaba");expect(a.codexSend).toHaveBeenCalledOnce();expect(v.message.textContent).toBe("Bu hesapta GPT-5.6 Sol kullanılamıyor.");});
 it("RESPONSE INTEGRITY: all deltas stream to UI and deterministic TTS",async()=>{
  const {v,s}=setup();await v.ask("Merhaba");v.responses!.enabled=true;start(v);
  delta(v,"**Merhaba**, ");expect(v.answer.textContent).toBe("**Merhaba**, ");
  delta(v,"sana nasıl yardımcı olabilirim?");complete(v);await Promise.resolve();
  expect(v.model.text).toBe("**Merhaba**, sana nasıl yardımcı olabilirim?");expect(v.answer.textContent).toBe(v.model.text);
  expect(s.voiceResponse).toHaveBeenCalledExactlyOnceWith(speechText(v.model.text));
 });
 it("RESPONSE INTEGRITY: long response is never clipped",()=>{const {v}=setup();start(v);delta(v,"x".repeat(40000));expect(v.answer.textContent).toBe("x".repeat(40000));});
 it("INTERRUPT: main microphone stops TTS and active Codex turn before listening",async()=>{
  const {v,a,s}=setup();await v.refresh();v.responses!.speaking=true;start(v);
  (v.mainVoiceBtn as unknown as Element).fire("click");for(let i=0;i<25;i++)await Promise.resolve();
  expect(s.voiceSilence).toHaveBeenCalled();expect(a.codexCancel).toHaveBeenCalledOnce();expect(s.voiceListenTurn).toHaveBeenCalledOnce();await v.detach();
 });
 it("LOGIN: logout clears old transcript, reply and audio",async()=>{const {v,a,s}=setup();await v.refresh();start(v);delta(v,"eski hesap");(v.logoutButton as unknown as Element).fire("click");for(let i=0;i<25;i++)await Promise.resolve();expect(a.codexLogout).toHaveBeenCalledOnce();expect(v.answer.textContent).toBe("");expect(v.conversationList.textContent).toBe("");expect(s.voiceSilence).toHaveBeenCalled();});
 it("STT transport: Turkish transcript enters shared send unchanged",async()=>{const {v,a,s}=setup();s.voiceListenTurn.mockResolvedValueOnce("Sen hangi modelsin?");await v.refresh();(v.mainVoiceBtn as unknown as Element).fire("click");for(let i=0;i<25;i++)await Promise.resolve();expect(a.codexSend).toHaveBeenCalledExactlyOnceWith("Sen hangi modelsin?",[]);await v.detach();});
 it("TTS transport: Sol text is passed to local response without rewriting",async()=>{const {v,s}=setup();await v.ask("Merhaba");v.responses!.enabled=true;start(v);delta(v,"Merhaba, sana nasıl yardımcı olabilirim?");complete(v);await Promise.resolve();expect(s.voiceResponse).toHaveBeenCalledExactlyOnceWith("Merhaba, sana nasıl yardımcı olabilirim?");});
 it("MODEL status: ChatGPT login alone does not claim inference ready",async()=>{const {v}=setup();await v.refresh();expect(v.message.textContent).not.toContain("hazır");expect(v.mainVoiceBtn.textContent).toBe("🎙 AFU'YA SOR");});
 it("Markdown cleaning preserves code, links and meaning",()=>{expect(speechText("# Başlık\n**Merhaba** [dünya](https://example.org)\n```ts\nconst x = 1;\n```" )).toBe("Başlık\nMerhaba dünya\nconst x = 1;");});
 it("one active turn rejects a second input",()=>{const m=new ChatModel();expect(m.send("1")).not.toBeNull();expect(m.send("2")).toBeNull();});
});
