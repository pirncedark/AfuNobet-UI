// Adapted upstream shell: same geometry, spring, wake strip and hit testing.
import { hareketAzalt, nextDiscoveryHint } from "../core/settings";
import { Tracked } from "../core/anim";
import { Bridge, IS_TAURI } from "../core/bridge";
import { EXPANDED_CORNER, KART_OLCEK, NOTCH_W, PANEL_H, PANEL_W, PET_PENCERE, ROUNDED_CORNER, fitScale, panelScale, panelHeight, mascotDesignHeight, contentWidth, islandSize, petBalonKutusu, petBalonUst, petPencereYuksekligi, PANEL_MAX_H_RATIO, type IslandMode, type IslandViewName } from "../core/layout";
import { State, type Expression } from "../core/state";
import { ChatView } from "../chat/chat";
import { SorView } from "../sor/sor";
import { buildContext, projectName } from "../chat/context";
import { appRows, enOnemli, type AppsSnapshot } from "../core/apps";
import { deriveEvents, EventDeduper } from "../core/events";
 import { AfuCharacter, characterExpression, getDurum } from "../afu/character";
import { AfuPet, PET_BOYUT } from "../afu/pet";
import { petMesgul } from "../afu/ifade";
import { T } from "../afu/timing";
import { KonusanAfu, KOMUT_ONEK, claudeCevapMi, cevapGonder, temizMetin, kisalt, petBalonMetniniSigdir, devirMesajlari, olayMesaji, terminalPetMetni } from "../message/message";
 import { AfuViews } from "../views/views";
import { h } from "../views/dom";
import { IslandStateMachine } from "./fsm";
import { soruAkisiniBagla } from "../question/question";
import { bicimle } from "../message/bicim";
import { messageNotifications, showNotification } from "../message/notifications";
import { loadMessageAlert } from "../core/settings";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
  readonly pet = new AfuPet(() => this.fsm.fromPet(), () => { void this.refreshApps(); }, on => {
    // Uygulama menüsü de pencereyi büyütür: balon askıya alınır, iki katman çakışmaz.
    this.konusan?.suspend(on);
    if (!IS_TAURI) { this.pet.positionApps(); return; }
    void Bridge.petAppsPopup(on).then(() => this.pet.positionApps()).catch(() => this.appsError("Uygulama menüsü açılamadı; yeniden dene."));
  }, () => this.komutBalonuAc());
  /** Maskota tek tık: komut balonunu aç/kapat. Büyük mod yalnız çift tıkla gelir. */
  private komutBalonuAc() {
    const acik = messageNotifications.current();
    if (acik?.id.startsWith(KOMUT_ONEK)) { messageNotifications.close(acik.id); return; }
    const id = `${KOMUT_ONEK}${Date.now()}`;
    const zaman = Date.now();
    showNotification({ id, type: "notification", timestamp: zaman, text: "Komut ver", ajan: "codex",
      raw: { surum: 1, id, ajan: "codex", tur: "komut", metin: "Komut ver", zaman } });
  }
  private appsSnapshot: AppsSnapshot = { apps: [], durumlar: {} };
  readonly chat = new ChatView(Bridge, () => buildContext(State.snapshot, State.focusTask), Bridge);
  readonly sor = new SorView({ snapshot: () => State.snapshot, codexStatus: () => Bridge.codexStatus(), codexLogin: () => Bridge.codexLogin(), codexaSor: text => this.askCodex(text) });
  private events = new EventDeduper();
  readonly fsm = new IslandStateMachine();
  private mode: IslandMode = "hidden";
  private view: IslandViewName = "overview";
  private width = new Tracked(NOTCH_W);
  private height = new Tracked(0);
  private radius = new Tracked(ROUNDED_CORNER);
  private character = new AfuCharacter();
  private views = new AfuViews({ collapse: () => this.collapse(), quota: () => this.setView(this.view === "quota" ? "overview" : "quota"), pet: () => void this.togglePet(), apps: () => { this.setView(this.view === "apps" ? "overview" : "apps"); void this.refreshApps(); }, appOpen: id => this.openApp(id), chat: () => this.openChat(), orkestra: () => this.setView(this.view === "orkestra" ? "overview" : "orkestra"), sor: () => this.openSor(), appsRefresh: () => void this.refreshApps() });
  private trayKey = "";
  private voiceExpression: Expression | null = null;
  private projectButton = h("button", { class: "text-button task-project", text: "Projeyi aç", onclick: () => { void this.openProject(); } });
  private freshnessTimer: number | null = null;
  private konusan: KonusanAfu;
  private wakeStrip = h("div", { id: "wake-strip" });
  private clip = h("div", { id: "island-clip" }, this.views.el, this.views.compact, this.character.el);
  private islandEl = h("div", { id: "island", role: "region", "aria-label": "AfuNobet" }, this.clip);
  /** P10: balon kutusu. `#afu-pet` `overflow:hidden` olduğu için balon ayrı bir
   *  kutuya çizilir; alt kenarı karakterin tepesine sabit mesafedeyken
   *  pencerenin tepesi ekrana sığmazsa yüksekliği kısalır (kesme). */
  private petBalonEl = h("div", { id: "afu-pet-balon" });
  /** Balon pet penceresini büyütüyor mu? Pencere ölçüsü ve isabet kutusu buna bakar. */
  private petBalon = false;

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
  private lastSentHeight = -1;
  private pushedRect = { x: -1, y: -1, w: -1, h: -1 };
  /** Pencerenin yerel ölçeği (Tauri scaleFactor). devicePixelRatio bundan büyükse
   *  (Windows metin boyutu) CSS ile pencere birimi ayrışır; bkz. core/hit.ts. */
  private nativeScale = 1;
  private questionOpen = false;
  private questionHost: HTMLElement | null = null;
  private dragging = false;
  private cardOpenSent: boolean | null = null;

  constructor(root: HTMLElement) {
    root.append(this.wakeStrip, this.islandEl, this.pet.el, this.petBalonEl);
    State.subscribe(() => this.syncDom());
    document.addEventListener("visibilitychange", () => this.refreshClock());
    this.views.setChatContent(this.chat.element);
    this.views.setSorContent(this.sor.element);
    this.chat.onVoiceState = state => { this.voiceExpression = state === "idle" ? null : state; this.syncDom(); };
    this.pet.setAppOpener(id => this.openApp(id));
    // W7: iş, soru ya da balon varken Afu arada ifade yapmaz.
    this.pet.setMesgul(() => petMesgul({ gorevler: State.tasks, soruAcik: this.questionOpen, balonAcik: this.petBalon || !!this.konusan?.balonAcik }));
    this.wireFsm();
    this.wireInput();
    this.konusan = new KonusanAfu(this.pet.el, this.petBalonEl, this.character.el, this.views.overview, () => {
      if (this.view !== "overview") this.setView("overview");
      this.fsm.forceHome();
    }, () => this.syncPetBalon(), message => showNotification({
      id: `notification:${message.id}`, type: "notification", timestamp: message.zaman,
      text: message.metin, ajan: message.ajan,
      requiresReply: terminalPetMetni(message.metin, message.ajan).soru,
      raw: message,
    }));
    this.bindMessages();
    this.bindQuestions();
    void this.konusan.bagla().then(dispose => window.addEventListener("pagehide", dispose, { once: true }));
    this.syncDom();
    window.addEventListener("resize", () => { if (this.mode === "expanded") this.animateGeometry(false); this.applyGeometry(); this.pet.positionApps(); void Bridge.scaleFactor().then(s => { if (s) this.setNativeScale(s); }); });
    this.applyGeometry();

    // Follow pose changes and queued messages even while the island is settled.
    const petGeometry = new MutationObserver(() => {
      if (this.mode === 'pet' && this.petBalon) this.applyGeometry();
    });
    petGeometry.observe(this.pet.image, { attributes: true, attributeFilter: ['src', 'style'] });
    petGeometry.observe(this.petBalonEl, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => petGeometry.disconnect(), { once: true });

    const ro = new ResizeObserver(() => {
      if (this.mode === "expanded") this.animateGeometry(false);
    });
    const observeNode = (node: Element) => {
      ro.observe(node);
      for (const child of Array.from(node.children)) observeNode(child);
    };
    observeNode(this.views.el);
    new MutationObserver(mutations => {
      let changed = false;
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (node instanceof Element) observeNode(node);
        }
        if (m.type === "childList") changed = true;
      }
      if (changed && this.mode === "expanded") this.animateGeometry(false);
    }).observe(this.views.el, { childList: true, subtree: true });
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
  /** "Afu'ya sor": tek giriş alanı; durum soruları yerelde, gerisi Codex sohbetine. */
  openSor() {
    if (this.view === "sor") { this.setView("overview"); return; }
    this.setView("sor"); this.fsm.pinned = true;
    void Bridge.focusWindow(true); this.sor.focus();
  }
  private async askCodex(text: string) {
    this.setView("chat"); this.fsm.pinned = true;
    await this.chat.ask(text);
  }
  /** Ajan soruları (docs/SORU_SOZLESMESI.md): soru gelince ada açılır ve cevaplanana dek açık kalır. */
  private bindQuestions() {
    const host = h("div", { class: "soru-kap", hidden: true });
    this.questionHost = host;
    this.views.overview.prepend(host);
    void soruAkisiniBagla(host, { messages: messageNotifications, degisti: open => {
      this.questionOpen = open; this.syncDom();
      if (open) State.announce("alert");
    } }).then(dispose => window.addEventListener("pagehide", dispose, { once: true }));
  }
  /** Gelen Claude mesajını maskot sesiyle okur, sonra tek tur dinler; duyulan cevap Claude'a gider. */
  private sesliId: string | null = null;
  private sesliOkunan = new Set<string>();
  private sesliBitir() { this.sesliId = null; void Bridge.voiceCancel().catch(() => {}); void Bridge.voiceSilence().catch(() => {}); }
  private async sesliCevap(message: { id: string; raw?: import("../message/message").Mesaj }) {
    const raw = message.raw;
    if (!raw || this.sesliOkunan.has(message.id)) return;
    this.sesliOkunan.add(message.id);
    try { if (localStorage.getItem("afuSesliMesaj") === "0") return; } catch { /* ayar yoksa açık */ }
    if (this.chat.voice?.active || this.chat.responses?.speaking) return;
    this.sesliId = message.id;
    const hala = () => messageNotifications.current()?.id === message.id && this.sesliId === message.id;
    try {
      const destek = await Bridge.voiceSupported();
      if (!destek.tts && !destek.afu_tts) return;
      await Bridge.voiceResponse(kisalt(temizMetin(raw.metin), 240));
      if (!hala()) return;
      // Konuşma tanıma gürültüyü "(Müzik)", "[alkış]" gibi etiketle döndürür; bunlar cevap sayılmaz.
      const duyulan = (await Bridge.voiceListenTurn(10000)).replace(/[(\[*][^)\]*]*[)\]*]/g, " ").replace(/\s+/g, " ").trim();
      if (!duyulan || !hala()) return;
      const bicim = bicimle(raw.metin);
      const sayilar: Record<string, string> = { bir: "1", iki: "2", "üç": "3", "uc": "3", "dört": "4", "dort": "4" };
      const kelime = duyulan.toLowerCase().replace(/[^\p{L}\d ]/gu, "").trim();
      const no = /^\d+$/.test(kelime) ? kelime : sayilar[kelime];
      const sec = no ? bicim.secenekler?.find(x => x.id === no) : undefined;
      cevapGonder(raw, sec ? `${sec.id} = ${sec.etiket}` : duyulan);
      messageNotifications.close(message.id);
    } catch { /* ses yoksa balon yazıyla çalışmaya devam eder */ }
  }
  private bindMessages() {
    State.settings.messageAlert = loadMessageAlert();
    messageNotifications.setEnabled(State.settings.messageAlert);
    let raised = false;
    const unsubscribe = messageNotifications.subscribe(() => {
      const message = messageNotifications.current();
      if (message?.raw && claudeCevapMi(message.raw)) void this.sesliCevap(message);
      else if (this.sesliId && message?.id !== this.sesliId) this.sesliBitir();
      else if (!message && this.sesliId) this.sesliBitir();
      this.konusan.setHarici(message?.raw ?? null, message ? () => messageNotifications.close(message.id) : undefined);
      const shouldRaise = !!message && State.settings.messageAlert !== false;
      if (shouldRaise) { this.fsm.messageOpened(); if (this.mode !== "pet") this.setView("overview"); }
      else if (raised) this.fsm.messageClosed();
      raised = shouldRaise;
      this.syncDom();
    });
    const settingsChanged = () => messageNotifications.setEnabled(State.settings.messageAlert !== false);
    window.addEventListener("afu-message-setting", settingsChanged);
    window.addEventListener("pagehide", () => {
      unsubscribe(); window.removeEventListener("afu-message-setting", settingsChanged);
      messageNotifications.dispose();
    }, { once: true });
  }
  /** Dosya adanin uzerine suruklenirken Afu "yakalama" animasyonunu oynatir. */
  setDragging(on: boolean) {
    if (this.dragging === on) return;
    this.dragging = on; this.syncDom();
  }
  attachFiles(paths: string[]) {
    this.chat.attach(paths); this.setView("chat"); this.fsm.pinned = true;
    void Bridge.focusWindow(true); void this.chat.refresh(); State.announce("happy");
    if (!hareketAzalt.matches) this.character.image.animate([{transform:"scale(1)"},{transform:"scale(1.08)"},{transform:"scale(1)"}], {duration:300});
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
  private lastIdleTime = 0;
  private wireFsm() {
    this.fsm.homeToPetitDelay = State.settings.autoCloseInterval;
    this.fsm.onTransition = (from, to) => {
      if (from === "hidden" && to !== "hidden" && IS_TAURI && !messageNotifications.isOpen) {
        void getCurrentWindow().show().catch(() => {});
      }
      if (from === "home" && to !== "home") { void this.chat.suspend(); void Bridge.focusWindow(false); }
      if (this.returnTimer !== null) clearTimeout(this.returnTimer);
      this.returnTimer = null;
      if (this.greetingTimer !== null) window.clearTimeout(this.greetingTimer);
      this.greetingTimer = null;
      if (to === "tray") {
        this.pet.setActive(false); this.setMode("tray"); void Bridge.trayMode(true); return;
      }
      if (from === "tray") void Bridge.trayMode(false);
      
      // Animations
      if (from === "hidden" && to === "home" && Date.now() - this.lastIdleTime > 60000) this.playAnimOnce("waking", 2000);
      else if (from === "petit" && to === "home" && Date.now() - this.lastIdleTime > 60000) this.playAnimOnce("waking", 2000);
      else if (from === "home" && to === "greeting") this.playAnimOnce("greeting_alt", 2600); // kitap_selam (ilk açılış alternatifi)
      else if (to === "pet") { this.playAnimOnce("landing", 800); } // inis
      
      if (to === "hidden" || to === "petit") this.lastIdleTime = Date.now();

      if (to === "pet") {
        this.setMode("pet");
        this.pet.setActive(true); this.pet.transition();
        void Bridge.petMode(true);
        return;
      }
      if (from === "pet" && to === "home") {
        this.pet.transition(true);
        void Bridge.petMode(false);
        if (!IS_TAURI) this.returnTimer = window.setTimeout(() => { this.returnTimer = null; this.onPet(false); }, T.petReturn);
        return;
      }
      this.pet.setActive(false);
      
      if (from === "home" && (to === "hidden" || to === "petit")) {
        const isPetit = to === "petit";
        this.playAnimOnce(isPetit ? "leaving_soon" : "leaving", 800);
        setTimeout(() => {
          if (this.fsm.state === to) {
            if (isPetit) { this.view = "overview"; this.setMode("compact"); }
            else this.setMode("hidden");
            if (!this.wasInIsland) this.fsm.mouseLeft();
          }
        }, 800);
      } else {
        if (to === "hidden") this.setMode("hidden");
        if (to === "petit") {
          this.view = "overview";
          this.setMode("compact");
          if (!this.wasInIsland) this.fsm.mouseLeft();
        }
      }
      
      if (to === "home") {
        this.view = "overview";
        this.setMode("expanded");
        if (!this.wasInIsland) this.fsm.mouseLeft();
      }
      if (to === "greeting") {
        this.view = "greeting";
        this.setMode("expanded");
        const showNext = () => {
          const hint = nextDiscoveryHint();
          if (!hint) { this.fsm.greetComplete(); return; }
          const line = this.views.greeting.querySelector("p");
          if (line) line.textContent = hint;
          this.greetingTimer = window.setTimeout(showNext, 5000);
        };
        showNext();
      }
      if (from === "greeting" && to === "home") this.view = "overview";
      this.syncDom();
    };
  }
  launch() {
    if (messageNotifications.isOpen && State.settings.messageAlert !== false) return;
    let first = true, pendingHints = false;
    try { first = localStorage.getItem("afunobet-orientation-v1") !== "seen"; pendingHints = Number(localStorage.getItem("afunobet-discovery-v1") ?? 0) < 4; localStorage.setItem("afunobet-orientation-v1", "seen"); } catch { /* Optional orientation persistence. */ }
    if (first || pendingHints) this.fsm.launch();
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
    let events = deriveEvents(previous, State.current).filter(event => this.events.accept(event, Date.now()));
    for (const event of events) void this.chat.notifications?.announce(event, State.shouldAnnounce() && !this.chat.responses?.speaking && !this.chat.voice?.active);
    for (const event of events) {
      const mesaj = olayMesaji(event, State.snapshot.tasks, Date.now(), State.snapshot.quotas);
      if (mesaj && this.konusan) this.konusan.ekle(mesaj);
    }
    for (const mesaj of devirMesajlari(previous, State.current, Date.now(), State.snapshot.quotas)) this.konusan?.ekle(mesaj);
    if (messageNotifications.isOpen) return;
    if (this.mode === "tray") return;
    if (this.mode === "pet") { for (const event of events) this.pet.onEvent(event); return; }
    // Claude (1.0.4): kartı açmaz, odağı çalmaz; yalnız Afu'nun ifadesi kısa süre değişir.
    const claude = events.filter(event => event.agent === "claude");
    const sonClaude = claude.find(event => event.kind === "JOB_FAILED") ?? claude.find(event => event.kind === "JOB_FINISHED");
    if (sonClaude) State.announce(sonClaude.kind === "JOB_FINISHED" ? "success" : "error");
    events = events.filter(event => event.agent !== "claude");
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
    if (previous !== next) this.lastSentHeight = -1;
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
      this.view = "overview"; this.collapsed = false;
      this.setMode("expanded"); if (!this.wasInIsland) this.fsm.mouseLeft();
    }
  }
  setView(view: IslandViewName) {
    if (this.view === "chat" && view !== "chat") { void this.chat.suspend(); void Bridge.focusWindow(false); this.fsm.pinned = false; }
    if (this.view === "sor" && view !== "sor" && view !== "chat") { void Bridge.focusWindow(false); this.fsm.pinned = false; }
    if (this.mode !== "expanded") this.fsm.forceHome();
    this.view = view;
    this.animateGeometry(false);
    this.syncDom();
  }
  collapse() {
    if (this.questionOpen) return;
    const message = messageNotifications.current();
    if (message?.type === "notification") { messageNotifications.close(message.id); return; }
    void this.chat.suspend(); void Bridge.focusWindow(false); this.fsm.pinned = false; this.fsm.collapse();
  }
  reveal() { this.fsm.reveal(); }
  private animateGeometry(shrinking: boolean) {
    let { w, h: height } = islandSize(this.mode, this.view);
    if (this.mode === "expanded") {
      const context = document.createElement("canvas").getContext("2d");
      let textWidth = 0;
      if (context) {
        const walker = document.createTreeWalker(this.views.el, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode, parent = node.parentElement;
          if (!parent || parent.closest("[hidden]")) continue;
          let visible = true;
          for (let ancestor: HTMLElement | null = parent; ancestor; ancestor = ancestor.parentElement) {
            const computed = getComputedStyle(ancestor);
            if (computed.display === "none" || computed.visibility === "hidden" || (ancestor.tagName === "DETAILS" && !ancestor.hasAttribute("open") && !parent.closest("summary"))) { visible = false; break; }
          }
          if (!visible) continue;
          const style = getComputedStyle(parent);
          if (style.display === "none" || style.visibility === "hidden") continue;
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          for (const line of (node.textContent ?? "").split(/\n/)) textWidth = Math.max(textWidth, context.measureText(line.trim()).width);
        }
      }
      w = contentWidth(textWidth, window.innerWidth || PANEL_W, window.innerHeight || PANEL_H);
    }
    // Kepenk yalnız gerçek pencerede: önizlemede pencere büyüyemez, kart sabit kalır.
    if (this.mode === "expanded" && "__TAURI_INTERNALS__" in window) {
      const activeView = Array.from(this.views.el.children).find(el => !el.hasAttribute("hidden") && el.tagName !== "HEADER") as HTMLElement;
      if (activeView) {
        const computed = getComputedStyle(this.views.el);
        // scrollHeight on a flex-filled body includes its current allocation.
        // Measure an auto-height copy at the same content width so native resize
        // converges in one step instead of shrinking the allocated box repeatedly.
        const measureHost = this.views.el.cloneNode(false) as HTMLElement;
        measureHost.style.cssText = `position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;width:${this.views.el.clientWidth}px;height:auto;min-height:0;max-height:none;display:block;overflow:visible;`;
        measureHost.style.setProperty("--mascot-design-h", this.islandEl.style.getPropertyValue("--mascot-design-h"));
        const measureBody = activeView.cloneNode(true) as HTMLElement;
        measureBody.style.height = "auto"; measureBody.style.minHeight = "0";
        measureBody.style.maxHeight = "none"; measureBody.style.flex = "none";
        measureHost.append(measureBody); document.body.append(measureHost);
        const intrinsicHeight = measureBody.scrollHeight;
        measureHost.remove();
        let contentHeight = this.views.header.offsetHeight + intrinsicHeight + this.views.footer.offsetHeight + parseFloat(computed.paddingTop || "0") + parseFloat(computed.paddingBottom || "0");
        if (!this.views.bildirim.hidden) {
          contentHeight += this.views.bildirim.offsetHeight + 5;
        }
        const isQuestionVisible = this.questionHost && !this.questionHost.hidden;
        if (isQuestionVisible) {
          const kart = this.questionHost!.firstElementChild as HTMLElement;
          if (kart) {
            let kartContentHeight = 20; // 9px top + 9px bottom padding + 2px border
            let visibleChildren = 0;
            const children = Array.from(kart.children) as HTMLElement[];
            for (let i = 0; i < children.length; i++) {
              const el = children[i];
              if (el.hidden || el.style.display === "none") continue;
              kartContentHeight += el.scrollHeight;
              visibleChildren++;
            }
            if (visibleChildren > 1) {
              kartContentHeight += (visibleChildren - 1) * 6; // gap: 6px
            }
            contentHeight = this.views.header.offsetHeight + kartContentHeight + this.views.footer.offsetHeight + parseFloat(computed.paddingTop || "0") + parseFloat(computed.paddingBottom || "0");
          }
        }
        const screenAvail = window.screen.availHeight || 1080;
        const maxH = screenAvail * PANEL_MAX_H_RATIO / (panelScale(window.innerWidth || PANEL_W) * KART_OLCEK);
        // Kepenk yalnız UZATIR: kart hiçbir zaman sabit kart yüksekliğinden kısa olmaz.
        height = Math.max(height, Math.min(contentHeight, maxH));
      }
    }
    if (this.mode === "expanded") {
      const geometry = panelHeight(height, window.innerWidth || PANEL_W, window.innerHeight || PANEL_H, window.screen.availHeight || 1080);
      height = geometry.design;
      const nativeH = Math.ceil(geometry.nativeCss * this.hitK());
      if (IS_TAURI && Math.abs(this.lastSentHeight - nativeH) > 0.5) {
        this.lastSentHeight = nativeH;
        void Bridge.kartYukseklik(nativeH);
      }
    }
    const r = this.mode === "expanded" ? EXPANDED_CORNER : ROUNDED_CORNER;
    const reduced = hareketAzalt.matches || !("__TAURI_INTERNALS__" in window);
    if (reduced) {
      this.width.jump(w); this.height.jump(height); this.radius.jump(r);
    } else if (shrinking) {
      this.width.curveTowards(w); this.height.curveTowards(height, 200); this.radius.curveTowards(r);
    } else {
      this.width.curveTowards(w, T.panelOpen); this.height.curveTowards(height, T.panelOpen); this.radius.curveTowards(r, T.panelOpen);
    }
    this.ensureRunning();
  }
  private applyGeometry() {
    if (this.mode === "tray") { this.islandEl.hidden = true; this.wakeStrip.hidden = true; return; }
    if (this.mode === "pet") {
      this.pet.setDisplayScale(this.hitK());
      this.islandEl.hidden = true; this.wakeStrip.hidden = true;
      const width = window.innerWidth > 0 ? window.innerWidth : PET_PENCERE;
      const height = window.innerHeight > 0 ? window.innerHeight : petPencereYuksekligi(this.petBalon);
      // Keep the character square when the native window widens for speech.
      this.pet.el.style.width = `${PET_PENCERE}px`;
      this.pet.el.style.height = `${PET_PENCERE}px`;
      this.pet.el.style.left = `${(width - PET_PENCERE) / 2}px`;
      this.pet.el.style.top = "auto";
      this.pet.el.style.bottom = "0px";
      const kare = this.pet.image.getAttribute('src')?.replace(/^.*\/afu\//, '').replace(/^pet\//, '').replace(/\.webp$/, '') ?? this.pet.model.frame;
      const kutu = PET_BOYUT[kare]?.kutu ?? [0, 0, 1, 1];
      const scale = Number(this.pet.image.style.scale) || 1;
      const ty = parseFloat(this.pet.image.style.translate.split(' ')[1]) || 0;
      const head = PET_PENCERE + (kutu[1] * PET_PENCERE - PET_PENCERE) * scale + ty;
      // 9px tail + 4px gap, measured from the visible alpha head, not the frame.
      const bottom = PET_PENCERE - head + 13;
      this.petBalonEl.style.setProperty('--pet-balon-bottom', `${bottom}px`);
      this.petBalonEl.style.setProperty("--pet-balon-h", `${petBalonKutusu(height, bottom)}px`);
      petBalonMetniniSigdir(this.petBalonEl);
      // Pet penceresinin tamamı pet karesidir; kutu pencere biriminde gönderilir.
      // Balon açıkken pencerenin tepesindeki şeffaf pay isabet kutusuna girmez,
      // böylece boş kısım tıklamayı masaüstüne geçirir.
      this.pushRect(toWindow(hitRect("pet", { x: 0, y: 0, w: width, h: height }, { w: width, h: height }, petBalonUst(this.petBalon)), this.hitK()));
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
    this.fit = this.mode === "expanded" ? panelScale(width) : fitScale(width, height);
    this.viewport = width;
    const characterScale = this.fit * this.kartOlcek() * this.hitK();
    this.character.setDisplayScale(characterScale);
    this.clip.style.setProperty("--character-column", `${200 / characterScale}px`);
    const bodyZoom = Number(getComputedStyle(document.body).zoom) || 1;
    this.islandEl.style.setProperty("--mascot-design-h", `${mascotDesignHeight(width, this.hitK(), bodyZoom)}px`);
    this.wakeStrip.style.width = `${Math.round(Math.min(width, NOTCH_W * 4 * KART_OLCEK) * 100) / 100}px`;
    const w = this.width.value, height_ = this.mode === "expanded" ? Math.min(this.height.value, Math.max(0, height - 2) / (this.fit * KART_OLCEK)) : this.height.value, r = this.radius.value;
    const fit = this.fit;
    this.islandEl.style.width = `${w}px`;
    this.islandEl.style.height = `${height_}px`;
    this.islandEl.style.borderRadius = `${r}px`;
    this.islandEl.style.setProperty("--fit", String(fit));
    // Kart (ada açık hali) KART_OLCEK kat büyük çizilir; kompakt/gizli ada
    // şeritleri ölçüsünde kalır. `zoom` bütün ölçüleri (yazı, boşluk, düğme,
    // karakter) aynı karla büyüttüğü için çizim ölçüsü de aynı karla çarpılır.
    const zoom = this.mode === "expanded" ? KART_OLCEK : 1;
    this.islandEl.style.setProperty("--kart-olcek", String(zoom));
    // Drawn size and hit box in window-logical pixels: what the user sees is
    // what the cursor test must use.
    const k = fit * zoom;
    const drawn = { x: (width - w * k) / 2, y: 0, w: w * k, h: height_ * k };
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
    this.wakeStrip.addEventListener("mouseenter", () => this.onEdgeWake());
    this.islandEl.addEventListener("mousedown", () => { if (this.mode === "compact") this.fsm.click(); });
    this.islandEl.addEventListener("mouseenter", () => { this.wasInIsland = true; if (this.mode === "compact" || this.mode === "hidden") this.onEdgeWake(); else this.fsm.mouseEntered(); });
    this.islandEl.addEventListener("mouseleave", () => { this.wasInIsland = false; this.fsm.mouseLeft(); });
    window.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      // P11: Esc önce balonu kapatır; balon yoksa kart kapanır.
      if (this.konusan?.balonAcik && this.konusan.kapat()) return;
      if (this.mode === "expanded") this.collapse();
    });
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
  /** Edge wake keeps the existing native pet return animation. */
  onEdgeWake() {
    this.wasInIsland = true;
    if (this.fsm.state === "home") { this.fsm.mouseEntered(); return; }
    if (this.fsm.state === "greeting") return;
    if (this.fsm.state === "pet") this.fsm.fromPet();
    else if (this.fsm.state === "tray") this.fsm.trayClick();
    else this.fsm.forceHome();
  }
  onCursor(wx: number, wy: number) {
    if (this.mode === "pet" || this.mode === "tray") return;
    // island.rs pencere-mantıksal birim gönderir; çizim CSS biriminde.
    const { x, y } = IS_TAURI ? cursorToCss({ x: wx, y: wy }, this.hitK()) : { x: wx, y: wy };
    const rect = this.drawnRect();
    const inside = x >= rect.x - HIT_MARGIN && x <= rect.x + rect.w + HIT_MARGIN && y >= -HIT_MARGIN && y <= rect.h + HIT_MARGIN;
    if (inside && !this.wasInIsland) { this.wasInIsland = true; if (this.mode === "compact" || this.mode === "hidden") this.onEdgeWake(); else this.fsm.mouseEntered(); }
    if (!inside && this.wasInIsland) this.fsm.mouseLeft();
    this.wasInIsland = inside;
    if (this.mode === "expanded") { const k = this.kartOlcek(); this.character.look((x - rect.x) / k - 80, y / k - 140); }
  }
  /** Ada çizilen kutu, CSS `zoom` ve `--fit` büyüttükten sonra pencere biriminde. */
  private drawnRect() {
    const k = this.fit * this.kartOlcek();
    return { x: (this.viewport - this.width.value * k) / 2, y: 0, w: this.width.value * k, h: this.height.value * k };
  }
  /** Kart açıkken 1,5; kompakt/gizli modda 1. */
  private kartOlcek() { return this.mode === "expanded" ? KART_OLCEK : 1; }
  private syncDom() {
    this.refreshClock();
    this.islandEl.dataset.mode = this.mode;
    this.islandEl.dataset.view = this.view;
    this.islandEl.dataset.expression = State.effectiveState;
    this.islandEl.setAttribute("aria-hidden", String(this.mode === "hidden"));
    this.clip.inert = this.mode === "hidden";
    const rawExpr = characterExpression({ dragging: this.dragging, questionOpen: this.questionOpen, voice: this.voiceExpression, state: State.effectiveState });
    const finalExpr = this.animOverride && this.animOverride.until > Date.now() ? this.animOverride.expr : rawExpr;
    this.character.sync(finalExpr, this.mode === "compact", this.view === "greeting", this.mode === "compact" || this.mode === "expanded");
    const durum = getDurum(finalExpr);
    this.islandEl.dataset.durum = durum;
    this.pet.setDurum(durum);
    this.views.sync(this.view, this.mode === "expanded");
    if (this.konusan) this.konusan.guncelle(this.mode, this.fsm.state === "pet");
    const messageHost = this.mode === "pet" ? this.petBalonEl : this.views.overview;
    for (const host of [this.questionHost]) {
      if (host && host.parentElement !== messageHost) messageHost.append(host);
    }
    this.syncPetBalon();
    this.syncPetBalon();
    const project = projectName(State.focusTask?.repo); this.projectButton.hidden = !project;
    if (project) this.views.card.append(this.projectButton);
    if (!State.notificationsPaused) {
      const task = State.trayTask;
      const { durum, title } = trayDisplay(this.appsSnapshot, task);
      const key = `${durum}:${title}`;
      if (key !== this.trayKey) { this.trayKey = key; void Bridge.trayStatus(durum, title); }
    }
  }

  /**
   * P10: balon yalnız pet modunda pencereyi büyütür. Balon görünürken pencere
   * YUKARI büyür (alt kenar görev çubuğunun üstünde sabit, karakter yerinden
   * oynamaz), balon kapanınca eski 256 px boyutuna döner. Kart açıkken balon
   * kartın içinde çizilir, pencerenin ölçüsüne dokunulmaz.
   */
  private syncPetBalon() {
    const open = this.mode === "pet" && this.fsm.state === "pet" && (!!this.konusan?.balonAcik || messageNotifications.isOpen);
    if (open === this.petBalon) return;
    this.petBalon = open;
    if (IS_TAURI) void Bridge.petBalon(open).catch(() => { /* pencere ölçüsü bir sonraki düzeltmede eskalenir */ });
    this.applyGeometry();
  }

  private animOverride: { expr: Expression, until: number } | null = null;
  private playAnimOnce(expr: Expression, ms: number) {
    this.animOverride = { expr, until: Date.now() + ms };
    this.syncDom();
    setTimeout(() => { if (this.animOverride?.expr === expr) this.syncDom(); }, ms + 50);
  }
  onScreenChanged() { this.playAnimOnce("gliding", 1000); }
  onPetIdle() { this.playAnimOnce("sitting", 2000); }
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






