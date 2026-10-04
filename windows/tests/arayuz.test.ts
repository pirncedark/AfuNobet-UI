// OPUS-ARAYUZ (2 Eki): E2, E3, F1–F14 için birim + sahte DOM testleri.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseState, State, type Task } from "../src/core/state";
import { UI_EN, UI_TR, language, setLanguage, ui } from "../src/core/labels";
import { agentPills, clipText, contextText, costText, emptyState, filterTasks, filterVisible, handoffText, modelText, stageSteps, subagentRows, topLevel, type RichTask } from "../src/views/model";

// ---------------- sahte DOM ----------------
const FOCUSABLE_TAGS = new Set(["button", "input", "select", "textarea", "a"]);
let doc: { activeElement: FakeEl | null };
class FakeEl {
  children: FakeEl[] = []; parent: FakeEl | null = null; attrs = new Map<string, string>();
  dataset: Record<string, string> = {}; className = ""; hidden = false; disabled = false; value = ""; title = ""; selected = false;
  private own = ""; listeners = new Map<string, ((e: any) => void)[]>();
  classList = { toggle: (c: string, on?: boolean) => { const has = this.className.split(" ").includes(c); const want = on ?? !has; this.className = want ? (has ? this.className : `${this.className} ${c}`.trim()) : this.className.split(" ").filter(x => x !== c).join(" "); } };
  constructor(public tagName: string) {}
  get textContent(): string { return this.own + this.children.map(c => c.textContent).join(""); }
  set textContent(v: string) { this.own = v; this.children = []; }
  get lastChild() { return this.children[this.children.length - 1] ?? null; }
  setAttribute(k: string, v: string) { this.attrs.set(k, v); if (k === "title") this.title = v; if (k === "hidden") this.hidden = true; if (k === "disabled") this.disabled = true; }
  getAttribute(k: string) { return this.attrs.get(k) ?? null; }
  append(...c: (FakeEl | string)[]) { for (const n of c) { const el = typeof n === "string" ? text(n) : n; el.parent = this; this.children.push(el); } }
  prepend(...c: FakeEl[]) { for (const n of c) n.parent = this; this.children.unshift(...c); }
  replaceChildren(...c: (FakeEl | string)[]) { this.children = []; this.own = ""; this.append(...c); }
  addEventListener(n: string, f: (e: any) => void) { this.listeners.set(n, [...this.listeners.get(n) ?? [], f]); }
  /** Olay hedeften köke kabarır; stopPropagation durdurur. */
  dispatch(n: string, e: Record<string, unknown> = {}) {
    let stopped = false;
    const ev = { target: this, preventDefault: vi.fn(), stopPropagation: () => { stopped = true; }, ...e };
    for (let el: FakeEl | null = this; el && !stopped; el = el.parent) for (const f of el.listeners.get(n) ?? []) f(ev);
    return { ev, stopped };
  }
  click() { this.dispatch("click"); }
  focus() { doc.activeElement = this; }
  closest(sel: string): FakeEl | null { for (let el: FakeEl | null = this; el; el = el.parent) if (el.tagName === sel) return el; return null; }
  all(): FakeEl[] { return this.children.flatMap(c => [c, ...c.all()]); }
  querySelectorAll() { return this.all().filter(e => FOCUSABLE_TAGS.has(e.tagName) && !e.disabled); }
  find(cls: string) { return this.all().find(e => e.className.split(" ").includes(cls)); }
  findAll(cls: string) { return this.all().filter(e => e.className.split(" ").includes(cls)); }
  animate() {}
}
const text = (t: string) => { const e = new FakeEl("#text"); e.textContent = t; return e; };
function fakeDom() {
  doc = { activeElement: null };
  vi.stubGlobal("document", Object.assign(doc, { createElement: (t: string) => new FakeEl(t), createTextNode: text, addEventListener: vi.fn() }));
}
const now = () => new Date().toISOString();
const raw = (c: Record<string, unknown> = {}) => ({ id: "t1", agent: "codex", status: "Calisiyor", task: "Ekranı düzenle", title: "Ekranı düzenle", updated_at: now(), quota: {}, ...c });
function setTasks(rows: Record<string, unknown>[], extra: Record<string, Partial<RichTask>> = {}, quotas?: Record<string, unknown>) {
  const snap = parseState({ version: 1, tasks: rows, mesaj: "", ...(quotas ? { quotas } : {}) });
  State.snapshot = { ...snap, tasks: snap.tasks.map(t => ({ ...t, ...(extra[t.id] ?? {}) })) as Task[] };
  State.focusId = null;
}
async function views(actions: Record<string, unknown> = {}) {
  fakeDom();
  const { AfuViews } = await import("../src/views/views");
  const calls: string[] = [];
  const v = new AfuViews({ collapse: () => calls.push("collapse"), quota: () => calls.push("quota"), apps: () => calls.push("apps"), orkestra: () => calls.push("orkestra"), chat: () => calls.push("chat"), pet: () => calls.push("pet"), sor: () => calls.push("sor"), ...actions } as never);
  return { v, calls, el: (x: unknown) => x as unknown as FakeEl };
}
beforeEach(() => { setLanguage("tr"); State.settings.pet = true; });
describe("M3 keşif", () => {
  it("tek görevde arama, ana kartta aşama ve bağlam, kilitte açıklama", async () => {
    setTasks([raw({ stage: "RUN", model: "gpt-6.1", effort: "medium", context: { used: 25, total: 100 } })]);
    const { v, el } = await views(); v.sync("overview", true);
    expect(v.searchButton.hidden).toBe(false);
    expect(el(v.card).find("task-insight")?.textContent).toContain("Çalışıyor");
    expect(el(v.card).find("task-insight")?.textContent).toContain("25 / 100");
    expect(el(v.header).find("claude-lock")?.getAttribute("title")).toContain("otomatik iş verilmez");
  });
  it("dar pencere ölçeği pencerenin dışına çıkmaz", async () => {
    const { fitScale, PANEL_W } = await import("../src/core/layout");
    expect(fitScale(360, 480) * PANEL_W).toBeLessThanOrEqual(360);
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); setTasks([]); });

// ---------------- E2 ----------------
describe("E2 ajan pill'leri", () => {
  it("dört durum: aktif / idle / kota / kapalı", () => {
    setTasks([raw({ id: "a", agent: "codex", status: "Calisiyor" }), raw({ id: "b", agent: "gemini", status: "Tamamlandi" })], {}, { opencode: { remaining_percent: 0 } });
    const rows = Object.fromEntries(agentPills(State.snapshot).map(r => [r.id, r.state]));
    expect(rows).toMatchObject({ codex: "aktif", gemini: "idle", opencode: "kota", orkestra: "aktif" });
    setTasks([]);
    const empty = Object.fromEntries(agentPills(State.snapshot).map(r => [r.id, r.state]));
    expect(empty).toMatchObject({ codex: "kapali", gemini: "kapali", opencode: "kapali", orkestra: "idle" });
  });
  it("kota duraklatması pill'i kota yapar; Claude ve GLM veri yoksa hiç görünmez", () => {
    setTasks([raw({ id: "a", agent: "gemini", status: "Hata", mesaj: "usage limit" })]);
    const pills = agentPills(State.snapshot);
    expect(pills.find(p => p.id === "gemini")?.state).toBe("kota");
    expect(pills.map(p => p.id)).toEqual(["codex", "gemini", "opencode", "orkestra"]);
    expect(pills.find(p => p.id === "gemini")?.title).toBe("Gemini: kota doldu");
  });
  it("görünümde pill'ler data-state taşır, boştaki tıklanınca tek cümle bildirim", async () => {
    setTasks([raw({ id: "a", agent: "codex" })]);
    const { v, el } = await views();
    v.sync("overview", true);
    const pills = el(v.pills).children;
    expect(pills.map(p => p.dataset.state)).toEqual(["aktif", "kapali", "kapali", "aktif"]);
    pills[1].click();
    expect(el(v.bildirim).textContent).toBe("Gemini şu an boşta. Görev verilince burada görünür.");
  });
  it("Orkestra pill'i Orkestra görünümünü açar", async () => {
    setTasks([]);
    const { v, el, calls } = await views();
    v.sync("overview", true);
    el(v.pills).children.find(p => p.dataset.agent === "orkestra")!.click();
    expect(calls).toEqual(["orkestra"]);
  });
});

// ---------------- F1 / F2 / F3 / F4 / F5 ----------------
describe("F1 aşama çubuğu", () => {
  it("alan yoksa gizli, varsa beş adım ve doğru durum", () => {
    expect(stageSteps({ stage: undefined } as RichTask)).toBeNull();
    expect(stageSteps({ stage: "bilinmeyen" } as RichTask)).toBeNull();
    const steps = stageSteps({ stage: "VERIFY", status: "Calisiyor" } as RichTask)!;
    expect(steps.map(s => s.id)).toEqual(["triage", "split", "run", "verify", "merge"]);
    expect(steps.map(s => s.state)).toEqual(["done", "done", "done", "current", "todo"]);
    expect(stageSteps({ stage: "doğrulama" } as RichTask)![3].state).toBe("current");
    expect(stageSteps({ stage: "merge", status: "Tamamlandi" } as RichTask)!.every(s => s.state === "done")).toBe(true);
  });
  it("kartta yalnız aşama alanı varken çizilir", async () => {
    setTasks([raw({ id: "a" })]);
    const { v, el } = await views();
    v.sync("overview", true);
    expect(el(v.card).find("stage-bar")).toBeUndefined();
    setTasks([raw({ id: "a" })], { a: { stage: "run" } });
    v.sync("overview", true);
    const bar = el(v.card).find("stage-bar")!;
    expect(bar.children.map(c => c.textContent)).toEqual(["Ayırma", "Bölme", "Çalışma", "Doğrulama", "Birleştirme"]);
    expect(bar.children[2].getAttribute("aria-current")).toBe("step");
  });
});
describe("F2 ajan devri", () => {
  it("kota → devraldı, hedef yok → bekliyor", () => {
    expect(handoffText({ handoff: { from: "codex", to: "gemini", reason: "quota" } } as RichTask)).toBe("Codex kotası doldu → Gemini devraldı");
    expect(handoffText({ handoff: { from: "gemini", to: null, reason: "error" } } as RichTask)).toBe("Gemini hata verdi → bekliyor");
    expect(handoffText({} as RichTask)).toBeNull();
  });
  it("Claude yalnız KORUNUYOR rozeti olarak kalır", () => {
    expect(handoffText({ handoff: { from: "codex", to: "claude", reason: "kota" } } as RichTask)).toBeNull();
    expect(handoffText({ handoff: { from: "codex", to: "claude", reason: "kota", manual: true } } as RichTask)).toBeNull();
  });
  it("kartta devir satırı görünür", async () => {
    setTasks([raw({ id: "a", agent: "gemini" })], { a: { handoff: { from: "codex", to: "gemini", reason: "kota" } } });
    const { v, el } = await views();
    v.sync("overview", true);
    expect(el(v.card).find("task-handoff")?.textContent).toBe("Codex kotası doldu → Gemini devraldı");
  });
});
describe("F3 model / F4 context / F5 maliyet", () => {
  it("model okunamazsa gizli", () => {
    expect(modelText({ model: null } as RichTask)).toBe("");
    expect(modelText({ model: "gpt-6.1-sol", effort: "high" } as RichTask)).toBe("gpt-6.1-sol · derin");
    expect(modelText({ model: "gemini-3.1-pro", effort: "tuhaf" } as RichTask)).toBe("gemini-3.1-pro");
  });
  it("context ve maliyet: geçersiz veri gizli, uydurma sayı yok", () => {
    expect(contextText({} as RichTask)).toBeNull();
    expect(contextText({ context: { used: 900, total: 100 } } as RichTask)).toBeNull();
    expect(contextText({ context: { used: NaN, total: 100 } } as RichTask)).toBeNull();
    expect(contextText({ context: { used: 62000, total: 200000, cached: 20000, saved: 1500 } } as RichTask)).toBe("Bağlam: %31 dolu · önbellek %10 · 1.5B tasarruf");
    expect(costText({ cost: -1 } as RichTask)).toBeNull();
    expect(costText({} as RichTask)).toBeNull();
    expect(costText({ cost: 0.4249 } as RichTask)).toBe("Maliyet: $0.42");
  });
  it("ana ekranda yok, yalnız ayrıntıda; kart eyebrow'unda model ya da ?", async () => {
    setTasks([raw({ id: "a" })], { a: { context: { used: 50, total: 100 }, cost: 1.5 } });
    const { v, el } = await views();
    v.sync("overview", true);
    expect(el(v.card).textContent).toContain("Bağlam: 50 / 100");
    expect(el(v.card).textContent).not.toContain("Maliyet");
    expect(el(v.card).find("task-eyebrow")!.textContent).toMatch(/^CDX · /);
    v.openDetail();
    const body = el(v.modal.body);
    expect(body.find("detail-context")!.textContent).toBe("Bağlam: %50 dolu");
    expect(body.find("detail-cost")!.textContent).toBe("Maliyet: $1.50");
    v.modal.close();
    setTasks([raw({ id: "a", model: "gpt-6.1-sol" })]);
    v.sync("overview", true); v.openDetail();
    expect(el(v.modal.body).find("detail-context")).toBeUndefined();
    expect(el(v.modal.body).find("detail-cost")).toBeUndefined();
    expect(el(v.modal.body).find("detail-model")!.textContent).toBe("Model: gpt-6.1-sol");
  });
});

// ---------------- E3 ----------------
describe("E3 alt ajan satırları", () => {
  it("parentId ve subagents listesinden satır üretir; çocuk ana listede ayrı görünmez", () => {
    const parent = { id: "p", title: "Ana", status: "Calisiyor", subagents: [{ name: "Test koşucu", status: "running" }, { name: "", status: "x" }] } as unknown as RichTask;
    const child = { id: "c", title: "Belge yazıcı", status: "Tamamlandi", parentId: "p" } as unknown as RichTask;
    const rows = subagentRows(parent, [parent, child]);
    expect(rows.map(r => [r.name, r.status])).toEqual([["Belge yazıcı", "bitti"], ["Test koşucu", "çalışıyor"]]);
    expect(topLevel([parent, child]).map(t => t.id)).toEqual(["p"]);
    expect(topLevel([child]).map(t => t.id)).toEqual(["c"]);
  });
  it("sahte akış: başlat/bitir satırları görünür, biten satır düşer", async () => {
    const rows = [raw({ id: "p", title: "Ana görev" }), raw({ id: "c1", agent: "gemini", title: "Alt iş A" }), raw({ id: "c2", agent: "opencode", title: "Alt iş B" })];
    setTasks(rows, { c1: { parentId: "p" }, c2: { parentId: "p" } });
    State.focusId = "p";
    const { v, el } = await views();
    v.sync("overview", true);
    const subs = el(v.others).findAll("sub-row").map(r => r.textContent);
    expect(subs).toEqual(["↳ Alt iş Açalışıyor", "↳ Alt iş Bçalışıyor"]);
    expect(el(v.others).findAll("task-row").filter(r => !r.className.includes("sub-row"))).toHaveLength(0);
    setTasks([rows[0], raw({ id: "c1", agent: "gemini", title: "Alt iş A", status: "Tamamlandi" }), rows[2]], { c1: { parentId: "p" }, c2: { parentId: "p" } });
    State.focusId = "p";
    v.sync("overview", true);
    expect(el(v.others).findAll("sub-row").map(r => r.textContent)).toEqual(["↳ Alt iş Bçalışıyor"]);
  });
});

// ---------------- F7 / F8 / F9 / F10 ----------------
describe("F7 arama ve filtre", () => {
  const many = Array.from({ length: 12 }, (_, i) => raw({ id: `t${i}`, agent: i % 2 ? "gemini" : "codex", status: i % 3 ? "Calisiyor" : "Hata", title: i === 5 ? "Şifreli İçerik Düzeltme" : `Görev ${i}` }));
  it("en az bir görevde arama görünür", async () => {
    expect(filterVisible([])).toBe(false);
    expect(filterVisible(parseState({ version: 1, tasks: many.slice(0, 9) }).tasks)).toBe(true);
    expect(filterVisible(parseState({ version: 1, tasks: many }).tasks)).toBe(true);
    setTasks(many.slice(0, 9));
    const { v } = await views();
    v.sync("overview", true);
    expect(v.searchButton.hidden).toBe(false);
    setTasks(many); v.sync("overview", true);
    expect(v.searchButton.hidden).toBe(false);
  });
  it("ad (Türkçe harf duyarsız), ajan ve durum filtresi", () => {
    const tasks = parseState({ version: 1, tasks: many }).tasks;
    expect(filterTasks(tasks, { query: "sifreli icerik", agent: "hepsi", status: "hepsi" }).map(t => t.id)).toEqual(["t5"]);
    expect(filterTasks(tasks, { query: "", agent: "gemini", status: "hepsi" })).toHaveLength(6);
    expect(filterTasks(tasks, { query: "", agent: "codex", status: "hata" }).map(t => t.id)).toEqual(["t0", "t6"]);
  });
  it("arama penceresi sonuçları süzer ve seçilen göreve odaklar", async () => {
    setTasks(many);
    const { v, el } = await views();
    v.sync("overview", true);
    v.openSearch();
    const input = el(v.modal.body).find("search-input")!;
    expect(doc.activeElement).toBe(el(v.modal.body).find("search-row"));
    input.value = "görev 1"; input.dispatch("input");
    const results = el(v.modal.body).findAll("search-row");
    expect(results.map(r => r.title)).toEqual(["Görev 1", "Görev 10", "Görev 11"]);
    results[1].click();
    expect(State.focusId).toBe("t10");
    expect(v.modal.isOpen).toBe(false);
  });
});
describe("F8 uzun metin", () => {
  it("kırpar, tam metni title olarak tutar, emoji bölünmez", () => {
    const long = "Çok uzun bir görev adı ".repeat(10);
    const r = clipText(long, 30);
    expect(Array.from(r.text).length).toBeLessThanOrEqual(30);
    expect(r.text.endsWith("…")).toBe(true);
    expect(r.title).toBe(long.trim());
    expect(clipText("😀".repeat(40), 10).text).toBe("😀".repeat(9) + "…");
    expect(clipText("kısa", 30)).toEqual({ text: "kısa", title: "kısa" });
  });
  it("kart başlığı ve satırlar kırpılır, tooltip tam metin", async () => {
    const long = "Uzun başlık ".repeat(20).trim();
    setTasks([raw({ id: "a", title: long }), raw({ id: "b", agent: "gemini", title: long + " B" })]);
    State.focusId = "a";
    const { v, el } = await views();
    v.sync("overview", true);
    const h1 = el(v.card).all().find(e => e.tagName === "h1")!;
    expect(h1.textContent.length).toBeLessThan(long.length);
    expect(h1.title).toBe(long.slice(0, 120).trim());
    const row = el(v.others).find("task-row")!;
    expect(row.title.startsWith("Uzun başlık")).toBe(true);
  });
});
describe("F9 boş durum", () => {
  it("görev yokken 'Afu hazır' + ne yapılacağını söyleyen tek cümle", async () => {
    setTasks([]);
    expect(emptyState(State.snapshot)).toEqual({ title: "Afu hazır", message: "Şu an görev yok. Bir şey sormak için Afu'ya sor'a bas.", retry: false });
    const { v, el } = await views();
    v.sync("overview", true);
    expect(el(v.card).textContent).toBe("Afu hazırŞu an görev yok. Bir şey sormak için Afu'ya sor'a bas.");
    expect(v.card.getAttribute("aria-disabled")).toBe("true");
    expect(v.waiting.hidden).toBe(true);
  });
});
describe("F10 Tekrar dene", () => {
  it("bağlantı yokken görünür; başarılı yeniden okuma durumu günceller", async () => {
    State.snapshot = { connected: false, tasks: [], sourceUnavailable: true };
    const retry = vi.fn(async () => { State.apply({ version: 1, tasks: [raw({ id: "x" })], mesaj: "" }); });
    const { v, el } = await views({ retry });
    v.sync("overview", true);
    expect(v.waiting.hidden).toBe(false);
    const p = v.retry();
    expect(v.retryButton.disabled).toBe(true);
    expect(v.retryButton.textContent).toBe("Deneniyor…");
    await p;
    expect(retry).toHaveBeenCalledOnce();
    expect(State.snapshot.sourceUnavailable).toBe(false);
    expect(v.retryButton.disabled).toBe(false);
    expect(el(v.bildirim).textContent).toBe("Bağlantı kuruldu.");
  });
  it("yeniden okuma başarısızsa tek cümle, düğme tekrar kullanılabilir", async () => {
    State.snapshot = { connected: false, tasks: [], sourceUnavailable: true };
    const { v, el } = await views({ retry: vi.fn(async () => { throw new Error("x"); }) });
    await v.retry();
    expect(el(v.bildirim).textContent).toBe("Hâlâ bağlanamadı. Biraz sonra yine dene.");
    expect(v.retryButton.disabled).toBe(false);
  });
  it("eylem verilmezse köprü yeniden okumasını kullanır (uygulama dışında sessizce başarısız)", async () => {
    State.snapshot = { connected: false, tasks: [], sourceUnavailable: true };
    const { v, el } = await views();
    await v.retry();
    expect(el(v.bildirim).textContent).toBe("Hâlâ bağlanamadı. Biraz sonra yine dene.");
  });
});

// ---------------- F11 / F12 ----------------
describe("F11 modal", () => {
  it("X, Esc ve arka plan kapatır; diyalog içi tık kapatmaz; odak geri döner", async () => {
    setTasks([raw({ id: "a" })]);
    const { v, el } = await views();
    v.sync("overview", true);
    const opener = el(v.card); opener.focus();
    v.openDetail();
    expect(v.modal.isOpen).toBe(true);
    expect(el(v.modal.el).hidden).toBe(false);
    expect(doc.activeElement).toBe(el(v.modal.closeButton));
    el(v.modal.dialog).dispatch("pointerdown");
    expect(v.modal.isOpen).toBe(true);
    el(v.modal.el).dispatch("pointerdown");
    expect(v.modal.isOpen).toBe(false);
    expect(doc.activeElement).toBe(opener);
    v.openDetail(); el(v.modal.closeButton).click();
    expect(v.modal.isOpen).toBe(false);
    v.openDetail();
    const { stopped } = el(v.modal.closeButton).dispatch("keydown", { key: "Escape" });
    expect(v.modal.isOpen).toBe(false);
    expect(stopped).toBe(true); // ada Esc ile küçülmez, yalnız modal kapanır
  });
  it("Tab odakları diyalog içinde döndürür", async () => {
    setTasks(Array.from({ length: 10 }, (_, i) => raw({ id: `t${i}` })));
    const { v, el } = await views();
    v.sync("overview", true);
    v.openSearch();
    const items = el(v.modal.body).querySelectorAll();
    const last = el(v.modal.closeButton);
    last.focus();
    last.dispatch("keydown", { key: "Tab" });
    expect(doc.activeElement).toBe(items[0]);
    items[0].dispatch("keydown", { key: "Tab", shiftKey: true });
    expect(doc.activeElement).toBe(last);
  });
  it("Orkestra hatası alert() ile pencereyi kilitlemez", async () => {
    const src = await import("node:fs").then(fs => fs.readFileSync("src/views/views.ts", "utf8"));
    expect(src).not.toMatch(/\balert\(/);
  });
});
describe("F12 klavye", () => {
  it("kart Enter/Boşluk ile ayrıntıyı açar; içteki düğmede açmaz", async () => {
    setTasks([raw({ id: "a" })]);
    const { v, el } = await views();
    v.sync("overview", true);
    expect(v.card.getAttribute("tabindex")).toBe("0");
    el(v.card).dispatch("keydown", { key: "Enter" });
    expect(v.modal.isOpen).toBe(true);
    v.modal.close();
    el(v.card).dispatch("keydown", { key: " " });
    expect(v.modal.isOpen).toBe(true);
    v.modal.close();
    const inner = new FakeEl("button"); el(v.card).append(inner);
    inner.dispatch("keydown", { key: "Enter" }); inner.click();
    expect(v.modal.isOpen).toBe(false);
  });
  it("Daha fazla menüsü: aç → ok tuşları → Esc kapatır ve odak düğmeye döner", async () => {
    setTasks([]);
    const { v, el, calls } = await views();
    v.sync("overview", true);
    el(v.moreButton).click();
    expect(v.menuOpen).toBe(true);
    expect(v.moreButton.getAttribute("aria-expanded")).toBe("true");
    expect(doc.activeElement).toBe(el(v.petButton));
    el(v.petButton).dispatch("keydown", { key: "ArrowDown" });
    // Q2: menüde ikinci düğme görünür kapatma yolu (✕).
    expect(doc.activeElement).toBe(el(v.menuClose));
    el(v.menuClose).dispatch("keydown", { key: "ArrowUp" });
    expect(doc.activeElement).toBe(el(v.petButton));
    const { stopped } = el(v.petButton).dispatch("keydown", { key: "Escape" });
    expect(stopped).toBe(true);
    expect(v.menuOpen).toBe(false);
    expect(doc.activeElement).toBe(el(v.moreButton));
    el(v.moreButton).click(); el(v.petButton).click();
    expect(calls).toEqual(["pet"]);
    expect(v.menuOpen).toBe(false);
  });
  it("alt görünümde Görevlere dön o görünümün eylemiyle geri döner", async () => {
    setTasks([]);
    const { v, calls } = await views();
    v.sync("quota", true);
    expect(v.backButton.hidden).toBe(false);
    (v.backButton as unknown as FakeEl).click();
    v.sync("orkestra", true); (v.backButton as unknown as FakeEl).click();
    expect(calls).toEqual(["quota", "orkestra"]);
    v.sync("overview", true);
    expect(v.backButton.hidden).toBe(true);
    v.sync("sor", true);
    expect(v.backButton.hidden).toBe(true); // Afu'ya sor düğmesi "Geri" olur
    expect(v.sorButton.textContent).toBe("Geri");
  });
  it("kart kapanınca açık menü ve modal kapanır", async () => {
    setTasks([raw({ id: "a" })]);
    const { v } = await views();
    v.sync("overview", true); v.openMenu(); v.openDetail();
    v.sync("overview", false);
    expect(v.menuOpen).toBe(false); expect(v.modal.isOpen).toBe(false);
  });
});

// ---------------- alt düğme satırı / F13 / F14 ----------------
describe("Alt düğme satırı (kırpılma hatası)", () => {
  it("tüm sayfalara menü açmadan tek tıkla geçer", async () => {
    setTasks([]);
    const { v, el, calls } = await views();
    v.sync("overview", true);
    for (const button of [v.quotaButton, v.appsButton, v.orkestraButton, v.chatButton, v.sorButton]) {
      expect(button.hidden).toBe(false); el(button).click();
      expect(v.menuOpen).toBe(false);
    }
    expect(calls).toEqual(["quota", "apps", "orkestra", "chat", "sor"]);
  });
  it("sayfa düğmeleri görünür, yalnız mini pet ayarı menüde", async () => {
    setTasks([]);
    const { v, el } = await views();
    v.sync("overview", true);
    const footer = el(v.footer).children.filter(c => c.tagName === "button");
    expect(footer).toEqual([el(v.backButton), el(v.quotaButton), el(v.appsButton), el(v.orkestraButton), el(v.chatButton), el(v.moreButton), el(v.primary), el(v.sorButton)]);
    // Q2: menüde "Daha fazla" ayarı + görünen kapatma düğmesi (✕) vardır.
    expect(el(v.menu).textContent).toContain("Ayarlar");
    expect(el(v.menu).textContent).toContain("Animasyon stüdyosunu aç");
    expect(v.sorButton.className).toContain("primary-button");
    expect(v.sorButton.textContent).toBe("Afu'ya sor");
    for (const b of [v.quotaButton, v.appsButton, v.orkestraButton, v.chatButton]) expect(b.getAttribute("role")).toBeNull();
    for (const b of [...footer, ...el(v.menu).children.filter(b => b.tagName === "button")]) expect(b.title || b.getAttribute("aria-label")).toBeTruthy();
  });
  it("aria-pressed hangi görünümün açık olduğunu söyler; mini pet anahtarı durumunu taşır", async () => {
    setTasks([]);
    const { v } = await views();
    v.sync("apps", true);
    expect(v.appsButton.getAttribute("aria-pressed")).toBe("true");
    expect(v.quotaButton.getAttribute("aria-pressed")).toBe("false");
    State.settings.pet = false; v.sync("overview", true);
    expect(v.petButton.textContent).toBe("Mini pet kapalı");
    expect(v.petButton.getAttribute("aria-checked")).toBe("false");
  });
});
describe("F13 TR/EN", () => {
  it("her metnin İngilizcesi var ve boş değil", () => {
    for (const k of Object.keys(UI_TR) as (keyof typeof UI_TR)[]) expect(UI_EN[k], k).toBeTruthy();
  });
  it("dil değişince alt satır ve boş durum İngilizce olur; varsayılan Türkçe", async () => {
    expect(language()).toBe("tr");
    setTasks([]);
    const { v, el } = await views();
    setLanguage("en");
    v.sync("overview", true);
    expect(v.sorButton.textContent).toBe("Ask Afu");
    expect(v.primary.textContent).toBe("Collapse");
    expect(el(v.moreButton).textContent).toContain("More");
    expect(el(v.card).textContent).toContain("Afu is ready");
    setLanguage("tr"); v.sync("overview", true);
    expect(v.sorButton.textContent).toBe("Afu'ya sor");
    expect(ui("ask")).toBe("Afu'ya sor");
  });
  it("alt satır etiketleri her iki dilde kısa (kırpılma bütçesi)", () => {
    for (const d of [UI_TR, UI_EN]) for (const k of ["ask", "askBack", "more", "collapse", "done", "back"] as const) expect(d[k].length, `${k}=${d[k]}`).toBeLessThanOrEqual(15);
  });
});
describe("F14 ölçek uyumu", () => {
  it("hit.ts: %150 ve metin %132'de isabet kutusu pencereyi tam kaplar (açık kartta alt satır dahil)", async () => {
    const { hitRect, hitScale, toWindow } = await import("../src/core/hit");
    const { fitScale, PANEL_W, PANEL_H } = await import("../src/core/layout");
    for (const [dpr, native] of [[1.5, 1.5], [1.98, 1.5], [1.32, 1]]) {
      const k = hitScale(dpr, native);
      const vw = PANEL_W / k, vh = PANEL_H / k;
      const r = toWindow(hitRect("expanded", { x: 0, y: 0, w: 1, h: 1 }, { w: vw, h: vh }), k);
      expect(r.w).toBeCloseTo(PANEL_W); expect(r.h).toBeCloseTo(PANEL_H);
      expect(fitScale(vw, vh)).toBeGreaterThanOrEqual(0.5);
    }
  });
});


describe("F1-F5 state → DOM", () => {
  it("real fields reach card and detail with an accessible context meter", async () => {
    setTasks([raw({ stage: "RUN", model: "gpt-6.1-sol", effort: "high", handoff: { from: "codex", to: "gemini", reason: "quota" }, context: { used: 25, total: 100 }, cost: 0 })]);
    const { v, el } = await views(); v.sync("overview", true);
    expect(el(v.card).find("stage-bar")?.children[2].getAttribute("aria-current")).toBe("step");
    expect(el(v.card).textContent).toContain("gpt-6.1-sol · derin");
    expect(el(v.card).find("task-handoff")?.textContent).toContain("Gemini devraldı");
    expect(el(v.card).find("f4-context-track")).toBeUndefined();
    v.openDetail();
    expect(el(v.modal.body).find("f4-context-track")?.getAttribute("aria-valuenow")).toBe("25");
    expect(el(v.modal.body).find("detail-cost")?.textContent).toBe("Maliyet: $0.00");
  });
  it.each([{}, { stage: 1, model: false, effort: {}, handoff: [], context: { used: -1, total: 100 }, cost: "4" }])("missing/corrupt fields are hidden: %j", async fields => {
    setTasks([raw(fields)]); const { v, el } = await views(); v.sync("overview", true); v.openDetail();
    for (const cls of ["detail-model", "detail-context", "detail-cost", "detail-handoff", "f4-context-track"]) expect(el(v.modal.body).find(cls)).toBeUndefined();
    expect(el(v.card).find("stage-bar")).toBeUndefined();
    expect(el(v.card).textContent).not.toContain("?");
  });
  it("status filters and archived completed selection work", async () => {
    setTasks([raw({ title: "Canlı iş" }), raw({ id: "old", title: "Eski biten iş", status: "Tamamlandi", updated_at: "2020-01-01T00:00:00Z" })]);
    const { v, el } = await views(); v.sync("overview", true); v.openSearch();
    const select = el(v.modal.body).findAll("search-select")[1];
    expect(select.children.map(c => c.textContent)).toEqual(["Tüm durumlar", "Çalışıyor", "Bekliyor", "Bitti", "Hata"]);
    select.value = "biten"; select.dispatch("change");
    const found = el(v.modal.body).findAll("search-row"); expect(found).toHaveLength(1); found[0].click();
    expect(el(v.modal.title).textContent).toBe("Eski biten iş"); expect(v.modal.isOpen).toBe(true);
  });
});
