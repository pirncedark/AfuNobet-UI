import { describe, it, expect } from "vitest";
import { MessageQueue } from "../src/message/queue";

describe("message queue", () => {
  it("keeps arrival order and never replays a handled ID", () => {
    const q = new MessageQueue();
    q.add({ id: "a", type: "notification", timestamp: 20 });
    q.add({ id: "b", type: "question", timestamp: 10 });
    expect(q.add({ id: "a", type: "notification", timestamp: 30 })).toBe(false);
    expect(q.current()?.id).toBe("a"); expect(q.peek()?.id).toBe("b");
    q.remove("a"); expect(q.current()?.id).toBe("b");
    expect(q.add({ id: "a", type: "notification", timestamp: 40 })).toBe(false);
    q.remove("missing"); expect(q.isEmpty()).toBe(false);
    q.remove("b"); expect(q.isEmpty()).toBe(true);
  });
});
