import { State } from "../src/core/state";
import { describe, expect, it } from "vitest";
import { ChatModel } from "../src/chat/chat";
import { buildContext } from "../src/chat/context";
describe("Sohbet güvenliği", () => {
 it("ilişkisiz yanıtı ve eski tamamlanmayı almaz", () => {
  const m = new ChatModel(); m.append("turn/started", {threadId:"a",turn:{id:"1"}});
  m.append("item/agentMessage/delta", {threadId:"b",turnId:"1",delta:"yabancı"});
  m.append("item/agentMessage/delta", {threadId:"a",turnId:"1",delta:"Merhaba"});
  m.append("turn/completed", {threadId:"a",turn:{id:"old"}}); expect(m.busy).toBe(true);
  m.append("turn/completed", {threadId:"a",turn:{id:"1"}}); expect(m.text).toBe("Merhaba"); expect(m.busy).toBe(false);
  m.append("item/agentMessage/delta", {threadId:"a",turnId:"1",delta:"geç"}); expect(m.text).toBe("Merhaba");
 });
 it("dosya yalnız Gönder ile çıkış kuyruğuna geçer", () => {
  const m = new ChatModel(); m.attach(["C:\\proje\\rapor.md", "C:\\proje\\rapor.md"]);
  expect(m.attachments).toEqual([{name:"rapor.md",path:"C:\\proje\\rapor.md"}]); expect(m.outbox).toEqual([]);
  expect(m.send("Bak")).toEqual({text:"Bak",attachments:["C:\\proje\\rapor.md"]}); expect(m.send("tekrar")).toBeNull();
 });
 it("uzun delta sınırlıdır", () => {
  const m = new ChatModel(); m.append("turn/started",{}); m.append("item/agentMessage/delta",{delta:"x".repeat(100000)}); expect(m.text.length).toBeLessThanOrEqual(32000);
 });
 it("bağlam yalnız güvenli kısa alanları içerir", () => {
  const ctx = buildContext({tasks:[]}, {id:"j1",repo:"C:\\private\\Afu",title:"token=secretvalue",status:"Calisiyor",file:"C:\\private\\file.ts",logs:"secret"});
  expect(ctx).toContain("Afu"); expect(ctx).toContain("file.ts"); expect(ctx).not.toMatch(/private|token|secret|logs/); expect(ctx.length).toBeLessThanOrEqual(1500);
 });
});
import { ChatView } from "../src/chat/chat";
import { afterEach, vi } from "vitest";
class FakeElement {
 children:FakeElement[]=[]; textContent="";value="";className="";hidden=false;disabled=false;listeners=new Map<string,((e:any)=>void)[]>();
 classList={toggle(c:string,force:boolean){}};
 setAttribute(){} append(...c:FakeElement[]){this.children.push(...c);}replaceChildren(...c:FakeElement[]){this.children=c;}
 addEventListener(n:string,f:(e:any)=>void){this.listeners.set(n,[...this.listeners.get(n)??[],f]);} fire(n:string,e:any={}){for(const f of this.listeners.get(n)??[])f(e);}
}
afterEach(()=>{State.settings.tts=false;vi.unstubAllGlobals();});
it("görünüm dosyayı bekletir, hazır olmadan Enter göndermez ve yanıtı düz metin tutar",async()=>{
 vi.stubGlobal("document",{createElement:()=>new FakeElement(),createTextNode:(text:string)=>Object.assign(new FakeElement(),{textContent:text})});
 const a={codexStatus:vi.fn(async()=>"hazir"),codexSend:vi.fn(async()=>{}),codexCancel:vi.fn(async()=>{}),codexLogin:vi.fn(async()=>{}),codexLoginCancel:vi.fn(async()=>{})};
 const v=new ChatView(a);
 const input=v.input as unknown as FakeElement;input.value="Bak";input.fire("keydown",{key:"Enter",preventDefault:vi.fn()});expect(a.codexSend).not.toHaveBeenCalled();
 await v.refresh();v.attach(["C:\\private\\rapor.md"]);
 input.fire("keydown",{key:"Enter",preventDefault:vi.fn()});await Promise.resolve();expect(a.codexSend).toHaveBeenCalledWith("Bak",["C:\\private\\rapor.md"]);
 v.onEvent({method:"turn/started",params:{threadId:"t",turn:{id:"1"}}});v.onEvent({method:"item/agentMessage/delta",params:{threadId:"t",turnId:"1",delta:"<img onerror=evil>"}});expect(v.answer.textContent).toBe("<img onerror=evil>");
});
it("tek cümle geri bildirim verir",async()=>{
 vi.stubGlobal("document",{createElement:()=>new FakeElement(),createTextNode:(text:string)=>Object.assign(new FakeElement(),{textContent:text})});
 const a={codexStatus:vi.fn(async()=>"hazir"),codexSend:vi.fn(async()=>{}),codexCancel:vi.fn(async()=>{}),codexLogin:vi.fn(async()=>{}),codexLoginCancel:vi.fn(async()=>{})};
 const v=new ChatView(a);await v.refresh();v.attach(["C:\\private\\rapor.md"]);expect(v.message.textContent).toBe("Dosya sohbete eklendi.");
 v.attach(["C:\\a.md", "C:\\b.md"]);expect(v.message.textContent).toBe("Dosyalar sohbete eklendi.");
});
it("oturum yoksa dosya eklenmez ve tek cümle uyarı verir", async () => {
 vi.stubGlobal("document",{createElement:()=>new FakeElement(),createTextNode:(text:string)=>Object.assign(new FakeElement(),{textContent:text})});
 const a={codexStatus:vi.fn(async()=>"oturum_yok"),codexSend:vi.fn(),codexCancel:vi.fn(),codexLogin:vi.fn(),codexLoginCancel:vi.fn()};
 const v=new ChatView(a);await v.refresh();v.attach(["C:\\rapor.md"]);
 expect(v.message.textContent).toBe("Codex oturumu açık değil; dosya eklenemez.");
 expect(v.model.attachments.length).toBe(0);
});
it("gönderim başarısızsa taslak ve ek korunur",async()=>{
 vi.stubGlobal("document",{createElement:()=>new FakeElement(),createTextNode:(text:string)=>Object.assign(new FakeElement(),{textContent:text})});
 const a={codexStatus:vi.fn(async()=>"hazir"),codexSend:vi.fn(async()=>{throw Error("bad")}),codexCancel:vi.fn(async()=>{}),codexLogin:vi.fn(async()=>{}),codexLoginCancel:vi.fn(async()=>{})};
 const v=new ChatView(a);await v.refresh();v.attach(["/private/file.ts"]);v.input.value="taslak";(v.sendButton as unknown as FakeElement).fire("click");await Promise.resolve();await Promise.resolve();expect(v.input.value).toBe("taslak");expect(v.model.attachments).toHaveLength(1);expect(v.model.busy).toBe(false);expect(v.message.textContent).toContain("yeniden dene");
});
it("gönderim beklerken eklenen yeni dosya kabulde kaybolmaz",()=>{const m=new ChatModel();m.attach(["/a/old.md"]);const next=m.send("Bak")!;m.attach(["/a/new.md"]);m.accepted(next);expect(m.attachments.map(a=>a.name)).toEqual(["new.md"]);});
it("hata yeniden denenecekse turn açık kalır",()=>{const m=new ChatModel();m.append("turn/started",{threadId:"t",turn:{id:"1"}});m.append("error",{threadId:"t",turnId:"1",willRetry:true});expect(m.busy).toBe(true);m.append("item/agentMessage/delta",{threadId:"t",turnId:"1",delta:"Devam"});expect(m.text).toBe("Devam");});
it("en fazla sekiz dosya kullanıcı gönderene kadar bekler",()=>{const m=new ChatModel();m.attach(Array.from({length:20},(_,i)=>`/proje/${i}.md`));expect(m.attachments).toHaveLength(8);expect(m.outbox).toHaveLength(0);});
import { projectName } from "../src/chat/context";
it("proje açma yalnız tek güvenli klasör adı kabul eder",()=>{expect(projectName("AfuNobet-UI")).toBe("AfuNobet-UI");for(const name of ["../Afu","C:\\Afu","a/b",".","a.","token=abc"])expect(projectName(name)).toBeNull();});
it("eski durum yanıtı yeni hazır hesabı ezmez",async()=>{vi.stubGlobal("document",{createElement:()=>new FakeElement(),createTextNode:(text:string)=>Object.assign(new FakeElement(),{textContent:text})});const waiting:((v:string)=>void)[]=[];const a={codexStatus:()=>new Promise<string>(r=>waiting.push(r)),codexSend:vi.fn(async()=>{}),codexCancel:vi.fn(async()=>{}),codexLogin:vi.fn(async()=>{}),codexLoginCancel:vi.fn(async()=>{})};const v=new ChatView(a);v.input.value="mesaj";const old=v.refresh(),fresh=v.refresh();waiting[1]("hazir");await fresh;waiting[0]("oturum_yok");await old;expect(v.sendButton.disabled).toBe(false);expect(v.message.textContent).not.toContain("hesabını bağla");});
it("gönderim sürerken yazılan yeni taslak kabulde korunur",async()=>{vi.stubGlobal("document",{createElement:()=>new FakeElement(),createTextNode:(text:string)=>Object.assign(new FakeElement(),{textContent:text})});let done!:()=>void;const a={codexStatus:vi.fn(async()=>"hazir"),codexSend:vi.fn(()=>new Promise<void>(r=>done=r)),codexCancel:vi.fn(async()=>{}),codexLogin:vi.fn(async()=>{}),codexLoginCancel:vi.fn(async()=>{})};const v=new ChatView(a);await v.refresh();v.input.value="İlk taslak";(v.sendButton as unknown as FakeElement).fire("click");v.input.value="Yeni taslak";done();await Promise.resolve();await Promise.resolve();expect(v.input.value).toBe("Yeni taslak");});
function voiceChat(){vi.stubGlobal("document",{createElement:()=>new FakeElement(),createTextNode:(text:string)=>Object.assign(new FakeElement(),{textContent:text})});const a={codexStatus:vi.fn(async()=>"hazir"),codexSend:vi.fn(async()=>{}),codexCancel:vi.fn(async()=>{}),codexLogin:vi.fn(async()=>{}),codexLoginCancel:vi.fn(async()=>{})};const s={voiceStart:vi.fn(async()=>{}),voiceStop:vi.fn(async()=>"incelenecek metin"),voiceCancel:vi.fn(async()=>{}),voiceSpeak:vi.fn(async(_text:string)=>{}),voiceSilence:vi.fn(async()=>{}),voiceSupported:vi.fn(async()=>({whisper:true,winrt_stt:false,tts:true}))};const v=new ChatView(a,()=>"",s);return {v,a,s};}
async function explicitTurn(v:ChatView,id="1"){await v.refresh();v.input.value="Mesaj";(v.sendButton as unknown as FakeElement).fire("click");await Promise.resolve();v.onEvent({method:"turn/started",params:{threadId:"t",turn:{id}}});v.onEvent({method:"item/agentMessage/delta",params:{threadId:"t",turnId:id,delta:"Merhaba"}});}
function finishTurn(v:ChatView,id="1",status="completed"){v.onEvent({method:"turn/completed",params:{threadId:"t",turn:{id,status}}});}
it("sesli yanıt default kapalı ve bildirimden bağımsızdır",async()=>{const {v,s}=voiceChat();await explicitTurn(v);finishTurn(v);await Promise.resolve();expect(s.voiceSpeak).not.toHaveBeenCalled();expect(v.responseButton?.textContent).toBe("Sesli yanıt kapalı");(v.responseButton as unknown as FakeElement).fire("click");expect(v.notifications?.enabled).toBe(false);});
it("yalnız başarılı tamamlanan yanıt bir kez okunur ve working speaking idle olur",async()=>{const {v,s}=voiceChat();const states:string[]=[];v.onVoiceState=state=>states.push(state);let finish!:()=>void;s.voiceSpeak.mockImplementation(()=>new Promise<void>(r=>finish=r));(v.responseButton as unknown as FakeElement).fire("click");await explicitTurn(v);expect(s.voiceSpeak).not.toHaveBeenCalled();finishTurn(v,"other");expect(s.voiceSpeak).not.toHaveBeenCalled();finishTurn(v);expect(s.voiceSpeak).toHaveBeenCalledWith("Merhaba");finishTurn(v);expect(s.voiceSpeak).toHaveBeenCalledOnce();expect(states).toContain("working");expect(states.at(-1)).toBe("speaking");finish();await Promise.resolve();await Promise.resolve();expect(states.at(-1)).toBe("idle");});
it.each(["failed","interrupted"])("%s yanıt seslendirilmez",async(status)=>{const {v,s}=voiceChat();(v.responseButton as unknown as FakeElement).fire("click");await explicitTurn(v);finishTurn(v,"1",status);await Promise.resolve();expect(s.voiceSpeak).not.toHaveBeenCalled();});
it("iptal edilmiş ya da görünümden ayrılmış turn geç tamamlansa da okunmaz",async()=>{const {v,s}=voiceChat();(v.responseButton as unknown as FakeElement).fire("click");await explicitTurn(v);(v.cancelButton as unknown as FakeElement).fire("click");finishTurn(v);await Promise.resolve();expect(s.voiceSpeak).not.toHaveBeenCalled();await explicitTurn(v,"2");await v.suspend();finishTurn(v,"2");expect(s.voiceSpeak).not.toHaveBeenCalled();});
it("ses kapatma okumayı durdurur ve eski speech sonucu yeni görseli ezmez",async()=>{const {v,s}=voiceChat();const states:string[]=[];v.onVoiceState=state=>states.push(state);const endings:(()=>void)[]=[];s.voiceSpeak.mockImplementation(()=>new Promise<void>(r=>endings.push(r)));(v.responseButton as unknown as FakeElement).fire("click");await explicitTurn(v);finishTurn(v);(v.responseButton as unknown as FakeElement).fire("click");expect(s.voiceSilence).toHaveBeenCalledOnce();(v.responseButton as unknown as FakeElement).fire("click");await explicitTurn(v,"2");finishTurn(v,"2");endings[0]();await Promise.resolve();await Promise.resolve();expect(states.at(-1)).toBe("speaking");endings[1]();await Promise.resolve();await Promise.resolve();expect(states.at(-1)).toBe("idle");});
it("sesli yanıt kısa güvenli metinle sınırlıdır ve transkript kendiliğinden gönderilmez",async()=>{const {v,s,a}=voiceChat();(v.responseButton as unknown as FakeElement).fire("click");await v.voice?.press();await v.voice?.release();expect(v.input.value).toBe("incelenecek metin");expect(a.codexSend).not.toHaveBeenCalled();await explicitTurn(v);v.onEvent({method:"item/agentMessage/delta",params:{threadId:"t",turnId:"1",delta:"x".repeat(5000)}});finishTurn(v);expect(s.voiceSpeak.mock.calls[0][0].length).toBeLessThanOrEqual(4000);});


it("teknik yanıt tümüyle sıralı Unicode parçalarıyla okunur",async()=>{const {v,s}=voiceChat();(v.responseButton as unknown as FakeElement).fire("click");await explicitTurn(v);const technical=" API key ayarını kontrol et. " + "🙂".repeat(9000);v.onEvent({method:"item/agentMessage/delta",params:{threadId:"t",turnId:"1",delta:technical}});finishTurn(v);for(let i=0;i<12;i++)await Promise.resolve();expect(s.voiceSpeak.mock.calls.map(call=>call[0]).join("")).toBe("Merhaba"+technical);expect(s.voiceSpeak.mock.calls.every(call=>Array.from(call[0]).length<=4000)).toBe(true);});
it("ilk parça iptal edilirse kalan ses parçaları başlamaz",async()=>{const {v,s}=voiceChat();let done!:()=>void;s.voiceSpeak.mockImplementation(()=>new Promise<void>(r=>done=r));(v.responseButton as unknown as FakeElement).fire("click");await explicitTurn(v);v.onEvent({method:"item/agentMessage/delta",params:{threadId:"t",turnId:"1",delta:"x".repeat(9000)}});finishTurn(v);await v.suspend();done();for(let i=0;i<5;i++)await Promise.resolve();expect(s.voiceSpeak).toHaveBeenCalledOnce();expect(s.voiceSilence).toHaveBeenCalledOnce();});
it("bas konuş ses okumasının durmasını bekler",async()=>{const {v,s}=voiceChat();let finishSpeech!:()=>void;s.voiceSpeak.mockImplementation(()=>new Promise<void>(r=>finishSpeech=r));let finishSilence!:()=>void;s.voiceSilence.mockImplementation(()=>new Promise<void>(r=>finishSilence=r));(v.responseButton as unknown as FakeElement).fire("click");await explicitTurn(v);finishTurn(v);const press=v.voice!.press();expect(s.voiceSilence).toHaveBeenCalledOnce();expect(s.voiceStart).not.toHaveBeenCalled();finishSilence();await press;expect(s.voiceStart).toHaveBeenCalledOnce();finishSpeech();await v.voice!.cancel();});
it("bildirim sesi açıkken mikrofon her durumda önce sesi durdurur",async()=>{const {v,s}=voiceChat();const order:string[]=[];let finishSpeech!:()=>void;s.voiceSpeak.mockImplementation(()=>{order.push("bildirim");return new Promise<void>(r=>finishSpeech=r);});s.voiceSilence.mockImplementation(async()=>{order.push("sessizlik");});s.voiceStart.mockImplementation(async()=>{order.push("mikrofon");});v.notifications!.enabled=true;const notification=v.notifications!.announce({kind:"JOB_FINISHED",taskId:"n",agent:"codex"},true);expect(v.responses!.speaking).toBe(false);await v.voice!.press();expect(order).toEqual(["bildirim","sessizlik","mikrofon"]);finishSpeech();await notification;await v.voice!.cancel();});
it.each([{whisper:true,winrt_stt:false,tts:false},{whisper:false,winrt_stt:true,tts:false}])("Whisper veya Windows desteği bas konuşu açar",async(supported)=>{const {v,s}=voiceChat();s.voiceSupported.mockResolvedValue(supported);const second=new ChatView({codexStatus:async()=>"hazir",codexSend:async()=>{},codexCancel:async()=>{},codexLogin:async()=>{},codexLoginCancel:async()=>{}},()=>"",s);await Promise.resolve();expect(second.micButton?.disabled).toBe(false);});
it("Windows internet açıklaması yalnız oturumdaki ilk kullanımda görünür",async()=>{const {s,a}=voiceChat();s.voiceSupported.mockResolvedValue({whisper:false,winrt_stt:true,tts:false});const first=new ChatView(a,()=>"",s);await Promise.resolve();await first.voice!.press();expect(first.voiceHint.textContent).toBe("Windows konuşma tanıma internet kullanır.");expect(first.voiceHint.hidden).toBe(false);await first.voice!.release();expect(a.codexSend).not.toHaveBeenCalled();const second=new ChatView(a,()=>"",s);await Promise.resolve();await second.voice!.press();expect(second.voiceHint.hidden).toBe(true);await second.voice!.cancel();});
it.each([["Windows konuşma tanıma izni kapalı; Windows ayarlarından açıp tekrar dene.","speech","İzni aç"],["Mikrofon açılamadı, mikrofon iznini kontrol edip tekrar dene.","microphone","İzni aç"],["Windows konuşma tanıma internete bağlanamadı; bağlantını kontrol edip tekrar dene.","network","Bağlantıyı kontrol et"]])("bilinen ses hatası tek kullanıcı ayar eylemi sunar: %s",async(message,kind,label)=>{const {s,a}=voiceChat();const open=vi.fn(async(_kind:string)=>{});s.voiceStart.mockRejectedValue(new Error(message));const v=new ChatView(a,()=>"",{...s,voiceOpenSettings:open});await Promise.resolve();await v.voice!.press();expect(open).not.toHaveBeenCalled();expect(v.voiceHelpButton.hidden).toBe(false);expect(v.voiceHelpButton.textContent).toBe(label);(v.voiceHelpButton as unknown as FakeElement).fire("click");await Promise.resolve();expect(open).toHaveBeenCalledWith(kind);await v.suspend();expect(v.voiceHelpButton.hidden).toBe(true);(v.voiceHelpButton as unknown as FakeElement).fire("click");expect(open).toHaveBeenCalledOnce();});
it("bilinmeyen hata URI veya ayar eylemine dönüştürülmez",async()=>{const {s,a}=voiceChat();s.voiceStart.mockRejectedValue(new Error("ms-settings:bad C:\\token\\secret"));const open=vi.fn(async()=>{});const v=new ChatView(a,()=>"",{...s,voiceOpenSettings:open});await v.voice!.press();expect(v.voiceHelpButton.hidden).toBe(true);expect(v.message.textContent).not.toMatch(/token|secret|ms-settings/);});
it("teardown sonrası geciken ayar hatası eski eylemi ve mesajı geri getirmez",async()=>{const {s,a}=voiceChat();let reject!:(e:Error)=>void;const open=vi.fn(()=>new Promise<void>((_,r)=>reject=r));s.voiceStart.mockRejectedValue(new Error("Windows konuşma tanıma izni kapalı; Windows ayarlarından açıp tekrar dene."));const v=new ChatView(a,()=>"",{...s,voiceOpenSettings:open});await v.voice!.press();(v.voiceHelpButton as unknown as FakeElement).fire("click");await v.detach();reject(new Error("unsafe"));await Promise.resolve();await Promise.resolve();expect(v.voiceHelpButton.hidden).toBe(true);expect(v.message.textContent).not.toContain("Ayarlar açılamadı");});

it("ilk ses açılışı seçim ister, kaydedilen seçim açıklamayı tekrarlamaz",async()=>{
 const {s,a}=voiceChat();const chosen={ses:"afu_5b",filtre:"sicak",chosen:false,available:["afu_5b","notr","yumusak_sicak","neseli_hareketli","sakin_dogal"]};
 const actions={...s,voiceChoices:async()=>chosen,voiceChoose:async(ses:string,filtre:string)=>Object.assign(chosen,{ses,filtre,chosen:true})};
 const first=new ChatView(a,()=>"",actions);(first.responseButton as unknown as FakeElement).fire("click");
 await Promise.resolve();await Promise.resolve();expect(first.responses?.enabled).toBe(false);
 expect(first.voicePicker?.element.hidden).toBe(false);expect(first.voicePicker?.selection.children).toHaveLength(5);
 expect(first.voicePicker?.selection.value).toBe("afu_5b");expect(first.voicePicker?.filter.value).toBe("sicak");
 expect(first.voicePicker?.selection.children[0].textContent).toContain("Önerilen");
 first.voicePicker!.selection.value="sakin_dogal";(first.voicePicker!.save as unknown as FakeElement).fire("click");
 await Promise.resolve();await Promise.resolve();expect(first.responses?.enabled).toBe(true);expect(first.voicePicker?.element.hidden).toBe(true);
 await first.detach();State.settings.tts=false;
 const second=new ChatView(a,()=>"",actions);(second.responseButton as unknown as FakeElement).fire("click");await Promise.resolve();await Promise.resolve();
 expect(second.responses?.enabled).toBe(true);expect(second.voicePicker?.element.hidden).toBe(true);
});
it("Durdur ses üretimi sırasında da görünür",async()=>{
 const {v,s}=voiceChat();let finish!:()=>void;s.voiceSpeak.mockImplementation(()=>new Promise<void>(r=>finish=r));
 (v.responseButton as unknown as FakeElement).fire("click");await explicitTurn(v);finishTurn(v);
 expect(v.cancelButton.hidden).toBe(false);(v.cancelButton as unknown as FakeElement).fire("click");
 expect(v.responses?.speaking).toBe(false);finish();await Promise.resolve();
});
it("Afu desteği Windows bildirim sesi desteğinden bağımsızdır",async()=>{
 const {s,a}=voiceChat();const v=new ChatView(a,()=>"",{...s,voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:false,afu_tts:true})});
 await Promise.resolve();expect(v.responseButton?.disabled).toBe(false);expect(v.notifications?.enabled).toBe(false);
});
