// Local development-only fixture. This file is not a production build entry.
import "../src/style.css";
import { State } from "../src/core/state";
import { Island } from "../src/island/island";

if (!import.meta.env.DEV) throw new Error("The preview fixture is development-only");

const caseName = new URLSearchParams(location.search).get("case") ?? "idle";
const statuses: Record<string, string> = {
  working: "Calisiyor", waiting: "Bekliyor", paused: "Duraklatildi",
  success: "Tamamlandi", error: "Hata", quota: "Hata", petit: "Calisiyor", hidden: "Calisiyor",
  stale: "Calisiyor", "quota-panel": "Calisiyor", busy: "Calisiyor", "hata-karti": "Hata",
};
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const task = (id: string, agent: string, status: string, title: string, progress: number | null = null, extra: Record<string, unknown> = {}) => ({
  id, agent, task: title, repo: "AfuNobet", status,
  file: "C:\\private\\workspace\\state.ts", progress,
  updated_at: ago(1),
  quota: { remaining_percent: agent === "codex" ? 42 : null, reset_at: "2026-10-02T00:00:00Z" },
  mesaj: caseName === "quota" ? "HTTP 429 PID 9230 secret traceback" : "",
  ...extra,
});
let value: unknown = { version: 1, tasks: [], mesaj: "" };
if (caseName === "disconnected") value = null;
else if (statuses[caseName]) {
  const tasks = [task("focus", "codex", statuses[caseName], "Afu ekranini hazirla", caseName === "success" ? 100 : 36)];
  if (caseName === "working") tasks.push(
    task("secondary-1", "gemini", "Bekliyor", "Gorev kartlarini kontrol et"),
    task("secondary-2", "glm", "Hazirlaniyor", "Dosya bilgisini duzenle", 12),
    task("secondary-3", "opencode", "Tamamlandi", "Arayuz testlerini tamamla", 100),
    task("secondary-4", "codex", "Bekliyor", "Ajan rozetlerini duzenle"),
    task("secondary-5", "gemini", "Bekliyor", "Animasyonlari incele"),
    task("locked", "claude", "Calisiyor", "BU BASLIK GORUNMEMELI"),
  );
  if (caseName === "busy") {
    // The reported archive problem: a long finished history behind a little
    // live work. Nothing here may reach the main screen except the live work.
    for (let index = 0; index < 231; index++) {
      tasks.push(task(`eski-${index}`, index % 2 ? "codex" : "gemini",
        index % 3 ? "Tamamlandi" : "Hata", `Eski kayit ${index}`, 100, { updated_at: ago(60 * 24 * 9) }));
    }
    tasks.push(
      task("duraklatan-1", "codex", "Duraklatildi", "Commit ayiristir"),
      task("duraklatan-2", "gemini", "Duraklatildi", "AjAN denetim"),
      task("duraklatan-3", "glm", "Duraklatildi", "Renk cubugu"),
      task("duraklatan-4", "opencode", "Duraklatildi", "Kota paneli"),
    );
  }
  if (caseName === "hata-karti") tasks.length = 1;
  value = { version: 1, tasks, mesaj: "" };
}

const root = document.getElementById("root")!;
const island = new Island(root);
island.applySnapshot(value);
State.setFocus("focus");
if (caseName === "success") State.announce("happy");
if (caseName === "error" || caseName === "hata-karti") State.announce("error");
if (caseName === "petit") island.fsm.forcePetit();
else if (caseName === "hidden") island.fsm.forceHidden();
else if (caseName === "selam") island.fsm.launch();
else island.fsm.forceHome();
if (caseName === "stale") island.applySnapshot(null);
if (caseName === "quota-panel") island.setView("quota");

Object.assign(window, { afuTest: { island, State } });
document.documentElement.dataset.case = caseName;
document.documentElement.dataset.ready = "true";
