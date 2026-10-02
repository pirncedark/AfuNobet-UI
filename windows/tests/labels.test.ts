import { describe, expect, it } from "vitest";
import { STATUS_TR, UI_TR } from "../src/core/labels";
import { parseState, taskMessage } from "../src/core/state";
describe("Turkish presentation", () => {
  it("renders Turkish state and quota pause instructions from wire keys", () => {
    const task = parseState({ version: 1, tasks: [{ id: "x", agent: "codex", status: "Duraklatildi", message: "429" }] }).tasks[0];
    expect(STATUS_TR[task.status]).toBe("Duraklatıldı");
    expect(taskMessage(task)).toBe("Codex duraklatıldı. Kota yenilenince devam edecek.");
    expect(task.title).toBe("Görev");
    expect(UI_TR.collapse).toBe("Küçült");
  });
});
