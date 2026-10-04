import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { acilisSaati, handoffText, DEVIR_BAYAT_MS, type RichTask } from "../src/views/model";
import { parseState, type Snapshot } from "../src/core/state";
import { balonMetni, devirMesajlari, olayMesaji } from "../src/message/message";

const NOW = new Date(2026, 9, 3, 14, 0).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const saat = (h: number, m: number) => new Date(2026, 9, 3, h, m).toISOString();

/** AfuNöbet'in yazdığı biçimde bir state.json görev satırı. */
function satir(extra: Record<string, unknown>) {
  return { id: "task-1", job_id: "job-1", agent: "gemini", task: "Rapor", status: "Calisiyor",
    updated_at: iso(NOW - 60_000), quota: { remaining_percent: 70, reset_at: null }, message: "Gorev calisiyor", ...extra };
}
function snap(rows: Record<string, unknown>[], quotas?: Record<string, unknown>): Snapshot {
  return parseState({ version: 1, tasks: rows, mesaj: "", ...(quotas ? { quotas } : {}) });
}

describe("W3 ajan devri — kart satırı (state.json'dan)", () => {
  it("devir var: handoff alanı tek satır olur", () => {
    const [task] = snap([satir({ handoff: { from: "codex", to: "gemini", reason: "kota doldu" } })]).tasks;
    expect(handoffText(task as RichTask, NOW)).toBe("Codex kotası doldu → Gemini devraldı");
  });
  it("devir yok: handoff alanı ve kota sorunu yoksa satır çıkmaz", () => {
    const [task] = snap([satir({})]).tasks;
    expect(handoffText(task as RichTask, NOW)).toBeNull();
  });
  it("bekliyor + açılış saati: duraklayan görev kota açılış saatini yazar", () => {
    const [task] = snap([satir({ agent: "codex", status: "Duraklatildi", message: "Codex duraklatildi - kota yenilenince devam edecek",
      quota: { remaining_percent: 0, reset_at: saat(14, 55) } })]).tasks;
    expect(handoffText(task as RichTask, NOW)).toBe("Codex kotası doldu · bekliyor (14:55'te açılır)");
  });
  it("bekliyor: görevde kota yoksa kökteki quotas okunur", () => {
    const s = snap([satir({ agent: "codex", status: "Duraklatildi", message: "Gorev duraklatildi", quota: {} })],
      { codex: { remaining_percent: 0, reset_at: saat(16, 30) } });
    expect(handoffText(s.tasks[0] as RichTask, NOW, s.quotas)).toBe("Codex kotası doldu · bekliyor (16:30'da açılır)");
  });
  it("geçmiş açılış saati yazılmaz (uydurma saat yok)", () => {
    const [task] = snap([satir({ agent: "codex", status: "Duraklatildi", message: "kota", quota: { remaining_percent: 0, reset_at: saat(13, 0) } })]).tasks;
    expect(handoffText(task as RichTask, NOW)).toBe("Codex kotası doldu · bekliyor");
  });
  it("Claude hedefli devir gösterilmez (state okuyucu da düşürür)", () => {
    const [task] = snap([satir({ handoff: { from: "codex", to: "claude", reason: "kota doldu" } })]).tasks;
    expect(task.handoff).toBeNull();
    expect(handoffText(task as RichTask, NOW)).toBeNull();
    const elle = { ...task, handoff: { from: "codex", to: "claude", reason: "kota doldu" } } as RichTask;
    expect(handoffText(elle, NOW)).toBeNull();
    const kaynak = { ...task, handoff: { from: "claude", to: "codex", reason: "kota doldu" } } as RichTask;
    expect(handoffText(kaynak, NOW)).toBeNull();
  });
  it("bayat veri (30 dk+) devir göstermez", () => {
    const eski = NOW - DEVIR_BAYAT_MS - 60_000;
    const [devir] = snap([satir({ updated_at: iso(eski), handoff: { from: "codex", to: "gemini", reason: "kota doldu" } })]).tasks;
    expect(handoffText(devir as RichTask, NOW)).toBeNull();
    const [bekle] = snap([satir({ agent: "codex", status: "Duraklatildi", updated_at: iso(eski), message: "kota",
      quota: { remaining_percent: 0, reset_at: saat(14, 55) } })]).tasks;
    expect(handoffText(bekle as RichTask, NOW)).toBeNull();
  });
  it("satır teknik terim içermez", () => {
    const [task] = snap([satir({ handoff: { from: "codex", to: "gemini", reason: "429 quota exceeded" } })]).tasks;
    const text = handoffText(task as RichTask, NOW) ?? "";
    expect(text).not.toMatch(/429|quota|handoff|provider|failover/i);
  });
  it("açılış saati Türkçe ekle yazılır", () => {
    const now = new Date(2026, 9, 3, 0, 0).getTime();
    expect(acilisSaati(saat(14, 55), now)).toBe("14:55'te açılır");
    expect(acilisSaati(saat(15, 0), now)).toBe("15:00'te açılır");
    expect(acilisSaati(saat(9, 40), now)).toBe("09:40'ta açılır");
    expect(acilisSaati(saat(10, 21), now)).toBe("10:21'de açılır");
    expect(acilisSaati(null, now)).toBe("");
  });
  it("kart ve ayrıntı satırı kökteki kota bilgisini de kullanır", () => {
    const views = readFileSync("src/views/views.ts", "utf8");
    expect(views.match(/handoffText\(task, Date\.now\(\), State\.snapshot\.quotas\)/g)?.length).toBe(2);
  });
});

describe("W3 ajan devri — pet balonu", () => {
  const devirli = satir({ handoff: { from: "codex", to: "gemini", reason: "kota doldu" } });
  it("devir yeni çıkınca balona tek satır düşer", () => {
    const prev = snap([satir({})]).tasks, next = snap([devirli]).tasks;
    const mesajlar = devirMesajlari(prev, next, NOW);
    expect(mesajlar).toHaveLength(1);
    expect(mesajlar[0].metin).toBe("Codex kotası doldu → Gemini devraldı");
    expect(balonMetni(mesajlar[0]).govde).toBe("Codex kotası doldu → Gemini devraldı");
  });
  it("aynı devir tekrar bildirilmez, devir yoksa balon yok", () => {
    const next = snap([devirli]).tasks;
    expect(devirMesajlari(next, next, NOW)).toEqual([]);
    expect(devirMesajlari([], snap([satir({})]).tasks, NOW)).toEqual([]);
  });
  it("Claude hedefli devir balona düşmez", () => {
    const next = snap([satir({ handoff: { from: "codex", to: "claude", reason: "kota doldu" } })]).tasks;
    expect(devirMesajlari([], next, NOW)).toEqual([]);
  });
  it("bayat devir balona düşmez", () => {
    const next = snap([{ ...devirli, updated_at: iso(NOW - DEVIR_BAYAT_MS - 1000) }]).tasks;
    expect(devirMesajlari([], next, NOW)).toEqual([]);
  });
  it("kota duraklaması balonda bekliyor + açılış saati olarak görünür", () => {
    const tasks = snap([satir({ agent: "codex", status: "Duraklatildi", message: "kota", quota: { remaining_percent: 0, reset_at: saat(14, 55) } })]).tasks;
    const m = olayMesaji({ kind: "RATE_LIMIT", taskId: "task-1", agent: "codex" }, tasks, NOW);
    expect(m?.metin).toBe("Codex kotası doldu · bekliyor (14:55'te açılır)");
    // Yeni duraklama RATE_LIMIT ile bildirildiği için devir balonu ikinci kez çıkmaz.
    expect(devirMesajlari([], tasks, NOW)).toEqual([]);
  });
});
