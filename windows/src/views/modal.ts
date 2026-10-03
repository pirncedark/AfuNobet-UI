// F11 modal sistemi: X düğmesi, Esc, arka plana tıklama ve odak yönetimi.
// Pencereyi kilitlemez: modal yalnız kart içinde bir katmandır, alert() yoktur.
import { h } from "./dom";
import { odaklanabilirler } from "./overlay";

export class Modal {
  readonly title = h("h2", { class: "modal-title" });
  readonly body = h("div", { class: "modal-body" });
  readonly closeButton = h("button", { class: "modal-close", type: "button", "aria-label": "Kapat", title: "Kapat", text: "✕", onclick: () => this.close() });
  readonly dialog = h("div", { class: "modal-dialog", role: "dialog", "aria-modal": "true", tabindex: "-1" },
    h("div", { class: "modal-head" }, this.title, this.closeButton), this.body);
  readonly el = h("div", { class: "modal-backdrop", hidden: true }, this.dialog);
  private returnFocus: { focus?: () => void } | null = null;
  private onClose: (() => void) | null = null;

  constructor() {
    // Arka plana (diyalog dışına) tıklama kapatır; diyalog içi tıklama kapatmaz.
    this.el.addEventListener("pointerdown", (e: Event) => { if (e.target === this.el) this.close(); });
    this.el.addEventListener("keydown", (e: Event) => this.onKey(e as KeyboardEvent));
  }
  get isOpen() { return !this.el.hidden; }
  open(title: string, content: Node[], options: { onClose?: () => void; label?: string } = {}) {
    this.returnFocus = (document.activeElement as { focus?: () => void } | null) ?? null;
    this.onClose = options.onClose ?? null;
    this.title.textContent = title;
    this.dialog.setAttribute("aria-label", options.label ?? title);
    this.body.replaceChildren(...content);
    this.el.hidden = false;
    // Odak diyaloğa girer: gövde'nin ilk odaklanabilir öğesi, yoksa X.
    (this.focusables().find(el => el.tagName.toLowerCase() === "button") ?? this.closeButton).focus?.();
  }
  close() {
    if (!this.isOpen) return;
    this.el.hidden = true;
    this.body.replaceChildren();
    const done = this.onClose; this.onClose = null;
    done?.();
    // Odak açan öğeye geri döner (klavye kullanıcısı kaybolmaz).
    this.returnFocus?.focus?.(); this.returnFocus = null;
  }
  /** Gövdedeki öğeler önce gelir; X her zaman son durur (kullanıcı ilk işi görür). */
  private focusables(): HTMLElement[] { return [...odaklanabilirler(this.body), this.closeButton]; }
  /** Esc kapatır (ada küçülmez), Tab/Shift+Tab diyalog içinde döner. */
  onKey(e: KeyboardEvent) {
    if (!this.isOpen) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.close(); return; }
    const items = this.focusables();
    if (!items.length) return;
    if (e.key !== "Tab") return;
    const active = document.activeElement;
    const i = items.indexOf(active as HTMLElement);
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === -1 || i === items.length - 1 ? 0 : i + 1);
    e.preventDefault();
    items[next].focus?.();
  }
}
