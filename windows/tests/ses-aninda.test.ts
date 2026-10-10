import { describe, it, expect, vi, afterEach } from 'vitest';
import * as voice from '../src/chat/voice';
afterEach(async()=>{await voice.sesIptal({voiceSilence:async()=>{}});vi.useRealTimers();});
describe('instant speech',()=>{
 it('keeps user ownership after the beforeStart cancellation hook',async()=>{
  const actions={voiceStart:async()=>{},voiceStop:async()=>'',voiceCancel:async()=>{},voiceSilence:async()=>{},voiceSpeak:async()=>{},voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:true})};
  const controller=new voice.VoiceController(actions,()=>{},()=>voice.sesIptal(actions));
  await controller.press();expect(voice.sesDurum()).toBe('kullanici_konusuyor');await controller.cancel();
 });
 it('barge-in cancels native capture and speech and drops queued chunks',async()=>{
  const actions={voiceResponse:vi.fn(()=>new Promise<{warning:null}>(()=>{})),voiceCancel:vi.fn(async()=>{}),voiceSilence:vi.fn(async()=>{})};
  const speech=voice.parcaliOku(actions,'İlk cümle. İkinci cümle.');await voice.kullaniciSesi(actions);await speech;
  expect(actions.voiceCancel).toHaveBeenCalledOnce();expect(actions.voiceSilence).toHaveBeenCalledOnce();expect(actions.voiceResponse).toHaveBeenCalledTimes(1);expect(voice.sesDurum()).toBe('kullanici_konusuyor');
 });
 it('keeps every word with bounded Unicode chunks',()=>{
  const input='İlk cümle. '+('Uzun açıklama 😀 devam ediyor. '.repeat(80));
  const parts=voice.parcala(input);
  expect(parts[0].length).toBeLessThanOrEqual(60);
  expect(parts.slice(1).every(p=>Array.from(p).length<=110)).toBe(true);
  expect(parts.join(' ').replace(/\s/g,'')).toBe(input.replace(/\s/g,''));
 });
 it('bounds long unbroken words without losing characters',()=>{
  const input='a'.repeat(450);const parts=voice.parcala(input);
  expect(parts[0].length).toBe(60);expect(parts.join('')).toBe(input);
 });
 it('cleans labels and decorations',()=>expect(voice.okunacak('Claude · klasör: **Merhaba**\n# dünya')).toBe('Merhaba dünya'));
 it('evicts oldest IDs at 200',()=>{const ids=new Set<string>();for(let i=0;i<250;i++)voice.sesKaydet(ids,String(i));expect(ids.size).toBe(200);expect(ids.has('0')).toBe(false);});
 it('starts the first chunk by the first microtask',async()=>{
  const calls:string[]=[];const actions={voiceResponse:async(t:string)=>{calls.push(t);return {warning:null};},voiceSilence:async()=>{}};
  const run=voice.parcaliOku(actions,'İlk cümle. İkinci cümle.');await Promise.resolve();expect(calls[0]).toBe('İlk cümle.');await run;
 });
 it('releases a stalled speech at 30 seconds',async()=>{
  vi.useFakeTimers();const silence=vi.fn(async()=>{});
  const run=voice.parcaliOku({voiceResponse:()=>new Promise(()=>{}),voiceSilence:silence},'Merhaba');
  const result=run.catch(e=>e.message);await vi.advanceTimersByTimeAsync(30000);expect(await result).toMatch(/zaman/);expect(silence).toHaveBeenCalledOnce();
 });
 it('waits 700ms before reopening the microphone',async()=>{
  vi.useFakeTimers();await voice.parcaliOku({voiceResponse:async()=>({warning:null}),voiceSilence:async()=>{}},'Merhaba');
  let ready=false;const wait=voice.mikrofonHazir().then(value=>{ready=value;});
  await vi.advanceTimersByTimeAsync(699);expect(ready).toBe(false);await vi.advanceTimersByTimeAsync(1);await wait;expect(ready).toBe(true);
 });
 it('half duplex and barge-in never enable both outputs',()=>{
  const bot=voice.sesGecisi('bosta','afu_basla');expect(bot).toEqual({durum:'afu_konusuyor',mikrofon:false,iptal:false});
  const user=voice.sesGecisi(bot.durum,'kullanici_basla');expect(user).toEqual({durum:'kullanici_konusuyor',mikrofon:true,iptal:true});
  expect(voice.sesGecisi(user.durum,'afu_basla').durum).toBe('kullanici_konusuyor');
 });
 it('drops normalized echo and repeated recognition',()=>{const gate=new voice.YankiKoruma();gate.soylendi('Merhaba, nasılsın?');expect(gate.kabul('merhaba nasilsin')).toBe(false);expect(gate.kabul('Yeni cevap')).toBe(true);expect(gate.kabul('Yeni cevap')).toBe(false);});
});
