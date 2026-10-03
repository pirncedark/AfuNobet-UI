import { h } from "./dom";
import "../apps.css";
import { appRows, type AppsSnapshot } from "../core/apps";
export type ViewName = "overview" | "quota" | "greeting" | "apps" | "chat" | "orkestra" | "sor";
import { AGENT_TR, STATUS_TR, UI_TR, ui } from "../core/labels";
import { NAMES, State, maskeleBildirim, currentTasks, elapsedText, expressionFor, listedTasks, preferredTask, quotaRows, taskMessage, taskSummary, type Agent, type Task } from "../core/state";
import { Bridge } from "../core/bridge";
import { Modal } from "./modal";
import { Katman, kapatDugmesi } from "./overlay";
import { kopruDurumu, type KopruMesaj } from "../core/kopru";
import { EMPTY_FILTER, PILL_STATE_TR, agentPills, clipText, contextText, costText, emptyState, filterTasks, filterVisible, handoffText, modelText, pillAgentOf, stageSteps, taskInsight, subagentRows, topLevel, type Filter, type PillId, type PillRow, type RichTask } from "./model";
import { PET_IFADE_OLAYI, loadPetIfade, savePetIfade, saveMessageAlert } from "../core/settings";
import { ajanKimlik } from "../core/ajan_kimlik";

function createPill(id: string, state: string) {
  const kimlik = ajanKimlik(id);
  const el = h("span", { class: "agent-pill-inline", "data-state": state, style: `--pill-color: ${kimlik.renk}; --pill-bg: ${kimlik.arkaPlan}` });
  el.append(h("span", { class: "pill-dot" }), h("span", { class: "pill-text", text: kimlik.kisaAd }));
  return el;
}

/** Secondary rows under the main card. Older records are counted, never listed. */
const ROW_LIMIT = 3;
/** Arama sonuç listesi üst sınırı (modal içinde). */
const SEARCH_LIMIT = 50;
type MenuView = "quota" | "apps" | "orkestra" | "chat";

export class AfuViews {
  readonly summary = h("span", { class: "summary", text: "0/0" });
  /** M3: en az bir görev varsa arama düğmesi görünür. */
  readonly searchButton = h("button", { class: "icon-button search-button", type: "button", text: "⌕", "aria-label": UI_TR.search, title: UI_TR.search, hidden: true, onclick: () => this.openSearch() });
  readonly header = h("header", {}, h("span", { class: "brand", text: UI_TR.brand }), this.summary, this.searchButton,
    h("span", { class: "claude-lock", text: "🔒 Claude KORUNUYOR", title: UI_TR.claudeProtection, "aria-label": UI_TR.claudeProtection }));
  readonly pills = h("nav", { class: "agent-pills", "aria-label": "Ajanlar" });
  readonly card = h("section", { class: "main-task", "aria-live": "polite", tabindex: "0", role: "button", "aria-label": UI_TR.detail });
  readonly others = h("div", { class: "other-tasks" });
  readonly retryButton = h("button", { class: "text-button retry-button", type: "button", text: UI_TR.retry, onclick: () => void this.retry() });
  readonly waiting = h("p", { class: "connection" }, h("span", { class: "connection-text", text: UI_TR.waiting }), this.retryButton);
  readonly healthStrip = h("div", { class: "health-strip", role: "group", "aria-label": "Saglik" });
  readonly overview = h("div", { class: "overview" }, this.pills, this.card, this.healthStrip, this.others, this.waiting);
  readonly quota = h("section", { class: "quota-view", "aria-label": UI_TR.quota, hidden: true });
  readonly greeting = h("section", { class: "greeting-view", hidden: true }, h("h1", { text: UI_TR.welcome }),
    h("p", { text: UI_TR.orientation }), h("p", { class: "hint", text: UI_TR.hint }));
  readonly apps = h("section", { class: "apps-view", "aria-label": "Uygulamalar", hidden: true });
  readonly chat = h("section", { class: "chat-view", "aria-label": "Asistan", hidden: true });
  readonly chatClose = kapatDugmesi("text-button chat-close", "Kapat", () => this.actions.chat?.());
  private readonly chatKatmani = new Katman(this.chat, () => this.actions.chat?.());
  readonly sor = h("section", { class: "sor-view", "aria-label": "Afu'ya sor", hidden: true });
  /** Ana etkileşim: "Afu'ya sor". Küçült ikincil düğmedir. */
  readonly sorButton: HTMLButtonElement;
  readonly appsButton: HTMLButtonElement;
  readonly chatButton: HTMLButtonElement;
  readonly orkestra = h("section", { class: "orkestra-view", "aria-label": "Orkestra", hidden: true });
  readonly orkestraButton: HTMLButtonElement;
  readonly appsMessage = h("p", { class: "apps-message", "aria-live": "polite" });
  /** Tıklamanın sonucunu tek cümleyle gösteren kısa bildirim. */
  readonly bildirim = h("p", { class: "tik-bildirim", role: "status", "aria-live": "polite", hidden: true });
  private bildirimTimer: number | null = null;
  private appsSnapshot: AppsSnapshot = { apps: [], durumlar: {} };
  readonly quotaButton: HTMLButtonElement;
  readonly primary: HTMLButtonElement;
  readonly petButton: HTMLButtonElement;
  /** Alt satır: alt görünümdeyken "Görevlere dön". */
  readonly backButton: HTMLButtonElement;
  /** Dar kartta sayfa geçişleri Daha fazla içinde yer alır. */
  readonly moreButton: HTMLButtonElement;
  readonly menu: HTMLElement;
  /** Q2: menüyü kapanıran görünür düğme (Esc ve dışarı tıklama dışında yol). */
  readonly menuClose: HTMLButtonElement;
  /** Q2: menüde odak hapsi + odak geri dönüşü. */
  private readonly menuKatmani: Katman;
  readonly footer: HTMLElement;
  /** F11: kart içi tek modal katmanı (ayrıntı, arama). */
  readonly modal = new Modal();
  readonly compactText = h("span", { class: "compact-text", text: UI_TR.ready });
  readonly compactCount = h("span", { class: "compact-count", text: "0/0" });
  readonly compact = h("div", { class: "compact-content" }, this.compactText, this.compactCount);
  readonly el: HTMLElement;
  private pillButtons = new Map<PillId, HTMLButtonElement>();
  private pillKey = "";
  private cardKey = "";
  private view: ViewName = "overview";
  private filter: Filter = { ...EMPTY_FILTER };

  constructor(private actions: { collapse(): void; quota(): void; pet?(): void; apps?(): void; chat?(): void; orkestra?(): void; sor?(): void; appOpen?(id: string): Promise<string | null | void>; appsRefresh?(): void; retry?(): Promise<void> }) {
    if (typeof window !== "undefined") window.addEventListener("afu-flash", (e) => this.flash((e as CustomEvent).detail));
    const item = (cls: string, label: string, run: () => void) => h("button", { class: `text-button menu-item ${cls}`.trim(), type: "button", role: "menuitem", text: label, title: label,
      onclick: () => { this.closeMenu(false); run(); } });
    const page = (label: string, run: () => void) => h("button", { class: "text-button page-button", type: "button", title: label, "aria-label": label,
      onclick: () => { this.closeMenu(false); run(); } }, h("span", { class: "btn-icon", "aria-hidden": "true" }), h("span", { class: "btn-label", text: label }));
    this.quotaButton = page(UI_TR.quota, () => actions.quota());
    this.appsButton = page(UI_TR.apps, () => actions.apps?.());
    this.orkestraButton = page(UI_TR.orkestra, () => actions.orkestra?.());
    this.chatButton = page(UI_TR.chat, () => actions.chat?.());
    this.petButton = item("pet-toggle", UI_TR.petOn, () => actions.pet?.());
    this.petButton.setAttribute("role", "menuitemcheckbox");
    this.petButton.setAttribute("aria-checked", "true");
    this.petButton.title = "Mini pet: Afu küçük karakter olarak görünür.";
    this.petButton.setAttribute("aria-label", this.petButton.title);
    // Q2: menüyü kapanıran düğme; Esc ve dışarı tıklama dışında görünür yol.
    this.menuClose = kapatDugmesi("text-button menu-item menu-close", ui("close"), () => this.closeMenu(true), "menuitem");
    this.menu = h("div", { class: "more-menu", role: "menu", "aria-label": UI_TR.more, hidden: true },
      h("h2", { class: "menu-heading", text: "Ayarlar" }),
      this.petButton, h("small", { class: "menu-description", text: "Afu küçük karakter olarak görünür." }), this.settingToggle("ifade-toggle", "Arada ifade yap", "Afu boştayken kısa ifadeler yapar.", loadPetIfade, enabled => { if (!savePetIfade(enabled)) return false; window.dispatchEvent(new Event(PET_IFADE_OLAYI)); return true; }),
      this.settingToggle("alert-toggle", "Mesaj gelince öne gel", "Yeni mesaj geldiğinde Afu görünür.", () => State.settings.messageAlert !== false, enabled => { if (!saveMessageAlert(enabled)) return false; State.settings.messageAlert = enabled; window.dispatchEvent(new Event("afu-message-setting")); return true; }),
      h("details", { class: "menu-advanced" }, h("summary", { text: "Gelişmiş" }), item("studio-open", "Animasyon stüdyosunu aç", () => { void Bridge.studioOpen().catch(() => this.flash("Stüdyo açılamadı; kurulumunu kontrol et.")); })), this.menuClose);
    this.menu.addEventListener("keydown", (e: Event) => this.onMenuKey(e as KeyboardEvent));
    this.menuKatmani = new Katman(this.menu, () => this.closeMenu(true));
    this.moreButton = h("button", { class: "text-button more-button", type: "button", "aria-haspopup": "menu", "aria-expanded": "false", title: UI_TR.more, "aria-label": UI_TR.more,
      onclick: () => this.toggleMenu() }, h("span", { class: "btn-icon", "aria-hidden": "true", text: "⋯" }), h("span", { class: "btn-label", text: UI_TR.more }));
    this.backButton = h("button", { class: "text-button back-button", type: "button", hidden: true, title: UI_TR.back,
      onclick: () => this.goBack() }, h("span", { class: "btn-icon", "aria-hidden": "true", text: "←" }), h("span", { class: "btn-label", text: UI_TR.back }));
    this.primary = h("button", { class: "text-button collapse-button", type: "button", text: UI_TR.collapse, title: UI_TR.collapse, onclick: actions.collapse });
    this.sorButton = h("button", { class: "primary-button sor-button", type: "button", text: UI_TR.ask, onclick: () => actions.sor?.() });
    this.footer = h("footer", {}, this.backButton, this.quotaButton, this.appsButton, this.orkestraButton, this.chatButton, this.moreButton, this.primary, h("span", { class: "footer-gap" }), this.sorButton);
    this.modal.closeButton.className = "modal-close icon-button";
    this.backButton.setAttribute("aria-label", UI_TR.back);
    this.primary.setAttribute("aria-label", UI_TR.collapse);
    this.sorButton.setAttribute("aria-label", UI_TR.ask);
    // Gerçek kart genişliği değişince ikincil sayfalar menüye taşınır.
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(([entry]) => {
        const narrow = entry.contentRect.width < 400;
        for (const button of [this.quotaButton, this.appsButton, this.orkestraButton, this.chatButton]) {
          if (narrow) {
            button.setAttribute("role", "menuitem");
            button.className = "text-button page-button menu-item";
            this.menu.insertBefore(button, this.petButton);
          } else {
            button.removeAttribute("role");
            button.className = "text-button page-button";
            this.footer.insertBefore(button, this.moreButton);
          }
        }
      });
      observer.observe(this.footer);
    }
    this.card.addEventListener("click", (e: Event) => { if (!this.fromButton(e)) this.openDetail(); });
    this.card.addEventListener("keydown", (e: Event) => {
      const k = (e as KeyboardEvent).key;
      if ((k === "Enter" || k === " ") && !this.fromButton(e)) { e.preventDefault(); this.openDetail(); }
    });
    this.el = h("div", { id: "content" }, this.header, this.overview, this.quota, this.apps, this.chat, this.sor, this.orkestra, this.greeting, this.bildirim, this.menu, this.footer, this.modal.el);
    setInterval(() => this.updateHealth(), 5000);
    this.updateHealth();
  }
  private settingToggle(cls: string, label: string, description: string, read: () => boolean, save: (enabled: boolean) => boolean) {
    const button = h("button", { class: `text-button menu-item ${cls}`, type: "button", role: "menuitemcheckbox", title: description, "aria-label": `${label}. ${description}` });
    const paint = () => { button.setAttribute("aria-checked", String(read())); button.replaceChildren(h("span", { text: label }), h("small", { text: description })); };
    paint();
    button.addEventListener("click", () => { if (!save(!read())) this.flash("Ayar kaydedilemedi; yeniden dene."); paint(); });
    if (typeof window !== "undefined") { window.addEventListener(PET_IFADE_OLAYI, paint); window.addEventListener("afu-message-setting", paint); }
    return button;
  }
  private fromButton(e: Event) {
    const t = e.target as { closest?: (s: string) => unknown } | null;
    return !!(t && t !== (this.card as unknown) && typeof t.closest === "function" && t.closest("button"));
  }
  private lastSyncedView: ViewName | null = null;
  sync(view: ViewName, expanded: boolean) {
    this.view = view;
    if (!expanded) { this.closeMenu(false); this.modal.close(); }
    this.petButton.setAttribute("aria-checked", String(State.settings.pet));
    this.petButton.textContent = State.settings.pet ? ui("petOn") : ui("petOff");
    this.el.hidden = !expanded;
    this.compact.hidden = expanded;
    this.overview.hidden = view !== "overview";
    this.orkestra.hidden = view !== "orkestra";
    // Yalniz gorunume girerken ciz: her durum guncellemesinde yeniden cizmek yazilan gorevi siler.
    if (view === "orkestra" && expanded && this.lastSyncedView !== "orkestra") void this.renderOrkestra();
    this.lastSyncedView = expanded ? view : null;
    this.quota.hidden = view !== "quota";
    this.greeting.hidden = view !== "greeting";
    this.apps.hidden = view !== "apps";
    this.chat.hidden = view !== "chat";
    this.sor.hidden = view !== "sor";
    this.syncFooter(view);
    if (view === "chat" && expanded) this.chatKatmani.ac({ ignore: [this.chatButton], ilk: this.chatClose, acan: this.chatButton });
    else this.chatKatmani.kapandı();
    // The main screen is a live board: only work that is still current reaches
    // it. A long history is counted in the summary and never listed here.
    const tasks = currentTasks(State.tasks), task = State.focusTask as RichTask | undefined;
    const rows = listedTasks(topLevel(tasks as RichTask[]).filter(row => row.id !== task?.id));
    this.summary.textContent = `${taskSummary(tasks)} ${ui("completed")}`;
    this.compactCount.textContent = taskSummary(tasks);
    const compactTitle = State.snapshot.sourceUnavailable ? ui("waiting") : task?.title ?? ui("ready");
    this.compactText.textContent = compactTitle; this.compactText.setAttribute("title", compactTitle);
    this.waiting.hidden = !State.snapshot.sourceUnavailable;
    this.searchButton.hidden = !filterVisible(State.tasks);
    this.syncPills(task);
    const key = JSON.stringify({ task, elapsed: task ? elapsedText(task) : "", unavailable: State.snapshot.sourceUnavailable, lang: ui("ready") });
    if (this.cardKey !== key) {
      this.cardKey = key;
      this.renderCard(task);
    }
    this.others.replaceChildren();
    // E3: odaktaki görevin alt ajanları ayrı satır olarak önce gelir; toplam satır sınırı korunur.
    const subs = subagentRows(task, State.tasks as RichTask[]).filter(s => !s.done);
    for (const sub of subs.slice(0, ROW_LIMIT)) this.others.append(this.subRow(sub.name, sub.status));
    for (const row of rows.filter(t => t.id !== task?.id).slice(0, Math.max(0, ROW_LIMIT - Math.min(subs.length, ROW_LIMIT)))) this.others.append(this.taskRow(row));
    if (view === "quota") this.renderQuota();
  }
  private healthCheck = { codex: false, ses: false, mesajlar: [] as KopruMesaj[] };
  private async updateHealth() {
    try { this.healthCheck.ses = !(await Bridge.bildirimAyarlari()).muted; } catch { this.healthCheck.ses = false; }
    try { const c = await Bridge.codexStatus(); this.healthCheck.codex = typeof c !== "string" && c?.loggedIn === true; } catch { this.healthCheck.codex = false; }
    try { this.healthCheck.mesajlar = (await Bridge.mesajlar()) ?? []; } catch { /* mesajlar yoksa kopru yalnizca gorevlere bakar */ }
    const afuOk = !State.snapshot.sourceUnavailable;
    // Claude icin ust satirdaki "Afu baglantisi" ile ayni kaynak: son 5 dk'da
    // mesaj ya da ada canli is (kopru.ts).
    const claudeOk = kopruDurumu(this.healthCheck.mesajlar, State.snapshot.tasks, Date.now()).bagli;
    const codexOk = this.healthCheck.codex;
    const sesOk = this.healthCheck.ses;

    // Kucuk hap/rozetler: yesil ✓, gri ✗. Ham metin degil, kartin stiline uyan
    // rozetler; her rozet durumu hem renkte hem isarette tek tek anlatir.
    const pill = (ad: string, ok: boolean) => h("span", { class: `health-pill${ok ? " ok" : " kapali"}`, "data-ok": String(ok), title: `${ad} ${ok ? "calisiyor" : "kapali"}`, role: "img", "aria-label": `${ad} ${ok ? "calisiyor" : "kapali"}` },
      h("span", { class: "hp-ad", text: ad }), " ", h("span", { class: "hp-isaret", text: ok ? "✓" : "✗", "aria-hidden": "true" }));
    this.healthStrip.replaceChildren(
      pill("AfuNöbet", afuOk),
      pill("Codex", codexOk),
      pill("Sesler", sesOk),
      pill("Claude", claudeOk)
    );

    this.healthStrip.onclick = () => {
      if (!afuOk) this.flash("AfuNöbet kapalı, uygulamayı yeniden başlat.");
      else if (!codexOk) this.flash("Codex oturumu yok, 'Afu'ya sor' kısmından giriş yap.");
      else if (!sesOk) this.flash("Sesler kapalı, tepsi (sağ alt) menüsünden açabilirsin.");
      else if (!claudeOk) this.flash("Claude görünmüyor, Claude Code hook'unun kurulu olduğundan emin ol.");
      else this.flash("Tüm sistemler aktif ve çalışıyor.");
    };
  }
  private syncFooter(view: ViewName) {
    const inSub = view === "quota" || view === "apps" || view === "orkestra" || view === "chat";
    this.backButton.hidden = !inSub;
    (this.backButton.lastChild as HTMLElement | null)?.replaceChildren?.(ui("back"));
    this.backButton.setAttribute("title", ui("back"));
    this.backButton.setAttribute("aria-label", ui("back"));
    this.moreButton.setAttribute("title", ui("more"));
    this.moreButton.setAttribute("aria-label", ui("more"));
    this.menuClose.title = ui("close");
    this.menuClose.setAttribute("aria-label", ui("close"));
    (this.moreButton.lastChild as HTMLElement | null)?.replaceChildren?.(ui("more"));
    const labels: [HTMLButtonElement, MenuView, string][] = [[this.quotaButton, "quota", ui("quota")], [this.appsButton, "apps", ui("apps")], [this.orkestraButton, "orkestra", ui("orkestra")], [this.chatButton, "chat", ui("chat")]];
    for (const [button, name, label] of labels) {
      (button.lastChild as HTMLElement).replaceChildren(name === "quota" ? ui("quotaShort") : label);
      button.setAttribute("title", label); button.setAttribute("aria-label", label);
      button.dataset.page = name;
      button.setAttribute("aria-pressed", String(view === name));
    }
    this.sorButton.textContent = view === "sor" ? ui("askBack") : ui("ask");
    this.sorButton.setAttribute("aria-pressed", String(view === "sor"));
    this.sorButton.setAttribute("title", this.sorButton.textContent ?? "");
    this.sorButton.setAttribute("aria-label", this.sorButton.textContent ?? "");
    const task = State.focusTask;
    const primaryText = task?.status === "Tamamlandi" ? ui("done") : ui("collapse");
    this.primary.textContent = primaryText; this.primary.setAttribute("title", primaryText);
    this.primary.setAttribute("aria-label", primaryText);
    this.footer.hidden = view === "greeting";
  }
  // ---------------- E2 ajan pill'leri ----------------
  private syncPills(focus: Task | undefined) {
    const rows = agentPills(State.snapshot);
    const key = JSON.stringify([rows, focus ? pillAgentOf(focus) : null]);
    if (key === this.pillKey) return;
    this.pillKey = key;
    const buttons = rows.map(row => this.pillButton(row, focus));
    this.pills.replaceChildren(...buttons);
  }
  private pillButton(row: PillRow, focus: Task | undefined) {
    let button = this.pillButtons.get(row.id);
    if (!button) {
      button = h("button", { class: "agent-pill", type: "button", onclick: () => this.pillClick(row.id) });
      button.dataset.agent = row.id;
      this.pillButtons.set(row.id, button);
    }
    const selected = !!focus && pillAgentOf(focus) === row.id;
    button.replaceChildren();
    if (row.kimlik) {
      button.setAttribute("style", `--pill-color: ${row.kimlik.renk}; --pill-bg: ${row.kimlik.arkaPlan}`);
      button.append(h("span", { class: "pill-dot" }), h("span", { class: "pill-text", text: row.kimlik.kisaAd }));
    } else {
      button.textContent = row.label;
    }
    button.dataset.state = row.state;
    button.classList?.toggle("soluk", row.soluk);
    button.title = row.title;
    button.setAttribute("aria-label", row.title);
    button.setAttribute("aria-pressed", String(selected));
    button.classList?.toggle("selected", selected);
    if (row.id !== "orkestra" && row.id !== "claude") {
      const agentRows = currentTasks(State.tasks).filter(t => pillAgentOf(t) === row.id);
      button.dataset.expression = expressionFor(preferredTask(agentRows)?.status);
    }
    return button;
  }
  private pillClick(id: PillId) {
    if (id === "orkestra") { this.actions.orkestra?.(); return; }
    const row = agentPills(State.snapshot).find(r => r.id === id);
    const name = row?.label ?? id;
    const task = preferredTask(currentTasks(State.tasks.filter(t => pillAgentOf(t) === id)));
    if (task) { State.setFocus(task.id); this.flash(`${name} görevi gösteriliyor.`); return; }
    const state = row?.state ?? "kapali";
    this.flash(state === "kota" ? `${name} kotası dolu. Yenilenince devam eder.` : `${name} şu an boşta. Görev verilince burada görünür.`);
  }
  // ---------------- Ana kart (F1/F2/F3/F8/F9) ----------------
  private renderCard(task: RichTask | undefined) {
    this.card.replaceChildren();
    this.card.dataset.expression = expressionFor(task?.status);
    this.card.setAttribute("aria-disabled", String(!task));
    if (task) {
      // A failure or a pause carries one sentence and nothing else: the file
      // the job happened to touch is noise on the screen the user reads.
      const running = task.status === "Calisiyor" || task.status === "Hazirlaniyor";
      const eyebrow = [task.agent ? AGENT_TR[task.agent] : "Ajan", modelText(task), task.repo, elapsedText(task)].filter(Boolean).join(" · ");
      const title = clipText(task.title, 90);
      const handoff = handoffText(task, Date.now(), State.snapshot.quotas);
      const message = running && task.currentAction ? task.currentAction : taskMessage(task);
      const model = modelText(task);
      this.card.append(h("div", { class: "task-eyebrow", title: eyebrow },
        task.agent ? createPill(task.agent, expressionFor(task.status) === "idle" ? "idle" : "aktif") : h("span", { text: "Ajan" }),
        model ? h("span", { class: "f3-model-info", text: ` · ${model}` }) : null,
        h("span", { text: `${task.repo ? " · " + task.repo : ""} · ${elapsedText(task)}` })),
        h("h1", { text: title.text, title: title.title }));
      if (handoff) this.card.append(h("p", { class: "task-handoff", text: handoff, title: handoff }));
      this.card.append(h("p", { class: `task-message${handoff ? " short" : ""}`, text: message, title: message }));
      const insight = taskInsight(task);
      if (insight) this.card.append(h("p", { class: "task-insight", text: insight, title: insight }));
      const steps = stageSteps(task);
      if (steps) this.card.append(this.stageBar(steps, true));
      else this.card.append(h("div", { class: "task-meta" },
        h("span", { class: "active-file", text: running ? task.file ?? "" : "" }),
        h("span", { class: "task-percent", text: task.progress === null ? "" : `%${Math.round(task.progress)}` })));
      if (task.progress !== null) {
        const meter = h("div", { class: "progress-track", role: "progressbar", "aria-label": UI_TR.progress, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": task.progress });
        meter.append(h("div", { class: "progress-fill", style: `width:${task.progress}%` }));
        this.card.append(meter);
      }
    } else {
      const empty = emptyState(State.snapshot);
      this.card.append(h("h1", { text: empty.title }), h("p", { class: "task-message empty-message", text: empty.message }));
    }
    this.card.animate?.([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 220, easing: "ease-out" });
  }
  private stageBar(steps: NonNullable<ReturnType<typeof stageSteps>>, compact: boolean) {
    const bar = h("ol", { class: `stage-bar${compact ? " compact" : ""}`, "aria-label": UI_TR.stages });
    for (const step of steps) {
      const li = h("li", { class: `stage ${step.state}`, title: step.label, text: step.label });
      if (step.state === "current") li.setAttribute("aria-current", "step");
      bar.append(li);
    }
    return bar;
  }
  /** F4/F5 ve diğer ayrıntılar yalnız burada: ana ekranda yok. */
  openDetail(selected?: RichTask) {
    const task = selected ?? State.focusTask as RichTask | undefined;
    if (!task) return;
    const parts: Node[] = [];
    const line = (cls: string, text: string | null) => { if (text) parts.push(h("p", { class: `detail-line ${cls}`, text, title: text })); };
    const agentHeader = h("p", { class: "detail-line detail-agent" });
    if (task.agent) agentHeader.append(createPill(task.agent, expressionFor(task.status) === "idle" ? "idle" : "aktif"));
    agentHeader.append(h("span", { text: ` · ${STATUS_TR[task.status]}` }));
    parts.push(agentHeader);
    const model = modelText(task);
    if (model) line("detail-model", `${ui("model")}: ${model}`);
    line("detail-handoff", handoffText(task, Date.now(), State.snapshot.quotas));
    line("detail-message", taskMessage(task));
    const steps = stageSteps(task);
    if (steps) parts.push(this.stageBar(steps, false));
    line("detail-context", contextText(task));
    if (contextText(task) && task.context?.used != null && task.context.total != null) {
      const value = task.context.used / task.context.total * 100;
      const meter = h("div", { class: "f4-context-track", role: "progressbar", "aria-label": "Kullanılan bağlam", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": value });
      meter.append(h("div", { class: "f4-context-fill", style: `width:${value}%` }));
      parts.push(meter);
    }
    line("detail-cost", costText(task));
    const subs = subagentRows(task, State.tasks as RichTask[]);
    if (subs.length) {
      parts.push(h("h3", { class: "detail-sub-title", text: ui("subagents") }));
      for (const s of subs) parts.push(h("p", { class: `detail-sub${s.done ? " done" : ""}`, text: `↳ ${s.name} · ${s.status}`, title: s.name }));
    }
    this.modal.open(clipText(task.title, 70).text, parts, { label: ui("detail") });
  }
  // ---------------- F7 arama/filtre ----------------
  openSearch() {
    const input = h("input", { class: "search-input", type: "search", placeholder: ui("searchPlaceholder"), "aria-label": ui("search") }) as HTMLInputElement;
    input.value = this.filter.query;
    const agentSel = h("select", { class: "search-select", "aria-label": ui("allAgents") }) as HTMLSelectElement;
    agentSel.append(h("option", { value: "hepsi", text: ui("allAgents") }));
    for (const a of ["codex", "gemini", "opencode", "glm"] as const) agentSel.append(h("option", { value: a, text: AGENT_TR[a] }));
    agentSel.value = this.filter.agent;
    const statusSel = h("select", { class: "search-select", "aria-label": ui("allStatus") }) as HTMLSelectElement;
    for (const [v, k] of [["hepsi", "allStatus"], ["calisan", "running"], ["bekleyen", "queued"], ["biten", "finished"], ["hata", "failed"]] as const) statusSel.append(h("option", { value: v, text: ui(k) }));
    statusSel.value = this.filter.status;
    const list = h("div", { class: "search-results", role: "list" });
    const render = () => {
      this.filter = { query: input.value, agent: agentSel.value as Filter["agent"], status: statusSel.value as Filter["status"] };
      const found = filterTasks(State.tasks, this.filter);
      list.replaceChildren();
      if (!found.length) list.append(h("p", { class: "search-empty", text: ui("noMatch") }));
      for (const t of found.slice(0, SEARCH_LIMIT)) {
        const title = clipText(t.title, 60);
        list.append(h("button", { class: "task-row search-row", type: "button", role: "listitem", title: title.title,
          onclick: () => { State.setFocus(t.id); this.modal.close(); if (State.focusTask?.id !== t.id) this.openDetail(t); } },
          h("i", { class: `status-dot ${expressionFor(t.status)}` }), h("span", { class: "row-title", text: title.text }),
          h("span", { class: "row-status", text: `${t.agent ? AGENT_TR[t.agent] : ""} · ${STATUS_TR[t.status]}` })));
      }
    };
    input.addEventListener("input", render); agentSel.addEventListener("change", render); statusSel.addEventListener("change", render);
    render();
    this.modal.open(ui("search"), [h("div", { class: "search-bar" }, input, agentSel, statusSel), list], { label: ui("search") });
  }
  // ---------------- F10 Tekrar dene ----------------
  async retry() {
    if (this.retryButton.disabled) return;
    this.retryButton.disabled = true; this.retryButton.textContent = ui("retrying");
    try {
      if (this.actions.retry) await this.actions.retry();
      else { const value = await Bridge.refreshState(); if (value !== null) State.apply(value); }
    } catch { /* aşağıdaki tek cümle yeterli */ }
    finally { this.retryButton.disabled = false; this.retryButton.textContent = ui("retry"); }
    this.flash(State.snapshot.sourceUnavailable ? ui("retryFail") : ui("retryOk"));
  }
  // ---------------- Daha fazla menüsü (F12 klavye) ----------------
  get menuOpen() { return !this.menu.hidden; }
  toggleMenu() { if (this.menuOpen) this.closeMenu(true); else this.openMenu(); }
  openMenu() {
    this.menu.hidden = false; this.moreButton.setAttribute("aria-expanded", "true");
    // Q2: odak ilk menü öğesine girer, dışarı tıklama kapatır, Tab menüde kalır.
    this.menuKatmani.ac({ ignore: [this.moreButton] });
  }
  closeMenu(refocus: boolean) {
    if (this.menu.hidden) return;
    this.menu.hidden = true; this.moreButton.setAttribute("aria-expanded", "false");
    this.menuKatmani.kapandı();
    if (refocus) this.moreButton.focus?.();
  }
  private menuItems(): HTMLButtonElement[] { return [this.petButton, this.menuClose]; }
  onMenuKey(e: KeyboardEvent) {
    const pages = [this.quotaButton, this.appsButton, this.orkestraButton, this.chatButton].filter(button => button.parentElement === this.menu);
    const items = [...pages, ...this.menuItems()];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    // Q2: Esc ve Tab katman sınıfında; burada yalnız ok/Home/End gezinir.
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus?.(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus?.(); }
    else if (e.key === "Home") { e.preventDefault(); items[0].focus?.(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus?.(); }
  }
  /** Alt görünümden ana ekrana: o görünümün kendi aç/kapa eylemi geri döndürür. */
  goBack() {
    const toggles: Partial<Record<ViewName, (() => void) | undefined>> = { quota: this.actions.quota, apps: this.actions.apps, orkestra: this.actions.orkestra, chat: this.actions.chat };
    toggles[this.view]?.();
  }
  setChatContent(content: HTMLElement) { this.chat.replaceChildren(content); }
  setSorContent(content: HTMLElement) { this.sor.replaceChildren(content); }
  setAppsMessage(message: string) { this.appsMessage.textContent = message; }
  flash(message: string) {
    // W2: yol/komut maskelenir; tek satıra sığmazsa tam (maskeli) metin title'da kalır.
    const metin = maskeleBildirim(message);
    this.bildirim.textContent = metin; this.bildirim.setAttribute("title", metin); this.bildirim.hidden = false;
    this.bildirim.animate?.([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 160, easing: "ease-out" });
    if (this.bildirimTimer !== null) clearTimeout(this.bildirimTimer);
    this.bildirimTimer = setTimeout(() => { this.bildirimTimer = null; this.bildirim.hidden = true; }, 2600) as unknown as number;
  }
  setApps(snapshot: AppsSnapshot) {
    this.appsSnapshot = snapshot;
    this.apps.replaceChildren(h("h1", { text: "Uygulamalar" }));
    const rows = appRows(snapshot.apps, snapshot.durumlar);
    if (!rows.length) this.apps.append(h("p", { class: "connection", text: "Uygulama listesi okunamadı; Tekrar dene'ye bas." }), h("button", { class: "text-button", text: "Tekrar dene", onclick: () => this.actions.appsRefresh?.() }));
    for (const row of rows) {
      const button = h("button", { class: "app-open", text: row.etiket, onclick: () => {
        if (row.indirilebilir && row.indirUrl) {
          void Bridge.appDownload(row.id);
        } else {
          void this.openApp(row.id);
        }
      } });
      button.disabled = (!row.acilabilir && !row.indirilebilir) || (!this.actions.appOpen && !row.indirilebilir);
      const item = h("div", { class: `app-row${row.acilabilir || row.indirilebilir ? "" : " unavailable"}` },
        h("i", { class: `app-dot ${row.nokta ?? "bos"}`, "aria-hidden": true }),
        h("div", { class: "app-description" }, h("strong", { text: row.ad }), h("small", { text: row.ozet })), button);
      this.apps.append(item);
    }
    this.apps.append(this.appsMessage);
  }
  private async openApp(id: string) {
    if (!appRows(this.appsSnapshot.apps, this.appsSnapshot.durumlar).some(row => row.id === id && row.acilabilir)) return;
    this.setAppsMessage("");
    try { const message = await this.actions.appOpen?.(id); if (typeof message === "string") this.setAppsMessage(message); }
    catch { this.setAppsMessage("Uygulama açılamadı. Yeniden dene."); }
  }
  private taskRow(task: Task) {
    const title = clipText(task.title, 70);
    return h("button", { class: "task-row", type: "button", title: title.title, onclick: () => State.setFocus(task.id) },
      h("i", { class: `status-dot ${expressionFor(task.status)}` }), h("span", { class: "row-title", text: title.text, title: title.title }),
      h("span", { class: "row-status", text: STATUS_TR[task.status] }));
  }
  /** E3: alt ajan satırı — ana görevin altında, girintili. */
  private subRow(name: string, status: string) {
    return h("div", { class: "task-row sub-row", role: "listitem", title: name },
      h("i", { class: "status-dot working" }), h("span", { class: "row-title", text: `↳ ${name}` }), h("span", { class: "row-status", text: status }));
  }
  private renderQuota() {
    this.quota.replaceChildren(h("h1", { text: ui("quota") }));
    for (const row of quotaRows(State.snapshot)) {
      this.quota.append(h("div", { class: "quota-row" }, h("strong", { text: NAMES[row.agent] }),
        h("span", { text: `${row.percent}${row.stale ? " · Eski bilgi" : ""}` }),
        h("small", { text: `Yenilenme: ${row.reset} · Son kontrol: ${row.checked}` })));
    }
    this.quota.append(h("p", { class: "quota-note", text: ui("quotaNote") }));
  }
  private async renderOrkestra() {
    this.orkestra.replaceChildren(h("h1", { text: "Afu Orkestra" }));
    const tasks = State.snapshot.tasks || [];

    // 1. Ajan listesi — ana ekrandaki pill'lerle aynı dört durum.
    const agentList = h("div", { class: "orkestra-agents" });
    for (const row of agentPills(State.snapshot).filter(r => r.id !== "orkestra")) {
      agentList.append(h("div", { class: "orkestra-agent-row", "data-state": row.state },
        h("strong", { text: row.label }),
        h("span", { text: PILL_STATE_TR[row.state] })
      ));
    }
    this.orkestra.append(agentList);

    // 2. İş ver formu
    const agentSelect = h("select", { class: "orkestra-select", "aria-label": "Ajan" });
    agentSelect.append(h("option", { value: "otomatik", text: "Otomatik (en uygun ajan)" }));
    for (const a of ["codex", "gemini", "opencode"]) {
      agentSelect.append(h("option", { value: a, text: AGENT_TR[a as Agent] }));
    }

    const projectSelect = h("select", { class: "orkestra-select", "aria-label": "Proje" });
    const projects = await Bridge.orkestraProjects() || ["AfuNobet-UI"];
    for (const p of projects) {
      const opt = h("option", { value: p, text: p });
      if (p === "AfuNobet-UI") opt.selected = true;
      projectSelect.append(opt);
    }

    const taskInput = h("input", { class: "orkestra-input", type: "text", placeholder: "Görev yazın...", required: "true", "aria-label": "Görev" }) as HTMLInputElement;
    const submitBtn = h("button", { type: "submit", class: "primary-button", text: "Gönder" });
    const projectBtn = h("button", { type: "button", class: "text-button", text: "Proje klasörünü aç", onclick: () => {
      void Bridge.projectOpen(projectSelect.value);
    } });

    const form = h("form", { class: "orkestra-form", onsubmit: async (e: Event) => {
      e.preventDefault();
      const oldText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Gönderiliyor...";
      try {
        State.setPendingOrkestra(agentSelect.value, taskInput.value);
        await Bridge.orkestraSend(agentSelect.value, projectSelect.value, taskInput.value);
        taskInput.value = "";
        this.flash("Görev gönderildi.");
      } catch (err: unknown) {
        // F11: engelleyen uyarı kutusu pencereyi kilitler; tek cümlelik bildirim yeterli.
        const message = err instanceof Error ? err.message : String(err);
        this.flash(message || "Görev gönderilemedi. Yeniden dene.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = oldText;
      }
    } });

    form.append(agentSelect, projectSelect, taskInput, h("div", { class: "orkestra-actions" }, submitBtn, projectBtn));
    this.orkestra.append(h("h2", { text: "İş ver" }), form);

    // 3. Son işler
    this.orkestra.append(h("h2", { text: "Son işler" }));
    const recent = tasks.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 5);
    for (const t of recent) {
      const title = clipText(t.title, 60);
      this.orkestra.append(h("div", { class: "orkestra-task-row" },
        h("strong", { text: title.text, title: title.title }),
        h("span", { text: STATUS_TR[t.status] || t.status }),
        h("a", { href: "#", class: "log-link", text: "Log", onclick: (e: Event) => {
          e.preventDefault();
          void Bridge.logAc();
        } })
      ));
    }
  }
}
