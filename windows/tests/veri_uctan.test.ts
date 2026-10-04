// Uçtan uca veri doğrulaması (YALNIZ TEST): gerçek ../AfuNobet/afu/ui_state.py çıktısı
// (tests/fixtures/state_uctan.json) → state.ts ayrıştırıcısı → görünüm.
// Kaynak kod, gerçek state.json/state.db ve supervisor değiştirilmez.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { State, parseState, type Task } from "../src/core/state";
import { setLanguage } from "../src/core/labels";
import { handoffText, modelText, stageSteps, type RichTask } from "../src/views/model";

// ---------------- sahte DOM (arayuz.test.ts ile aynı sözleşme) ----------------
let doc: { activeElement: FakeEl | null };
class FakeEl {
  children: FakeEl[] = []; parent: FakeEl | null = null; attrs = new Map<string, string>();
  dataset: Record<string, string> = {}; className = ""; hidden = false; disabled = false; value = ""; title = ""; selected = false;
  private own = ""; listeners = new Map<string, ((e: any) => void)[]>();
  classList = { toggle: () => undefined };
  constructor(public tagName: string) {}
  get textContent(): string { return this.own + this.children.map(c => c.textContent).join(""); }
  set textContent(v: string) { this.own = v; this.children = []; }
  get lastChild() { return this.children[this.children.length - 1] ?? null; }
  setAttribute(k: string, v: string) { this.attrs.set(k, v); if (k === "title") this.title = v; if (k === "hidden") this.hidden = true; if (k === "disabled") this.disabled = true; }
  getAttribute(k: string) { return this.attrs.get(k) ?? null; }
  append(...c: (FakeEl | string)[]) { for (const n of c) { const el = typeof n === "string" ? text(n) : n; el.parent = this; this.children.push(el); } }
  prepend(...c: FakeEl[]) { for (const n of c) n.parent = this; this.children.unshift(...c); }
  replaceChildren(...c: (FakeEl | string)[]) { this.children = []; this.own = ""; this.append(...c); }
  addEventListener(n: string, f: (e: any) => void) { this.listeners.set(n, [...(this.listeners.get(n) ?? []), f]); }
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
  querySelectorAll() { return this.all(); }
  find(cls: string) { return this.all().find(e => e.className.split(" ").includes(cls)); }
  findAll(cls: string) { return this.all().filter(e => e.className.split(" ").includes(cls)); }
  animate() {}
}
const text = (t: string) => { const e = new FakeEl("#text"); e.textContent = t; return e; };
const fakeDom = () => { doc = { activeElement: null }; vi.stubGlobal("document", Object.assign(doc, { createElement: (t: string) => new FakeEl(t), createTextNode: text, addEventListener: vi.fn() })); };

// ---------------- gerçek üretici çıktısı (fixture) ----------------
const FIXTURE = JSON.parse(readFileSync(new URL("./fixtures/state_uctan.json", import.meta.url), "utf8")) as { version: number; tasks: Record<string, unknown>[] };
/** Fixture donduruludur; canlilik penceresi (isCurrent) test aninda tazelenir. */
function fresh() {
  const now = new Date().toISOString();
  return { ...FIXTURE, tasks: FIXTURE.tasks.map(t => ({ ...t, started: now, started_at: now, updated_at: now })) };
}
const parseFixture = () => parseState(fresh());
/** Fixture sırası: 1 = çalışan+devirli, 2 = Claude hedefli devir, 3 = kuyrukta (BEKLIYOR), 4 = bilinmeyen durum. */
const at = (index: number) => parseFixture().tasks.find(t => t.id === FIXTURE.tasks[index].id) as RichTask;
const task1 = () => at(0);
const task2 = () => at(1);
const task3 = () => at(2);
const task4 = () => at(3);

function setTasks(rows: Record<string, unknown>[]) {
  const snap = parseState({ version: 1, tasks: rows, mesaj: "" });
  State.snapshot = { ...snap, tasks: snap.tasks } as Task[];
  State.focusId = null;
}
async function views() {
  fakeDom();
  const { AfuViews } = await import("../src/views/views");
  const v = new AfuViews({ collapse: () => undefined, quota: () => undefined } as never);
  return { v, el: (x: unknown) => x as unknown as FakeEl };
}
beforeEach(() => setLanguage("tr"));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); State.snapshot = { connected: false, tasks: [], sourceUnavailable: true }; State.focusId = null; });

describe("fixture: gerçek ui_state.py çıktısı", () => {
  it("sürüm 1 ve dört görev gelir", () => {
    expect(FIXTURE.version).toBe(1);
    expect(FIXTURE.tasks).toHaveLength(4);
  });
  it("çalışan görev model, aşama, effort, devir, bağlam ve maliyeti taşır", () => {
    const t = task1();
    expect([t.agent, t.status, t.model, t.stage, t.effort]).toEqual(["codex", "Calisiyor", "gpt-x", "run", "high"]);
    expect(t.handoff).toEqual({ from: "codex", to: "gemini", reason: "kota doldu" });
    expect(t.context).toMatchObject({ used: 25000, total: 200000 });
    expect(t.cost).toBeCloseTo(0.42, 5);
  });
  it("Claude hedefli devir üreticide elendi: kayıtta handoff yok", () => {
    expect(task2().handoff ?? null).toBeNull();
  });
  it("gerçek BEKLIYOR durumu TRIAGE aşamasına bağlanır", () => {
    const t = task3();
    expect([t.agent, t.status, t.stage]).toEqual(["gemini", "Bekliyor", "triage"]);
    expect(stageSteps(t)!.map(s => s.state)).toEqual(["current", "todo", "todo", "todo", "todo"]);
  });
  it("bilinmeyen durumda alan uydurulmaz", () => {
    const t = task4();
    expect(t.status).toBe("Hazirlaniyor");
    expect([t.stage ?? null, t.effort ?? null, t.handoff ?? null, t.context ?? null, t.cost ?? null, t.model ?? null]).toEqual([null, null, null, null, null, null]);
    expect(stageSteps(t)).toBeNull();
  });
});

describe("state.ts ayrıştırıcısı → görünüm (uçtan uca)", () => {
  it("F1 aşama çubuğu görünür ve aktif adım Çalışma", () => {
    const steps = stageSteps(task1())!;
    expect(steps.map(s => s.label)).toEqual(["Ayırma", "Bölme", "Çalışma", "Doğrulama", "Birleştirme"]);
    expect(steps.map(s => s.state)).toEqual(["done", "done", "current", "todo", "todo"]);
  });
  it("F3 model ve effort gri yazı olarak görünür", () => {
    expect(modelText(task1())).toBe("gpt-x · derin");
  });
  it("F2 devir satırı Codex … → Gemini …", () => {
    expect(handoffText(task1())).toBe("Codex kotası doldu → Gemini devraldı");
  });
  it("kartta aşama çubuğu, gri model yazısı ve devir satırı çizilir", async () => {
    setTasks(fresh().tasks);
    const { v, el } = await views();
    v.sync("overview", true);
    const bar = el(v.card).find("stage-bar")!;
    expect(bar).toBeDefined();
    expect(bar.children.map(c => c.textContent)).toEqual(["Ayırma", "Bölme", "Çalışma", "Doğrulama", "Birleştirme"]);
    expect(bar.children[2].getAttribute("aria-current")).toBe("step");
    expect(el(v.card).find("f3-model-info")?.textContent).toContain("gpt-x · derin");
    expect(el(v.card).find("task-handoff")?.textContent).toBe("Codex kotası doldu → Gemini devraldı");
  });
  it("ayrıntıda bağlam çubuğu ve maliyet ölçülen değerle görünür", async () => {
    setTasks(fresh().tasks);
    const { v, el } = await views();
    v.sync("overview", true);
    v.openDetail();
    const modal = el(v.modal.el);
    expect(modal.find("detail-handoff")?.textContent).toBe("Codex kotası doldu → Gemini devraldı");
    expect(modal.find("detail-context")?.textContent).toBe("Bağlam: %13 dolu");
    expect(modal.find("detail-cost")?.textContent).toBe("Maliyet: $0.42");
    const track = modal.find("f4-context-track")!;
    expect(track).toBeDefined();
    expect(track.getAttribute("aria-valuenow")).toBe("12.5");
  });
});

describe("Claude hedefli devir gösterilmez", () => {
  it("üreticinin elediği kayıt arayüzde de devir satırı göstermez", async () => {
    const claudeRow = FIXTURE.tasks[1].job_id;
    setTasks(fresh().tasks.filter(t => t.job_id === claudeRow));
    const { v, el } = await views();
    v.sync("overview", true);
    expect(handoffText(task2())).toBeNull();
    expect(el(v.card).find("task-handoff")).toBeUndefined();
  });
  it("Claude hedefli devir doğrudan state'e gelse de gizlenir", () => {
    const now = new Date().toISOString();
    const snap = parseState({ version: 1, tasks: [{ id: "x", agent: "codex", status: "Calisiyor", task: "Gorev", updated_at: now,
      handoff: { from: "codex", to: "claude", reason: "kota doldu" } }] });
    expect((snap.tasks[0] as RichTask).handoff ?? null).toBeNull();
    expect(handoffText(snap.tasks[0] as RichTask)).toBeNull();
  });
  it("Claude kaynaklı devir de gizlenir", () => {
    const now = new Date().toISOString();
    const snap = parseState({ version: 1, tasks: [{ id: "y", agent: "gemini", status: "Calisiyor", task: "Gorev", updated_at: now,
      handoff: { from: "claude", to: "gemini", reason: "kota doldu" } }] });
    expect(handoffText(snap.tasks[0] as RichTask)).toBeNull();
  });
});
