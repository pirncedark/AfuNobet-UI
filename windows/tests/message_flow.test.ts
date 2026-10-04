import { afterEach, beforeEach, expect, it, vi } from "vitest";
const ipc = vi.hoisted(() => ({ invoke: vi.fn(), handler: undefined as undefined | ((event: { payload: unknown }) => void), off: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: ipc.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async (_name, handler) => { ipc.handler = handler; return ipc.off; }) }));
import { soruAkisiniBagla } from "../src/question/question";
import { MessageNotifications } from "../src/message/notifications";
import { MessageQueue } from "../src/message/queue";
import { bildirimBalonu } from "../src/message/message";

class El {
  children: El[] = []; textContent = ""; className = ""; hidden = false; disabled = false;
  parent: El | null = null; attrs = new Map<string, string>(); listeners = new Map<string, Function[]>();
  constructor(public tagName: string) {}
  get firstChild() { return this.children[0] ?? null; }
  get parentElement() { return this.parent; }
  append(...children: El[]) { for (const child of children) { child.parent = this; this.children.push(child); } }
  removeChild(child: El) { this.children = this.children.filter(el => el !== child); child.parent = null; }
  replaceChildren(...children: El[]) { for (const child of [...this.children]) this.removeChild(child); this.append(...children); }
  setAttribute(key: string, value: string) { this.attrs.set(key, value); }
  getAttribute(key: string) { return this.attrs.get(key) ?? null; }
  addEventListener(name: string, fn: Function) { this.listeners.set(name, [...this.listeners.get(name) ?? [], fn]); }
  removeEventListener(name: string, fn: Function) { this.listeners.set(name, (this.listeners.get(name) ?? []).filter(f => f !== fn)); }
  fire(name: string) { for (const fn of this.listeners.get(name) ?? []) fn({ target: this, preventDefault() {}, stopPropagation() {} }); }
  all(): El[] { return [this, ...this.children.flatMap(el => el.all())]; }
  querySelector(selector: string) { return this.all().find(el => el.className.split(" ").includes(selector.slice(1))) ?? null; }
  contains(el: El) { return this.all().includes(el); }
  focus() {}
}
const question = (id: string) => ({ id, ajan: "codex", tur: "izin", baslik: id, metin: "İzin gerekiyor",
  secenekler: [{ id: "evet", etiket: "İzin ver" }, { id: "hayir", etiket: "Reddet" }],
  olusturma: 1, sonGecerlilik: 1000000, varsayilan: "hayir", serbestMetin: false });
let alerts: MessageNotifications;
let dispose: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.stubGlobal("window", { __TAURI_INTERNALS__: {}, setTimeout, clearTimeout });
  vi.stubGlobal("document", { createElement: (tag: string) => new El(tag), activeElement: null });
  ipc.invoke.mockResolvedValue([]);
  alerts = new MessageNotifications(new MessageQueue(), { setAlwaysOnTop: async () => {}, show: async () => {}, hide: async () => {} });
});
afterEach(async () => { dispose?.(); dispose = undefined; alerts.dispose(); await alerts.settled(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("feeds directory snapshots into FIFO and keeps failed answers on screen", async () => {
  const host = new El("div");
  const notification = new El("div");
  const petBalloon = new El("div"); petBalloon.append(notification, host);
  const render = alerts.subscribe(() => bildirimBalonu(document, notification as unknown as HTMLElement, alerts.current(), id => alerts.close(id)));
  alerts.showNotification({ id: "first", type: "notification", timestamp: 0 });
  dispose = await soruAkisiniBagla(host as unknown as HTMLElement, { messages: alerts, simdi: () => 0 });
  ipc.handler!({ payload: [question("q1"), question("q2")] });
  expect(host.hidden).toBe(true);
  expect(notification.hidden).toBe(false); expect(notification.children).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(8000);
  expect(alerts.current()?.id).toBe("first"); expect(host.hidden).toBe(true);
  expect(notification.hidden).toBe(false); expect(notification.children).toHaveLength(1);
  const okudum = notification.querySelector(".afu-balon-kapat")!;
  expect(okudum.textContent).toBe("Okudum"); okudum.fire("click");
  expect(alerts.current()?.id).toBe("question:q1"); expect(host.hidden).toBe(false);
  expect(notification.hidden).toBe(true); expect(notification.children).toHaveLength(0);
  expect(host.parentElement).toBe(petBalloon);
  ipc.invoke.mockRejectedValueOnce("Cevap gönderilemedi. Yeniden dene.");
  host.querySelector(".soru-dugme")!.fire("click");
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(alerts.current()?.id).toBe("question:q1");
  await vi.advanceTimersByTimeAsync(60000);
  expect(alerts.current()?.id).toBe("question:q1"); expect(host.hidden).toBe(false);
  expect(host.querySelector(".soru-hata")!.hidden).toBe(false);
  host.querySelector(".soru-kapat")!.fire("click");
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(ipc.invoke).toHaveBeenLastCalledWith("answer_question", { id: "q1", secim: "hayir", metin: null });
  expect(alerts.current()?.id).toBe("question:q2");
  alerts.showNotification({ id: "last", type: "notification", timestamp: 2 });
  ipc.handler!({ payload: [] }); expect(alerts.current()?.id).toBe("last"); expect(host.hidden).toBe(true);
  expect(notification.hidden).toBe(false); expect(notification.children).toHaveLength(1);
  render();
  dispose(); dispose = undefined; expect(ipc.off).toHaveBeenCalledOnce();
});
it("a newer directory event wins over a slow initial IPC snapshot", async () => {
  let resolve!: (questions: unknown) => void;
  ipc.invoke.mockImplementation(() => new Promise(r => { resolve = r; }));
  const host = new El("div");
  const binding = soruAkisiniBagla(host as unknown as HTMLElement, { messages: alerts, simdi: () => 0 });
  await Promise.resolve();
  ipc.handler!({ payload: [question("fresh")] });
  resolve([question("stale")]); dispose = await binding;
  expect(alerts.current()?.id).toBe("question:fresh");
});
