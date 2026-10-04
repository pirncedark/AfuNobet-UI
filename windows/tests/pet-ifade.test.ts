import { describe, expect, it } from "vitest";
import { IFADELER, IFADE_ARALIK, IfadeZamanlayici, ifadeSec, ifadeSuresi, petMesgul, sonrakiAralik } from "../src/afu/ifade";
import { loadPetIfade, savePetIfade } from "../src/core/settings";
import { existsSync } from "node:fs";
import { join } from "node:path";

const sabit = (deger: number) => () => deger;
const BOS = { bosta: true, acik: true };

function sira(...degerler: number[]) {
  let i = 0;
  return () => degerler[i++ % degerler.length];
}

describe("W7 arada ifade", () => {
  it("aralık her zaman 20-60 sn arasında", () => {
    expect(sonrakiAralik(sabit(0))).toBe(IFADE_ARALIK.enAz);
    expect(sonrakiAralik(sabit(1))).toBe(IFADE_ARALIK.enCok);
    expect(sonrakiAralik(sabit(0.5))).toBe(40000);
    for (const bozuk of [-5, 7, Number.NaN, Infinity]) {
      const ms = sonrakiAralik(sabit(bozuk));
      expect(ms).toBeGreaterThanOrEqual(20000);
      expect(ms).toBeLessThanOrEqual(60000);
    }
    for (let i = 0; i < 200; i++) {
      const ms = sonrakiAralik();
      expect(ms).toBeGreaterThanOrEqual(20000);
      expect(ms).toBeLessThanOrEqual(60000);
    }
  });

  it("aralık dolmadan ifade yapmaz, dolunca yapar", () => {
    const z = new IfadeZamanlayici(sabit(0));
    expect(z.tick(0, BOS)).toBeNull();
    expect(z.sonrakiZaman).toBe(20000);
    expect(z.tick(19999, BOS)).toBeNull();
    expect(z.tick(20000, BOS)).not.toBeNull();
    expect(z.aktifIfade).not.toBeNull();
  });

  it("aynı ifade arka arkaya iki kez gelmez", () => {
    for (const r of [0, 0.3, 0.6, 0.99, 1]) expect(ifadeSec(IFADELER[0].ad, sabit(r)).ad).not.toBe(IFADELER[0].ad);
    const z = new IfadeZamanlayici(sabit(0));
    let t = 0;
    z.tick(t, BOS);
    let onceki: string | null = null;
    for (let tur = 0; tur < 30; tur++) {
      t = z.sonrakiZaman!;
      z.tick(t, BOS);
      const ad = z.aktifIfade!;
      expect(ad).not.toBeNull();
      expect(ad).not.toBe(onceki);
      onceki = ad;
      t += 10000;
      z.tick(t, BOS);
      expect(z.aktifIfade).toBeNull();
    }
  });

  it("meşgulken tetiklenmez ve süren ifade hemen biter", () => {
    const z = new IfadeZamanlayici(sabit(0));
    z.tick(0, BOS);
    for (let t = 0; t <= 120000; t += 1000) expect(z.tick(t, { bosta: false, acik: true })).toBeNull();
    expect(z.aktifIfade).toBeNull();
    z.tick(200000, BOS);
    expect(z.tick(220000, BOS)).not.toBeNull();
    expect(z.tick(220100, { bosta: false, acik: true })).toBeNull();
    expect(z.aktifIfade).toBeNull();
    // Boşa dönünce sayaç baştan başlar: hemen ifade yok.
    expect(z.tick(220200, BOS)).toBeNull();
    expect(z.tick(240199, BOS)).toBeNull();
  });

  it("ayar kapalıyken tetiklenmez", () => {
    const z = new IfadeZamanlayici(sabit(0));
    for (let t = 0; t <= 300000; t += 500) expect(z.tick(t, { bosta: true, acik: false })).toBeNull();
    expect(z.aktifIfade).toBeNull();
  });

  it("ifade bitince beklemeye döner ve yeni aralık kurar", () => {
    const z = new IfadeZamanlayici(sira(0, 0, 0.5));
    z.tick(0, BOS);
    const ilk = z.tick(20000, BOS);
    expect(ilk).not.toBeNull();
    const ifade = IFADELER.find(i => i.ad === z.aktifIfade)!;
    const sure = ifadeSuresi(ifade);
    expect(z.tick(20000 + sure - 1, BOS)).toBe(ifade.kareler[ifade.kareler.length - 1].kare);
    expect(z.tick(20000 + sure, BOS)).toBeNull();
    expect(z.aktifIfade).toBeNull();
    expect(z.sonrakiZaman).toBe(20000 + sure + 40000);
  });

  it("çok kareli ifade kareleri sırayla oynar", () => {
    const iki = [{ ad: "a", kareler: [{ kare: "k1", ms: 100 }, { kare: "k2", ms: 100 }] }, { ad: "b", kareler: [{ kare: "k3", ms: 50 }] }];
    const z = new IfadeZamanlayici(sabit(0), iki);
    z.tick(0, BOS);
    expect(z.tick(20000, BOS)).toBe("k1");
    expect(z.tick(20150, BOS)).toBe("k2");
    expect(z.tick(20200, BOS)).toBeNull();
  });

  it("ifadeler yalnız mevcut görselleri kullanır ve kısa sürer", () => {
    const kok = join(__dirname, "..", "public", "afu");
    const adlar = new Set<string>();
    for (const ifade of IFADELER) {
      adlar.add(ifade.ad);
      expect(ifadeSuresi(ifade)).toBeGreaterThan(0);
      expect(ifadeSuresi(ifade)).toBeLessThanOrEqual(3000);
      for (const { kare } of ifade.kareler) {
        const yol = kare.startsWith("durum/") ? join(kok, "durum", `${kare.slice(6)}.webp`) : join(kok, "pet", `${kare}.webp`);
        expect(existsSync(yol), yol).toBe(true);
      }
    }
    expect(adlar.size).toBe(IFADELER.length);
    expect(IFADELER.length).toBeGreaterThanOrEqual(2);
  });

  it("iş, soru ya da balon varken meşgul sayılır", () => {
    const bos = { gorevler: [{ status: "Tamamlandi" }, { status: "Hata" }], soruAcik: false, balonAcik: false };
    expect(petMesgul(bos)).toBe(false);
    for (const status of ["Calisiyor", "Hazirlaniyor", "Bekliyor"]) expect(petMesgul({ ...bos, gorevler: [{ status }] })).toBe(true);
    expect(petMesgul({ ...bos, soruAcik: true })).toBe(true);
    expect(petMesgul({ ...bos, balonAcik: true })).toBe(true);
  });

  it("ayar varsayılan açık, kaydedilir ve okunur", () => {
    const depo = new Map<string, string>();
    const storage = { getItem: (k: string) => depo.get(k) ?? null, setItem: (k: string, v: string) => { depo.set(k, v); } };
    expect(loadPetIfade(storage)).toBe(true);
    expect(savePetIfade(false, storage)).toBe(true);
    expect(loadPetIfade(storage)).toBe(false);
    savePetIfade(true, storage);
    expect(loadPetIfade(storage)).toBe(true);
    expect(loadPetIfade({ getItem: () => { throw new Error("x"); } })).toBe(true);
  });
});
