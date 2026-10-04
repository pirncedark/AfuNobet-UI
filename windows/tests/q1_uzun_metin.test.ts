// Q1: uzun metin + TR/EN dayanıklılığı (F8, F13).
// Kural: görünen metin "…" ile kısalır, tam metin title'da kalır, düzen bozulmaz.
import { describe, expect, it } from "vitest";
import { clipBlock, clipText } from "../src/core/metin";
import { UI_EN, UI_KEYS, UI_TR, language, setLanguage, ui, uiFit } from "../src/core/labels";
import { balonMetni, balonOlustur, type Mesaj } from "../src/message/message";
import { kartOlustur, sorulariAyikla, type Soru } from "../src/question/question";

/** Testlerde DOM yok (jsdom kullanılmaz): küçük sahte belge, sınıfla arama yeter. */
class Fake {
  children: Fake[] = [];
  textContent = "";
  className = "";
  title = "";
  hidden = false;
  disabled = false;
  type = ""; value = ""; placeholder = ""; maxLength = 0; autocomplete = "";
  attrs = new Map<string, string>();
  constructor(public tag: string) {}
  append(...c: Fake[]) { this.children.push(...c); }
  setAttribute(k: string, v: string) { this.attrs.set(k, v); }
  addEventListener() { /* dinleyici gerekmiyor */ }
  all(): Fake[] { return [this, ...this.children.flatMap(c => c.all())]; }
  find(sinif: string): Fake { const e = this.all().find(x => x.className.split(" ").includes(sinif)); if (!e) throw new Error(`sınıf yok: ${sinif}`); return e; }
  var(sinif: string): Fake | null { return this.all().find(x => x.className.split(" ").includes(sinif)) ?? null; }
}
const belge = { createElement: (t: string) => new Fake(t) } as unknown as Pick<Document, "createElement">;

const UZUN_URL = "https://ornek.afunobet.local/raporlar/2026/10/03/otomatik-kalite-guvenlik-ve-dogrulama-raporu-ayrinti-belge-indir-baglantisi";
const BOSLUKSUZ = "cokbirkicikkelimebirliktebitenboybosluksunuzveryverylongsinglewordtoken";
const uzunGorevAdi = `Uzun görev adı: ${UZUN_URL} ve ${BOSLUKSUZ} ${"ayrıntı ".repeat(40)}`;

const mesaj = (metin: string): Mesaj => ({ surum: 1, id: "m1", ajan: "codex", tur: "bilgi", metin, zaman: 0 });
const soru = (metin: string, baslik = uzunGorevAdi): Soru => ({
  id: "q1", ajan: "claude", tur: "soru", baslik, metin, ayrinti: null,
  secenekler: [{ id: "evet", etiket: `Evet, devam et ${"ve ayrıca çok uzun bir seçenek etiketi ".repeat(6)}` }],
  serbestMetin: true, gizli: false, olusturma: 0, sonGecerlilik: Date.now() + 60_000,
});
const gonder = async () => {};

describe("Q1 kırpma (clipText)", () => {
  it("300+ karakterli metni kırpır, tam metni title'da tutar", () => {
    const r = clipText(uzunGorevAdi, 60);
    expect(Array.from(r.text).length).toBeLessThanOrEqual(60);
    expect(r.text.endsWith("…")).toBe(true);
    expect(r.title).toBe(uzunGorevAdi.replace(/\s+/g, " ").trim());
  });
  it("kısa metne dokunmaz", () => {
    expect(clipText("Hazır", 60)).toEqual({ text: "Hazır", title: "Hazır" });
  });
  it("boşluksuz uzun kelime ve uzun URL'de düzen bozulmaz", () => {
    for (const deger of [BOSLUKSUZ, UZUN_URL]) {
      const r = clipText(deger, 24);
      expect(Array.from(r.text).length).toBeLessThanOrEqual(24);
      expect(r.text.endsWith("…")).toBe(true);
      expect(r.title).toBe(deger);
    }
  });
  it("Türkçe karakterler ve emoji bozulmaz (kod noktası güvenli)", () => {
    const r = clipText("İstanbul şüğü çğı öü ÖÜ Ğ Ş 😀".repeat(20), 12);
    expect(Array.from(r.text).length).toBe(12);
    expect(r.title).toContain("İ");
  });
});

describe("Q1 çok satırlı kırpma (clipBlock)", () => {
  it("satır sonlarını korur, taşarsa '…' ekler", () => {
    const metin = Array.from({ length: 80 }, (_, i) => `satır ${i} ${UZUN_URL}`).join("\n");
    const r = clipBlock(metin, 600);
    expect(r.text.length).toBeLessThanOrEqual(600);
    expect(r.text.endsWith("…")).toBe(true);
    expect(r.title).toBe(metin);
  });
  it("kısa çok satırlı metin olduğu gibi kalır", () => {
    expect(clipBlock("bir\niki", 600).text).toBe("bir\niki");
  });
});

describe("Q1 ajan mesajı (balon)", () => {
  it("balon gövdesi kırpılır, tam mesaj title'da görünür", () => {
    const m = mesaj(`Codex: ${uzunGorevAdi}`);
    expect(balonMetni(m).govde.endsWith("…")).toBe(true);
    const balon = balonOlustur(belge, m, () => {});
    expect(balon.find("afu-balon-metin").textContent.endsWith("…")).toBe(true);
    expect(balon.title).toBe(`Codex: ${uzunGorevAdi}`.replace(/\s+/g, " ").trim());
  });
  it("kısa mesajda title yazılmaz (gereksiz tooltip yok)", () => {
    const balon = balonOlustur(belge, mesaj("Bitti."), () => {});
    expect(balon.find("afu-balon-metin").title).toBe("");
  });
});

describe("Q1 soru kartı", () => {
  it("başlık ve metin kırpılır, tam metin title'da durur", () => {
    const s = soru(`${uzunGorevAdi}\n${UZUN_URL}`);
    const kart = kartOlustur(belge, s, gonder, 1);
    const baslik = kart.find("soru-baslik");
    const metin = kart.find("soru-metin");
    expect(baslik.textContent.endsWith("…")).toBe(true);
    expect(baslik.title).toBe(s.baslik.replace(/\s+/g, " ").trim());
    expect(metin.textContent.length).toBeLessThanOrEqual(600);
    expect(metin.title).toBe(s.metin.replace(/\s+$/, ""));
    // Uzun seçenek etiketi de kırpılır; tam etiket title'da.
    const dugme = kart.find("soru-dugme");
    expect(dugme.title.length).toBeGreaterThan(dugme.textContent.length);
  });
  it("kısa soru kırpılmaz, title yazılmaz", () => {
    const kart = kartOlustur(belge, soru("Devam edeyim mi?", "Onay"), gonder, 1);
    expect(kart.find("soru-baslik").textContent).toBe("Onay");
    expect(kart.find("soru-baslik").title).toBe("");
    expect(kart.find("soru-metin").title).toBe("");
  });
  it("çok uzun yükten gelen soru yine çizilir", () => {
    const [s] = sorulariAyikla([{ ...soru(`${uzunGorevAdi}\n${BOSLUKSUZ}`), ayrinti: UZUN_URL }], Date.now());
    expect(s.metin.length).toBeGreaterThan(300);
    expect(kartOlustur(belge, s, gonder, 1).find("soru-karti").tag).toBe("section");
  });
});

describe("Q1 TR/EN dayanıklılığı (labels.ts)", () => {
  it("iki sözlükte de aynı anahtarlar var, hiçbiri boş değil", () => {
    expect(Object.keys(UI_EN).sort()).toEqual([...UI_KEYS].sort());
    for (const key of UI_KEYS) {
      expect(UI_TR[key].trim().length).toBeGreaterThan(0);
      expect(UI_EN[key].trim().length).toBeGreaterThan(0);
    }
  });
  it("Türkçe karakterler korunur", () => {
    expect(UI_TR.collapse).toBe("Küçült");
    expect(UI_TR.retryFail).toContain("Hâlâ");
    expect(UI_TR.ready).toBe("Afu hazır");
  });
  it("uzun İngilizce karşılık kırpılır, tam metin title'da kalır", () => {
    setLanguage("en");
    try {
      expect(language()).toBe("en");
      expect(ui("retryFail").length).toBeGreaterThan(24);
      const r = uiFit("retryFail", 24);
      expect(r.text.endsWith("…")).toBe(true);
      expect(r.title).toBe("Still not connected. Try again in a moment.");
      expect(Array.from(r.text).length).toBeLessThanOrEqual(24);
    } finally { setLanguage("tr"); }
  });
  it("dil değişimi arayüzü bozmaz: aynı anahtarlar her iki dilde döner", () => {
    for (const dil of ["tr", "en"] as const) {
      setLanguage(dil);
      expect(UI_KEYS.every(k => ui(k).length > 0)).toBe(true);
    }
    setLanguage("tr");
    expect(ui("brand")).toBe("AfuNöbet");
  });
});
