import { describe, expect, it } from "vitest";
import { contentWidth, fitScale, KART_OLCEK } from "../src/core/layout";
describe("content width", () => {
  it("keeps short content compact and grows for a long measured word", () => {
    expect(contentWidth(100, 1080, 480)).toBe(640);
    expect(contentWidth(480, 1080, 480)).toBe(696);
    expect(contentWidth(2000, 1080, 480)).toBe(720);
  });
  it.each([1, 1.5])("stays within native viewport at DPI %s", dpi => {
    const w = 1080 / dpi, h = 480 / dpi;
    expect(contentWidth(2000, w, h) * fitScale(w, h) * KART_OLCEK).toBeLessThanOrEqual(w);
  });
});
