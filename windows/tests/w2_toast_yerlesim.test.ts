// W2: kısa bildirim (toast) hiçbir düğmenin üstüne binmez. Gerçek CSS ile
// Chromium'da (headless) yerleşim ölçülür: %100 ve %150 ölçek, geniş ve dar kart,
// her görünüm. Ayrıca CSS sözleşmesi ve yol/komut maskelemesi sınanır.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { readFileSync } from "node:fs";
import { BILDIRIM_GIZLI, maskeleBildirim } from "../src/core/state";

const css = ["src/style.css", "src/apps.css", "src/chat.css", "src/sor/sor.css", "src/message/message.css"]
  .map(f => readFileSync(f, "utf8")).join("\n");

type Gorunum = "overview" | "sor" | "apps" | "greeting" | "orkestra";
const satirlar = (n: number) => Array.from({ length: n }, (_, i) => `<button class="task-row"><i class="status-dot"></i><span class="row-title">Görev ${i}</span><span class="row-status">Çalışıyor</span></button>`).join("");

function sayfa(gorunum: Gorunum, metin: string, w: number, h: number, olcek: number, menu = false) {
  const v = (g: Gorunum) => gorunum === g ? "" : " hidden";
  return `<!DOCTYPE html><html lang="tr"><head><style>${css}</style></head><body>
  <div id="root"><div id="island" data-mode="expanded" data-view="${gorunum}" style="width:${w}px;height:${h}px;--kart-olcek:${olcek};border-radius:22px">
   <div id="island-clip">
    <div id="afu-character"></div>
    <div id="content">
     <header><span class="brand">Afu</span><span class="summary">2 görev</span></header>
     <div class="overview"${v("overview")}>
      <nav class="agent-pills"><button class="agent-pill">CODEX</button><button class="agent-pill">OPENCODE</button><button class="agent-pill">ORKESTRA</button></nav>
      <article class="main-task"><p class="task-eyebrow">CODEX</p><h1>Uzun bir görev başlığı</h1><p class="task-message">Mesaj</p></article>
      <div class="other-tasks">${satirlar(8)}</div>
     </div>
     <section class="sor-view"${v("sor")}><div class="sor-panel"><h1>Afu'ya sor</h1><textarea class="sor-input"></textarea><div class="sor-actions"><button class="text-button">Temizle</button><button class="primary-button">Sor</button></div><pre class="sor-answer">${"Cevap satırı\n".repeat(12)}</pre></div></section>
     <section class="apps-view"${v("apps")}><h1>Uygulamalar</h1>${Array.from({ length: 9 }, (_, i) => `<div class="app-row"><div class="app-description"><strong>Uygulama ${i}</strong></div><button class="app-open">Aç</button></div>`).join("")}</section>
     <section class="orkestra-view"${v("orkestra")}><h1>Orkestra</h1><div class="orkestra-agents"><button class="orkestra-agent-row">CODEX</button><button class="orkestra-agent-row">OPENCODE</button></div>${satirlar(10)}</section>
     <section class="greeting-view"${v("greeting")}><h1>Merhaba</h1><p>Afu burada.</p><p class="hint">İpucu</p></section>
     <p class="tik-bildirim" role="status">${metin}</p>
     <div class="more-menu" role="menu"${menu ? "" : " hidden"}><button class="text-button menu-item">Mini pet açık</button><button class="text-button menu-item">Kapat</button></div>
     <footer><button class="text-button page-button">Kota durumu</button><button class="text-button page-button">Uygulamalar</button><button class="text-button page-button">Orkestra</button><button class="text-button page-button">Sohbet</button><button class="text-button more-button">⋯ Daha fazla</button><button class="text-button collapse-button">Küçült</button><span class="footer-gap"></span><button class="primary-button sor-button">Afu'ya sor</button></footer>
    </div>
   </div>
  </div></div></body></html>`;
}

type Kutu = { x: number; y: number; w: number; h: number };
async function olc(page: Page) {
  return page.evaluate(() => {
    const k = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const gorunur = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const toast = document.querySelector(".tik-bildirim")!;
    const footer = document.querySelector("footer")!;
    const content = document.querySelector("#content")!;
    // Kaydırma kutusunun dışında kalan (görünmeyen) düğme kısmı kesilir: yalnız ekranda görünen dikdörtgen sayılır.
    const gorunenKutu = (e: Element) => {
      const r = e.getBoundingClientRect(); let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
      for (let p = e.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p); if (o.overflowX === "visible" && o.overflowY === "visible") continue;
        const q = p.getBoundingClientRect(); x1 = Math.max(x1, q.left); y1 = Math.max(y1, q.top); x2 = Math.min(x2, q.right); y2 = Math.min(y2, q.bottom);
      }
      return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
    };
    const dugmeler = [...document.querySelectorAll("#content button")].filter(gorunur).map(e => ({ ad: e.textContent ?? "", ...gorunenKutu(e) })).filter(b => b.w > 0 && b.h > 0);
    const s = getComputedStyle(toast);
    return { toast: k(toast), footer: k(footer), content: k(content), dugmeler, position: s.position, tasma: (toast as HTMLElement).scrollWidth > (toast as HTMLElement).clientWidth, sarma: s.whiteSpace };
  });
}
const kesisir = (a: Kutu, b: Kutu) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const icinde = (a: Kutu, b: Kutu) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;

let browser: Browser;
let page: Page;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); page = await browser.newPage({ viewport: { width: 1200, height: 600 } }); });
afterAll(async () => { await browser?.close(); });

const KISA = "Mini pet açık: Küçült'e basınca Afu görev çubuğunun yanında bekler.";
const UZUN = "Mini pet açık: Küçült'e basınca Afu görev çubuğunun yanında bekler. ".repeat(4);
const durumlar: { ad: string; gorunum: Gorunum; w: number; h: number; olcek: number; menu?: boolean }[] = [];
for (const olcek of [1, 1.5]) for (const w of [640, 420]) for (const gorunum of ["overview", "sor", "apps", "orkestra"] as Gorunum[])
  durumlar.push({ ad: `${gorunum} ${w}px x${olcek}`, gorunum, w, h: 286, olcek });
durumlar.push({ ad: "greeting 640px x1.5", gorunum: "greeting", w: 640, h: 160, olcek: 1.5 });
durumlar.push({ ad: "greeting dar x1", gorunum: "greeting", w: 420, h: 160, olcek: 1 });
durumlar.push({ ad: "menü açık x1.5", gorunum: "overview", w: 640, h: 286, olcek: 1.5, menu: true });

describe("W2: bildirim düğmelerin üstüne binmez (Chromium yerleşimi)", () => {
  for (const d of durumlar) for (const metin of [KISA, UZUN]) {
    it(`${d.ad} — ${metin === KISA ? "kısa" : "uzun"} metin`, async () => {
      await page.setContent(sayfa(d.gorunum, metin, d.w, d.h, d.olcek, d.menu));
      const m = await olc(page);
      expect(m.position).toBe("static");
      expect(m.toast.h).toBeGreaterThan(0);
      // Bildirim ve alt satır kartın içinde, kırpılmadan görünür.
      expect(icinde(m.toast, m.content)).toBe(true);
      expect(icinde(m.footer, m.content)).toBe(true);
      // Hiçbir düğme (alt satır, ajan sekmeleri, menü) bildirimle kesişmez.
      for (const b of m.dugmeler) expect(kesisir(m.toast, b), `${b.ad} örtüldü`).toBe(false);
      // Alt düğme satırının hemen üstünde, kendi satırında.
      expect(m.toast.y + m.toast.h).toBeLessThanOrEqual(m.footer.y + 0.5);
      // Tek satır: uzun metin satır kaydırıp düğmeleri itmez, "…" ile kısalır.
      expect(m.sarma).toBe("nowrap");
    });
  }
});

describe("W2: CSS ve kod sözleşmesi", () => {
  const style = readFileSync("src/style.css", "utf8");
  const kural = /\.tik-bildirim\{([^}]*)\}/.exec(style)?.[1] ?? "";
  it("bildirim akış içinde, kendi satırında, tek satır", () => {
    expect(kural).toContain("position:static");
    expect(kural).not.toMatch(/position:(absolute|fixed)/);
    expect(kural).toMatch(/flex:0 0 auto/);
    expect(kural).toContain("white-space:nowrap");
    expect(kural).toContain("text-overflow:ellipsis");
    expect(style).toContain(".tik-bildirim:not([hidden])~footer{margin-top:0}");
  });
  it("bildirim DOM'da görünümlerden sonra, alt satırdan önce", () => {
    const views = readFileSync("src/views/views.ts", "utf8");
    expect(views).toMatch(/this\.greeting, this\.bildirim, this\.menu, this\.footer/);
    expect(views).toMatch(/flash\(message: string\) \{\s*\/\/[^\n]*\n\s*const metin = maskeleBildirim\(message\);/);
  });
});

describe("W2: bildirimde yol/komut maskelenir", () => {
  it("sade cümle aynen kalır (kesme işareti korunur)", () => {
    expect(maskeleBildirim(KISA)).toBe(KISA);
    expect(maskeleBildirim("Codex oturumu yok, 'Afu'ya sor' kısmından giriş yap.")).toBe("Codex oturumu yok, 'Afu'ya sor' kısmından giriş yap.");
  });
  it("Windows/Unix yolu, adres ve e-posta maskelenir", () => {
    const a = maskeleBildirim("Görev gönderilemedi: C:\\Users\\kullanici\\gizli\\job.json bulunamadı.");
    expect(a).not.toMatch(/C:|kullanici|job\.json/);
    expect(a).toContain("…");
    const b = maskeleBildirim("Kayıt /home/afu/.config/x.toml okunamadı");
    expect(b).not.toContain("/home");
    expect(maskeleBildirim("Bağlantı https://ornek.test/a?t=1 kapandı")).not.toContain("https");
    expect(maskeleBildirim("Hesap ali@ornek.com bağlı")).not.toContain("@");
  });
  it("komut içeren metin tek cümlelik sade metne döner", () => {
    expect(maskeleBildirim("Çalıştır: powershell -File x.ps1")).toBe(BILDIRIM_GIZLI);
    expect(maskeleBildirim("codex exec --full-auto görev")).toBe(BILDIRIM_GIZLI);
    expect(maskeleBildirim("")).toBe(BILDIRIM_GIZLI);
  });
});
