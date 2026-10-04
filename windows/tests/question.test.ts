import { describe, expect, it } from "vitest";
import { SoruModeli, ajanAdi, cevapHazirla, hataMetni, kartOlustur, sorulariAyikla, type Cevap, type Soru } from "../src/question/question";

class Fake {
  children: Fake[] = []; textContent = ""; className = ""; hidden = false; disabled = false;
  type = ""; value = ""; placeholder = ""; maxLength = 0; autocomplete = "";
  attrs = new Map<string, string>(); listeners = new Map<string, ((e: any) => void)[]>();
  constructor(public tag: string) {}
  append(...c: Fake[]) { this.children.push(...c); }
  setAttribute(k: string, v: string) { this.attrs.set(k, v); }
  addEventListener(k: string, f: (e: any) => void) { this.listeners.set(k, [...(this.listeners.get(k) ?? []), f]); }
  fire(k: string, e: any = {}) { for (const f of this.listeners.get(k) ?? []) f(e); }
  all(): Fake[] { return [this, ...this.children.flatMap(c => c.all())]; }
  find(sinif: string) { return this.all().filter(x => x.className.split(" ").includes(sinif)); }
}
const belge = { createElement: (t: string) => new Fake(t) } as unknown as Pick<Document, "createElement">;
const bekle = () => new Promise(r => setTimeout(r, 0));

const ham = (o: Partial<Record<string, unknown>> = {}) => ({
  id: "q1", ajan: "codex", tur: "komut", baslik: "Komut çalıştırılsın mı?", metin: "npm test", ayrinti: "C:\\proje",
  secenekler: [{ id: "evet", etiket: "İzin ver" }, { id: "hayir", etiket: "Reddet" }],
  serbestMetin: false, gizli: false, olusturma: 10, sonGecerlilik: 5000, ...o,
});

describe("Soru ayıklama", () => {
  it("geçerli soruyu alır, bozuk/süresi geçmiş/yinelenenleri atar, eskiyi öne alır", () => {
    const l = sorulariAyikla([
      ham({ id: "yeni", olusturma: 20 }), ham(), ham(), ham({ id: "eski", sonGecerlilik: 100 }),
      ham({ id: "../x" }), ham({ id: "t", tur: "bilinmez" }), ham({ id: "bos", secenekler: [] }),
      ham({ id: "m", metin: "  " }), null, "x",
    ], 1000);
    expect(l.map(s => s.id)).toEqual(["q1", "yeni"]);
    expect(sorulariAyikla({ not: "array" }, 0)).toEqual([]);
  });
  it("yalnız serbest metinli soru geçerlidir, uzun alanlar kesilir", () => {
    const [s] = sorulariAyikla([ham({ tur: "soru", secenekler: [], serbestMetin: true, metin: "x".repeat(3000) })], 0);
    expect(s.serbestMetin).toBe(true);
    expect(s.metin.length).toBe(2000);
    expect(s.metin.endsWith("…")).toBe(true);
  });
  it("ajan adları kullanıcı dilinde", () => {
    expect(ajanAdi("codex")).toBe("Codex"); expect(ajanAdi("opencode")).toBe("OpenCode"); expect(ajanAdi("yeni")).toBe("Yeni"); expect(ajanAdi("")).toBe("Ajan");
  });
});

describe("Cevap doğrulama", () => {
  const [onay] = sorulariAyikla([ham()], 0);
  const [acik] = sorulariAyikla([ham({ id: "q2", tur: "soru", secenekler: [{ id: "a", etiket: "main" }], serbestMetin: true })], 0);
  it("seçenek ve metin kurallara uyar", () => {
    expect(cevapHazirla(onay, "evet", null)).toEqual({ id: "q1", secim: "evet", metin: null });
    expect(cevapHazirla(onay, "belki", null)).toHaveProperty("hata");
    expect(cevapHazirla(onay, null, "serbest")).toEqual({ hata: "Bu soru için bir seçeneğe dokun." });
    expect(cevapHazirla(onay, null, null)).toEqual({ hata: "Önce bir cevap seç ya da yaz." });
    expect(cevapHazirla(acik, null, "  dev  ")).toEqual({ id: "q2", secim: null, metin: "dev" });
    expect(cevapHazirla(acik, null, "z".repeat(2001))).toHaveProperty("hata");
  });
  it("hata metni teknik ayrıntı sızdırmaz", () => {
    expect(hataMetni("Bu soru artık geçerli değil.")).toBe("Bu soru artık geçerli değil.");
    expect(hataMetni("C:\\Users\\x\\sorular failed")).toBe("Cevap gönderilemedi. Yeniden dene.");
    expect(hataMetni({})).toBe("Cevap gönderilemedi. Yeniden dene.");
  });
});

describe("Soru modeli", () => {
  it("cevaplanan soru yeniden gösterilmez, dosyası silinince kayıt da gider, süre dolunca kapanır", () => {
    const m = new SoruModeli();
    m.guncelle([ham(), ham({ id: "q2", olusturma: 20, sonGecerlilik: 3000 })], 0);
    expect(m.aktif?.id).toBe("q1"); expect(m.bekleyen).toBe(2); expect(m.sonrakiBitis()).toBe(3000);
    m.cevaplandi("q1");
    expect(m.aktif?.id).toBe("q2");
    m.guncelle([ham(), ham({ id: "q2", olusturma: 20, sonGecerlilik: 3000 })], 0);
    expect(m.aktif?.id).toBe("q2"); // köprü henüz silmedi; tekrar gösterme
    m.guncelle([ham({ id: "q2", olusturma: 20, sonGecerlilik: 3000 })], 0);
    m.guncelle([ham(), ham({ id: "q2", olusturma: 20, sonGecerlilik: 3000 })], 0);
    expect(m.aktif?.id).toBe("q1"); // yeni bir q1 geldi
    m.temizle(3000); m.cevaplandi("q1");
    expect(m.aktif).toBeNull(); expect(m.sonrakiBitis()).toBeNull();
  });
});

describe("Soru kartı", () => {
  const gonderen = (sonuc: () => Promise<void> = async () => {}) => {
    const giden: Cevap[] = [];
    return { giden, gonder: async (c: Cevap) => { giden.push(c); await sonuc(); } };
  };
  it("tek tık düğme cevabı gönderir ve düğmeleri kilitler", async () => {
    const [s] = sorulariAyikla([ham()], 0);
    const g = gonderen();
    const kart = kartOlustur(belge, s, g.gonder, 2) as unknown as Fake;
    expect(kart.find("soru-kimden")[0].textContent).toBe("Codex soruyor · 2 soru");
    expect(kart.find("soru-ayrinti")[0].textContent).toBe("C:\\proje");
    // Ayrıntı varsayılan kapalı: kod kutusu soru kartını doldurmaz.
    expect(kart.find("soru-ayrinti")[0].hidden).toBe(true);
    const ac = kart.find("soru-ayrinti-dugme")[0];
    expect(kart.find("soru-ayrinti")[0].hidden).toBe(true);
    expect(ac.textContent).toBe("Ayrıntı");
    ac.fire("click");
    expect(kart.find("soru-ayrinti")[0].hidden).toBe(false);
    expect(ac.textContent).toBe("Ayrıntıyı kapat");
    const d = kart.find("soru-dugme").filter(x => x.className.includes("soru-dugme") && !x.className.includes("soru-ayrinti-dugme"));
    expect(d.map(x => x.textContent)).toEqual(["İzin ver", "Reddet"]);
    expect(d[0].className).toContain("birincil");
    d[1].fire("click"); d[0].fire("click");
    await bekle();
    expect(g.giden).toEqual([{ id: "q1", secim: "hayir", metin: null }]);
    expect(d.every(x => x.disabled)).toBe(true);
    expect(kart.find("soru-alan")).toEqual([]);
  });
  it("metin alanı Enter ile gönderir, boşta tek cümle uyarır, gizli soruda parola alanıdır", async () => {
    const [s] = sorulariAyikla([ham({ tur: "soru", secenekler: [], serbestMetin: true, gizli: true, ayrinti: null })], 0);
    const g = gonderen();
    let odak = 0;
    const kart = kartOlustur(belge, s, g.gonder, 1, () => { odak++; }) as unknown as Fake;
    const alan = kart.find("soru-alan")[0];
    alan.fire("mousedown"); expect(odak).toBe(1);
    expect(alan.type).toBe("password"); expect(kart.find("soru-ayrinti")).toEqual([]);
    kart.find("soru-dugme")[0].fire("click");
    await bekle();
    const hata = kart.find("soru-hata")[0];
    expect(hata.hidden).toBe(false); expect(hata.textContent).toBe("Önce bir cevap seç ya da yaz.");
    alan.value = "main"; let engel = false;
    alan.fire("keydown", { key: "Enter", preventDefault: () => { engel = true; } });
    await bekle();
    expect(engel).toBe(true);
    expect(g.giden).toEqual([{ id: "q1", secim: null, metin: "main" }]);
  });
  it("gönderim hatasında düğmeler açılır ve kısa hata gösterilir", async () => {
    const [s] = sorulariAyikla([ham()], 0);
    const g = gonderen(async () => { throw new Error("Bu soru artık geçerli değil."); });
    const kart = kartOlustur(belge, s, g.gonder) as unknown as Fake;
    const ilk = kart.find("soru-dugme").filter(x => !x.className.includes("soru-ayrinti-dugme"));
    ilk[0].fire("click");
    await bekle(); await bekle();
    expect(kart.find("soru-hata")[0].textContent).toBe("Bu soru artık geçerli değil.");
    expect(kart.find("soru-dugme").every(x => !x.disabled)).toBe(true);
  });
});
