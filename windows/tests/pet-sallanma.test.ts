import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AfuPet } from "../src/afu/pet";
import {
  SARKAC_HIZ_TAM,
  SARKAC_MAX_ACI,
  SARKAC_NEFES_MS,
  SARKAC_NEFES_PIK,
  SARKAC_UZAMA_MAX,
  sarkac,
  sarkacHedef,
  sarkacNefes,
  sarkacUzama,
} from "../src/afu/pet";

const KARE = 1 / 60;

describe("P4 enseden tutma sarkacı — sınırlar", () => {
  it("hedef açı ±25° ile sınırlanır", () => {
    expect(sarkacHedef(SARKAC_HIZ_TAM)).toBe(-SARKAC_MAX_ACI);
    expect(sarkacHedef(-SARKAC_HIZ_TAM)).toBe(SARKAC_MAX_ACI);
    expect(sarkacHedef(99999)).toBe(-SARKAC_MAX_ACI);
    expect(sarkacHedef(0)).toBe(0);
    expect(sarkacHedef(Number.NaN)).toBe(0);
    expect(sarkacHedef(Number.POSITIVE_INFINITY)).toBe(-SARKAC_MAX_ACI);
  });

  it("adım ne kadar büyük olursa olsun açı sınırı aşılmaz", () => {
    let durum = { adim: 0, hiz: 0 };
    for (let i = 0; i < 300; i++) durum = sarkac(durum.adim, durum.hiz, KARE, SARKAC_MAX_ACI * 10, true);
    expect(durum.adim).toBeLessThanOrEqual(SARKAC_MAX_ACI);
    expect(durum.adim).toBeGreaterThan(SARKAC_MAX_ACI - 0.01);
    expect(Math.abs(durum.hiz)).toBeLessThanOrEqual(SARKAC_MAX_ACI);

    let ters = { adim: 0, hiz: 0 };
    for (let i = 0; i < 300; i++) ters = sarkac(ters.adim, ters.hiz, KARE, -SARKAC_MAX_ACI * 10, true);
    expect(ters.adim).toBeGreaterThanOrEqual(-SARKAC_MAX_ACI);
    expect(ters.adim).toBeLessThan(-SARKAC_MAX_ACI + 0.01);
  });

  it("geçersiz sayı girdide sarkaç güvenli biçimde sıfırlanır", () => {
    expect(sarkac(Number.NaN, 1, KARE)).toEqual({ adim: 0, hiz: 0 });
    expect(sarkac(1, Number.NaN, KARE)).toEqual({ adim: 0, hiz: 0 });
    expect(sarkac(1, 1, Number.NaN)).toEqual({ adim: 0, hiz: 0 });
  });

  it("dt<=0 durumu değiştirmez", () => {
    expect(sarkac(10, 2, 0)).toEqual({ adim: 10, hiz: 0 });
    expect(sarkac(10, 2, -1)).toEqual({ adim: 10, hiz: 0 });
  });

  it("çok büyük dt patlamaz (kare sayısı sınırlanır)", () => {
    const durum = sarkac(0, 0, 30, 25, true);
    expect(Number.isFinite(durum.adim)).toBe(true);
    expect(Number.isFinite(durum.hiz)).toBe(true);
    expect(Math.abs(durum.adim)).toBeLessThanOrEqual(SARKAC_MAX_ACI);
  });
});

describe("P4 enseden tutma sarkacı — hız → açı", () => {
  it("yatay hız ters yöne eğilme verir ve doğrusaldır", () => {
    expect(sarkacHedef(300)).toBeCloseTo(-6.25, 6);
    expect(sarkacHedef(600)).toBeCloseTo(-12.5, 6);
    // sağa giden fare sola, sola giden fare sağa eğilir
    expect(Math.sign(sarkacHedef(500))).toBe(-1);
    expect(Math.sign(sarkacHedef(-500))).toBe(1);
    // doğrusal: yarı hız yarı açı
    expect(sarkacHedef(400)).toBeCloseTo(sarkacHedef(800) / 2, 6);
  });

  it("yumuşatılmış hız sarkacı hedef yönünde çeker", () => {
    let durum = { adim: 0, hiz: 0 };
    const hedef = sarkacHedef(SARKAC_HIZ_TAM);
    for (let i = 0; i < 120; i++) durum = sarkac(durum.adim, durum.hiz, KARE, hedef, true);
    expect(durum.adim).toBeCloseTo(hedef, 1);
    // hız ters yönde dönerse açı ters yöne gider
    let geri = { adim: 0, hiz: 0 };
    for (let i = 0; i < 60; i++) geri = sarkac(geri.adim, geri.hiz, KARE, 25, true);
    for (let i = 0; i < 20; i++) geri = sarkac(geri.adim, geri.hiz, KARE, -25, true);
    expect(geri.adim).toBeLessThan(0);
  });
});

describe("P4 enseden tutma sarkacı — sönüm ve dönüş", () => {
  it("bırakılınca açı sönerek dik konuma döner", () => {
    let durum = { adim: 22, hiz: 0 };
    let tepe = Math.abs(durum.adim);
    for (let i = 0; i < 240; i++) {
      durum = sarkac(durum.adim, durum.hiz, KARE);
      // sönümlü: daha önce ulaşılan zirveden yukarı çıkmaz
      expect(Math.abs(durum.adim)).toBeLessThanOrEqual(tepe + 1e-9);
      tepe = Math.max(tepe, Math.abs(durum.adim));
    }
    expect(Math.abs(durum.adim)).toBeLessThan(0.01);
    expect(Math.abs(durum.hiz)).toBeLessThan(0.01);
  });

  it("bırakılınca ilk yarım saniyede belirgin biçimde söner", () => {
    let durum = { adim: 22, hiz: 0 };
    for (let i = 0; i < 30; i++) durum = sarkac(durum.adim, durum.hiz, KARE);
    expect(Math.abs(durum.adim)).toBeLessThan(22 * 0.6);
  });

  it("hız devam ederken aşırı salınım yok, salınım sınırlı", () => {
    let durum = { adim: 22, hiz: 3 };
    let tepe = Math.abs(durum.adim);
    for (let i = 0; i < 240; i++) {
      durum = sarkac(durum.adim, durum.hiz, KARE);
      tepe = Math.max(tepe, Math.abs(durum.adim));
      expect(Math.abs(durum.adim)).toBeLessThanOrEqual(SARKAC_MAX_ACI);
    }
    expect(tepe).toBeLessThan(22 * 1.5);
    expect(Math.abs(durum.adim)).toBeLessThan(0.01);
  });

  it("tutarken de hedefe oturur ama aşmaz (yay + sönüm)", () => {
    let durum = { adim: 0, hiz: 0 };
    for (let i = 0; i < 40; i++) durum = sarkac(durum.adim, durum.hiz, KARE, 20, true);
    // 40 karede hedefe yakınsar, aşmaz
    expect(durum.adim).toBeGreaterThan(15);
    expect(durum.adim).toBeLessThanOrEqual(20);
  });

  it("kare hızından bağımsız: aynı süre, farklı adım → aynı sonuca yakınsar", () => {
    let kareli = { adim: 0, hiz: 0 };
    for (let i = 0; i < 60; i++) kareli = sarkac(kareli.adim, kareli.hiz, KARE, 25, true);
    let uzun = { adim: 0, hiz: 0 };
    for (let i = 0; i < 20; i++) uzun = sarkac(uzun.adim, uzun.hiz, 0.05, 25, true);
    expect(Math.abs(kareli.adim - uzun.adim)).toBeLessThan(1.5);
    expect(Math.abs(kareli.adim)).toBeLessThanOrEqual(SARKAC_MAX_ACI);
    expect(Math.abs(uzun.adim)).toBeLessThanOrEqual(SARKAC_MAX_ACI);
  });
});

describe("P4 enseden tutma — uzama ve nefes", () => {
  it("hızlı sallamada scaleY 1,06'yı geçmez", () => {
    expect(sarkacUzama(0)).toBe(1);
    expect(sarkacUzama(2)).toBeCloseTo(1.02, 6);
    expect(sarkacUzama(500)).toBe(SARKAC_UZAMA_MAX);
    expect(sarkacUzama(-500)).toBe(SARKAC_UZAMA_MAX);
    expect(sarkacUzama(Number.NaN)).toBe(1);
    for (const h of [-10000, -37, -3, 0, 1, 5, 60, 12345]) {
      expect(sarkacUzama(h)).toBeLessThanOrEqual(SARKAC_UZAMA_MAX);
      expect(sarkacUzama(h)).toBeGreaterThanOrEqual(1);
    }
  });

  it("nefes 0,6 sn periyotlu ve hafif", () => {
    expect(sarkacNefes(0).nefes).toBeCloseTo(0, 6);
    expect(sarkacNefes(SARKAC_NEFES_MS / 4).nefes).toBeCloseTo(SARKAC_NEFES_PIK, 6);
    expect(sarkacNefes(SARKAC_NEFES_MS / 2).nefes).toBeCloseTo(0, 6);
    expect(sarkacNefes((SARKAC_NEFES_MS * 3) / 4).nefes).toBeCloseTo(-SARKAC_NEFES_PIK, 6);
    expect(sarkacNefes(SARKAC_NEFES_MS).nefes).toBeCloseTo(0, 6);
    // nefes sıfırdan büyük, sonra aynı yönde döner (kalıcı kayma yok)
    for (let t = 0; t <= SARKAC_NEFES_MS * 4; t += 10) {
      const { nefes, bacak } = sarkacNefes(t);
      expect(Math.abs(nefes)).toBeLessThanOrEqual(SARKAC_NEFES_PIK + 1e-9);
      expect(Math.abs(bacak)).toBeLessThanOrEqual(SARKAC_NEFES_PIK * 0.35 + 1e-9);
    }
    expect(sarkacNefes(Number.NaN)).toEqual({ nefes: 0, bacak: 0 });
  });
});

describe("P4 enseden tutma — hareket azaltma tercihi", () => {
  class ElementStub {
    children: ElementStub[] = [];
    className = "";
    hidden = false;
    dataset = {};
    style = { setProperty: vi.fn(), transformOrigin: "", translate: "", scale: "", transform: "" };
    listeners = new Map<string, ((event: unknown) => void)[]>();
    src = "";
    setAttribute = vi.fn();
    getAttribute = vi.fn(() => "");
    append(...children: ElementStub[]) { this.children.push(...children); }
    replaceChildren(...children: ElementStub[]) { this.children = children; }
    addEventListener(name: string, handler: (event: unknown) => void) { this.listeners.set(name, [...this.listeners.get(name) ?? [], handler]); }
    removeEventListener() {}
    getAnimations() { return []; }
    animate = vi.fn(() => ({ cancel: vi.fn(), play: vi.fn(), pause: vi.fn() }));
    getBoundingClientRect() { return { left: 20, bottom: 80, top: 20, width: 256, height: 256 }; }
    querySelector() { return undefined; }
    contains() { return false; }
    focus = vi.fn();
    setPointerCapture = vi.fn();
    releasePointerCapture = vi.fn();
  }

  let reduced = false;
  beforeEach(() => {
    vi.useFakeTimers();
    reduced = false;
    const body = new ElementStub();
    vi.stubGlobal("document", {
      body,
      createElement: () => new ElementStub(),
      createTextNode: (text: string) => Object.assign(new ElementStub(), { textContent: text }),
      addEventListener: vi.fn(),
      hidden: false,
    });
    const winStub = new ElementStub();
    vi.stubGlobal("window", {
      ...winStub,
      screenX: 0,
      innerWidth: 720,
      innerHeight: 320,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("matchMedia", () => ({ get matches() { return reduced; }, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal("Image", class { src = ""; });
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => globalThis.setTimeout(cb, 16) as unknown as number);
    vi.stubGlobal("cancelAnimationFrame", (id: number) => globalThis.clearTimeout(id));
    vi.stubGlobal("performance", { now: () => Date.now() });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  function tutVeBoya(reduce: boolean) {
    reduced = reduce;
    const pet = new AfuPet(vi.fn(), vi.fn(), vi.fn());
    pet.setActive(true);
    pet.model.setPose("surukleme");
    pet.onEvent({ kind: "JOB_FINISHED", taskId: "j", agent: "codex" } as never);
    return pet.image.style.transform;
  }

  it("hareket azaltma kapalıyken sallanma uygulanır", () => {
    expect(tutVeBoya(false)).toMatch(/rotate\(-?[\d.]+deg\)/);
    expect(tutVeBoya(false)).toMatch(/scaleY\(/);
  });

  it("hareket azaltma açıkken sallanma uygulanmaz", () => {
    expect(tutVeBoya(true)).toBe("");
  });
});
