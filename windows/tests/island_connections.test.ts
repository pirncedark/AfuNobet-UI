import { expect, it } from "vitest";
import { trayDisplay } from "../src/island/island";
it("uygulama daha acilse tepsi adı uygulama durumunu açıklar",()=>{const result=trayDisplay({apps:[{id:"a",ad:"AfuDM",kurulu:true}],durumlar:{a:{durum:"hata",ozet:"İndirme durdu"}}},{status:"Calisiyor",agent:"codex",title:"Kod işi",quotaPaused:false});expect(result).toEqual({durum:"hata",title:"AfuDM: İndirme durdu"});});
import { vi } from "vitest";
import { Island } from "../src/island/island";
import { Bridge } from "../src/core/bridge";

vi.stubGlobal("matchMedia", () => ({ matches: false }));

it("E6 sürükle-bırak ile dosya ekleme (attachFiles)", () => {
  const attachMock = vi.fn();
  const refreshMock = vi.fn().mockResolvedValue(undefined);
  const announceMock = vi.spyOn(State, "announce").mockImplementation(() => {});
  
  const state = {
    dragging: false,
    view: "overview",
    chat: { attach: attachMock, refresh: refreshMock },
    fsm: { pinned: false },
    character: { image: { animate: vi.fn() } },
    setView(v: string) { this.view = v; }
  } as unknown as Island;
  
  Island.prototype.attachFiles.call(state, ["C:\\test\\rapor.md"]);
  
  expect(attachMock).toHaveBeenCalledWith(["C:\\test\\rapor.md"]);
  expect(state.view).toBe("chat");
  expect(state.fsm.pinned).toBe(true);
  expect(refreshMock).toHaveBeenCalled();
  expect(announceMock).toHaveBeenCalledWith("happy");
  
  announceMock.mockRestore();
});

it("playAnimOnce ile tek seferlik animasyonlar tetiklenir", () => {
  vi.useFakeTimers();
  const syncDomMock = vi.fn();
  
  const state = {
    animOverride: null,
    syncDom: syncDomMock
  } as unknown as Island;
  
  const playAnimOnce = (Island.prototype as unknown as { playAnimOnce: (expr: string, ms: number) => void }).playAnimOnce;
  
  playAnimOnce.call(state, "waking", 2000);
  
  // override atandı ve dom senkronize edildi
  expect((state as unknown as { animOverride: any }).animOverride.expr).toBe("waking");
  expect(syncDomMock).toHaveBeenCalled();
  
  // 2050 ms sonra silinip tekrar dom senkronize edilecek mi (syncDom içinden normal duruma dönmeli ama süre test ediliyor)
  vi.advanceTimersByTime(2050);
  
  // setTimeout callback'i çalıştı ve animOverride değişmediyse tekrar syncDom çağrılır
  expect(syncDomMock).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});
it("chat görünümünden ayrılma mikrofonu ve pencere odağını bırakır",()=>{const cancel=vi.fn(async()=>{});const focus=vi.spyOn(Bridge,"focusWindow").mockResolvedValue(null);const state:any={view:"chat",mode:"expanded",chat:{suspend:cancel},fsm:{pinned:true},animateGeometry:vi.fn(),syncDom:vi.fn()};Island.prototype.setView.call(state,"apps");expect(cancel).toHaveBeenCalledOnce();expect(focus).toHaveBeenCalledWith(false);expect(state.fsm.pinned).toBe(false);expect(state.view).toBe("apps");focus.mockRestore();});

import { State } from "../src/core/state";
import { VoiceController } from "../src/chat/voice";
it("mikrofon açılması beklenirken bildirim okunmaz",async()=>{let finish!:()=>void;const voice=new VoiceController({voiceStart:()=>new Promise<void>(r=>finish=r),voiceStop:async()=>"",voiceCancel:async()=>{},voiceSpeak:async()=>{},voiceSilence:async()=>{},voiceSupported:async()=>({whisper:true,winrt_stt:false,tts:true})});const press=voice.press();expect(voice.state).toBe("idle");const announce=vi.fn(async()=>{});const permitted=vi.spyOn(State,"shouldAnnounce").mockReturnValue(true);const now=new Date().toISOString();State.apply({version:1,tasks:[{id:"sound",agent:"codex",status:"Calisiyor",task:"Ses görevi",updated_at:now}]});const fake:any={mode:"tray",events:{accept:()=>true},chat:{voice,responses:{speaking:false},notifications:{announce}}};Island.prototype.applySnapshot.call(fake,{version:1,tasks:[{id:"sound",agent:"codex",status:"Tamamlandi",task:"Ses görevi",updated_at:now}]});expect(announce).toHaveBeenCalledWith(expect.objectContaining({kind:"JOB_FINISHED"}),false);finish();await press;await voice.cancel();permitted.mockRestore();State.apply({version:1,tasks:[]});});
