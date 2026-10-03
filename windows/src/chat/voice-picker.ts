import { h } from "../views/dom";
import { Katman, katmaniKapat, kapatDugmesi } from "../views/overlay";
import type { VoiceActions, VoiceChoice } from "./voice";

const voices=[['afu_5b','Afu · Önerilen'],['notr','Afu · otomatik enerji'],['yumusak_sicak','Yumuşak ve sıcak'],['neseli_hareketli','Neşeli ve hareketli'],['sakin_dogal','Sakin ve doğal']];
/** First-use choice stays in the existing chat and never requests window focus. */
export class VoicePicker {
 readonly selection=h("select",{"aria-label":"Afu’nun sesi"});
 readonly filter=h("select",{"aria-label":"Sesin sıcaklığı"},...[['sicak','Sıcak'],['enerjik','Enerjik'],['sakin','Sakin'],['yok','Doğal']].map(([value,text])=>h("option",{value,text})));
readonly save=h("button",{class:"text-button",text:"Bu sesi kullan"});
  /** Q2: her açılır katmanda görünür kapatma yolu (Esc ve dışarı tıklama dışında). */
  readonly close=kapatDugmesi("text-button voice-picker-close","Kapat",()=>this.hide());
  readonly element=h("div",{class:"voice-picker",hidden:true,role:"dialog","aria-label":"Afu’nun sesi"},h("p",{class:"chat-status",text:"Afu’nun sesini seç; seçimini hatırlayacağım."}),this.selection,
   h("details",{},h("summary",{text:"Gelişmiş"}),h("label",{},"Sesin sıcaklığı",this.filter),h("p",{class:"chat-status",text:"Özel seslerin kendi tınısı korunur; sıcaklık seçimi varsayılan Afu sesine uygulanır."})),this.save,this.close);
  /** Q2: Esc kapatır, dışarı tıklama kapatır, odak ilk denetime girer ve kapanınca "Afu'nun sesi" düğmesine döner. */
  private readonly katman:Katman=new Katman(this.element,()=>this.hide());
  private alive=true;private version=0;
  constructor(private actions:VoiceActions,private selected:()=>void,private message:(text:string)=>void){
   this.save.addEventListener("click",()=>{void this.persist();});
  }
  async open(firstUse=false):Promise<boolean>{
   const ticket=++this.version;
   try{
    const choice=await this.actions.voiceChoices!();if(!this.alive||ticket!==this.version)return false;
    if(firstUse&&choice.chosen){this.element.hidden=true;katmaniKapat(this.element);return true;}
    this.fill(choice);this.element.hidden=false;this.katman.ac();return false;
   }catch{if(this.alive&&ticket===this.version)this.message("Ses seçimi açılamadı; yeniden dene.");return false;}
  }
 private fill(choice:VoiceChoice){
  this.selection.replaceChildren(...voices.filter(([value])=>choice.available.includes(value)).map(([value,text])=>h("option",{value,text})));
  this.selection.value=choice.ses;this.filter.value=choice.filtre;
 }
 private async persist(){
  if(this.save.disabled)return;
  const ticket=this.version;this.save.disabled=true;
  try{
   await this.actions.voiceChoose!(this.selection.value,this.filter.value);
if(!this.alive||ticket!==this.version)return;
   this.element.hidden=true;katmaniKapat(this.element);this.selected();
 }catch{if(this.alive&&ticket===this.version)this.message("Ses seçimi kaydedilemedi; yeniden dene.");}
  finally{this.save.disabled=false;}
 }
 hide(){++this.version;katmaniKapat(this.element);this.element.hidden=true;}
 detach(){this.alive=false;this.hide();}
}
