// Q2 (F11/F12): her açılır katmana aynı davranış — Esc kapatır, dışarı tıklama
// kapatır, açılınca odak ilk düğmeye girer, kapanınca odak açan düğmeye döner,
// Tab katmanın içinde hapsolur. Pencereyi kilitleyen alert() yoktur.
import { h } from "./dom";

const FOCUSABLE = "button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex='-1'])";

type Odaklanabilir = { focus?: () => void };

/** Etkin öğe; sahte DOM'da `document` yoksa null döner (odak testi yapılmaz). */
function etkin(): Odaklanabilir | null {
  if (typeof document === "undefined") return null;
  return (document.activeElement as Odaklanabilir | null) ?? null;
}

/** Katmanın sahibi olan belge (sahte DOM'da olmayabilir). */
function belge(kok: HTMLElement): Document | null {
  return kok.ownerDocument ?? (typeof document === "undefined" ? null : document);
}

/** Katman içindeki odaklanabilir öğeler, DOM sırasıyla. */
export function odaklanabilirler(kok: HTMLElement): HTMLElement[] {
  return (Array.from(kok.querySelectorAll?.(FOCUSABLE) ?? []) as HTMLElement[]).filter(el => {
    if (el.getAttribute?.("tabindex") === "-1") return false;
    for (let parent: HTMLElement | null = el; parent; parent = parent.parentElement) {
      if (parent.hidden || parent.inert) return false;
      if (parent.tagName?.toLowerCase() === "details" && !((parent as HTMLDetailsElement).open)) {
        const summary = parent.querySelector?.("summary");
        if (el !== summary && !summary?.contains(el)) return false;
      }
      if (parent === kok) break;
    }
    return true;
  });
}

/** Açılınca odak ilk düğmeye gider (yoksa katmanın kendisine). */
export function ilkDugmeyeOdak(kok: HTMLElement) {
  const items = odaklanabilirler(kok);
  (items.find(el => el.tagName.toLowerCase() === "button") ?? items[0] ?? kok)?.focus?.();
}

/** Tab/Shift+Tab döngüsü katman içinde kalır. */
export function tabHapsi(kok: HTMLElement, e: KeyboardEvent): boolean {
  if (e.key !== "Tab") return false;
  const ogeler = odaklanabilirler(kok);
  if (!ogeler.length) { e.preventDefault(); kok.focus?.(); return true; }
  const i = ogeler.indexOf(etkin() as HTMLElement);
  const sonraki = e.shiftKey ? (i <= 0 ? ogeler.length - 1 : i - 1) : (i === -1 || i === ogeler.length - 1 ? 0 : i + 1);
  e.preventDefault();
  ogeler[sonraki].focus?.();
  return true;
}

/** Katmanın tuş takımı: Esc kapatır (yukarı yayılmaz), Tab hapsolur. */
export function katmanTusu(kok: HTMLElement, e: KeyboardEvent, kapat: () => void): boolean {
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); kapat(); return true; }
  const trapped = tabHapsi(kok, e);
  if (trapped) e.stopPropagation();
  return trapped;
}

/** Her katmanda aynı görünen kapatma yolu: ✕ + etiket + klavye ile çalışır. */
export function kapatDugmesi(simif: string, etiket: string, kapat: () => void, rol?: string): HTMLButtonElement {
  const d = h("button", { class: simif, type: "button", text: "✕", title: etiket, "aria-label": etiket, onclick: () => kapat() });
  if (rol) d.setAttribute("role", rol);
  return d;
}

export interface KatmanSecenekleri {
  /** Dışarı tıklama bu kabın dışında sayılır (ör. menüyü açan düğme). */
  ignore?: readonly (HTMLElement | null | undefined)[];
  /** Açılınca odak ilk düğmeye gitmesin (odak pencereyi gereksiz yere uyandırır). */
  odakAlma?: boolean;
  /**
   * Odak nereye gidecek? Varsayılan: katmandaki ilk odaklanabilir. Katman bir
   * `<details>` ise `summary` da odaklanabilirdir; o zaman gerçek ilk düğme
   * (ör. ✕) buradan verilir, kullanıcı menüyü yanlışlıkla kapatmaz.
   */
  ilk?: HTMLElement | null;
  acan?: HTMLElement | null;
}

/**
 * Açılır katman davranışı. Sahibi kapatır (gizler), bu sınıf yalnız
 * dinleyicileri bağlar ve odak geri döner.
 */
export class Katman {
  private acan: Odaklanabilir | null = null;
  private cozucu: (() => void) | null = null;
  constructor(private kok: HTMLElement, private kapat: () => void) {}
  get acikMi() { return this.cozucu !== null; }
  /** Katmanı açar: odak hatırlanır, ilk düğmeye girilir, Esc ve dışarı tıklama bağlanır. */
  ac(secenek: KatmanSecenekleri = {}) {
    if (this.acikMi) return;
    this.acan = secenek.acan ?? etkin();
    const disari = (e: Event) => {
      if (katmanSirasi.at(-1) !== this) return;
      const hedef = e.target as Node | null;
      if (!hedef) return;
      if (this.kok.contains?.(hedef)) return;
      if (secenek.ignore?.some(el => el?.contains?.(hedef))) return;
      this.kapat();
    };
    const tus = (e: Event) => { katmanTusu(this.kok, e as KeyboardEvent, this.kapat); };
    const doc = belge(this.kok);
    this.kok.addEventListener?.("keydown", tus);
    doc?.addEventListener?.("pointerdown", disari);
    this.cozucu = () => {
      this.kok.removeEventListener?.("keydown", tus);
      doc?.removeEventListener?.("pointerdown", disari);
    };
    acikKatmanlar.set(this.kok, this);
    katmanSirasi.push(this);
    if (secenek.odakAlma === false) return;
    if (secenek.ilk) { secenek.ilk.focus?.(); return; }
    ilkDugmeyeOdak(this.kok);
  }
  /** Katman kapandı: odak açan öğeye döner, dinleyiciler çözülür. */
  kapandı() {
    acikKatmanlar.delete(this.kok);
    const i = katmanSirasi.indexOf(this);
    if (i !== -1) katmanSirasi.splice(i, 1);
    this.cozucu?.(); this.cozucu = null;
    const don: Odaklanabilir | null = this.acan; this.acan = null;
    don?.focus?.();
  }
}

const acikKatmanlar = new WeakMap<HTMLElement, Katman>();

/** Katmanı kapatır: dinleyiciler çözülür, odak açan öğeye döner. */
export function katmaniKapat(kok: HTMLElement) { acikKatmanlar.get(kok)?.kapandı(); }
const katmanSirasi: Katman[] = [];
