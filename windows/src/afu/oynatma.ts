// P7 — mini pet animasyon hızı ve döngü arası bekleme.
// Animasyonlu webp <img> ile kendi hızında oynar; burada kare kare çözülüp
// canvas'a çizilir, böylece hız (0,25–2) ve döngü arası bekleme ayarlanabilir.
// ImageDecoder yoksa çözücü null döner, oynatıcı hiç açılmaz ve eski <img>
// davranışı aynen sürer. Saf zamanlama fonksiyonları sahte saatle test edilir.

import { PET_PENCERE } from "../core/layout";

export const HIZ_EN_AZ = 0.25;
export const HIZ_EN_COK = 2;
export const DONGU_EN_COK = 60000;
export const DONGU_TOLERANS = 0.3;
export const DONGU_SINIRI = 100000;
export const ONBELLEK_EN_COK = 4;

export type Oynatma = { hiz: number; donguArasi: number };
export const OYNATMA_TEMEL: Oynatma = { hiz: 1, donguArasi: 0 };

export type KareVerisi = { kareMs: number[]; kareler: ImageBitmap[] };
export type KareCozucu = (kaynak: string) => Promise<KareVerisi | null>;
export type KareCizici = (kare: number, kareler: readonly ImageBitmap[]) => void;
export type Zamanlayici = { planla(is: () => void, ms: number): number; iptal(kimlik: number): void };

export const TARAYICI_ZAMANLAYICI: Zamanlayici = {
  planla: (is, ms) => window.setTimeout(is, ms),
  iptal: kimlik => window.clearTimeout(kimlik),
};

/** Eksik/geçersiz değerleri sınırlar içine alır; tanımsızsa hız 1, bekleme 0. */
export function oynatmaDuzelt(ayar: Partial<Oynatma> | null | undefined): Oynatma {
  const istenenHiz = Number(ayar?.hiz);
  const istenenBekleme = Number(ayar?.donguArasi);
  const hiz = Number.isFinite(istenenHiz) ? Math.min(HIZ_EN_COK, Math.max(HIZ_EN_AZ, istenenHiz)) : OYNATMA_TEMEL.hiz;
  const donguArasi = Number.isFinite(istenenBekleme) ? Math.min(DONGU_EN_COK, Math.max(0, istenenBekleme)) : OYNATMA_TEMEL.donguArasi;
  return { hiz, donguArasi };
}

/** Döngü arası bekleme verilen oynakla ±%30 aralığında değişir (doğal ritim). */
export function rastgeleBekleme(donguArasi: number, rnd: number): number {
  if (!(donguArasi > 0)) return 0;
  const oynak = Math.min(1, Math.max(0, rnd));
  return donguArasi * (1 - DONGU_TOLERANS + 2 * DONGU_TOLERANS * oynak);
}

/**
 * Bir döngünün bekleme oynağı. `tohum` oynatıcı başlarken bir kez seçilir; aynı
 * (döngü no, tohum) çifti her zaman aynı oynağı verir, böylece kare seçimi
 * çağrılar arasında titremez. İlk döngü tam ayar değerinde bekler (kullanıcının
 * verdiği süre), sonrakiler salınır — göz kırpma hep aynı aralıkta olmaz.
 */
export function donguOynagi(donguNo: number, tohum = 0.5): number {
  if (!(donguNo > 0)) return 0.5;
  const karistir = (Math.imul(donguNo, 2654435761) ^ Math.imul(Math.round(tohum * 1e6) >>> 0, 2246822519)) >>> 0;
  return (karistir % 1000) / 1000;
}

/** Kare süreleri toplamının hız çarpanına bölümü: bir döngünün gerçek süresi. */
export function donguSuresi(kareMs: readonly number[], hiz: number): number {
  const toplam = kareMs.reduce((toplam, ms) => toplam + (Number.isFinite(ms) && ms > 0 ? ms : 0), 0);
  return toplam / oynatmaDuzelt({ hiz }).hiz;
}

export type KareSecimi = { kare: number; bekliyor: boolean; bekleme: number; donguNo: number };

/**
 * `gecen` ms sonunda hangi kare gösterilmeli. Döngü bittiğinde ilk kare
 * `donguArasi` kadar bekler; bekleme döngüden döngüye rastgele ±%30 olduğu için
 * döngü sınırları tek tek biriktirilerek bulunur (birikimli, tek seferlik).
 */
export function kareSecimi(kareMs: readonly number[], hiz: number, donguArasi: number, gecen: number, tohum = 0.5): KareSecimi {
  const adet = kareMs.length;
  if (!adet) return { kare: 0, bekliyor: false, bekleme: 0, donguNo: 0 };
  const { hiz: h } = oynatmaDuzelt({ hiz });
  const dongu = donguSuresi(kareMs, h);
  if (dongu <= 0) return { kare: 0, bekliyor: false, bekleme: 0, donguNo: 0 };
  let kalan = Math.max(0, gecen);
  for (let donguNo = 0; donguNo <= DONGU_SINIRI; donguNo++) {
    if (kalan < dongu) {
      for (let i = 0; i < adet; i++) {
        const ms = Number.isFinite(kareMs[i]) && kareMs[i] > 0 ? kareMs[i] / h : 0;
        if (kalan < ms) return { kare: i, bekliyor: false, bekleme: 0, donguNo };
        kalan -= ms;
      }
      return { kare: adet - 1, bekliyor: false, bekleme: 0, donguNo };
    }
    kalan -= dongu;
    const bekleme = rastgeleBekleme(donguArasi, donguOynagi(donguNo, tohum));
    if (kalan < bekleme) return { kare: 0, bekliyor: true, bekleme, donguNo };
    kalan -= bekleme;
  }
  return { kare: 0, bekliyor: false, bekleme: 0, donguNo: DONGU_SINIRI };
}

/** Gerçek kareleri tek tek çözer. Webp desteklenmiyorsa veya kare yoksa null. */
export async function cozKareler(kaynak: string): Promise<KareVerisi | null> {
  if (typeof ImageDecoder === "undefined" || typeof createImageBitmap !== "function" || typeof fetch !== "function") return null;
  let cozucu: ImageDecoder | null = null;
  try {
    if (ImageDecoder.isTypeSupported && !(await ImageDecoder.isTypeSupported("image/webp"))) return null;
    cozucu = new ImageDecoder({ data: await (await fetch(kaynak)).arrayBuffer(), type: "image/webp" });
    await cozucu.tracks.ready;
    const iz = cozucu.tracks.selectedTrack;
    if (!iz || !iz.animated || iz.frameCount < 2) return null;
    const kareMs: number[] = [];
    const kareler: ImageBitmap[] = [];
    for (let kare = 0; kare < iz.frameCount; kare++) {
      const { image } = await cozucu.decode({ frameIndex: kare, completeFramesOnly: true });
      kareMs.push(image.duration ? image.duration / 1000 : 0);
      kareler.push(await createImageBitmap(image));
      image.close();
    }
    return kareler.length > 1 ? { kareMs, kareler } : null;
  } catch {
    return null;
  } finally {
    cozucu?.close();
  }
}

/** Kareyi `<img>` ile aynı biçimde (contain, alt-ortalanmış) tuvale çizer. */
export function tuvalCizici(tuval: HTMLCanvasElement): KareCizici {
  // Çizim bağlamı yoksa (ör. sınamada sahte DOM) çizim atlanır; oynatıcı yine zamanlar.
  const baglam = typeof tuval?.getContext === "function" ? tuval.getContext("2d") : null;
  return (kare, kareler) => {
    if (!baglam || !kareler.length) return;
    const resim = kareler[Math.min(Math.max(0, kare), kareler.length - 1)];
    const olcek = Math.min(tuval.width / resim.width, tuval.height / resim.height);
    const g = resim.width * olcek;
    const y = resim.height * olcek;
    baglam.clearRect(0, 0, tuval.width, tuval.height);
    baglam.drawImage(resim, (tuval.width - g) / 2, tuval.height - y, g, y);
  };
}

export type OynaticiSecenek = {
  cizici: KareCizici;
  cozucu?: KareCozucu;
  zaman?: () => number;
  zamanlayici?: Zamanlayici;
  rastgele?: () => number;
  durum?: (aktif: boolean) => void;
};

/**
 * Bir animasyonlu webp dosyasını hızı ve döngü arası beklemesiyle oynatır.
 * Kurulum tamamen enjekte edilebilir: sahte çözücü, sahte saat ve sahte
 * zamanlayıcı ile test edilir. Kurulum bitene kadar `aktif` false'tır, yani
 * çağıran taraf `<img>` gösterir.
 */
export class WebpOynatici {
  private readonly onbellek = new Map<string, Promise<KareVerisi | null>>();
  private veri: KareVerisi | null = null;
  private kaynak = "";
  private ayar: Oynatma = OYNATMA_TEMEL;
  private baslangic = 0;
  private cizilen = -1;
  private kimlik: number | null = null;
  private acik = true;
  private istekNo = 0;
  private tohum = 0.5;
  aktif = false;

  constructor(private readonly secenek: OynaticiSecenek) {}

  /** Gizliyken döngü durur; görünür olunca kaldığı yerden devam eder. */
  gorunurluk(acik: boolean) {
    this.acik = acik;
    if (!acik) { this.temizle(); return; }
    if (this.veri) this.ilerle();
  }

  /** Kaynak ya da ayar değiştiyse baştan başlar; aynıysa sürekli oynar. */
  oynat(kaynak: string, ayar: Oynatma) {
    const duzeltilmis = oynatmaDuzelt(ayar);
    if (kaynak === this.kaynak && this.veri && duzeltilmis.hiz === this.ayar.hiz && duzeltilmis.donguArasi === this.ayar.donguArasi) {
      this.ilerle();
      return;
    }
    this.temizle();
    this.veri = null;
    this.durum(false);
    this.cizilen = -1;
    this.kaynak = kaynak;
    this.ayar = duzeltilmis;
    this.yukle();
  }

  /** Oynatıcıyı kapatır; çağıran taraf `<img>` gösterir. */
  durdur() {
    this.temizle();
    this.veri = null;
    this.cizilen = -1;
    this.istekNo++;
    this.durum(false);
    this.kaynak = "";
  }

  /** Sahte saatle elle ilerletmek için açık bırakıldı. */
  adim() { this.ilerle(); }

  private temizle() { if (this.kimlik !== null) (this.secenek.zamanlayici ?? TARAYICI_ZAMANLAYICI).iptal(this.kimlik); this.kimlik = null; }
  private zaman() { return (this.secenek.zaman ?? (() => performance.now()))(); }
  private durum(aktif: boolean) {
    if (this.aktif === aktif) return;
    this.aktif = aktif;
    this.secenek.durum?.(aktif);
  }
  private yukle() {
    const kaynak = this.kaynak;
    // Döngü arası beklemenin oynağı oynatma başında bir kez seçilir; böylece
    // bekleme döngüden döngüye salınır ama aynı döngüde titremez.
    this.tohum = Math.min(1, Math.max(0, (this.secenek.rastgele ?? Math.random)()));
    const istek = this.onbellek.get(kaynak) ?? this.secenek.cozucu?.(kaynak) ?? Promise.resolve(null);
    this.onbellek.set(kaynak, istek);
    for (const anahtar of this.onbellek.keys()) {
      if (this.onbellek.size <= ONBELLEK_EN_COK) break;
      if (anahtar !== kaynak) this.onbellek.delete(anahtar);
    }
    const sira = ++this.istekNo;
    void istek.then(veri => {
      // Çözüm sırasında kaynak ya da oynatma isteği değiştiyse sonuç geçersiz.
      if (sira !== this.istekNo || this.kaynak !== kaynak) return;
      if (!veri) { this.durum(false); return; }
      this.veri = veri;
      this.baslangic = this.zaman();
      this.cizilen = -1;
      this.ilerle();
    });
  }
  private ilerle() {
    const veri = this.veri;
    if (!veri) { this.temizle(); this.durum(false); return; }
    if (!this.acik) { this.temizle(); return; }
    const secim = kareSecimi(veri.kareMs, this.ayar.hiz, this.ayar.donguArasi, this.zaman() - this.baslangic, this.tohum);
    this.durum(true);
    if (secim.kare !== this.cizilen) {
      this.cizilen = secim.kare;
      this.secenek.cizici(secim.kare, veri.kareler);
    }
    let sure = (veri.kareMs[Math.min(secim.kare, veri.kareMs.length - 1)] ?? 0) / this.ayar.hiz;
    if (secim.bekliyor) sure = Math.min(sure, 120);
    this.kimlik = (this.secenek.zamanlayici ?? TARAYICI_ZAMANLAYICI).planla(() => { this.kimlik = null; this.ilerle(); }, Math.max(16, Math.min(400, sure)));
  }
}

/** Varsayılan bekleme tuvale de uygulanır (img'de bekleme yoktur). */
export const TUVAL_BOYUTU = PET_PENCERE;
