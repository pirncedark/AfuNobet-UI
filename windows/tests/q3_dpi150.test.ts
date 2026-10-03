// Q3: %150 ölçek ve küçük ekran kontrolü (plan F14).
// Kural: 1280x720 @1.5 ve 1366x768 @1.0 altında kritik kontroller (ana düğme,
// kapat, seçenekler, alt menü) görünür ve tıklanabilir kalmalı; sohbetin
// yazma alanı ve Gönder düğmesi kaydırma ne olursa olsun altta sabit durmalı.
// CSS kuralı headless Vitest'te ölçülemez (jsdom kullanılmaz), bu yüzden
// kuralın KAYNAKTA bulunduğu ve ölçüm betiğinin gerçekten tıklama denetlediği
// sınanır; sayısal doğrulama `scripts/q3-kanit.mjs` ile alınır (docs/kanit/q3).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EXPANDED_W, KART_OLCEK, PANEL_H, PANEL_W, fitScale, islandSize } from "../src/core/layout";

/** Ada açık hali (overview) — kanıtta ölçülen çizim kutusu bu. */
const EXPANDED_H = islandSize("expanded", "overview").h;

const kok = (yol: string) => fileURLToPath(new URL(yol, import.meta.url));
const chatCss = readFileSync(kok("../src/chat.css"), "utf8");
const kanit = readFileSync(kok("../scripts/q3-kanit.mjs"), "utf8");

/** Seçicinin geçtiği TÜM kurallarda özellik var mı (aynı seçici birden çok kez
 *  kurulabilir; kural yalnız ilk oluşumda aranırsa sonraki kurallar görülmez). */
function kuralVar(secici: string, ozellik: string) {
  const govde = ozellik.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let bulundu = false, i = chatCss.indexOf(secici);
  while (i !== -1) {
    const son = chatCss.indexOf("}", i);
    if (son === -1) break;
    if (new RegExp(`(?:^|[;{]\\s*|\\s)${govde}\\s*:`).test(chatCss.slice(i, son))) bulundu = true;
    i = chatCss.indexOf(secici, son);
  }
  return bulundu;
}

describe("Q3 ölçek: panel ölçüleri", () => {
  it("kart 1080x480 pencerede, 1,5 kat çizilir; 1280x720 @%150 alanına sığar", () => {
    expect(PANEL_W).toBe(1080);
    expect(PANEL_H).toBe(480);
    expect(KART_OLCEK).toBe(1.5);
    // Çizilen ölçü EXPANDED_W x KART_OLCEK (ölçümde 960x429). Pencere
    // PANEL_W kadardır; kart 1,5 kat çizilip ortalanır.
    expect(EXPANDED_W * KART_OLCEK).toBeLessThanOrEqual(PANEL_W);
    expect(EXPANDED_H * KART_OLCEK).toBeLessThanOrEqual(PANEL_H);
    // 1280x720 @1.5 -> CSS görüntü alanı yine 1280x720; kart sığmalı.
    expect(EXPANDED_W * KART_OLCEK).toBeLessThanOrEqual(1280);
    expect(EXPANDED_H * KART_OLCEK).toBeLessThanOrEqual(720);
  });

  it("fitScale 1280x720 ve 1366x768'de 1 (küçültme yok)", () => {
    expect(fitScale(1280, 720)).toBe(1);
    expect(fitScale(1366, 768)).toBe(1);
  });

  it("gerçek pencere ölçüsünde de 1; çok küçük alanda küçültür", () => {
    expect(fitScale(PANEL_W, PANEL_H)).toBe(1);
    expect(fitScale(640, 320)).toBeLessThan(1);
  });
});

describe("Q3 sohbet düzeni: yazma alanı ve Gönder altta sabit", () => {
  it("eylem satırı panelin altına yapışkan", () => {
    expect(kuralVar(".chat-actions{", "position")).toBe(true);
    expect(kuralVar(".chat-actions{", "bottom")).toBe(true);
  });

  it("yazma alanı eylem satırının tam üstüne yapışkan", () => {
    expect(kuralVar(".chat-input{", "position")).toBe(true);
    expect(kuralVar(".chat-input{", "bottom")).toBe(true);
  });

  it("yanıt kalan boşluğu doldurur ama sıfıra düşmez", () => {
    expect(kuralVar(".chat-answer{", "flex")).toBe(true);
    expect(kuralVar(".chat-answer{", "min-height")).toBe(true);
    expect(kuralVar(".chat-answer{", "overflow")).toBe(true);
  });

  it("panel kaydırma kabuğudur; kapat düğmesi üstte sabit", () => {
    expect(kuralVar(".chat-panel{", "overflow-y")).toBe(true);
    expect(kuralVar(".chat-close{", "position")).toBe(true);
    expect(kuralVar(".chat-close{", "top")).toBe(true);
  });

  it("yazma alanının yüksekliği `rows` özniteliğine değil CSS'e bağlı", () => {
    expect(kuralVar(".chat-input{", "height")).toBe(true);
    expect(kuralVar(".chat-input{", "min-height")).toBe(true);
  });
});

describe("Q3 kanıt betiği gerçekten tıklama denetliyor", () => {
  it("iki hedefi de (1280x720 @1.5, 1366x768 @1.0) kapsar", () => {
    expect(kanit).toContain("1280x720-yuzde150");
    expect(kanit).toContain("1366x768-yuzde100");
    expect(kanit).toMatch(/scale:\s*1\.5/);
    expect(kanit).toMatch(/scale:\s*1\b/);
  });

  it("dört yüzeyi de çizer: kart, sohbet, soru kartı, mini pet", () => {
    for (const yuzey of ["working", "sohbet", "soru", "petit"]) expect(kanit).toContain(`"${yuzey}"`);
  });

  it("görünürlük yerine elementFromPoint ile TIKLANABILIRLIK ölçer", () => {
    expect(kanit).toContain("elementFromPoint");
    expect(kanit).toContain("tiklanir");
    // Kaba ölçüm yeterli değil: merkez noktası başka bir öğeyi bulursa "tıklanamaz".
    expect(kanit).toContain("ustte");
  });

  it("taşan kutu ve pencere kaydırmasını da raporlar", () => {
    expect(kanit).toContain("tasan");
    expect(kanit).toContain("scrollWidth");
    expect(kanit).toContain("scrollHeight");
  });

  it("görünür pencere açmaz (yalnız headless Chromium)", () => {
    expect(kanit).toContain("headless: true");
    expect(kanit).not.toContain("headless: false");
  });
});