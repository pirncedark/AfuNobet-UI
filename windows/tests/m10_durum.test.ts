import { beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const native = vi.hoisted(() => ({ invoke: vi.fn(async (command: string) => (command === "bildirim_ayarlari" ? { muted: false } : null)) }));
const ayarlar = vi.hoisted(() => ({
  messageAlert: true, ifade: true,
  saveMessageAlert: vi.fn((enabled: boolean) => { ayarlar.messageAlert = enabled; return true; }),
  savePetIfade: vi.fn((enabled: boolean) => { ayarlar.ifade = enabled; return true; }),
}));
const bildirim = vi.hoisted(() => ({ handlers: {} as Record<string, (event: { payload?: unknown }) => void>, temizle: [] as (() => void)[] }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: native.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: async (name: string, cb: (event: { payload?: unknown }) => void) => {
  bildirim.handlers[name] = cb;
  const bitti = () => { delete bildirim.handlers[name]; };
  bildirim.temizle.push(bitti);
  return bitti;
} }));
vi.mock("../src/core/settings", () => ({
  PET_IFADE_OLAYI: "afu-pet-ifade",
  loadMessageAlert: () => ayarlar.messageAlert,
  loadPetIfade: () => ayarlar.ifade,
  saveMessageAlert: ayarlar.saveMessageAlert,
  savePetIfade: ayarlar.savePetIfade,
}));
vi.mock("../src/message/notifications", () => ({ showNotification: () => {} }));

class El extends EventTarget {
  className = ""; textContent = ""; title = ""; type = ""; hidden = false; disabled = false;
  isConnected = false; open = false; parentElement: El | null = null; children: El[] = [];
  attrs = new Map<string, string>();
  style = { cssText: "" };
  focused = false;
  constructor(readonly tag: string) { super(); }
  append(...items: El[]) { for (const item of items) { item.parentElement = this; item.isConnected = this.isConnected || this.tag === "body"; this.children.push(item); } }
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string) { this.attrs.delete(name); }
  getClientRects() { return [{}]; }
  focus() { this.focused = true; }
  remove() { this.isConnected = false; this.parentElement = null; }
}

function bul(kok: El, secici: (el: El) => boolean): El[] {
  const out: El[] = [];
  const walk = (el: El) => { for (const child of el.children) { if (secici(child)) out.push(child); walk(child); } };
  walk(kok);
  return out;
}
const sinif = (ad: string) => (el: El) => el.className.split(/\s+/).includes(ad);

async function panelAc(): Promise<{ panel: El; anahtar: (ad: string) => El; tum: El[] }> {
  const island = new El("div");
  island.isConnected = true;
  island.setAttribute("id", "island");
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    body: new El("body"),
    getElementById: (id: string) => (id === "island" ? island : null),
    createElement: (tag: string) => new El(tag),
  });
  class Observer { observe() {} disconnect() {} }
  const window = Object.assign(new EventTarget(), { __TAURI_INTERNALS__: {} });
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  vi.stubGlobal("MutationObserver", Observer);
  await import("../src/sistem");
  await vi.waitFor(() => expect(Object.keys(bildirim.handlers)).toContain("system-status"));
  bildirim.handlers["system-status"]!({});
  const panel = bul(island, sinif("sistem-panel"))[0];
  return { panel, anahtar: ad => bul(panel, sinif(ad)), tum: bul(panel, () => true) };
}

beforeEach(() => {
  native.invoke.mockClear();
  native.invoke.mockImplementation(async (command: string) => (command === "bildirim_ayarlari" ? { muted: false } : null));
  ayarlar.messageAlert = true; ayarlar.ifade = true;
  ayarlar.saveMessageAlert.mockClear(); ayarlar.savePetIfade.mockClear();
  bildirim.handlers = {}; bildirim.temizle = [];
  vi.resetModules();
});

it("durum paneli inline stil yerine kart dili sınıflarını kullanır", async () => {
  const { panel } = await panelAc();
  expect(panel.className).toContain("sistem-panel");
  expect(panel.style.cssText).toBe("");
  expect(panel.getAttribute("aria-label")).toBe("Durum");
  expect(panel.hidden).toBe(false);
});

it("panel yüksekliği içeriğe göre: üstte sabit, boş alan yok, taşarsa kaydırır", () => {
  const css = readFileSync(fileURLToPath(new URL("../src/sistem/sistem.css", import.meta.url)), "utf8");
  expect(css).not.toMatch(/inset\s*:\s*18px/);
  expect(css).toMatch(/position:\s*absolute/);
  expect(css).toMatch(/top:\s*10px/);
  expect(css).toMatch(/height:\s*auto/);
  expect(css).toMatch(/max-height:\s*calc\(100% - 20px\)/);
  expect(css).toMatch(/overflow-y:\s*auto/);
  // Satırlar arası 8px, satır yüksekliği en az 36px.
  expect(css).toMatch(/\.sistem-ayarlar\s*\{[^}]*gap:\s*8px/);
  expect(css).toMatch(/\.sistem-ayar\s*\{[^}]*min-height:\s*36px/);
  // Başlık 16px yarı kalın; açıklama 11px soluk.
  expect(css).toMatch(/\.sistem-title\s*\{[^}]*font-size:\s*16px[^}]*font-weight:\s*600/);
  expect(css).toMatch(/\.sistem-ayar-not\s*\{[^}]*font-size:\s*11px[^}]*color:\s*#a7bbd5/);
});

it("üç ayar satırı anahtar görünümünde, ana karttaki Ayarlar menüsüyle aynı metni kullanır", async () => {
  const { panel } = await panelAc();
  const satirlar = bul(panel, sinif("sistem-ayar"));
  expect(satirlar).toHaveLength(3);
  const metinler = satirlar.map(row => {
    expect(row.getAttribute("role")).toBe("switch");
    expect(row.getAttribute("aria-checked")).not.toBeNull();
    expect(bul(row, sinif("sistem-anahtar"))).toHaveLength(1);
    const ad = bul(row, sinif("sistem-ayar-ad"))[0].textContent;
    const not = bul(row, sinif("sistem-ayar-not"))[0].textContent;
    expect(not.length).toBeGreaterThan(0);
    return `${ad}|${not}`;
  });
  expect(metinler).toContain("Mesaj gelince öne gel|Yeni mesaj geldiğinde Afu görünür.");
  expect(metinler).toContain("Arada ifade yap|Afu boştayken kısa ifadeler yapar.");
  // Aynı metinler ana kartta da durur (views.ts): iki yüzey ayrışmaz.
  const views = readFileSync(fileURLToPath(new URL("../src/views/views.ts", import.meta.url)), "utf8");
  for (const satir of metinler.slice(0, 2)) for (const parca of satir.split("|")) expect(views).toContain(parca);
});

it("anahtar tıklanınca değer değişir ve ana metin sabit kalır", async () => {
  const { panel, tum } = await panelAc();
  const [alert] = bul(panel, el => el.className === "sistem-ayar");
  const bas = async () => { alert.dispatchEvent(Object.assign(new Event("click"), {})); await vi.waitFor(() => expect(alert.getAttribute("aria-checked")).toBe("false")); };
  await bas();
  expect(ayarlar.saveMessageAlert).toHaveBeenCalledWith(false);
  expect(bul(alert, sinif("sistem-ayar-ad"))[0].textContent).toBe("Mesaj gelince öne gel");
  // Aynı olay dışarıdan gelirse satır kendini yeniler.
  expect(tum.filter(el => el.className === "sistem-ayar")).toHaveLength(3);
});

it("ses satırı ana listede, Gelişmiş içinde yalnız GitHub durumu var", async () => {
  const { panel } = await panelAc();
  await vi.waitFor(() => expect(native.invoke).toHaveBeenCalledWith("bildirim_ayarlari"));
  const gelismis = bul(panel, sinif("sistem-gelisimis"))[0];
  const ozet = bul(gelismis, sinif("sistem-ozet"))[0];
  expect(bul(ozet, sinif("sistem-ok"))[0].textContent).toBe("▸");
  expect(bul(gelismis, sinif("sistem-ayar"))).toHaveLength(0);
  expect(bul(gelismis, sinif("sistem-servis"))).toHaveLength(1);
  // GitHub satırı kendi diliyle: ok işareti + durum rozeti.
  const servis = bul(gelismis, sinif("sistem-servis"))[0];
  expect(bul(servis, sinif("sistem-ok"))[0].textContent).toBe("▸");
  expect(bul(servis, sinif("service-pill"))[0].textContent).toBe("GitHub ?");
  const ses = bul(panel, el => el.className === "sistem-ayar" && bul(el, sinif("sistem-ayar-ad"))[0]?.textContent === "Afu'nun sesi");
  expect(ses).toHaveLength(1);
  expect(ses[0].disabled).toBe(false);
  expect(ses[0].getAttribute("aria-checked")).toBe("true");
});

it("kapat ✕ ikon düğmesidir ve Esc de paneli kapatır", async () => {
  const { panel } = await panelAc();
  const kapat = bul(panel, sinif("sistem-kapat"))[0];
  expect(kapat.tag).toBe("button");
  expect(kapat.getAttribute("aria-label")).toBe("Kapat");
  expect(kapat.textContent).toBe("✕");
  // Altta ayrı bir "Kapat" yazılı düğme yok.
  const yazili = bul(panel, el => el.tag === "button" && el.textContent.trim() === "Kapat");
  expect(yazili).toHaveLength(0);
  kapat.dispatchEvent(new Event("click"));
  expect(panel.hidden).toBe(true);
  bildirim.handlers["system-status"]!({});
  expect(panel.hidden).toBe(false);
  window.dispatchEvent(Object.assign(new Event("keydown"), { key: "Escape" }));
  expect(panel.hidden).toBe(true);
});

it("bildirim metni tek cümle durum satırına yazılır", async () => {
  const { panel } = await panelAc();
  const durum = bul(panel, sinif("sistem-durum"))[0];
  expect(durum.getAttribute("role")).toBe("status");
  expect(durum.textContent).toBe("Görevlerini ana karttan izleyebilirsin.");
  bildirim.handlers["afunobet-bildirim"]!({ payload: { id: "1", kind: "finished", message: "gizli" } });
  expect(durum.textContent).toBe("Görev tamamlandı.");
});