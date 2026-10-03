import { it, expect } from "vitest";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

// The later cropping behavior was explicitly withdrawn; the pet keeps the full frame.
// The old-EXE reference (docs/kanit/pet_geri/reference.css + extraction manifest) was
// lost in the 3 Oct git clean and the pet images were intentionally replaced on 3 Oct,
// so the geometry is asserted against the shipped CSS contract, not image hashes.
it("keeps the full pet frame, size and bottom anchor at 100/125/150 percent DPI", async () => {
  const current = readFileSync("src/style.css", "utf8");
  const frames = ["idle_normal", "idle_nefes", "idle_goz_kapali", "akis_tutunma", "akis_bekleme", "akis_suzulme"];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const scale of [1, 1.25, 1.5]) for (const frame of frames) {
      const source = readFileSync(`public/afu/pet/${frame}.webp`);
      const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: scale });
      await page.setContent(`<style>${current} *{animation:none!important;transition:none!important}</style>
        <button id="afu-pet" data-pose="bekleme"><img class="pet-image" src="data:image/webp;base64,${source.toString("base64")}"></button>`);
      await page.locator("img").evaluate((img: HTMLImageElement) => img.decode());
      const geometry = await page.evaluate(() => {
        const p = document.querySelector("#afu-pet")!.getBoundingClientRect();
        const i = document.querySelector("img")!;
        const r = i.getBoundingClientRect();
        return { pet: [p.x, p.y, p.width, p.height], image: [r.x, r.y, r.width, r.height], fit: getComputedStyle(i).objectFit, position: getComputedStyle(i).objectPosition };
      });
      await page.close();
      expect(geometry.pet).toEqual([0, 0, 256, 256]);
      expect(geometry.image).toEqual(geometry.pet);
      expect(geometry.fit).toBe("contain");
      expect(geometry.position).toBe("50% 100%");
    }
  } finally { await browser.close(); }
}, 60000);
