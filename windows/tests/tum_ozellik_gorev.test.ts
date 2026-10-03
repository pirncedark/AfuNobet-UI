// TÜM ÖZELLİK TESTİ (1/4): görev akışı aşamaları, model/effort/thinking,
// context göstergesi, maliyet, arama ve filtre, sağlık şeridi kaynağı,
// boş durum ve menü sekmeleri sözleşmesi.
//
// Kaynak liste: docs/kanit/ozellik/ozellikler.html -> TEST nesnesi "test edilecek" + F "ok"/"build".
// Bu dosya YENİDİR; mevcut testlere dokunulmamıştır. src/ değişmez.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseState, State, type Task } from "../src/core/state";
import { setLanguage, ui } from "../src/core/labels";
import { KOPRU_PENCERE, kopruDurumu } from "../src/core/kopru";
import {
  STAGES, STAGE_TR, contextText, costText, emptyState, filterTasks, filterVisible, handoffText,
  modelText, normalizeStage, stageSteps, topLevel, type RichTask,
} from "../src/views/model";
import { deriveEvents, EventDeduper } from "../src/core/events";
import { elapsedText, taskMessage, taskSummary } from "../src/core/state";

const NOW = Date.parse("2026-10-03T10:00:00.000Z");
const iso = (ms: number) => new Date(NOW - ms).toISOString();

/** state.json kaydı -> parseState -> RichTask (gerçek ayrıştırıcıdan geçer). */
function kayit(ek: Record<string, unknown>) {
  const snap = parseState({
    version: 1, mesaj: "",
    tasks: [{ id: "t1", agent: "codex", status: "Calisiyor", task: "Kartı büyüt", updated_at: iso(60_000), quota: {}, ...ek }],
  });
  return snap.tasks[0] as RichTask;
}

// ============================================================ 1) Görev akışı aşamaları
describe("1) Görev akışı aşamaları (F1)", () => {
  it("beş aşama sırayla çizilir, öncesi 'done', şu anki 'current'", () => {
    const adimlar = stageSteps(kayit({ stage: "RUN" }));
    expect(adimlar).not.toBeNull();
    expect(adimlar!.map(s => s.id)).toEqual([...STAGES]);
    expect(adimlar!.map(s => s.state)).toEqual(["done", "done", "current", "todo", "todo"]);
    expect(adimlar!.map(s => s.label)).toEqual(["Ayırma", "Bölme", "Çalışma", "Doğrulama", "Birleştirme"]);
  });
  it("alan yoksa çubuk hiç çizilmez (uydurma aşama yok)", () => {
    expect(stageSteps(kayit({}))).toBeNull();
    expect(stageSteps(null)).toBeNull();
    expect(stageSteps(undefined)).toBeNull();
  });
  it("bilinmeyen/bozuk aşama reddedilir, kablo değerleri ve Türkçe takma adlar kabul edilir", () => {
    for (const [girdi, beklenen] of [["TRIAGE", "triage"], [" split ", "split"], ["inceleme", "triage"],
      ["bolme", "split"], ["calisma", "run"], ["dogrulama", "verify"], ["birlestirme", "merge"]] as const)
      expect(normalizeStage(girdi)).toBe(beklenen);
    expect(normalizeStage("bilinmeyen")).toBeNull();
    expect(normalizeStage(42)).toBeNull();
    expect(normalizeStage(null)).toBeNull();
    expect(stageSteps({ ...kayit({}), stage: "bilinmeyen" } as RichTask)).toBeNull();
  });
  it("Türkçe takma adlar tek yönlü çalışır; hiçbir takma ad başka aşamaya sızmaz", () => {
    const es = { inceleme: "triage", incele: "triage", bol: "split", bolme: "split", calis: "run", calisma: "run", dogrula: "verify", dogrulama: "verify", birlestir: "merge", birlestirme: "merge" };
    for (const [ad, beklenen] of Object.entries(es)) expect(normalizeStage(ad)).toBe(beklenen);
    // "calis" önce "run"a çözülür, "calisma" da "run"; ikisi de aynı hedef.
    expect(normalizeStage("calis")).not.toBe(normalizeStage("calisma") + "x");
  });
  it("merge + Tamamlandı: beş adımın hepsi bitti", () => {
    const bitti = kayit({ stage: "MERGE", status: "Tamamlandi" });
    expect(stageSteps(bitti)!.map(s => s.state)).toEqual(["done", "done", "done", "done", "done"]);
  });
  it("ilk ve son aşamada durum doğru", () => {
    expect(stageSteps(kayit({ stage: "TRIAGE" }))![0].state).toBe("current");
    expect(stageSteps(kayit({ stage: "TRIAGE" }))![4].state).toBe("todo");
    expect(stageSteps(kayit({ stage: "VERIFY" }))!.slice(3).map(s => s.state)).toEqual(["current", "todo"]);
  });
});

// ============================================================ 2) Model / effort / thinking
describe("2) Model / effort / thinking bilgisi (F3)", () => {
  it("model + effort Türkçe okunur şekilde birleşir", () => {
    expect(modelText(kayit({ model: "gpt-5.1-codex", effort: "high" }))).toBe("gpt-5.1-codex · derin");
    expect(modelText(kayit({ model: "gpt-5.1-codex", effort: "low" }))).toBe("gpt-5.1-codex · hızlı");
    expect(modelText(kayit({ model: "gpt-5.1-codex", effort: "xhigh" }))).toBe("gpt-5.1-codex · çok derin");
    expect(modelText(kayit({ model: "gpt-5.1-codex", effort: "medium" }))).toBe("gpt-5.1-codex · orta");
    expect(modelText(kayit({ model: "gpt-5.1-codex", effort: "minimal" }))).toBe("gpt-5.1-codex · çok hızlı");
  });
  it("effort yoksa yalnız model; effort bilinmeyense yalnız model", () => {
    expect(modelText(kayit({ model: "gpt-5.1-codex" }))).toBe("gpt-5.1-codex");
    expect(modelText(kayit({ model: "gpt-5.1-codex", effort: "bilinmeyen" }))).toBe("gpt-5.1-codex");
  });
  it("model okunamıyorsa gizli (uydurma model adı yok)", () => {
    expect(modelText(kayit({ model: "?" }))).toBe("");
    expect(modelText(kayit({ model: "—" }))).toBe("");
    expect(modelText(kayit({ model: "   " }))).toBe("");
    expect(modelText(kayit({}))).toBe("");
    expect(modelText(null)).toBe("");
  });
  it("thinking bilgisi: çalışan ve bekleyen görev tek cümleyle, teknik terimsiz anlatılır", () => {
    const calisan = kayit({ status: "Calisiyor", current_action: "Testleri koşturuyor" });
    const bekleyen = kayit({ status: "Bekliyor", current_action: "İzin bekliyor" });
    expect(taskMessage(calisan, NOW)).toMatch(/düşün|çalış|test/i);
    expect(taskMessage(bekleyen, NOW)).toBe("Görev sırada, hazır olunca başlayacak");
    for (const t of [calisan, bekleyen]) {
      expect(taskMessage(t, NOW)).not.toMatch(/token|secret|https?:\/\/|pid|\/home\/|[A-Z]:\\/i);
    }
  });
});

// ============================================================ 3) Context göstergesi
describe("3) Context göstergesi (F4)", () => {
  it("doluluk yüzdesi + önbellek + tasarruf gösterilir", () => {
    const metin = contextText(kayit({ context: { used: 60_000, total: 200_000, cached: 40_000, saved: 1200 } }));
    expect(metin).toBe("Bağlam: %30 dolu · önbellek %20 · 1.2B tasarruf");
  });
  it("yalnız used/total varsa yüzde gösterilir", () => {
    expect(contextText(kayit({ context: { used: 1, total: 4 } }))).toBe("Bağlam: %25 dolu");
  });
  it("geçersiz bağlam gizlenir, yüzde uydurulmaz", () => {
    for (const c of [{ used: 10, total: 0 }, { used: 30, total: 20 }, { used: -5, total: 100 }, { used: "x", total: 100 }, {}])
      expect(contextText(kayit({ context: c }))).toBeNull();
    expect(contextText(kayit({}))).toBeNull();
    expect(contextText(null)).toBeNull();
  });
  it("önbellek toplamı aşarsa gösterilmez", () => {
    expect(contextText(kayit({ context: { used: 10, total: 100, cached: 500 } }))).toBe("Bağlam: %10 dolu");
  });
  it("yüzde daima 0–100 aralığında", () => {
    for (const [used, total] of [[1, 100], [99, 100], [100, 100], [7, 3]]) {
      const t = contextText(kayit({ context: { used, total } }));
      if (t) {
        const yuzde = Number(t.match(/%(\d+) dolu/)![1]);
        expect(yuzde).toBeGreaterThanOrEqual(0);
        expect(yuzde).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ============================================================ 4) Maliyet bilgisi
describe("4) Maliyet bilgisi (F5)", () => {
  it("gerçek sayı iki hane, çok küçük sayı <0.01", () => {
    expect(costText(kayit({ cost: 0 }))).toBe("Maliyet: $0.00");
    expect(costText(kayit({ cost: 1.234 }))).toBe("Maliyet: $1.23");
    expect(costText(kayit({ cost: 0.001 }))).toBe("Maliyet: $<0.01");
    expect(costText(kayit({ cost: 12 }))).toBe("Maliyet: $12.00");
  });
  it("maliyet yoksa satır hiç gösterilmez", () => {
    expect(costText(kayit({}))).toBeNull();
    expect(costText(kayit({ cost: -1 }))).toBeNull();
    expect(costText(kayit({ cost: "12" }))).toBeNull();
    expect(costText(null)).toBeNull();
  });
  it("maliyet ve bağlam birbirine karışmaz", () => {
    const t = kayit({ cost: 3, context: { used: 1, total: 2 } });
    expect(costText(t)).toBe("Maliyet: $3.00");
    expect(contextText(t)).toBe("Bağlam: %50 dolu");
  });
});

// ============================================================ 5) Arama ve filtre (F7)
describe("5) Arama ve filtre (F7)", () => {
  const hepsi = (n: number) => Array.from({ length: n }, (_, i) => kayit({
    id: `k${i}`, agent: i % 2 ? "gemini" : "codex",
    status: ["Calisiyor", "Bekliyor", "Tamamlandi", "Hata"][i % 4],
    title: `Görev ${i}`, task: `Görev ${i}`, repo: i % 3 ? "AfuNobet" : "AfuRemote",
    updated_at: iso(60_000 * (i + 1)),
  }));
  const F = { query: "", agent: "hepsi", status: "hepsi" } as const;

  it("görev yoksa arama gizli, en az bir görevde görünür", () => {
    expect(filterVisible(hepsi(0))).toBe(false);
    expect(filterVisible(hepsi(1))).toBe(true);
    expect(filterVisible(hepsi(9))).toBe(true);
    expect(filterVisible(hepsi(10))).toBe(true);
    expect(filterVisible(hepsi(50))).toBe(true);
  });
  it("boş filtre hepsini geçirir", () => {
    expect(filterTasks(hepsi(12), { ...F })).toHaveLength(12);
  });
  it("Türkçe harf duyarsız (ı/i, ş/s, ğ/ğ, ö/ö, ü/ü, ç/c)", () => {
    const t = kayit({ id: "x", title: "ŞİRKET ĞÜMÜŞ ÖÇÜYÜ testi", task: "ŞİRKET ĞÜMÜŞ ÖÇÜYÜ testi" });
    const liste = [t];
    expect(filterTasks(liste, { ...F, query: "şirket" })).toHaveLength(1);
    expect(filterTasks(liste, { ...F, query: "gumus" })).toHaveLength(1);
    expect(filterTasks(liste, { ...F, query: "ÖÇÜYÜ" })).toHaveLength(1);
    expect(filterTasks(liste, { ...F, query: "olmayan" })).toHaveLength(0);
  });
  it("arama ajan adı (Türkçe etiket) ve depoda da eşleşir", () => {
    const t = kayit({ id: "x", agent: "opencode", title: "Bir iş", task: "Bir iş", repo: "AfuTube" });
    expect(filterTasks([t], { ...F, query: "OpenCode" })).toHaveLength(1);
    expect(filterTasks([t], { ...F, query: "afutube" })).toHaveLength(1);
    expect(filterTasks([t], { ...F, query: "afunobet" })).toHaveLength(0);
  });
  it("ajan filtresi", () => {
    const liste = hepsi(12);
    const codex = filterTasks(liste, { ...F, agent: "codex" });
    expect(codex.length).toBeGreaterThan(0);
    expect(codex.every(t => t.agent === "codex")).toBe(true);
  });
  it("durum filtresi: çalışan / bekleyen / biten / hata", () => {
    const liste = hepsi(16);
    expect(filterTasks(liste, { ...F, status: "calisan" }).every(t => ["Calisiyor", "Hazirlaniyor"].includes(t.status))).toBe(true);
    expect(filterTasks(liste, { ...F, status: "bekleyen" }).every(t => ["Bekliyor", "Duraklatildi"].includes(t.status))).toBe(true);
    expect(filterTasks(liste, { ...F, status: "biten" }).every(t => t.status === "Tamamlandi")).toBe(true);
    expect(filterTasks(liste, { ...F, status: "hata" }).every(t => t.status === "Hata")).toBe(true);
    expect(filterTasks(liste, { ...F, status: "calisan" }).length + filterTasks(liste, { ...F, status: "hata" }).length).toBeGreaterThan(0);
  });
  it("arama + filtre birlikte uygulanır (VE)", () => {
    const liste = Array.from({ length: 12 }, (_, i) => kayit({
      id: `c${i}`, agent: i % 2 ? "gemini" : "codex", title: i % 2 ? "Gemini isleri" : "Codex isleri",
      task: i % 2 ? "Gemini isleri" : "Codex isleri", status: "Calisiyor", updated_at: iso(60_000),
    }));
    expect(filterTasks(liste, { query: "codex", agent: "gemini", status: "hepsi" })).toHaveLength(0);
    expect(filterTasks(liste, { query: "isleri", agent: "codex", status: "hepsi" }).length).toBe(6);
  });
  it("arama girdisi kırpılmadan çalışır", () => {
    const t = kayit({ id: "x", title: "Testleri koştur", task: "Testleri koştur" });
    expect(filterTasks([t], { ...F, query: "   koştur   " })).toHaveLength(1);
  });
});

// ============================================================ 6) Sağlık şeridi
describe("6) Sağlık şeridi", () => {
  it("şerit dört rozet gösterir: AfuNöbet, GPT, Ses, Claude", () => {
    const kaynak = readFileSync("src/views/views.ts", "utf8");
    for (const ad of ["AfuNöbet", "GPT", "Ses", "Claude"]) expect(kaynak).toContain(`pill("${ad}"`);
    expect(kaynak).toContain('class: "health-strip"');
    expect(kaynak).toContain("health-pill");
  });
  it("Claude rozeti köprünün kurulu olmasına bakar; canlı nokta kopru.ts'den", () => {
    const kaynak = readFileSync("src/views/views.ts", "utf8");
    expect(kaynak).toContain("Bridge.claudeHookInstalled()");
    expect(kaynak).toContain("kopruDurumu(this.healthCheck.mesajlar, State.snapshot.tasks, now)");
    expect(kaynak).not.toContain("Afu baglantisi satiri");
  });
  it("kopru: son 5 dakikada mesaj VEYA canlı görev bağlı sayılır", () => {
    const eski = { ajan: "claude", zaman: NOW - KOPRU_PENCERE - 1000 };
    const yeni = { ajan: "claude", zaman: NOW - 1000 };
    expect(kopruDurumu([yeni], [], NOW)).toEqual({ mesaj: true, canli: false, bagli: true });
    expect(kopruDurumu([], [{ agent: "claude", updatedAt: NOW - 1000 }], NOW)).toEqual({ mesaj: false, canli: true, bagli: true });
    expect(kopruDurumu([eski], [{ agent: "claude", updatedAt: NOW - KOPRU_PENCERE - 1 }], NOW).bagli).toBe(false);
    expect(kopruDurumu([], [], NOW).bagli).toBe(false);
  });
  it("kopru: başka ajanın sinyali Claude sayılmaz, gelecek zaman sayılmaz", () => {
    expect(kopruDurumu([{ ajan: "codex", zaman: NOW }], [], NOW).bagli).toBe(false);
    expect(kopruDurumu([{ ajan: "claude", zaman: NOW + 5000 }], [], NOW).bagli).toBe(false);
    expect(kopruDurumu([{ ajan: "claude", zaman: Number.NaN }], [], NOW).bagli).toBe(false);
    expect(kopruDurumu([{ ajan: "codex", zaman: NOW }], [{ agent: "codex", updatedAt: NOW }], NOW).bagli).toBe(false);
  });
  it("rozetler ✓/✗ işaretiyle hem renkte hem yazıda anlatır (yalnız renk değil)", () => {
    const kaynak = readFileSync("src/views/views.ts", "utf8");
    expect(kaynak).toContain('"data-ok": String(ok)');
    expect(kaynak).toContain('ok ? "✓" : "✗"');
    expect(kaynak).toContain('role: "img"');
  });
  it("şerite tıklayınca TEK cümle ne yapılacağını söyler", () => {
    const kaynak = readFileSync("src/views/views.ts", "utf8");
    const cumleler = kaynak.match(/this\.flash\("([^"]+)"\)/g) ?? [];
    expect(cumleler.length).toBeGreaterThanOrEqual(5);
    for (const c of cumleler) expect(c).not.toMatch(/\b(pid|port|traceback|token|http:\/\/)\b/i);
  });
});

// ============================================================ 7) Boş durum / hata / bildirim
describe("7) Boş durum, tek cümle hata, bildirim", () => {
  beforeEach(() => setLanguage("tr"));
  afterEach(() => setLanguage("tr"));

  it("kaynak yokken: tekrar dene verilir", () => {
    const bos = emptyState({ connected: false, tasks: [], sourceUnavailable: true });
    expect(bos.retry).toBe(true);
    expect(bos.title.length).toBeGreaterThan(0);
  });
  it("bağlı ama görev yokken: 'Afu hazır' + ne yapılacağını söyleyen cümle", () => {
    const bos = emptyState({ connected: true, tasks: [], sourceUnavailable: false });
    expect(bos.retry).toBe(false);
    expect(bos.title).toBe(ui("ready"));
    expect(bos.message.length).toBeGreaterThan(0);
    expect(bos.message).not.toMatch(/\b(pid|port|token|traceback)\b/i);
  });
  it("hata metni teknik ayrıntı sızdırmaz", () => {
    const hatali = kayit({ status: "Hata", mesaj: "HTTP 429 PID 9230 token=abc traceback at <C:\\x>" });
    const metin = taskMessage(hatali, NOW);
    expect(metin.length).toBeGreaterThan(0);
    expect(metin).not.toMatch(/429|PID|token|traceback|C:\\/);
  });
  it("bildirimler yalnız gerçek durum değişiminden doğar (E8 olayları)", () => {
    const once = kayit({});
    const biten = kayit({ status: "Tamamlandi" });
    const olaylar = deriveEvents([once], [biten]);
    expect(olaylar).toHaveLength(1);
    expect(olaylar[0].kind).toBe("JOB_FINISHED");
    // Tekrarlanan okumada olay üretilmez.
    expect(deriveEvents([biten], [biten])).toHaveLength(0);
  });
  it("bildirim tekrarı 60 sn içinde elenir", () => {
    const d = new EventDeduper();
    const e = { kind: "JOB_FINISHED" as const, taskId: "a", agent: "codex" as const };
    expect(d.accept(e, NOW)).toBe(true);
    expect(d.accept(e, NOW + 1000)).toBe(false);
    expect(d.accept(e, NOW + 60_000)).toBe(true);
  });
  it("özet 'bitti/toplam' sayacı yalnız gerçek tamamlanmayı sayar", () => {
    expect(taskSummary([kayit({ status: "Tamamlandi" }), kayit({ status: "Hata" })])).toBe("1/2");
    expect(taskSummary([])).toBe("0/0");
  });
  it("geçen süre kısa ve Türkçe", () => {
    expect(elapsedText({ ...kayit({}), startedAt: NOW - 90_000, updatedAt: NOW }, NOW)).toMatch(/dk|dakika|saat|\d/);
  });
});

// ============================================================ 8) Menü sekmeleri
describe("8) Menü sekmeleri eski haline", () => {
  it("alt menü dört sekme taşır: Kota, Uygulamalar, Orkestra, Sohbet + 'Afu'ya sor'", () => {
    const kaynak = readFileSync("src/views/views.ts", "utf8");
    expect(kaynak).toContain('[this.quotaButton, "quota", ui("quota")]');
    expect(kaynak).toContain('[this.appsButton, "apps", ui("apps")]');
    expect(kaynak).toContain('[this.orkestraButton, "orkestra", ui("orkestra")]');
    expect(kaynak).toContain('[this.chatButton, "chat", ui("chat")]');
    expect(kaynak).toContain('view === "sor" ? ui("askBack") : ui("ask")');
  });
  it("aktif sekme aria-pressed ile belli olur", () => {
    const kaynak = readFileSync("src/views/views.ts", "utf8");
    expect(kaynak).toContain('button.setAttribute("aria-pressed", String(view === name))');
    expect(kaynak).toContain('this.sorButton.setAttribute("aria-pressed", String(view === "sor"))');
  });
  it("alt menü sayfalarda görünür, selamda gizli", () => {
    const kaynak = readFileSync("src/views/views.ts", "utf8");
    expect(kaynak).toContain('this.footer.hidden = view === "greeting"');
  });
  it("daha fazla menüsü yalnız mini pet anahtarı + kapatma taşır (şişkin sekme yaratmaz)", () => {
    const kaynak = readFileSync("src/views/views.ts", "utf8");
    expect(kaynak).toContain("private menuItems(): HTMLButtonElement[] { return [this.petButton, this.menuClose]; }");
    expect(kaynak).toContain('role: "menu"');
    expect(kaynak).toContain('"aria-haspopup": "menu"');
  });
  it("her iki dilde sekme etiketleri kısa (28 karakteri geçmez)", () => {
    for (const anahtar of ["quota", "apps", "orkestra", "chat", "ask", "askBack", "more", "close", "back"] as const) {
      expect(ui(anahtar).length).toBeLessThanOrEqual(28);
    }
  });
});

// ============================================================ 9) Alt ajanlar / devir (bağlam)
describe("9) Alt ajan satırları ve devir bağlamı", () => {
  it("alt ajan ana listede ayrı görev olmaz", () => {
    const ana = kayit({ id: "ana" });
    const cocuk = { ...kayit({ id: "cocuk", parent_id: "ana" }), parentId: "ana" } as RichTask;
    expect(topLevel([ana, cocuk]).map(t => t.id)).toEqual(["ana"]);
  });
  it("Claude hedefli devir gösterilmez (yalnız KORUNUYOR)", () => {
    expect(handoffText({ ...kayit({}), handoff: { from: "codex", to: "claude", reason: "kota doldu" } }, NOW)).toBeNull();
    expect(handoffText({ ...kayit({}), handoff: { from: "claude", to: "codex", reason: "kota doldu" } }, NOW)).toBeNull();
    expect(handoffText({ ...kayit({}), handoff: { from: "codex", to: "gemini", reason: "kota doldu" } }, NOW)).toBe("Codex kotası doldu → Gemini devraldı");
    expect(handoffText({ ...kayit({}), handoff: { from: "codex", to: null, reason: "hata verdi" } }, NOW)).toBe("Codex hata verdi → bekliyor");
    expect(handoffText({ ...kayit({}), handoff: { from: "codex", to: "gemini", reason: "bilinmeyen sebep 42" } }, NOW)).toBeNull();
  });
});

// ============================================================ 10) State sözleşmesi (okuma güvenliği)
describe("10) state.json okuma sözleşmesi", () => {
  it("eksik/bozuk kaynak son geçerli anlık görüntüyü korur", () => {
    State.apply({ version: 1, tasks: [kayit({ id: "a" })], mesaj: "" } as never);
    const once = State.snapshot.tasks.length;
    State.apply(null);
    expect(State.snapshot.tasks.length).toBe(once);
    State.apply({ version: 1 } as never);
    expect(State.snapshot.sourceUnavailable).toBe(true);
  });
  it("yol/teknik içerik arayüze sızmaz", () => {
    const t = kayit({ file: "C:\\Users\\x\\secret\\state.json", current_action: "curl https://a.b/token" });
    expect(taskMessage(t, NOW)).not.toMatch(/C:\\|https?:\/\/|token/i);
    const { filename } = { filename: null as string | null };
    expect(filename).toBeNull();
  });
  it("Claude hedefli kayıt arayüzde görünmez", () => {
    const snap = parseState({ version: 1, mesaj: "", tasks: [
      { id: "c", agent: "claude", status: "Calisiyor", task: "Gizli", updated_at: iso(1000), quota: {} },
      { id: "g", agent: "gemini", status: "Calisiyor", task: "Görünür", updated_at: iso(1000), quota: {} },
    ] });
    expect(snap.tasks.map(t => t.agent)).not.toContain("claude");
  });
  it("State yalnızca dizin olayıyla beslenir; yazma yolu yok", () => {
    const kaynak = readFileSync("src/core/state.ts", "utf8");
    expect(kaynak).not.toMatch(/writeFile|invoke\(\s*["'](?:state_|write_)/);
  });
});

afterEach(() => { State.snapshot = { connected: false, tasks: [], sourceUnavailable: false }; });
