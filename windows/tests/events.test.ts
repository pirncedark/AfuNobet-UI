import { describe, expect, it } from "vitest";
import { deriveEvents, EventDeduper } from "../src/core/events";
import { parseState } from "../src/core/state";
const t = (status: string, file = "a.ts") => parseState({ version: 1, mesaj: "", tasks: [{ id: "j1", agent: "codex", task: "X", status, file }] }).tasks;
describe("snapshot events", () => {
  it.each([["Calisiyor", "JOB_STARTED"], ["Bekliyor", "WAITING"], ["Duraklatildi", "RATE_LIMIT"], ["Tamamlandi", "JOB_FINISHED"], ["Hata", "JOB_FAILED"]])("maps transition to %s", (status, event) => {
    const previous = status === "Calisiyor" ? [] : t("Calisiyor");
    expect(deriveEvents(previous, t(status)).map(e => e.kind)).toEqual([event]);
  });
  it("does not announce archived completion or repeated reads", () => {
    expect(deriveEvents([], t("Tamamlandi"))).toEqual([]);
    expect(deriveEvents(t("Tamamlandi"), t("Tamamlandi"))).toEqual([]);
    expect(deriveEvents(t("Calisiyor", "a.ts"), t("Calisiyor", "b.ts")).map(e => e.kind)).toEqual(["FILE_EDIT"]);
  });
  it("Claude oturumu yalnız sonuç olaylarını üretir; onay sorusu kota sayılmaz (1.0.4)", () => {
    const c = (status: string, quotaPaused = false) => [{ ...t("Calisiyor")[0], id: "ajan:s1", agent: "claude" as const, status: status as never, quotaPaused, currentAction: status }];
    expect(deriveEvents([], c("Calisiyor"))).toEqual([]);
    expect(deriveEvents(c("Calisiyor"), c("Tamamlandi")).map(e => e.kind)).toEqual(["JOB_FINISHED"]);
    expect(deriveEvents(c("Calisiyor"), c("Hata")).map(e => e.kind)).toEqual(["JOB_FAILED"]);
    expect(deriveEvents(c("Calisiyor"), c("Duraklatildi")).map(e => e.kind)).toEqual(["WAITING"]);
    expect(deriveEvents(c("Calisiyor"), c("Duraklatildi", true)).map(e => e.kind)).toEqual(["RATE_LIMIT"]);
    expect(deriveEvents(c("Tamamlandi"), c("Calisiyor"))).toEqual([]);
  });
  it("suppresses duplicates within cooldown while accepting independent jobs", () => {
    const d = new EventDeduper();
    const e = { kind: "JOB_FINISHED" as const, taskId: "j1", agent: "codex" as const };
    expect(d.accept(e, 0)).toBe(true);
    expect(d.accept(e, 1000)).toBe(false);
    expect(d.accept({ ...e, taskId: "j2" }, 1000)).toBe(true);
    expect(d.accept(e, 61000)).toBe(true);
  });
});
