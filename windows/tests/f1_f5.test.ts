import { describe, expect, it } from "vitest";
import { parseState } from "../src/core/state";
import { contextText, costText, handoffText, modelText, stageSteps, filterTasks, EMPTY_FILTER } from "../src/views/model";
const read = (fields: Record<string, unknown> = {}) => parseState({ version: 1, tasks: [{ id: "a", agent: "gemini", status: "Calisiyor", task: "Görev", ...fields }] }).tasks[0];
describe("F1-F5 gerçek state ayrıştırma", () => {
  it("F1 aşamayı kayıttan okur ve Türkçe gösterir", () => {
    expect(stageSteps(read({ stage: "VERIFY" }))?.map(s => s.label)).toEqual(["Ayırma", "Bölme", "Çalışma", "Doğrulama", "Birleştirme"]);
    expect(stageSteps(read({ stage: "VERIFY" }))?.find(s => s.state === "current")?.id).toBe("verify");
  });
  it("F2 devir ve bekleme yalnız açık kayıttan gelir", () => {
    expect(handoffText(read({ handoff: { from: "codex", to: "gemini", reason: "quota" } }))).toBe("Codex kotası doldu → Gemini devraldı");
    expect(handoffText(read({ handoff: { from: "codex", to: null, reason: "quota" } }))).toBe("Codex kotası doldu → bekliyor");
  });
  it("F2 Claude elle seçilse bile yalnız kilitli rozet", () => {
    expect(handoffText(read({ handoff: { from: "codex", to: "claude", reason: "quota", manual: true } }))).toBeNull();
  });
  it("F3 model ve effort kayıttan gelir", () => {
    expect(modelText(read({ model: "gpt-6.1-sol", effort: "high" }))).toBe("gpt-6.1-sol · derin");
  });
  it("F3 bilinmeyen model işareti bilgi olarak gösterilmez", () => {
    expect(modelText(read({ model: "?", effort: "high" }))).toBe("");
  });
  it("F2 bilinmeyen sebep ve aynı ajana devir uydurulmaz", () => {
    expect(handoffText(read({ handoff: { from: "codex", to: "gemini", reason: "unknown" } }))).toBeNull();
    expect(handoffText(read({ handoff: { from: "codex", to: "codex", reason: "quota" } }))).toBeNull();
  });
  it("F4/F5 gerçek sıfır ve kullanım korunur", () => {
    expect(contextText(read({ context: { used: 25, total: 100 } }))).toBe("Bağlam: %25 dolu");
    expect(costText(read({ cost: 0 }))).toBe("Maliyet: $0.00");
  });
  it.each([{}, { stage: {}, handoff: [], model: 4, effort: [], context: "bad", cost: "1" },
    { stage: "unknown", handoff: { from: "codex", to: "invalid", reason: "quota" }, model: "https://secret.test", context: { used: 101, total: 100 }, cost: -1 }])("eksik/bozuk alanlar gizli: %j", fields => {
    const task = read(fields);
    expect(stageSteps(task)).toBeNull(); expect(handoffText(task)).toBeNull();
    expect(modelText(task)).toBe(""); expect(contextText(task)).toBeNull(); expect(costText(task)).toBeNull();
  });
  it("bozuk sayı ve teknik devir nedeni gizli", () => {
    const task = read({ context: { used: NaN, total: 100 }, cost: Infinity, handoff: { from: "codex", to: "gemini", reason: "token=secret" } });
    expect(contextText(task)).toBeNull(); expect(costText(task)).toBeNull(); expect(handoffText(task)).toBeNull();
  });
});
describe("F7 gerçek state arama/durum", () => {
  it.each([["Calisiyor", "calisan"], ["Bekliyor", "bekleyen"], ["Tamamlandi", "biten"], ["Hata", "hata"]] as const)("%s filtresi", (status, filter) => {
    expect(filterTasks([read({ status, task: "Şifreli İçerik" })], { ...EMPTY_FILTER, query: "sifreli icerik", status: filter })).toHaveLength(1);
  });
  it("yok ve bozuk kayıt çökmez", () => {
    expect(filterTasks(parseState(null).tasks, EMPTY_FILTER)).toEqual([]);
    expect(filterTasks(parseState({ version: 1, tasks: [null] }).tasks, EMPTY_FILTER)).toEqual([]);
    expect(filterTasks([read()], { ...EMPTY_FILTER, query: "eşleşmeyen" })).toEqual([]);
  });
});
