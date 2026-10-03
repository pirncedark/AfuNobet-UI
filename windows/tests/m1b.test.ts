import { afterEach, describe, expect, it, vi } from "vitest";
import { Bridge } from "../src/core/bridge";
import { MessageNotifications } from "../src/message/notifications";
import { MessageQueue } from "../src/message/queue";
import { balonOlustur } from "../src/message/message";

vi.mock("../src/core/bridge", () => ({ Bridge: { petOnayBekliyor: vi.fn(async () => {}) } }));
afterEach(() => vi.clearAllMocks());

describe("M1B pending approval", () => {
  const create = () => new MessageNotifications(new MessageQueue(), {
    setAlwaysOnTop: async () => {}, show: async () => {}, hide: async () => {},
  });
  it("signals a queued question even behind an unchanged notification, once per change", async () => {
    const alerts = create();
    alerts.showNotification({ id: "n", type: "notification", timestamp: 0 });
    alerts.syncQuestions([{ id: "q", type: "question", timestamp: 1 }]);
    alerts.syncQuestions([{ id: "q", type: "question", timestamp: 1 }]);
    await alerts.settled();
    expect(alerts.current()?.id).toBe("n");
    expect(Bridge.petOnayBekliyor).toHaveBeenCalledExactlyOnceWith(true);
    alerts.close("n"); alerts.close("q"); await alerts.settled();
    expect(vi.mocked(Bridge.petOnayBekliyor).mock.calls).toEqual([[true], [false]]);
    alerts.dispose(); await alerts.settled();
  });
  it("keeps approval pending until the last question is deleted and clears on disposal", async () => {
    const alerts = create();
    const questions = ["a", "b"].map(id => ({ id, type: "question" as const, timestamp: 0 }));
    alerts.syncQuestions(questions); alerts.syncQuestions(questions.slice(1));
    await alerts.settled();
    expect(Bridge.petOnayBekliyor).toHaveBeenCalledExactlyOnceWith(true);
    alerts.syncQuestions([]); await alerts.settled();
    expect(vi.mocked(Bridge.petOnayBekliyor).mock.calls).toEqual([[true], [false]]);
    alerts.syncQuestions([{ id: "c", type: "question", timestamp: 2 }]);
    alerts.dispose(); await alerts.settled();
    expect(vi.mocked(Bridge.petOnayBekliyor).mock.calls).toEqual([[true], [false], [true], [false]]);
  });
});

describe("M1B balloon bullets", () => {
  it.each([
    ["Bu madde tamamlandı ve bütün bileşenler başarıyla doğrulandı", "Bu madde tamamlandı ve bütün bileşenler…"],
    ["Kısa madde", "Kısa madde"],
    ["x".repeat(55), "x".repeat(49) + "…"],
  ])("renders a whole-word preview for %s", (text, expected) => {
    const elements: any[] = [];
    const document = { createElement: (tag: string) => {
      const element = { tag, className: "", textContent: "", style: {},
        setAttribute() {}, append() {}, addEventListener() {} };
      elements.push(element); return element;
    } };
    balonOlustur(document as any, { surum: 1, id: "bullet", ajan: "claude", tur: "bilgi", metin: `Claude:\nBaşlık\n- ${text}`, zaman: 0 }, () => {});
    expect(elements.find(element => element.tag === "li")?.textContent).toBe(expected);
  });
});
