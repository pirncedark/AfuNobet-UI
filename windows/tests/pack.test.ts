import { it, expect } from "vitest";
import { copyExecutable } from "../scripts/pack-copy.mjs";
it("çalışan dosyayı zorlamadan yeni paketi başka adla teslim eder", () => {
  const calls: string[] = [];
  const output = copyExecutable("source.exe", "dist/afunobet-ui.exe", (_: string, dest: string) => {
    calls.push(dest);
    if (calls.length === 1) throw Object.assign(new Error("locked"), { code: "EBUSY" });
  });
  expect(output.replaceAll("\\", "/")).toBe("dist/afunobet-ui-yeni.exe");
  expect(calls).toHaveLength(2);
});
it("eksik kaynak gibi farklı hataları gizlemez", () => {
  expect(() => copyExecutable("source.exe", "dest.exe", () => { throw Object.assign(new Error("missing"), {code:"ENOENT"}); })).toThrow("missing");
});
