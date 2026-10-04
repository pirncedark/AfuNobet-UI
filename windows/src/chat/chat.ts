import { State } from "../core/state";
import { h } from "../views/dom";

import { shortName } from "./context";
import { VoiceController, VoiceService, SurekliSohbet, type VoiceActions } from "./voice";
import "../chat.css";
import { VoicePicker } from "./voice-picker";
import { Katman, kapatDugmesi } from "../views/overlay";
export function speechText(text:string):string {
 return text.replace(/^```[^\n]*\n/gm, "").replace(/^```\s*$/gm, "")
  .replace(/!?(\[[^\]]*\])\([^)]*\)/g, (_all,label:string)=>label.slice(1,-1))
  .replace(/^#{1,6}\s+/gm, "").replace(/^(?:>\s*|[-*+]\s+)/gm, "")
  .replace(/(\*\*|__|~~)([\s\S]*?)\1/g, "$2").replace(/`([^`]+)`/g, "$1")
  .replace(/\*([^*\n]+)\*/g, "$1").trim();
}
function solError(error:unknown):string {
 const text=error instanceof Error?error.message:String(error);
 return ["GPT-5.6 Sol açılamadı.","Bu hesapta GPT-5.6 Sol kullanılamıyor.","Codex kurulu değil.","Codex hesabına giriş yap."].includes(text)?text:"GPT-5.6 Sol'a bağlanılamadı.";
}
/** Same local voice service, without shortening or alternate response text. */
class SolSpeech {
 get enabled(){return State.settings.tts;}set enabled(value:boolean){State.settings.tts=value;}
 speaking=false;message="";private generation=0;
 constructor(private actions:VoiceActions,private changed:()=>void){}
 async speak(text:string){
  if(!this.enabled||!text)return;
  const ticket=++this.generation;this.speaking=true;this.message="";this.changed();
  const chars=Array.from(text),size=this.actions.voiceResponse?32000:4000;
  try{for(let start=0;start<chars.length;start+=size){
   if(ticket!==this.generation||!this.enabled)return;
   const chunk=chars.slice(start,start+size).join("");
   if(this.actions.voiceResponse){const result=await this.actions.voiceResponse(chunk);if(result.warning)throw new Error("tts");}
   else await this.actions.voiceSpeak(chunk);
  }}catch{if(ticket===this.generation)this.message="Afu sesi açılamadı; yanıtı yazıyla gösteriyorum.";}
  finally{if(ticket===this.generation){this.speaking=false;this.changed();}}
 }
 async cancel(stopNative=true){++this.generation;const speaking=this.speaking;this.speaking=false;this.changed();if(speaking&&stopNative)await this.actions.voiceSilence();}
}
export interface Attachment { name:string; path:string }
export interface Outgoing { text:string; attachments:string[] }
function record(v:unknown):Record<string,unknown>{return v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};}
export class ChatModel {
 text=""; busy=false; error="";attachments:Attachment[]=[];outbox:Outgoing[]=[];
 private thread="";private turn="";private closed=new Set<string>();
 attach(paths:string[]){ for(const path of paths.slice(0,8)){if(typeof path!=="string"||path.length>4096||/[\x00-\x1f]/.test(path))continue;const name=shortName(path);if(name&&this.attachments.length<8&&!this.attachments.some(a=>a.path===path))this.attachments.push({name,path});} }
 remove(index:number){this.attachments.splice(index,1);}
 send(text:string):Outgoing|null {if(this.busy||(!text.trim()&&!this.attachments.length))return null;const next={text:text,attachments:this.attachments.map(a=>a.path)};this.outbox.push(next);if(this.outbox.length>20)this.outbox.shift();this.busy=true;this.text="";this.error="";return next;}
 accepted(sent:Outgoing){this.attachments=this.attachments.filter(a=>!sent.attachments.includes(a.path));}
 failed(error?:unknown){this.busy=false;this.error=solError(error);}
 cancelled(){if(this.turn)this.closed.add(this.turn);this.turn="";this.busy=false;this.error="";}
 append(method:string,params:unknown):boolean{
  const p=record(params),turnObj=record(p.turn);const thread=typeof p.threadId==="string"?p.threadId:"";const turn=typeof p.turnId==="string"?p.turnId:typeof turnObj.id==="string"?turnObj.id:"";
  if(method==="turn/started") {if(this.busy&&this.turn)return false;if(turn&&this.closed.has(turn))return false;this.thread=thread;this.turn=turn;this.busy=true;this.text="";this.error="";return false;}
  if(!this.busy || (this.thread&&thread!==this.thread)||(this.turn&&turn!==this.turn))return false;
  if(method==="item/agentMessage/delta" && typeof p.delta==="string"){this.text+=p.delta;this.error="";}
  if(method==="error" && p.willRetry===true){this.error="Yanıt hazırlanıyor; biraz bekle.";return false;}
  if(method==="turn/completed"||method==="error") {if(method==="error" || turnObj.status==="failed")this.error="Yanıt tamamlanamadı; yeniden dene.";this.busy=false;if(this.turn)this.closed.add(this.turn);if(this.closed.size>64)this.closed.delete(this.closed.values().next().value!);const correlated=!!this.thread&&!!this.turn&&this.thread===thread&&this.turn===turn;this.turn="";return method==="turn/completed"&&turnObj.status==="completed"&&correlated;}
  return false;
 }
}
 export interface ChatActions {
  codexStatus():Promise<string|{status:string, loggedIn?:boolean, accountId?:string|null, rateLimits?:any}>;codexSend(text:string,attachments:string[]):Promise<unknown>;
  codexCancel():Promise<unknown>;codexLogin():Promise<unknown>;codexLoginCancel():Promise<unknown>;
  codexInstall?():Promise<unknown>;codexNewChat?():Promise<unknown>;codexLogout?():Promise<unknown>;
 }
export class ChatView {
  readonly mainVoiceBtn=h("button",{class:"primary-button",text:"🎙 AFU'YA SOR"});
  readonly endVoiceBtn=h("button",{class:"text-button",text:"Bitir",hidden:true});
 readonly conversationStatus=h("p",{class:"chat-status chat-state","aria-live":"polite"});
 readonly conversationList=h("div",{class:"chat-history","aria-live":"polite",style:"white-space:pre-wrap"});
 readonly conversation?:SurekliSohbet;
 private voiceLogin=false;private voiceStopping=false;private voiceOrientationShown=false;
 private loginPoll:ReturnType<typeof setInterval>|null=null;
 private history:string[]=[];
 private pendingReply:{resolve:(text:string)=>void;reject:(reason:Error)=>void}|null=null;
 readonly accountStatus=h("p",{class:"chat-status"});private accountId:string|null=null;
 readonly model=new ChatModel();readonly element:HTMLElement;
 readonly input=h("textarea",{class:"chat-input","aria-label":"Mesaj",placeholder:"Nasıl yardımcı olayım?",rows:3,maxlength:8000});
 readonly fallback=h("p",{class:"chat-answer",text:"Nasıl yardımcı olayım?"});readonly answer=h("p",{class:"chat-answer","aria-live":"polite"});readonly message=h("p",{class:"chat-status","aria-live":"polite"});
  readonly sendButton=h("button",{class:"primary-button",text:"Gönder"});readonly loginButton=h("button",{class:"primary-button",text:"Codex ile giriş yap"});
 readonly logoutButton=h("button",{class:"text-button",text:"Çıkış yap"});
/** Q2: sohbetin "Daha fazla" katmanı kapatma yolu. */
  readonly advancedClose=kapatDugmesi("text-button chat-advanced-close","Kapat",()=>this.closeAdvanced());
 readonly advancedMenu=h("details",{class:"chat-advanced"},h("summary",{text:"Gelişmiş"}),this.advancedClose,this.logoutButton);
 private readonly advancedKatmani:Katman;
 readonly attachments=h("div",{class:"chat-attachments"});readonly cancelButton=h("button",{class:"text-button",text:"Durdur"});
 readonly responseButton?:HTMLButtonElement;readonly responses?:SolSpeech;private responseAllowed=false;
 readonly voicePicker?:VoicePicker;
 readonly voiceHelpButton=h("button",{class:"text-button",hidden:true});private canOpenVoiceSettings=false;
 readonly micButton?:HTMLButtonElement;readonly voiceHint=h("p",{class:"chat-status",hidden:true});
 readonly voice?:VoiceController;readonly notifications?:VoiceService;private statusTicket=0;private ready=false;private loginPending=false;private active=true;
 readonly details=h("div",{class:"chat-details"});
 readonly detailsToggle=h("button",{class:"text-button chat-details-toggle","aria-label":"Ayrıntıları göster","aria-expanded":"false",text:"˅"});
 readonly modelStatus=h("p",{class:"chat-status chat-model-status",text:"GPT-5.6 Sol · Hazır değil"});
 readonly healthCards=h("div",{class:"chat-health",role:"group","aria-label":"Durum"});
 private detailsOpen=false;
 private syncDetails(){
  this.details.hidden=!this.detailsOpen;
  this.detailsToggle.textContent=this.detailsOpen?"˄":"˅";
  this.detailsToggle.setAttribute("aria-label",this.detailsOpen?"Ayrıntıları gizle":"Ayrıntıları göster");
  this.detailsToggle.setAttribute("aria-expanded",String(this.detailsOpen));
 }
 private blur=()=>{if(this.voiceLogin&&this.loginPending)return;void this.suspend();};
  constructor(private actions:ChatActions,legacyContextOrVoice?:VoiceActions|(()=>string),suppliedVoice?:VoiceActions){
   // Legacy callers may still supply context; it is never executed or sent.
   const voiceActions=typeof legacyContextOrVoice==="function"?suppliedVoice:legacyContextOrVoice;
   try{this.detailsOpen=localStorage.getItem("afu-chat-details-v1")==="open";}catch{}
   const attach=h("button",{class:"text-button chat-attach","aria-label":"Dosya ekle"},m12svg("M21 11l-9 9a6 6 0 0 1-9-9l10-10a4 4 0 0 1 6 6L9 17a2 2 0 0 1-3-3l9-9",18,{stroke:2}));
   attach.addEventListener("click",()=>{this.message.textContent="Dosyanı Afu kartına sürükleyerek ekle.";});
   const mic=h("button",{class:"text-button","aria-label":"Sesli sohbeti başlat"},m12svg("M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8",18,{stroke:2}));
   mic.addEventListener("click",()=>this.mainVoiceBtn.click());
   this.loginButton.textContent="Codex'e giriş yap";
   this.cancelButton.prepend?.(m12svg("M5 5h14v14H5z"));
   this.sendButton.prepend?.(m12svg("M22 2L9 15M22 2l-7 20-6-7-7-6z",18,{stroke:2}));
   this.details.append(this.message,this.attachments,h("div",{class:"chat-compose"},this.input,h("div",{class:"chat-input-icons"},attach,mic)),h("div",{class:"chat-actions"},this.loginButton,this.cancelButton,this.sendButton),this.healthCards,this.modelStatus,this.advancedMenu,this.conversationList);
   this.element=h("div",{class:"chat-panel m12-chat"},h("div",{class:"chat-intro"},h("div",{class:"chat-mascot"},h("img",{src:"/afu/front.png",alt:"Afu"}),this.conversationStatus),h("div",{class:"chat-assistant"},h("h1",{text:"Asistan"}),this.answer,this.fallback,this.mainVoiceBtn,this.endVoiceBtn)),this.details,this.detailsToggle);
   this.detailsToggle.addEventListener("click",()=>{this.detailsOpen=!this.detailsOpen;try{localStorage.setItem("afu-chat-details-v1",this.detailsOpen?"open":"closed");}catch{}this.syncDetails();});
   this.syncDetails();
   this.sendButton.addEventListener("click",()=>{void this.send();});this.input.addEventListener("input",()=>this.render());
   this.input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!this.sendButton.disabled)void this.send();}});
   this.loginButton.addEventListener("click",()=>{void this.login();});this.cancelButton.addEventListener("click",()=>{void this.cancel();});
   this.logoutButton.addEventListener("click",()=>{void this.logout();});
   this.advancedKatmani=new Katman(this.advancedMenu,()=>this.closeAdvanced());
   this.advancedMenu.addEventListener("toggle",()=>this.syncAdvanced());

   this.mainVoiceBtn.addEventListener("click",()=>{void this.toggleConversation().catch(()=>{this.message.textContent="Sesli sohbet başlatılamadı; yeniden dene.";this.render();});});
   this.endVoiceBtn.addEventListener("click",()=>{void this.stopConversation();});
  if(voiceActions?.voiceListenTurn){
   this.conversation=new SurekliSohbet(voiceActions,{send:text=>this.sendVoiceTurn(text)},()=>{
    if(this.conversation?.message)this.message.textContent=this.conversation.message;
    this.render();
   });
  }
  if(voiceActions){this.canOpenVoiceSettings=!!voiceActions.voiceOpenSettings;this.voiceHelpButton.addEventListener("click",()=>{const help=this.conversation?.help??this.voice?.help;if(!help||!this.active||!voiceActions.voiceOpenSettings)return;void voiceActions.voiceOpenSettings(help.kind).catch(()=>{if(this.active&&(this.conversation?.help??this.voice?.help)===help)this.message.textContent="Ayarlar açılamadı; yeniden dene.";});});this.details.append(this.voiceHelpButton);this.voice=new VoiceController(voiceActions,()=>{if(this.voice?.transcript)this.input.value=this.voice.transcript;if(this.voice?.message)this.message.textContent=this.voice.message;if(this.voice?.state!=="listening")this.voiceHint.hidden=true;this.render();},async()=>{
    this.voiceHint.hidden=true;const speech=this.responses?.cancel(false);const silence=voiceActions.voiceSilence();await speech;await silence;
    if(this.model.busy){await this.actions.codexCancel();this.model.cancelled();}
   });
   this.notifications=new VoiceService(voiceActions);
   this.responses=new SolSpeech(voiceActions,()=>{if(this.responses?.message)this.message.textContent="Afu sesi açılamadı; yanıtı yazıyla gösteriyorum.";this.render();});
   const mic=h("button",{class:"text-button",text:"Bas ve konuş",hidden:true});this.micButton=mic;
   const canRecord=()=>this.active&&this.ready&&!mic.disabled;
   mic.addEventListener("pointerdown",()=>{if(canRecord())void this.voice?.press();});
   mic.addEventListener("pointerup",()=>{void this.voice?.release();});
   mic.addEventListener("keydown",e=>{if((e.key===" "||e.key==="Enter")&&!e.repeat){e.preventDefault();if(canRecord())void this.voice?.press();}});
   mic.addEventListener("keyup",()=>{void this.voice?.release();});
   this.details.append(this.voiceHint);
   this.responseButton=h("button",{class:"text-button",text:"Sesli yanıt kapalı",role:"switch","aria-checked":"false"});
   this.responseButton.addEventListener("click",()=>{
    const r=this.responses!;
    r.enabled=!r.enabled;this.render();if(!r.enabled)void r.cancel().catch(()=>{this.message.textContent="Ses durdurulamadı; yeniden dene.";});
   });
   const newChatBtn=h("button",{class:"text-button",text:"Yeni sohbet"});
   newChatBtn.addEventListener("click",()=>{void this.actions.codexNewChat?.().then(()=>{this.message.textContent="Yeni sohbet açıldı.";void this.clearSession();});});
   this.advancedMenu.append(h("p",{class:"chat-status",text:"Model: GPT-5.6 Sol"}), this.responseButton, newChatBtn);
   void voiceActions.voiceSupported?.().then(s=>{mic.disabled=!s.whisper;this.responseButton!.disabled=!(s.tts||s.afu_tts);if(!s.whisper&&!s.winrt_stt)this.message.textContent="Konuşma tanıma hazır değil; mesajını yazarak gönder.";}).catch(()=>{this.responseButton!.disabled=true;});
  }
  if(typeof window!=="undefined")window.addEventListener("blur",this.blur);this.render();
 }
  async refresh(){const ticket=++this.statusTicket;try{const raw=await this.actions.codexStatus();if(ticket!==this.statusTicket||!this.active)return;const status=typeof raw==="string"?raw:raw.status;this.ready=(status==="hazir"||status==="bagli")&&(typeof raw==="string"||raw.loggedIn!==false);
   if(typeof raw==="object"&&raw.accountId&&this.accountId&&this.accountId!==raw.accountId)await this.clearSession();
   if(typeof raw==="object")this.accountId=raw.accountId??null;
   this.accountStatus.textContent=this.ready?"🔐 Codex hesabı: bağlı":"Codex: giriş yapılmadı";
   let limitMessage = "";
   if (this.ready && typeof raw === "object" && raw.rateLimits) {
    const primary = raw.rateLimits.primary;
    if (primary && primary.usedPercent >= 100 && primary.resetsAt) {
     const date = new Date(primary.resetsAt * 1000);
     const timeStr = date.toLocaleTimeString("tr-TR", {hour:"2-digit", minute:"2-digit"});
     limitMessage = `GPT bugünlük doldu; ${timeStr}'de açılır.`;
     this.ready = false;
    }
   }
   this.message.textContent=limitMessage ? limitMessage : this.ready?(status==="hazir"?"GPT-5.6 Sol: hazır":"Codex: bağlı"):status==="oturum_yok"?"Codex hesabına giriş yap.":"GPT-5.6 Sol'a bağlanılamadı.";
   if(this.ready){this.clearLoginPoll();this.loginPending=false;if(this.voiceLogin){this.voiceLogin=false;void this.conversation?.baslat();}}}catch(err){if(ticket!==this.statusTicket||!this.active)return;this.ready=false;const reason=err instanceof Error?err.message:String(err);if(reason==="Codex kurulu değil."){this.message.textContent="";this.message.append(document.createTextNode("Codex kurulu değil. "),(() => {const b=h("button",{class:"text-button",text:"Kurmak için dokun.",style:"padding:0;text-decoration:underline;background:transparent;color:inherit;font:inherit;"});b.addEventListener("click",()=>{void this.actions.codexInstall?.();});return b;})());}else{this.message.textContent=solError(err);}}this.render();}
 attach(paths:string[]){if(!this.ready){this.message.textContent="Codex oturumu açık değil; dosya eklenemez.";this.render();return;}this.model.attach(paths);this.message.textContent=paths.length===1?"Dosya sohbete eklendi.":"Dosyalar sohbete eklendi.";this.render();}
 onEvent(e:{method:string;params:unknown}){
  const wasBusy=this.model.busy;
  const completed=this.model.append(e.method,e.params);
  if(wasBusy&&!this.model.busy&&this.pendingReply){
   const pending=this.pendingReply;this.pendingReply=null;
   if(completed&&!this.model.error){this.addHistory("Afu",this.model.text);pending.resolve(speechText(this.model.text));}
   else pending.reject(new Error("Chat failed"));
  }else if(completed&&this.responseAllowed&&this.active){this.responseAllowed=false;void this.responses?.speak(speechText(this.model.text));}
  if(e.method==="account/login/completed"){this.loginPending=false;void this.refresh();}this.render();
 }
 private addHistory(who:string,text:string){
  this.history.push(`${who}: ${text}`);this.history=this.history.slice(-40);
  this.conversationList.textContent=this.history.join("\n\n");
 }
 private async toggleConversation(){
  if(!this.active||this.voiceStopping)return;
  if(this.voiceLogin){this.voiceLogin=false;await this.stopConversation();return;}
  if(this.conversation?.active){await this.stopConversation();}
  if(this.model.busy){await this.actions.codexCancel();this.model.cancelled();}
  if(!this.ready){this.voiceLogin=true;await this.login();if(!this.loginPending)this.voiceLogin=false;this.render();return;}
  if(!this.conversation){this.message.textContent="Sesli sohbet hazır değil; yazarak devam et.";return;}
  await this.voice?.cancel();await this.responses?.cancel();
  if(!this.voiceOrientationShown){this.voiceOrientationShown=true;this.message.textContent="Konuşman bitince Afu yanıtlar; bitirmek için Bitir'e dokun.";}
  void this.conversation.baslat();
 }
 private async sendVoiceTurn(text:string):Promise<string>{
  if(!this.active||!this.ready||this.model.busy)throw new Error("Chat unavailable");
  this.input.value=text;
  this.addHistory("Sen",text);
  const reply=new Promise<string>((resolve,reject)=>{this.pendingReply={resolve,reject};});
  // Attach the failure handler before codexSend can reject or complete synchronously.
  const sending=this.send(true).then(()=>{
   if(this.model.error&&this.pendingReply){const p=this.pendingReply;this.pendingReply=null;p.reject(new Error(this.model.error));}
  });
  const answer=await reply;await sending;return answer;
 }
 private async stopConversation(){
  if(!this.conversation?.active&&!this.pendingReply)return;
  this.voiceStopping=true;this.render();
  const stopping=this.conversation?.bitir();
  if(this.pendingReply){const pending=this.pendingReply;this.pendingReply=null;pending.reject(new Error("Cancelled"));
   await this.actions.codexCancel().catch(()=>{});
   this.model.cancelled();
  }
  await stopping;this.voiceStopping=false;this.render();
 }
 /** "Afu'ya sor" ekranından gelen soruyu bu sohbete yazıp gönderir. */
 async ask(text:string){if(!this.active)return;this.input.value=text;await this.refresh();await this.send();}
 private async send(fromVoice=false){if(!this.ready||this.model.busy||!this.active)return;const draft=this.input.value;const next=this.model.send(draft);if(!next)return;this.responseAllowed=!fromVoice;void this.responses?.cancel().catch(()=>{this.message.textContent="Ses durdurulamadı; yeniden dene.";});this.render();try {await this.actions.codexSend(next.text,next.attachments);this.model.accepted(next);if(this.input.value===draft)this.input.value="";}catch(error){this.model.failed(error);}this.render();}
 private async clearSession(){
  this.responseAllowed=false;this.clearLoginPoll();await this.stopConversation();
  await this.voice?.cancel();await this.responses?.cancel(false);await this.notifications?.silence();
  this.model.cancelled();this.model.text="";this.model.attachments=[];this.model.outbox=[];
  this.history=[];this.answer.textContent="";this.conversationList.textContent="";this.input.value="";
 }
 private async logout(){
  this.ready=false;await this.clearSession();
  try{await this.actions.codexLogout?.();this.accountId=null;this.message.textContent="Codex hesabına giriş yap.";this.accountStatus.textContent="Codex: giriş yapılmadı";}
  catch(error){this.message.textContent=solError(error);}this.render();
 }
 private async login(){if(this.loginPending)return;this.loginPending=true;this.message.textContent="Açılan sayfada hesabını bağla.";this.render();try{await this.actions.codexLogin();let c=0;this.loginPoll=setInterval(()=>{if(!this.loginPending||!this.active||++c>36){this.clearLoginPoll();this.loginPending=false;this.voiceLogin=false;this.render();return;}void this.refresh();},5000);}catch{this.loginPending=false;this.message.textContent="Giriş başlatılamadı; yeniden dene.";}this.render();}
 private async cancel(){this.voiceLogin=false;this.responseAllowed=false;void this.suspend();try{if(this.loginPending){await this.actions.codexLoginCancel();this.loginPending=false;}else if(this.model.busy){await this.actions.codexCancel();}await this.voice?.cancel();}catch{this.message.textContent="İşlem durdurulamadı; yeniden dene.";}this.render();}
 onVoiceState:((state:"idle"|"listening"|"thinking"|"working"|"speaking")=>void)|null=null;
/** Q2: katman açıldıysa odak içeri girer, kapanınca başlığa döner. */
  private syncAdvanced(){if(this.advancedMenu.hidden||this.advancedMenu.open===false)this.advancedKatmani.kapandı();else this.advancedKatmani.ac({ignore:[this.advancedMenu.querySelector("summary")],ilk:this.advancedClose,acan:this.advancedMenu.querySelector("summary")});}
 closeAdvanced(){this.advancedMenu.open=false;this.advancedKatmani.kapandı();}
 private render(){
  const live=this.conversation?.active??false;
  this.modelStatus.textContent=`GPT-5.6 Sol · ${this.ready?"Hazır":"Hazır değil"}`;
  const help=this.conversation?.help??this.voice?.help;
  this.voiceHelpButton.hidden=!this.active||!help||!this.canOpenVoiceSettings;this.voiceHelpButton.textContent=help?.label??"";
  if(this.responseButton&&this.responses){this.responseButton.textContent=`Sesli yanıt ${this.responses.enabled?"açık":"kapalı"}`;this.responseButton.setAttribute("aria-checked",String(this.responses.enabled));}
  this.onVoiceState?.(live?this.conversation!.state:this.voice?.state!==undefined&&this.voice.state!=="idle"?this.voice.state:this.responses?.speaking?"speaking":this.model.busy?"working":"idle");
  this.answer.textContent=this.model.text;this.fallback.hidden=!!this.model.text;this.answer.hidden=!this.model.text;this.answer.title="";
  if(this.model.error)this.message.textContent=this.model.error;
  this.sendButton.className="primary-button";
  this.sendButton.disabled=live||!this.ready||this.model.busy||(!this.input.value?.trim()&&!this.model.attachments.length);
  this.loginButton.hidden=this.ready || this.message.textContent?.includes("doldu")===true;
  this.advancedMenu.hidden=false;
  this.cancelButton.hidden=live||(!this.model.busy&&!this.loginPending&&!this.voice?.active&&!this.responses?.speaking);
  if(this.micButton) this.micButton.hidden=true;
  if(this.voicePicker) this.voicePicker.element.hidden=true;
  this.input.hidden = live;
  this.mainVoiceBtn.hidden = live;
  this.endVoiceBtn.hidden = !live;
  this.conversationStatus.textContent=live?({listening:"Dinliyor",thinking:"GPT-5.6 Sol düşünüyor",speaking:"Afu konuşuyor",idle:"Bekliyor",working:"Yazıya çeviriyor"}[this.conversation!.state]||"Bekliyor"):this.model.busy?"GPT-5.6 Sol düşünüyor":this.responses?.speaking?"Afu konuşuyor":"Bekliyor";
  this.conversationStatus.prepend?.(m12svg("M3 10v4M7 6v12M12 2v20M17 6v12M21 10v4",14,{stroke:2}));
 }
 async suspend(){this.voiceLogin=false;const conversation=this.stopConversation();this.closeAdvanced();this.responseAllowed=false;this.voicePicker?.hide();const speech=this.responses?.cancel().catch(()=>{this.message.textContent="Ses durdurulamadı; yeniden dene.";});await this.voice?.cancel();await speech;await conversation;}
 private clearLoginPoll(){if(this.loginPoll!==null){clearInterval(this.loginPoll);this.loginPoll=null;}}
 async detach(){this.clearLoginPoll();this.loginPending=false;this.active=false;this.voicePicker?.detach();this.statusTicket++;if(typeof window!=="undefined")window.removeEventListener("blur",this.blur);await this.suspend();await this.notifications?.silence();}
}









function m12svg(path:string,size=18,opts:{stroke?:number}={}){return h("span",{class:"m12-icon","aria-hidden":"true",html:`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${opts.stroke?"none":"currentColor"}" stroke="currentColor" stroke-width="${opts.stroke??0}"><path d="${path}"/></svg>`});}
