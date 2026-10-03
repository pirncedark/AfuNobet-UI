import { describe, expect, it } from "vitest";
import { Gestures } from "../src/afu/gestures";
describe("Afu gestures", () => {
  it("only three rapid clicks cause dizzy", () => {
    const g = new Gestures();
    expect(g.click(0)).toBe("squash");
    expect(g.click(300)).toBe("squash");
    expect(g.click(600)).toBe("dizzy");
    expect(g.click(5000)).toBe("squash");
  });
  it("cheers once after two seconds and resets on hover leave", () => {
    const g = new Gestures();
    g.hoverStart(0);
    expect(g.hoverTick(1000)).toBeNull();
    expect(g.hoverTick(2000)).toBe("cheer");
    expect(g.hoverTick(3000)).toBeNull();
    g.hoverEnd();
    expect(g.hoverTick(5000)).toBeNull();
    g.hoverStart(5000);
    expect(g.hoverTick(7000)).toBe("cheer");
  });
});
