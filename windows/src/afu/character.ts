import { h } from "../views/dom";
import type { Expression } from "../core/state";
import { Gestures } from "./gestures";

// Only reference cutouts are displayed. No procedural character drawing.
export class AfuCharacter {
  readonly image = h("img", { class: "afu-image", src: "/afu/front.png", alt: "Afu", draggable: false });
  readonly effect = h("img", { class: "afu-effect", src: "/afu/sparkle.svg", alt: "", draggable: false });
  readonly el = h("div", { id: "afu-character", "aria-hidden": "true" }, this.image, this.effect);
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
    this.el.classList.toggle("compact", compact);
    const file = compact ? "mini-icon" : greeting ? "main-34" : {
      idle: "front", working: "front", thinking: "thinking", alert: "alert", happy: "happy", success: "happy", error: "alert",
      waiting: "front", paused: "alert", listening: "front", speaking: "front",
    }[expression];
    const source = `/afu/${file}.png`;
    if (this.image.getAttribute("src") !== source) this.image.src = source;
    this.effect.src = `/afu/${expression === "thinking" ? "question" : expression === "alert" || expression === "paused" || expression === "error" ? "exclamation" : "sparkle"}.svg`;
    this.effect.hidden = compact || ["idle", "working", "waiting", "listening", "speaking"].includes(expression);
  }
  look(x: number, y: number) {
    const dx = Math.max(-3, Math.min(3, x / 100));
    const dy = Math.max(-2, Math.min(2, y / 100));
    this.el.style.setProperty("--look-x", `${dx}px`);
    this.el.style.setProperty("--look-y", `${dy}px`);
  }
}
