import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
import { alphaAt, decodePng } from "./png.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "test-results", "screenshots");
const PANEL = { w: 720, h: 320 };

const cases = ["idle", "working", "waiting", "paused", "success", "error", "disconnected", "quota",
  "petit", "hidden", "stale", "quota-panel", "busy", "hata-karti", "selam"];
const expectedExpressions = {
  idle: "idle", working: "working", waiting: "thinking", paused: "paused", success: "happy", error: "error",
  disconnected: "idle", quota: "alert", petit: "working", hidden: "working", busy: "working",
  "hata-karti": "error", stale: "working", "quota-panel": "working", selam: "idle",
};

// A Windows display scale turns the 720x320 logical window into fewer CSS
// pixels whenever the native side and the webview disagree about the DPI. Each
// entry is that mismatch, which is exactly the case the user reported.
const scales = [1, 1.25, 1.5, 1.75, 2];
// Monitor sizes the island has to fit on; the window keeps its own size and is
// placed at the horizontal centre of the monitor, as island.rs does.
const monitors = [{ name: "1366x768", width: 1366, height: 768 }, { name: "1920x1080", width: 1920, height: 1080 }];

const viewports = [
  ...scales.map(scale => ({ name: `dpi-${String(scale).replace(".", "_")}x`, width: Math.round(PANEL.w / scale), height: Math.round(PANEL.h / scale), scale })),
  ...monitors.map(monitor => ({ name: `monitor-${monitor.name}`, width: monitor.width, height: monitor.height, scale: 1, monitor })),
];

const errors = [];
const results = [];
const proofs = [];

await mkdir(output, { recursive: true });
const server = await createServer({
  root, configLoader: "runner",
  // The isolated fixture imports native ESM dependencies directly. Avoid
  // scanning legacy/non-build HTML and sandbox-sensitive optimizer traversal.
  optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
  server: {
    port: 0, strictPort: false, host: "127.0.0.1",
    watch: { ignored: /(?:^|[\\/])(?:target|dist|test-results)(?:[\\/]|$)/ },
  },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}`;

  for (const name of cases) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.scale });
      page.on("pageerror", (error) => errors.push(`${name}/${viewport.name}: ${error.message}`));
      page.on("console", (message) => { if (message.type() === "error") errors.push(`${name}/${viewport.name}: ${message.text()}`); });
      await page.goto(`${origin}/tests/preview.html?case=${name}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
      await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
      // Springs need to settle before capture; no native app or visible window is opened.
      await page.waitForTimeout(850);

      const tag = `${name}__${viewport.name}`;
      const ui = await page.evaluate(() => {
        const box = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const text = document.body.innerText;
        return {
          text,
          expression: window.afuTest.State.effectiveState,
          mode: document.getElementById("island")?.dataset.mode,
          view: document.getElementById("island")?.dataset.view,
          fit: Number(getComputedStyle(document.getElementById("island")).getPropertyValue("--fit")) || 1,
          count: window.afuTest.State.snapshot.tasks.length,
          current: window.afuTest.State.current.length,
          sourceUnavailable: window.afuTest.State.snapshot.sourceUnavailable,
          fsm: window.afuTest.island.fsm.state,
          rows: document.querySelectorAll(".other-tasks .task-row").length,
          summary: document.querySelector(".summary")?.textContent ?? "",
          viewport: { w: innerWidth, h: innerHeight },
          island: box("#island"),
          content: box("#content"),
          character: box("#afu-character"),
          header: box("header"),
          pills: box(".agent-pills"),
          lastPill: box(".agent-pills .agent-pill:last-child"),
          card: box(".main-task"),
          list: box(".other-tasks"),
          footer: box("footer"),
          images: [...document.images].map((img) => ({ src: img.getAttribute("src"), width: img.naturalWidth, height: img.naturalHeight })),
        };
      });

      // --- Expression and content contract -----------------------------------
      assert.equal(ui.expression, expectedExpressions[name], `${tag}: incorrect character expression`);
      assert.doesNotMatch(ui.text, /PID|429|traceback|secret|private|workspace|BU BASLIK|C:\\|https?:\/\//i, `${tag}: technical data leaked`);
      if (name !== "hidden" && name !== "petit") assert.match(ui.text, /Claude\s+KORUNUYOR/, `${tag}: locked Claude badge missing`);
      if (name === "working") {
        assert.equal(ui.count, 6, `${tag}: Claude fixture task must be filtered`);
        assert.equal(ui.rows, 3, `${tag}: the live secondary rows must be visible`);
      }
      if (name === "idle") assert.doesNotMatch(ui.text, /AfuNöbet bekleniyor/, `${tag}: a connected idle source should not appear disconnected`);
      if (name === "disconnected") assert.match(ui.text, /bekleniyor/i, `${tag}: missing state needs a short waiting message`);
      if (name === "quota") assert.match(ui.text, /Codex duraklatıldı\. Kota yenilenince devam edecek\./);
      if (name === "stale") {
        assert.equal(ui.current, 1, `${tag}: a missing update must keep the last valid task`);
        assert.equal(ui.sourceUnavailable, true);
        assert.match(ui.text, /AfuNöbet bekleniyor/);
      }
      if (name === "quota-panel") assert.match(ui.text, /%42/, `${tag}: measured quota must appear in its second-level panel`);

      // --- Rule 4: only live work on the main screen --------------------------
      if (name === "busy") {
        assert.equal(ui.count, 236, `${tag}: the archive fixture must reach the reader`);
        assert.doesNotMatch(ui.text, /\b231\b/, `${tag}: an old record count reached the main screen`);
        assert.doesNotMatch(ui.text, /Eski kayit/, `${tag}: a finished record was listed`);
        assert.doesNotMatch(ui.text, /\+\d+ (?:diger )?gorev/, `${tag}: the old "+N gorev" line is back`);
        assert.equal(ui.rows, 3, `${tag}: exactly the live rows are shown, capped at three`);
        assert.match(ui.summary, /^\d{1,2}\/\d{1,2} tamamlandı$/, `${tag}: summary counts only live work`);
      }
      // --- Rule 5: no raw file name on the failure card -----------------------
      if (name === "hata-karti") {
        assert.doesNotMatch(ui.text, /GOREV_UYGULA\.md|state\.ts/, `${tag}: a raw file name reached the failure card`);
        assert.match(ui.text, /Görev tamamlanamadı, yeniden deneyin/);
      }
      // --- Rule 6: no +N, at most three rows everywhere -----------------------
      if (ui.mode === "expanded") {
        assert.ok(ui.rows <= 3, `${tag}: at most three secondary rows`);
        assert.doesNotMatch(ui.text, /\+\d+ (?:diger )?gorev/, `${tag}: the archive counter is back`);
      }

      // --- Rules 1 and 3: nothing is clipped, nothing overlaps ----------------
      if (ui.island) {
        assert.ok(ui.island.x >= -0.5 && ui.island.right <= ui.viewport.w + 0.5,
          `${tag}: island leaves the window horizontally (${ui.island.x}..${ui.island.right} in ${ui.viewport.w})`);
        assert.ok(ui.island.bottom <= ui.viewport.h + 0.5,
          `${tag}: island leaves the window vertically (${ui.island.bottom} in ${ui.viewport.h})`);
        // The island hangs from the horizontal centre of the window, never the
        // left edge, at every display scale.
        assert.ok(Math.abs((ui.island.x + ui.island.width / 2) - ui.viewport.w / 2) <= 0.5,
          `${tag}: island is not centred`);
        if (ui.content) {
          assert.ok(ui.content.right <= ui.island.right + 0.5 && ui.content.bottom <= ui.island.bottom + 0.5,
            `${tag}: content is cut off by the island`);
        }
        if (ui.character && ui.content && ui.mode === "expanded") {
          assert.ok(ui.character.right <= ui.content.x + 0.5,
            `${tag}: the character column overlaps the content column`);
        }
        if (ui.pills && ui.lastPill) {
          assert.ok(ui.lastPill.right <= ui.pills.right + 0.5,
            `${tag}: the agent tabs are cut off at the end of the row`);
        }
        if (ui.header) {
          assert.ok(ui.header.right <= ui.content.right + 0.5, `${tag}: the header is cut off`);
        }
        if (ui.footer) {
          assert.ok(ui.footer.bottom <= ui.island.bottom + 0.5, `${tag}: the footer is cut off`);
        }
        if (ui.list && ui.footer) {
          assert.ok(ui.list.bottom <= ui.footer.y + 0.5, `${tag}: the task rows overlap the footer`);
        }
        if (ui.card && ui.footer) {
          assert.ok(ui.card.bottom <= ui.footer.y + 0.5, `${tag}: the main card overlaps the footer`);
        }
      }

      const file = path.join(output, `${tag}.png`);
      // omitBackground keeps the alpha channel, so the transparent corners the
      // desktop shows through can be checked as real pixels.
      await page.screenshot({ path: file, animations: "disabled", omitBackground: true });

      // --- Rule 7: rounded shape, transparent corners, no desktop rectangle --
      if (ui.island && ui.island.width > 4 && ui.island.height > 4) {
        const image = decodePng(await readFile(file));
        const corners = [
          [ui.island.x + 1, ui.island.y + 1],
          [ui.island.right - 1, ui.island.y + 1],
          [ui.island.x + 1, ui.island.bottom - 1],
          [ui.island.right - 1, ui.island.bottom - 1],
        ];
        for (const [x, y] of corners) {
          assert.equal(alphaAt(image, x * viewport.scale, y * viewport.scale), 0,
            `${tag}: a corner of the island is opaque and would show as a rectangle on the desktop`);
        }
        proofs.push({ case: name, viewport: viewport.name, cornersTransparent: true });
      }

      results.push({ name, viewport: viewport.name, ...ui, screenshot: path.relative(root, file).replaceAll("\\", "/") });
      await page.close();
    }
  }

  assert.deepEqual(errors, [], "Browser runtime errors");
  await writeFile(path.join(output, "manifest.json"), JSON.stringify({
    headless: true,
    nativeWindowsSmokeVerified: false,
    // Everything below is a headless layout proof, never a Windows smoke test.
    layoutProofs: {
      displayScales: scales,
      monitors: monitors.map((monitor) => monitor.name),
      screenshots: results.length,
      cornersTransparent: proofs.length,
      rules: [
        "content inside island inside window at every display scale",
        "island centred horizontally and hanging from the top edge",
        "character column never overlaps the content column",
        "tabs and rows never clipped at the end of a line",
        "island corners fully transparent",
        "only live work listed, at most three rows, no archive counter",
        "no raw file name on the failure card",
      ],
    },
    cases: results,
    errors,
  }, null, 2) + "\n");
  console.log(`Headless screenshots passed: ${results.length} captures (${cases.length} states x ${viewports.length} viewports); manifest: test-results/screenshots/manifest.json`);
} finally {
  await browser?.close();
  await server.close();
}
