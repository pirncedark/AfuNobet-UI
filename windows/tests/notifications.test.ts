import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { MessageQueue } from "../src/message/queue";
import { MessageNotifications } from "../src/message/notifications";
import { loadMessageAlert, saveMessageAlert } from "../src/core/settings";
import { IslandStateMachine } from "../src/island/fsm";

describe("message alerts", () => {
  let alerts: MessageNotifications;
  let calls: string[];
  beforeEach(() => {
    vi.useFakeTimers(); calls = [];
    alerts = new MessageNotifications(new MessageQueue(), {
      setAlwaysOnTop: async on => { calls.push(`top:${on}`); },
      show: async () => { calls.push("show"); }, hide: async () => { calls.push("hide"); },
    });
  });
  afterEach(async () => { alerts.dispose(); await alerts.settled(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("keeps a visible always-on-top pet visible after eight seconds", async () => {
    let visible = true, top = true;
    const pet = new MessageNotifications(new MessageQueue(), {
      isVisible: async () => visible, isAlwaysOnTop: async () => top,
      setAlwaysOnTop: async on => { top = on; },
      show: async () => { visible = true; }, hide: async () => { visible = false; },
    });
    pet.showNotification({ id: "pet", type: "notification", timestamp: 0 });
    await pet.settled();
    await vi.advanceTimersByTimeAsync(8000); await pet.settled();
    expect(pet.isOpen).toBe(false); expect(top).toBe(true); expect(visible).toBe(true);
    pet.dispose();
  });
  it.each([[true, false], [false, true], [false, false]])("restores visibility %s and top %s through rapid close/reopen", async (visible, top) => {
    const initial = { visible, top };
    const own = new MessageNotifications(new MessageQueue(), {
      isVisible: async () => visible, isAlwaysOnTop: async () => top,
      setAlwaysOnTop: async on => { top = on; },
      show: async () => { visible = true; }, hide: async () => { visible = false; },
    });
    own.showNotification({ id: "a", type: "notification", timestamp: 0 }); await own.settled();
    own.close(); own.showNotification({ id: "b", type: "notification", timestamp: 1 });
    await own.settled(); own.setEnabled(false); await own.settled();
    expect({ visible, top }).toEqual(initial); own.dispose(); await own.settled();
  });
  it("waits for a terminal question instead of expiring it as a notification", async () => {
    alerts.showNotification({ id: "ask", type: "notification", timestamp: 0, requiresReply: true });
    await vi.advanceTimersByTimeAsync(60000); expect(alerts.current()?.id).toBe("ask");
    alerts.close(); await alerts.settled(); expect(alerts.isOpen).toBe(false);
  });
  it("never hides a pet when reading the original window state fails", async () => {
    let hidden = false;
    const own = new MessageNotifications(new MessageQueue(), {
      isVisible: async () => { throw Error("unavailable"); }, isAlwaysOnTop: async () => true,
      setAlwaysOnTop: async () => {}, show: async () => {}, hide: async () => { hidden = true; },
    });
    own.showNotification({ id: "a", type: "notification", timestamp: 0 });
    await own.settled(); await vi.advanceTimersByTimeAsync(8000); await own.settled();
    expect(hidden).toBe(false); own.dispose();
  });
  it("hides after exactly eight seconds and deduplicates after closure", async () => {
    alerts.showNotification({ id: "a", type: "notification", timestamp: 0, text: "Bitti" });
    await alerts.settled(); expect(calls).toEqual(["top:true", "show"]);
    await vi.advanceTimersByTimeAsync(7999); expect(alerts.current()?.id).toBe("a");
    await vi.advanceTimersByTimeAsync(1); await alerts.settled();
    expect(alerts.isOpen).toBe(false); expect(calls).toEqual(["top:true", "show", "top:false", "hide"]);
    alerts.showNotification({ id: "a", type: "notification", timestamp: 0 });
    expect(alerts.isOpen).toBe(false);
  });
  it("queues a question without a timeout, then advances on file deletion", async () => {
    alerts.showNotification({ id: "n", type: "notification", timestamp: 0 });
    alerts.syncQuestions([{ id: "q", type: "question", timestamp: 1 }]);
    alerts.showNotification({ id: "last", type: "notification", timestamp: 2 });
    await vi.advanceTimersByTimeAsync(8000); expect(alerts.current()?.id).toBe("q");
    await vi.advanceTimersByTimeAsync(60000); expect(alerts.current()?.id).toBe("q");
    alerts.syncQuestions([]); expect(alerts.current()?.id).toBe("last");
    alerts.close("last"); await alerts.settled(); expect(alerts.isOpen).toBe(false);
  });
  it("cancels an old timer on close and disposes all remaining callbacks", async () => {
    alerts.showNotification({ id: "a", type: "notification", timestamp: 0 });
    await vi.advanceTimersByTimeAsync(4000);
    alerts.showNotification({ id: "b", type: "notification", timestamp: 1 }); alerts.close("a");
    await vi.advanceTimersByTimeAsync(4000); expect(alerts.current()?.id).toBe("b");
    alerts.dispose(); await alerts.settled();
    const count = calls.length; await vi.advanceTimersByTimeAsync(10000);
    expect(calls).toHaveLength(count); expect(alerts.isOpen).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
  it("disabled setting renders messages without raising or hiding the window", async () => {
    alerts.setEnabled(false);
    alerts.showNotification({ id: "a", type: "notification", timestamp: 0 });
    expect(alerts.isOpen).toBe(true); await vi.advanceTimersByTimeAsync(8000); await alerts.settled();
    expect(calls).toEqual([]);
  });
  it("orders asynchronous window operations and survives a rejected show", async () => {
    let finish!: () => void;
    const slow = new MessageNotifications(new MessageQueue(), {
      setAlwaysOnTop: async on => { calls.push(`top:${on}`); },
      show: () => new Promise<void>(resolve => { finish = resolve; }),
      hide: async () => { calls.push("hide"); },
    });
    slow.showNotification({ id: "a", type: "notification", timestamp: 0 });
    await Promise.resolve(); await Promise.resolve();
    slow.close("a"); finish(); await slow.settled(); expect(calls.at(-1)).toBe("hide"); slow.dispose();
    const broken = new MessageNotifications(new MessageQueue(), {
      setAlwaysOnTop: async () => {}, show: async () => { throw Error("offline"); }, hide: async () => {},
    });
    broken.showNotification({ id: "b", type: "notification", timestamp: 0 });
    await broken.settled(); broken.close("b"); await broken.settled(); expect(broken.isOpen).toBe(false); broken.dispose();
  });
  it("pins the FSM through mouse leave until the message ends", () => {
    vi.stubGlobal("window", globalThis);
    const fsm = new IslandStateMachine(); fsm.messageOpened(); fsm.mouseLeft();
    vi.advanceTimersByTime(60000); expect(fsm.state).toBe("home");
    fsm.messageClosed(); expect(fsm.state).toBe("hidden"); expect(fsm.pinned).toBe(false);
  });
  it("keeps the pet mode while waiting and restores its original pin", () => {
    vi.stubGlobal("window", globalThis);
    const fsm = new IslandStateMachine(); fsm.toPet(); fsm.pinned = true;
    fsm.messageOpened(); fsm.mouseLeft(); vi.advanceTimersByTime(60000);
    expect(fsm.state).toBe("pet");
    fsm.messageClosed(); expect(fsm.state).toBe("pet"); expect(fsm.pinned).toBe(true);
  });
});

describe("message preference", () => {
  it("defaults on, persists off and handles corrupt or unavailable storage", () => {
    let value: string | null = null;
    const storage = { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
    expect(loadMessageAlert(storage)).toBe(true);
    expect(saveMessageAlert(false, storage)).toBe(true); expect(loadMessageAlert(storage)).toBe(false);
    value = "bad"; expect(loadMessageAlert(storage)).toBe(true);
    const broken = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
    expect(loadMessageAlert(broken)).toBe(true); expect(saveMessageAlert(false, broken)).toBe(false);
  });
});
