// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from "vitest";
import {ChatView} from "../src/chat/chat";
import { AfuViews } from "../src/views/views";
import { Bridge } from "../src/core/bridge";
const actions=()=>({codexStatus:vi.fn(async()=>"hazir"),codexSend:vi.fn(async()=>{}),codexCancel:vi.fn(async()=>{}),codexLogin:vi.fn(async()=>{}),codexLoginCancel:vi.fn(async()=>{})});
afterEach(()=>{localStorage.clear();document.body.replaceChildren();});
it("Claude koruması bağlantı eksikken de korunur, bağlantı göstergesi gerçektir", async()=>{
 vi.spyOn(Bridge,"bildirimAyarlari").mockResolvedValue({muted:false} as any);
 vi.spyOn(Bridge,"codexStatus").mockResolvedValue({status:"hazir",loggedIn:true} as any);
 vi.spyOn(Bridge,"mesajlar").mockResolvedValue([]);
 const hook=vi.spyOn(Bridge,"claudeHookInstalled").mockResolvedValue(false);
 const chat=document.createElement("div");chat.innerHTML='<div class="chat-health"></div>';
 const view={chat,healthStrip:document.createElement("div"),healthCheck:{codex:false,ses:false,hookInstalled:false,mesajlar:[]},isCodexReady:()=>true};
 try {
  await (AfuViews.prototype as any).updateHealth.call(view);
  let card=chat.querySelectorAll(".chat-health-card")[3];
  expect(card.textContent).toBe("Claude Korunuyor · Bağlantı yok");expect(card.classList.contains("kapali")).toBe(true);
  hook.mockResolvedValue(true);await (AfuViews.prototype as any).updateHealth.call(view);
  card=chat.querySelectorAll(".chat-health-card")[3];expect(card.textContent).toBe("Claude Korunuyor");expect(card.classList.contains("ok")).toBe(true);
 } finally { vi.restoreAllMocks(); }
});
it("kapalı açılış, ok ile açma ve tercih kalıcılığı",async()=>{
 const v=new ChatView(actions());document.body.append(v.element);
 expect(v.details.hidden).toBe(true);expect(v.fallback.textContent).toBe("Nasıl yardımcı olayım?");
 expect(v.mainVoiceBtn.hidden).toBe(false);expect(v.conversationStatus.textContent).toBe("Bekliyor");
 v.detailsToggle.click();expect(v.details.hidden).toBe(false);expect(v.detailsToggle.getAttribute("aria-expanded")).toBe("true");
 const next=new ChatView(actions());expect(next.details.hidden).toBe(false);
 v.detailsToggle.click();expect(v.details.hidden).toBe(true);await v.detach();await next.detach();
});
it("yanıt güvenli metindir ve giriş yalnız bağlantı yoksa görünür",async()=>{
 const v=new ChatView(actions());await v.refresh();expect(v.loginButton.hidden).toBe(true);
 v.model.text="<img src=x onerror=alert(1)>";(v as any).render();expect(v.answer.textContent).toBe(v.model.text);expect(v.answer.querySelector("img")).toBeNull();await v.detach();
});
it("depolama engellense de ayrıntılar açılır",async()=>{
 const spy=vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw Error("blocked");});
 const v=new ChatView(actions());v.detailsToggle.click();expect(v.details.hidden).toBe(false);spy.mockRestore();await v.detach();
});
