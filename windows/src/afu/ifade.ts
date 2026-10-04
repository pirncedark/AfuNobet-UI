// W7: Afu boştayken arada bir kısa ifade yapar, sonra bekleme pozuna döner.
// Saf mantık: zaman ve rastgelelik dışarıdan verilir; DOM, zamanlayıcı yok.
// Kareler yalnız mevcut görsellerdir (windows/public/afu/pet ve /durum).

export type IfadeKare = { kare: string; ms: number };
export type Ifade = { ad: string; kareler: readonly IfadeKare[] };
export type Rastgele = () => number;

export const IFADE_ARALIK = { enAz: 20000, enCok: 60000 } as const;

export const IFADELER: readonly Ifade[] = [
  { ad: "goz_kirpma", kareler: [{ kare: "idle_goz_kapali", ms: 220 }, { kare: "idle_goz_acilis", ms: 220 }] },
  { ad: "saga_bakis", kareler: [{ kare: "idle_sag", ms: 1600 }] },
  { ad: "sola_bakis", kareler: [{ kare: "idle_sol", ms: 1600 }] },
  { ad: "mutlu", kareler: [{ kare: "durum/gulumseme", ms: 1800 }] },
  { ad: "saskin", kareler: [{ kare: "durum/sasirma", ms: 1400 }] },
  { ad: "esneme", kareler: [{ kare: "tepki_uyku", ms: 2000 }] },
];

/** 0..1 aralığına sıkıştırılmış rastgele sayı (bozuk değer gelirse 0,5). */
function oran(rnd: Rastgele): number {
  const r = Number(rnd());
  if (!Number.isFinite(r)) return 0.5;
  return Math.min(1, Math.max(0, r));
}

/** Bir sonraki ifadeye kadar beklenecek süre: her zaman 20–60 sn arası. */
export function sonrakiAralik(rnd: Rastgele = Math.random): number {
  return Math.round(IFADE_ARALIK.enAz + (IFADE_ARALIK.enCok - IFADE_ARALIK.enAz) * oran(rnd));
}

/** Bir öncekiyle aynı olmayan ifadeyi seçer. */
export function ifadeSec(onceki: string | null, rnd: Rastgele = Math.random, ifadeler: readonly Ifade[] = IFADELER): Ifade {
  const adaylar = ifadeler.length > 1 ? ifadeler.filter(ifade => ifade.ad !== onceki) : ifadeler;
  const sira = Math.min(adaylar.length - 1, Math.floor(oran(rnd) * adaylar.length));
  return adaylar[sira];
}

export function ifadeSuresi(ifade: Ifade): number {
  return ifade.kareler.reduce((toplam, kare) => toplam + kare.ms, 0);
}

export type IfadeKosul = {
  /** Afu bekleme pozunda ve hiçbir şey olmuyor mu (iş, soru, balon, sürükleme, kart, tam ekran yok). */
  bosta: boolean;
  /** Ayar: "Arada ifade yap". */
  acik: boolean;
};

/**
 * Zamanlayıcı + seçici. `tick` her çağrıda gösterilecek ifade karesini döndürür;
 * ifade yoksa `null` döner ve Afu normal bekleme pozunu çizer.
 * Meşgul olunca ya da ayar kapanınca ifade hemen biter ve sayaç sıfırlanır.
 */
export class IfadeZamanlayici {
  private sonraki: number | null = null;
  private aktif: { ifade: Ifade; basla: number } | null = null;
  private onceki: string | null = null;
  constructor(private readonly rnd: Rastgele = Math.random, private readonly ifadeler: readonly Ifade[] = IFADELER) {}

  get sonrakiZaman() { return this.sonraki; }
  get aktifIfade() { return this.aktif?.ifade.ad ?? null; }
  get oncekiIfade() { return this.onceki; }

  sifirla() { this.sonraki = null; this.aktif = null; }

  tick(now: number, kosul: IfadeKosul): string | null {
    if (!kosul.acik || !kosul.bosta || !this.ifadeler.length) { this.sifirla(); return null; }
    if (this.aktif) {
      let gecen = now - this.aktif.basla;
      for (const kare of this.aktif.ifade.kareler) {
        if (gecen < kare.ms) return kare.kare;
        gecen -= kare.ms;
      }
      // İfade bitti: beklemeye dön, yeni aralık kur.
      this.aktif = null;
      this.sonraki = now + sonrakiAralik(this.rnd);
      return null;
    }
    if (this.sonraki === null) { this.sonraki = now + sonrakiAralik(this.rnd); return null; }
    if (now < this.sonraki) return null;
    const ifade = ifadeSec(this.onceki, this.rnd, this.ifadeler);
    this.aktif = { ifade, basla: now };
    this.onceki = ifade.ad;
    this.sonraki = null;
    return ifade.kareler[0]?.kare ?? null;
  }
}

/** Afu'yu meşgul sayan durumlar: iş çalışıyor/hazırlanıyor/cevap bekliyor, soru ya da balon açık. */
export function petMesgul(durum: { gorevler: readonly { status: string }[]; soruAcik: boolean; balonAcik: boolean }): boolean {
  if (durum.soruAcik || durum.balonAcik) return true;
  return durum.gorevler.some(gorev => gorev.status === "Calisiyor" || gorev.status === "Hazirlaniyor" || gorev.status === "Bekliyor");
}
