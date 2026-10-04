import { describe, expect, it } from "vitest";
import { T } from "../src/afu/timing";

describe("panel opening speed", () => {
  it("keeps pet return and panel opening within the fast timing budget", () => {
    expect(T.petReturn).toBe(240);
    expect(T.petReturn).toBeLessThanOrEqual(750 / 3);
    expect(T.panelOpen).toBe(70);
  });
  it("preserves existing animation timings", () => {
    const { panelOpen, petReturn, ...existing } = T;
    expect(existing).toEqual({ shrink: 180, floatDown: 250, reveal: 200, grab: 120, breathe: 2800, blink: 90, hoverRise: 160, clickHappy: 300, successJump: 300, errorShake: 220, squash: 100, squashBack: 160 });
  });
});
