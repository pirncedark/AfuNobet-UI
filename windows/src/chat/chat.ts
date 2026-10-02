import { h } from "../views/dom";
import { shortName } from "./context";
import { VoiceController, VoiceService, ResponseSpeech, type VoiceActions } from "./voice";
import "../chat.css";
let windowsOrientationShown=false;
export interface Attachment { name:string; path:string }
export interface Outgoing { text:string; attachments:string[] }
function record(v:unknown):Record<string,unknown>{return v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};}
export class ChatModel {
 text=""; busy=false; error="";attachments:Attachment[]=[];outbox:Outgoing[]=[];
 private thread="";private turn="";private closed=new Set<string>();
 attach(paths:string[]){ for(const path of paths.slice(0,8)){if(typeof path!=="string"||path.length>4096||/[\x00-\x1f]/.test(path))continue;const name=shortName(path);if(name&&this.attachments.length<8&&!this.attachments.some(a=>a.path===path))this.attachments.push({name,path});} }
 remove(index:number){this.attachments.splice(index,1);}
 send(text:string):Outgoing|null {if(this.busy||(!text.trim()&&!this.attachments.length))return null;const next={text:text.trim().slice(0,8000),attachments:this.attachments.map(a=>a.path)};this.outbox.push(next);if(this.outbox.length>20)this.outbox.shift();this.busy=true;this.text="";this.error="";return next;}
 accepted(sent:Outgoing){this.attachments=this.attachments.filter(a=>!sent.attachments.includes(a.path));}
 failed(){this.busy=false;this.error="Mesaj gönderilemedi; yeniden dene.";}
 append(method:string,params:unknown):boolean{
  const p=record(params),turnObj=record(p.turn);const thread=typeof p.threadId==="string"?p.threadId:"";const turn=typeof p.turnId==="string"?p.turnId:typeof turnObj.id==="string"?turnObj.id:"";
  if(method==="turn/started") {if(this.busy&&this.turn)return false;if(turn&&this.closed.has(turn))return false;this.thread=thread;this.turn=turn;this.busy=true;this.text="";this.error="";return false;}
  if(!this.busy || (this.thread&&thread!==this.thread)||(this.turn&&turn!==this.turn))return false;
  if(method==="item/agentMessage/delta" && typeof p.delta==="string"){this.text=(this.text+p.delta).slice(0,32000);this.error="";}
  if(method==="error" && p.willRetry===true){this.error="Yanıt hazırlanıyor; biraz bekle.";return false;}
  if(method==="turn/completed"||method==="error") {if(method==="error" || turnObj.status==="failed")this.error="Yanıt tamamlanamadı; yeniden dene.";this.busy=false;if(this.turn)this.closed.add(this.turn);if(this.closed.size>64)this.closed.delete(this.closed.values().next().value!);const correlated=!!this.thread&&!!this.turn&&this.thread===thread&&this.turn===turn;this.turn="";return method==="turn/completed"&&turnObj.status==="completed"&&correlated;}
  return false;
 }
}
export interface ChatActions {
 codexStatus():Promise<string|{status:string}>;codexSend(text:string,attachments:string[]):Promise<unknown>;
 codexCancel():Promise<unknown>;codexLogin():Promise<unknown>;codexLoginCancel():Promise<unknown>;
}
export class ChatView {
 readonly model=new ChatModel();readonly element:HTMLElement;
 readonly input=h("textarea",{class:"chat-input","aria-label":"Mesaj",placeholder:"Nasıl yardımcı olayım?",rows:3,maxlength:8000});
 readonly answer=h("p",{class:"chat-answer","aria-live":"polite"});readonly message=h("p",{class:"chat-status","aria-live":"polite"});
 readonly sendButton=h("button",{class:"primary-button",text:"Gönder"});readonly loginButton=h("button",{class:"text-button",text:"Oturum aç"});
 readonly attachments=h("div",{class:"chat-attachments"});readonly cancelButton=h("button",{class:"text-button",text:"Durdur"});
 readonly responseButton?:HTMLButtonElement;readonly responses?:ResponseSpeech;private responseAllowed=false;
 readonly voiceHelpButton=h("button",{class:"text-button",hidden:true});private canOpenVoiceSettings=false;
 readonly micButton?:HTMLButtonElement;readonly voiceHint=h("p",{class:"chat-status",hidden:true});private windowsRecognition=false;
 readonly voice?:VoiceController;readonly notifications?:VoiceService;private statusTicket=0;private ready=false;private loginPending=false;private active=true;
 private blur=()=>{void this.suspend();};
 constructor(private actions:ChatActions,private context:()=>string=()=>"",voiceActions?:VoiceActions){
  this.element=h("div",{class:"chat-panel"},h("h1",{text:"Asistan"}),this.message,this.answer,this.attachments,this.input,h("div",{class:"chat-actions"},this.loginButton,this.cancelButton,this.sendButton));
  this.sendButton.addEventListener("click",()=>{void this.send();});this.input.addEventListener("input",()=>this.render());
  this.input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!this.sendButton.disabled)void this.send();}});
  this.loginButton.addEventListener("click",()=>{void this.login();});this.cancelButton.addEventListener("click",()=>{void this.cancel();});
  if(voiceActions){this.canOpenVoiceSettings=!!voiceActions.voiceOpenSettings;this.voiceHelpButton.addEventListener("click",()=>{const help=this.voice?.help;if(!help||!this.active||!voiceActions.voiceOpenSettings)return;void voiceActions.voiceOpenSettings(help.kind).catch(()=>{if(this.active&&this.voice?.help===help)this.message.textContent="Ayarlar açılamadı; yeniden dene.";});});this.element.append(this.voiceHelpButton);this.voice=new VoiceController(voiceActions,()=>{if(this.voice?.transcript)this.input.value=this.voice.transcript;if(this.voice?.message)this.message.textContent=this.voice.message;this.render();},async()=>{if(this.windowsRecognition&&!windowsOrientationShown){windowsOrientationShown=true;this.voiceHint.textContent="Windows konuşma tanıma internet kullanır.";this.voiceHint.hidden=false;}else this.voiceHint.hidden=true;const response=this.responses?.cancel(false);const silence=voiceActions.voiceSilence();await response;await silence;});this.notifications=new VoiceService(voiceActions);this.responses=new ResponseSpeech(voiceActions,()=>{if(this.responses?.message)this.message.textContent=this.responses.message;this.render();});
   const mic=h("button",{class:"text-button",text:"Bas ve konuş","aria-label":"Basılı tutarak konuş"});this.micButton=mic;mic.disabled=true;
   mic.addEventListener("pointerdown",e=>{mic.setPointerCapture?.(e.pointerId);void this.voice?.press();});mic.addEventListener("pointerup",()=>{void this.voice?.release();});mic.addEventListener("pointercancel",()=>{void this.voice?.cancel();});
   mic.addEventListener("keydown",e=>{if((e.key===" "||e.key==="Enter")&&!e.repeat){e.preventDefault();void this.voice?.press();}});mic.addEventListener("keyup",e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();void this.voice?.release();}});
   mic.addEventListener("blur",this.blur);this.element.append(mic,this.voiceHint);
   const tts=h("button",{class:"text-button",text:"Sesli bildirim kapalı",role:"switch","aria-checked":"false"});tts.addEventListener("click",()=>{const n=this.notifications!;n.enabled=!n.enabled;tts.textContent=`Sesli bildirim ${n.enabled?"açık":"kapalı"}`;tts.setAttribute("aria-checked",String(n.enabled));if(!n.enabled)void n.silence().catch(()=>{this.message.textContent="Ses durdurulamadı; yeniden dene.";});});this.element.append(tts);
   this.responseButton=h("button",{class:"text-button",text:"Sesli yanıt kapalı",role:"switch","aria-checked":"false"});
   this.responseButton.addEventListener("click",()=>{const r=this.responses!;r.enabled=!r.enabled;this.responseButton!.textContent=`Sesli yanıt ${r.enabled?"açık":"kapalı"}`;this.responseButton!.setAttribute("aria-checked",String(r.enabled));if(!r.enabled)void r.cancel().catch(()=>{this.message.textContent="Ses durdurulamadı; yeniden dene.";});});this.element.append(this.responseButton);
   void voiceActions.voiceSupported().then(s=>{this.windowsRecognition=!s.whisper&&s.winrt_stt;mic.disabled=!(s.whisper||s.winrt_stt);tts.disabled=!s.tts;this.responseButton!.disabled=!s.tts;if(!s.whisper&&!s.winrt_stt)this.message.textContent="Konuşma tanıma hazır değil; mesajını yazarak gönder.";}).catch(()=>{mic.disabled=true;tts.disabled=true;this.responseButton!.disabled=true;});
  }
  if(typeof window!=="undefined")window.addEventListener("blur",this.blur);this.render();
 }
 async refresh(){const ticket=++this.statusTicket;try{const raw=await this.actions.codexStatus();if(ticket!==this.statusTicket||!this.active)return;const status=typeof raw==="string"?raw:raw.status;this.ready=status==="hazir";this.message.textContent=this.ready?"Mesajını yazıp Gönder’e bas.":status==="oturum_yok"?"Codex oturumu açık değil.":"Codex hazır değil; yeniden kontrol et.";}catch{if(ticket!==this.statusTicket||!this.active)return;this.ready=false;this.message.textContent="Asistana bağlanılamadı; yeniden dene.";}this.render();}
 attach(paths:string[]){this.model.attach(paths);this.message.textContent=paths.length===1?"Dosya sohbete eklendi.":"Dosyalar sohbete eklendi.";this.render();}
 onEvent(e:{method:string;params:unknown}){const completed=this.model.append(e.method,e.params);if(completed&&this.responseAllowed&&this.active){this.responseAllowed=false;void this.responses?.speak(this.model.text);}if(e.method==="account/login/completed"){this.loginPending=false;void this.refresh();}this.render();}
 private async send(){if(!this.ready||this.model.busy||!this.active)return;const draft=this.input.value;const next=this.model.send(draft);if(!next)return;this.responseAllowed=true;void this.responses?.cancel().catch(()=>{this.message.textContent="Ses durdurulamadı; yeniden dene.";});const ctx=this.context().slice(0,1500);this.render();try {await this.actions.codexSend(ctx?`${ctx}\n\n${next.text}`:next.text,next.attachments);this.model.accepted(next);if(this.input.value===draft)this.input.value="";}catch{this.model.failed();}this.render();}
 private async login(){if(this.loginPending)return;this.loginPending=true;this.message.textContent="Açılan sayfada hesabını bağla.";this.render();try{await this.actions.codexLogin();}catch{this.loginPending=false;this.message.textContent="Giriş başlatılamadı; yeniden dene.";}this.render();}
 private async cancel(){this.responseAllowed=false;void this.suspend();try{if(this.loginPending){await this.actions.codexLoginCancel();this.loginPending=false;}else if(this.model.busy){await this.actions.codexCancel();}await this.voice?.cancel();}catch{this.message.textContent="İşlem durdurulamadı; yeniden dene.";}this.render();}
 onVoiceState:((state:"idle"|"listening"|"thinking"|"working"|"speaking")=>void)|null=null;
 private render(){const help=this.voice?.help;this.voiceHelpButton.hidden=!this.active||!help||!this.canOpenVoiceSettings;this.voiceHelpButton.textContent=help?.label??"";if(this.responseButton&&this.responses){this.responseButton.textContent=`Sesli yanıt ${this.responses.enabled?"açık":"kapalı"}`;this.responseButton.setAttribute("aria-checked",String(this.responses.enabled));}this.onVoiceState?.(this.voice?.state!==undefined&&this.voice.state!=="idle"?this.voice.state:this.responses?.speaking?"speaking":this.model.busy?"working":"idle");this.answer.textContent=this.model.text;if(this.model.error)this.message.textContent=this.model.error;this.sendButton.disabled=!this.ready||this.model.busy||(!this.input.value?.trim()&&!this.model.attachments.length);this.loginButton.hidden=this.ready;this.loginButton.disabled=this.loginPending;this.cancelButton.hidden=!this.model.busy&&!this.loginPending;this.attachments.replaceChildren(...this.model.attachments.map((a,i)=>h("button",{class:"chat-attachment",text:`${a.name} ×`,"aria-label":`${a.name} ekini kaldır`,onclick:()=>{this.model.remove(i);this.render();}})));}
 async suspend(){this.responseAllowed=false;const speech=this.responses?.cancel().catch(()=>{this.message.textContent="Ses durdurulamadı; yeniden dene.";});await this.voice?.cancel();await speech;}
 async detach(){this.active=false;this.statusTicket++;if(typeof window!=="undefined")window.removeEventListener("blur",this.blur);await this.suspend();await this.notifications?.silence();}
}










