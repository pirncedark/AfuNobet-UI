import { State } from "../core/state";
import type { AfuEvent } from "../core/events";
export type VoiceSettingsKind="speech"|"microphone"|"network";
export interface VoiceHelp {kind:VoiceSettingsKind;label:string}
export interface VoiceActions {
 voiceResponse?(text:string):Promise<{warning:string|null}>;
 voiceWarning?(handler:()=>void):Promise<()=>void>;
 voiceChoices?():Promise<VoiceChoice>;
 voiceChoose?(ses:string,filtre:string):Promise<VoiceChoice>;
 voiceOpenSettings?(kind:VoiceSettingsKind):Promise<unknown>;
 voiceListenTurn?(maxMs:number): Promise<string>;
 voiceStart(): Promise<unknown>; voiceStop(): Promise<string>; voiceCancel(): Promise<unknown>;
 voiceSpeak(text:string): Promise<unknown>; voiceSilence(): Promise<unknown>;
 voiceSupported(): Promise<{whisper:boolean;winrt_stt:boolean;tts:boolean;afu_tts?:boolean}>;
}
/** Yalnız bilinen kullanıcı cümleleri aktarılır; teknik hata ayrıntısı gösterilmez. */
export function voiceErrorMessage(error:unknown,phase:"start"|"stop"):string {
 const reason=error instanceof Error?error.message:typeof error==="string"?error:"";
 const known:Record<string,string>={
  "Windows konuşma tanıma hazır değil; mesajını yazarak gönder.":"Windows konuşma tanıma hazır değil; mesajını yazarak gönder.",
  "Windows konuşma tanıma izni kapalı; Windows ayarlarından açıp tekrar dene.":"Windows konuşma tanıma izni kapalı; Windows ayarlarından açıp tekrar dene.",
  "Windows konuşma tanıma internete bağlanamadı; bağlantını kontrol edip tekrar dene.":"Windows konuşma tanıma internete bağlanamadı; bağlantını kontrol edip tekrar dene.",
  "Mikrofon açılamadı, mikrofon iznini kontrol edip tekrar dene.":"Mikrofon açılamadı; mikrofon iznini kontrol edip tekrar dene.",
  "Ses işlemi sürüyor, bitmesini bekle.":"Ses işlemi sürüyor; bitmesini bekle.",
  "Ses anlaşılamadı, tekrar dene.":"Ses anlaşılamadı; tekrar konuş veya yazarak devam et.",
  "Ses modeli yüklenemedi.":"Ses modeli hazır değil; yazarak devam et.",
  "Ses modeli bulunamadı, mesajını yazarak gönder.":"Ses modeli hazır değil; yazarak devam et.",
  "model":"Ses modeli hazır değil; yazarak devam et."
 };
 return known[reason]??(phase==="start"?"Mikrofon açılamadı; yazarak devam et.":"Ses çözümlenemedi; yazarak devam et.");
}
export interface VoiceChoice {ses:string;filtre:string;chosen:boolean;available:string[]}
export function voiceHelp(error:unknown):VoiceHelp|null {
 const reason=error instanceof Error?error.message:typeof error==="string"?error:"";
 if(reason==="Windows konuşma tanıma izni kapalı; Windows ayarlarından açıp tekrar dene.")return {kind:"speech",label:"İzni aç"};
 if(reason==="Mikrofon açılamadı, mikrofon iznini kontrol edip tekrar dene.")return {kind:"microphone",label:"İzni aç"};
 if(reason==="Windows konuşma tanıma internete bağlanamadı; bağlantını kontrol edip tekrar dene.")return {kind:"network",label:"Bağlantıyı kontrol et"};
 return null;
}
/** Tek kayıt; bırakma ve iptal başlatmanın tamamlanmasını bekler. */
export class VoiceController {
 help:VoiceHelp|null=null;micOpen=false; message=""; transcript=""; state: "idle"|"listening"|"thinking"="idle";
 private starting:Promise<void>|null=null; private ending:Promise<void>|null=null;
 get active(){return !!this.starting||!!this.ending||!!this.cancelling||this.micOpen||this.state!=="idle";}
 private cancelling:Promise<void>|null=null; private generation=0; private recordOpen=false;
 constructor(private actions:VoiceActions, private changed:()=>void=()=>{},private beforeStart?:()=>Promise<void>) {}
 async press() {
  if(this.starting||this.ending||this.cancelling||this.micOpen)return;
  const ticket=++this.generation;const hadHelp=!!this.help;this.help=null;this.message="";this.transcript="";if(hadHelp)this.changed();
  this.starting=(async()=>{
   try{if(this.beforeStart){await this.beforeStart();if(ticket!==this.generation)return;}await this.actions.voiceStart();this.recordOpen=true;if(ticket!==this.generation)return;this.micOpen=true;this.state="listening";}
   catch(error){if(ticket!==this.generation)return;this.message=voiceErrorMessage(error,"start");this.help=voiceHelp(error);}
   this.changed();
  })();
  await this.starting;this.starting=null;
 }
 async release() {
  if(this.ending)return this.ending;
  if(this.cancelling||(!this.starting&&!this.micOpen))return;
  const ticket=this.generation;
  this.ending=(async()=>{
   await this.starting;if(ticket!==this.generation||!this.micOpen)return;
   this.micOpen=false;this.recordOpen=false;this.state="thinking";this.changed();
   try{const result=await this.actions.voiceStop();if(ticket!==this.generation)return;this.transcript=result.slice(0,8000);this.message=this.transcript?"Metni kontrol edip Gönder’e bas.":"Ses anlaşılamadı; yazarak devam et.";}
   catch(error){if(ticket!==this.generation)return;this.message=voiceErrorMessage(error,"stop");this.help=voiceHelp(error);}
   finally{if(ticket===this.generation){this.state="idle";this.changed();}}
  })();
  await this.ending;this.ending=null;
 }
 async cancel() {
  if(this.cancelling)return this.cancelling;
  const ticket=++this.generation,starting=this.starting,ending=this.ending;
  this.message="";this.transcript="";const hadHelp=!!this.help;this.help=null;if(hadHelp)this.changed();
  this.cancelling=(async()=>{
   const stopBackend=async()=>{try{await this.actions.voiceCancel();}catch{if(ticket===this.generation)this.message="Mikrofon kapatılamadı; uygulamayı yeniden aç.";}};
   // Başlangıç sürerken native nesil iptalini bekletme; geç açılan kayıt ayrıca temizlenir.
   const immediate=starting||this.recordOpen||ending?stopBackend():Promise.resolve();
   await starting;await immediate;
   if(starting&&this.recordOpen)await stopBackend();
   this.recordOpen=false;this.micOpen=false;await ending;
   if(ticket===this.generation){this.transcript="";this.state="idle";this.changed();}
  })();
  await this.cancelling;this.cancelling=null;
 }
}
export function announcement(e:AfuEvent):string|null {
 if(e.agent==="claude")return e.kind==="JOB_FINISHED"?"Claude işini bitirdi.":e.kind==="WAITING"?"Claude onayını bekliyor.":e.kind==="RATE_LIMIT"?"Claude kota bekliyor.":e.kind==="JOB_FAILED"?"Claude işi tamamlayamadı.":null;
 const name=e.agent==="codex"?"Codex":e.agent==="opencode"?"OpenCode":e.agent==="gemini"?"Gemini":e.agent==="glm"?"GLM":null;
 if (!name)return null;
 return e.kind==="JOB_FINISHED"?`${name} görevi tamamladı.`:e.kind==="RATE_LIMIT"?`${name} kota bekliyor.`:e.kind==="JOB_FAILED"?`${name} görevi hata verdi.`:null;
}
export class VoiceService {
 enabled=false; private seen=new Set<string>();private last=-Infinity;
 constructor(private actions:VoiceActions) {}
 async announce(e:AfuEvent,allowed:boolean,now=Date.now()) {
  const text=announcement(e),key=`${e.kind}:${e.taskId}`;
  if(!this.enabled||!allowed||!text||this.seen.has(key))return;
  this.seen.add(key);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value!);
  if(now-this.last<30000)return;this.last=now;
  // Bildirimler de Afu sesiyle okunur; Windows sesi yalnız Afu sesi yoksa kullanılır.
  try { if (this.actions.voiceResponse) await this.actions.voiceResponse(text); else await this.actions.voiceSpeak(text); } catch { /* Bildirim hatası sohbeti kesmez. */ }
 }
 async silence(){this.enabled=false;await this.actions.voiceSilence();}
}



/** Yanıt sesi bildirim tercihinden bağımsız ve varsayılan kapalıdır. */
export class ResponseSpeech {
 get enabled(){return State.settings.tts;}
 set enabled(value:boolean){State.settings.tts=value;}
 speaking=false; message=""; private generation=0;
 constructor(private actions:VoiceActions,private changed:()=>void=()=>{}) {}
 async speak(text:string){
  if(!this.enabled)return;
  const chars=Array.from(text.replace(/[\x00-\x08\x0b-\x1f\x7f]/g," ").trim()).slice(0,32000);
  if(!chars.length)return;
  const ticket=++this.generation;this.speaking=true;this.message="";this.changed();
  try{
   if(this.actions.voiceResponse){
    const unlisten=this.actions.voiceWarning?await this.actions.voiceWarning(()=>{if(ticket===this.generation&&this.enabled){this.message="Afu sesi hazır değil; Windows sesiyle devam ediyorum, daha sonra yeniden dene.";this.changed();}}):undefined;
    try{
     if(ticket!==this.generation||!this.enabled)return;
     const result=await this.actions.voiceResponse(chars.join(""));
     if(ticket===this.generation&&this.enabled&&result.warning)this.message=result.warning;
    }finally{unlisten?.();}
    return;
   }
   for(let offset=0;offset<chars.length;offset+=4000){
    if(ticket!==this.generation||!this.enabled)return;
    await this.actions.voiceSpeak(chars.slice(offset,offset+4000).join(""));
    if(ticket!==this.generation||!this.enabled)return;
   }
  }catch{if(ticket===this.generation)this.message="Yanıt okunamadı; metinden devam et.";}
  finally{if(ticket===this.generation){this.speaking=false;this.changed();}}
 }
 async cancel(stopNative=true){
  ++this.generation;const wasSpeaking=this.speaking;this.speaking=false;this.changed();
  if(wasSpeaking&&stopNative)await this.actions.voiceSilence();
 }
}
export interface ChatModel {
 send(text: string): Promise<string>;
}

export class SurekliSohbet {
 help:VoiceHelp|null=null;
 state: "idle"|"listening"|"thinking"|"speaking" = "idle";
 message: string = "";
 transcript: string = "";
 get active() { return this.state !== "idle"; }
 private generation = 0;
 private stopping: Promise<unknown>|null = null;

 constructor(
  private actions: VoiceActions,
  private chat: ChatModel,
  private changed: () => void = () => {}
 ) {}

 async baslat() {
  if (this.state !== "idle" || this.stopping || !this.actions.voiceListenTurn) return;
  const ticket = ++this.generation;
  this.message = "";
  this.help = null;
  this.transcript = "";

  while (ticket === this.generation) {
   this.state = "listening";
   this.changed();

   let text = "";
   try {
    text = await this.actions.voiceListenTurn(60000);
   } catch (error) {
    if (ticket !== this.generation) return;
    this.message = voiceErrorMessage(error, "start");
    this.help = voiceHelp(error);
    this.state = "idle";
    this.changed();
    return;
   }

   if (ticket !== this.generation) return;
   if (!text.trim()) {
    this.state = "idle";
    this.changed();
    return; // 60s sessizlik = döngü biter
   }

   this.transcript = text;
   this.state = "thinking";
   this.changed();

   let reply = "";
   try {
    reply = await this.chat.send(text);
   } catch (error) {
    if (ticket !== this.generation) return;
    this.message = "GPT'ye ulaşılamadı; yeniden dene.";
    this.state = "idle";
    this.changed();
    return;
   }

   if (ticket !== this.generation) return;
   this.state = "speaking";
   this.changed();

   try {
    if (this.actions.voiceResponse) {
     await this.actions.voiceResponse(reply);
    } else {
     await this.actions.voiceSpeak(reply);
    }
   } catch (error) {
    if (ticket !== this.generation) return;
    this.message = "Ses okunamadı; yeniden dene.";
    this.state = "idle";
    this.changed();
    return;
   }
  }
 }

 async bitir() {
  if (this.state === "idle") return;
  ++this.generation;
  this.state = "idle";
  this.message = "";
  this.changed();
  this.stopping = this.actions.voiceCancel();
  try { await this.stopping; } catch { this.message = "Ses durdurulamadı; yeniden dene."; }
  finally { this.stopping = null; this.changed(); }
 }
}






