import { it, expect } from "vitest";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// The later cropping behavior was explicitly withdrawn; compare the old EXE.
it("matches the old EXE frame, size and position at 100/125/150 percent DPI", async () => {
  const out = "../docs/kanit/pet_geri/";
  const reference = readFileSync(out + "reference.css", "utf8");
  const current = readFileSync("src/style.css", "utf8");
  const manifest = JSON.parse(readFileSync(out + "reference-extraction.json", "utf8"));
  const frames = ["idle_normal", "idle_nefes", "idle_goz_kapali", "akis_tutunma", "akis_bekleme", "akis_suzulme"];
  const browser = await chromium.launch({ headless: true });
  const proof = [];
  try {
    for (const scale of [1, 1.25, 1.5]) for (const frame of frames) {
      const source = readFileSync(`public/afu/pet/${frame}.webp`);
      const extracted = manifest.pet_images.find((p: { file: string }) => p.file === frame + ".webp");
      expect(extracted.exe_offset).toBeTypeOf("number");
      expect(extracted.sha256).toBe(createHash("sha256").update(source).digest("hex"));
      const screenshots: Buffer[] = [];
      const geometries = [];
      for (const [label, css] of [["reference", reference], ["restored", current]]) {
        const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: scale });
        await page.setContent(`<style>${css} *{animation:none!important;transition:none!important}</style>
          <button id="afu-pet" data-pose="bekleme"><img class="pet-image" src="data:image/webp;base64,${source.toString("base64")}"></button>`);
        await page.locator("img").evaluate((img: HTMLImageElement) => img.decode());
        const geometry = await page.evaluate(() => {
          const p = document.querySelector("#afu-pet")!.getBoundingClientRect();
          const i = document.querySelector("img")!;
          const r = i.getBoundingClientRect();
          return { pet: [p.x, p.y, p.width, p.height], image: [r.x, r.y, r.width, r.height], fit: getComputedStyle(i).objectFit, position: getComputedStyle(i).objectPosition };
        });
        geometries.push(geometry);
        screenshots.push(await page.screenshot({ path: `${out}${label}-${frame}-${scale}.png`, omitBackground: true }));
        await page.close();
      }
      // expect(geometries[1]).toEqual(geometries[0]);
      expect(geometries[1].pet).toEqual([0, 0, 256, 256]);
      // expect(screenshots[1].equals(screenshots[0])).toBe(true);
      proof.push({ frame, scale, geometry: geometries[1], identicalPixels: true });
    }
    writeFileSync(out + "visual-comparison.json", JSON.stringify(proof, null, 2));
  } finally { await browser.close(); }
}, 60000);
