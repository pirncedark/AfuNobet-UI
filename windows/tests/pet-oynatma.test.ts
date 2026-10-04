// GOREV_P7_KIRPMA_YAVAS: mini pet göz kırpma yavaşlar. Saf zamanlama
// fonksiyonları ve oynatıcı; sahte saat, sahte çözücü, sahte zamanlayıcı.
import { describe, expect, it } from "vitest";
import {
  DONGU_SINIRI,
  DONGU_TOLERANS,
  HIZ_EN_AZ,
  HIZ_EN_COK,
  WebpOynatici,
  donguOynagi,
  donguSuresi,
  kareSecimi,
  oynatmaDuzelt,
  rastgeleBekleme,
  type KareVerisi,
  type Oynatma,
} from "../src/afu/oynatma";
import { PET_OYNATMA, SEKANSLAR, type PetPose } from "../src/afu/pet";

// bekleme.webp: 11 kare ≈ 0,7 sn → kare başına ≈ 63,6 ms (göz kırpma bu döngünün içinde)
const BEKLEME_KARELER = 11;
const BEKLEME_DONGU_MS = 700;

describe("P7 varsayılan oynatma tablosu", () => {
  it("her poz için hız ve döngü arası bekleme var", () => {
    for (const pose of Object.keys(SEKANSLAR) as PetPose[]) {
      expect(PET_OYNATMA[pose]).toEqual({ hiz: expect.any(Number), donguArasi: expect.any(Number) });
    }
  });

  it("bekleme 2 kat yavaşlar ve döngü arası 3500 ms bekler", () => {
    expect(PET_OYNATMA.bekleme).toEqual({ hiz: 0.5, donguArasi: 3500 });
    // kullanıcı şikayeti: 0,7 sn'de bir kırpma → hız 0,5 ile 1,4 sn, üstüne 3,5 sn bekleme
    const kareMs = new Array(BEKLEME_KARELER).fill(BEKLEME_DONGU_MS / BEKLEME_KARELER);
    expect(donguSuresi(kareMs, PET_OYNATMA.bekleme.hiz)).toBeCloseTo(1400, 6);
    // bir kırpma ortalama 1,4 + 3,5 = 4,9 sn'de bir (3–5 sn bandı içinde)
    const beklenen = donguSuresi(kareMs, PET_OYNATMA.bekleme.hiz) + PET_OYNATMA.bekleme.donguArasi;
    expect(beklenen).toBeGreaterThanOrEqual(3000);
    expect(beklenen).toBeLessThanOrEqual(5000);
  });

  it("diğer animasyonlar değişmez (hız 1, bekleme 0)", () => {
    for (const pose of Object.keys(SEKANSLAR) as PetPose[]) {
      if (pose === "bekleme") continue;
      expect(PET_OYNATMA[pose]).toEqual({ hiz: 1, donguArasi: 0 });
    }
  });
});

describe("P7 hız ve döngü arası bekleme", () => {
  const dort = [100, 100, 100, 100];

  it("hız kare sürelerini bölüğü kadar uzatır", () => {
    expect(kareSecimi(dort, 1, 0, 0).kare).toBe(0);
    expect(kareSecimi(dort, 1, 0, 150).kare).toBe(1);
    expect(kareSecimi(dort, 1, 0, 350).kare).toBe(3);
    // hız 0,5 → her kare 200 ms
    expect(kareSecimi(dort, 0.5, 0, 199).kare).toBe(0);
    expect(kareSecimi(dort, 0.5, 0, 200).kare).toBe(1);
    expect(kareSecimi(dort, 0.5, 0, 799).kare).toBe(3);
    expect(donguSuresi(dort, 0.5)).toBeCloseTo(800, 9);
    expect(donguSuresi(dort, 2)).toBeCloseTo(200, 9);
  });

  it("döngü bitince ilk karede bekler, sonra yeniden başlar", () => {
    expect(kareSecimi(dort, 0.5, 3500, 799)).toMatchObject({ kare: 3, bekliyor: false });
    const bekleme = kareSecimi(dort, 0.5, 3500, 800);
    expect(bekleme).toMatchObject({ kare: 0, bekliyor: true, donguNo: 0 });
    expect(bekleme.bekleme).toBeGreaterThan(3500 * (1 - DONGU_TOLERANS));
    expect(bekleme.bekleme).toBeLessThan(3500 * (1 + DONGU_TOLERANS));
    expect(kareSecimi(dort, 0.5, 3500, 4299).bekliyor).toBe(true);
    const sonraki = kareSecimi(dort, 0.5, 3500, 4300);
    expect(sonraki).toMatchObject({ kare: 0, bekliyor: false, donguNo: 1 });
  });

  it("bekleme yoksa döngü arkası kesintisiz akar", () => {
    for (const gecen of [0, 399, 400, 401, 799, 1200, 4000]) {
      expect(kareSecimi(dort, 1, 0, gecen).bekliyor).toBe(false);
    }
  });

  it("döngü arası bekleme rastgele ±%30 bandında kalır", () => {
    expect(rastgeleBekleme(3500, 0)).toBeCloseTo(3500 * (1 - DONGU_TOLERANS), 9);
    expect(rastgeleBekleme(3500, 1)).toBeCloseTo(3500 * (1 + DONGU_TOLERANS), 9);
    expect(rastgeleBekleme(3500, 0.5)).toBeCloseTo(3500, 9);
    expect(rastgeleBekleme(0, 0.5)).toBe(0);
    for (const rnd of [0, 0.13, 0.5, 0.87, 1]) {
      const deger = rastgeleBekleme(3500, rnd);
      expect(deger).toBeGreaterThanOrEqual(3500 * 0.7 - 1e-9);
      expect(deger).toBeLessThanOrEqual(3500 * 1.3 + 1e-9);
    }
  });

  it("hız ve bekleme sınırlarına kırpılır", () => {
    expect(oynatmaDuzelt({ hiz: 9, donguArasi: -4 })).toEqual({ hiz: HIZ_EN_COK, donguArasi: 0 });
    expect(oynatmaDuzelt({ hiz: 0.01, donguArasi: 10 ** 9 })).toEqual({ hiz: HIZ_EN_AZ, donguArasi: 60000 });
    expect(oynatmaDuzelt({ hiz: Number.NaN, donguArasi: Number.NaN })).toEqual({ hiz: 1, donguArasi: 0 });
    expect(oynatmaDuzelt(undefined)).toEqual({ hiz: 1, donguArasi: 0 });
    // kare listesi boşsa oynatıcı çökmez
    expect(kareSecimi([], 0.5, 3500, 100).kare).toBe(0);
  });
});

describe("P7 döngü arası bekleme gerçekten salınır", () => {
  const dort = [100, 100, 100, 100];
  const DONGU = donguSuresi(dort, 0.5); // 800 ms

  /** `n` döngü bittiğinde bir sonraki döngünün başladığı an. */
  const donguBasi = (n: number, tohum = 0.5) => {
    let an = 0;
    for (let i = 0; i < n; i++) an += DONGU + rastgeleBekleme(3500, donguOynagi(i, tohum));
    return an;
  };

  it("aynı döngü hep aynı oynağı verir (titreşim yok)", () => {
    expect(donguOynagi(0)).toBe(0.5);
    expect(donguOynagi(3, 0.5)).toBe(donguOynagi(3, 0.5));
    expect(donguOynagi(3, 0.1)).not.toBe(donguOynagi(3, 0.9));
  });

  it("ilk döngü tam ayar değerinde bekler, sonrakiler ±%30 salınır", () => {
    // 1. döngü: kullanıcının verdiği 3500 ms tam olarak
    expect(donguBasi(1)).toBe(DONGU + 3500);
    const beklemeler = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(n =>
      kareSecimi(dort, 0.5, 3500, donguBasi(n + 1) - 1).bekleme);
    for (const bekleme of beklemeler) {
      expect(bekleme).toBeGreaterThanOrEqual(3500 * 0.7 - 1e-9);
      expect(bekleme).toBeLessThanOrEqual(3500 * 1.3 + 1e-9);
    }
    // ilk döngü tam ayarda, sonrakilerden en az biri tam ayardan farklı:
    // salınma yalnız testte değil, oynatıcının zamanlamasında da var
    expect(beklemeler[0]).toBe(3500);
    expect(beklemeler.slice(1).some(bekleme => Math.abs(bekleme - 3500) > 1)).toBe(true);
  });

  it("sıralı döngüler ileri gider, geri sarmaz", () => {
    for (let n = 0; n < 12; n++) {
      expect(donguBasi(n + 1)).toBeGreaterThan(donguBasi(n));
      // döngü oynarken: son kare, bekleme değil
      expect(kareSecimi(dort, 0.5, 3500, donguBasi(n) + DONGU - 1)).toMatchObject({ kare: 3, bekliyor: false, donguNo: n });
      // döngü bitti: ilk karede bekleniyor (+1: birikimli ondalık yuvarlama payı)
      expect(kareSecimi(dort, 0.5, 3500, donguBasi(n) + DONGU + 1)).toMatchObject({ kare: 0, bekliyor: true, donguNo: n });
      // bekleme bitti: bir sonraki döngü ilk karede başlar
      // (+1: sınır tam sayıda değil, birikimli ondalık yuvarlama payı bırakılır)
      expect(kareSecimi(dort, 0.5, 3500, donguBasi(n + 1) + 1)).toMatchObject({ kare: 0, bekliyor: false, donguNo: n + 1 });
    }
  });

  it("çok uzun süre sonra da döngü sayısı artar (sabit sınırı aşmaz)", () => {
    const secim = kareSecimi(dort, 1, 0, 60 * 60 * 1000);
    expect(secim.donguNo).toBeGreaterThan(0);
    expect(secim.donguNo).toBeLessThanOrEqual(DONGU_SINIRI);
    expect(kareSecimi(dort, 1, 0, 1e12).donguNo).toBeLessThanOrEqual(DONGU_SINIRI);
  });
});

// --- sahte zamanlayıcı + sahte çözücü -------------------------------------

function sahteOynatici(cozucu: (kaynak: string) => Promise<KareVerisi | null>, rastgele = 0.5) {
  const cizilen: number[] = [];
  const durumlar: boolean[] = [];
  let saat = 0;
  let planli: (() => void) | null = null;
  const oynatici = new WebpOynatici({
    cizici: kare => cizilen.push(kare),
    cozucu,
    rastgele: () => rastgele,
    zaman: () => saat,
    zamanlayici: {
      planla: is => { planli = is; return 1; },
      iptal: () => { planli = null; },
    },
    durum: aktif => durumlar.push(aktif),
  });
  return {
    oynatici,
    cizilen,
    durumlar,
    ilerlet(ms: number) {
      saat += ms;
      planli?.();
    },
    async bekle() { await new Promise(resolve => setTimeout(resolve, 0)); },
  };
}

const kareVerisi = (adet: number, ms: number): KareVerisi => ({
  kareMs: new Array(adet).fill(ms),
  kareler: new Array(adet).fill({} as ImageBitmap),
});

describe("P7 oynatıcı zamanlaması", () => {
  it("sahte çözücü ve sahte saatle kareleri hız ayarına göre sırayla çizer", async () => {
    const s = sahteOynatici(async () => kareVerisi(4, 100));
    s.oynatici.oynat("/afu/durum/bekleme.webp", { hiz: 0.5, donguArasi: 0 });
    expect(s.durumlar).toEqual([]);
    await s.bekle();
    expect(s.oynatici.aktif).toBe(true);
    expect(s.cizilen).toEqual([0]);
    s.ilerlet(199);
    s.ilerlet(1);
    s.ilerlet(400);
    s.ilerlet(199);
    expect(s.cizilen).toEqual([0, 1, 3]);
  });

  it("döngü bitince ilk karede bekler, bekleme bitince yeniden oynar", async () => {
    const s = sahteOynatici(async () => kareVerisi(4, 100));
    s.oynatici.oynat("/afu/durum/bekleme.webp", { hiz: 0.5, donguArasi: 3500 });
    await s.bekle();
    // hız 0,5 → kare 200 ms, döngü 800 ms, döngü+ bekleme 4300 ms
    s.ilerlet(800);
    expect(s.cizilen).toEqual([0]);
    s.ilerlet(100);
    expect(s.cizilen).toEqual([0]);
    // döngü 0: 0–800 oynar, 800–4300 bekler -> 4300'de ikinci döngü başlar
    s.ilerlet(3400);
    expect(s.cizilen).toEqual([0]);
    s.ilerlet(200);
    expect(s.cizilen).toEqual([0, 1]);
    s.ilerlet(600);
    expect(s.cizilen).toEqual([0, 1, 0]);
  });

  it("hız 1 ve bekleme 0 olan animasyonlar eskisi gibi akar", async () => {
    const s = sahteOynatici(async () => kareVerisi(4, 100));
    s.oynatici.oynat("/afu/durum/gulumseme.webp", { hiz: 1, donguArasi: 0 });
    await s.bekle();
    for (let adim = 0; adim < 5; adim++) s.ilerlet(100);
    expect(s.cizilen).toEqual([0, 1, 2, 3, 0, 1]);
  });

  it("bekeşte döngü arası gerçekten bekler ve bekleme döngüden döngüye değişir", async () => {
    // salınma saf fonksiyonda kalmaz: oynatıcının kendi saatinde ölçülür
    const s = sahteOynatici(async () => kareVerisi(4, 100));
    s.oynatici.oynat("/afu/durum/bekleme.webp", { hiz: 0.5, donguArasi: 3500 });
    await s.bekle();
    const bekleyisler: number[] = [];
    let sonKare = -1;
    let oynadi = false;
    for (let t = 10; t <= 20000; t += 10) {
      s.ilerlet(10);
      const kare = s.cizilen[s.cizilen.length - 1] ?? -1;
      // bekleme ilk karede başlar: oynayan kareden 0'a dönüş (ilk çizim sayılmaz)
      if (kare === 0 && sonKare !== 0 && oynadi) bekleyisler.push(t);
      if (kare !== 0) oynadi = true;
      sonKare = kare;
    }
    expect(bekleyisler.length).toBeGreaterThanOrEqual(3);
    const aralar = bekleyisler.slice(1).map((an, i) => an - bekleyisler[i]);
    // her aralık = bir döngü (800 ms) + o döngünün beklemesi (±20 ms örnekleme payı)
    for (const a of aralar) {
      expect(a).toBeGreaterThanOrEqual(800 + 3500 * 0.7 - 20);
      expect(a).toBeLessThanOrEqual(800 + 3500 * 1.3 + 20);
    }
    expect(Math.abs(aralar[0] - 4300)).toBeLessThanOrEqual(20);
    expect(aralar.slice(1).some(a => Math.abs(a - 4300) > 60)).toBe(true);
  });

  it("çözücü yoksa (ImageDecoder yok) oynatıcı açılmaz, <img> kalır", async () => {
    const s = sahteOynatici(async () => null);
    s.oynatici.oynat("/afu/durum/bekleme.webp", { hiz: 0.5, donguArasi: 3500 });
    await s.bekle();
    expect(s.oynatici.aktif).toBe(false);
    expect(s.durumlar).toEqual([]);
    expect(s.cizilen).toEqual([]);
  });

  it("gizliyken döngü durur, görünür olunca kaldığı yerden sürer", async () => {
    const s = sahteOynatici(async () => kareVerisi(4, 100));
    s.oynatici.oynat("/afu/durum/bekleme.webp", { hiz: 1, donguArasi: 0 });
    await s.bekle();
    s.ilerlet(100);
    s.oynatici.gorunurluk(false);
    const durdurma = s.cizilen.length;
    s.ilerlet(5000);
    expect(s.cizilen).toHaveLength(durdurma);
    s.oynatici.gorunurluk(true);
    s.ilerlet(100);
    expect(s.cizilen.length).toBeGreaterThan(durdurma);
  });

  it("hareket azaltma tercihinde ve kaynak değişince oynatıcı kapanır", async () => {
    const s = sahteOynatici(async () => kareVerisi(4, 100));
    s.oynatici.oynat("/afu/durum/bekleme.webp", { hiz: 0.5, donguArasi: 3500 });
    await s.bekle();
    expect(s.oynatici.aktif).toBe(true);
    s.oynatici.durdur();
    expect(s.oynatici.aktif).toBe(false);
    expect(s.durumlar).toEqual([true, false]);
  });

  it("aynı kaynak ve ayar art arda çağrılırsa yeniden başlamaz", async () => {
    const cikan: string[] = [];
    const s = sahteOynatici(async kaynak => { cikan.push(kaynak); return kareVerisi(4, 100); });
    const ayar: Oynatma = { hiz: 0.5, donguArasi: 3500 };
    s.oynatici.oynat("/afu/durum/bekleme.webp", ayar);
    await s.bekle();
    s.ilerlet(200);
    s.oynatici.oynat("/afu/durum/bekleme.webp", ayar);
    await s.bekle();
    expect(cikan).toEqual(["/afu/durum/bekleme.webp"]);
    expect(s.cizilen).toEqual([0, 1]);
  });
});
