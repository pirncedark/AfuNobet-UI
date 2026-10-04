// GOREV_P8_KART_BUYUT: kart 1,5 kat buyutuldu; yazi alt sinirlari, saglik
// seridi haplar ve Claude koprusunun TEK kaynagi.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DESIGN_H, DESIGN_W, EXPANDED_W, KART_OLCEK, PANEL_H, PANEL_W, fitScale, islandSize } from "../src/core/layout";
import { KOPRU_PENCERE, kopruDurumu } from "../src/core/kopru";

const css = readFileSync("src/style.css", "utf8");
const island = readFileSync("src/island/island.ts", "utf8");
const views = readFileSync("src/views/views.ts", "utf8");
const mesaj = readFileSync("src/message/message.ts", "utf8");
const dpi = readFileSync("src-tauri/src/dpi.rs", "utf8");

describe("kart 1,5 kat", () => {
  it("tek ölçek değişkeni tasarımın 1,5 katı", () => {
    expect(KART_OLCEK).toBe(1.5);
    expect(DESIGN_W).toBe(720);
    expect(DESIGN_H).toBe(320);
    expect(PANEL_W).toBe(DESIGN_W * KART_OLCEK);
    expect(PANEL_H).toBe(DESIGN_H * KART_OLCEK);
  });
  it("pencere büyür, ada çizimi tasarım biriminde kalır (zoom büyütür)", () => {
    expect(islandSize("expanded", "overview")).toEqual({ w: EXPANDED_W, h: DESIGN_H });
    expect(EXPANDED_W * KART_OLCEK).toBeLessThan(PANEL_W);
    expect(DESIGN_H * KART_OLCEK).toBeLessThanOrEqual(PANEL_H);
  });
  it("Rust tarafındaki pencere ölçüsü ön yüzle aynı (island.rs'e dokunulmadan)", () => {
    expect(dpi).toContain("const KART_OLCEK: f64 = 1.5;");
    expect(dpi).toContain("const PANEL_W: f64 = 720.0 * KART_OLCEK;");
    expect(dpi).toContain("const PANEL_H: f64 = 320.0 * KART_OLCEK;");
    const korunmus = readFileSync("src-tauri/src/island.rs", "utf8");
    expect(korunmus).toContain("pub const PANEL_W: f64 = 720.0;");
  });
  it("DPI uyumsuzluğunda kart yine pencereye sığar", () => {
    for (const k of [1, 1.25, 1.5, 2]) {
      const fit = fitScale(PANEL_W / k, PANEL_H / k);
      expect(fit).toBeLessThanOrEqual(1);
      expect(EXPANDED_W * fit * KART_OLCEK).toBeLessThanOrEqual(PANEL_W / k + 0.001);
    }
    expect(fitScale(PANEL_W, PANEL_H)).toBe(1);
  });
  it("ölçek değişkeni ada CSS zoom olarak uygulanır, tıklama kutusu onunla çarpılır", () => {
    expect(css).toContain("zoom:var(--kart-olcek,1)");
    expect(island).toContain('this.islandEl.style.setProperty("--kart-olcek", String(zoom))');
    expect(island).toContain("this.mode === \"expanded\" ? KART_OLCEK : 1");
    // hit.ts: kart açıkken tıklama kutusu pencerenin tamamı. P10'dan beri pet
    // modunda balonun üstündeki boş pay (PET_BALON_PAY) kutunun dışında kalır.
    const hit = readFileSync("src/core/hit.ts", "utf8");
    expect(hit).toContain('if (mode === "expanded") return { x: 0, y: 0, w: viewport.w, h: viewport.h }');
    expect(hit).toContain("petUstPay = 0");
  });
});

describe("yazi alt sınırları", () => {
  // `font-size: 9px` ve `font-size: 9px` (boşluklu) ikisini de yakalamalı:
  // yalnız yapışık yazımı aramak 8 px'lik kuralı gözden kaçırıyordu.
  const px = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]));
  it("en küçük yazı 1,5 sonrası 13 px'ten küçük değil", () => {
    expect(Math.min(...px)).toBeGreaterThanOrEqual(13 / KART_OLCEK);
    expect(Math.min(...px) * KART_OLCEK).toBeGreaterThanOrEqual(13);
  });
  it("her CSS dosyasında en küçük yazı 1,5 sonrası 13 px'ten küçük değil", () => {
    for (const dosya of ["src/style.css", "src/apps.css", "src/chat.css", "src/question/question.css", "src/sor/sor.css", "src/message/message.css"]) {
      const hepsi = [...readFileSync(dosya, "utf8").matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]));
      expect(hepsi.length, dosya).toBeGreaterThan(0);
      expect(Math.min(...hepsi) * KART_OLCEK, dosya).toBeGreaterThanOrEqual(13);
    }
  });
  it("alt menü ve sayfa düğmeleri 1,5 sonrası 14 px'ten küçük değil", () => {
    const alt = /\.more-menu \.menu-item\{[^}]*font-size:(\d+)px/.exec(css);
    const sayfa = /footer \.page-button\{[^}]*font-size:(\d+)px/.exec(css);
    const dugme = /(?:^|\})\s*\.text-button\{[^}]*font-size:(\d+)px/.exec(css);
    for (const m of [alt, sayfa, dugme]) {
      expect(m).toBeTruthy();
      expect(Number(m![1]) * KART_OLCEK).toBeGreaterThanOrEqual(14);
    }
  });
  it("başlık 1,5 sonrası 20 px'ten küçük değil", () => {
    const baslik = Number(/h1\{font-size:(\d+)px/.exec(css)![1]);
    expect(baslik * KART_OLCEK).toBeGreaterThanOrEqual(20);
  });
});

describe("sağlık şeridi", () => {
  it("rozet olarak çizilir, ham metin değil", () => {
    expect(views).toContain('class: `health-pill${ok ? " ok" : " kapali"}`');
    expect(css).toContain(".health-strip{display:flex");
    expect(css).toContain(".health-pill.ok{");
    expect(css).toContain(".health-pill.kapali{");
  });
  it("Claude için tek kaynak: üstteki bağlantı satırı kaldırıldı", () => {
    expect(views).toContain("kopruDurumu(");
    expect(mesaj).not.toContain("afu-baglanti");
    expect(mesaj).not.toContain("Afu bağlantısı");
  });
});

describe("kopru kaynağı", () => {
  const now = 1_000_000_000;
  const gorev = (updatedAt: number | null) => [{ agent: "claude" as const, updatedAt }];
  it("son 5 dakikada mesaj varsa bağlı", () => {
    expect(kopruDurumu([{ ajan: "claude", zaman: now - 1000 }], [], now).bagli).toBe(true);
  });
  it("son 5 dakikada ada canlı iş varsa bağlı", () => {
    expect(kopruDurumu([], gorev(now - 2000), now).bagli).toBe(true);
  });
  it("beş dakikadan eski sinyal bağlı sayılmaz", () => {
    expect(kopruDurumu([{ ajan: "claude", zaman: now - KOPRU_PENCERE }], [], now).bagli).toBe(false);
    expect(kopruDurumu([], gorev(now - KOPRU_PENCERE), now).bagli).toBe(false);
  });
  it("başka ajanın sinyali Claude sayılmaz", () => {
    expect(kopruDurumu([{ ajan: "codex", zaman: now - 1000 }], [{ agent: "codex", updatedAt: now - 1000 }], now).bagli).toBe(false);
  });
  it("gelecek/bozuk zaman damgası bağlantı sayılmaz", () => {
    expect(kopruDurumu([{ ajan: "claude", zaman: now + 60_000 }], gorev(Number.NaN), now).bagli).toBe(false);
  });
});
