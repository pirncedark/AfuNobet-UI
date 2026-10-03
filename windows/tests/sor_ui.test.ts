import { afterEach, describe, expect, it, vi } from "vitest";
import { parseState } from "../src/core/state";
import { SorView, SOR_METIN, SOR_EXAMPLES } from "../src/sor/sor";

class FakeElement {
  children: FakeElement[] = []; textContent = ""; value = ""; className = ""; hidden = false; disabled = false; title = "";
  listeners = new Map<string, ((e: any) => void)[]>();
  setAttribute(k: string, v: string) { if (k === "title") this.title = v; } append(...c: FakeElement[]) { this.children.push(...c); } replaceChildren(...c: FakeElement[]) { this.children = c; }
  addEventListener(n: string, f: (e: any) => void) { this.listeners.set(n, [...this.listeners.get(n) ?? [], f]); }
  fire(n: string, e: any = {}) { for (const f of this.listeners.get(n) ?? []) f(e); }
}
const now = new Date().toISOString();
const snap = parseState({ version: 1, tasks: [
  { id: "a", agent: "codex", status: "Calisiyor", task: "Rapor", title: "Rapor yaz", updated_at: now },
  { id: "b", agent: "gemini", status: "Tamamlandi", task: "Test", title: "Testleri koş", updated_at: now },
] });
function kur(status: string | (() => Promise<string>) = "hazir") {
  vi.stubGlobal("document", { createElement: () => new FakeElement(), createTextNode: (t: string) => Object.assign(new FakeElement(), { textContent: t }) });
  const a = {
    snapshot: vi.fn(() => snap),
    codexStatus: vi.fn(typeof status === "string" ? async () => status : status),
    codexLogin: vi.fn(async () => {}),
    codexaSor: vi.fn(async (_t: string) => {}),
  };
  return { v: new SorView(a), a };
}
const tik = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Afu'ya sor arayüzü", () => {
  it("örnekler döner; yazılan veya odaktaki soru korunur", () => {
    vi.useFakeTimers();
    const { v } = kur();
    const set = vi.spyOn(v.input, "setAttribute");
    vi.advanceTimersByTime(5000);
    expect(set).toHaveBeenLastCalledWith("placeholder", SOR_EXAMPLES[1]);
    v.input.value = "Kendi sorum";
    vi.advanceTimersByTime(5000);
    expect(set).toHaveBeenCalledTimes(1);
    expect(v.input.value).toBe("Kendi sorum");
    v.input.value = "";
    Object.assign(document, { activeElement: v.input });
    vi.advanceTimersByTime(5000);
    expect(set).toHaveBeenCalledTimes(1);
    Object.assign(document, { activeElement: null });
    vi.advanceTimersByTime(5000);
    expect(set).toHaveBeenLastCalledWith("placeholder", SOR_EXAMPLES[2]);
  });
  it("yerel soru Codex'e gitmez, cevap hemen görünür", async () => {
    const { v, a } = kur(); v.input.value = "Kaç iş var?"; await v.sor();
    expect(a.codexStatus).not.toHaveBeenCalled(); expect(a.codexaSor).not.toHaveBeenCalled();
    expect(v.answer.textContent.length).toBeGreaterThan(0); expect(v.input.value).toBe("");
  });
  it("açıklama isteyen soru hazır Codex'e iletilir", async () => {
    const { v, a } = kur("hazir"); v.input.value = "Bu kodu neden böyle yazdın, açıkla"; await v.sor();
    expect(a.codexaSor).toHaveBeenCalledWith("Bu kodu neden böyle yazdın, açıkla");
    expect(v.answer.textContent).toBe(SOR_METIN.iletildi); expect(v.input.value).toBe("");
  });
  it("oturum yoksa tek cümle + Oturum aç, soru korunur", async () => {
    const { v, a } = kur("oturum_yok"); v.input.value = "Bu kodu neden böyle yazdın, açıkla"; await v.sor();
    expect(v.answer.textContent).toBe("Codex oturumu açık değil."); expect(v.loginButton.hidden).toBe(false);
    expect(a.codexaSor).not.toHaveBeenCalled(); expect(v.input.value).toBe("Bu kodu neden böyle yazdın, açıkla");
    (v.loginButton as unknown as FakeElement).fire("click"); await tik();
    expect(a.codexLogin).toHaveBeenCalledOnce(); expect(v.answer.textContent).toBe(SOR_METIN.girisAcik);
  });
  it("durum sorgusu hata verirse oturum yok gibi davranır", async () => {
    const { v, a } = kur(async () => { throw new Error("x"); }); v.input.value = "Bu kodu neden böyle yazdın, açıkla"; await v.sor();
    expect(v.answer.textContent).toBe(SOR_METIN.oturumYok); expect(a.codexaSor).not.toHaveBeenCalled();
  });
  it("boş soru hiçbir şey yapmaz", async () => {
    const { v, a } = kur(); v.input.value = "   "; await v.sor();
    expect(a.snapshot).not.toHaveBeenCalled(); expect(a.codexStatus).not.toHaveBeenCalled(); expect(v.answer.textContent).toBe("");
  });
  it("bas-konuş yalnız yer tutucudur", () => {
    const { v } = kur(); expect(v.micButton.disabled).toBe(true); expect(v.loginButton.hidden).toBe(true);
  });
  it("Enter sorar, Shift+Enter sormaz; aynı anda iki soru gitmez", async () => {
    let bitir!: (s: string) => void;
    const { v, a } = kur(() => new Promise<string>(r => bitir = r));
    const input = v.input as unknown as FakeElement; v.input.value = "Bu kodu neden böyle yazdın, açıkla";
    input.fire("keydown", { key: "Enter", shiftKey: true, preventDefault: vi.fn() }); expect(a.codexStatus).not.toHaveBeenCalled();
    input.fire("keydown", { key: "Enter", preventDefault: vi.fn() }); input.fire("keydown", { key: "Enter", preventDefault: vi.fn() });
    expect(a.codexStatus).toHaveBeenCalledOnce(); bitir("hazir"); await tik(); expect(a.codexaSor).toHaveBeenCalledOnce();
  });
  it("giriş başlatılamazsa tek cümle hata", async () => {
    const { v, a } = kur("oturum_yok"); a.codexLogin.mockRejectedValue(new Error("x"));
    (v.loginButton as unknown as FakeElement).fire("click"); await tik(); expect(v.answer.textContent).toBe(SOR_METIN.girisHata);
  });
  it("Codex'e iletim başarısızsa soru korunur, oturum düğmesi çıkmaz", async () => {
    const { v, a } = kur("hazir"); a.codexaSor.mockRejectedValue(new Error("x")); v.input.value = "Bunu açıkla"; await v.sor();
    expect(v.answer.textContent).toBe(SOR_METIN.iletilemedi); expect(v.input.value).toBe("Bunu açıkla"); expect(v.loginButton.hidden).toBe(true);
  });
});
