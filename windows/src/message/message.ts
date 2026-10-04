import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AfuEvent } from "../core/events";
import type { Snapshot, Task } from "../core/state";
import { handoffText } from "../views/model";
import { kopruDurumu, type KopruMesaj } from "../core/kopru";
import { clipText } from "../core/metin";
import type { NotificationMessage } from "./notifications";
import { bicimle } from "./bicim";
import "./message.css";

export const AJANLAR = ["claude", "codex", "gemini", "opencode"] as const;
export type MesajAjan = typeof AJANLAR[number];
export interface Mesaj { surum: 1; id: string; ajan: MesajAjan; tur: "bitti" | "bilgi" | "uyari"; metin: string; zaman: number }
export const ad = (ajan: MesajAjan) => ({ claude: "Claude", codex: "Codex", gemini: "Gemini", opencode: "OpenCode" })[ajan];

/** Balonda görünen gövde en fazla bu kadar karakter; kesilirse "…" eklenir. */
export const BALON_MAX_KARAKTER = 80;
/** Kuyruk en fazla bu kadar mesaj tutar; eskisi düşer. */
export const BALON_KUYRUGU = 5;

export function kisalt(metin: string, limit = BALON_MAX_KARAKTER): string {
  const c = Array.from(metin);
  if (c.length <= limit) return metin;
  // Kelime ortasından kesme: sınırdan önceki son boşlukta kes (çok kısa kalırsa sert kes).
  const parca = c.slice(0, limit - 1);
  const bosluk = parca.lastIndexOf(" ");
  const kes = bosluk >= Math.floor(limit / 2) ? parca.slice(0, bosluk) : parca;
  return kes.join("").replace(/[\s,.;:!?–-]+$/u, "") + "…";
}
/** Yalnız çizgi/işaretlerden oluşan süs satırı (──, ===, ---, ___, ###). */
const CEZIR_SATIR = /^[─-╿—–«»=\-_~*#.…|/\\:\s]{2,}$/;
const tekSatir = (satir: string): string => satir
  .replace(/[\u0000-\u001F\u007F]/g, " ")
  .replace(/^\s{0,3}#{1,6}\s+/, "")
  .replace(/^\s*>\s?/, "")
  .replace(/\*\*(.+?)\*\*/g, "$1")
  .replace(/\*\*|__|```/g, "")
  .replace(/[━─═]+/g, " ")
  .replace(/(^|[^\p{L}\p{N}])([*_`])\1?(.*?)\2(?=$|[^\p{L}\p{N}])/gu, "$1$3")
  .replace(/^\s*[-*+]\s+/, "")
  .replace(/\s+/g, " ")
  .trim();

/** Ham ajan çıktısından balona giden satırlar: tablo satırı, çizgi kalıntısı,
 *  markdown işareti ve boş satır yoktur; emoji olduğu gibi kalır. */
export function temizSatirlar(metin: string): string[] {
  const cikti: string[] = [];
  for (const ham of metin.split(/\r?\n/)) {
    if (/^\s*\|.*\|\s*$/.test(ham)) continue;
    const s = tekSatir(ham);
    if (!s || CEZIR_SATIR.test(s)) continue;
    cikti.push(s);
  }
  return cikti;
}
/** Balon metni "temiz"tir: satırlar tek satırda birleşir, boşluklar teke iner. */
export function temizMetin(metin: string): string { return temizSatirlar(metin).join(" "); }

/** "Claude:" gibi başlık satırı ayrı etikete gider; gövdede tekrar etmez. */
export function bolunBaslik(metin: string): { etiket: string | null; govde: string } {
  const satirlar = temizSatirlar(metin);
  if (!satirlar.length) return { etiket: null, govde: "" };
  const es = new RegExp(`^(${AJANLAR.join("|")})\\s*[:\\-–—]\\s*(.*)$`, "i").exec(satirlar[0]);
  if (!es) return { etiket: null, govde: satirlar.join(" ") };
  return { etiket: ad(es[1].toLowerCase() as MesajAjan), govde: [es[2], ...satirlar.slice(1)].filter(Boolean).join(" ") };
}

/** İlk anlamlı iki cümle: balonda üçüncü cümle ve sonrası gösterilmez. */
export function ilkCumle(metin: string, adet = 2): string {
  const parcalar = metin.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean);
  return (parcalar.length ? parcalar.slice(0, adet) : [metin]).join(" ").trim();
}

export interface BalonYazi { etiket: string; govde: string }
/** Pure terminal-to-pet conversion. Detect questions before shortening the preview. */
export function terminalPetMetni(metin: string, ajan: MesajAjan = "codex") {
  const { etiket, govde } = bolunBaslik(metin);
  const bicim = bicimle(metin);
  const tam = govde || "Yeni mesaj geldi.";
  const soru = bicim.soru || /\?(?:\s|$)|\b(?:cevap|yanıt|onay)\s+bekli|\b(?:seçiniz|seçin|yanıtlayın|cevaplayın)\b/iu.test(tam);
  const kisaltilmis = bicim.ayrinti ? kisalt(ilkCumle(bicim.ayrinti)) : kisalt(ilkCumle(tam));
  return { etiket: etiket ?? ad(ajan), govde: kisaltilmis, tam, soru };
}

/** One notification DOM owner, reused by the overview and pet balloon host. */
export function bildirimBalonu(belge: Pick<Document, "createElement">, host: HTMLElement,
  mesaj: NotificationMessage | null, kapat: (id: string) => void) {
  host.replaceChildren(); host.hidden = mesaj?.type !== "notification";
  if (!mesaj || mesaj.type !== "notification") return;
  const yazi = terminalPetMetni(mesaj.text ?? "", mesaj.ajan);
  const balon = belge.createElement("section"); balon.className = "afu-konusma-balonu afu-bildirim-balonu";
  balon.setAttribute("role", "status"); balon.title = yazi.tam;
  const etiket = belge.createElement("span"); etiket.className = "afu-balon-etiket";
  etiket.textContent = yazi.etiket + (mesaj.requiresReply ? " · Cevap bekliyor" : "");
  const metin = belge.createElement("span"); metin.className = "afu-balon-metin";
  metin.textContent = yazi.tam;
  const dugme = belge.createElement("button"); dugme.className = "afu-balon-kapat";
  dugme.textContent = "Okudum"; dugme.setAttribute("aria-label", "Mesajı kapat (Okudum)");
  dugme.addEventListener("click", ev => { ev.stopPropagation(); kapat(mesaj.id); });
  balon.addEventListener("pointerdown", ev => ev.stopPropagation());
  balon.append(etiket, metin, dugme); host.append(balon);
}
/** Balonun iki parçası: küçük ajan etiketi + temiz, kısaltılmış gövde. */
export function balonMetni(mesaj: Mesaj): BalonYazi {
  const { etiket, govde } = bolunBaslik(mesaj.metin);
  const bicim = bicimle(govde);
  const ayrinti = bicim.ayrinti ? kisalt(ilkCumle(temizMetin(bicim.ayrinti))) : (govde ? kisalt(ilkCumle(temizMetin(govde))) : "");
  return { etiket: etiket ?? ad(mesaj.ajan), govde: ayrinti || "Yeni mesaj geldi." };
}

/** Ortak balon kuyruğu: kart ve mini pet aynı kuralı kullanır (P11).
 *  Otomatik kapanma YOK: balon kullanıcı × (ya da Esc) kapatana kadar kalır.
 *  Yeni mesaj geldiğinde görünen mesaj değişmez; kalanlar "+N mesaj" rozetiyle
 *  bildirilir ve kapatılınca sıradaki gösterilir. */
export class BalonKuyrugu {
  bekleyen: Mesaj[] = [];
  private gosteriliyor = false;
  private mevcut: Mesaj | null = null;
  private sonMesaj = new Map<MesajAjan, number>();
  get aktif(): Mesaj | null { return this.gosteriliyor ? this.mevcut : null; }
  /** Balonda görünmeyi bekleyen mesaj sayısı (+N rozeti). */
  get sira(): number { return this.bekleyen.length; }
  bagli(ajan: MesajAjan, now: number) {
    return kopruDurumu([{ ajan, zaman: this.sonMesaj.get(ajan) ?? Number.NaN }], [], now).mesaj;
  }
  /** Bu modeldeki son mesajlar; saglik seridiyle paylasilan kopru kaynagi. */
  mesajlar(): KopruMesaj[] { return AJANLAR.map(ajan => ({ ajan, zaman: this.sonMesaj.get(ajan) ?? Number.NaN })); }
  ekle(mesaj: Mesaj, now: number) {
    this.sonMesaj.set(mesaj.ajan, now);
    // Aynı olayın tekrarı balonu yeniden kurmaz.
    if (this.mevcut?.id === mesaj.id || this.bekleyen.some(m => m.id === mesaj.id)) { this.tick(now); return; }
    this.bekleyen.push(mesaj);
    while (this.bekleyen.length > BALON_KUYRUGU) this.bekleyen.shift();
    this.tick(now);
  }
  gorunur(on: boolean, now: number) { if (on === this.gosteriliyor) return; this.gosteriliyor = on; this.tick(now); }
  /** Kullanıcı × ile kapattı: aktif mesaj düşer, sıradaki gösterilir. */
  kapat(): boolean {
    if (!this.gosteriliyor || !this.mevcut) return false;
    this.mevcut = null; this.tick(Date.now());
    return true;
  }
  /** Ayrıntısı okunan mesajı kimliğiyle düşür; sıradaki mesajı koru. */
  okundu(id: string) {
    this.bekleyen = this.bekleyen.filter(m => m.id !== id);
    if (this.mevcut?.id === id) this.mevcut = null;
    this.tick(Date.now());
  }
  /** Zaman ölçümü YOK: otomatik kapanma kaldırıldı, `_now` yalnız imza uyumu. */
  tick(_now: number) {
    if (!this.gosteriliyor) return;
    if (!this.mevcut && this.bekleyen.length) this.mevcut = this.bekleyen.shift()!;
  }
}
/** Eski ad (P11 öncesi testler) aynı kuyruğu gösterir. */
export { BalonKuyrugu as BalonModeli };

export function balonOlustur(
  belge: Pick<Document, "createElement">,
  mesaj: Mesaj,
  ac: (mesaj: Mesaj) => void,
  kapat?: () => void,
  ekSayisi = 0
): HTMLElement {
  // Pet zaten bir düğme: içine ikinci bir button yerleştirmiyoruz.
  const e = belge.createElement("span"); e.className = "afu-konusma-balonu";
  e.setAttribute("role", "button"); e.setAttribute("tabindex", "0");
  // Q1: balonda kırpılan gövdenin tam metni title'da durur (uzun metin kaybolmaz).
  const tam = temizSatirlar(mesaj.metin).join("\n") || mesaj.metin;
  e.setAttribute("aria-label", `${ad(mesaj.ajan)} mesajını aç`);
  e.title = tam;
  const yazi = bolunBaslik(mesaj.metin);
  const etiketAd = clipText(yazi.etiket ?? ad(mesaj.ajan), 24);
  const etiket = belge.createElement("span"); etiket.className = "afu-balon-etiket";
  etiket.textContent = etiketAd.text; etiket.title = etiketAd.title || tam;

  yazi.govde = yazi.govde.replace(/^\s*Ayrıntı\s*:\s*/i, "");
  const bicim = bicimle(tam.replace(/^(claude|codex|gemini|opencode)\s*[:\-–—]\s*/i, "").replace(/^\s*Ayrıntı\s*:\s*/i, ""));
  const metin = belge.createElement("span"); metin.className = "afu-balon-metin";

  if (bicim.maddeler.length > 0) {
    if (bicim.baslik) {
      const baslik = belge.createElement("div"); baslik.className = "soru-baslik";
      baslik.textContent = bicim.baslik; metin.append(baslik);
    }
    const ul = belge.createElement("ul");
    ul.style.margin = "2px 0"; ul.style.paddingLeft = "14px";
    for (const m of bicim.maddeler.slice(0, 2)) {
      const preview = m.slice(0, 49);
      const boundary = preview.lastIndexOf(" ");
      const li = belge.createElement("li");
      li.textContent = m.length > 50 ? (boundary > 0 ? preview.slice(0, boundary) : preview).trimEnd() + "…" : m;
      ul.append(li);
    }
    metin.append(ul);
  } else {
    const govdeText = bicim.ayrinti ? kisalt(ilkCumle(temizMetin(bicim.ayrinti))) : (yazi.govde ? kisalt(ilkCumle(temizMetin(yazi.govde))) : "");
    metin.textContent = govdeText || "Yeni mesaj geldi.";
  }
  e.append(etiket, metin);
  // Pet previews use the available height, rather than the card's 80-character summary.
  if (!bicim.soru) metin.setAttribute('data-pet-metin', bicim.ayrinti || yazi.govde || tam);

  if (bicim.soru) {
    e.style.pointerEvents = "auto"; e.style.cursor = "default";
    const alt = belge.createElement("div");
    alt.style.marginTop = "4px"; alt.style.display = "flex";
    alt.style.flexDirection = "column"; alt.style.gap = "4px";

    const cevapla = (secim: string | null, text: string | null) => {
      invoke("answer_question", { id: mesaj.id, secim, metin: text }).catch(() => {});
      if (kapat) kapat();
    };

    if (bicim.secenekler && bicim.secenekler.length > 0) {
      const secKap = belge.createElement("div");
      secKap.className = "soru-secenekler";
      for (const sec of bicim.secenekler) {
        const btn = belge.createElement("button"); btn.className = "soru-dugme";
        btn.textContent = sec.etiket;
        btn.addEventListener("click", ev => { ev.stopPropagation(); cevapla(sec.id, null); });
        secKap.append(btn);
      }
      alt.append(secKap);
    }

    const txt = belge.createElement("input");
    txt.type = "text"; txt.placeholder = "Cevap..."; txt.className = "soru-alan";
    txt.addEventListener("keydown", ev => {
      if (ev.key === "Enter") { ev.stopPropagation(); cevapla(null, txt.value); }
    });
    txt.addEventListener("click", ev => ev.stopPropagation());
    alt.append(txt); e.append(alt);
  }

  if (ekSayisi > 0) {
    const ek = belge.createElement("span"); ek.className = "afu-balon-ek"; ek.textContent = `+${ekSayisi} mesaj`;
    e.append(ek);
  }
  if (kapat) {
    const k = belge.createElement("span"); k.className = "afu-balon-kapat";
    k.setAttribute("role", "button"); k.setAttribute("tabindex", "0");
    k.setAttribute("aria-label", "Mesajı kapat (Okudum)"); k.textContent = "Okudum";
    k.addEventListener("pointerdown", ev => ev.stopPropagation());
    k.addEventListener("click", ev => { ev.stopPropagation(); kapat(); });
    k.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); kapat(); } });
    e.append(k);
  }
  if (!bicim.soru) {
    e.addEventListener("pointerdown", ev => ev.stopPropagation());
    e.addEventListener("click", ev => {
      ev.stopPropagation();
      const hedef = ev.target as Element | null;
      if (hedef && typeof hedef.closest === "function" && hedef.closest(".afu-balon-kapat")) return;
      ac(mesaj);
    });
    e.addEventListener("keydown", ev => { if (ev.target === e && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); ev.stopPropagation(); ac(mesaj); } });
  }
  return e;
}

/** Fit at word boundaries; the original remains in title and the detail view. */
export function petBalonMetniniSigdir(host: HTMLElement) {
  const metin = host.querySelector<HTMLElement>(".afu-balon-metin[data-pet-metin]");
  if (!metin) return;
  const tam = metin.dataset.petMetin!;
  const key = `${tam}|${host.clientWidth}|${host.style.getPropertyValue('--pet-balon-h')}`;
  if (metin.dataset.olcu === key) return;
  metin.dataset.olcu = key;
  // Bound the preview even when a long message fits geometrically.
  const onizleme = kisalt(tam, 180);
  metin.textContent = onizleme;
  if (metin.scrollHeight <= metin.clientHeight + 1) return;
  const kelimeler = onizleme.replace(/…$/, "").trim().split(/\s+/);
  let lo = 0, hi = kelimeler.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    metin.textContent = kelimeler.slice(0, mid).join(' ') + '…';
    if (metin.scrollHeight <= metin.clientHeight + 1) lo = mid;
    else hi = mid - 1;
  }
  metin.textContent = kelimeler.slice(0, lo).join(' ') + '…';
}

export function olayMesaji(olay: AfuEvent, tasks: Task[], now: number, quotas?: Snapshot["quotas"]): Mesaj | null {
  if (!AJANLAR.includes(olay.agent as MesajAjan) || olay.agent === "claude") return null;
  if (olay.kind === "RATE_LIMIT") {
    // W3: kota yüzünden duraklayan iş balonda tek satır: "Codex kotası doldu · bekliyor (14:55'te açılır)".
    const devir = handoffText(tasks.find(t => t.id === olay.taskId), now, quotas);
    if (devir) return { surum: 1, id: `${olay.kind}-${olay.taskId}`, ajan: olay.agent as MesajAjan, tur: "uyari", metin: devir, zaman: now };
  }
  const metin = ({ JOB_FINISHED: "Görev tamamlandı.", JOB_FAILED: "Görev tamamlanamadı; yeniden dene.", WAITING: "Senden cevap bekliyorum; kartı aç.", RATE_LIMIT: "Ajan duraklatıldı; hazır olduğunda devam edecek." } as Partial<Record<AfuEvent["kind"], string>>)[olay.kind];
  if (!metin) return null;
  const task = tasks.find(t => t.id === olay.taskId);
  return { surum: 1, id: `${olay.kind}-${olay.taskId}`, ajan: olay.agent as MesajAjan,
    tur: olay.kind === "JOB_FINISHED" ? "bitti" : olay.kind === "WAITING" ? "bilgi" : "uyari", metin: task ? `${task.title}: ${metin}` : metin, zaman: now };
}

/**
 * W3 ajan devri balonu: bir görevin devir satırı yeni çıktığında ya da değiştiğinde
 * pet/kart balonuna tek satır düşer ("Codex kotası doldu → Gemini devraldı").
 * Yeni duraklayan görev RATE_LIMIT olayıyla zaten bildirilir; burada tekrar edilmez.
 * Claude ve 30 dk'dan eski kayıt handoffText'te elenir.
 */
export function devirMesajlari(prev: Task[], next: Task[], now: number, quotas?: Snapshot["quotas"]): Mesaj[] {
  const onceki = new Map(prev.map(task => [task.id, task]));
  const cikti: Mesaj[] = [];
  for (const task of next) {
    if (!AJANLAR.includes(task.agent as MesajAjan) || task.agent === "claude") continue;
    const old = onceki.get(task.id);
    if (task.status === "Duraklatildi" && old?.status !== "Duraklatildi") continue;
    const metin = handoffText(task, now, quotas);
    if (!metin || (old && handoffText(old, now, quotas) === metin)) continue;
    cikti.push({ surum: 1, id: `DEVIR-${task.id}-${metin}`, ajan: task.agent as MesajAjan, tur: "uyari", metin, zaman: now });
  }
  return cikti;
}

/** Tek katman hem pet hem kart üzerinde kullanılır; tıklama tam metni karta taşır.
 *  P10: pet modunda balon `#afu-pet-balon` kutusunda, yani karakterin başının
 *  ÜSTÜNDE çizilir (pet kutusu `overflow:hidden` olduğu için içine konulamaz). */
export class KonusanAfu {
  readonly model = new BalonKuyrugu();
  readonly detay = document.createElement("section");
  private tazelik: number | null = null;
  private balon: HTMLElement | null = null;
  private host: HTMLElement | null = null;
  private anahtar = "";
  private hariciMesaj: Mesaj | null = null;
  private hariciKapatCallback?: () => void;
  private bildirilen = false;
  private askida = false;
  private stopped = false;
  constructor(
    private pet: HTMLElement,
    private petUst: HTMLElement,
    private karakter: HTMLElement,
    overview: HTMLElement,
    private ac: () => void,
    private onBalon?: (open: boolean) => void,
    private onMessage?: (message: Mesaj) => void
  ) {
    this.detay.className = "afu-mesaj-detayi"; this.detay.hidden = true;
    // Baglilik tek yerde okunur: saglik seridi (views.ts) artik ayni kaynagi
    // kullanir, ayri bir "Afu baglantisi" satiri tutulmaz.
    overview.prepend(this.detay);
    const ipucu = document.createElement("p"); ipucu.className = "afu-mesaj-ipucu";
    try {
      if (localStorage.getItem("afu-konusan-ipucu-v1") !== "seen") {
        ipucu.textContent = "Ajanların mesajları burada, Afu'nun başında görünür. Soruları buradan cevaplayabilirsin.";
        overview.prepend(ipucu);
        // Kart gerçekten görünmeden ipucunu görülmüş sayma.
      }
    } catch { /* depolama isteğe bağlı */ }
    this.ipucu = ipucu;
    this.ciz();
  }
  private ipucu: HTMLElement;
  /** Balon görünür mü (pet penceresinin büyümesini bu belirler). */
  get balonAcik(): boolean { return !!this.model.aktif; }
  /** Uygulama menüsü gibi pencereyi başka bir katman büyüttüğünde balon askıya alınır. */
  suspend(on: boolean) { if (this.askida === on) return; this.askida = on; this.uygulaGorunurluk(); this.ciz(); }
  /** × / Esc: balonu kapat, sıradakine geç. Otomatik kapanma yoktur. */
  kapat(): boolean {
    if (this.hariciMesaj) { this.hariciKapatCallback?.(); return true; }
    const kapandi = this.model.kapat(); if (kapandi) this.ciz(); return kapandi;
  }
  guncelle(mode: string, petVisible: boolean) {
    const gorunur = !document.hidden && (mode === "expanded" || (mode === "pet" && petVisible));
    this.modGorunur = gorunur;
    const host = mode === "pet" ? this.petUst : this.karakter;
    if (host !== this.host) { this.balon?.remove(); this.balon = null; this.anahtar = ""; this.host = host; }
    this.uygulaGorunurluk();
    if (gorunur && mode === "expanded" && this.ipucu.isConnected) {
      try { localStorage.setItem("afu-konusan-ipucu-v1", "seen"); } catch { /* isteğe bağlı */ }
    }
    this.ciz();
  }
  private modGorunur = false;
  private uygulaGorunurluk() { this.model.gorunur(this.modGorunur && !this.askida, Date.now()); }
  ekle(m: Mesaj) { if (this.onMessage) { this.onMessage(m); return; } this.model.ekle(m, Date.now()); this.ciz(); }
  /** Tam metni açmak mesajı okundu saymaz; kullanıcı Okudum ile bitirir. */
  private balonaTiklandi(m: Mesaj) { this.tamMetin(m); }
  private tamMetin(m: Mesaj) {
    this.detay.replaceChildren();
    const yazi = bolunBaslik(m.metin);
    const baslik = document.createElement("strong"); baslik.textContent = yazi.etiket ?? ad(m.ajan);
    
    const bicim = bicimle(yazi.govde);

    const metin = document.createElement("p");
    metin.style.whiteSpace = "pre-wrap";
    metin.textContent = (bicim.ayrinti || yazi.govde || m.metin).replace(/^\s*Ayrıntı\s*:\s*/i, "");

    const hariciKapat = this.hariciMesaj?.id === m.id ? this.hariciKapatCallback : undefined;
    const kapat = document.createElement("button"); kapat.textContent = "Okudum";
    kapat.addEventListener("click", () => {
      this.detay.hidden = true;
      if (hariciKapat) hariciKapat();
      else { this.model.okundu(m.id); this.ciz(); }
    });
    this.detay.append(baslik, metin, kapat); this.detay.hidden = false; this.ac();
  }
  setHarici(mesaj: Mesaj | null, kapat?: () => void) {
    this.hariciMesaj = mesaj; this.hariciKapatCallback = kapat; this.ciz();
  }
  private ciz() {
    if (this.stopped) return;
    this.model.tick(Date.now());
    const m = this.hariciMesaj ?? this.model.aktif;
    const anahtar = m ? (this.hariciMesaj ? `harici|${m.id}` : `${m.id}|${this.model.sira}`) : "";
    if (this.anahtar !== anahtar) {
      this.balon?.remove(); this.balon = null; this.anahtar = anahtar;
      if (m && this.host) {
        this.balon = balonOlustur(document, m, mesaj => this.balonaTiklandi(mesaj), () => this.kapat(), this.model.sira);
        this.host.append(this.balon);
      }
      this.pet.classList.toggle("afu-konusuyor", !!m && this.host === this.petUst);
      this.karakter.classList.toggle("afu-konusuyor", !!m && this.host === this.karakter);
      this.bildir(!!this.balon);
    }
    if (this.tazelik != null) window.clearTimeout(this.tazelik);
    const bagliVar = AJANLAR.some(a => this.model.bagli(a, Date.now()));
    this.tazelik = bagliVar ? window.setTimeout(() => this.ciz(), 1000) : null;
  }
  private bildir(open: boolean) {
    if (this.bildirilen === open) return;
    this.bildirilen = open;
    this.onBalon?.(open);
  }
  async bagla(): Promise<() => void> {
    if (!("__TAURI_INTERNALS__" in window)) return () => this.kapatSon();
    let okuma = Promise.resolve();
    const oku = () => { okuma = okuma.then(async () => {
      const mesajlar = await invoke<Mesaj[]>("mesajlar_list");
      if (!this.stopped) for (const m of mesajlar) this.ekle(m);
    }).catch(() => {}); return okuma; };
    const unlisten = await listen("afu-mesajlar", () => void oku());
    await oku(); return () => { unlisten(); this.kapatSon(); };
  }
  private kapatSon() { this.stopped = true; if (this.tazelik != null) clearTimeout(this.tazelik); }
}
