import { State } from "../core/state";
import type { AfuEvent } from "../core/events";
export type VoiceSettingsKind="speech"|"microphone"|"network";
export interface VoiceHelp {kind:VoiceSettingsKind;label:string}
export interface VoiceActions {
 voiceChunks?(text:string,rest:string[]):Promise<unknown>;
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
   try{if(this.beforeStart){await this.beforeStart();if(ticket!==this.generation)return;}else if(sesDurumu==="afu_konusuyor")await kullaniciSesi(this.actions);sesDurumu=sesGecisi(sesDurumu,"kullanici_basla").durum;await this.actions.voiceStart();this.recordOpen=true;if(ticket!==this.generation)return;this.micOpen=true;this.state="listening";}
   catch(error){if(ticket!==this.generation)return;this.message=voiceErrorMessage(error,"start");this.help=voiceHelp(error);kullaniciBitti();}
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
   finally{if(ticket===this.generation){this.state="idle";kullaniciBitti();this.changed();}}
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
   if(ticket===this.generation){this.transcript="";this.state="idle";kullaniciBitti();this.changed();}
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
  try { await parcaliOku(this.actions,text); } catch { /* Bildirim hatası sohbeti kesmez. */ }
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
     const result=await parcaliOku(this.actions,chars.join(""),()=>ticket===this.generation&&this.enabled);
     if(ticket===this.generation&&this.enabled&&result?.warning)this.message=result.warning;
    }finally{unlisten?.();}
    return;
   }
   await parcaliOku(this.actions,chars.join(""),()=>ticket===this.generation&&this.enabled);
  }catch{if(ticket===this.generation)this.message="Yanıt okunamadı; metinden devam et.";}
  finally{if(ticket===this.generation){this.speaking=false;this.changed();}}
 }
 async cancel(stopNative=true){
  ++this.generation;const wasSpeaking=this.speaking;this.speaking=false;this.changed();
  if(wasSpeaking&&stopNative)await sesIptal(this.actions);
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
 private yanki=new YankiKoruma();

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
    if(!await mikrofonHazir()||ticket!==this.generation)return;
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

   if(!this.yanki.kabul(text))continue;
   // "Tamam yeterli" sohbeti bitirir; çağırma sözü ("AfuNöbet") yeniden başlatır.
   if (/tamam.{0,3}yeter/.test(text.toLowerCase().replace(/ı/g, "i").replace(/ş/g, "s").replace(/[^a-z0-9]/g, ""))) {
    this.state = "idle";
    this.changed();
    try { await this.actions.voiceResponse?.("Tamam, çağırmanı bekliyorum."); } catch { /* ses yoksa sessiz */ }
    return;
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
    this.yanki.soylendi(reply);
    await parcaliOku(this.actions,reply,()=>ticket===this.generation);
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
  this.stopping = sesIptal(this.actions);
  try { await this.stopping; } catch { this.message = "Ses durdurulamadı; yeniden dene."; }
  finally { this.stopping = null; this.changed(); }
 }
}






export function okunacak(text:string):string {
 return text.replace(/^Claude\s*·[^:]{1,24}:\s*/, '').replace(/[*`#_>]/g,'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim();
}
/** No four-piece cap: the complete message is preserved. */
export function parcala(text:string):string[] {
 let chars=Array.from(okunacak(text));const parts:string[]=[];
 while(chars.length){
  const limit=parts.length?110:60;let end=Math.min(limit,chars.length);
  const prefix=chars.slice(0,end).join('');
  const sentences=[...prefix.matchAll(/[.!?…](?:\s|$)/g)];
  if(sentences.length){const match=parts.length?sentences[sentences.length-1]:sentences[0];end=Array.from(prefix.slice(0,match.index!+1)).length;}
  else if(chars.length>end){const space=chars.slice(0,end).lastIndexOf(' ');if(space>0)end=space;}
  parts.push(chars.slice(0,end).join('').trim());chars=chars.slice(end);while(chars[0]===' ')chars.shift();
 }
 return parts.filter(Boolean);
}
export function sesKaydet(ids:Set<string>,id:string){ids.add(id);while(ids.size>200)ids.delete(ids.values().next().value!);}
export type SesDurumu='bosta'|'afu_konusuyor'|'kullanici_konusuyor';
export function sesGecisi(durum:SesDurumu,olay:'afu_basla'|'afu_bitir'|'kullanici_basla'|'kullanici_bitir'|'iptal') {
 const iptal=olay==='kullanici_basla';
 const next:SesDurumu=iptal?'kullanici_konusuyor':olay==='iptal'?'bosta':olay==='afu_basla'?(durum==='kullanici_konusuyor'?durum:'afu_konusuyor'):olay==='afu_bitir'?(durum==='afu_konusuyor'?'bosta':durum):olay==='kullanici_bitir'?(durum==='kullanici_konusuyor'?'bosta':durum):durum;
 return {durum:next,mikrofon:next!=='afu_konusuyor',iptal};
}
export function sesNormalize(text:string){return text.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]/g,'');}
export class YankiKoruma {
 private spoken:string[]=[];private heard=new Set<string>();
 soylendi(text:string){this.spoken=parcala(text).map(sesNormalize);this.heard.clear();}
 kabul(text:string){const n=sesNormalize(text);if(!n||this.heard.has(n)||this.spoken.some(s=>s===n||(n.length>=12&&(s.includes(n)||n.includes(s)))))return false;sesKaydet(this.heard,n);return true;}
}
let sesDurumu:SesDurumu='bosta';let sesNesli=0;let yenidenDinle=0;let durdur:(()=>void)|undefined;
export async function sesIptal(actions:Pick<VoiceActions,'voiceSilence'> & Partial<Pick<VoiceActions,'voiceCancel'>>){++sesNesli;durdur?.();sesDurumu='bosta';yenidenDinle=0;await Promise.all([actions.voiceSilence(),actions.voiceCancel?.()]);}
export function sesDurum(){return sesDurumu;}
export async function kullaniciSesi(actions:Pick<VoiceActions,'voiceCancel'|'voiceSilence'>){
 ++sesNesli;durdur?.();yenidenDinle=0;sesDurumu=sesGecisi(sesDurumu,'kullanici_basla').durum;
 await Promise.all([actions.voiceCancel(),actions.voiceSilence()]);
}
export function kullaniciBitti(){sesDurumu=sesGecisi(sesDurumu,'kullanici_bitir').durum;}
export async function mikrofonHazir(){const delay=yenidenDinle-performance.now();if(delay>0)await new Promise(r=>setTimeout(r,delay));return sesDurumu!=='afu_konusuyor';}
type SpeechActions=Pick<VoiceActions,'voiceSilence'> & Partial<Pick<VoiceActions,'voiceResponse'|'voiceSpeak'>> & {voiceChunks?:(first:string,rest:string[])=>Promise<unknown>};
/** Native chunks use one generation; prefetch must not cancel currently playing audio. */
export async function parcaliOku(actions:SpeechActions,text:string,valid:()=>boolean=()=>true){
 const parts=parcala(text);if(!parts.length||!valid()||sesDurumu==='kullanici_konusuyor')return;
 durdur?.();const ticket=++sesNesli;sesDurumu=sesGecisi(sesDurumu,'afu_basla').durum;
 let timer:ReturnType<typeof setTimeout>|undefined;
 let warning:string|null=null;
 const cancelled=new Promise<void>(resolve=>{durdur=resolve;});
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{if(ticket===sesNesli){++sesNesli;sesDurumu='bosta';void actions.voiceSilence().catch(()=>{});}reject(new Error('Ses zaman aşımı'));},30000);});
 try {
  const work=(async()=>{
   if(actions.voiceChunks){const result=await actions.voiceChunks(parts[0],parts.slice(1)) as {warning?:string}|undefined;warning=result?.warning??null;return;}
   for(const part of parts){if(ticket!==sesNesli||!valid())return;if(actions.voiceResponse){const result=await actions.voiceResponse(part);warning=result.warning;if(warning)return;}else await actions.voiceSpeak?.(part);}
  })();
  await Promise.race([work,deadline,cancelled]);
  return {warning};
 }finally{clearTimeout(timer);if(ticket===sesNesli){durdur=undefined;sesDurumu=sesGecisi(sesDurumu,'afu_bitir').durum;yenidenDinle=performance.now()+700;}}
}
