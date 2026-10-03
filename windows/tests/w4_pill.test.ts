// W4 (E2): ajan pill sistemi. Pill = mevcut ajan sekmesinin görünümü.
// Veri yalnız state.json (parseState). Claude pill'i yok.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseState } from "../src/core/state";
import { ajanKimlik } from "../src/core/ajan_kimlik";
import { EXTRA_PILL_LIMIT, PILL_STATE_TR, agentPills } from "../src/views/model";

const kok = (yol: string) => fileURLToPath(new URL(yol, import.meta.url));
const css = readFileSync(kok("../src/style.css"), "utf8");
const viewsSrc = readFileSync(kok("../src/views/views.ts"), "utf8");
const iso = () => new Date().toISOString();
const row = (id: string, agent: string, status: string, extra: Record<string, unknown> = {}) =>
  ({ id, agent, status, title: "İş", task: "İş", updated_at: iso(), quota: {}, ...extra });
const snap = (rows: Record<string, unknown>[], quotas?: Record<string, unknown>) =>
  parseState({ version: 1, tasks: rows, mesaj: "", ...(quotas ? { quotas } : {}) });

describe("W4 ajan pill: liste → sayı / renk / durum", () => {
  it("çekirdek ajanlar + Orkestra; her pill kendi rengi ve kısa adı", () => {
    const pills = agentPills(snap([row("a", "codex", "Calisiyor")]));
    expect(pills.map(p => p.id)).toEqual(["codex", "gemini", "opencode", "orkestra"]);
    expect(pills.find(p => p.id === "codex")!.kimlik).toMatchObject({ kisaAd: "CDX", renk: "#10a37f" });
    expect(pills.find(p => p.id === "gemini")!.kimlik).toMatchObject({ kisaAd: "GEM", renk: "#1a73e8" });
    expect(pills.find(p => p.id === "opencode")!.kimlik).toMatchObject({ kisaAd: "OPN", renk: "#e34f26" });
    expect(new Set(pills.map(p => p.kimlik.renk)).size).toBe(pills.length);
  });

  it("dört durum noktası: çalışıyor / bekliyor / kota dolu / boşta", () => {
    const pills = agentPills(snap([
      row("a", "codex", "Calisiyor"),
      row("b", "gemini", "Bekliyor"),
      row("c", "glm", "Tamamlandi"),
    ], { opencode: { remaining_percent: 0 } }));
    const durum = Object.fromEntries(pills.map(p => [p.id, p.state]));
    expect(durum).toMatchObject({ codex: "aktif", gemini: "bekliyor", opencode: "kota", glm: "idle" });
    expect(pills.find(p => p.id === "codex")!.title).toBe("Codex: çalışıyor");
    expect(pills.find(p => p.id === "gemini")!.title).toBe("Gemini: bekliyor");
    expect(pills.find(p => p.id === "opencode")!.title).toBe("OpenCode: kota doldu");
    expect(pills.find(p => p.id === "glm")!.title).toBe("GLM: boşta");
    expect(PILL_STATE_TR.idle).toBe("boşta");
  });

  it("duraklatılmış (kota dışı) iş de bekliyor sayılır", () => {
    const pills = agentPills(snap([row("a", "codex", "Duraklatildi")]));
    expect(pills.find(p => p.id === "codex")!.state).toBe("bekliyor");
  });
});

describe("W4 ajan pill: yeni ajan otomatik pill alır", () => {
  it("state.json'da listede olmayan ajan adı kendi pill'ini ve rengini alır", () => {
    const s = snap([row("a", "yeni-ajan", "Calisiyor"), row("b", "codex", "Tamamlandi")]);
    expect(s.tasks[0].agent).toBeNull();
    expect(s.tasks[0].ajanAdi).toBe("yeni-ajan");
    const pills = agentPills(s);
    expect(pills.map(p => p.id)).toEqual(["codex", "gemini", "opencode", "yeni-ajan", "orkestra"]);
    const yeni = pills.find(p => p.id === "yeni-ajan")!;
    expect(yeni.state).toBe("aktif");
    expect(yeni.label).toBe("Yeni-ajan");
    expect(yeni.kimlik.kisaAd).toBe("YEN");
    expect(yeni.kimlik.renk).not.toBe("#888");
    expect(ajanKimlik("yeni-ajan").renk).toBe(yeni.kimlik.renk); // kararlı renk
    expect(yeni.kimlik.renk).not.toBe(ajanKimlik("baska-ajan").renk);
  });

  it("geçersiz ad pill almaz; çok sayıda yeni ajan şeridi taşırmaz (canlı olan önce)", () => {
    const rows = [row("x", "Kötü Ad!", "Calisiyor")];
    for (let i = 0; i < 8; i++) rows.push(row(`n${i}`, `ajan${i}`, i === 7 ? "Calisiyor" : "Tamamlandi"));
    const pills = agentPills(snap(rows));
    const ek = pills.filter(p => !["codex", "gemini", "opencode", "glm", "orkestra"].includes(p.id));
    expect(ek).toHaveLength(EXTRA_PILL_LIMIT);
    expect(ek[0].id).toBe("ajan7");
    expect(pills.some(p => p.id.includes(" "))).toBe(false);
  });
});

describe("W4 ajan pill: Claude pill'i yok", () => {
  it("state.json'da Claude kaydı olsa bile pill üretilmez; kilitli rozet kalır", () => {
    const pills = agentPills(snap([row("a", "claude", "Calisiyor"), row("b", "codex", "Calisiyor")]));
    expect(pills.some(p => p.id === "claude")).toBe(false);
    expect(pills.some(p => p.label === "Claude")).toBe(false);
    expect(viewsSrc).toContain("🔒 Claude KORUNUYOR");
  });
});

describe("W4 ajan pill: boşta ajan soluk", () => {
  it("boşta ve hiç kaydı olmayan ajan soluk, çalışan/bekleyen/kota soluk değil", () => {
    const pills = agentPills(snap([
      row("a", "codex", "Calisiyor"), row("b", "gemini", "Tamamlandi"),
    ], { opencode: { remaining_percent: 0 } }));
    const soluk = Object.fromEntries(pills.map(p => [p.id, p.soluk]));
    expect(soluk).toMatchObject({ codex: false, gemini: true, opencode: false });
    const bos = agentPills(snap([]));
    expect(bos.filter(p => p.id !== "orkestra").every(p => p.soluk && p.state === "kapali")).toBe(true);
  });

  it("görünüm soluk sınıfını sekmeye koyar; CSS soluk + durum noktası + taşma kuralı taşır", () => {
    expect(viewsSrc).toContain('button.classList?.toggle("soluk", row.soluk)');
    expect(css).toMatch(/\.agent-pill\.soluk\{opacity:\.5\}/);
    for (const d of ["aktif", "bekliyor", "kota"]) expect(css).toContain(`.agent-pill[data-state=${d}] .pill-dot{`);
    expect(css).toContain(".agent-pill .pill-dot{");
    expect(css).toMatch(/\.agent-pills\{max-width:100%;min-width:0/);
    expect(css).toMatch(/\.agent-pill \.pill-text\{overflow:hidden;text-overflow:ellipsis/);
  });
});
