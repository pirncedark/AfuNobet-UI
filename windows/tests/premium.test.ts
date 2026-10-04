 // Mock DOM before imports
 globalThis.document = {
   createElement: (tag: string) => ({
     tagName: tag,
     setAttribute: () => {},
     getAttribute: () => null,
     addEventListener: () => {},
     append: () => {},
     style: { setProperty: () => {} },
     dataset: {},
     classList: { toggle: () => {}, add: () => {}, remove: () => {} },
   }),
   addEventListener: () => {},
   hidden: false,
 } as unknown as Document;
 globalThis.matchMedia = () => ({ matches: false } as unknown as MediaQueryList);
 globalThis.Image = class {} as unknown as typeof Image;
 
import { describe, expect, it } from "vitest";
import { getDurum } from "../src/afu/character";
import { AfuCharacter } from "../src/afu/character";

describe("Premium Gorunum: durum -> sinif eslemesi", () => {
  it("working/studying -> calisiyor", () => {
    expect(getDurum("working")).toBe("calisiyor");
    expect(getDurum("studying")).toBe("calisiyor");
    expect(getDurum("catching")).toBe("calisiyor");
  });

  it("thinking/question/listening -> dusunuyor", () => {
    expect(getDurum("thinking")).toBe("dusunuyor");
    expect(getDurum("question")).toBe("dusunuyor");
    expect(getDurum("listening")).toBe("dusunuyor");
  });

  it("error/alert/quota_paused -> hata", () => {
    expect(getDurum("error")).toBe("hata");
    expect(getDurum("alert")).toBe("hata");
    expect(getDurum("quota_paused")).toBe("hata");
  });

  it("success/happy -> basari", () => {
    expect(getDurum("success")).toBe("basari");
    expect(getDurum("happy")).toBe("basari");
  });

  it("awaiting -> onay-bekliyor", () => {
    expect(getDurum("awaiting")).toBe("onay-bekliyor");
  });

  it("idle/others -> bosta", () => {
    expect(getDurum("idle")).toBe("bosta");
    expect(getDurum("sleeping")).toBe("bosta");
    expect(getDurum("waking")).toBe("bosta");
    expect(getDurum("leaving")).toBe("bosta");
  });

  it("AfuCharacter.sync() dataset.durum uygular", () => {
    const character = new AfuCharacter();
    character.sync("working", false, false, true);
    expect(character.el.dataset.durum).toBe("calisiyor");

    character.sync("error", false, false, true);
    expect(character.el.dataset.durum).toBe("hata");
  });
});
