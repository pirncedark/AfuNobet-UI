// Adapted upstream shell: same geometry, spring, wake strip and hit testing.
import { Tracked } from "../core/anim";
import { Bridge, IS_TAURI } from "../core/bridge";
import { EXPANDED_CORNER, NOTCH_W, PANEL_H, PANEL_W, ROUNDED_CORNER, fitScale, islandSize, type IslandMode, type IslandViewName } from "../core/layout";
import { State, type Expression } from "../core/state";
import { ChatView } from "../chat/chat";
import { buildContext, projectName } from "../chat/context";
import { appRows, enOnemli, type AppsSnapshot } from "../core/apps";
import { deriveEvents, EventDeduper } from "../core/events";
import { AfuCharacter } from "../afu/character";
import { AfuPet } from "../afu/pet";
import { T } from "../afu/timing";
import { AfuViews } from "../views/views";
import { h } from "../views/dom";
import { IslandStateMachine } from "./fsm";
import { soruAkisiniBagla } from "../question/question";
import { cursorToCss, dismissAction, hitRect, hitScale, toWindow } from "../core/hit";

export function trayDisplay(apps: AppsSnapshot, task: {status:string;agent:string|null;title:string;quotaPaused:boolean}|null|undefined) {
 const statuses: Record<string,string>={Calisiyor:"calisiyor",Hazirlaniyor:"calisiyor",Bekliyor:"bekliyor",Duraklatildi:"uyari",Hata:"hata",Tamamlandi:"basari"};
 const taskState=task?.quotaPaused?"uyari":statuses[task?.status??""]??"bos";
 const available=appRows(apps.apps,apps.durumlar).filter(row=>row.acilabilir);
 const appState=enOnemli(available.map(row=>apps.durumlar[row.id]?.durum??"bos"));
 const rank:Record<string,number>={hata:5,uyari:4,calisiyor:3,bekliyor:2,basari:1,bos:0};
 const appWins=rank[appState]>(rank[taskState]??0);
 const app=available.find(row=>apps.durumlar[row.id]?.durum===appState);
 return {durum:appWins?appState:taskState,title:appWins&&app?`${app.ad}: ${app.ozet||"Kontrol et"}`:task?`${task.agent?.toUpperCase()??"Ajan"}: ${task.title}`:"Afu yanında"};
}
const HIT_MARGIN = 14;
const modeOrder = (mode: IslandMode) => mode === "hidden" ? 0 : mode === "compact" ? 1 : 2;
export class Island {
  readonly pet = new AfuPet(() => this.fsm.fromPet(), () => { void this.refreshApps(); }, on => { if (!IS_TAURI) { this.pet.positionApps(); return; } void Bridge.petAppsPopup(on).then(() => this.pet.positionApps()).catch(() => this.appsError("Uygulama menüsü açılamadı; yeniden dene.")); });
  private appsSnapshot: AppsSnapshot = { apps: [], durumlar: {} };
  readonly chat = new ChatView(Bridge, () => buildContext(State.snapshot, State.focusTask), Bridge);
  private events = new EventDeduper();
  readonly fsm = new IslandStateMachine();
  private mode: IslandMode = "hidden";
  private view: IslandViewName = "overview";
  private width = new Tracked(NOTCH_W);
  private height = new Tracked(0);
  private radius = new Tracked(ROUNDED_CORNER);
  private character = new AfuCharacter();
  private views = new AfuViews({ collapse: () => this.collapse(), quota: () => this.setView(this.view === "quota" ? "overview" : "quota"), pet: () => void this.togglePet(), apps: () => { this.setView(this.view === "apps" ? "overview" : "apps"); void this.refreshApps(); }, appOpen: id => this.openApp(id), chat: () => this.openChat(), orkestra: () => this.setView(this.view === "orkestra" ? "overview" : "orkestra"), appsRefresh: () => void this.refreshApps() });
  private trayKey = "";
  private voiceExpression: Expression | null = null;
  private projectButton = h("button", { class: "text-button task-project", text: "Projeyi aç", onclick: () => { void this.openProject(); } });
  private freshnessTimer: number | null = null;
  private wakeStrip = h("div", { id: "wake-strip" });
  private clip = h("div", { id: "island-clip" }, this.views.el, this.views.compact, this.character.el);
  private islandEl = h("div", { id: "island", role: "region", "aria-label": "AfuNobet" }, this.clip);

  /** CSS pixels per window-logical pixel; below 1 when the viewport is smaller than the design. */
  private fit = 1;
  /** Width of the window in CSS pixels, which is also the coordinate space island.rs reports the cursor in. */
  private viewport = PANEL_W;
  private running = false;
  private lastFrame = 0;
  private collapsed = false;
  private collapseTimer: number | null = null;
  private greetingTimer: number | null = null;
  private returnTimer: number | null = null;
  private wasInIsland = false;
  private pushedRect = { x: -1, y: -1, w: -1, h: -1 };
  /** Pencerenin yerel ölçeği (Tauri scaleFactor). devicePixelRatio bundan büyükse
   *  (Windows metin boyutu) CSS ile pencere birimi ayrışır; bkz. core/hit.ts. */
  private nativeScale = 1;
  private questionOpen = false;
  private cardOpenSent: boolean | null = null;

  constructor(root: HTMLElement) {
    root.append(this.wakeStrip, this.islandEl, this.pet.el);
    State.subscribe(() => this.syncDom());
    document.addEventListener("visibilitychange", () => this.refreshClock());
    this.views.setChatContent(this.chat.element);
    this.bindQuestions();
    this.chat.onVoiceState = state => { this.voiceExpression = state === "idle" ? null : state; this.syncDom(); };
    this.pet.setAppOpener(id => this.openApp(id));
    this.wireFsm();
    this.wireInput();
    this.syncDom();
    window.addEventListener("resize", () => { this.applyGeometry(); this.pet.positionApps(); void Bridge.scaleFactor().then(s => { if (s) this.setNativeScale(s); }); });
    this.applyGeometry();
  }
  openChat() {
    if (this.view !== "chat") {
      this.setView("chat");
      void this.chat.refresh();
      this.fsm.pinned = true;
    } else {
      this.setView("overview");
    }
  }
  /** Ajan soruları (docs/SORU_SOZLESMESI.md): soru gelince ada açılır ve cevaplanana dek açık kalır. */
  private bindQuestions() {
    const host = h("div", { class: "soru-kap", hidden: true });
    this.views.overview.prepend(host);
    void soruAkisiniBagla(host, { degisti: open => {
      this.questionOpen = open;
      this.fsm.pinned = open;
      if (open) { State.announce("alert"); if (this.view !== "chat") this.setView("overview"); else this.fsm.forceHome(); }
      else if (!this.wasInIsland) this.fsm.mouseLeft();
    } });
  }
  attachFiles(paths: string[]) {
    this.chat.attach(paths); this.setView("chat"); this.fsm.pinned = true;
    void Bridge.focusWindow(true); void this.chat.refresh(); State.announce("happy");
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) this.character.image.animate([{transform:"scale(1)"},{transform:"scale(1.08)"},{transform:"scale(1)"}], {duration:300});
  }
  async openApp(id: string): Promise<string | void> {
    try { await Bridge.appOpen(id); }
    catch (error) { return error instanceof Error ? error.message : "Uygulama açılamadı. Yeniden dene."; }
  }
  async refreshApps() {
    const rows = await Bridge.appsList();
    if (rows === null) return;
    this.appsSnapshot = { apps: rows, durumlar: Object.fromEntries(rows.filter(row => row.durum !== null).map(row => [row.id, { durum: row.durum!, ozet: row.ozet ?? "" }])) };
    this.views.setApps(this.appsSnapshot); this.pet.setApps(this.appsSnapshot); this.syncDom();
  }
  private wireFsm() {
    this.fsm.homeToPetitDelay = State.settings.autoCloseInterval;
    this.fsm.onTransition = (from, to) => {
      if (from === "home" && to !== "home") { void this.chat.suspend(); void Bridge.focusWindow(false); }
      if (this.returnTimer !== null) clearTimeout(this.returnTimer);
      this.returnTimer = null;
      if (this.greetingTimer !== null) window.clearTimeout(this.greetingTimer);
      this.greetingTimer = null;
      if (to === "tray") {
        this.pet.setActive(false); this.setMode("tray"); void Bridge.trayMode(true); return;
      }
      if (from === "tray") void Bridge.trayMode(false);
      if (to === "pet") {
        this.setMode("pet");
        this.pet.setActive(true); this.pet.transition();
        void Bridge.petMode(true);
        return;
      }
      if (from === "pet" && to === "home") {
        this.pet.transition(true);
        void Bridge.petMode(false);
        if (!IS_TAURI) this.returnTimer = window.setTimeout(() => { this.returnTimer = null; this.onPet(false); }, T.shrink + T.floatDown + T.reveal + T.grab);
        return;
      }
      this.pet.setActive(false);
      if (to === "hidden") this.setMode("hidden");
      if (to === "petit") {
        this.view = "overview";
        this.setMode("compact");
        if (!this.wasInIsland) this.fsm.mouseLeft();
      }
      if (to === "home") {
        this.view = "overview";
        this.setMode("expanded");
        if (!this.wasInIsland) this.fsm.mouseLeft();
      }
      if (to === "greeting") {
        this.view = "greeting";
        this.setMode("expanded");
        this.greetingTimer = window.setTimeout(() => this.fsm.greetComplete(), 2600);
      }
      if (from === "greeting" && to === "home") this.view = "overview";
      this.syncDom();
    };
  }
  launch() {
    let first = true;
    try { first = localStorage.getItem("afunobet-orientation-v1") !== "seen"; localStorage.setItem("afunobet-orientation-v1", "seen"); } catch { /* Optional orientation persistence. */ }
    if (first) this.fsm.launch();
    else this.fsm.reveal();
  }
  applySettings() { this.fsm.homeToPetitDelay = State.settings.autoCloseInterval; this.setPetEnabled(State.settings.pet); }
  setPetEnabled(on: boolean) {
    State.settings.pet = on; this.fsm.petEnabled = on;
    if (this.fsm.state === "pet" || this.fsm.state === "tray") this.fsm.collapse();
    this.syncDom();
  }
  private async togglePet() {
    const on = !State.settings.pet;
    if (!IS_TAURI || await Bridge.setPet(on) === on) {
      this.setPetEnabled(on);
      this.views.flash(on ? "Mini pet açık: Küçült'e basınca Afu görev çubuğunun yanında bekler." : "Mini pet kapalı: Küçült'e basınca Afu sistem tepsisine iner.");
    }
    else this.views.petButton.textContent = "Ayar kaydedilemedi. Tekrar deneyin.";
  }
  applySnapshot(value: unknown) {
    const previous = State.tasks;
    State.apply(value);
    if (State.snapshot.sourceUnavailable || !State.shouldAnnounce()) return;
    const events = deriveEvents(previous, State.current).filter(event => this.events.accept(event, Date.now()));
    for (const event of events) void this.chat.notifications?.announce(event, State.shouldAnnounce() && !this.chat.responses?.speaking && !this.chat.voice?.active);
    if (this.mode === "tray") return;
    if (this.mode === "pet") { for (const event of events) this.pet.onEvent(event); return; }
    const important = events.find(event => event.kind === "RATE_LIMIT" || event.kind === "JOB_FAILED") ?? events.find(event => event.kind === "JOB_FINISHED");
    if (important) {
      State.setFocus(important.taskId);
      if (important.kind === "JOB_FINISHED" || important.kind === "JOB_FAILED") State.announce(important.kind === "JOB_FINISHED" ? "happy" : "error");
      this.fsm.pinned = important.kind === "RATE_LIMIT" || important.kind === "JOB_FAILED";
      this.fsm.forceHome();
      if (!this.wasInIsland) this.fsm.mouseLeft();
    } else if (events.length) this.fsm.reveal();
  }
  private setMode(next: IslandMode) {
    const previous = this.mode;
    this.mode = next;
    // Mod değişince tıklama kutusu her durumda yeniden gönderilir: Rust tarafı
    // (glide.rs) pet geçişinde kutuyu kendisi değiştirir, eski önbellek yanıltır.
    this.pushedRect = { x: -1, y: -1, w: -1, h: -1 };
    const open = next === "expanded";
    if (open !== this.cardOpenSent) { this.cardOpenSent = open; void Bridge.setCardOpen(open); }
    if (previous === "expanded" && next !== "expanded") void Bridge.focusWindow(false);
    this.updateWindowCollapsed();
    this.animateGeometry(modeOrder(next) < modeOrder(previous));
    this.syncDom();
  }
  onPet(on: boolean) {
    if (!on && this.fsm.state === "home") {
      this.pet.setActive(false);
      this.view = "overview"; this.collapsed = false; this.wasInIsland = false;
      this.setMode("expanded"); this.fsm.mouseLeft();
    }
  }
  setView(view: IslandViewName) {
    if (this.view === "chat" && view !== "chat") { void this.chat.suspend(); void Bridge.focusWindow(false); this.fsm.pinned = false; }
    if (this.mode !== "expanded") this.fsm.forceHome();
    this.view = view;
    this.animateGeometry(false);
    this.syncDom();
  }
  collapse() { void this.chat.suspend(); void Bridge.focusWindow(false); this.fsm.pinned = false; this.fsm.collapse(); }
  reveal() { this.fsm.reveal(); }
  private animateGeometry(shrinking: boolean) {
    const { w, h: height } = islandSize(this.mode, this.view);
    const r = this.mode === "expanded" ? EXPANDED_CORNER : ROUNDED_CORNER;
    if (shrinking) { this.width.curveTowards(w); this.height.curveTowards(height); this.radius.curveTowards(r); }
    else { this.width.springTo(w); this.height.springTo(height); this.radius.springTo(r); }
    this.ensureRunning();
  }
  private applyGeometry() {
    if (this.mode === "tray") { this.islandEl.hidden = true; this.wakeStrip.hidden = true; return; }
    if (this.mode === "pet") {
      this.islandEl.hidden = true; this.wakeStrip.hidden = true;
      const width = window.innerWidth > 0 ? window.innerWidth : PANEL_W;
      const height = window.innerHeight > 0 ? window.innerHeight : PANEL_H;
      // Pet penceresinin tamamı pet karesidir; kutu pencere biriminde gönderilir.
      this.pushRect(toWindow(hitRect("pet", { x: 0, y: 0, w: width, h: height }, { w: width, h: height }), this.hitK()));
      return;
    }
    this.islandEl.hidden = false; this.wakeStrip.hidden = false;
    // The window is sized in physical pixels and the webview lays out in CSS
    // pixels, so the two only agree when the native side reports the same scale
    // factor the webview uses. If it ever does not, the design would be cut off
    // on the right and the bottom, so the whole island is scaled down to the
    // viewport that actually exists instead of overflowing it.
    const width = window.innerWidth > 0 ? window.innerWidth : PANEL_W;
    const height = window.innerHeight > 0 ? window.innerHeight : PANEL_H;
    this.fit = fitScale(width, height);
    this.viewport = width;
    this.wakeStrip.style.width = `${Math.round(Math.min(width, NOTCH_W * 4) * 100) / 100}px`;
    const w = this.width.value, height_ = this.height.value, r = this.radius.value;
    const fit = this.fit;
    this.islandEl.style.width = `${w}px`;
    this.islandEl.style.height = `${height_}px`;
    this.islandEl.style.borderRadius = `${r}px`;
    this.islandEl.style.setProperty("--fit", String(fit));
    // Drawn size and hit box in window-logical pixels: what the user sees is
    // what the cursor test must use.
    const drawn = { x: (width - w * fit) / 2, y: 0, w: w * fit, h: height_ * fit };
    // Kart açıkken pencerenin tamamı tıklamayı tutar (masaüstüne geçmez);
    // kompakt/gizli modda yalnız ada şekli. island.rs pencere-mantıksal birim bekler.
    this.pushRect(toWindow(hitRect(this.mode, drawn, { w: width, h: height }), this.hitK()));
  }
  private hitK() { return hitScale(window.devicePixelRatio || 1, this.nativeScale); }
  private pushRect(r: { x: number; y: number; w: number; h: number }) {
    const p = this.pushedRect;
    if (Math.abs(p.x - r.x) > 0.5 || Math.abs(p.y - r.y) > 0.5 || Math.abs(p.w - r.w) > 0.5 || Math.abs(p.h - r.h) > 0.5) {
      this.pushedRect = r;
      void Bridge.setIslandRect(r.x, r.y, r.w, r.h);
    }
  }
  setNativeScale(scale: number) {
    if (!(scale > 0) || scale === this.nativeScale) return;
    this.nativeScale = scale;
    this.pushedRect = { x: -1, y: -1, w: -1, h: -1 };
    this.applyGeometry();
  }
  /** Kart açıkken dışarı tıklama / odak kaybı: mini pet açıksa pete iner. */
  dismiss() {
    if (dismissAction({ mode: this.mode, petEnabled: State.settings.pet, questionOpen: this.questionOpen }) === "pet") this.collapse();
  }
  private updateWindowCollapsed() {
    if (this.collapseTimer !== null) window.clearTimeout(this.collapseTimer);
    this.collapseTimer = null;
    if (this.mode === "pet" || this.mode === "tray") return;
    if (this.mode === "hidden") {
      this.collapseTimer = window.setTimeout(() => {
        this.collapseTimer = null;
        if (this.mode !== "hidden") return;
        this.collapsed = true;
        void Bridge.setCollapsed(true);
      }, 420);
    } else if (this.collapsed) { this.collapsed = false; void Bridge.setCollapsed(false); }
  }
  private wireInput() {
    this.wakeStrip.addEventListener("mouseenter", () => { if (this.mode === "hidden") this.fsm.mouseEntered(); });
    this.islandEl.addEventListener("mousedown", () => { if (this.mode === "compact") this.fsm.click(); });
    this.islandEl.addEventListener("mouseenter", () => this.fsm.mouseEntered());
    this.islandEl.addEventListener("mouseleave", () => this.fsm.mouseLeft());
    window.addEventListener("keydown", event => { if (event.key === "Escape" && this.mode === "expanded") this.collapse(); });
    // Pencere içinde ama kartın dışında (kenar boşlukları) tıklama = dışarı tıklama.
    document.addEventListener("pointerdown", event => {
      const target = event.target as Node | null;
      if (target && target instanceof Element) {
        const button = target.closest("button");
        if (button) { button.classList.remove("tiklandi"); void button.offsetWidth; button.classList.add("tiklandi"); window.setTimeout(() => button.classList.remove("tiklandi"), 320); }
      }
      if (this.mode !== "expanded" || !target) return;
      if (this.islandEl.contains(target) || this.pet.el.contains(target) || this.wakeStrip.contains(target)) return;
      this.dismiss();
    });
    // Pencere dışına tıklama Rust'tan gelir (disari.rs, "outside-click"). Odak kaybı
    // (blur) bilerek kullanılmaz: Gezgin'den dosya sürüklemeye başlamak da odağı
    // alır ve kart, dosya bırakılmadan pete inerdi (canlı ölçüm 2026-10-02).
    if (!IS_TAURI) window.addEventListener("mousemove", event => this.onCursor(event.clientX, event.clientY));
  }
  onCursor(wx: number, wy: number) {
    if (this.mode === "pet" || this.mode === "tray") return;
    // island.rs pencere-mantıksal birim gönderir; çizim CSS biriminde.
    const { x, y } = IS_TAURI ? cursorToCss({ x: wx, y: wy }, this.hitK()) : { x: wx, y: wy };
    const rect = this.drawnRect();
    const inside = x >= rect.x - HIT_MARGIN && x <= rect.x + rect.w + HIT_MARGIN && y >= -HIT_MARGIN && y <= rect.h + HIT_MARGIN;
    if (inside && !this.wasInIsland) this.fsm.mouseEntered();
    if (!inside && this.wasInIsland) this.fsm.mouseLeft();
    this.wasInIsland = inside;
    if (this.mode === "expanded") this.character.look(x - rect.x - 80, y - 140);
  }
  private drawnRect() {
    const fit = this.fit;
    return { x: (this.viewport - this.width.value * fit) / 2, y: 0, w: this.width.value * fit, h: this.height.value * fit };
  }
  private syncDom() {
    this.refreshClock();
    this.islandEl.dataset.mode = this.mode;
    this.islandEl.dataset.view = this.view;
    this.islandEl.dataset.expression = State.effectiveState;
    this.islandEl.setAttribute("aria-hidden", String(this.mode === "hidden"));
    this.clip.inert = this.mode === "hidden";
    this.character.sync(this.voiceExpression ?? State.effectiveState, this.mode === "compact", this.view === "greeting", this.mode === "compact" || this.mode === "expanded");
    this.views.sync(this.view, this.mode === "expanded");
    const project = projectName(State.focusTask?.repo); this.projectButton.hidden = !project;
    if (project) this.views.card.append(this.projectButton);
    if (!State.notificationsPaused) {
      const task = State.trayTask;
      const { durum, title } = trayDisplay(this.appsSnapshot, task);
      const key = `${durum}:${title}`;
      if (key !== this.trayKey) { this.trayKey = key; void Bridge.trayStatus(durum, title); }
    }
  }
  private refreshClock() {
    if (this.mode !== "expanded" || document.hidden) {
      if (this.freshnessTimer !== null) clearTimeout(this.freshnessTimer);
      this.freshnessTimer = null; return;
    }
    if (this.freshnessTimer === null) this.freshnessTimer = window.setTimeout(() => {
      this.freshnessTimer = null; State.notify();
    }, 60000);
  }
  appsError(message: string) { this.views.setAppsMessage(message); this.setView("apps"); }
  private async openProject() {
    const project = projectName(State.focusTask?.repo); if (!project) return;
    try { await Bridge.projectOpen(project); } catch { this.appsError("Proje klasörü açılamadı; kurulumunu kontrol et."); }
  }
  settingError(message: string) { this.views.petButton.textContent = message; }
  ensureRunning() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(this.frame);
  }
  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.width.step(dt, now); this.height.step(dt, now); this.radius.step(dt, now);
    this.applyGeometry();
    if (this.width.animating || this.height.animating || this.radius.animating) requestAnimationFrame(this.frame);
    else this.running = false;
  };
  get panelSize() { return { w: PANEL_W, h: PANEL_H }; }
}






