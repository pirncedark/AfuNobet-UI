// GOREV_OC_TEST: Aktivasyon sonrası gelen davranışların regresyon testleri.
// Kapsam: sağlık şeridi, orkestra "Başlıyor…" kartı, konuşma balonu, Codex giriş satırı.
// src/ değiştirilmez; bu dosya yalnız mevcut davranışı ölçer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Bridge } from "../src/core/bridge";
import { State, type Snapshot, type Task } from "../src/core/state";
import { BalonModeli, balonMetni, balonOlustur, kisalt, temizMetin, type Mesaj } from "../src/message/message";
import { AfuViews } from "../src/views/views";
import { ChatView } from "../src/chat/chat";

// ---------------- sahte DOM ----------------
type El = FakeEl;
class FakeEl {
  children: FakeEl[] = []; parent: FakeEl | null = null;
  dataset: Record<string, string> = {}; className = ""; hidden = false; disabled = false;
  value = ""; title = ""; selected = false; isConnected = true;
  private own = ""; attrs = new Map<string, string>(); listeners = new Map<string, ((e: any) => void)[]>();
  classList = { toggle: (c: string, on?: boolean) => { const has = this.className.split(" ").includes(c); const want = on ?? !has; this.className = want ? `${this.className} ${c}`.trim() : this.className.split(" ").filter(x => x !== c).join(" "); } };
  constructor(public tagName: string) {}
  get textContent(): string { return this.own + this.children.map(c => c.textContent).join(""); }
  set textContent(v: string) { this.own = v; this.children = []; }
  get lastChild() { return this.children[this.children.length - 1] ?? null; }
  setAttribute(k: string, v: string) { this.attrs.set(k, v); if (k === "title") this.title = v; if (k === "hidden") this.hidden = true; if (k === "disabled") this.disabled = true; }
  getAttribute(k: string) { return this.attrs.get(k) ?? null; }
  append(...c: (FakeEl | string)[]) { for (const n of c) { const el = typeof n === "string" ? text(n) : n; el.parent = this; this.children.push(el); } }
  prepend(...c: FakeEl[]) { for (const n of c) n.parent = this; this.children.unshift(...c); }
  replaceChildren(...c: (FakeEl | string)[]) { this.children = []; this.own = ""; this.append(...c); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.isConnected = false; this.parent = null; }
  addEventListener(n: string, f: (e: any) => void) { this.listeners.set(n, [...this.listeners.get(n) ?? [], f]); }
  removeEventListener(n: string, f: (e: any) => void) { this.listeners.set(n, (this.listeners.get(n) ?? []).filter(x => x !== f)); }
  dispatch(n: string, e: Record<string, unknown> = {}) {
    let stopped = false;
    const ev = { target: this, preventDefault: vi.fn(), stopPropagation: () => { stopped = true; }, ...e };
    for (let el: FakeEl | null = this; el && !stopped; el = el.parent) for (const f of el.listeners.get(n) ?? []) f(ev);
    return stopped;
  }
  click() { this.dispatch("click"); }
  focus() {}
  setPointerCapture() {}
  closest(sel: string) { for (let el: FakeEl | null = this; el; el = el.parent) if (el.tagName === sel) return el; return null; }
  animate() {}
  /** `onclick = fn` gerçek bir tıklama dinleyicisi gibi davranır. */
  set onclick(fn: ((e: any) => void) | null) { if (fn) this.listeners.set("click", [fn]); else this.listeners.delete("click"); }
  get onclick() { return (this.listeners.get("click") ?? [])[0] ?? null; }
  all(): FakeEl[] { return this.children.flatMap(c => [c, ...c.all()]); }
  find(cls: string) { return this.all().find(e => e.className.split(" ").includes(cls)); }
}
const text = (t: string) => { const e = new FakeEl("#text"); e.textContent = t; return e; };
function fakeDom() {
  vi.stubGlobal("document", { activeElement: null, createElement: (t: string) => new FakeEl(t), createTextNode: text, addEventListener: vi.fn(), removeEventListener: vi.fn() });
}
/** views.ts ve state.ts `window` dinleyicisi/düğmecisi kullanır. */
class FakeWindow {
  private listeners = new Map<string, ((e: any) => void)[]>();
  addEventListener(n: string, f: (e: any) => void) { this.listeners.set(n, [...this.listeners.get(n) ?? [], f]); }
  removeEventListener(n: string, f: (e: any) => void) { this.listeners.set(n, (this.listeners.get(n) ?? []).filter(x => x !== f)); }
  // Gerçek CustomEvent'te type/detail prototype üzerindedir; açıkça okunur.
  dispatchEvent(e: { type: string; detail?: unknown }) {
    const ev = { type: e.type, detail: (e as { detail?: unknown }).detail, preventDefault() {}, stopPropagation() {} };
    for (const f of this.listeners.get(e.type) ?? []) f(ev);
    return true;
  }
}
const el = (x: unknown) => x as unknown as FakeEl;
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

function task(over: Partial<Task> = {}): Task {
  return { id: "t1", agent: "codex", title: "Kontrol", task: "Kontrol", status: "Calisiyor", model: null, currentAction: null,
    startedAt: Date.now(), updatedAt: Date.now(), repo: null, file: null, progress: null, quotaPaused: false,
    quota: { remaining_percent: null, reset_at: null, checked_at: null }, ...over };
}
function snapshot(over: Partial<Snapshot> = {}): Snapshot {
  return { connected: true, tasks: [], sourceUnavailable: false, ...over };
}
const calisanClaude = () => task({ id: "c1", agent: "claude", title: "Claude işi" });
function newViews() {
  const w = new FakeWindow(); vi.stubGlobal("window", w);
  return { w, v: new AfuViews({ collapse: () => {}, quota: () => {} } as never), el };
}
beforeEach(() => { fakeDom(); State.snapshot = snapshot(); State.focusId = null; State.pendingOrkestra = null; State.notificationsPaused = false; });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); State.pendingOrkestra = null; State.snapshot = snapshot(); State.focusId = null; });

// ---------------- 1) Sağlık şeridi ----------------
describe("sağlık şeridi", () => {
  const saglik = (ok: { afu?: boolean; codex?: boolean; ses?: boolean; claude?: boolean } = {}) => {
    State.snapshot = snapshot({ sourceUnavailable: ok.afu === false, tasks: ok.claude === false ? [] : [calisanClaude()] });
    vi.spyOn(Bridge, "codexStatus").mockImplementation(async () => {
      if (ok.codex === false) throw new Error("Codex bulunamadı.");
      return { status: "hazir", loggedIn: true, planType: null, rateLimits: null } as never;
    });
    vi.spyOn(Bridge, "bildirimAyarlari").mockResolvedValue({ muted: ok.ses === false });
    // M9: Claude rozeti köprünün KURULU olmasına bakar (son etkinliğe değil).
    vi.spyOn(Bridge, "claudeHookInstalled").mockResolvedValue(ok.claude !== false);
  };
  const serit = (v: AfuViews) => el(v.healthStrip).children.map(c => c.textContent);

  it("dört öğe çizer: AfuNöbet, GPT, Ses, Claude", async () => {
    saglik(); const { v } = newViews(); await flush();
    expect(serit(v)).toEqual(["AfuNöbet ✓", "GPT ✓", "Ses ✓", "Claude ✓"]);
  });
  it("her şey hazırken dört öğe de ✓ çizer", async () => {
    saglik(); const { v } = newViews(); await flush();
    expect(serit(v).filter(t => t.endsWith("✓"))).toHaveLength(4);
    expect(serit(v).some(t => t.includes("✗"))).toBe(false);
  });
  it("bağlanamayan modül ✗ olur", async () => {
    saglik({ codex: false }); const { v } = newViews(); await flush();
    expect(serit(v)).toEqual(["AfuNöbet ✓", "GPT ✗", "Ses ✓", "Claude ✓"]);
  });
  it("✗ olana tıklayınca tek cümle görünür", async () => {
    saglik({ claude: false }); const { v } = newViews(); await flush();
    el(v.healthStrip).click();
    expect(el(v.bildirim).hidden).toBe(false);
    const metin = el(v.bildirim).textContent;
    expect(metin).toContain("Claude");
    expect(metin.endsWith(".")).toBe(true);
    expect(metin).not.toMatch(/[\n;]|\.\s+\S/);
  });
  it("her hata için ayrı tek cümle yönlendirme verir", async () => {
    for (const [hata, beklenen] of [["afu", "Afu izlemeyi durdurdu"], ["codex", "GPT hesabına bağlı değil"], ["ses", "Afu'nun sesi kapalı"], ["claude", "Claude mesajları Afu'ya gelmiyor"]] as const) {
      vi.restoreAllMocks(); fakeDom();
      saglik({ [hata]: false });
      const { v } = newViews(); await flush();
      el(v.healthStrip).click();
      const metin = el(v.bildirim).textContent;
      expect(metin).toContain(beklenen);
      expect(metin.endsWith(".")).toBe(true);
      expect(metin).not.toMatch(/[\n;]|\.\s+\S/);
    }
  });
  it("tek cümlelik bildirim kendiliğinden söner", async () => {
    saglik({ claude: false }); vi.useFakeTimers(); const { v } = newViews(); await flush();
    el(v.healthStrip).click(); expect(el(v.bildirim).hidden).toBe(false);
    await vi.advanceTimersByTimeAsync(3000); expect(el(v.bildirim).hidden).toBe(true);
  });
});

// ---------------- 2) Orkestra "Başlıyor…" geçici kartı ----------------
describe("orkestra geçici kart", () => {
  beforeEach(() => { vi.useFakeTimers(); State.snapshot = snapshot(); });
  const flashes: string[] = [];
  beforeEach(() => { flashes.length = 0; });
  async function orkestra() {
    vi.spyOn(Bridge, "bildirimAyarlari").mockResolvedValue({ muted: true });
    vi.spyOn(Bridge, "codexStatus").mockRejectedValue(new Error("Codex bulunamadı."));
    const w = new FakeWindow(); vi.stubGlobal("window", w);
    w.addEventListener("afu-flash", (e: { detail: string }) => flashes.push(e.detail));
    return new AfuViews({ collapse: () => {}, quota: () => {} } as never);
  }

  it("iş verince 'Başlıyor...' kartı görünür", async () => {
    const v = await orkestra(); await flush();
    State.setPendingOrkestra("codex", "Denetimi yap");
    v.sync("overview", true);
    expect(State.focusTask?.currentAction).toBe("Başlıyor...");
    expect(State.focusTask?.status).toBe("Hazirlaniyor");
    const kart = el(v.card).textContent;
    expect(kart).toContain("Denetimi yap");
    expect(kart).toContain("Başlıyor...");
  });
  it("30 saniye iş gelmezse tek cümlelik uyarı verir", async () => {
    const v = await orkestra(); await flush();
    State.setPendingOrkestra("codex", "Denetimi yap");
    v.sync("overview", true);
    expect(flashes).toEqual([]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(flashes).toHaveLength(1);
    expect(flashes[0]).toBe("Görev 30 saniye içinde başlayamadı, arka planı kontrol edin.");
    expect(State.pendingOrkestra).toBeNull();
  });
  it("uyarı sonrası geçici kart kaybolur", async () => {
    const v = await orkestra(); await flush();
    State.setPendingOrkestra("codex", "Denetimi yap");
    v.sync("overview", true);
    await vi.advanceTimersByTimeAsync(30000);
    v.sync("overview", true);
    expect(el(v.card).textContent).not.toContain("Başlıyor...");
    expect(State.focusTask).toBeUndefined();
  });
  it("30 saniye içinde iş gelirse uyarı vermez", async () => {
    const v = await orkestra(); await flush();
    State.setPendingOrkestra("codex", "Denetimi yap");
    v.sync("overview", true);
    const simdi = new Date(Date.now()).toISOString();
    State.apply({ version: 1, tasks: [{ id: "j1", agent: "codex", status: "Calisiyor", title: "Denetimi yap", task: "Denetimi yap", started_at: simdi, updated_at: simdi }], mesaj: "" });
    v.sync("overview", true);
    expect(State.pendingOrkestra).toBeNull();
    expect(State.focusTask?.id).toBe("j1");
    expect(el(v.card).textContent).not.toContain("Başlıyor...");
    await vi.advanceTimersByTimeAsync(30000);
    expect(flashes).toEqual([]);
  });
});

// ---------------- 3) Konuşma balonu ----------------
describe("konuşma balonu", () => {
  const mesaj = (id: string, metin = `Mesaj ${id}`): Mesaj => ({ surum: 1, id, ajan: "codex", tur: "bilgi", metin, zaman: 0 });

  it("80 karakterden uzun metni '…' ile kelime sınırında keser", () => {
    const uzun = "ab".repeat(80);
    expect(Array.from(kisalt(uzun))).toHaveLength(80);
    expect(kisalt(uzun).endsWith("…")).toBe(true);
    expect(Array.from(kisalt("😀".repeat(200)))).toHaveLength(80);
    expect(kisalt("😀".repeat(200)).endsWith("…")).toBe(true);
    const kelimeler = "kelime ".repeat(20).trim();
    expect(kisalt(kelimeler)).toBe(Array(11).fill("kelime").join(" ") + "…");
  });
  it("kısa metne ve tam 80 karaktere dokunmaz", () => {
    expect(kisalt("kısa metin")).toBe("kısa metin");
    const tam = "x".repeat(80);
    expect(kisalt(tam)).toBe(tam);
    expect(kisalt(tam).endsWith("…")).toBe(false);
  });
  it("balon kendiliğinden kapanmaz: ne 8 saniye sonra ne daha sonra", () => {
    const m = new BalonModeli(); m.gorunur(true, 0); m.ekle(mesaj("a"), 0);
    expect(m.aktif?.id).toBe("a");
    m.tick(8000); expect(m.aktif?.id).toBe("a");
    m.tick(600000); expect(m.aktif?.id).toBe("a");
    // Otomatik kapanma zamanlayicisi kaldirildi: kapatma yalnizca kullanicinin ×'i.
    expect(Object.keys(m).some(k => /zaman|bitis|timeout|timer/i.test(k))).toBe(false);
  });
  it("× ile kapanır, sıradaki mesaj gösterilir", () => {
    const m = new BalonModeli(); m.gorunur(true, 0); m.ekle(mesaj("a"), 0); m.ekle(mesaj("b"), 0);
    expect(m.aktif?.id).toBe("a"); expect(m.sira).toBe(1);
    expect(m.kapat()).toBe(true);
    expect(m.aktif?.id).toBe("b"); expect(m.sira).toBe(0);
    expect(m.kapat()).toBe(true); expect(m.aktif).toBeNull();
    expect(m.kapat()).toBe(false);
  });
  it("yeni mesaj geldiğinde görünen balon değişmez", () => {
    const m = new BalonModeli(); m.gorunur(true, 0); m.ekle(mesaj("a"), 0);
    m.ekle(mesaj("b"), 10); m.ekle(mesaj("c"), 20);
    expect(m.aktif?.id).toBe("a"); expect(m.sira).toBe(2);
  });
  it("görünürken kuyrukta en fazla beş mesaj tutar", () => {
    const m = new BalonModeli(); m.gorunur(true, 0);
    for (let i = 0; i < 8; i++) m.ekle(mesaj(String(i)), i);
    expect(m.aktif?.id).toBe("0");
    expect(m.bekleyen.map(x => x.id)).toEqual(["3", "4", "5", "6", "7"]);
  });
  it("gizliyken kuyruk da beşte kalır", () => {
    const m = new BalonModeli();
    for (let i = 0; i < 9; i++) m.ekle(mesaj(String(i)), i);
    expect(m.aktif).toBeNull();
    expect(m.bekleyen.map(x => x.id)).toEqual(["4", "5", "6", "7", "8"]);
    m.gorunur(true, 100); expect(m.aktif?.id).toBe("4");
  });
  it("balon etiketi ayrı, gövde temiz ve kısaltılmıştır", () => {
    const kirli = "Claude:\n\n──────\n**Düzeltme:** Testler yeşil. Sonra `build` çalıştır.\n| a | b |\n===\nDördüncü cümle görünmez.";
    expect(balonMetni({ ...mesaj("a", kirli), ajan: "claude" })).toEqual({ etiket: "Claude", govde: "Düzeltme: Testler yeşil. Sonra build çalıştır." });
    expect(temizMetin(kirli)).not.toMatch(/[|`#]|──|===|\*\*/);
    const emoji = balonMetni({ ...mesaj("b", "Bitti 🎉 Tamam 👍"), ajan: "codex" });
    expect(emoji.govde).toBe("Bitti 🎉 Tamam 👍");
    expect(emoji.etiket).toBe("Codex");
  });
  it("kuyruk rozeti '+N mesaj' yazar, × düğmesi kurar", () => {
    const acilan: Mesaj[] = [];
    let kapandi = 0;
    const balon = balonOlustur({ createElement: (t: string) => new FakeEl(t) } as never, mesaj("a"), m => acilan.push(m), () => { kapandi++; }, 2);
    const rozet = el(balon).find("afu-balon-ek");
    expect(rozet?.textContent).toBe("+2 mesaj");
    const kapat = el(balon).find("afu-balon-kapat");
    expect(kapat?.textContent).toBe("Okudum");
    kapat!.click();
    expect(kapandi).toBe(1);
  });
  it("balon kesilmiş metni gösterir, tam metni tıklayınca açar", () => {
    const acilan: Mesaj[] = [];
    const tam = mesaj("a", "Tam metin bir. Tam metin iki. Üçüncü cümle. Dördüncü cümle.");
    const balon = balonOlustur({ createElement: (t: string) => new FakeEl(t) } as never, tam, m => acilan.push(m));
    expect(el(balon).find("afu-balon-etiket")?.textContent).toBe("Codex");
    expect(el(balon).find("afu-balon-metin")?.textContent).toBe("Tam metin bir. Tam metin iki.");
    expect(el(balon).textContent).not.toContain("Üçüncü cümle");
    el(balon).click();
    expect(acilan).toEqual([tam]);
  });
});

// ---------------- 4) Codex giriş satırı ----------------
describe("codex giriş satırı", () => {
  function actions(durum: string | { status: string }) {
    return { codexStatus: vi.fn(async () => durum), codexSend: vi.fn(async () => {}), codexCancel: vi.fn(async () => {}),
      codexLogin: vi.fn(async () => {}), codexLoginCancel: vi.fn(async () => {}), codexInstall: vi.fn(async () => {}) };
  }
  it("hazırsa bağlı yazar ve giriş düğmesini gizler", async () => {
    const v = new ChatView(actions("hazir") as never); await v.refresh();
    expect(el(v.message).textContent).toBe("GPT-5.6 Sol: hazır");
    expect(el(v.loginButton).hidden).toBe(true);
    v.input.value = "Merhaba"; el(v.input).dispatch("input");
    expect(el(v.sendButton).disabled).toBe(false);
  });
  it("oturum yoksa giriş yapılmadı yazar ve düğmeyi gösterir", async () => {
    const v = new ChatView(actions("oturum_yok") as never); await v.refresh();
    expect(el(v.message).textContent).toBe("Codex hesabına giriş yap.");
    expect(el(v.loginButton).hidden).toBe(false);
    v.input.value = "Merhaba";
    expect(el(v.sendButton).disabled).toBe(true);
  });
  it("nesne biçimindeki hazır durum da bağlı sayılır", async () => {
    const v = new ChatView(actions({ status: "hazir" }) as never); await v.refresh();
    expect(el(v.message).textContent).toBe("GPT-5.6 Sol: hazır");
  });
  it("giriş düğmesi 'Codex ile giriş yap' der", () => {
    const v = new ChatView(actions("oturum_yok") as never);
    expect(el(v.loginButton).textContent).toBe("Codex ile giriş yap");
  });
  it("Codex kurulu değilse tek dokunuşla kurma yolu açar", async () => {
    const a = actions("hazir"); a.codexStatus.mockRejectedValue(new Error("Codex kurulu değil."));
    const v = new ChatView(a as never); await v.refresh();
    expect(el(v.message).textContent).toBe("Codex kurulu değil. Kurmak için dokun.");
    const kur = el(v.message).find("text-button");
    expect(kur).toBeTruthy();
    kur!.click(); await Promise.resolve();
    expect(a.codexInstall).toHaveBeenCalledOnce();
  });
  it("giriş başlatıldığında tek cümlelik yönlendirme verir", async () => {
    const a = actions("oturum_yok"); const v = new ChatView(a as never); await v.refresh();
    el(v.loginButton).click(); await flush();
    expect(a.codexLogin).toHaveBeenCalledOnce();
    expect(el(v.message).textContent).toBe("Açılan sayfada hesabını bağla.");
    await v.suspend();
  });
});
