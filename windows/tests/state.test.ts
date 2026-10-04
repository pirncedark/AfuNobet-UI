import { describe, expect, it, vi } from "vitest";
import { currentTasks, elapsedText, expressionFor, listedTasks, parseState, pillStates, preferredTask, quotaRows, State, taskMessage, taskSummary } from "../src/core/state";

const row = (changes: Record<string, unknown> = {}) => ({
  id: "job-1", agent: "codex", task: "Acilis ekranini duzenle", repo: "AfuNobet",
  status: "Calisiyor", file: "main.ts", progress: null,
  quota: { remaining_percent: null, reset_at: null }, mesaj: "",
  updated_at: new Date().toISOString(), ...changes,
});
const snapshot = (...tasks: Record<string, unknown>[]) => parseState({ version: 1, tasks, mesaj: "" });

describe("state.json user-facing contract", () => {
  it("completion badge expires after four seconds and pause cancels it", () => {
    vi.useFakeTimers();
    State.apply({ version: 1, tasks: [row({ status: "Tamamlandi", updated_at: new Date().toISOString() })], mesaj: "" });
    State.announce("happy");
    expect(State.effectiveState).toBe("happy");
    vi.advanceTimersByTime(4000);
    expect(State.effectiveState).toBe("idle");
    State.announce("error");
    State.setPaused(true);
    expect(State.effectiveState).toBe("paused");
    State.setPaused(false);
    State.apply({ version: 1, tasks: [], mesaj: "" });
    vi.useRealTimers();
  });
  it("quota uses recorded values and timestamps with no Claude row", () => {
    const now = Date.parse("2026-10-01T15:00:00Z");
    const rows = quotaRows(snapshot(row({ quota: { remaining_percent: 40, reset_at: "2026-10-01T15:51:00Z", checked_at: "2026-10-01T14:00:00Z" } }), row({ id: "c", agent: "claude" })), now);
    expect(rows.map(r => r.agent)).toEqual(["codex", "glm", "gemini", "opencode"]);
    expect(rows[0]).toMatchObject({ percent: "%40", stale: true });
    expect(rows[1].percent).toBe("—");
    expect(rows[1].checked).toBe("—");
  });
  it("quota cache can be displayed when no job exists", () => {
    const s = parseState({ version: 1, tasks: [], mesaj: "", quotas: { gemini: { remaining_percent: 22, checked_at: "2026-10-01T14:55:00Z" } } });
    expect(quotaRows(s, Date.parse("2026-10-01T15:00:00Z"))[2]).toMatchObject({ percent: "%22", stale: false });
  });
  it("keeps taskful agents clickable even when outside the first three rows", () => {
    const tasks = snapshot(row(), row({ id: "b" }), row({ id: "c" }), row({ id: "d", agent: "gemini", status: "Bekliyor" })).tasks;
    expect(pillStates(tasks, tasks[0])).toEqual({ codex: "active", glm: "disabled", gemini: "idle", opencode: "disabled" });
  });
  it.each([
    [{ title: "Kota paneli", current_action: "Testler", task: "X" }, "Kota paneli"],
    [{ current_action: "Testler", task: "X" }, "Testler"],
    [{ description: "Açıklama", task: "X" }, "Açıklama"],
    [{ task: "UYGULA" }, "UYGULA"],
    [{ task: undefined }, "Görev"],
  ])("uses title action description and job fallback in order %#", (changes, expected) => {
    expect(snapshot(row(changes)).tasks[0].title).toBe(expected);
  });

  it("shows measured model and elapsed minutes without estimating unknown times", () => {
    const task = snapshot(row({ model: "gpt-6", started_at: "2026-10-01T12:00:00Z" })).tasks[0];
    expect(task.model).toBe("gpt-6");
    expect(elapsedText(task, Date.parse("2026-10-01T12:12:00Z"))).toBe("12 dk");
    expect(elapsedText(snapshot(row()).tasks[0], Date.now())).toBe("—");
  });

  it("excludes hundreds of old paused jobs and caps live rows at three", () => {
    const old = new Date(Date.now() - 3 * 86400000).toISOString();
    const tasks = snapshot(...Array.from({ length: 240 }, (_, i) => row({ id: `old${i}`, status: i % 2 ? "Hata" : "Duraklatildi", updated_at: old }))).tasks;
    expect(currentTasks(tasks)).toEqual([]);
    expect(listedTasks(snapshot(...Array.from({ length: 7 }, (_, i) => row({ id: `live${i}` }))).tasks)).toHaveLength(3);
  });
  it("pause suppresses announcements while retaining live snapshot updates", () => {
    State.setPaused(true);
    State.apply({ version: 1, tasks: [row({ progress: 41 })], mesaj: "" });
    expect(State.tasks[0].progress).toBe(41);
    expect(State.shouldAnnounce()).toBe(false);
    State.setPaused(false);
    expect(State.shouldAnnounce()).toBe(true);
  });
  it("unavailable empty source retains the last valid task", () => {
    State.apply({ version: 1, tasks: [row({ progress: 58 })], mesaj: "" });
    State.apply({ version: 1, tasks: [], mesaj: "unavailable" });
    expect(State.tasks[0]?.progress).toBe(58);
    expect(State.snapshot.sourceUnavailable).toBe(true);
    State.apply({ version: 1, tasks: [], mesaj: "" });
  });
  it("keeps a measured task and renders a safe current filename", () => {
    const result = snapshot(row({ file: "C:\\work\\private\\main.ts", progress: 37 }));
    expect(result.connected).toBe(true);
    expect(result.tasks[0]).toMatchObject({ task: "Acilis ekranini duzenle", file: "main.ts", progress: 37 });
  });

  it.each([
    "PID 427", "port 8080", "Traceback failed", "api_key=private-value", "token: abc",
    "Bearer private-token", "af@example.com", "C:\\secret\\goal.txt", "/secret/goal.txt",
    "https://private.example/task", "192.168.1.25", "npm run secret", "codex exec secret",
    "git status", "--private-option", "sk-abcdefghijklmnopqrst",
  ])("never exposes a technical or private task title: %s", (task) => {
    const result = snapshot(row({ task, repo: task }));
    expect(result.tasks[0].task).toBe("Görev");
    expect(result.tasks[0].repo).toBeNull();
  });

  it("cleans control characters and apostrophes without altering plain text", () => {
    expect(snapshot(row({ task: "  Afu\u001b[31m\n ekrani\u0027  " })).tasks[0].task).toBe("Afu ekrani");
  });

  it("accepts alternate current_file but never renders its path", () => {
    expect(snapshot(row({ file: null, current_file: "/work/private/view.ts" })).tasks[0].file).toBe("view.ts");
  });

  it.each([undefined, null, -1, 101, Infinity, NaN, "25"])("never guesses progress from unmeasured input %s", (progress) => {
    expect(snapshot(row({ progress, files: ["one", "two"], completed_steps: 3 })).tasks[0].progress).toBeNull();
  });

  it("gives a completed task full progress while preserving recorded zero", () => {
    expect(snapshot(row({ status: "Tamamlandi", progress: null })).tasks[0].progress).toBe(100);
    expect(snapshot(row({ progress: 0 })).tasks[0].progress).toBe(0);
  });

  it.each(["Hata", "Duraklatildi"])("maps a quota failure only from %s to a safe pause", (status) => {
    const task = snapshot(row({ status, mesaj: "HTTP 429 PID 987 private traceback" })).tasks[0];
    expect(task.status).toBe("Duraklatildi");
    expect(task.quotaPaused).toBe(true);
    expect(taskMessage(task)).toMatch(/^Codex duraklatıldı\. Kota yenilenince devam edecek\.$/);
    expect(taskMessage(task)).not.toMatch(/429|PID|private|traceback/);
  });

  it.each(["Calisiyor", "Tamamlandi"])("does not turn %s into a pause because of a stale quota message", (status) => {
    const task = snapshot(row({ status, message: "quota 429" })).tasks[0];
    expect(task.status).toBe(status);
    expect(task.quotaPaused).toBe(false);
  });

  it.each(["quota", "usage limit", "rate limit", "BLOCKED", "COOLDOWN"])("handles the documented pause marker %s without rendering it", (message) => {
    const task = snapshot(row({ status: "Hata", mesaj: undefined, message })).tasks[0];
    expect(task.status).toBe("Duraklatildi");
    expect(taskMessage(task)).toBe("Codex duraklatıldı. Kota yenilenince devam edecek.");
  });

  it("keeps unknown agents anonymous and raw failures out of messages", () => {
    const task = snapshot(row({ agent: "private-runner", status: "Hata", message: "PID 77 traceback /secret/file" })).tasks[0];
    expect(task.agent).toBeNull();
    expect(taskMessage(task)).toBe("Görev tamamlanamadı, yeniden deneyin");
  });

  it("displays live current action for running tasks if fresh", () => {
    const task = snapshot(row({ status: "Calisiyor", agent: "codex", current_action: "Reading file config.ts", updated_at: new Date().toISOString() })).tasks[0];
    expect(taskMessage(task)).toBe("Codex reading file config.ts");
  });

  it("falls back to base message if running task is stale", () => {
    const staleTime = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    const task = snapshot(row({ status: "Calisiyor", agent: "codex", current_action: "Reading file config.ts", updated_at: staleTime })).tasks[0];
    expect(taskMessage(task)).toBe("Görev çalışıyor (bayat · son güncelleme 35 dk önce)");
  });

  it("ignores technical current action and shows base message", () => {
    const task = snapshot(row({ status: "Calisiyor", agent: "codex", current_action: "npm run build", updated_at: new Date().toISOString() })).tasks[0];
    expect(taskMessage(task)).toBe("Görev çalışıyor");
  });

  it("filters Claude jobs while retaining executable-agent records", () => {
    const result = snapshot(row({ id: "locked", agent: "claude" }), row({ id: "visible", agent: "glm" }));
    expect(result.connected).toBe(true);
    expect(result.tasks.map((task) => task.id)).toEqual(["visible"]);
  });

  it.each([null, undefined, [], "{}", {}, { version: 2, tasks: [] }, { version: 1 },
    { version: 1, tasks: [null] }, { version: 1, tasks: [row({ id: " " })] },
    { version: 1, tasks: [row({ id: "x".repeat(201) })] },
    { version: 1, tasks: [row(), row()] },
    { version: 1, tasks: Array.from({ length: 5001 }, (_, id) => row({ id: String(id) })) },
  ])("rejects incomplete, invalid, duplicate or oversized snapshots", (value) => {
    expect(parseState(value)).toEqual({ connected: false, tasks: [], sourceUnavailable: true });
  });

  it("marks unavailable source without leaking its raw diagnostic", () => {
    const result = parseState({ version: 1, tasks: [], mesaj: "PID 427 cannot open C:\\private" });
    expect(result).toEqual({ connected: true, tasks: [], sourceUnavailable: true });
  });

  it("prefers live work over completed tasks and counts only actual completion", () => {
    const tasks = snapshot(row({ id: "done", status: "Tamamlandi" }), row({ id: "wait", status: "Bekliyor" }), row({ id: "live", status: "Calisiyor" })).tasks;
    expect(preferredTask(tasks)?.id).toBe("live");
    expect(taskSummary(tasks)).toBe("1/3");
    expect(preferredTask([])).toBeUndefined();
    expect(taskSummary([])).toBe("0/0");
  });

  it.each([
    [null, "idle"], ["Hazirlaniyor", "working"], ["Calisiyor", "studying"],
    ["Bekliyor", "working"], ["Duraklatildi", "question"], ["Tamamlandi", "success"], ["Hata", "error"],
  ] as const)("maps %s to the Afu expression %s", (status, expression) => {
    expect(expressionFor(status)).toBe(expression);
  });

  it("retains the last valid tasks during partial or missing state and recovers", () => {
    State.apply({ version: 1, tasks: [row({ progress: 37 })], mesaj: "" });
    State.apply(null);
    expect(State.snapshot.tasks[0]).toMatchObject({ id: "job-1", progress: 37 });
    expect(State.snapshot.sourceUnavailable).toBe(true);
    State.apply({ version: 1 });
    expect(State.snapshot.tasks[0].id).toBe("job-1");
    State.apply({ version: 1, tasks: [row({ status: "Tamamlandi", progress: 100 })], mesaj: "" });
    expect(State.snapshot.sourceUnavailable).toBe(false);
    expect(State.snapshot.tasks[0].status).toBe("Tamamlandi");
    State.apply({ version: 1, tasks: [], mesaj: "" });
  });

  it("automatically follows new running work after the previous task completes", () => {
    State.apply({ version: 1, tasks: [row({ id: "old" })], mesaj: "" });
    State.apply({ version: 1, tasks: [row({ id: "old", status: "Tamamlandi" })], mesaj: "" });
    State.apply({ version: 1, tasks: [row({ id: "old", status: "Tamamlandi" }), row({ id: "new", status: "Calisiyor" })], mesaj: "" });
    expect(State.focusTask?.id).toBe("new");
    expect(State.effectiveState).toBe("studying");
    State.apply({ version: 1, tasks: [], mesaj: "" });
  });

  it("preserves the task explicitly selected by the user during updates", () => {
    State.apply({ version: 1, tasks: [row({ id: "automatic" }), row({ id: "chosen", agent: "gemini", status: "Bekliyor" })], mesaj: "" });
    State.setFocus("chosen");
    State.apply({ version: 1, tasks: [row({ id: "automatic", progress: 80 }), row({ id: "chosen", agent: "gemini", status: "Bekliyor" })], mesaj: "" });
    expect(State.focusTask?.id).toBe("chosen");
    expect(State.effectiveState).toBe("working");
    State.apply({ version: 1, tasks: [row({ id: "automatic", progress: 90 })], mesaj: "" });
    expect(State.focusTask?.id).toBe("automatic");
    State.apply({ version: 1, tasks: [], mesaj: "" });
  });
});

describe("bayat calisan kayit", () => {
  it("30 dakikadan uzun guncellenmeyen calisan is ana kartta canli sayilmaz", () => {
    const now = Date.now();
    const eski = snapshot(row({ updated_at: new Date(now - 1806 * 60000).toISOString() })).tasks;
    const taze = snapshot(row({ updated_at: new Date(now - 5 * 60000).toISOString() })).tasks;
    expect(currentTasks(eski, now)).toEqual([]);
    expect(currentTasks(taze, now)).toHaveLength(1);
  });
});
