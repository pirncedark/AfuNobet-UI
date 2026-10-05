// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { mascotScale, MASCOT_VISIBLE_H, KART_OLCEK, panelScale, mascotDesignHeight } from "../src/core/layout";
import { PET_BOYUT, PET_KAFA, PET_KAFA_PX, SEKANSLAR, sigdir, petKafaOlcegi, AfuPet } from "../src/afu/pet";
import { IFADELER } from "../src/afu/ifade";
import { AfuCharacter } from "../src/afu/character";
describe("consistent visible mascot alpha", () => {
  it.each([{w:1080,k:1,body:1},{w:818,k:1.32,body:1},{w:420,k:1,body:1},{w:420,k:1,body:1.5}])("normalizes the chat static image in wide and narrow CSS modes %j", ({w,k,body}) => {
    const cssH = mascotDesignHeight(w,k,body);
    const renderedScale = (w <= 719 ? 1 : panelScale(w) * KART_OLCEK) * k * body;
    expect(cssH * renderedScale).toBeCloseTo(170);
  });
  it.each(["idle_normal", "durum/ucus", "durum/bosta_nefes"])("fits %s at the compact target without clipping", frame => {
    const bounds = PET_BOYUT[frame].kutu;
    const scale = mascotScale(bounds, 256);
    const fitted = sigdir(bounds, scale, (0.5 - (bounds[0] + bounds[2]) / 2) * 256 * scale, (1 - bounds[3]) * 256 * scale, 256, 6, 256, 128, 0);
    expect((bounds[3] - bounds[1]) * 256 * fitted.olcek).toBeCloseTo(MASCOT_VISIBLE_H);
    expect((bounds[1] - 1) * 256 * fitted.olcek + 256 + fitted.y).toBeGreaterThanOrEqual(0);
    expect((bounds[3] - 1) * 256 * fitted.olcek + 256 + fitted.y).toBeLessThanOrEqual(256);
  });
  it.each([{ w: 818, dpr: 1.32, native: 1 }, { w: 420, dpr: 1.5, native: 1.5 }])("matches native height under fit and DPI mismatch %j", ({w,dpr,native}) => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn() }));
    vi.stubGlobal("localStorage", { getItem: (k: string) => k === "afunobet-hareket-zorla-v1" ? "false" : null, setItem() {} }); // "Hep hareketli" kapalı
    const hitK = dpr / native, drawK = panelScale(w) * KART_OLCEK * hitK;
    const character = new AfuCharacter(); character.sync("idle", false, false); character.setDisplayScale(drawK);
    expect(parseFloat(character.image.style.height) * drawK).toBeCloseTo(MASCOT_VISIBLE_H);
    const pet = new AfuPet(() => {}); pet.setDisplayScale(hitK); (pet as any).paint();
    const bounds = PET_BOYUT["idle_normal"].kutu;
    expect(PET_KAFA["idle_normal"] * 256 * Number(pet.image.style.scale) * hitK).toBeCloseTo(PET_KAFA_PX);
    expect(parseFloat(character.el.style.height) * drawK).toBeCloseTo(184);
    vi.unstubAllGlobals();
  });
  it("panel animated alpha matches mini pet after the panel zoom", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const character = new AfuCharacter(); character.sync("idle", false, false);
    const bounds = PET_BOYUT["durum/bosta_nefes"].kutu;
    const visible = (bounds[3] - bounds[1]) * 184 * Number(character.animImage.style.scale) * KART_OLCEK;
    expect(visible).toBeCloseTo(MASCOT_VISIBLE_H);
    character.sync("idle", true, false);
    expect(character.animImage.style.scale).toBe("");
    vi.unstubAllGlobals();
  });
});

describe("1.0.2 mini pet: half size, same size in every animation", () => {
  const kareler = [...new Set([...Object.values(SEKANSLAR).flat(), ...IFADELER.flatMap(ifade => ifade.kareler)].map(item => item.kare))];
  it("measures the head of every frame the pet can show", () => {
    for (const kare of [...kareler, "idle_normal"]) expect(PET_KAFA[kare], kare).toBeGreaterThan(0);
  });
  it("is half the old size (head ~145 px → 72 px)", () => {
    expect(PET_KAFA_PX).toBe(72);
  });
  it.each(kareler)("%s: head is PET_KAFA_PX and the frame fits the window without shrinking", kare => {
    const kutu = PET_BOYUT[kare].kutu;
    const olcek = petKafaOlcegi(kare, kutu, 256);
    expect(PET_KAFA[kare] * 256 * olcek).toBeCloseTo(PET_KAFA_PX);
    const fitted = sigdir(kutu, olcek, (0.5 - (kutu[0] + kutu[2]) / 2) * 256 * olcek, (1 - kutu[3]) * 256 * olcek, 256, 6, 256, 128, 0);
    expect(fitted.olcek).toBeCloseTo(olcek);
  });
});
