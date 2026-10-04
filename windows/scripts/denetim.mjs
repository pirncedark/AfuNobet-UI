import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function audit(root) {
  const findings = [];
  const banned = [/anthropic/i, /claude\s+(?:-p|--print|code)/i, /Command::new\(/, /(?:TerminateProcess\s*\(|\.kill\s*\(|(?:spawn|exec)\s*\(\s*["\u0027]taskkill)/, /mochi|coucou/i];
  function walk(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, item.name), rel = path.relative(root, p).replaceAll("\\", "/");
      if (item.isDirectory()) { walk(p); continue; }
      if (item.isSymbolicLink()) { findings.push(`link: ${rel}`); continue; }
      if (/mochi|coucou/i.test(item.name) || /\.(wav|mp3|mp4|gif)$/i.test(item.name)) findings.push(`media: ${rel}`);
      if (!/\.(?:ts|js|rs|html|css|json|svg)$/i.test(p)) continue;
      readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        if (/(?:upstream|Louis|MIT)/.test(line) && !/(?:fetch\(|Command::new\(|https:\/\/api\.)/.test(line)) return;
        for (const [rule, regex] of banned.entries()) {
          if (!regex.test(line)) continue;
          const ownBridge = rel === "src-tauri/src/codex.rs";
          if (ownBridge && rule === 2 && /^\s*let mut cmd = Command::new\(exe\);\s*$/.test(line)) continue;
          if (ownBridge && rule === 3 && /^\s*let _ = (?:self\.)?child\.kill\(\);\s*$/.test(line) && !/TerminateProcess|taskkill/.test(line)) continue;
          findings.push(`${rel}:${i + 1}: forbidden code`);
        }
        if (/(?:log::line|console\.(?:log|debug))/.test(line) && /token|refresh|access/i.test(line)) findings.push(`${rel}:${i + 1}: secret logging`);
        if (/ShellExecuteW/.test(line) && rel !== "src-tauri/src/apps.rs") findings.push(`${rel}:${i + 1}: unapproved opener`);
      });
    }
  }
  for (const dir of ["src", "src-tauri/src", "dist", "public"]) {
    try { walk(path.join(root, dir)); } catch { findings.push(`unreadable directory: ${dir}`); }
  }
  return findings;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL("../", import.meta.url));
  const findings = audit(root);
  const license = path.join(root, "../LICENSE");
  try {
    const text = readFileSync(license, "utf8");
    if (!/MIT License/.test(text) || !/Louis/.test(text)) findings.push("MIT attribution missing");
  } catch { findings.push("LICENSE unreadable"); }
  console.log(findings.length ? findings.join("\n") : "denetim temiz (Claude/harici API/eski medya yok; yalnız kayıtlı uygulama açma ve sahipli Codex köprüsü; MIT korunuyor)");
  process.exitCode = findings.length ? 1 : 0;
}
