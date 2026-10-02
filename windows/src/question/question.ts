// Ajan soruları adada: soru kartı + tek tık cevap. Sözleşme: docs/SORU_SOZLESMESI.md.
// Veri Rust'tan gelir ("sorular" olayı / questions_list); cevap answer_question ile yazılır.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./question.css";

export interface Secenek { id: string; etiket: string }
export type SoruTuru = "komut" | "dosya" | "izin" | "soru";
export interface Soru {
  id: string; ajan: string; tur: SoruTuru; baslik: string; metin: string; ayrinti: string | null;
  secenekler: Secenek[]; serbestMetin: boolean; gizli: boolean; olusturma: number; sonGecerlilik: number;
}
export interface Cevap { id: string; secim: string | null; metin: string | null }

const TURLER: readonly SoruTuru[] = ["komut", "dosya", "izin", "soru"];
const KIMLIK = /^[A-Za-z0-9_-]{1,64}$/;
const AJAN_ADLARI: Record<string, string> = { codex: "Codex", gemini: "Gemini", opencode: "OpenCode", jev: "Jev" };
export const MAX_CEVAP = 2000;
const GENEL_HATA = "Cevap gönderilemedi. Yeniden dene.";

export function ajanAdi(ajan: string): string {
  return AJAN_ADLARI[ajan] ?? (ajan ? ajan[0].toUpperCase() + ajan.slice(1) : "Ajan");
}

function metin(v: unknown, enFazla: number): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return v.length > enFazla ? v.slice(0, enFazla - 1) + "…" : v;
}

/** Gelen yükü savunmacı biçimde ayıklar: bozuk, yinelenen ya da süresi geçmiş soru atılır. */
export function sorulariAyikla(ham: unknown, simdi: number): Soru[] {
  if (!Array.isArray(ham)) return [];
  const gorulen = new Set<string>();
  const sonuc: Soru[] = [];
  for (const x of ham) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    if (!KIMLIK.test(id) || gorulen.has(id)) continue;
    const tur = o.tur as SoruTuru;
    const govde = metin(o.metin, 2000);
    const son = Number(o.sonGecerlilik);
    if (!TURLER.includes(tur) || !govde || !Number.isFinite(son) || son <= simdi) continue;
    const secenekler: Secenek[] = Array.isArray(o.secenekler)
      ? o.secenekler.flatMap((s): Secenek[] => {
        const r = s as Record<string, unknown> | null;
        const sid = typeof r?.id === "string" ? r.id : "";
        const etiket = metin(r?.etiket, 40);
        return KIMLIK.test(sid) && etiket ? [{ id: sid, etiket }] : [];
      }).slice(0, 6)
      : [];
    const serbestMetin = o.serbestMetin === true;
    if (!secenekler.length && !serbestMetin) continue;
    gorulen.add(id);
    sonuc.push({
      id, ajan: typeof o.ajan === "string" ? o.ajan : "", tur,
      baslik: metin(o.baslik, 120) ?? "Ajan soruyor", metin: govde, ayrinti: metin(o.ayrinti, 4000),
      secenekler, serbestMetin, gizli: o.gizli === true,
      olusturma: Number(o.olusturma) || 0, sonGecerlilik: son,
    });
  }
  return sonuc.sort((a, b) => a.olusturma - b.olusturma || (a.id < b.id ? -1 : 1));
}

/** Cevabı gönderilmeden önce doğrular; hata tek cümle. */
export function cevapHazirla(soru: Soru, secim: string | null, yazi: string | null): Cevap | { hata: string } {
  const s = secim && soru.secenekler.some(x => x.id === secim) ? secim : null;
  if (secim && !s) return { hata: "Bu seçenek kullanılamıyor; listeden birini seç." };
  const m = yazi?.trim() || null;
  if (m && !soru.serbestMetin) return { hata: "Bu soru için bir seçeneğe dokun." };
  if (m && m.length > MAX_CEVAP) return { hata: "Cevap çok uzun; kısaltıp yeniden gönder." };
  if (!s && !m) return { hata: "Önce bir cevap seç ya da yaz." };
  return { id: soru.id, secim: s, metin: m };
}

/** Bekleyen sorular; kart her zaman en eski soruyu gösterir (coucou: bir kart, bir istek). */
export class SoruModeli {
  sorular: Soru[] = [];
  private cevaplanan = new Set<string>();
  guncelle(ham: unknown, simdi: number) {
    const yeni = sorulariAyikla(ham, simdi);
    // Dosyası silinen sorunun "cevaplandı" kaydı da gider; set büyümez.
    const kimlikler = new Set(yeni.map(s => s.id));
    for (const id of this.cevaplanan) if (!kimlikler.has(id)) this.cevaplanan.delete(id);
    this.sorular = yeni.filter(s => !this.cevaplanan.has(s.id));
  }
  temizle(simdi: number) { this.sorular = this.sorular.filter(s => s.sonGecerlilik > simdi); }
  cevaplandi(id: string) { this.cevaplanan.add(id); this.sorular = this.sorular.filter(s => s.id !== id); }
  get aktif(): Soru | null { return this.sorular[0] ?? null; }
  get bekleyen(): number { return this.sorular.length; }
  /** Bir sonraki kartın kendiliğinden kapanacağı an (ms) ya da null. */
  sonrakiBitis(): number | null { return this.sorular.length ? Math.min(...this.sorular.map(s => s.sonGecerlilik)) : null; }
}

export function hataMetni(hata: unknown): string {
  return typeof hata === "string" && hata.length < 120 && !/[\\/]|token|secret|password|traceback/i.test(hata) ? hata : GENEL_HATA;
}

type Belge = Pick<Document, "createElement">;
export type Gonder = (cevap: Cevap) => Promise<void>;

/** Soru kartı: başlık, soru, (varsa) ayrıntı, tek tık düğmeler, kısa metin alanı. */
export function kartOlustur(belge: Belge, soru: Soru, gonder: Gonder, bekleyen = 1, odak?: () => void): HTMLElement {
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, sinif: string, yazi?: string) => {
    const e = belge.createElement(tag); e.className = sinif; if (yazi != null) e.textContent = yazi; return e;
  };
  const kart = el("section", `soru-karti soru-${soru.tur}`);
  kart.setAttribute("role", "alertdialog");
  kart.setAttribute("aria-label", `${ajanAdi(soru.ajan)} soruyor`);
  const ust = el("p", "soru-kimden", bekleyen > 1 ? `${ajanAdi(soru.ajan)} soruyor · ${bekleyen} soru` : `${ajanAdi(soru.ajan)} soruyor`);
  const baslik = el("h2", "soru-baslik", soru.baslik);
  const govde = el("p", "soru-metin", soru.metin);
  kart.append(ust, baslik, govde);
  if (soru.ayrinti) kart.append(el("pre", "soru-ayrinti", soru.ayrinti));
  const hata = el("p", "soru-hata"); hata.setAttribute("role", "status"); hata.hidden = true;
  const dugmeler: HTMLButtonElement[] = [];
  let mesgul = false;
  const yolla = async (secim: string | null, yazi: string | null) => {
    if (mesgul) return;
    const c = cevapHazirla(soru, secim, yazi);
    if ("hata" in c) { hata.textContent = c.hata; hata.hidden = false; return; }
    mesgul = true; for (const d of dugmeler) d.disabled = true;
    try { await gonder(c); }
    catch (e) { hata.textContent = hataMetni(e instanceof Error ? e.message : e); hata.hidden = false; mesgul = false; for (const d of dugmeler) d.disabled = false; }
  };
  if (soru.secenekler.length) {
    const satir = el("div", "soru-secenekler");
    soru.secenekler.forEach((s, i) => {
      const d = el("button", i === 0 ? "soru-dugme birincil" : "soru-dugme");
      d.type = "button"; d.textContent = s.etiket;
      d.addEventListener("click", () => void yolla(s.id, null));
      dugmeler.push(d); satir.append(d);
    });
    kart.append(satir);
  }
  if (soru.serbestMetin) {
    const form = el("div", "soru-yazi");
    const alan = el("input", "soru-alan");
    alan.type = soru.gizli ? "password" : "text";
    alan.maxLength = MAX_CEVAP; alan.placeholder = "Cevabını yaz"; alan.autocomplete = "off";
    alan.setAttribute("aria-label", "Cevabın");
    // Ada pencere odağı almaz; yazmak için önce odak istenir (sohbetteki gibi).
    if (odak) alan.addEventListener("mousedown", () => odak());
    const d = el("button", soru.secenekler.length ? "soru-dugme" : "soru-dugme birincil");
    d.type = "button"; d.textContent = "Gönder";
    d.addEventListener("click", () => void yolla(null, alan.value));
    alan.addEventListener("keydown", (e: Event) => { if ((e as KeyboardEvent).key === "Enter") { e.preventDefault(); void yolla(null, alan.value); } });
    dugmeler.push(d); form.append(alan, d); kart.append(form);
  }
  kart.append(hata);
  return kart;
}

export interface SoruAkisiSecenekleri {
  /** Bir soru belirince/bitince çağrılır; adayı açmak için kullanılır. */
  degisti?: (soruVar: boolean) => void;
  simdi?: () => number;
}

const tauriVar = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Kabı soru kartıyla doldurur, olayları dinler. Dönen işlev aboneliği kapatır. */
export async function soruAkisiniBagla(kap: HTMLElement, secenek: SoruAkisiSecenekleri = {}): Promise<() => void> {
  if (!tauriVar()) return () => {};
  const simdi = secenek.simdi ?? (() => Date.now());
  const model = new SoruModeli();
  let zamanlayici: number | null = null;
  let oncekiVar = false;
  const ciz = () => {
    model.temizle(simdi());
    while (kap.firstChild) kap.removeChild(kap.firstChild);
    const aktif = model.aktif;
    kap.hidden = !aktif;
    if (aktif) kap.append(kartOlustur(document, aktif, async c => {
      try { await invoke("answer_question", { id: c.id, secim: c.secim, metin: c.metin }); }
      catch (e) { throw new Error(hataMetni(e)); }
      model.cevaplandi(c.id); ciz();
    }, model.bekleyen, () => { void invoke("focus_window", { focused: true }).catch(() => {}); }));
    if (zamanlayici != null) window.clearTimeout(zamanlayici);
    const bitis = model.sonrakiBitis();
    zamanlayici = bitis == null ? null : window.setTimeout(ciz, Math.max(0, bitis - simdi()) + 50);
    if (!!aktif !== oncekiVar) { oncekiVar = !!aktif; secenek.degisti?.(oncekiVar); }
  };
  const kapat = await listen<unknown>("sorular", e => { model.guncelle(e.payload, simdi()); ciz(); });
  try { model.guncelle(await invoke<unknown>("questions_list"), simdi()); } catch { /* ilk liste yoksa olay gelince çizilir */ }
  ciz();
  return () => { kapat(); if (zamanlayici != null) window.clearTimeout(zamanlayici); };
}
