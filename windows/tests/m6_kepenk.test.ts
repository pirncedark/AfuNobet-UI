import { expect, it } from "vitest";
import { PANEL_MIN_H, PANEL_MAX_H_RATIO, PANEL_H } from "../src/core/layout";

it("PANEL_MIN_H ve PANEL_MAX_H_RATIO doğru tanımlanmış", () => {
    expect(PANEL_MIN_H).toBe(480);
    expect(PANEL_H).toBe(480);
    expect(PANEL_MAX_H_RATIO).toBe(0.85);
});
