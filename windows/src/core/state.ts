// Read-only presentation contract. External messages never become UI markup.
import { AGENT_TR } from "./labels";
export const AGENTS = ["claude", "codex", "glm", "gemini", "opencode"] as const;
export type Agent = typeof AGENTS[number];
export const NAMES: Record<Agent, string> = { claude: "Claude", codex: "CODEX", glm: "GLM", gemini: "GEMINI", opencode: "OPENCODE" };
export const STATUSES = ["Hazirlaniyor", "Calisiyor", "Bekliyor", "Duraklatildi", "Tamamlandi", "Hata"] as const;
export type Status = typeof STATUSES[number];
export type Expression = "idle" | "working" | "thinking" | "alert" | "happy" | "success" | "error" | "waiting" | "paused" | "listening" | "speaking";
export interface Task {
  title: string; model: string | null; currentAction: string | null; startedAt: number | null;
  id: string; agent: Agent | null; task: string; repo: string | null; status: Status;
  file: string | null; progress: number | null;
  quota: Quota; quotaPaused: boolean;
  updatedAt: number | null;
}
export interface Quota { remaining_percent: number | null; reset_at: string | null; checked_at: string | null }
export interface Snapshot { connected: boolean; tasks: Task[]; sourceUnavailable: boolean; quotas?: Partial<Record<Exclude<Agent, "claude">, Quota>> }
export interface Settings { screen: "primary" | "cursor"; autoCloseInterval: number; pet: boolean; tts: boolean }
const TECHNICAL = /\b(?:pid|port|traceback|429|exception)\b|--[\w-]+|\b(?:api[_ -]?key|token|secret|password)\s*[:=]|\bbearer\s+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b[a-z]:[\\/]|https?:\/\/|(?:^|\s)\/(?:[^\s/]+\/)*[^\s/]+|\b\d{1,3}(?:\.\d{1,3}){3}\b|\b(?:sk|ghp|gho|AIza)[-_][a-z0-9_-]{12,}/i;
const COMMAND = /(?:^|[;&|`:]|\b(?:run|execute|calistir)\s+)\s*(?:(?:python(?:w|3)?|powershell|pwsh|cmd|bash|sh|git|npm|npx|pip|curl|wget|node|java|dotnet|cargo|docker|ssh|cat|echo|rm|del|taskkill)(?:\s|$)|(?:codex|claude|gemini|opencode|omp)\s+(?:-\S+|exec\b|run\b|resume\b))/i;
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function label(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/[\x00-\x1f\x7f]/g, " ").replace(/[\u0027\u2018\u2019]/g, "").replace(/\s+/g, " ").trim();
  return text && !TECHNICAL.test(text) && !COMMAND.test(text) ? text.slice(0, max) : null;
}
function filename(value: unknown): string | null {
  return typeof value === "string" ? label(value.replace(/\\/g, "/").split("/").pop(), 80) : null;
}
function percent(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}
function timestamp(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
}
function moment(value: unknown): number | null {
  const text = timestamp(value);
  return text === null ? null : Date.parse(text);
}
function parseQuota(value: unknown): Quota {
  const q = object(value);
  return { remaining_percent: percent(q?.remaining_percent), reset_at: timestamp(q?.reset_at), checked_at: timestamp(q?.checked_at) };
}
export function quotaRows(snapshot: Snapshot, now = Date.now()) {
  return (["codex", "glm", "gemini", "opencode"] as const).map(agent => {
    const newest = snapshot.tasks.filter(task => task.agent === agent).sort((a, b) => (moment(b.quota.checked_at) ?? -1) - (moment(a.quota.checked_at) ?? -1))[0];
    const quota = snapshot.quotas?.[agent] ?? newest?.quota;
    const checked = moment(quota?.checked_at);
    const dateText = (value: string | null | undefined) => value ? new Date(value).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
    return { agent, percent: quota?.remaining_percent == null ? "—" : `%${Math.round(quota.remaining_percent)}`,
      reset: dateText(quota?.reset_at), checked: dateText(quota?.checked_at), stale: checked === null || now - checked > 30 * 60000 || checked > now };
  });
}
export function taskTitle(row: Record<string, unknown>): string {
  const task = object(row.task);
  return label(task?.title) ?? label(row.title) ?? label(row.current_action) ?? label(row.description) ?? label(task?.name) ?? label(row.task) ?? label(row.job_name) ?? "Görev";
}
export function elapsedText(task: Task, now = Date.now()): string {
  if (task.startedAt === null || task.startedAt > now) return "—";
  const minutes = Math.floor((now - task.startedAt) / 60000);
  return minutes < 1 ? "<1 dk" : `${minutes} dk`;
}
export function parseState(value: unknown): Snapshot {
  const unavailable: Snapshot = { connected: false, tasks: [], sourceUnavailable: true };
  const root = object(value);
  if (!root || root.version !== 1 || !Array.isArray(root.tasks) || root.tasks.length > 5000) return unavailable;
  const tasks: Task[] = [], seen = new Set<string>();
  for (const value of root.tasks) {
    const row = object(value);
    if (!row || typeof row.id !== "string" || !row.id.trim() || row.id.length > 200 || seen.has(row.id)) return unavailable;
    seen.add(row.id);
    const agent = AGENTS.includes(row.agent as Agent) ? row.agent as Agent : null;
    if (agent === "claude") continue;
    let status: Status = STATUSES.includes(row.status as Status) ? row.status as Status : "Hazirlaniyor";
    const quotaPaused = (status === "Duraklatildi" || status === "Hata") && /\b(?:kota|quota|usage limit|rate limit|429|BLOCKED|COOLDOWN)\b/i.test(String(row.mesaj ?? row.message ?? ""));
    if (quotaPaused) status = "Duraklatildi";
tasks.push({ id: row.id, agent, status, task: label(row.task) ?? "Görev", title: taskTitle(row),
      model: label(row.model, 80), currentAction: label(row.current_action), startedAt: moment(row.started_at ?? row.started), repo: label(row.repo, 80),
      file: filename(row.file ?? row.current_file), progress: status === "Tamamlandi" ? 100 : percent(row.progress),
      quota: parseQuota(row.quota), quotaPaused,
      updatedAt: moment(row.updated_at ?? row.updated) });
  }
  const result: Snapshot = { connected: true, tasks, sourceUnavailable: typeof root.mesaj === "string" && root.mesaj.length > 0 };
  const quotas = object(root.quotas);
  if (quotas) result.quotas = Object.fromEntries(["codex", "glm", "gemini", "opencode"].filter(agent => quotas[agent] !== undefined).map(agent => [agent, parseQuota(quotas[agent])]));
  return result;
}
export function taskMessage(task: Task, now = Date.now()): string {
  if (task.quotaPaused) return `${task.agent ? AGENT_TR[task.agent] : "Ajan"} duraklatıldı. Kota yenilenince devam edecek.`;
  const base = { Hazirlaniyor: "Görev hazırlanıyor", Calisiyor: "Görev çalışıyor", Bekliyor: "Görev sırada, hazır olunca başlayacak",
    Duraklatildi: "Görev duraklatıldı, hazır olduğunuzda devam edin", Tamamlandi: "Görev tamamlandı", Hata: "Görev tamamlanamadı, yeniden deneyin" }[task.status];
  if (task.updatedAt !== null && IN_FLIGHT.includes(task.status) && task.status !== "Duraklatildi") {
    const age = now - task.updatedAt;
    if (age > STALE_MS) {
      const minutes = Math.floor(age / 60000);
      const diff = minutes < 1 ? "<1 dk" : `${minutes} dk`;
      return `${base} (bayat · son güncelleme ${diff} önce)`;
    }
    if (task.status === "Calisiyor" && task.currentAction && !TECHNICAL.test(task.currentAction) && !COMMAND.test(task.currentAction)) {
      const agentName = task.agent ? AGENT_TR[task.agent] : "Ajan";
      const actionText = task.currentAction.toLowerCase();
      return `${agentName} ${actionText}`;
    }
  }
  return base;
}
export function taskSummary(tasks: Task[]): string { return `${tasks.filter(t => t.status === "Tamamlandi").length}/${tasks.length}`; }
export function preferredTask(tasks: Task[]): Task | undefined {
  const priority: Status[] = ["Calisiyor", "Hazirlaniyor", "Duraklatildi", "Bekliyor", "Hata", "Tamamlandi"];
  return priority.map(status => tasks.find(t => t.status === status)).find(Boolean);
}
/** Statuses that mean work is still in flight, so the record belongs on screen. */
const IN_FLIGHT: Status[] = ["Calisiyor", "Hazirlaniyor", "Bekliyor", "Duraklatildi"];
/** How long a finished record stays worth the main card. */
const RECENT_MS = 45 * 60 * 1000;
/** An in-flight record not updated for this long is treated as stale, not live. */
const STALE_MS = 30 * 60 * 1000;
/**
 * The main screen is a live board, not an archive. Work that is running, queued
 * or paused is always shown. A finished record — completed or failed — stays
 * only while it is still fresh news, which is what keeps the finished
 * celebration and the failure message readable. Everything older is counted in
 * the summary, never listed, so a long history cannot flood the island.
 */
export function isCurrent(task: Task, now = Date.now()): boolean {
  if (task.updatedAt === null) return false;
  const age = now - task.updatedAt;
  if (task.status === "Duraklatildi") return age <= 86400000;
  // Uzun suredir guncellenmeyen "calisiyor" kaydi canli is degildir: ana kartta
  // guncelmis gibi gosterilmez (oncelik 1: bayat veri canli sanilmasin).
  if (IN_FLIGHT.includes(task.status)) return age <= STALE_MS;
  return age <= RECENT_MS;
}
export function currentTasks(tasks: Task[], now = Date.now()): Task[] { return tasks.filter(task => isCurrent(task, now)); }
/**
 * Rows below the main card. A finished record can hold the main card while it
 * is fresh, but it is never a row: the summary already counts it.
 */
export function listedTasks(tasks: Task[], now = Date.now()): Task[] {
  return currentTasks(tasks, now).filter(task => task.status !== "Tamamlandi").slice(0, 3);
}
export function pillStates(tasks: Task[], focus: Task | undefined): Record<Exclude<Agent, "claude">, "active" | "idle" | "disabled"> {
  const current = currentTasks(tasks);
  return Object.fromEntries(["codex", "glm", "gemini", "opencode"].map(agent => [agent,
    current.some(task => task.agent === agent) ? focus?.agent === agent ? "active" : "idle" : "disabled",
  ])) as Record<Exclude<Agent, "claude">, "active" | "idle" | "disabled">;
}
export function expressionFor(status?: Status | null): Expression {
  if (!status) return "idle";
  return ({ Hazirlaniyor: "working", Calisiyor: "working", Bekliyor: "thinking", Duraklatildi: "alert", Tamamlandi: "happy", Hata: "error" } as const)[status];
}
class AppState {
  notificationsPaused = false;
  private codexQuota: Quota | null = null;
  setCodexLimits(value: unknown) {
    const limits = object(value);
    const bucket = [object(limits?.primary), object(limits?.secondary)].find(row => percent(row?.usedPercent) !== null);
    const reset = bucket?.resetsAt;
    const resetDate = typeof reset === "number" && Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null;
    this.codexQuota = { remaining_percent: bucket ? 100 - (bucket.usedPercent as number) : null,
      reset_at: resetDate && Number.isFinite(resetDate.getTime()) ? resetDate.toISOString() : null,
      checked_at: bucket ? new Date().toISOString() : null };
    this.snapshot = { ...this.snapshot, quotas: { ...this.snapshot.quotas, codex: this.codexQuota } }; this.notify();
  }
  private badge: Expression | null = null;
  private badgeTimer: ReturnType<typeof setTimeout> | null = null;
  setPaused(paused: boolean) {
    this.notificationsPaused = paused;
    if (paused) { if (this.badgeTimer !== null) clearTimeout(this.badgeTimer); this.badgeTimer = null; this.badge = null; }
    this.notify();
  }
  shouldAnnounce() { return !this.notificationsPaused; }
  announce(expression: Expression) {
    if (!this.shouldAnnounce()) return;
    if (this.badgeTimer !== null) clearTimeout(this.badgeTimer);
    this.badge = expression;
    this.badgeTimer = setTimeout(() => { this.badge = null; this.badgeTimer = null; this.notify(); }, 4000);
    this.notify();
  }
  snapshot: Snapshot = { connected: false, tasks: [], sourceUnavailable: true };
  settings: Settings = { screen: "primary", autoCloseInterval: 15, pet: true, tts: false };
  focusId: string | null = null;
  private listeners = new Set<() => void>();
get tasks() { return this.snapshot.tasks; }
  get current() { return currentTasks(this.tasks); }
  get focusTask() { return this.current.find(t => t.id === this.focusId) ?? preferredTask(this.current); }
  get trayTask() {
    const current = this.current;
    return current.find(task => task.status === "Hata")
      ?? current.find(task => task.quotaPaused)
      ?? current.find(task => task.status === "Duraklatildi")
      ?? preferredTask(current);
  }
  get effectiveState() {
    if (this.notificationsPaused) return "paused";
    return this.badge ?? (this.focusTask?.status === "Tamamlandi" || this.focusTask?.status === "Hata" ? "idle" : this.focusTask?.status === "Duraklatildi" && !this.focusTask.quotaPaused ? "paused" : expressionFor(this.focusTask?.status));
  }
  apply(value: unknown) {
    const next = parseState(value);
    this.snapshot = next.connected && !next.sourceUnavailable ? next : { ...this.snapshot, sourceUnavailable: true };
    if (this.codexQuota) this.snapshot.quotas = { ...this.snapshot.quotas, codex: this.codexQuota };
    const currentFocus = this.current.find(t => t.id === this.focusId);
    if (!currentFocus || (currentFocus.status === "Tamamlandi" && this.current.some(t => t.status === "Calisiyor"))) {
      this.focusId = preferredTask(this.current)?.id ?? null;
    }
    this.notify();
  }
  setFocus(id: string) { if (this.current.some(t => t.id === id)) { this.focusId = id; this.notify(); } }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { for (const fn of this.listeners) fn(); }
}
export const State = new AppState();


