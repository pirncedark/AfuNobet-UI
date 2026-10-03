import { h } from "../views/dom";
import type { Expression } from "../core/state";
import { Gestures } from "./gestures";

/** Durum -> /afu/durum/ animasyonu. Bos dize = statik PNG gosterilir. */
export const ANIM_HARITASI: Partial<Record<Expression, string>> = {
  idle: "bosta_nefes.webp", working: "dusunme.webp", studying: "calisma_yazma.webp",
  success: "basari.webp", question: "sasirma.webp", error: "hata.webp",
  sleeping: "uyku_masa.webp", listening: "dinleme.webp", speaking: "konusma.webp",
  waking: "uyanma.webp", quota_paused: "kota_doldu.webp", leaving: "veda.webp", leaving_soon: "veda_yakin.webp",
  landing: "inis.webp", sitting: "inis_oturma.webp", gliding: "yatay_suzulme.webp", greeting_alt: "kitap_selam.webp",
  awaiting: "onay_bekleme.webp", catching: "dosya_yakalama.webp",
};

/** Karakterin gosterecegi durum: dosya surukleme > sesli sohbet > acik soru karti > gorev durumu. */
export function characterExpression(input: { dragging: boolean; questionOpen: boolean; voice: Expression | null; state: Expression }): Expression {
  if (input.dragging) return "catching";
  if (input.voice) return input.voice;
  if (input.questionOpen) return "awaiting";
  return input.state;
}

// Only reference cutouts are displayed. No procedural character drawing.
 export function getDurum(expr: Expression): string {
   if (["working", "studying", "catching"].includes(expr)) return "calisiyor";
   if (["thinking", "question", "listening"].includes(expr)) return "dusunuyor";
   if (["error", "quota_paused", "alert"].includes(expr)) return "hata";
   if (["success", "happy"].includes(expr)) return "basari";
   if (["awaiting"].includes(expr)) return "onay-bekliyor";
   return "bosta";
 }
 
export class AfuCharacter {
  readonly image = h("img", { class: "afu-image", src: "/afu/front.png", alt: "Afu", draggable: false });
  readonly animImage = h("img", { class: "afu-anim", src: "", alt: "", "aria-hidden": "true", draggable: false });
  readonly effect = h("img", { class: "afu-effect", src: "/afu/sparkle.svg", alt: "", draggable: false });
  readonly el = h("div", { id: "afu-character", "aria-hidden": "true" }, this.image, this.animImage, this.effect);
  private key = "";
  private gestures = new Gestures();
  private hoverTimer: number | null = null;
  private active = false;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private animations = new Set<Animation>();
  constructor() {
    for (const file of ["front", "thinking", "alert", "happy", "mini-icon", "main-34"]) { const image = new Image(); image.src = `/afu/${file}.png`; }
    this.el.addEventListener("click", () => this.react(this.gestures.click(Date.now())));
    this.el.addEventListener("mouseenter", () => {
      if (!this.active || this.motion.matches) return;
      this.gestures.hoverStart(Date.now());
      if (this.hoverTimer !== null) clearTimeout(this.hoverTimer);
      this.hoverTimer = window.setTimeout(() => { this.hoverTimer = null; if (this.gestures.hoverTick(Date.now()) === "cheer") this.react("cheer"); }, 2000);
    });
    this.el.addEventListener("mouseleave", () => this.endHover());
    document.addEventListener("visibilitychange", () => { if (document.hidden) { this.endHover(); for (const animation of this.animations) animation.cancel(); this.animations.clear(); } });
  }
  private endHover() { this.gestures.hoverEnd(); if (this.hoverTimer !== null) clearTimeout(this.hoverTimer); this.hoverTimer = null; }
  private react(kind: "squash" | "dizzy" | "cheer") {
    if (!this.active || document.hidden || this.motion.matches) return;
    const frames = kind === "dizzy" ? [{ transform: "rotate(0deg)" }, { transform: "rotate(-12deg)" }, { transform: "rotate(12deg)" }, { transform: "rotate(0deg)" }]
      : kind === "cheer" ? [{ transform: "translateY(0)" }, { transform: "translateY(-8px)" }, { transform: "translateY(0)" }]
      : [{ transform: "scale(1)" }, { transform: "scale(1.08,.9)" }, { transform: "scale(1)" }];
    const animation = this.image.animate(frames, { duration: kind === "dizzy" ? 600 : 300 });
    this.animations.add(animation);
    animation.onfinish = () => this.animations.delete(animation);
    animation.oncancel = () => this.animations.delete(animation);
  }
  sync(expression: Expression, compact: boolean, greeting: boolean, visible = true) {
    this.active = visible;
    if (!visible) this.endHover();
     const key = `${expression}:${compact}:${greeting}`;
     if (this.key === key) return;
     this.key = key;
     this.el.dataset.expression = expression;
     this.el.dataset.durum = getDurum(expression);
     this.el.classList.toggle("compact", compact);
    
    const pngFile = compact ? "mini-icon" : greeting ? "main-34" : {
      idle: "front", working: "front", thinking: "thinking", studying: "front", alert: "alert", happy: "happy", success: "happy", error: "alert",
      waiting: "front", paused: "alert", listening: "front", speaking: "front", question: "thinking", sleeping: "front",
      waking: "front", quota_paused: "alert", leaving: "front", leaving_soon: "front", landing: "front", sitting: "front", gliding: "front", greeting_alt: "main-34",
      awaiting: "thinking", catching: "happy"
    }[expression] || "front";
    const pngSource = `/afu/${pngFile}.png`;
    if (this.image.getAttribute("src") !== pngSource) this.image.src = pngSource;
    
    let animFile = "";
    if (visible && !this.motion.matches) {
      if (greeting) animFile = Math.random() > 0.5 ? "kitap_selam.webp" : "selam_masa.webp";
      else if (compact && expression === "success") animFile = "gulumseme.webp";
      else if (compact) animFile = "";
      else {
        animFile = ANIM_HARITASI[expression] ?? "";
      }
    }
    
    if (animFile) {
      const animSource = `/afu/durum/${animFile}`;
      if (this.animImage.getAttribute("src") !== animSource) this.animImage.src = animSource;
      this.animImage.style.display = "block";
      this.image.style.opacity = "0"; // hide static fallback when animation present
    } else {
      this.animImage.style.display = "none";
      this.animImage.src = ""; // unload
      this.image.style.opacity = "1";
    }
    
    this.effect.src = `/afu/${expression === "thinking" || expression === "question" ? "question" : expression === "alert" || expression === "paused" || expression === "quota_paused" || expression === "error" ? "exclamation" : "sparkle"}.svg`;
    this.effect.hidden = compact || ["idle", "working", "studying", "waiting", "listening", "speaking", "sleeping", "waking", "leaving", "leaving_soon", "landing", "sitting", "gliding", "greeting_alt", "awaiting", "catching"].includes(expression);
  }
  look(x: number, y: number) {
    const dx = Math.max(-3, Math.min(3, x / 100));
    const dy = Math.max(-2, Math.min(2, y / 100));
    this.el.style.setProperty("--look-x", `${dx}px`);
    this.el.style.setProperty("--look-y", `${dy}px`);
  }
}
