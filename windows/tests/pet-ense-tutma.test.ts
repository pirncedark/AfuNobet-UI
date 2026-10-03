import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AfuPet, PET_AYAR, PET_BOYUT, PET_NORMALIZE, PET_TUTMA_NOKTASI, SEKANSLAR, sigdir, tutmaNoktasi } from "../src/afu/pet";
import { PET_PENCERE } from "../src/core/layout";

const ENSE = "durum/ense_tutma";

describe("fareyle taşıma: ense tutma animasyonu", () => {
  it("sürüklerken yeni animasyonlu ense_tutma karesi oynar, dosya yerinde", () => {
    expect(SEKANSLAR.surukleme).toEqual([{ kare: ENSE, ms: Infinity }]);
    expect(existsSync(fileURLToPath(new URL("../public/afu/durum/ense_tutma.webp", import.meta.url)))).toBe(true);
    // Geri dönüş (bırakınca uçarak dönme) değişmedi.
    expect(SEKANSLAR.geri_donus.map(k => k.kare)).toEqual(["durum/ense_tutma"]);
  });

  it("ense_tutma diğer durum kareleri gibi ölçülmüş: ölçek, kayma ve alfa kutusu", () => {
    const b = PET_BOYUT[ENSE];
    expect(b).toBeDefined();
    expect(PET_NORMALIZE).toContain("surukleme");
    // Pillow alfa birleşimi: x 11..384, y 0..384 (384x384 tuval).
    expect(b.kutu[0]).toBeCloseTo(11 / 384, 6);
    expect(b.kutu.slice(1)).toEqual([0, 1, 1]);
    // Boy ölçeği idle_normal referansına göre: diğer durum kareleriyle aynı aralıkta.
    expect(b.olcek).toBeGreaterThan(0.35);
    expect(b.olcek).toBeLessThan(0.5);
  });

  it("tutma noktası elin üst ucu; listede olmayan karede eski ense noktası korunur", () => {
    expect(PET_TUTMA_NOKTASI[ENSE]).toEqual({ x: 220 / 384, y: 0 });
    expect(tutmaNoktasi(ENSE)).toEqual({ x: 220 / 384 * PET_PENCERE, y: 0 });
    expect(tutmaNoktasi("akis_suzulme")).toEqual({ x: PET_PENCERE / 2, y: 90 });
  });

  it("çerçeveye sığan tutuşta elin üst ucu tam imlecin altına gelir ve kare taşmaz", () => {
    const b = PET_BOYUT[ENSE];
    const t = tutmaNoktasi(ENSE);
    const olcek = b.olcek * PET_AYAR.surukleme.olcek / 100;
    for (const [cx, cy] of [[150, 40], [120, 60], [170, 100]]) {
      const tx = cx - t.x - b.x * PET_PENCERE;
      const ty = cy - t.y - b.y * PET_PENCERE;
      const s = sigdir(b.kutu, olcek, tx + b.x * PET_PENCERE, ty + b.y * PET_PENCERE, PET_PENCERE, 6, t.y, t.x, 0);
      // nokta p -> (p - o) * s + t + o; tutma noktası o olduğu için o + t'ye gider.
      expect(t.x + s.x).toBeCloseTo(cx, 6);
      expect(t.y + s.y).toBeCloseTo(cy, 6);
      const alt = (b.kutu[3] * PET_PENCERE - t.y) * s.olcek + t.y + s.y;
      const sol = (b.kutu[0] * PET_PENCERE - t.x) * s.olcek + t.x + s.x;
      const sag = (b.kutu[2] * PET_PENCERE - t.x) * s.olcek + t.x + s.x;
      expect(alt).toBeLessThanOrEqual(PET_PENCERE + 1e-6);
      expect(sol).toBeGreaterThanOrEqual(6 - 1e-6);
      expect(sag).toBeLessThanOrEqual(PET_PENCERE - 6 + 1e-6);
    }
  });

  it("imleç çok aşağıda tutsa da kare pencereden taşmaz (ayaklar alt kenarda kalır)", () => {
    const b = PET_BOYUT[ENSE];
    const t = tutmaNoktasi(ENSE);
    const s = sigdir(b.kutu, b.olcek, 0, 240 - t.y, PET_PENCERE, 6, t.y, t.x, 0);
    const alt = (PET_PENCERE - t.y) * s.olcek + t.y + s.y;
    expect(alt).toBeCloseTo(PET_PENCERE, 6);
  });
});

describe("boşluk: ayaklar görev çubuğuna değer", () => {
  it("sigdir alt payı ayrı verilebilir; verilmezse eski davranış (pay) aynen sürer", () => {
    const kutu: [number, number, number, number] = [0.2, 0.2, 0.8, 1];
    expect(sigdir(kutu, 0.5, 0, 10).y).toBe(-6);
    expect(sigdir(kutu, 0.5, 0, 10, 256, 6, 256, 128, 0).y).toBe(0);
  });

  it("bekleme karesinin ayakları pencerenin alt kenarına iner; stüdyo y=2 korunur", () => {
    expect(PET_AYAR.bekleme.y).toBe(2);
    const b = PET_BOYUT["durum/bekleme"];
    const s = sigdir(b.kutu, b.olcek, 0, PET_AYAR.bekleme.y + b.y * PET_PENCERE, PET_PENCERE, 6, PET_PENCERE, PET_PENCERE / 2, 0);
    const alt = (b.kutu[3] * PET_PENCERE - PET_PENCERE) * s.olcek + PET_PENCERE + s.y;
    expect(alt).toBe(PET_PENCERE);
  });
});

describe("AfuPet çizimi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    class ElementStub {
      children: ElementStub[] = [];
      className = "";
      hidden = false;
      dataset = {};
      style = { setProperty: vi.fn(), transformOrigin: "", translate: "", scale: "", transform: "" };
      listeners = new Map<string, ((event: unknown) => void)[]>();
      setAttribute = vi.fn();
      getAttribute = vi.fn(() => "");
      append(...children: ElementStub[]) { this.children.push(...children); }
      replaceChildren(...children: ElementStub[]) { this.children = children; }
      addEventListener(name: string, handler: (event: unknown) => void) { this.listeners.set(name, [...this.listeners.get(name) ?? [], handler]); }
      removeEventListener() {}
      getAnimations() { return []; }
      animate = vi.fn(() => ({ cancel: vi.fn() }));
      getBoundingClientRect() { return { left: 0, bottom: 256, top: 0, width: 256, height: 256 }; }
      querySelector() { return undefined; }
      contains(element: ElementStub) { return element === this || this.children.some(child => child.contains(element)); }
      setPointerCapture = vi.fn();
      releasePointerCapture = vi.fn();
      focus = vi.fn();
    }
    const body = new ElementStub();
    vi.stubGlobal("document", { body, createElement: () => new ElementStub(), createTextNode: (text: string) => Object.assign(new ElementStub(), { textContent: text }), addEventListener: vi.fn(), hidden: false });
    vi.stubGlobal("window", { screenX: 0, innerWidth: 256, innerHeight: 256, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal("Image", class { src = ""; });
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("performance", { now: () => Date.now() });
  });

  type Stil = { style: { transformOrigin: string; translate: string; transform: string; height: string; top: string; bottom: string } };
  const cizim = (pet: AfuPet) => ({ ...(pet.image as unknown as Stil).style });

  it("bekleme pozunda ayaklar pencerenin altına değer (alt boşluk yok)", () => {
    const pet = new AfuPet(vi.fn());
    pet.model.setPose("bekleme");
    (pet as unknown as { paint(): void }).paint();
    const { translate, transformOrigin } = cizim(pet);
    expect(transformOrigin).toBe("50% 100%");
    expect(translate.split(" ")[1]).toBe("0px");
  });

  it("keeps the native hand anchor fixed instead of translating to the initial click", () => {
    const pet = new AfuPet(vi.fn());
    const ic = pet as unknown as { dragStart: number; paint(): void };
    ic.dragStart = Date.now() - 1000;
    pet.model.setPose("surukleme");
    ic.paint();
    const t = tutmaNoktasi(ENSE);
    const { translate, transformOrigin } = cizim(pet);
    expect(transformOrigin).toBe(`${t.x / PET_PENCERE * 100}% 0%`);
    const [x, y] = translate.split(" ").map(parseFloat);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });
  it.each([false, true])("holds the hand fixed from the first frame, reduced motion=%s", reduced => {
    vi.stubGlobal("matchMedia", () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const pet = new AfuPet(vi.fn());
    const state = pet as unknown as { dragStart: number; swingAngle: number; swingVel: number; paint(): void };
    pet.model.setPose("surukleme");
    state.dragStart = Date.now();
    state.swingAngle = 20;
    state.swingVel = 3;
    for (const elapsed of [0, 16, 60, 120, 1000]) {
      vi.advanceTimersByTime(elapsed);
      state.paint();
      for (const image of [pet.image, pet.canvas]) {
        const style = (image as unknown as Stil).style;
        expect(style.translate).toBe("0px 0px");
        expect(style.transform).not.toMatch(/translate/);
        expect(style.transformOrigin).toBe(`${220 / 384 * 100}% 0%`);
        expect(style.height).toBe("256px");
        expect(style.top).toBe("auto");
        expect(style.bottom).toBe("0px");
      }
    }
  });

  it("keeps a square hand frame at the bottom of a balloon window and resets on landing", () => {
    const pet = new AfuPet(vi.fn());
    const state = pet as unknown as { paint(): void };
    for (const width of [256, 255.5, 300]) {
      window.innerWidth = width;
      window.innerHeight = width + 158;
      pet.model.setPose("surukleme");
      state.paint();
      expect(cizim(pet).height).toBe(`${width}px`);
      expect(cizim(pet).translate).toBe("0px 0px");
      expect(cizim(pet).bottom).toBe("0px");
    }
    expect(pet.previous.animate).not.toHaveBeenCalled();
    pet.model.setPose("bekleme");
    state.paint();
    expect(cizim(pet).height).toBe("");
    expect(cizim(pet).top).toBe("");
    expect(cizim(pet).bottom).toBe("");
  });

});
