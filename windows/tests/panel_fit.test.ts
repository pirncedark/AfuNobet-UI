// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { panelHeight, panelScale, KART_OLCEK } from "../src/core/layout";
import { readFileSync } from "node:fs";
const invoke = vi.fn(async () => null);
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invoke(...args as []) }));
describe("panel client fit", () => {
  it.each([420, 640, 850, 1080])("keeps the entire card/footer in %spx clients at both DPIs", w => {
    for (const dpi of [1, 1.5]) for (const content of [220, 900]) {
      const cssW = w / dpi, cssH = 420 / dpi;
      const result = panelHeight(content, cssW, cssH, 900 / dpi);
      const drawn = result.design * panelScale(cssW) * KART_OLCEK;
      expect(drawn).toBeLessThanOrEqual(cssH + 0.001);
      expect(result.nativeCss * dpi).toBeLessThanOrEqual(900 * .85 + .001);
      expect(result.design).toBeGreaterThan(28 + 29 + 25);
    }
  });
  it("uses the actual Tauri height route with zoom and deduplicates", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.stubGlobal("localStorage", { getItem: (k: string) => k === "afunobet-hareket-zorla-v1" ? "false" : null, setItem() {} }); // "Hep hareketli" kapalı
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { Island } = await import("../src/island/island");
    const island = Object.create(Island.prototype) as any;
    const active = document.createElement("div");
    Object.defineProperty(active, "scrollHeight", { value: 600 });
    vi.spyOn(active, "cloneNode").mockImplementation(() => {
      const body = document.createElement("div"); Object.defineProperty(body, "scrollHeight", { value: 400 }); return body;
    });
    const el = document.createElement("div"); el.append(active);
    const header = document.createElement("header"), footer = document.createElement("footer");
    Object.defineProperty(header, "offsetHeight", { value: 28 }); Object.defineProperty(footer, "offsetHeight", { value: 29 });
    Object.assign(island, { mode: "expanded", view: "apps", islandEl: document.createElement("div"), views: { el, header, footer, bildirim: { hidden: true } },
      width: { jump: vi.fn() }, height: { jump: vi.fn() }, radius: { jump: vi.fn() },
      lastSentHeight: -1, nativeScale: window.devicePixelRatio || 1, ensureRunning: vi.fn() });
    invoke.mockClear(); island.animateGeometry(false); island.animateGeometry(false);
    const calls = invoke.mock.calls as unknown as [string, { h: number }][];
    expect(calls.filter(call => call[0] === "kart_yukseklik")).toHaveLength(1);
    const k = panelScale(window.innerWidth) * KART_OLCEK;
    expect(island.height.jump.mock.calls[0][0] * k).toBeLessThanOrEqual(window.innerHeight + .001);
    expect(calls[0][1].h).toBeGreaterThan(600);
    expect(calls[0][1].h).toBeLessThan(700); // Natural400px content, not allocated600px.
    island.mode = "pet"; island.animateGeometry(false);
    expect(invoke.mock.calls).toHaveLength(1);
    vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (window as any).__TAURI_INTERNALS__;
  });
  it("lets only inner bodies scroll, with no forced scrollbar on short content", () => {
    const apps = readFileSync("src/apps.css", "utf8");
    const css = readFileSync("src/style.css", "utf8");
    expect(apps).toContain("flex: 1 1 0; min-height: 0; max-height: none; overflow-y: auto");
    expect(css).toContain("#content header, #content footer { flex-shrink:0; }");
    expect(css).toContain("#content > .overview { overflow-y:auto; }");
  });
});
