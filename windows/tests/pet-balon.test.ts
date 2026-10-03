import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PET_BALON_BOSLUK, PET_BALON_PAY, PET_BALON_TABAN, PET_BALON_YUKSEKLIK, PET_PENCERE, petBalonKutusu, petBalonUst, petPencereYuksekligi } from "../src/core/layout";
import { hitRect } from "../src/core/hit";
import { BalonModeli, type Mesaj } from "../src/message/message";

/** island.rs isabet kutusuna eklediği pay; şeffaf tepeden büyük olmalı. */
const HIT_MARGIN = 14;
const mesaj = (id: string): Mesaj => ({ surum: 1, id, ajan: "claude", tur: "bilgi", metin: `Mesaj ${id}`, zaman: 0 });

describe("P10 pet balonu — pencere yüksekliği", () => {
  it("balonsuzken pet kutusu 256 px kalır", () => {
    expect(petPencereYuksekligi(false)).toBe(PET_PENCERE);
    expect(petPencereYuksekligi(false)).toBe(256);
  });
  it("balon açıkken pencere YUKARI büyür: alt kenar görev çubuğu üstünde sabit", () => {
    expect(PET_BALON_TABAN).toBe(PET_PENCERE + PET_BALON_BOSLUK);
    expect(petPencereYuksekligi(true)).toBe(PET_BALON_TABAN + PET_BALON_YUKSEKLIK + PET_BALON_PAY);
    expect(petPencereYuksekligi(true)).toBe(508);
    // Büyüme yalnız yukarı: alt kenar (pencere dibi) değişmez.
    expect(petPencereYuksekligi(true) - PET_BALON_TABAN).toBe(PET_BALON_YUKSEKLIK + PET_BALON_PAY);
  });
  it("Rust tarafı aynı sayıları kullanır (glide.rs)", () => {
    const glide = readFileSync("src-tauri/src/glide.rs", "utf8");
    for (const [ad, deger] of [["PET_PENCERE", "256.0"], ["PET_BALON_PAY", "24.0"], ["PET_BALON_YUKSEKLIK", "220.0"], ["PET_BALON_BOSLUK", "8.0"]] as const) {
      expect(glide).toContain(`pub const ${ad}: f64 = ${deger};`);
    }
    expect(glide).toContain("PET_BALON_TABAN + PET_BALON_YUKSEKLIK + PET_BALON_PAY");
  });
});

describe("P10 pet balonu — kesme ve tıklama geçişi", () => {
  it("balonun üstündeki şeffaf pay isabet kutusuna girmez", () => {
    // Pay, island.rs'in eklediği HIT_MARGIN'den büyük olmalı; aksi hâlde boş
    // kısım tıklamayı yutar ve masaüstüne tıklanamaz.
    expect(petBalonUst(true)).toBeGreaterThan(HIT_MARGIN);
    expect(petBalonUst(false)).toBe(0);
    const viewport = { w: PET_PENCERE, h: petPencereYuksekligi(true) };
    expect(hitRect("pet", { x: 0, y: 0, ...viewport }, viewport, petBalonUst(true)))
      .toEqual({ x: 0, y: PET_BALON_PAY, w: PET_PENCERE, h: viewport.h - PET_BALON_PAY });
    // Balonsuzken kutunun tamamı tıklanır (preexisting davranış bozulmaz).
    const dar = { w: PET_PENCERE, h: PET_PENCERE };
    expect(hitRect("pet", { x: 0, y: 0, ...dar }, dar, petBalonUst(false)))
      .toEqual({ x: 0, y: 0, w: PET_PENCERE, h: PET_PENCERE });
  });
  it("pencere tepeden kırpılırsa balon kutusu kısalır, hiçbir zaman taşmaz", () => {
    expect(petBalonKutusu(petPencereYuksekligi(true))).toBe(PET_BALON_YUKSEKLIK);
    expect(petBalonKutusu(300)).toBe(300 - PET_BALON_TABAN - PET_BALON_PAY);
    expect(petBalonKutusu(PET_PENCERE)).toBe(0);
    expect(petBalonKutusu(350, 200)).toBe(126);
    expect(petBalonKutusu(200, 200)).toBe(0);
    for (const pencere of [0, -10, 256, 300, 508, 900]) {
      expect(petBalonKutusu(pencere)).toBeGreaterThanOrEqual(0);
      expect(petBalonKutusu(pencere)).toBeLessThanOrEqual(PET_BALON_YUKSEKLIK);
    }
  });
  it("island.ts balon açıkken isabet payını ve kutu yüksekliğini gönderir", () => {
    const island = readFileSync("src/island/island.ts", "utf8");
    expect(island).toContain("petBalonUst(this.petBalon)");
    expect(island).toContain("--pet-balon-h");
    expect(island).toContain("petBalonKutusu(height, bottom)");
    expect(island).toContain("petPencereYuksekligi(this.petBalon)");
    // Balon kutusu ayrı bir katman: `#afu-pet` overflow:hidden olduğu için içine konulamaz.
    expect(island).toContain('h("div", { id: "afu-pet-balon" })');
  });
});

describe("P10 pet balonu — kuyruk", () => {
  it("kuyruk arkaya mesaj alır, balon kendiliğinden kaybolmaz", () => {
    const m = new BalonModeli(); m.gorunur(true, 0);
    m.ekle(mesaj("a"), 0); m.ekle(mesaj("b"), 0); m.ekle(mesaj("c"), 0);
    expect(m.aktif?.id).toBe("a");
    // P11 kuralı: otomatik kapanma yok, kullanıcı × (kapat) ile kapatır.
    m.tick(600000); expect(m.aktif?.id).toBe("a");
    expect(m.sira).toBe(2);
  });
  it("× ile kapanınca sıradaki mesaj gösterilir", () => {
    const m = new BalonModeli(); m.gorunur(true, 0);
    m.ekle(mesaj("a"), 0); m.ekle(mesaj("b"), 0);
    expect(m.kapat()).toBe(true);
    expect(m.aktif?.id).toBe("b");
    expect(m.kapat()).toBe(true);
    expect(m.aktif).toBeNull();
    expect(m.kapat()).toBe(false);
  });
  it("kuyruk en fazla beş mesaj tutar, en eski düşer", () => {
    const m = new BalonModeli(); m.gorunur(true, 0);
    for (let i = 0; i < 9; i++) m.ekle(mesaj(String(i)), i);
    // Aktif mesaj kuyruktan düştüğü için kuyrukta en fazla beş mesaj kalır.
    expect(m.aktif?.id).toBe("0");
    expect(m.bekleyen.map(x => x.id)).toEqual(["4", "5", "6", "7", "8"]);
    m.kapat();
    expect(m.aktif?.id).toBe("4");
  });
  it("aynı olay iki kez balonu yeniden kurmaz", () => {
    const m = new BalonModeli(); m.gorunur(true, 0);
    m.ekle(mesaj("a"), 0); m.ekle(mesaj("a"), 1);
    expect(m.sira).toBe(0);
    expect(m.aktif?.id).toBe("a");
  });
});
