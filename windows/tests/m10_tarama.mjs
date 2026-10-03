// M10: tek tıkla tüm ekran taraması. Gerçek ürün DOM/CSS, başsız Chromium.
// Her ekran %100 ve %150, 640 ve 420 genişlikte açılır; her karede beş otomatik
// kontrol çalışır ve PNG olarak test-results/m10 altına yazılır.
// Kullanım: node tests/m10_tarama.mjs
import { createServer } from "vite";
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.resolve(process.argv[2] || path.join(root, "test-results/m10"));
await mkdir(out, { recursive: true });

const log = [];
const say = line => { log.push(String(line)); console.log(line); };

// Ekran tanımları: ad, preview.html case'i, ürüne özel hazırlık ve gerçek tıklamalar.
const ekranlar = [
  { ad: "genel-bakis", case: "working" },
  { ad: "gorev-karti", case: "uzun" },
  { ad: "kota", case: "working", adimlar: [p => p.locator("footer .page-button", { hasText: "Kota" }).first().click()] },
  { ad: "uygulamalar", case: "working", adimlar: [p => p.locator("footer .page-button", { hasText: "Uygulamalar" }).first().click(), p => p.waitForTimeout(400)] },
  { ad: "orkestra", case: "working", adimlar: [p => p.locator("footer .page-button", { hasText: "Orkestra" }).first().click(), p => p.locator(".orkestra-input").waitFor(), p => p.locator(".orkestra-input").fill("M10 ekran taramasi")] },
  { ad: "sohbet", case: "sohbet" },
  { ad: "sesli-sohbet", case: "sohbet", adimlar: [p => p.getByRole("button", { name: "Sesli sohbeti başlat" }).click(), p => p.getByText("Dinliyor…", { exact: true }).waitFor()] },
  { ad: "daha-fazla", case: "working", adimlar: [p => p.locator(".more-button").click()] },
  { ad: "ayarlar", case: "working", adimlar: [p => p.locator(".more-button").click(), p => p.locator(".menu-advanced summary").click()] },
  { ad: "gorev-ara", case: "busy", adimlar: [p => p.locator(".search-button").click(), p => p.locator(".search-input").fill("a"), p => p.waitForTimeout(250)] },
  { ad: "soru-karti", case: "soru" },
  { ad: "mesaj-ayrintisi", case: "quota", adimlar: [p => p.locator(".main-task").click(), p => p.waitForTimeout(250)] },
  {
    ad: "pet-balon", case: "working",
    hazirla: async () => {
      const { island } = window.afuTest;
      const { showNotification } = await import("/src/message/notifications.ts");
      island.fsm.toPet();
      const text = "Codex: Tarama hazır\n- Gerçek ekranlar alındı\n- Görseller kontrol edildi";
      showNotification({ id: "m10-balon", type: "notification", timestamp: Date.now(), text, ajan: "codex",
        raw: { surum: 1, id: "m10-balon", ajan: "codex", tur: "bilgi", metin: text, zaman: Date.now() } });
    },
    adimlar: [p => p.waitForTimeout(2400)],
  },
  {
    ad: "tepsi-durum", case: "working",
    hazirla: async () => {
      // Tepsi paneli gerçek kodla çalışsın: yerel Tauri köprüsü taklit edilir.
      const geriCagiran = new Map(); const dinleyiciler = new Map(); let sira = 1;
      window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
      window.__afuEmit = (olay, yuk) => {
        for (const id of dinleyiciler.get(olay) || []) (geriCagiran.get(id) || (() => {}))({ event: olay, id, payload: yuk });
      };
      window.__TAURI_INTERNALS__ = {
        invoke: async (cmd, args) => {
          if (cmd === "plugin:event|listen") { const l = dinleyiciler.get(args.event) || []; l.push(args.handler); dinleyiciler.set(args.event, l); return args.handler; }
          if (cmd === "plugin:event|unlisten") return null;
          if (cmd.startsWith("plugin:")) return null;
          if (cmd === "bildirim_ayarlari") return { muted: false };
          if (cmd === "servis_github_refresh") return { service: "github", status: "success", label: "GitHub hazir", url: null };
          return null;
        },
        transformCallback: (cb, once) => { const id = sira++; geriCagiran.set(id, once ? d => { geriCagiran.delete(id); cb(d); } : cb); return id; },
        unregisterCallback: id => geriCagiran.delete(id),
        runCallback: (id, data) => { const cb = geriCagiran.get(id); if (cb) cb(data); },
        callbacks: geriCagiran, convertFileSrc: p => p,
        metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main", windowLabel: "main" } },
      };
      await import("/src/sistem.ts");
      await window.__afuEmit("system-status", {});
    },
    adimlar: [p => p.locator(".sistem-panel").waitFor(), p => p.waitForTimeout(300)],
  },
];

// %100/%150 ve 640/420: dört ayrı gerçek pencere ölçüsü.
const olculer = [{ etiket: "100-640", zoom: 1, genislik: 640, yukseklik: 620 },
  { etiket: "150-640", zoom: 1.5, genislik: 640, yukseklik: 700 },
  { etiket: "100-420", zoom: 1, genislik: 420, yukseklik: 760 },
  { etiket: "150-420", zoom: 1.5, genislik: 420, yukseklik: 820 }];

const ORTAK = async () => {
  const { island, State } = window.afuTest;
  const { Bridge } = await import("/src/core/bridge.ts");
  // Sağlayıcı yanıtları çevrimdışı; gerçek düğmeler aynı yollardan geçer.
  Bridge.codexStatus = async () => ({ status: "hazir", loggedIn: true, planType: null, rateLimits: null });
  Bridge.voiceSupported = async () => ({ whisper: true, winrt_stt: false, tts: true, afu_tts: true });
  Bridge.voiceListenTurn = () => new Promise(() => {});
  Bridge.voiceCancel = async () => {};
  Bridge.voiceSilence = async () => {};
  Bridge.voiceChoices = async () => ({ ses: "Afu", filtre: "normal", chosen: true, available: ["Afu"] });
  Bridge.orkestraProjects = async () => ["AfuNobet-UI", "AfuNobet", "Orkestra"];
  Bridge.appsList = async () => ([
    { id: "afunobet", ad: "AfuNobet", kurulu: true, telefonda: true, durum: "calisiyor", ozet: "Bu is" },
    { id: "kanit", ad: "Kanit", kurulu: true, telefonda: false, durum: "bos", ozet: null },
    { id: "kamera", ad: "Kamera", kurulu: false, telefonda: false, durum: null, ozet: null },
  ]);
  State.setFocus(State.focusTask?.id ?? "focus");
  island.fsm.pinned = true;
};

// Sayfada çalışan denetim: beş kontrol, gerçek ölçülmüş değerler.
const DENETIM = giris => {
  const { zoom } = giris;
  const sorunlar = [];
  const kokler = ["#island", "#afu-pet", "#afu-pet-balon", "#afu-character"].map(s => document.querySelector(s))
    .filter(el => el && !el.hidden && el.getClientRects().length);
  const kok = kokler[0] ?? document.body;
  const ad = el => {
    if (el.id) return `#${el.id}`;
    const sinif = String(el.className || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
    return `${el.tagName.toLowerCase()}${sinif ? `.${sinif}` : ""}`;
  };
  const gorunur = el => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const hepsi = [...new Set(kokler.flatMap(k => [...k.querySelectorAll("*")]))].filter(gorunur);
  const dokunulabilir = hepsi.filter(el => el.matches("button, summary, a[href], input, textarea, select, [role=switch], [role=menuitem], [role=menuitemcheckbox], [tabindex]:not([tabindex='-1'])"));
  const kayan = el => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (["auto", "scroll"].includes(s.overflowX)) return true; } return false; };
  const kirpmaKapsam = el => { // kendi kırpması bilinçli kırpma sayılır
    for (let p = el; p; p = p.parentElement) { const s = getComputedStyle(p); if (["auto", "scroll"].includes(s.overflowX) || ["auto", "scroll"].includes(s.overflowY)) return true; }
    return false;
  };

  // 1) yatay taşma
  if (document.documentElement.scrollWidth > window.innerWidth + 1) {
    sorunlar.push({ tip: "yatay-tasma", nerede: "belge", olcu: `scrollWidth ${document.documentElement.scrollWidth} > ${window.innerWidth}` });
  }
  for (const el of hepsi) {
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1 || r.left < -1) {
      if (!kayan(el)) sorunlar.push({ tip: "yatay-tasma", nerede: ad(el), olcu: `sol ${r.left.toFixed(0)} sağ ${r.right.toFixed(0)} pencere ${window.innerWidth}` });
    }
  }
  // 2) kesik metin (kaydırılabilir alan ve title taşıyan öğeler muaf)
  for (const el of hepsi) {
    if (el.scrollWidth > el.clientWidth + 1 && !el.getAttribute("title") && !kirpmaKapsam(el) && el.textContent.trim()) {
      sorunlar.push({ tip: "kesik-metin", nerede: ad(el), olcu: `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}` });
    }
  }
  // 3) birbirine yapışık tıklanabilirler (<4px boşluk)
  const dikdortgen = el => { const r = el.getBoundingClientRect(); return { el, l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const kutular = dokunulabilir.map(dikdortgen);
  for (let i = 0; i < kutular.length; i++) for (let j = i + 1; j < kutular.length; j++) {
    const a = kutular[i], b = kutular[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const ortusX = Math.min(a.r, b.r) - Math.max(a.l, b.l), ortusY = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    const boslukY = Math.max(a.t, b.t) - Math.min(a.b, b.b), boslukX = Math.max(a.l, b.l) - Math.min(a.r, b.r);
    if (ortusX > 1 && boslukY < 4) sorunlar.push({ tip: "yapisik-dugme", nerede: `${ad(a.el)} | ${ad(b.el)}`, olcu: `dikey boşluk ${boslukY.toFixed(1)}px` });
    else if (ortusY > 1 && boslukX < 4) sorunlar.push({ tip: "yapisik-dugme", nerede: `${ad(a.el)} | ${ad(b.el)}`, olcu: `yatay boşluk ${boslukX.toFixed(1)}px` });
  }
  // 4) 28px'ten küçük tıklama alanı (mantıksal ölçü: zoom bölünür)
  for (const el of dokunulabilir) {
    const r = el.getBoundingClientRect();
    const g = r.width / zoom, y = r.height / zoom;
    if (g < 28 - 0.5 || y < 28 - 0.5) sorunlar.push({ tip: "kucuk-alan", nerede: ad(el), olcu: `${g.toFixed(0)}×${y.toFixed(0)}px` });
  }
  // 5) stilsiz düğme (buttonface / rgb(239,239,239) zemin veya outset kenarlık)
  for (const el of dokunulabilir) {
    const s = getComputedStyle(el);
    const zemin = s.backgroundColor;
    const stilsiz = zemin === "buttonface" || zemin === "rgb(239, 239, 239)" || /outset/.test(s.borderTopStyle + s.borderRightStyle + s.borderBottomStyle + s.borderLeftStyle);
    if (stilsiz) sorunlar.push({ tip: "stilsiz-dugme", nerede: ad(el), olcu: `background ${zemin} border ${s.borderTopStyle}` });
  }
  const ozet = {};
  for (const s of sorunlar) (ozet[s.tip] ??= []).push(s);
  return { sorunlar, ozet, kok: ad(kok), tiklanabilir: dokunulabilir.length, genislik: window.innerWidth };
};

const server = await createServer({
  root, configLoader: "runner",
  optimizeDeps: { noDiscovery: true, include: [], exclude: ["@tauri-apps/api"] },
  server: { port: 0, strictPort: false, host: "127.0.0.1", watch: { ignored: /(?:target|dist|test-results)/ } },
});
let browser;
const tablo = [];
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files", "--force-device-scale-factor=1"] });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const ekran of ekranlar) {
    const satirlar = [];
    for (const olcu of olculer) {
      const dosya = `${ekran.ad}-${olcu.etiket}.png`;
      const page = await browser.newPage({ viewport: { width: olcu.genislik, height: olcu.yukseklik }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      const sayfaHatalari = [];
      page.on("pageerror", e => sayfaHatalari.push(e.message));
      let denetim = { sorunlar: [], ozet: {} };
      try {
        await page.addInitScript(() => localStorage.setItem("afu-konusan-ipucu-v1", "seen"));
        await page.goto(`${origin}/tests/preview.html?case=${ekran.case}`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
        await page.evaluate(ORTAK);
        if (olcu.zoom !== 1) await page.evaluate(z => { document.body.style.zoom = String(z); }, olcu.zoom);
        if (ekran.hazirla) await page.evaluate(ekran.hazirla);
        await page.waitForTimeout(250);
        for (const adim of ekran.adimlar || []) await adim(page);
        await page.waitForTimeout(250);
        denetim = await page.evaluate(DENETIM, { zoom: olcu.zoom });
        if (sayfaHatalari.length) for (const m of sayfaHatalari) denetim.sorunlar.push({ tip: "sayfa-hatasi", nerede: "-", olcu: m });
        const kirp = await page.evaluate(() => {
          const rs = [...document.querySelectorAll("#island, #afu-pet, #afu-pet-balon, #afu-character")]
            .filter(el => el && !el.hidden && el.getClientRects().length).map(el => el.getBoundingClientRect());
          if (!rs.length) return undefined;
          const x = Math.max(0, Math.floor(Math.min(...rs.map(r => r.left))));
          const y = Math.max(0, Math.floor(Math.min(...rs.map(r => r.top))));
          return { x, y, width: Math.ceil(Math.max(...rs.map(r => r.right))) - x, height: Math.ceil(Math.max(...rs.map(r => r.bottom))) - y };
        });
        await page.screenshot({ path: path.join(out, dosya), ...(kirp ? { clip: kirp } : {}), omitBackground: true });
      } catch (error) {
        denetim.sorunlar.push({ tip: "hata", nerede: dosya, olcu: String(error).slice(0, 200) });
        await page.screenshot({ path: path.join(out, dosya), omitBackground: true }).catch(() => {});
      } finally { await page.close(); }
      satirlar.push({ olcu: olcu.etiket, dosya, ...denetim });
      sayfaHatalari.length && sayfaHatalari.forEach(m => say(`${ekran.ad}/${olcu.etiket} sayfa hatası: ${m}`));
    }
    const toplam = satirlar.reduce((n, s) => n + s.sorunlar.length, 0);
    tablo.push({ ekran: ekran.ad, satirlar, toplam });
    say(`\n=== ${ekran.ad} — ${toplam} sorun ===`);
    for (const s of satirlar) {
      const turler = Object.entries(s.ozet || {}).map(([t, liste]) => `${t}=${liste.length}`).join(" ") || "temiz";
      say(`  ${s.olcu.padEnd(8)} ${String(s.sorunlar.length).padStart(3)} sorun  ${turler}`);
      for (const sorun of [...new Map(s.sorunlar.map(x => [`${x.tip}|${x.nerede}|${x.olcu}`, x])).values()].slice(0, 12)) {
        say(`      - ${sorun.tip} ${sorun.nerede} (${sorun.olcu})`);
      }
    }
  }
} finally {
  await browser?.close();
  await server.close();
}

// Tema sayfası: tüm kareler tek PNG'de.
const kareler = tablo.flatMap(t => t.satirlar.map(s => ({ ekran: t.ekran, ...s })));
const etiket = k => `${k.ekran} · ${k.olcu} · ${k.sorunlar.length} sorun`;
const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><title>M10 tarama</title>
<style>
body{margin:0;padding:14px;background:#0a0f18;color:#dce6f5;font:12px/1.4 "Segoe UI",system-ui,sans-serif}
h1{font-size:16px;margin:0 0 10px}
.izgara{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
figure{margin:0;background:#111a2b;border:1px solid #ffffff1a;border-radius:10px;padding:6px}
figcaption{font-size:11px;color:#9db0cc;padding:4px 2px 2px;word-break:break-word}
img{width:100%;display:block;background:#000;border-radius:6px}
.kotu figcaption{color:#ff9d9d}
</style><h1>M10 · tüm ekranlar · %100/%150 · 640/420</h1><div class="izgara">
${kareler.map(k => `<figure class="${k.sorunlar.length ? "kotu" : ""}"><img src="${pathToFileURL(path.join(out, k.dosya)).href}"><figcaption>${etiket(k)}</figcaption></figure>`).join("\n")}
</div></html>`;
const sayfaYolu = path.join(out, "hepsi.html");
await writeFile(sayfaYolu, html, "utf8");
{
  const sayfa = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] });
  const sekme = await sayfa.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
  await sekme.goto(pathToFileURL(sayfaYolu).href, { waitUntil: "load" });
  await sekme.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
  await sekme.screenshot({ path: path.join(out, "hepsi.png"), fullPage: true });
  await sekme.close(); await sayfa.close();
}

// Ekran × sorun sayısı tablosu.
say("\n\nSONUÇ TABLOSU (ekran × sorun sayısı)");
say("| ekran | 100-640 | 150-640 | 100-420 | 150-420 | toplam |");
say("|---|---:|---:|---:|---:|---:|");
for (const t of tablo) {
  const hucre = olucum => String(t.satirlar.find(s => s.olcu === olucum)?.sorunlar.length ?? "-");
  say(`| ${t.ekran} | ${hucre("100-640")} | ${hucre("150-640")} | ${hucre("100-420")} | ${hucre("150-420")} | ${t.toplam} |`);
}
const genelToplam = tablo.reduce((n, t) => n + t.toplam, 0);
say(`\nToplam sorun: ${genelToplam}`);
const turToplam = {};
for (const t of tablo) for (const s of t.satirlar) for (const [tur, liste] of Object.entries(s.ozet || {})) turToplam[tur] = (turToplam[tur] || 0) + liste.length;
say("Türe göre: " + (Object.entries(turToplam).map(([t, n]) => `${t}=${n}`).join(", ") || "-"));
say(`\nPNG'ler: ${out}`);
say(`Tema sayfası: ${path.join(out, "hepsi.png")}`);

await writeFile(path.join(out, "SONUC_M10_TARAMA.md"), `# M10 tarama raporu\n\n${log.join("\n")}\n`, "utf8");
await writeFile(path.join(out, "tarama.json"), JSON.stringify({ toplam: genelToplam, tablo }, null, 2), "utf8");
const beklenen = await readFile(path.join(out, "hepsi.png")).then(b => `${b.readUInt32BE(16)}×${b.readUInt32BE(20)} bayt ${b.length}`).catch(() => "yok");
say(`Tema sayfası ölçüsü: ${beklenen}`);
process.exitCode = genelToplam === 0 ? 0 : 1;
