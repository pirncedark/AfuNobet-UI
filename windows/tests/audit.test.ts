import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { audit } from "../scripts/denetim.mjs";
describe("production audit", () => {
  it("rejects forbidden model calls, process control, and legacy media", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "afu-audit-"));
    try {
      for (const name of ["src", "src-tauri/src", "public", "dist"]) mkdirSync(path.join(dir, name), { recursive: true });
      writeFileSync(path.join(dir, "src/bad.ts"), "fetch(\"https://api.anthropic.com\");");
      writeFileSync(path.join(dir, "public/mochi.wav"), "bad");
      writeFileSync(path.join(dir, "src-tauri/src/control.rs"), "Command::new(\"claude\")");
      expect(audit(dir).some(value => value.includes("bad.ts"))).toBe(true);
      expect(audit(dir).some(value => value.includes("mochi.wav"))).toBe(true);
      expect(audit(dir).some(value => value.includes("control.rs"))).toBe(true);
    } finally { rmSync(dir, { recursive: true }); }
  });
  it("fails closed when a production directory is absent", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "afu-audit-"));
    try { expect(audit(dir).length).toBeGreaterThan(0); } finally { rmSync(dir, { recursive: true }); }
  });
});
