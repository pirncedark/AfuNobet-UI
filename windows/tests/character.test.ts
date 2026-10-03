import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

class FakeElement {
  children: FakeElement[] = [];
  src = "";
  className = "";
  hidden = false;
  style: Record<string, unknown> = { setProperty: vi.fn() };
  dataset: Record<string, string> = {};
  attrs = new Map<string, string>();
  classes = new Set<string>();

  get classList() {
    return { toggle: (cls: string, force: boolean) => force ? this.classes.add(cls) : this.classes.delete(cls) };
  }
  getAttribute(k: string) { return k === "src" ? this.src : (this.attrs.get(k) ?? null); }
  setAttribute(k: string, v: string) {
    this.attrs.set(k, v);
    if (k === "src") this.src = v;
  }
  addEventListener() {}
  append() {}
  animate() { return { onfinish: null, oncancel: null, cancel: vi.fn() }; }
}

beforeEach(() => {
  vi.stubGlobal("document", {
    createElement: () => new FakeElement(),
    createTextNode: () => new FakeElement(),
    addEventListener: vi.fn(),
    hidden: false,
  });
  vi.stubGlobal("window", { setTimeout: vi.fn(), clearTimeout: vi.fn() });
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  vi.stubGlobal("Image", class { src = ""; });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import { AfuCharacter } from "../src/afu/character";

describe("AfuCharacter animasyon eşleme ve statik yedek", () => {
  it("görünür olduğunda doğru animasyon dosyasını yükler", () => {
    const character = new AfuCharacter();
    
    // idle -> bosta_nefes.webp
    character.sync("idle", false, false, true);
    expect(character.animImage.src).toMatch(/bosta_nefes\.webp$/);
    
    // working -> dusunme.webp
    character.sync("working", false, false, true);
    expect(character.animImage.src).toMatch(/dusunme\.webp$/);
    
    // studying -> calisma_yazma.webp (SONUC_ANIM3: eskiden kitap_buyu)
    character.sync("studying", false, false, true);
    expect(character.animImage.src).toMatch(/calisma_yazma\.webp$/);
    
    // success -> basari.webp
    character.sync("success", false, false, true);
    expect(character.animImage.src).toMatch(/basari\.webp$/);
    
    // question -> sasirma.webp
    character.sync("question", false, false, true);
    expect(character.animImage.src).toMatch(/sasirma\.webp$/);
  });

  it("görünür olmadığında animasyonu boşaltır (src='') ve statik görseli gösterir", () => {
    const character = new AfuCharacter();
    
    character.sync("working", false, false, false);
    
    // animImage src boşaltılmalı
    expect(character.animImage.getAttribute("src")).toBe("");
    expect(character.animImage.style.display).toBe("none");
    
    // statik görsel yüklü olmalı
    expect(character.image.getAttribute("src")).toMatch(/front\.png$/);
    expect(character.image.style.opacity).toBe("1");
  });
  
  it("animasyon yüklendiğinde statik yedeği gizler", () => {
    const character = new AfuCharacter();
    
    character.sync("success", false, false, true);
    
    // animasyon devrede
    expect(character.animImage.style.display).toBe("block");
    
    // statik gizlenmiş
    expect(character.image.style.opacity).toBe("0");
  });
  
  it("kompakt ve karşılama durumlarını doğru ayırır", () => {
    const character = new AfuCharacter();
    
    // greeting
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.1);
    character.sync("idle", false, true, true);
    expect(character.animImage.src).toMatch(/selam_masa\.webp$/);
    randomSpy.mockRestore();
    
    // compact + success -> gulumseme.webp
    character.sync("success", true, false, true);
    expect(character.animImage.src).toMatch(/gulumseme\.webp$/);
  });
});
