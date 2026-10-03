import { describe, expect, it, vi } from "vitest";
import { KonusanAfu, Mesaj, balonOlustur } from "../src/message/message";

class El {
  className = ""; _textContent = ""; hidden = false; title = ""; children: El[] = [];
  get textContent(): string { return this._textContent || this.children.map(c => c.textContent).join(" "); }
  set textContent(v: string) { this._textContent = v; }
  style: Record<string, string> = {};
  handlers: Record<string, Function> = {};
  remove() {}
  append(...els: El[]) { this.children.push(...els); }
  prepend(...els: El[]) { this.children.unshift(...els); }
  replaceChildren(...els: El[]) { this.children = els; }
  setAttribute() {};
  addEventListener(event: string, fn: Function) { this.handlers[event] = fn; }
  dispatchEvent(ev: { type: string; [key: string]: unknown }) { if (this.handlers[ev.type]) this.handlers[ev.type](ev); }
  querySelector(sel: string) { return this.children.find(c => c.className.includes(sel.replace(".", ""))) || null; }
  classList = { toggle: () => {} };
}

const fakeDoc = { createElement: (tag: string) => new El() } as unknown as Document;
globalThis.document = fakeDoc;

describe("R3B1 Pet Balon ve Bildirim", () => {
  it("pet modunda bildirim -> temiz balon; balona tık -> kart metni ve Okudum görünür", () => {
    const pet = document.createElement("div");
    const petUst = document.createElement("div");
    const karakter = document.createElement("div");
    const overview = document.createElement("div");
    let acCagrildi = false;

    const m = new KonusanAfu(pet, petUst, karakter, overview, () => { acCagrildi = true; });
    m.guncelle("pet", true);

    const mesaj: Mesaj = {
      surum: 1, id: "test1", ajan: "codex", tur: "bilgi", zaman: Date.now(),
      metin: "━━━\n**Başlık**\n# Liste\n- İlk `madde`\n- İkinci\n═─━\nEk metin..."
    };

    m.ekle(mesaj);

    // Kart başlangıçta kapalı olmalı
    expect(m.detay.hidden).toBe(true);
    expect(acCagrildi).toBe(false);

    // Pet üstünde balon var mı?
    const balon = petUst.querySelector(".afu-konusma-balonu") as HTMLElement;
    expect(balon).not.toBeNull();

    const textContent = balon.textContent || "";
    expect(textContent).not.toContain("━");
    expect(textContent).not.toContain("`");
    // İlk madde
    expect(textContent).toContain("İlk madde");

    // Balona tıkla
    balon.dispatchEvent({ type: "click", bubbles: true, stopPropagation: () => {} });

    // Kart açıldı
    // Kart açıldı
    expect(m.detay.hidden).toBe(false);
    expect(acCagrildi).toBe(true);

    // Ek başlık yok; orijinal içerik ve kapatma düğmesi korunur.
    expect(m.detay.textContent).not.toContain("Ayrıntı");
    expect(m.detay.textContent).toContain("Okudum");
    expect(m.detay.textContent).toContain("Ek metin...");
  });
});
