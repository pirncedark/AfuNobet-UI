import { afterEach, expect, it, vi } from "vitest";
import { ResponseSpeech } from "../src/chat/voice";
import { State } from "../src/core/state";
afterEach(()=>{State.settings.tts=false;});
it("ses kurulumu eksikse tek cümle uyarı gösterilir ve metin yanıtı değiştirilmez",async()=>{
 const text="İş tamamlandı; dosyan hazır.";
 const warning="Afu sesi kurulu değil, yazıyla devam ediyorum.";
 const actions={voiceStart:async()=>{},voiceStop:async()=>"",voiceCancel:async()=>{},voiceSpeak:vi.fn(async()=>{}),voiceSilence:async()=>{},voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:true}),voiceResponse:vi.fn(async()=>({warning}))};
 const r=new ResponseSpeech(actions);r.enabled=true;await r.speak(text);
 expect(actions.voiceResponse).toHaveBeenCalledWith(text);
 expect(actions.voiceSpeak).not.toHaveBeenCalled();
 expect(r.message).toBe(warning);expect(r.speaking).toBe(false);
});
it("Afu yanıtı tam metni tek istekle temizleyiciye verir ve yedek sesi açıklar",async()=>{
 const text="Merhaba\n```python\nprint('gizli')\n```";
 const actions={voiceStart:async()=>{},voiceStop:async()=>"",voiceCancel:async()=>{},voiceSpeak:async()=>{},voiceSilence:async()=>{},voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:true}),voiceResponse:vi.fn(async()=>({warning:"Afu sesi hazır değil; Windows sesiyle devam ediyorum, daha sonra yeniden dene."}))};
 const r=new ResponseSpeech(actions);r.enabled=true;await r.speak(text);
 expect(actions.voiceResponse).toHaveBeenCalledWith(text);
 expect(r.message).toContain("Windows sesi");expect(r.speaking).toBe(false);
});
it("iptal edilmiş Afu isteğinin geç uyarısı gösterilmez",async()=>{
 let done!:(r:{warning:string})=>void;
 const actions={voiceStart:async()=>{},voiceStop:async()=>"",voiceCancel:async()=>{},voiceSpeak:async()=>{},voiceSilence:async()=>{},voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:true}),voiceResponse:()=>new Promise<{warning:string}>(r=>done=r)};
 const r=new ResponseSpeech(actions);r.enabled=true;const pending=r.speak("Merhaba");await r.cancel();if (done) done({warning:"eski uyarı"});await pending;
 expect(r.message).toBe("");expect(r.speaking).toBe(false);
});
it("geciken uyarı bağlantısı iptal edilmiş yanıtı yeniden başlatmaz",async()=>{
 let connect!:(fn:()=>void)=>void;const unlisten=vi.fn();
 const actions={voiceStart:async()=>{},voiceStop:async()=>"",voiceCancel:async()=>{},voiceSpeak:async()=>{},voiceSilence:async()=>{},voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:true}),voiceResponse:vi.fn(async()=>({warning:null})),voiceWarning:()=>new Promise<()=>void>(r=>connect=r)};
 const r=new ResponseSpeech(actions);r.enabled=true;const pending=r.speak("Merhaba");await r.cancel();connect(unlisten);await pending;
 expect(actions.voiceResponse).not.toHaveBeenCalled();expect(unlisten).toHaveBeenCalledOnce();expect(r.speaking).toBe(false);
});
