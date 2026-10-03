import { describe, it, expect } from "vitest";
import { agentPillState, agentPills, handoffText, type RichTask } from "../src/views/model";
import { ajanKimlik } from "../src/core/ajan_kimlik";
import type { Snapshot, Task } from "../src/core/state";

describe("E2 Ajan Pill ve Devir Testleri", () => {
  it("1. ajanKimlik: Dogru kisa ad ve renkler", () => {
    const cdx = ajanKimlik("codex");
    expect(cdx.kisaAd).toBe("CDX");
    expect(cdx.renk).toBe("#10a37f");
    const gem = ajanKimlik("gemini");
    expect(gem.kisaAd).toBe("GEM");
    expect(gem.renk).toBe("#1a73e8");
  });

  it("2. agentPillState: Calisan ajan aktif doner", () => {
    const snap: Snapshot = { tasks: [{ agent: "codex", status: "Calisiyor", updatedAt: Date.now() } as Task], quotas: {}, sourceUnavailable: false };
    expect(agentPillState(snap, "codex", Date.now())).toBe("aktif");
  });

  it("3. agentPillState: Calismayan ama islem gormus ajan idle doner", () => {
    // W4: "Bekliyor" artık ayrı "bekliyor" noktasıdır (w4_pill.test.ts); işi bitmiş ajan boşta kalır.
    const snap: Snapshot = { tasks: [{ agent: "codex", status: "Tamamlandi", updatedAt: Date.now() } as Task], quotas: {}, sourceUnavailable: false };
    expect(agentPillState(snap, "codex", Date.now())).toBe("idle");
  });

  it("4. agentPills: Hic kullanilmayan GLM ajan pill'i uretmez", () => {
    const snap: Snapshot = { tasks: [{ agent: "codex", status: "Tamamlandi" } as Task], quotas: {}, sourceUnavailable: false };
    const pills = agentPills(snap);
    expect(pills.find(p => p.id === "glm")).toBeUndefined();
  });

  it("5. agentPills: Pill icinde kimlik nesnesi doludur", () => {
    const snap: Snapshot = { tasks: [{ agent: "codex", status: "Tamamlandi" } as Task], quotas: {}, sourceUnavailable: false };
    const pills = agentPills(snap);
    const codex = pills.find(p => p.id === "codex");
    expect(codex?.kimlik).toBeDefined();
    expect(codex?.kimlik?.kisaAd).toBe("CDX");
  });

  it("6. handoffText: Normal devir satiri", () => {
    const task: RichTask = { agent: "codex", status: "Tamamlandi", handoff: { from: "codex", to: "gemini", reason: "kota_doldu" } } as unknown as RichTask;
    expect(handoffText(task)).toBe("Codex kotası doldu → Gemini devraldı");
  });

  it("7. handoffText: Devralan yoksa bekliyor satiri (handoff nesnesi ile)", () => {
    const task: RichTask = { agent: "codex", status: "Tamamlandi", handoff: { from: "codex", reason: "kota_doldu" } } as unknown as RichTask;
    expect(handoffText(task)).toBe("Codex kotası doldu → bekliyor");
  });

  it("8. handoffText: Claude asla devralan gosterilmez", () => {
    const task: RichTask = { agent: "codex", status: "Tamamlandi", handoff: { from: "codex", to: "claude", reason: "kota_doldu" } } as unknown as RichTask;
    expect(handoffText(task)).toBeNull();
  });

  it("9. handoffText: quotaPaused yuzunden duraklama ozel bekliyor satiri uretir", () => {
    const now = new Date(2026, 9, 3, 12, 0).getTime();
    const task: RichTask = { agent: "codex", status: "Duraklatildi", quotaPaused: true, quota: { remaining_percent: 0, reset_at: new Date(2026, 9, 3, 15, 30).toISOString() } } as unknown as RichTask;
    const text = handoffText(task, now);
    expect(text).toContain("Codex kotası doldu · bekliyor");
    // W3: açılış saati "(15:30'da açılır)" biçiminde yazılır.
    expect(text).toContain("15:30'da açılır");
  });

  it("10. handoffText: Kotasi biten duraklamis gorev bekliyor uretir", () => {
    const task: RichTask = { agent: "gemini", status: "Duraklatildi", quotaPaused: false, quota: { remaining_percent: 0 } } as unknown as RichTask;
    expect(handoffText(task)).toBe("Gemini kotası doldu · bekliyor");
  });

  it("11. handoffText: Veri yoksa uydurma yok", () => {
    const task: RichTask = { agent: "codex", status: "Duraklatildi", quotaPaused: false, quota: { remaining_percent: 10 } } as unknown as RichTask;
    expect(handoffText(task)).toBeNull();
  });
});
