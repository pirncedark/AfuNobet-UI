import { describe, expect, it } from "vitest";
import { cursorToCss, dismissAction, hitRect, hitScale, ignoresClicks, toWindow } from "../src/core/hit";

describe("tıklama alanı (pencere-mantıksal piksel)", () => {
  it("Windows metin boyutu %132: CSS dikdörtgeni pencere birimine büyütülür", () => {
    // Canlı ölçüm 2026-10-02: devicePixelRatio 1.32, monitör ölçeği 1.0, innerWidth 546.
    const k = hitScale(1.32, 1);
    expect(k).toBeCloseTo(1.32, 5);
    const css = hitRect("compact", { x: 30.3, y: 0, w: 485.3, h: 216.9 }, { w: 546, h: 243 });
    const win = toWindow(css, k);
    // Alt düğme satırı (Kota durumu ~ x250 y259, Küçült ~ x624 y259) içeride kalmalı.
    expect(win.x).toBeCloseTo(40, 0);
    expect(Math.abs(win.x + win.w - 680)).toBeLessThan(1);
    expect(win.y + win.h).toBeGreaterThan(259 + 14);
  });
  it("farklı monitör ölçeği: 1.5 DPI + metin %100 düzeltme gerektirmez", () => {
    expect(hitScale(1.5, 1.5)).toBe(1);
    expect(hitScale(1.98, 1.5)).toBeCloseTo(1.32, 5);
  });
  it("bozuk değerler 1'e düşer", () => {
    expect(hitScale(NaN, 1)).toBe(1);
    expect(hitScale(1, 0)).toBe(1);
    expect(hitScale(100, 1)).toBe(1);
  });
  it("imleç pencere biriminden CSS birimine çevrilir", () => {
    expect(cursorToCss({ x: 264, y: 132 }, 1.32)).toEqual({ x: 200, y: 100 });
  });
});

describe("görünüm → tıklama geçirme kararı", () => {
  const drawn = { x: 40, y: 0, w: 640, h: 286 };
  const view = { w: 720, h: 320 };
  it("kart açıkken bütün pencere tıklamayı tutar", () => {
    expect(hitRect("expanded", drawn, view)).toEqual({ x: 0, y: 0, w: 720, h: 320 });
    expect(ignoresClicks("expanded")).toBe(false);
  });
  it("pet modunda pet penceresinin tamamı tıklanır", () => {
    expect(hitRect("pet", drawn, { w: 128, h: 128 })).toEqual({ x: 0, y: 0, w: 128, h: 128 });
  });
  it("kompakt/gizli modda yalnız ada şekli tutar, gerisi geçer", () => {
    expect(hitRect("compact", { x: 216, y: 0, w: 288, h: 32 }, view)).toEqual({ x: 216, y: 0, w: 288, h: 32 });
    expect(ignoresClicks("compact")).toBe(true);
    expect(ignoresClicks("hidden")).toBe(true);
    expect(hitRect("tray", drawn, view).w).toBe(0);
  });
});

describe("dışarı tıklama / odak kaybı → pet", () => {
  it("kart açık + mini pet açık → pet", () => {
    expect(dismissAction({ mode: "expanded", petEnabled: true, questionOpen: false })).toBe("pet");
  });
  it("mini pet kapalıysa mevcut davranış kalır", () => {
    expect(dismissAction({ mode: "expanded", petEnabled: false, questionOpen: false })).toBe("none");
  });
  it("cevap bekleyen soru varken kapanmaz", () => {
    expect(dismissAction({ mode: "expanded", petEnabled: true, questionOpen: true })).toBe("none");
  });
  it("kart kapalıyken hiçbir şey yapmaz", () => {
    for (const mode of ["compact", "hidden", "pet", "tray"] as const) expect(dismissAction({ mode, petEnabled: true, questionOpen: false })).toBe("none");
  });
});

import { vi } from "vitest";
import { Island } from "../src/island/island";
import { Bridge } from "../src/core/bridge";
import { State } from "../src/core/state";
describe("Island bağlantıları", () => {
  it("dışarı tıklama kart açık + mini pet açıkken pete indirir", () => {
    const collapse = vi.fn(); const old = State.settings.pet; State.settings.pet = true;
    Island.prototype.dismiss.call({ mode: "expanded", questionOpen: false, collapse } as any);
    expect(collapse).toHaveBeenCalledOnce();
    State.settings.pet = false;
    Island.prototype.dismiss.call({ mode: "expanded", questionOpen: false, collapse } as any);
    expect(collapse).toHaveBeenCalledOnce();
    State.settings.pet = old;
  });
  it("mod değişimi kart durumunu Rust'a bildirir ve kutuyu yeniden göndertir", () => {
    const card = vi.spyOn(Bridge, "setCardOpen").mockResolvedValue(null);
    const fake: any = { mode: "compact", cardOpenSent: false, pushedRect: { x: 1, y: 1, w: 1, h: 1 }, updateWindowCollapsed: vi.fn(), animateGeometry: vi.fn(), syncDom: vi.fn() };
    (Island.prototype as any).setMode.call(fake, "expanded");
    expect(card).toHaveBeenCalledWith(true);
    expect(fake.pushedRect.w).toBe(-1);
    (Island.prototype as any).setMode.call(fake, "pet");
    expect(card).toHaveBeenLastCalledWith(false);
    card.mockRestore();
  });
});
