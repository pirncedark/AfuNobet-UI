import { afterEach, expect, it, vi } from 'vitest';
import { parcaliOku, sesIptal, sesDurum, ResponseSpeech } from '../src/chat/voice';
afterEach(async()=>{await sesIptal({voiceSilence:async()=>{}});vi.useRealTimers();});
it('allows the measured cold startup past 30 seconds',async()=>{
 vi.useFakeTimers();
 let finish!:()=>void;
 const pending=new Promise<void>(resolve=>{finish=resolve;});
 const silence=vi.fn(async()=>{});
 const run=parcaliOku({voiceResponse:async()=>{await pending;return {warning:null};},voiceSilence:silence},'Merhaba');
 await vi.advanceTimersByTimeAsync(126801);
 expect(silence).not.toHaveBeenCalled();expect(sesDurum()).toBe('afu_konusuyor');
 finish();await run;expect(sesDurum()).toBe('bosta');
});
it('times out at 150 seconds and restores idle',async()=>{
 vi.useFakeTimers();
 const run=parcaliOku({voiceResponse:()=>new Promise(()=>{}),voiceSilence:async()=>{}},'Merhaba');
 const rejected=expect(run).rejects.toThrow('Ses zaman aşımı');
 await vi.advanceTimersByTimeAsync(150000);await rejected;expect(sesDurum()).toBe('bosta');
});
it('starts speech after ten cancellations',async()=>{
 const actions={voiceResponse:vi.fn(async()=>({warning:null})),voiceSilence:async()=>{}};
 for(let i=0;i<10;i++)await sesIptal(actions);
 await parcaliOku(actions,'Merhaba');expect(actions.voiceResponse).toHaveBeenCalledOnce();expect(sesDurum()).toBe('bosta');
});
it('keeps the backend repair message visible',async()=>{
 const message="Afu'nun ses dosyaları eksik. İnternet bağlantısıyla bir kez onarılır.";
 const response=new ResponseSpeech({voiceResponse:async()=>{throw new Error(message);},voiceSilence:async()=>{},voiceStart:async()=>{},voiceStop:async()=>'',voiceCancel:async()=>{},voiceSpeak:async()=>{},voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:true})});
 response.enabled=true;await response.speak('Merhaba');expect(response.message).toBe(message);expect(response.speaking).toBe(false);response.enabled=false;
});
