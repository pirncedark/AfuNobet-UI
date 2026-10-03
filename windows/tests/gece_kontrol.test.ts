import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { chromium, type Browser } from "playwright";
import { PET_BOYUT, PET_TUTMA, sarkac, sarkacHedef, sarkacUzama, sigdir } from "../src/afu/pet";
import { WebpOynatici, kareSecimi, type KareVerisi } from "../src/afu/oynatma";
import { BalonModeli, type Mesaj } from "../src/message/message";
import { PANEL_H, PANEL_W, petPencereYuksekligi } from "../src/core/layout";

// Gece raporlarındaki mevcut testlere ek: birleşimler, yarışlar ve gerçek CSS yerleşimi.
describe("gece: P3/P6 ense ekseniyle sığdırma", () => {
  it("ölçülü bütün kareler ense ekseninde de dört kenarın içinde kalır; ikinci sığdırma değişmez", () => {
    for (const { kutu } of Object.values(PET_BOYUT)) {
      for (const olcek of [0.5, 1, 2, 4]) {
        for (const [x, y] of [[-400, -400], [400, 400], [0, 0]]) {
          const s = sigdir(kutu, olcek, x, y, 256, 6, 90);
          const kenarlar = [
            128 + (kutu[0] * 256 - 128) * s.olcek + s.x,
            90 + (kutu[1] * 256 - 90) * s.olcek + s.y,
            128 + (kutu[2] * 256 - 128) * s.olcek + s.x,
            90 + (kutu[3] * 256 - 90) * s.olcek + s.y,
          ];
          for (const kenar of kenarlar) {
            expect(kenar).toBeGreaterThanOrEqual(6 - 1e-8);
            expect(kenar).toBeLessThanOrEqual(250 + 1e-8);
          }
          expect(sigdir(kutu, s.olcek, s.x, s.y, 256, 6, 90)).toEqual(s);
        }
      }
    }
  });
});

describe("gece: P7 değişken kare süresi ve yükleme yarışı", () => {
  it.each([0.25, 0.5, 1, 2])("hız %s iken eşit olmayan karelerin tam sınırlarında ilerler ve döngü arasında bekler", hiz => {
    const kareler = [40, 120, 240];
    expect(kareSecimi(kareler, hiz, 3500, 40 / hiz - 0.01).kare).toBe(0);
    expect(kareSecimi(kareler, hiz, 3500, 40 / hiz).kare).toBe(1);
    expect(kareSecimi(kareler, hiz, 3500, 160 / hiz).kare).toBe(2);
    expect(kareSecimi(kareler, hiz, 3500, 400 / hiz)).toMatchObject({ kare: 0, bekliyor: true });
    expect(kareSecimi(kareler, hiz, 3500, 400 / hiz + 3500)).toMatchObject({ kare: 0, bekliyor: false, donguNo: 1 });
  });

  it("geç çözülen eski kaynak yenisini ezmez; durdurulmuş istek çizim başlatmaz", async () => {
    const bekleyen = new Map<string, (v: KareVerisi) => void>();
    const cizilen: unknown[] = [];
    const veri = (id: string): KareVerisi => ({ kareMs: [100, 100], kareler: [{ id }, { id }] as unknown as ImageBitmap[] });
    const p = new WebpOynatici({
      cozucu: kaynak => new Promise(resolve => bekleyen.set(kaynak, resolve)),
      cizici: (_k, kareler) => cizilen.push(kareler[0]), zaman: () => 0,
      zamanlayici: { planla: () => 1, iptal: () => {} },
    });
    p.oynat("eski", { hiz: 1, donguArasi: 0 });
    p.oynat("yeni", { hiz: 0.5, donguArasi: 3500 });
    bekleyen.get("yeni")!(veri("yeni")); await Promise.resolve();
    bekleyen.get("eski")!(veri("eski")); await Promise.resolve();
    expect(cizilen).toEqual([{ id: "yeni" }]);
    p.oynat("son", { hiz: 2, donguArasi: 0 }); p.durdur();
    bekleyen.get("son")!(veri("son")); await Promise.resolve();
    expect(p.aktif).toBe(false);
    expect(cizilen).toEqual([{ id: "yeni" }]);
  });

  it("aynı kaynak yüklenirken değişen hız ve bekleme son ayarla uygulanır", async () => {
    let tamamla!: (v: KareVerisi) => void;
    let saat = 0;
    const cizilen: number[] = [];
    const p = new WebpOynatici({
      cozucu: () => new Promise(resolve => { tamamla = resolve; }),
      cizici: k => cizilen.push(k), zaman: () => saat, rastgele: () => 0.5,
      zamanlayici: { planla: () => 1, iptal: () => {} },
    });
    p.oynat("a", { hiz: 1, donguArasi: 0 });
    p.oynat("a", { hiz: 0.5, donguArasi: 3500 });
    tamamla({ kareMs: [100, 100], kareler: [{}, {}] as ImageBitmap[] });
    await Promise.resolve();
    saat = 199; p.adim(); expect(cizilen).toEqual([0]);
    saat = 200; p.adim(); expect(cizilen).toEqual([0, 1]);
    saat = 400; p.adim(); expect(cizilen).toEqual([0, 1, 0]);
    saat = 3899; p.adim(); expect(cizilen).toEqual([0, 1, 0]);
    saat = 4100; p.adim(); expect(cizilen).toEqual([0, 1, 0, 1]);
    p.durdur();
  });
});

describe("gece: P4/P5 ani yön değişimi", () => {
  it.each([0, PET_TUTMA.guc, 100])("stüdyo gücü %s ile değişken kare aralıkları ve ani ters yönlerde sınırlar korunur", guc => {
    let durum = { adim: 0, hiz: 0 };
    for (let i = 0; i < 600; i++) {
      const hedef = sarkacHedef((i % 2 ? 100000 : -100000) * guc / 50);
      durum = sarkac(durum.adim, durum.hiz, [1 / 144, 1 / 30, 0.5][i % 3], hedef, true);
      expect(Number.isFinite(durum.hiz)).toBe(true);
      expect(Math.abs(durum.adim)).toBeLessThanOrEqual(25);
      expect(sarkacUzama(durum.hiz)).toBeGreaterThanOrEqual(1);
      expect(sarkacUzama(durum.hiz)).toBeLessThanOrEqual(1.06);
    }
    if (guc === 0) expect(durum).toEqual({ adim: 0, hiz: 0 });
    for (let i = 0; i < 300; i++) durum = sarkac(durum.adim, durum.hiz, 1 / 60);
    expect(Math.abs(durum.adim)).toBeLessThan(0.1);
  });
});

describe("gece: P10/P11 görünürlük ve kalıcılık birleşimi", () => {
  it("kart/pet gizlenip açıldığında aynı balon kalır; kapanınca pet yüksekliği geri döner", () => {
    const m = new BalonModeli();
    const mesaj: Mesaj = { surum: 1, id: "gece", ajan: "codex", tur: "bilgi", metin: "Test tamamlandı.", zaman: 0 };
    m.gorunur(true, 0); m.ekle(mesaj, 0);
    expect(petPencereYuksekligi(m.aktif !== null)).toBe(414);
    m.gorunur(false, 1000); m.tick(86400000);
    m.gorunur(true, 86400000);
    expect(m.aktif).toBe(mesaj);
    expect(m.kapat()).toBe(true);
    m.gorunur(false, 86400001); m.gorunur(true, 86400002);
    expect(m.aktif).toBeNull();
    expect(petPencereYuksekligi(m.aktif !== null)).toBe(256);
  });
});

describe("gece: P8/P9 gerçek başsız soru yerleşimi", () => {
  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  let origin = "";
  beforeAll(async () => {
    server = await createServer({ configFile: false, root: process.cwd(),
      optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
      server: { host: "127.0.0.1", port: 0, watch: { ignored: ["**/target/**", "**/dist/**"] } },
    });
    await server.listen();
    origin = server.resolvedUrls!.local[0];
    browser = await chromium.launch({ headless: true });
  }, 30000);
  afterAll(async () => { try { await browser?.close(); } finally { await server?.close(); } });

  it("P3 ense noktası img, önceki kare ve canvas üzerinde aynı; bırakınca ayak eksenine döner", async () => {
    const page = await browser!.newPage();
    try {
      await page.goto(`${origin}tests/preview.html?case=idle`);
      const sonuc = await page.evaluate(async () => {
        const yol = "/src/afu/pet.ts";
        const { AfuPet } = await new Function("yol", "return import(yol)")(yol);
        const pet = new AfuPet(() => {});
        const oku = () => [pet.image, pet.previous, pet.canvas].map(e => e.style.transformOrigin);
        pet.model.setPose("surukleme"); pet.paint(); const tutma = oku();
        pet.model.setPose("geri_donus"); pet.paint(); const donus = oku();
        pet.model.setPose("bekleme"); pet.paint(); const birakma = oku();
        pet.oynatici.durdur(); pet.appsMenu.remove();
        return { tutma, donus, birakma };
      });
      expect(sonuc).toEqual({ tutma: Array(3).fill("57.2917% 0%"), donus: Array(3).fill("50% 35.1562%"), birakma: Array(3).fill("50% 100%") });
    } finally { await page.close(); }
  }, 30000);

  it("P11 gerçek × tıklaması balonu kapatır ve tam metin açma eylemini tetiklemez", async () => {
    const page = await browser!.newPage();
    try {
      await page.goto(`${origin}tests/preview.html?case=idle`);
      const sonuc = await page.evaluate(async () => {
        const yol = "/src/message/message.ts";
        const { BalonModeli, balonOlustur } = await new Function("yol", "return import(yol)")(yol);
        const m = new BalonModeli(); m.gorunur(true, 0);
        m.ekle({ surum: 1, id: "x", ajan: "codex", tur: "bilgi", metin: "Bitti.", zaman: 0 }, 0);
        m.tick(86400000);
        const once = m.aktif.id; let acildi = 0;
        const balon = balonOlustur(document, m.aktif, () => acildi++, () => m.kapat());
        document.body.append(balon);
        balon.querySelector(".afu-balon-kapat").click(); balon.remove();
        return { once, sonra: m.aktif, acildi };
      });
      expect(sonuc).toEqual({ once: "x", sonra: null, acildi: 0 });
    } finally { await page.close(); }
  }, 30000);

  it.each([1, 1.25, 1.5])("DPI %s: uzun soru ve açık ayrıntı kaydırılırken dört seçenek ve cevap alanı görünür", async dpi => {
    const page = await browser!.newPage({ viewport: { width: PANEL_W, height: PANEL_H }, deviceScaleFactor: dpi });
    const hatalar: string[] = [];
    page.on("pageerror", e => hatalar.push(e.message));
    try {
      await page.goto(`${origin}tests/preview.html?case=soru`);
      await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
      await page.locator(".soru-ayrinti-dugme").click();
      await page.evaluate(() => {
        document.querySelector(".soru-metin")!.textContent = "Uzun soru metni ".repeat(100);
        document.querySelector(".soru-ayrinti")!.textContent = "Kod ayrıntısı\n".repeat(300);
      });
      for (const kaydir of [false, true]) {
        if (kaydir) await page.evaluate(() => { const e = document.querySelector(".soru-govde")!; e.scrollTop = e.scrollHeight; });
        const olcum = await page.evaluate(() => {
          const kart = document.querySelector(".soru-karti")!.getBoundingClientRect();
          const elemanlar = [...document.querySelectorAll(".soru-secenekler .soru-dugme, .soru-alan")];
          const govde = document.querySelector(".soru-govde")!;
          return {
            adet: elemanlar.length,
            gorunur: elemanlar.every(e => {
              const r = e.getBoundingClientRect(); const css = getComputedStyle(e);
              return r.width > 0 && r.height > 0 && css.visibility === "visible" && css.display !== "none"
                && r.top >= kart.top - 1 && r.bottom <= kart.bottom + 1 && r.left >= kart.left - 1 && r.right <= kart.right + 1
                && r.bottom <= innerHeight && r.right <= innerWidth;
            }),
            menu: getComputedStyle(document.querySelector("footer")!).display,
            kayar: govde.scrollHeight > govde.clientHeight && getComputedStyle(govde).overflowY === "auto",
            ayrintiAcik: !(document.querySelector(".soru-ayrinti") as HTMLElement).hidden,
          };
        });
        const sinirlar = await page.evaluate(() => [...document.querySelectorAll(".soru-karti, .soru-secenekler .soru-dugme, .soru-alan")].map(e => ({ sinif: e.className, kutu: e.getBoundingClientRect().toJSON(), gorunurluk: getComputedStyle(e).visibility })));
        expect.soft(olcum, JSON.stringify({ kaydir, sinirlar })).toEqual({ adet: 5, gorunur: true, menu: "none", kayar: true, ayrintiAcik: true });
      }
      expect(hatalar).toEqual([]);
    } finally { await page.close(); }
  }, 30000);
});
