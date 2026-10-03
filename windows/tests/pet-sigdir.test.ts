import { describe, expect, it } from "vitest";
import { PET_AYAR, PET_BOYUT, PET_NORMALIZE, SEKANSLAR, sigdir, type PetPose } from "../src/afu/pet";
import { PET_PENCERE } from "../src/core/layout";

const PAY = 6;
type Kutu = [number, number, number, number];
// CSS scale/translate, transform-origin etrafında: nokta p -> (p - o) * s + t + o
function cerceve(kutu: Kutu, olcek: number, x: number, y: number, originX = PET_PENCERE / 2, originY = PET_PENCERE) {
  const [L, T, R, B] = kutu.map(ratio => ratio * PET_PENCERE) as [number, number, number, number];
  const x0 = (L - originX) * olcek + originX + x;
  const x1 = (R - originX) * olcek + originX + x;
  const y0 = (T - originY) * olcek + originY + y;
  const y1 = (B - originY) * olcek + originY + y;
  return { left: x0, right: x1, top: y0, bottom: y1 };
}
function icinde(kutu: Kutu, sonuc: { olcek: number; x: number; y: number }, originY = PET_PENCERE) {
  const k = cerceve(kutu, sonuc.olcek, sonuc.x, sonuc.y, PET_PENCERE / 2, originY);
  return {
    sol: k.left >= PAY - 0.001,
    sag: k.right <= PET_PENCERE - PAY + 0.001,
    ust: k.top >= PAY - 0.001,
    alt: k.bottom <= PET_PENCERE - PAY + 0.001,
  };
}

describe("sigdir — çerçeveye göre sığdır", () => {
  it("taşan uçuş karesini çerçevenin içine alır", () => {
    const ucus = PET_BOYUT["durum/ucus"];
    const ayar = PET_AYAR.gecis;
    const s = sigdir(ucus.kutu, ucus.olcek, ayar.x, ayar.y + ucus.y * PET_PENCERE);
    expect(icinde(ucus.kutu, s)).toEqual({ sol: true, sag: true, ust: true, alt: true });
    // kullanıcının şikayeti: gecis pozunda alt kenar görev çubuğunun altına taşıyordu
    expect(s.y).toBeLessThan(ayar.y + ucus.y * PET_PENCERE);
  });

  it("çerçeveye sığan kutuyu değiştirmez (kullanıcı tasarımı korunur)", () => {
    const merkez: Kutu = [0.3, 0.3, 0.7, 0.7];
    const sonuc = sigdir(merkez, 1, 0, 0);
    expect(sonuc).toEqual({ olcek: 1, x: 0, y: 0 });
  });

  it("sığan kutu ölçek ve kaydırması aynen korunur", () => {
    const kutu: Kutu = [0.2, 0.4, 0.8, 0.9];
    const olcek = 0.8;
    const x = 10;
    const y = -4;
    const k = cerceve(kutu, olcek, x, y);
    if (k.left >= PAY && k.right <= PET_PENCERE - PAY && k.top >= PAY && k.bottom <= PET_PENCERE - PAY) {
      expect(sigdir(kutu, olcek, x, y)).toEqual({ olcek, x, y });
    }
  });

  it("sol taşmayı içeri alır", () => {
    const kutu: Kutu = [0.0, 0.4, 0.4, 0.9];
    const s = sigdir(kutu, 1, 0, 0);
    expect(cerceve(kutu, s.olcek, s.x, s.y).left).toBeCloseTo(PAY, 6);
  });

  it("sağ taşmayı içeri alır", () => {
    const kutu: Kutu = [0.6, 0.4, 1.0, 0.9];
    const s = sigdir(kutu, 1, 0, 0);
    expect(cerceve(kutu, s.olcek, s.x, s.y).right).toBeCloseTo(PET_PENCERE - PAY, 6);
  });

  it("üst taşmayı içeri alır", () => {
    const kutu: Kutu = [0.3, 0.0, 0.7, 0.3];
    const s = sigdir(kutu, 1, 0, 0);
    expect(cerceve(kutu, s.olcek, s.x, s.y).top).toBeCloseTo(PAY, 6);
  });

  it("alt taşmayı içeri alır", () => {
    const kutu: Kutu = [0.3, 0.7, 0.7, 1.0];
    const s = sigdir(kutu, 1, 0, 0);
    expect(cerceve(kutu, s.olcek, s.x, s.y).bottom).toBeCloseTo(PET_PENCERE - PAY, 6);
  });

  it("çerçeveden büyük kutuyu orantılı küçültür", () => {
    const kutu: Kutu = [0, 0, 1, 1];
    const s = sigdir(kutu, 1, 0, 0);
    expect(s.olcek).toBeCloseTo((PET_PENCERE - 2 * PAY) / PET_PENCERE, 9);
    expect(cerceve(kutu, s.olcek, s.x, s.y)).toMatchObject({ left: PAY, right: PET_PENCERE - PAY });
  });

  it("her poz ve kare çerçeveden taşmaz", () => {
    const sorunlar: string[] = [];
    for (const [pose, sekans] of Object.entries(SEKANSLAR) as [PetPose, { kare: string; ms: number }[]][]) {
      const ayar = PET_AYAR[pose];
      for (const { kare } of sekans) {
        const boyut = PET_BOYUT[kare];
        if (!boyut) { sorunlar.push(`${pose}/${kare}: ölçü yok`); continue; }
        const olcek = (PET_NORMALIZE.includes(pose) ? boyut.olcek : 1) * ayar.olcek / 100;
        const x = ayar.x + boyut.x * PET_PENCERE * ayar.olcek / 100;
        const y = ayar.y + boyut.y * PET_PENCERE * ayar.olcek / 100;
        const s = sigdir(boyut.kutu, olcek, x, y);
        const k = icinde(boyut.kutu, s);
        if (!k.sol || !k.sag || !k.ust || !k.alt) sorunlar.push(`${pose}/${kare}: ${JSON.stringify(k)}`);
      }
    }
    expect(sorunlar).toEqual([]);
  });

  it("tablo ölçüsü olmayan kare için tüm çerçeveyi kullanır", () => {
    const s = sigdir([0, 0, 1, 1], 1, 0, 0);
    expect(s.olcek).toBeCloseTo((PET_PENCERE - 2 * PAY) / PET_PENCERE, 9);
    expect(s.x).toBeCloseTo(0, 9);
    // alt kenar 6px payla pencerenin dibine oturur (ayak çizgisi korunur)
    expect(s.y).toBeCloseTo(-PAY, 9);
  });

  it("çerçeveye tam sığan kutu küçültülmez", () => {
    const kutu: Kutu = [PAY / PET_PENCERE, PAY / PET_PENCERE, 1 - PAY / PET_PENCERE, 1 - PAY / PET_PENCERE];
    expect(sigdir(kutu, 1, 0, 0).olcek).toBeCloseTo(1, 9);
  });
});
