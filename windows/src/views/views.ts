import { h } from "./dom";
import "../apps.css";
import { appRows, type AppsSnapshot } from "../core/apps";
export type ViewName = "overview" | "quota" | "greeting" | "apps" | "chat" | "orkestra";
import { STATUS_TR, UI_TR } from "../core/labels";
import { NAMES, State, currentTasks, elapsedText, expressionFor, listedTasks, pillStates, preferredTask, quotaRows, taskMessage, taskSummary, type Agent, type Task } from "../core/state";
import { Bridge } from "../core/bridge";

const AGENT_ORDER: Agent[] = ["codex", "glm", "gemini", "opencode"];
/** Secondary rows under the main card. Older records are counted, never listed. */
const ROW_LIMIT = 3;

export class AfuViews {
  readonly summary = h("span", { class: "summary", text: "0/0" });
  readonly header = h("header", {}, h("span", { class: "brand", text: UI_TR.brand }), this.summary,
    h("span", { class: "claude-lock", text: "🔒 Claude KORUNUYOR" }));
  readonly pills = h("nav", { class: "agent-pills", "aria-label": "Ajanlar" });
  readonly card = h("section", { class: "main-task", "aria-live": "polite" });
  readonly others = h("div", { class: "other-tasks" });
  readonly waiting = h("p", { class: "connection", text: UI_TR.waiting });
  readonly overview = h("div", { class: "overview" }, this.pills, this.card, this.others, this.waiting);
  readonly quota = h("section", { class: "quota-view", "aria-label": UI_TR.quota, hidden: true });
  readonly greeting = h("section", { class: "greeting-view", hidden: true }, h("h1", { text: UI_TR.welcome }),
    h("p", { text: UI_TR.orientation }), h("p", { class: "hint", text: UI_TR.hint }));
  readonly apps = h("section", { class: "apps-view", "aria-label": "Uygulamalar", hidden: true });
  readonly chat = h("section", { class: "chat-view", "aria-label": "Asistan", hidden: true });
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
  readonly footer: HTMLElement;
  readonly compactText = h("span", { class: "compact-text", text: UI_TR.ready });
  readonly compactCount = h("span", { class: "compact-count", text: "0/0" });
  readonly compact = h("div", { class: "compact-content" }, this.compactText, this.compactCount);
  readonly el: HTMLElement;
  private pillButtons = new Map<Agent, HTMLButtonElement>();
  private cardKey = "";

  constructor(private actions: { collapse(): void; quota(): void; pet?(): void; apps?(): void; chat?(): void; orkestra?(): void; appOpen?(id: string): Promise<string | null | void>; appsRefresh?(): void }) {
    for (const agent of AGENT_ORDER) {
      const button = h("button", { class: "agent-pill", text: NAMES[agent], onclick: () => {
        const task = preferredTask(currentTasks(State.tasks.filter(t => t.agent === agent)));
        if (task) { State.setFocus(task.id); this.flash(`${NAMES[agent]} görevi gösteriliyor.`); }
        else this.flash(`${NAMES[agent]} şu an boşta. Görev verilince burada görünür.`);
      } });
      button.dataset.agent = agent;
      this.pillButtons.set(agent, button);
      this.pills.append(button);
    }
    this.quotaButton = h("button", { class: "text-button", text: UI_TR.quota, onclick: actions.quota });
    this.primary = h("button", { class: "primary-button", text: UI_TR.collapse, onclick: actions.collapse });
    this.petButton = h("button", { class: "text-button pet-toggle", text: "Mini pet", role: "switch", "aria-checked": "true", onclick: () => actions.pet?.() });
    this.appsButton = h("button", { class: "text-button", text: "Uygulamalar", onclick: () => actions.apps?.() });
    this.chatButton = h("button", { class: "text-button", text: "Sohbet", onclick: () => actions.chat?.() });
    this.orkestraButton = h("button", { class: "text-button", text: "Orkestra", onclick: () => actions.orkestra?.() });
    this.footer = h("footer", {}, this.quotaButton, this.appsButton, this.orkestraButton, this.chatButton, this.petButton, this.primary);
    this.el = h("div", { id: "content" }, this.header, this.overview, this.quota, this.apps, this.chat, this.orkestra, this.greeting, this.bildirim, this.footer);
  }
  private lastSyncedView: ViewName | null = null;
  sync(view: ViewName, expanded: boolean) {
    this.petButton.setAttribute("aria-checked", String(State.settings.pet));
    this.petButton.textContent = `Mini pet ${State.settings.pet ? "açık" : "kapalı"}`;
    this.el.hidden = !expanded;
    this.compact.hidden = expanded;
    this.overview.hidden = view !== "overview";
    this.orkestra.hidden = view !== "orkestra";
    // Yalniz gorunume girerken ciz: her durum guncellemesinde yeniden cizmek yazilan gorevi siler.
    if (view === "orkestra" && expanded && this.lastSyncedView !== "orkestra") void this.renderOrkestra();
    this.lastSyncedView = expanded ? view : null;
    this.orkestraButton.textContent = view === "orkestra" ? UI_TR.back : "Orkestra";
    this.orkestraButton.setAttribute("aria-pressed", String(view === "orkestra"));
    this.quota.hidden = view !== "quota";
    this.greeting.hidden = view !== "greeting";
    this.apps.hidden = view !== "apps";
    this.chat.hidden = view !== "chat";
    this.appsButton.textContent = view === "apps" ? UI_TR.back : "Uygulamalar";
    this.appsButton.setAttribute("aria-pressed", String(view === "apps"));
    this.chatButton.textContent = view === "chat" ? UI_TR.back : "Sohbet";
    this.chatButton.setAttribute("aria-pressed", String(view === "chat"));
    this.footer.hidden = view === "greeting";
    // The main screen is a live board: only work that is still current reaches
    // it. A long history is counted in the summary and never listed here.
    const tasks = currentTasks(State.tasks), task = State.focusTask, rows = listedTasks(tasks.filter(row => row.id !== task?.id));
    this.summary.textContent = `${taskSummary(tasks)} ${UI_TR.completed}`;
    this.compactCount.textContent = taskSummary(tasks);
    this.compactText.textContent = State.snapshot.sourceUnavailable ? UI_TR.waiting : task?.title ?? UI_TR.ready;
    this.waiting.hidden = !State.snapshot.sourceUnavailable;
    const pills = pillStates(tasks, task);
    for (const [agent, button] of this.pillButtons) {
      const agentRows = tasks.filter(t => t.agent === agent);
      // Boştaki ajan sekmesi de tıklanır: tık sonucu "şu an boşta" bildirimi olur.
      const bos = agent === "claude" || pills[agent] === "disabled";
      button.setAttribute("aria-disabled", String(bos));
      button.title = bos ? `${NAMES[agent]} şu an boşta` : `${NAMES[agent]} görevini göster`;
      button.dataset.state = agent === "claude" ? "disabled" : pills[agent];
      button.classList.toggle("selected", task?.agent === agent);
      button.dataset.expression = expressionFor(preferredTask(agentRows)?.status);
      button.setAttribute("aria-pressed", String(task?.agent === agent));
    }
    const key = JSON.stringify({ task, elapsed: task ? elapsedText(task) : "", unavailable: State.snapshot.sourceUnavailable });
    if (this.cardKey !== key) {
      this.cardKey = key;
      this.card.replaceChildren();
      this.card.dataset.expression = expressionFor(task?.status);
      if (task) {
        // A failure or a pause carries one sentence and nothing else: the file
        // the job happened to touch is noise on the screen the user reads.
        const running = task.status === "Calisiyor" || task.status === "Hazirlaniyor";
        this.card.append(h("div", { class: "task-eyebrow", text: `${task.agent ? NAMES[task.agent] : "Ajan"}${task.model ? " · " + task.model : ""}${task.repo ? " · " + task.repo : ""} · ${elapsedText(task)}` }),
          h("h1", { text: task.title, title: task.title }), h("p", { class: "task-message", text: running && task.currentAction ? task.currentAction : taskMessage(task) }),
          h("div", { class: "task-meta" },
            h("span", { class: "active-file", text: running ? task.file ?? "" : "" }),
            h("span", { class: "task-percent", text: task.progress === null ? "" : `%${Math.round(task.progress)}` })));
        if (task.progress !== null) {
          const meter = h("div", { class: "progress-track", role: "progressbar", "aria-label": UI_TR.progress, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": task.progress });
          meter.append(h("div", { class: "progress-fill", style: `width:${task.progress}%` }));
          this.card.append(meter);
        }
      } else this.card.append(h("h1", { text: State.snapshot.sourceUnavailable ? UI_TR.waiting : UI_TR.ready }),
        h("p", { class: "task-message", text: State.snapshot.sourceUnavailable ? "" : UI_TR.nextTask }));
      this.card.animate?.([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 220, easing: "ease-out" });
    }
    this.others.replaceChildren();
    for (const row of rows.filter(t => t.id !== task?.id).slice(0, ROW_LIMIT)) this.others.append(this.taskRow(row));
    this.quotaButton.textContent = view === "quota" ? UI_TR.back : UI_TR.quota;
    this.quotaButton.setAttribute("aria-pressed", String(view === "quota"));
    this.primary.textContent = task?.status === "Tamamlandi" ? UI_TR.done : UI_TR.collapse;
    if (view === "quota") this.renderQuota();
  }
  setChatContent(content: HTMLElement) { this.chat.replaceChildren(content); }
  setAppsMessage(message: string) { this.appsMessage.textContent = message; }
  flash(message: string) {
    this.bildirim.textContent = message; this.bildirim.hidden = false;
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
      const button = h("button", { class: "app-open", text: row.etiket, onclick: () => { void this.openApp(row.id); } });
      button.disabled = !row.acilabilir || !this.actions.appOpen;
      const item = h("div", { class: `app-row${row.acilabilir ? "" : " unavailable"}` },
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
    return h("button", { class: "task-row", onclick: () => State.setFocus(task.id) },
      h("i", { class: `status-dot ${expressionFor(task.status)}` }), h("span", { class: "row-title", text: task.title, title: task.title }),
      h("span", { class: "row-status", text: STATUS_TR[task.status] }));
  }
  private renderQuota() {
    this.quota.replaceChildren(h("h1", { text: UI_TR.quota }));
    for (const row of quotaRows(State.snapshot)) {
      this.quota.append(h("div", { class: "quota-row" }, h("strong", { text: NAMES[row.agent] }),
        h("span", { text: `${row.percent}${row.stale ? " · Eski bilgi" : ""}` }),
        h("small", { text: `Yenilenme: ${row.reset} · Son kontrol: ${row.checked}` })));
    }
    this.quota.append(h("p", { class: "quota-note", text: UI_TR.quotaNote }));
  }
  private async renderOrkestra() {
    this.orkestra.replaceChildren(h("h1", { text: "Afu Orkestra" }));
    const tasks = State.snapshot.tasks || [];
    
    // 1. Ajan listesi
    const agentList = h("div", { class: "orkestra-agents" });
    for (const agent of ["codex", "gemini", "opencode"] as const) {
      let statusText = "Kapalı";
      const q = State.snapshot.quotas?.[agent];
      const isActive = tasks.some(t => t.agent === agent && (t.status === "Calisiyor" || t.status === "Hazirlaniyor" || t.status === "Bekliyor"));
      
      if (isActive) {
        statusText = "Çalışıyor";
      } else if (q) {
        if (q.remaining_percent !== null && q.remaining_percent <= 0) {
          statusText = `Kota dolu (${q.reset_at ?? "bilinmiyor"})`;
        } else {
          statusText = "Hazır";
        }
      }
      
      agentList.append(h("div", { class: "orkestra-agent-row" }, 
        h("strong", { text: NAMES[agent] }), 
        h("span", { text: statusText })
      ));
    }
    this.orkestra.append(agentList);

    // 2. İş ver formu
    const agentSelect = h("select", { class: "orkestra-select" });
    agentSelect.append(h("option", { value: "otomatik", text: "Otomatik (AfuNöbet Router)" }));
    for (const a of ["codex", "gemini", "opencode"]) {
      agentSelect.append(h("option", { value: a, text: NAMES[a as Agent] }));
    }

    const projectSelect = h("select", { class: "orkestra-select" });
    const projects = await Bridge.orkestraProjects() || ["AfuNobet-UI"];
    for (const p of projects) {
      const opt = h("option", { value: p, text: p });
      if (p === "AfuNobet-UI") opt.selected = true;
      projectSelect.append(opt);
    }

    const taskInput = h("input", { class: "orkestra-input", type: "text", placeholder: "Görev yazın...", required: "true" }) as HTMLInputElement;
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
        await Bridge.orkestraSend(agentSelect.value, projectSelect.value, taskInput.value);
        taskInput.value = "";
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert(message || "Hata");
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
      this.orkestra.append(h("div", { class: "orkestra-task-row" }, 
        h("strong", { text: t.title }), 
        h("span", { text: STATUS_TR[t.status] || t.status }),
        h("a", { href: "#", class: "log-link", text: "Log", onclick: (e: Event) => {
          e.preventDefault();
          void Bridge.logAc();
        } })
      ));
    }
  }
}

