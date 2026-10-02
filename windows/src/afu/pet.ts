import { h } from "../views/dom";
import "../apps.css";
import { appRows, type AppsSnapshot } from "../core/apps";
import type { AfuEvent } from "../core/events";
import { T } from "./timing";
export type PetPose = "gecis" | "donus" | "bekleme" | "dusunme" | "uyari" | "hata" | "mutlu" | "basari" | "uyku" | "uyanma" | "yuzme" | "etkilesim";
export const SEKANSLAR: Record<PetPose, { kare: string; ms: number }[]> = {
  donus: [{ kare: "akis_tutunma", ms: 120 }, { kare: "akis_gorunme", ms: 200 }, { kare: "akis_suzulme", ms: 250 }, { kare: "akis_kuculme", ms: 180 }],
  bekleme: [{ kare: "idle_normal", ms: 2400 }, { kare: "idle_nefes", ms: 900 }, { kare: "idle_normal", ms: 1800 }, { kare: "idle_goz_kapali", ms: T.blink }, { kare: "idle_goz_acilis", ms: 90 }, { kare: "idle_normal", ms: 2000 }, { kare: "idle_sol", ms: 1400 }, { kare: "idle_normal", ms: 600 }, { kare: "idle_sag", ms: 1400 }],
  gecis: [{ kare: "akis_kuculme", ms: T.shrink }, { kare: "akis_suzulme", ms: T.floatDown }, { kare: "akis_gorunme", ms: T.reveal }, { kare: "akis_tutunma", ms: T.grab }, { kare: "akis_bekleme", ms: 600 }],
  uyanma: [{ kare: "uyan_gizli", ms: 300 }, { kare: "uyan_gozukme", ms: 500 }, { kare: "uyan_yukselme", ms: 400 }, { kare: "uyan_tam", ms: 600 }, { kare: "uyan_dikkat", ms: 900 }],
  dusunme: [{ kare: "tepki_dusunme", ms: 6000 }], uyari: [{ kare: "tepki_uyari", ms: Infinity }], hata: [{ kare: "tepki_hata", ms: Infinity }],
  mutlu: [{ kare: "tepki_mutlu", ms: 1500 }, { kare: "tepki_goz_kirpma", ms: T.blink }], basari: [{ kare: "tepki_basari", ms: 2500 }],
  uyku: [{ kare: "tepki_uyku", ms: Infinity }], yuzme: [{ kare: "uyan_yuzme", ms: Infinity }],
  etkilesim: [{ kare: "tepki_mutlu", ms: T.squash + T.squashBack }, { kare: "tepki_mutlu", ms: T.clickHappy }],
};
export class PetModel {
  pose: PetPose = "bekleme";
  balloon: "!" | "?" | null = null;
  private now: number;
  private poseAt: number;
  private lastActivity: number;
  private hoverPose: PetPose | null = null;
  constructor(now = Date.now()) { this.now = this.poseAt = this.lastActivity = now; }
  setPose(pose: PetPose) { this.pose = pose; this.poseAt = this.now; }
  acknowledge() { this.balloon = null; this.lastActivity = this.now; this.setPose("bekleme"); }
  get frame() {
    const sequence = SEKANSLAR[this.pose];
    const duration = sequence.reduce((sum, frame) => sum + frame.ms, 0);
    let elapsed = Math.max(0, this.now - this.poseAt);
    if (this.pose === "bekleme") elapsed %= duration;
    for (const frame of sequence) { if (elapsed < frame.ms) return frame.kare; elapsed -= frame.ms; }
    return sequence[sequence.length - 1].kare;
  }
  onEvent(event: AfuEvent) {
    this.lastActivity = this.now;
    if (event.kind === "RATE_LIMIT" || event.kind === "JOB_FAILED") { this.balloon = "!"; this.setPose(event.kind === "JOB_FAILED" ? "hata" : "uyari"); return; }
    if (this.pose === "uyari" || this.pose === "hata") return;
    if (this.pose === "uyku") { this.setPose("uyanma"); return; }
    if (event.kind === "JOB_FINISHED") { this.balloon = null; this.setPose("basari"); }
    else if (event.kind === "WAITING") { this.balloon = "?"; this.setPose("dusunme"); }
    else { this.balloon = null; this.setPose("bekleme"); }
  }
  hover(on: boolean) {
    this.lastActivity = this.now;
    if (this.pose === "uyari" || this.pose === "hata") return;
    if (on) { this.hoverPose = this.pose === "uyku" ? "uyanma" : "bekleme"; this.setPose(this.pose === "uyku" ? "uyanma" : "yuzme"); }
    else { this.setPose(this.hoverPose ?? "bekleme"); this.hoverPose = null; }
  }
  tick(now: number) {
    this.now = Math.max(this.now, now);
    if (this.pose === "bekleme" && this.now - this.lastActivity > 600000) { this.setPose("uyku"); return; }
    if (!["bekleme", "uyari", "hata", "uyku", "yuzme"].includes(this.pose)) {
      const duration = SEKANSLAR[this.pose].reduce((sum, frame) => sum + frame.ms, 0);
      if (this.now - this.poseAt >= duration) { this.balloon = null; this.setPose("bekleme"); }
    }
  }
  shift(ms: number) { this.now += ms; this.poseAt += ms; this.lastActivity += ms; }
}
export class AfuPet {
  readonly image = h("img", { class: "pet-image", src: "/afu/pet/idle_normal.webp", alt: "Afu", draggable: false });
  readonly previous = h("img", { class: "pet-image pet-previous", src: "/afu/pet/idle_normal.webp", alt: "", draggable: false });
  readonly balloon = h("span", { class: "pet-balloon", "aria-hidden": "true" });
  readonly el: HTMLButtonElement;
  readonly model = new PetModel();
  private timer: number | null = null;
  private active = false;
  private pausedAt: number | null = null;
  private frame = "idle_normal";
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  readonly appsMenu = h("div", { class: "pet-apps-menu", hidden: true, role: "dialog", "aria-label": "Afu uygulamaları" });
  private appsSnapshot: AppsSnapshot = { apps: [], durumlar: {} };
  private appOpener: ((id: string) => Promise<string | null | void>) | null = null;
  constructor(open: () => void, private appsRequested?: () => void, private appsVisible?: (on: boolean) => void) {
    this.el = h("button", { id: "afu-pet", hidden: true, "aria-label": "Afu kartını aç", onclick: () => { this.hideApps(); this.model.acknowledge(); open(); } }, this.previous, this.image, this.balloon);
    document.body.append(this.appsMenu);
    this.el.addEventListener("contextmenu", event => { event.preventDefault(); this.appsRequested?.(); this.showApps(); });
    document.addEventListener("pointerdown", event => { if (!this.appsMenu.contains(event.target as Node) && !this.el.contains(event.target as Node)) this.hideApps(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") { this.hideApps(); this.el.focus(); } });
    for (const frame of new Set(Object.values(SEKANSLAR).flat().map(item => item.kare))) { const image = new Image(); image.src = `/afu/pet/${frame}.webp`; }
    this.el.addEventListener("mouseenter", () => { this.model.tick(Date.now()); this.model.hover(true); this.paint(); });
    this.el.addEventListener("mouseleave", () => { this.model.tick(Date.now()); this.model.hover(false); this.paint(); });
    document.addEventListener("visibilitychange", () => this.setVisible(this.active && !document.hidden));
    this.reduced.addEventListener("change", () => { this.stopTimer(); if (this.active) this.run(); });
  }
  setAppOpener(open: (id: string) => Promise<string | null | void>) { this.appOpener = open; this.renderApps(); }
  setApps(snapshot: AppsSnapshot) { this.appsSnapshot = snapshot; this.renderApps(); this.positionApps(); }
  hideApps() { const visible = !this.appsMenu.hidden; this.appsMenu.hidden = true; if (visible) this.appsVisible?.(false); }
  private showApps() {
    this.renderApps();
    this.appsMenu.hidden = false; this.appsVisible?.(true);
    this.positionApps();
    this.appsMenu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }
  positionApps() {
    if (this.appsMenu.hidden) return;
    const rect = this.el.getBoundingClientRect();
    this.appsMenu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 284))}px`;
    this.appsMenu.style.top = `${Math.max(8, Math.min(rect.top - this.appsMenu.offsetHeight - 8, innerHeight - this.appsMenu.offsetHeight - 8))}px`;
  }
  private renderApps() {
    this.appsMenu.replaceChildren(h("strong", { text: "Afu uygulamaları" }));
    const rows = appRows(this.appsSnapshot.apps, this.appsSnapshot.durumlar);
    if (!rows.length) this.appsMenu.append(h("p", { text: "Uygulamalar bekleniyor." }));
    for (const row of rows) {
      const button = h("button", { class: `pet-app-row${row.acilabilir ? "" : " unavailable"}`, onclick: () => { void this.openApp(row.id); } },
        h("i", { class: `app-dot ${row.nokta ?? "bos"}`, "aria-hidden": true }),
        h("span", { class: "app-description" }, h("strong", { text: row.ad }), h("small", { text: row.ozet })), h("span", { text: row.etiket }));
      button.disabled = !row.acilabilir || !this.appOpener;
      this.appsMenu.append(button);
    }
  }
  private async openApp(id: string) {
    if (!appRows(this.appsSnapshot.apps, this.appsSnapshot.durumlar).some(row => row.id === id && row.acilabilir)) return;
    try {
      const message = await this.appOpener?.(id);
      if (typeof message === "string") this.appsMenu.append(h("p", { class: "apps-message", role: "status", text: message }));
      else this.hideApps();
    } catch { this.appsMenu.append(h("p", { class: "apps-message", role: "status", text: "Uygulama açılamadı. Yeniden dene." })); }
  }
  onEvent(event: AfuEvent) { if (this.pausedAt === null) this.model.tick(Date.now()); this.model.onEvent(event); this.paint(); }
  setActive(on: boolean) { if (!on) this.hideApps(); this.active = on; this.el.hidden = !on; this.setVisible(on && !document.hidden); }
  setVisible(on: boolean) {
    if (!on) this.hideApps();
    this.stopTimer();
    this.el.style.setProperty("--pet-play", on && this.active ? "running" : "paused");
    for (const animation of this.previous.getAnimations()) { if (on && this.active) animation.play(); else animation.pause(); }
    if (!on || !this.active) { this.pausedAt ??= Date.now(); return; }
    if (this.pausedAt !== null) this.model.shift(Date.now() - this.pausedAt);
    this.pausedAt = null;
    this.run();
  }
  transition(reverse = false) { this.model.tick(Date.now()); this.model.setPose(reverse ? "donus" : "gecis"); this.paint(); }
  private stopTimer() { if (this.timer !== null) clearTimeout(this.timer); this.timer = null; }
  private run() {
    this.model.tick(Date.now()); this.paint();
    // One short timer while visible; no rAF loop or poll while the pet is hidden.
    if (!this.reduced.matches) this.timer = window.setTimeout(() => { this.timer = null; if (this.active && !document.hidden && this.pausedAt === null) this.run(); }, 90);
  }
  private paint() {
    const next = this.reduced.matches && ["bekleme", "gecis", "yuzme", "uyanma"].includes(this.model.pose) ? "idle_normal" : this.model.frame;
    this.el.dataset.pose = this.model.pose;
    this.balloon.textContent = this.model.balloon ?? "";
    this.balloon.hidden = this.model.balloon === null;
    if (next === this.frame) return;
    this.previous.src = this.image.src;
    this.image.src = `/afu/pet/${next}.webp`;
    this.frame = next;
    for (const animation of this.previous.getAnimations()) animation.cancel();
    if (!this.reduced.matches) this.previous.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" });
  }
}



