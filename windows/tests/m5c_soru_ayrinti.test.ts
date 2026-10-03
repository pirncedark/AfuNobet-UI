import { describe, expect, it } from "vitest";
import { kartOlustur, sorulariAyikla } from "../src/question/question";

class FakeElement {
  children: FakeElement[] = [];
  textContent = "";
  className = "";
  hidden = false;
  disabled = false;
  type = "";
  attrs: Record<string, string> = {};
  listeners: Record<string, ((event: unknown) => void)[]> = {};

  constructor(public tag: string) {}

  append(...children: FakeElement[]) {
    this.children.push(...children);
  }

  setAttribute(name: string, value: string) {
    this.attrs[name] = value;
  }

  getAttribute(name: string): string | undefined {
    return this.attrs[name];
  }

  addEventListener(name: string, listener: (event: unknown) => void) {
    const list = this.listeners[name] ?? [];
    list.push(listener);
    this.listeners[name] = list;
  }

  fire(name: string, event: unknown = {}) {
    for (const listener of this.listeners[name] ?? []) {
      listener(event);
    }
  }

  all(): FakeElement[] {
    return [this, ...this.children.flatMap(child => child.all())];
  }

  find(className: string): FakeElement[] {
    return this.all().filter(item => item.className.split(" ").includes(className));
  }
}

const fakeDocument = {
  createElement: (tag: string) => new FakeElement(tag),
} as unknown as Pick<Document, "createElement">;

describe("M5C: Soru kartı uzun ayrıntı metni", () => {
  it("60 satırlık ayrıntı metni ile kart oluşturur, tıklamada açılır/kapanır, aria ve metin durumlarını yönetir", () => {
    const uzunAyrinti = Array.from({ length: 60 }, (_, i) => `Satır ${i + 1}: Detay bilgisi buradadır`).join("\n");
    const [soru] = sorulariAyikla([
      {
        id: "soru-60-satir",
        ajan: "codex",
        tur: "komut",
        baslik: "Uzun detaylı komut çalıştırılsın mı?",
        metin: "Detayları kontrol ederek onaylayınız.",
        ayrinti: uzunAyrinti,
        secenekler: [
          { id: "onayla", etiket: "Onayla" },
          { id: "reddet", etiket: "Reddet" },
        ],
        serbestMetin: false,
        gizli: false,
        olusturma: 100,
        sonGecerlilik: 50000,
      },
    ], 0);

    const kart = kartOlustur(fakeDocument, soru, async () => {}) as unknown as FakeElement;

    const pre = kart.find("soru-ayrinti")[0];
    const dugme = kart.find("soru-ayrinti-dugme")[0];

    expect(pre).toBeDefined();
    expect(pre.tag).toBe("pre");
    expect(pre.textContent).toBe(uzunAyrinti);
    expect(pre.hidden).toBe(true);

    expect(dugme).toBeDefined();
    expect(dugme.getAttribute("aria-expanded")).toBe("false");
    expect(dugme.textContent).toBe("Ayrıntı");

    // Düğmeye tıkla -> pre göründüğünü doğrula, aria-expanded='true', metin 'Ayrıntıyı kapat'
    dugme.fire("click");
    expect(pre.hidden).toBe(false);
    expect(dugme.getAttribute("aria-expanded")).toBe("true");
    expect(dugme.textContent).toBe("Ayrıntıyı kapat");

    // Tekrar tıkla -> gizli, metin 'Ayrıntı', aria-expanded='false'
    dugme.fire("click");
    expect(pre.hidden).toBe(true);
    expect(dugme.getAttribute("aria-expanded")).toBe("false");
    expect(dugme.textContent).toBe("Ayrıntı");
  });
});
