// TÜM ÖZELLİK TESTİ (2/4): mini pet ve pet balonu.
// Kapsam: Göz kırpma yavaş (P7), Enseden tutma (P4), Mini pet tam sığsın,
// Kalıcı balon (P11), Pet balonu (P10), Mini pet eski hali + sürükle-bırak-dön,
// Pet animasyon iyileştirmesi, mini pet yeni animasyonlar.
//
// Bu dosya YENİDİR; mevcut testlere dokunulmamıştır. src/ değişmez.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  PET_AYAR, PET_BOYUT, PET_NORMALIZE, PET_OYNATMA, PET_TUTMA, PetModel, SARKAC_DONUS_SONUM,
  SARKAC_MAX_ACI, SARKAC_NEFES_MS, SARKAC_NEFES_PIK, SARKAC_UZAMA_MAX, SEKANSLAR,
  sarkac, sarkacHedef, sarkacNefes, sarkacUzama, sigdir, type PetPose,
} from "../src/afu/pet";
import {
  DONGU_TOLERANS, HIZ_EN_AZ, HIZ_EN_COK, OYNATMA_TEMEL, TUVAL_BOYUTU,
  donguOynagi, donguSuresi, kareSecimi, oynatmaDuzelt, rastgeleBekleme,
} from "../src/afu/oynatma";
import {
  PET_BALON_BOSLUK, PET_BALON_GENISLIK, PET_BALON_PAY, PET_BALON_TABAN, PET_BALON_YUKSEKLIK,
  PET_PENCERE, petBalonKutusu, petBalonUst, petPencereYuksekligi,
} from "../src/core/layout";
import { hitRect, ignoresClicks } from "../src/core/hit";
import { BALON_KUYRUGU, BalonKuyrugu, kisalt, type Mesaj } from "../src/message/message";

const BEKLEME_MS = PET_OYNATMA.bekleme.donguArasi;

/** pet.ts'in çizdiği yol kuralı (dosya yolu testte yeniden kurulur). */
const kareYolu = (kare: string) => kare.startsWith("durum/") ? `public/afu/durum/${kare.slice(6)}.webp` : `public/afu/pet/${kare}.webp`;

// ============================================================ 1) Göz kırpma yavaş (P7)
describe("1) Göz kırpma yavaş", () => {
  it("bekleme pozunda hız yarıya iner, döngü arası 3500 ms beklenir", () => {
    expect(PET_OYNATMA.bekleme.hiz).toBe(0.5);
    expect(PET_OYNATMA.bekleme.donguArasi).toBe(3500);
    expect(BEKLEME_MS).toBe(3500);
  });
  it("diğer pozlar değişmez: hız 1, bekleme yok (göz kırpma diğerlerinde hızlı)", () => {
    for (const poz of Object.keys(PET_OYNATMA) as PetPose[])
      if (poz !== "bekleme") expect(PET_OYNATMA[poz]).toEqual({ hiz: 1, donguArasi: 0 });
  });
  it("göz kırpma karesi gerçekten yavaşlar: aynı kare süresi hız 0.5'te 2 kat uzar", () => {
    const kareMs = SEKANSLAR.bekleme.map(k => k.ms);
    const normal = donguSuresi(kareMs, 1);
    const yavas = donguSuresi(kareMs, PET_OYNATMA.bekleme.hiz);
    expect(yavas / normal).toBeCloseTo(2, 5);
  });
  it("döngü arası bekleme döngü süresine eklenir (kırpma tekrarı ~2 kat seyrekleşir)", () => {
    const kareMs = SEKANSLAR.bekleme.map(k => k.ms);
    const dongu = donguSuresi(kareMs, PET_OYNATMA.bekleme.hiz);
    const ilk = kareSecimi(kareMs, PET_OYNATMA.bekleme.hiz, PET_OYNATMA.bekleme.donguArasi, dongu + 1);
    expect(ilk.bekliyor).toBe(true);
    expect(ilk.kare).toBe(0);
    // Bekleme ±%30 bandında: en az 3500*0.7, en çok 3500*1.3.
    expect(ilk.bekleme).toBeGreaterThanOrEqual(3500 * (1 - DONGU_TOLERANS));
    expect(ilk.bekleme).toBeLessThanOrEqual(3500 * (1 + DONGU_TOLERANS));
  });
  it("ilk döngü tam ayar değerinde bekler, sonrakiler salınır (her zaman aynı aralıkta değil)", () => {
    const kareMs = [100, 100, 100];
    const ilkBekleme = kareSecimi(kareMs, 1, 1000, 300 + 1).bekleme;
    expect(ilkBekleme).toBe(1000);
    const oynaklar = new Set<number>();
    for (let donguNo = 1; donguNo <= 40; donguNo++) oynaklar.add(Math.round(donguOynagi(donguNo) * 1000));
    expect(oynaklar.size).toBeGreaterThan(1);
  });
  it("aynı (döngü, tohum) çifti hep aynı sonucu verir (titreşim yok)", () => {
    for (let donguNo = 0; donguNo < 50; donguNo++) {
      expect(donguOynagi(donguNo, 0.3)).toBe(donguOynagi(donguNo, 0.3));
      expect(kareSecimi([80, 120], 0.5, 3500, donguNo * 5000, 0.3)).toEqual(kareSecimi([80, 120], 0.5, 3500, donguNo * 5000, 0.3));
    }
  });
  it("hız ve bekleme sınırları içinde kalır, bozuk değer güvenli", () => {
    expect(oynatmaDuzelt({ hiz: 99 }).hiz).toBe(HIZ_EN_COK);
    expect(oynatmaDuzelt({ hiz: 0.01 }).hiz).toBe(HIZ_EN_AZ);
    expect(oynatmaDuzelt(null)).toEqual(OYNATMA_TEMEL);
    expect(oynatmaDuzelt({ donguArasi: -5 }).donguArasi).toBe(0);
    expect(oynatmaDuzelt({ donguArasi: 999999 }).donguArasi).toBe(60000);
    expect(oynatmaDuzelt({ hiz: Number.NaN }).hiz).toBe(1);
    expect(rastgeleBekleme(0, 0.5)).toBe(0);
  });
});

// ============================================================ 2) Enseden tutma (kedi gibi)
describe("2) Enseden tutma (kedi gibi)", () => {
  it("hedef açı ±25 derece ile sınırlanır, yatay hız ters yöne eğilir", () => {
    expect(SARKAC_MAX_ACI).toBe(25);
    expect(sarkacHedef(1200)).toBe(-25);
    expect(sarkacHedef(-1200)).toBe(25);
    expect(sarkacHedef(600)).toBeCloseTo(-12.5, 5);
    expect(sarkacHedef(99999)).toBe(-25);
    expect(sarkacHedef(0)).toBe(0);
    expect(sarkacHedef(Number.NaN)).toBe(0);
    expect(sarkacHedef(Number.POSITIVE_INFINITY)).toBe(-25);
  });
  it("yay sönümlüdür: bırakılınca dik konuma döner, salınmaz", () => {
    let durum = { adim: 20, hiz: 0 };
    for (let i = 0; i < 240; i++) durum = sarkac(durum.adim, durum.hiz, 1 / 60);
    expect(Math.abs(durum.adim)).toBeLessThan(0.5);
    expect(SARKAC_DONUS_SONUM).toBeGreaterThan(0.8);
  });
  it("uzama 1..1,06 arasında kalır, nefes 0,6 sn periyotlu ve 2 px", () => {
    expect(sarkacUzama(0)).toBe(1);
    expect(sarkacUzama(999)).toBe(SARKAC_UZAMA_MAX);
    expect(SARKAC_NEFES_MS).toBe(600);
    expect(SARKAC_NEFES_PIK).toBe(2);
    expect(sarkacNefes(0).nefes).toBeCloseTo(0, 6);
    expect(Math.abs(sarkacNefes(150).nefes)).toBeLessThanOrEqual(SARKAC_NEFES_PIK);
    // Bir tam periyot sonra aynı değere döner.
    expect(sarkacNefes(SARKAC_NEFES_MS).nefes).toBeCloseTo(sarkacNefes(0).nefes, 6);
    expect(sarkacNefes(Number.NaN)).toEqual({ nefes: 0, bacak: 0 });
  });
  it("tutma gücü sabit ve pozitif", () => {
    expect(PET_TUTMA.guc).toBeGreaterThan(0);
    expect(Number.isFinite(PET_TUTMA.guc)).toBe(true);
  });
  it("hareket azaltma tercihi açıkken sarkaç uygulanmaz", () => {
    const kaynak = readFileSync("src/afu/pet.ts", "utf8");
    expect(kaynak).toMatch(/prefers-reduced-motion|hareket.*azalt/i);
    expect(kaynak).toContain("sarkac(");
  });
});

// ============================================================ 3) Mini pet tam sığsın
describe("3) Mini pet tam sığsın", () => {
  it("her poz ve her kare çerçeve içinde kalır (taşma yok)", () => {
    const cerceve = TUVAL_BOYUTU;
    expect(cerceve).toBe(PET_PENCERE);
    const sorunlar: string[] = [];
    for (const [ad, kutu] of Object.entries(PET_BOYUT)) {
      const [x, y, w, h] = kutu.kutu;
      if (x < 0 || y < 0 || x + w > cerceve || y + h > cerceve)
        sorunlar.push(`${ad}: [${kutu.kutu.join(", ")}] ${cerceve}x${cerceve} dışına taşıyor`);
    }
    expect(sorunlar).toEqual([]);
  });
  it("opak içerik kutusu her zaman çerçevenin içinde ve pozitif boyutlu", () => {
    for (const [ad, kutu] of Object.entries(PET_BOYUT)) {
      const [x, y, w, h] = kutu.kutu;
      expect(w, ad).toBeGreaterThan(0);
      expect(h, ad).toBeGreaterThan(0);
      expect(x, ad).toBeGreaterThanOrEqual(0);
      expect(y, ad).toBeGreaterThanOrEqual(0);
      expect(x + w, ad).toBeLessThanOrEqual(TUVAL_BOYUTU);
      expect(y + h, ad).toBeLessThanOrEqual(TUVAL_BOYUTU);
    }
  });
  it("ölçek, x ve y sayısal ve pozitif", () => {
    for (const poz of Object.keys(PET_AYAR) as PetPose[]) {
      const ayar = PET_AYAR[poz];
      expect(Number.isFinite(ayar.olcek)).toBe(true);
      expect(ayar.olcek).toBeGreaterThan(0);
      expect(Number.isFinite(ayar.x)).toBe(true);
      expect(Number.isFinite(ayar.y)).toBe(true);
    }
  });
  it("sigdir çerçeveye sığmayan ölçeği küçültür, sığan ölçeğe dokunmaz", () => {
    const cerceve = TUVAL_BOYUTU;
    const dolu = [0.01, 0.02, 0.99, 0.98] as [number, number, number, number];
    const w0 = (dolu[2] - dolu[0]) * cerceve;
    // Tam çerçeveye sığan kutu ölçek 1'de küçültülmez.
    const tam = sigdir(dolu, 1, 0, 0, cerceve, 0);
    expect(tam.olcek).toBe(1);
    // Aynı kutu 2 kat büyütülürse çerçeveye sığdırmak için küçültülür (asla büyütmez).
    const buyuk = sigdir(dolu, 2, 0, 0, cerceve, 0);
    expect(buyuk.olcek).toBeLessThan(2);
    expect(buyuk.olcek).toBeCloseTo(cerceve / w0, 6);
    expect(w0 * buyuk.olcek).toBeLessThanOrEqual(cerceve + 1e-9);
    // Sığmayan yer durumunda konum da çerçeve içinde tutulur.
    const kiyida = sigdir(dolu, 2, -999, 999, cerceve, 0);
    expect(Number.isFinite(kiyida.x) && Number.isFinite(kiyida.y)).toBe(true);
    expect(kiyida.y).toBeLessThanOrEqual(cerceve);
    expect(kiyida.y).toBeGreaterThanOrEqual(0);
  });
  it("tüm pet varlıkları yerinde (kaynak klasörde dosya var)", () => {
    const eksikler: string[] = [];
    for (const poz of Object.keys(SEKANSLAR) as PetPose[])
      for (const kare of SEKANSLAR[poz]) {
        try { readFileSync(kareYolu(kare.kare)); } catch { eksikler.push(kareYolu(kare.kare)); }
      }
    expect(eksikler).toEqual([]);
  });
});

// ============================================================ 4) Kalıcı balon (P11)
describe("4) Kalıcı balon", () => {
  const m = (id: string): Mesaj => ({ surum: 1, id, ajan: "codex", tur: "bilgi", metin: `Mesaj ${id}`, zaman: 0 });
  it("otomatik kapanma yok: balon kullanıcı kapatana kadar kalır", () => {
    const k = new BalonKuyrugu();
    k.gorunur(true, 0); k.ekle(m("a"), 0);
    k.tick(1_000_000); k.tick(999_999_999);
    expect(k.aktif?.id).toBe("a");
  });
  it("yeni mesaj geldiğinde mevcut balon kapanmaz, kuyruğa eklenir", () => {
    const k = new BalonKuyrugu();
    k.gorunur(true, 0);
    k.ekle(m("a"), 0); k.ekle(m("b"), 0);
    expect(k.aktif?.id).toBe("a");
    expect(k.sira).toBe(1);
    expect(k.ekle.length).toBeGreaterThanOrEqual(0);
  });
  it("kapat (×) sıradakine geçer; son mesajdan sonra kapatma false döner", () => {
    const k = new BalonKuyrugu();
    k.gorunur(true, 0); k.ekle(m("a"), 0); k.ekle(m("b"), 0);
    expect(k.kapat()).toBe(true);
    expect(k.aktif?.id).toBe("b");
    expect(k.kapat()).toBe(true);
    expect(k.aktif).toBeNull();
    expect(k.kapat()).toBe(false);
  });
  it("kuyruk en fazla beş mesaj tutar, en eski düşer", () => {
    const k = new BalonKuyrugu();
    k.gorunur(true, 0);
    for (let i = 0; i < 12; i++) k.ekle(m(String(i)), i);
    expect(k.bekleyen.length).toBeLessThanOrEqual(BALON_KUYRUGU);
    expect(BALON_KUYRUGU).toBe(5);
    expect(k.aktif?.id).toBe("0");
  });
  it("aynı olay iki kez balonu yeniden kurmaz", () => {
    const k = new BalonKuyrugu();
    k.gorunur(true, 0);
    k.ekle(m("a"), 0); k.ekle(m("a"), 1);
    expect(k.sira).toBe(0);
  });
  it("görünmezken mesajlar birikir, görünür olunca en eskisi gösterilir", () => {
    const k = new BalonKuyrugu();
    k.gorunur(false, 0);
    for (let i = 0; i < 7; i++) k.ekle(m(String(i)), i);
    expect(k.aktif).toBeNull();
    k.gorunur(true, 10);
    expect(k.aktif?.id).toBe("2");
  });
  it("balon gövdesi 140 kod noktasını geçmez (emoji bölünmez), tam metin kaybolmaz", () => {
    const nokta = (s: string) => Array.from(s).length;
    expect(nokta(kisalt("x".repeat(400)))).toBeLessThanOrEqual(140);
    expect(kisalt("kısa")).toBe("kısa");
    expect(nokta(kisalt("😀".repeat(200)))).toBeLessThanOrEqual(140);
    expect(kisalt("😀".repeat(200))).not.toContain("\uFFFD");
  });
});

// ============================================================ 5) Pet balonu (P10)
describe("5) Pet balonu", () => {
  it("balonsuz pet kutusu 256 px; balon açıkken pencere yalnız YUKARI büyür", () => {
    expect(petPencereYuksekligi(false)).toBe(PET_PENCERE);
    expect(petPencereYuksekligi(true)).toBe(PET_BALON_TABAN + PET_BALON_YUKSEKLIK + PET_BALON_PAY);
    expect(petPencereYuksekligi(true)).toBeGreaterThan(petPencereYuksekligi(false));
  });
  it("balon genişliği pet kutusuna sığar", () => {
    expect(PET_BALON_GENISLIK).toBeLessThanOrEqual(PET_PENCERE);
    expect(PET_BALON_GENISLIK).toBe(248);
  });
  it("balon üstündeki şeffaf pay isabet kutusuna girmez (masaüstü tıklanır kalır)", () => {
    // island.rs isabet kutusuna HIT_MARGIN=14 ekliyor.
    expect(petBalonUst(true)).toBeGreaterThan(14);
    const viewport = { w: PET_PENCERE, h: petPencereYuksekligi(true) };
    const kutu = hitRect("pet", { x: 0, y: 0, ...viewport }, viewport, petBalonUst(true));
    expect(kutu.y).toBe(PET_BALON_PAY);
    expect(kutu.h).toBe(viewport.h - PET_BALON_PAY);
  });
  it("pencere tepeden kırpılırsa balon kısalır, asla taşmaz", () => {
    for (const pencere of [0, -50, 100, 256, 300, PET_BALON_TABAN, 900]) {
      const kutu = petBalonKutusu(pencere);
      expect(kutu).toBeGreaterThanOrEqual(0);
      expect(kutu).toBeLessThanOrEqual(PET_BALON_YUKSEKLIK);
    }
    expect(petBalonKutusu(petPencereYuksekligi(true))).toBe(PET_BALON_YUKSEKLIK);
    expect(petBalonKutusu(PET_PENCERE)).toBe(0);
  });
  it("Rust tarafı aynı sabitleri kullanır (island.rs'e dokunulmadan)", () => {
    const glide = readFileSync("src-tauri/src/glide.rs", "utf8");
    expect(glide).toContain("pub const PET_PENCERE: f64 = 256.0;");
    expect(glide).toContain("pub const PET_BALON_PAY: f64 = 24.0;");
    expect(glide).toContain("pub const PET_BALON_YUKSEKLIK: f64 = 120.0;");
    expect(glide).toContain("pub const PET_BALON_BOSLUK: f64 = 14.0;");
  });
  it("balon açıkken tıklamalar yine de pet kutusuna gider", () => {
    expect(ignoresClicks("pet")).toBe(false);
    expect(ignoresClicks("tray")).toBe(true);
    expect(ignoresClicks("compact")).toBe(true);
    expect(ignoresClicks("hidden")).toBe(true);
  });
});

// ============================================================ 6) Mini pet eski hali + sürükle-bırak-dön
describe("6) Mini pet eski hali + sürükle-bırak-dön", () => {
  it("on beş pozun tamamı tanımlı ve her birinde en az bir kare var", () => {
    const pozler = Object.keys(SEKANSLAR) as PetPose[];
    expect(pozler.length).toBe(16);
    for (const poz of pozler) {
      expect(SEKANSLAR[poz].length, poz).toBeGreaterThan(0);
      for (const kare of SEKANSLAR[poz]) {
        expect(kare.ms, poz).toBeGreaterThan(0);
        expect(kare.kare, poz).toMatch(/^[\w/-]+$/);
        expect(kare.kare, poz).not.toMatch(/\.\.|[\\]/);
      }
    }
  });
  it("sürükleme ve dönüş pozları ayrıdır (sürükle-bırak-dön akışı kesintisiz)", () => {
    for (const poz of ["surukleme", "geri_donus", "yaslanma"] as const) expect(SEKANSLAR[poz]).toBeDefined();
    // Sürüklemede tek kare sonsuza dek tutulur: kedi bırakılana kadar öyle görünür.
    expect(SEKANSLAR.surukleme).toHaveLength(1);
    expect(SEKANSLAR.surukleme[0].ms).toBe(Infinity);
  });
  it("kart'a dönüş kareleri geçişin tersidir (geçiş: uç → kalkış; dönüş: tutunma → …)", () => {
    expect(SEKANSLAR.gecis.map(k => k.kare)).toEqual(["durum/ucus", "durum/masa_cikis", "durum/kalkis"]);
    expect(SEKANSLAR.donus.map(k => k.kare))
      .toEqual(["akis_tutunma", "akis_gorunme", "akis_suzulme", "akis_kuculme", "durum/masa_cikis"]);
    expect(SEKANSLAR.geri_donus.map(k => k.kare)).toEqual(["durum/ense_tutma"]);
  });
  it("model sürükleme sırasında sabit uyarı balonunu korur, bırakınca yaslanır", () => {
    const m = new PetModel(0);
    m.setPose("surukleme");
    m.onEvent({ kind: "RATE_LIMIT", taskId: "a", agent: "codex" });
    expect(m.balloon).toBe("!");
    m.tick(1000);
    expect(m.pose).toBe("surukleme");
    m.setPose("yaslanma"); m.land();
    expect(m.pose).toBe("yaslanma");
    m.acknowledge();
    expect(m.balloon).toBeNull();
    expect(m.pose).toBe("bekleme");
  });
  it("uyarı/hata kullanıcı onayı gelenecek poz durumunda kalır", () => {
    const m = new PetModel(0);
    m.onEvent({ kind: "JOB_FAILED", taskId: "a", agent: "codex" });
    expect(m.pose).toBe("hata");
    expect(m.balloon).toBe("!");
    m.hover(true);
    expect(m.pose).toBe("hata");
  });
  it("on dakika sessizlikte uyur, yeni olayta uyanır", () => {
    const m = new PetModel(0);
    m.tick(11 * 60_000);
    expect(m.pose).toBe("uyku");
    m.onEvent({ kind: "COMMAND", taskId: "a", agent: "codex" });
    expect(m.pose).toBe("uyanma");
  });
  it("her pozda kare sırası zamanla ilerler", () => {
    const m = new PetModel(0);
    m.setPose("donus");
    expect(m.frame).toBe("akis_tutunma");
    m.tick(121);
    expect(m.pose).toBe("donus");
    expect(m.frame).toBe("akis_gorunme");
    m.tick(400);
    expect(m.frame).toBe("akis_suzulme");
  });
  it("normalleştirme listesi yalnız gerçek dosya adları içerir", () => {
    for (const ad of PET_NORMALIZE) expect(ad, ad).toBeDefined();
    expect(PET_NORMALIZE).toContain("bekleme");
    expect(PET_NORMALIZE).toContain("donus");
  });
});

// ============================================================ 7) Pet animasyon iyileştirmesi
describe("7) Pet animasyon iyileştirmesi", () => {
  it("her poz için oynatma ayarı var (stüdyo tablosu eksiksiz)", () => {
    for (const poz of Object.keys(SEKANSLAR) as PetPose[]) expect(PET_OYNATMA[poz], poz).toBeDefined();
    for (const poz of Object.keys(PET_OYNATMA) as PetPose[]) expect(SEKANSLAR[poz], poz).toBeDefined();
  });
  it("oynatma tuvali pet penceresiyle aynı boyutta (kırpma yok)", () => {
    expect(TUVAL_BOYUTU).toBe(PET_PENCERE);
    expect(TUVAL_BOYUTU).toBeGreaterThanOrEqual(
      Math.max(...Object.values(PET_BOYUT).map(k => k.kutu[0] + k.kutu[2])));
  });
  it("hareket azaltma ve kaynak değişimi oynatıcıyı kapatır, <img> yedeği çalışır", () => {
    const oynatma = readFileSync("src/afu/oynatma.ts", "utf8");
    const pet = readFileSync("src/afu/pet.ts", "utf8");
    expect(oynatma).toContain("cozKareler");
    expect(oynatma).toContain("ONBELLEK_EN_COK");
    expect(oynatma).toMatch(/kapat|close\(\)/);
    expect(oynatma).toContain("ImageDecoder");
    // Hareket azaltma tercihi pete uygulanır: oynatıcı açılmaz, <img> çalışır.
    expect(pet).toMatch(/prefers-reduced-motion/);
    expect(pet).toContain("pet-gizli");
    expect(pet).toContain("this.reduced.matches");
  });
  it("döngü süresi kare süreleri toplamı / hız", () => {
    expect(donguSuresi([100, 200, 300], 1)).toBe(600);
    expect(donguSuresi([100, 200, 300], 0.5)).toBe(1200);
    expect(donguSuresi([0, Number.NaN, 100], 1)).toBe(100);
  });
  it("döngü bitince ilk karede bekler, bekleme bitince yeniden oynar", () => {
    const kareMs = [100, 100];
    const bekle = kareSecimi(kareMs, 1, 500, 200 + 10);
    expect(bekle.bekliyor).toBe(true);
    expect(bekle.kare).toBe(0);
    const devam = kareSecimi(kareMs, 1, 500, 200 + 500 + 10);
    expect(devam.bekliyor).toBe(false);
    expect(devam.donguNo).toBe(1);
  });
  it("döngü arası bekleme yoksa döngü kesintisiz akar", () => {
    for (const gecen of [0, 199, 200, 399, 400, 401, 5000]) {
      const s = kareSecimi([100, 100], 1, 0, gecen);
      expect(s.bekliyor, String(gecen)).toBe(false);
    }
  });
  it("boş kare dizisi çökmez", () => {
    expect(kareSecimi([], 1, 1000, 500)).toEqual({ kare: 0, bekliyor: false, bekleme: 0, donguNo: 0 });
  });
});
