import { expect, it } from "vitest";
import { PetModel } from "../src/afu/pet";

it("hover olunca ense animasyonu başlar ve bitince döner", () => {
    const p = new PetModel(0);
    expect(p.pose).toBe("bekleme");
    
    p.hover(true);
    expect(p.pose).toBe("ense_hover");
    expect(p.frame).toBe("durum/ense_tutma");
    
    p.hover(false);
    expect(p.pose).toBe("bekleme");
});

it("uyku durumunda hover tepki vermez", () => {
    const p = new PetModel(0);
    p.setPose("uyku");
    expect(p.pose).toBe("uyku");
    
    p.hover(true);
    // Uyku durumunda hover bir şey yapmamalı
    expect(p.pose).toBe("uyku");
    
    p.hover(false);
    expect(p.pose).toBe("uyku");
});
