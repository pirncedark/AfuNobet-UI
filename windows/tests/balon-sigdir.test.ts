import { expect, it } from "vitest";
import { Window } from "happy-dom";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { balonOlustur, petBalonMetniniSigdir } from "../src/message/message";

it("145px önizleme uzun başlıkla iki tam madde gösterir", async () => {
  const doc = new Window().document;
  const text = '🎯 Görev terminalde yürüyor, ben bekliyorum\n1. Görev terminale gönderildi\n2. tsc temiz\n3. Sonuç bekleniyor';
  const balloon = balonOlustur(doc as unknown as Document, { surum: 1, id: 'preview', ajan: 'codex', tur: 'bilgi', metin: text, zaman: 0 }, () => {}, () => {}, 1);
  expect(balloon.querySelectorAll('li')).toHaveLength(2);
  expect(balloon.title).toContain(text.split('\n')[0]);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${readFileSync('src/message/message.css', 'utf8')}</style><div id="afu-character" style="position:relative;width:145px">${balloon.outerHTML}</div>`);
    const result = await page.evaluate(() => {
      const box = document.querySelector('.afu-konusma-balonu')!.getBoundingClientRect();
      const title = document.querySelector('.soru-baslik')!;
      return { height: box.height, titleHeight: title.getBoundingClientRect().height,
        clamp: getComputedStyle(title).webkitLineClamp,
        rows: [...document.querySelectorAll('li')].map(row => {
          const r = row.getBoundingClientRect();
          return r.height === 15 && r.top >= box.top && r.bottom <= box.bottom - 19;
        }) };
    });
    expect(result.height).toBeLessThanOrEqual(104);
    expect(result.titleHeight).toBe(15);
    expect(result.clamp).toBe('1');
    expect(result.rows).toEqual([true, true]);
  } finally { await browser.close(); }
});

it("pet shows the entire long question and keeps reply controls visible", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const length of [120, 600]) {
      const text = "Mesaj ".repeat(length / 6);
      const full = `${text}Hangisi?\n1 = Birinci\n2 = Ä°kinci\n3 = ÃœÃ§Ã¼ncÃ¼`;
      const doc = new Window().document;
      const host = doc.createElement("div"); host.id = "afu-pet-balon";
      host.append(balonOlustur(doc as unknown as Document, { surum: 1, id: "fit", ajan: "claude", tur: "bitti", metin: full, zaman: 1 }, () => {}, () => {}, 0));
      petBalonMetniniSigdir(host as unknown as HTMLElement);
      const expected = full.replace(/\s+/g, " ").trim();
      expect(host.querySelector(".afu-balon-metin")!.textContent!.replace(/\s+/g, " ").trim()).toBe(expected);
      expect(host.querySelector(".afu-balon-metin")!.textContent!.endsWith("â€¦")).toBe(false);
      expect(host.querySelectorAll(".soru-secenekler button")).toHaveLength(3);
      const page = await browser.newPage({ viewport: { width: 320, height: 600 } });
      await page.setContent(`<style>${readFileSync("src/message/message.css", "utf8")}</style>${host.outerHTML}`);
      const geometry = await page.evaluate(() => {
        const host = document.querySelector<HTMLElement>("#afu-pet-balon")!;
        host.style.setProperty("--pet-balon-h", "180px");
        const box = host.firstElementChild!.getBoundingClientRect();
        const text = host.querySelector<HTMLElement>(".afu-balon-metin")!;
        return { height: box.height, scroll: text.scrollHeight, client: text.clientHeight,
          overflow: getComputedStyle(text).overflowY,
          controls: [...host.querySelectorAll(".soru-secenekler button,input")].map(e => {
            const r = e.getBoundingClientRect(); return r.top >= box.top && r.bottom <= box.bottom;
          }) };
      });
      expect(geometry.height).toBeLessThanOrEqual(180);
      expect(geometry.controls.every(Boolean)).toBe(true);
      if (length === 600) expect(geometry.scroll).toBeGreaterThan(geometry.client);
      if (geometry.scroll > geometry.client) expect(geometry.overflow).toBe("auto");
      await page.close();
    }
  } finally { await browser.close(); }
});

it.each([120, 600])("ordinary %i-character messages stay complete", length => {
  const doc = new Window().document;
  const host = doc.createElement("div");
  const text = "Mesaj ".repeat(length / 6).trim();
  host.append(balonOlustur(doc as unknown as Document, { surum: 1, id: "fit", ajan: "codex", tur: "bilgi", metin: text, zaman: 1 }, () => {}));
  petBalonMetniniSigdir(host as unknown as HTMLElement);
  expect(host.querySelector(".afu-balon-metin")!.textContent).toBe(text);
});

