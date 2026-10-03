// "Afu'ya sor": tek giriş alanı. Durum soruları yerelde cevaplanır (kota harcamaz),
// açıklama isteyenler mevcut Codex sohbetine iletilir.
import { h } from "../views/dom";
import type { Snapshot } from "../core/state";
import { sorCevapla } from "./yerel";
import "./sor.css";

export interface SorActions {
  snapshot(): Snapshot;
  codexStatus(): Promise<string | { status: string; loggedIn?: boolean }>;
  codexLogin(): Promise<unknown>;
  codexaSor(text: string): Promise<void> | void;
}

export const SOR_METIN = {
  iletildi: "Sorunu Codex'e ilettim; cevap sohbette.",
  oturumYok: "Codex oturumu açık değil.",
  girisAcik: "Açılan sayfada hesabını bağla.",
  girisHata: "Giriş başlatılamadı; yeniden dene.",
  iletilemedi: "Soru iletilemedi; yeniden dene.",
} as const;

export class SorView {
  readonly input = h("textarea", { class: "sor-input", "aria-label": "Soru", placeholder: "Ne merak ediyorsun?", rows: 2, maxlength: 2000 });
  readonly sorButton = h("button", { class: "primary-button", text: "Sor" });
  /** Yer tutucu: sesli soru ayrı işte bağlanacak; mikrofon burada açılmaz. */
  readonly micButton = h("button", { class: "text-button", text: "Bas ve konuş", title: "Sesli soru yakında" });
  readonly answer = h("p", { class: "sor-answer", "aria-live": "polite" });
  readonly loginButton = h("button", { class: "text-button primary-button", text: "Codex'e giriş yap" });
  readonly element: HTMLElement;
  private busy = false;

  constructor(private actions: SorActions) {
    this.micButton.disabled = true;
    this.loginButton.hidden = true;
    this.element = h("div", { class: "sor-panel" }, h("h1", { text: "Afu'ya sor" }), this.input,
      h("div", { class: "sor-actions" }, this.micButton, this.sorButton), this.answer, this.loginButton);
    this.sorButton.addEventListener("click", () => { void this.sor(); });
    this.input.addEventListener("keydown", e => {
      const k = e as KeyboardEvent;
      if (k.key === "Enter" && !k.shiftKey && !k.isComposing) { k.preventDefault(); void this.sor(); }
    });
    this.loginButton.addEventListener("click", () => { void this.login(); });
  }

  focus() { this.input.focus?.(); }

  async sor() {
    const text = (this.input.value ?? "").trim();
    if (!text || this.busy) return;
    this.busy = true; this.sorButton.disabled = true;
    try {
      const sonuc = sorCevapla(text, this.actions.snapshot());
      if (sonuc.tur === "yerel") {
        this.answer.textContent = sonuc.cevap; this.loginButton.hidden = true; this.input.value = "";
        return;
      }
      let hazir = false;
      try { const raw = await this.actions.codexStatus(); hazir = typeof raw === "string" ? raw === "hazir" : raw?.status === "hazir"; } catch { hazir = false; }
      if (!hazir) { this.answer.textContent = SOR_METIN.oturumYok; this.loginButton.hidden = false; return; }
      try {
        await this.actions.codexaSor(text);
        this.answer.textContent = SOR_METIN.iletildi; this.loginButton.hidden = true; this.input.value = "";
      } catch {
        this.answer.textContent = SOR_METIN.iletilemedi;
      }
    } finally { this.busy = false; this.sorButton.disabled = false; }
  }

  private async login() {
    this.answer.textContent = SOR_METIN.girisAcik;
    try { await this.actions.codexLogin(); } catch { this.answer.textContent = SOR_METIN.girisHata; }
  }
}
