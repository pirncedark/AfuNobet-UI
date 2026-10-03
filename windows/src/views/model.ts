// Görünüm modeli (OPUS-ARAYUZ): DOM'suz, saf fonksiyonlar. views.ts bunları çizer,
// testler doğrudan bunları sınar. Uydurma sayı yok: okunamayan alan gizli ya da "?".
import { AGENT_TR, ui } from "../core/labels";
import { clipText } from "../core/metin";
import { currentTasks, type Agent, type Quota, type Snapshot, type Task } from "../core/state";
import { ajanKimlik, type AjanKimlik } from "../core/ajan_kimlik";

/**
 * Görev kaydında isteğe bağlı ek alanlar. state.ts (OPUS-PROTOKOL) bunları
 * doldurduğunda arayüz kendiliğinden gösterir; alan yoksa ilgili parça gizlidir.
 * Alan adları SONUC_T_ARAYUZ.md'de listelidir.
 */
export interface TaskExtra {
  stage: string | null;                     // F1: triage|split|run|verify|merge
  handoff: { from: string | null; to: string | null; reason: string | null; manual?: boolean } | null; // F2
  effort: string | null;                    // F3: low|medium|high|xhigh
  context: { used: number | null; total: number | null; cached?: number | null; saved?: number | null } | null; // F4
  cost: number | null;                      // F5: USD
  parentId: string | null;                  // E3: alt ajanın bağlı olduğu ana görev
  subagents: { id?: string; name: string; status: string }[] | null; // E3: ana görevin taşıdığı liste
}
export type RichTask = Task & Partial<TaskExtra>;

// ---------------- E2 ajan pill'leri ----------------
// Pill = mevcut ajan sekmesinin görünümü: kısa ad + ajan rengi + durum noktası.
// Veri yalnız state.json (Snapshot). Claude pill'i YOK; Claude yalnız kilitli
// "Claude KORUNUYOR" rozetiyle görünür. Listede olmayan yeni ajan (E1 adı) kendi
// kaydından otomatik pill alır.
export type PillId = string;
export type PillState = "aktif" | "bekliyor" | "kota" | "idle" | "kapali";
export const PILL_STATE_TR: Record<PillState, string> = { aktif: "çalışıyor", bekliyor: "bekliyor", kota: "kota doldu", idle: "boşta", kapali: "boşta" };
export interface PillRow { id: PillId; label: string; state: PillState; title: string; kimlik: AjanKimlik; soluk: boolean }
const RUNNING = new Set(["Calisiyor", "Hazirlaniyor"]);
const WAITING = new Set(["Bekliyor", "Duraklatildi"]);
const CORE_PILLS = ["codex", "gemini", "opencode"] as const;
/** Yeni ajanlar sekme şeridini taşırmasın diye üst sınır (canlı olanlar önce). */
export const EXTRA_PILL_LIMIT = 4;
const STATE_RANK: Record<PillState, number> = { aktif: 0, bekliyor: 1, kota: 2, idle: 3, kapali: 4 };

/** Görevin pill kimliği: bilinen ajan ya da E1 adıyla gelen yeni ajan. */
export function pillAgentOf(task: Task): string | null {
  return task.agent ?? task.ajanAdi ?? null;
}
function pillLabel(id: string): string {
  if (Object.prototype.hasOwnProperty.call(AGENT_TR, id)) return AGENT_TR[id as Agent];
  return (id === "orkestra" ? "Orkestra" : id.charAt(0).toUpperCase() + id.slice(1));
}
function quotaOf(snapshot: Snapshot, agent: string) {
  const quotas = snapshot.quotas as Record<string, Quota | undefined> | undefined;
  return quotas && Object.prototype.hasOwnProperty.call(quotas, agent) ? quotas[agent] ?? null : null;
}
export function agentPillState(snapshot: Snapshot, agent: string, now = Date.now()): PillState {
  const tasks = currentTasks(snapshot.tasks, now).filter(t => pillAgentOf(t) === agent);
  const quota = quotaOf(snapshot, agent);
  if (tasks.some(t => t.quotaPaused) || (quota?.remaining_percent !== null && quota?.remaining_percent !== undefined && quota.remaining_percent <= 0)) return "kota";
  if (tasks.some(t => RUNNING.has(t.status))) return "aktif";
  if (tasks.some(t => WAITING.has(t.status))) return "bekliyor";
  // "Sık kullanılan ama çalışmayan" ajan soluk "boşta" kalır: güncel kaydı ya da kota bilgisi varsa.
  if (tasks.length || quota || snapshot.tasks.some(t => pillAgentOf(t) === agent)) return "idle";
  return "kapali";
}
function pillRow(snapshot: Snapshot, id: string, now: number): PillRow {
  const state = agentPillState(snapshot, id, now);
  const label = pillLabel(id);
  return { id, label, state, title: `${label}: ${PILL_STATE_TR[state]}`, kimlik: ajanKimlik(id), soluk: state === "idle" || state === "kapali" };
}
/** Ana ekrandaki ajan sekmeleri (pill). Claude hiçbir koşulda pill almaz. */
export function agentPills(snapshot: Snapshot, now = Date.now()): PillRow[] {
  const rows: PillRow[] = CORE_PILLS.map(agent => pillRow(snapshot, agent, now));
  // GLM yalnız gerçekten kullanılıyorsa (kaydı varsa) yer kaplar.
  if (snapshot.tasks.some(t => t.agent === "glm")) rows.push(pillRow(snapshot, "glm", now));
  // E1 adıyla gelen yeni ajanlar: görünme sırası, canlı olanlar önce, üst sınırlı.
  const extra: string[] = [];
  for (const t of snapshot.tasks) {
    const id = t.agent === null ? t.ajanAdi : undefined;
    if (id && id !== "claude" && id !== "orkestra" && !extra.includes(id)) extra.push(id);
  }
  const extraRows = extra.map(id => pillRow(snapshot, id, now));
  rows.push(...extraRows.map((r, i) => [r, i] as const).sort((a, b) => STATE_RANK[a[0].state] - STATE_RANK[b[0].state] || a[1] - b[1]).slice(0, EXTRA_PILL_LIMIT).map(([r]) => r));
  const live = currentTasks(snapshot.tasks, now);
  const orkestra: PillState = snapshot.sourceUnavailable ? "kapali" : live.some(t => RUNNING.has(t.status) || t.status === "Bekliyor") ? "aktif" : "idle";
  rows.push({ id: "orkestra", label: "Orkestra", state: orkestra, title: `Orkestra: ${PILL_STATE_TR[orkestra]}`, kimlik: ajanKimlik("orkestra"), soluk: orkestra !== "aktif" });
  return rows;
}

// ---------------- F1 aşama çubuğu ----------------
export const STAGES = ["triage", "split", "run", "verify", "merge"] as const;
export type Stage = typeof STAGES[number];
export const STAGE_TR: Record<Stage, string> = { triage: "Ayırma", split: "Bölme", run: "Çalışma", verify: "Doğrulama", merge: "Birleştirme" };
const STAGE_ALIAS: Record<string, Stage> = { inceleme: "triage", incele: "triage", bol: "split", bolme: "split", calis: "run", calisma: "run", dogrula: "verify", dogrulama: "verify", birlestir: "merge", birlestirme: "merge" };
export interface StageStep { id: Stage; label: string; state: "done" | "current" | "todo" }
export function normalizeStage(value: unknown): Stage | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase().replace(/[ıİ]/g, "i").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u");
  return (STAGES as readonly string[]).includes(key) ? key as Stage : STAGE_ALIAS[key] ?? null;
}
/** Alan yoksa ya da tanınmıyorsa null: çubuk hiç çizilmez. */
export function stageSteps(task: RichTask | undefined | null): StageStep[] | null {
  const stage = normalizeStage(task?.stage);
  if (!stage) return null;
  const at = STAGES.indexOf(stage);
  const finished = task?.status === "Tamamlandi" && stage === "merge";
  return STAGES.map((id, i) => ({ id, label: STAGE_TR[id], state: i < at || finished ? "done" : i === at ? "current" : "todo" }));
}

// ---------------- F2 ajan devri ----------------
function agentName(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value) return null;
  const key = value.toLowerCase() as Agent;
  return AGENT_TR[key] ?? (value === "orkestra" ? "Orkestra" : null);
}
function reasonPhrase(reason: string | null | undefined): string | null {
  const r = typeof reason === "string" ? reason.toLowerCase() : "";
  if (/kota|quota|rate.?limit|usage.?limit/.test(r)) return "kotası doldu";
  if (/hata|error|fail|cok|çök/.test(r)) return "hata verdi";
  if (/zaman|timeout/.test(r)) return "zaman aşımına uğradı";
  if (/durak|pause/.test(r)) return "duraklatıldı";
  return null;
}
/** "Codex kotası doldu → Gemini devraldı" ya da "→ bekliyor". Claude yalnız elle seçilmişse görünür. */
export function handoffText(task: RichTask | undefined | null): string | null {
  if (!task) return null;
  const h = task.handoff;
  if (h && typeof h === "object" && !Array.isArray(h)) {
    const from = agentName(h.from);
    if (from) {
      const toKey = typeof h.to === "string" ? h.to.toLowerCase() : "";
      if (from !== "Claude" && toKey !== "claude" && (h.to == null || agentName(h.to))) {
        const to = agentName(h.to);
        const reason = reasonPhrase(h.reason);
        if (reason && to !== from) {
          return `${from} ${reason} → ${to ? `${to} devraldı` : "bekliyor"}`;
        }
      }
    }
  }
  
  // E2: "devralan yoksa bekliyor" ve quota kaynaklı duraklama.
  if (task.status === "Duraklatildi" && (task.quotaPaused || task.quota?.remaining_percent === 0)) {
    const fromName = task.agent ? AGENT_TR[task.agent] : null;
    if (fromName && fromName !== "Claude") {
      const reset = task.quota?.reset_at;
      let timeStr = "";
      if (reset) {
        const d = new Date(reset);
        if (!isNaN(d.getTime())) timeStr = ` (yenilenme ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;
      }
      return `${fromName} kotası doldu · bekliyor${timeStr}`;
    }
  }
  
  return null;
}

// ---------------- F3 model ----------------
const EFFORT_TR: Record<string, string> = { minimal: "çok hızlı", low: "hızlı", medium: "orta", high: "derin", xhigh: "çok derin", max: "en derin", ultra: "en derin" };
export function modelText(task: RichTask | undefined | null): string {
  const model = typeof task?.model === "string" ? task.model.trim() : "";
  if (!model || model === "?" || model === "—") return "";
  const effort = typeof task?.effort === "string" ? EFFORT_TR[task.effort.toLowerCase()] : undefined;
  return effort ? `${model} · ${effort}` : model;
}

// ---------------- F4 context / F5 maliyet (yalnız ayrıntıda) ----------------
const num = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
export function contextText(task: RichTask | undefined | null): string | null {
  const c = task?.context;
  if (!c || typeof c !== "object") return null;
  const used = num(c.used), total = num(c.total);
  if (used === null || total === null || total <= 0 || used > total) return null;
  const parts = [`Bağlam: %${Math.round((used / total) * 100)} dolu`];
  const cached = num(c.cached), saved = num(c.saved);
  if (cached !== null && cached <= total) parts.push(`önbellek %${Math.round((cached / total) * 100)}`);
  if (saved !== null) parts.push(`${compact(saved)} tasarruf`);
  return parts.join(" · ");
}
function compact(n: number): string { return n >= 1000 ? `${Math.round(n / 100) / 10}B` : String(Math.round(n)); }
export function costText(task: RichTask | undefined | null): string | null {
  const v = num(task?.cost);
  if (v === null) return null;
  return `Maliyet: $${v < 0.01 && v > 0 ? "<0.01" : v.toFixed(2)}`;
}

// ---------------- E3 alt ajanlar ----------------
export interface SubRow { id: string; name: string; status: string; done: boolean }
const STATUS_WORD: Record<string, string> = { Calisiyor: "çalışıyor", Hazirlaniyor: "hazırlanıyor", Bekliyor: "sırada", Duraklatildi: "duraklatıldı", Tamamlandi: "bitti", Hata: "hata", start: "çalışıyor", started: "çalışıyor", running: "çalışıyor", stop: "bitti", stopped: "bitti", finished: "bitti", done: "bitti", error: "hata" };
export function subagentRows(task: RichTask | undefined | null, all: RichTask[]): SubRow[] {
  if (!task) return [];
  const rows: SubRow[] = [];
  for (const child of all) if (child.parentId === task.id && child.id !== task.id) {
    const word = STATUS_WORD[child.status] ?? "çalışıyor";
    rows.push({ id: child.id, name: clipText(child.title, 48).text, status: word, done: word === "bitti" });
  }
  if (Array.isArray(task.subagents)) task.subagents.forEach((s, i) => {
    if (!s || typeof s.name !== "string" || !s.name.trim()) return;
    const word = STATUS_WORD[s.status] ?? "çalışıyor";
    rows.push({ id: s.id ?? `${task.id}#${i}`, name: clipText(s.name, 48).text, status: word, done: word === "bitti" });
  });
  return rows;
}
/** Alt ajan kayıtları ana listede ayrı görev gibi kalabalık yapmaz; ana görev altında satır olur. */
export function topLevel(tasks: RichTask[]): RichTask[] {
  const ids = new Set(tasks.map(t => t.id));
  return tasks.filter(t => !t.parentId || !ids.has(t.parentId));
}

// ---------------- F7 arama/filtre ----------------
export const FILTER_MIN = 10;
export interface Filter { query: string; agent: Agent | "hepsi"; status: "hepsi" | "calisan" | "bekleyen" | "biten" | "hata" }
export const EMPTY_FILTER: Filter = { query: "", agent: "hepsi", status: "hepsi" };
export function filterVisible(tasks: Task[]): boolean { return tasks.length >= FILTER_MIN; }
const fold = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "");
export function filterTasks<T extends Task>(tasks: T[], f: Filter): T[] {
  const q = fold(f.query.trim());
  return tasks.filter(t => {
    if (f.agent !== "hepsi" && t.agent !== f.agent) return false;
    if (f.status === "calisan" && !RUNNING.has(t.status)) return false;
    if (f.status === "bekleyen" && t.status !== "Bekliyor" && t.status !== "Duraklatildi") return false;
    if (f.status === "biten" && t.status !== "Tamamlandi") return false;
    if (f.status === "hata" && t.status !== "Hata") return false;
    return !q || fold(`${t.title} ${t.repo ?? ""} ${t.agent ? AGENT_TR[t.agent] : ""}`).includes(q);
  });
}

// ---------------- F8 uzun metin ----------------
/** Görünen metin kırpılır; tam metin title (tooltip) olarak kalır. Kod noktası güvenli.
 *  Q1: kural ortak modüle taşındı (core/metin) ki mesaj/sohbet/soru da aynı kuralı kullansın. */
export { clipText } from "../core/metin";

// ---------------- F9 boş durum ----------------
export function emptyState(snapshot: Snapshot): { title: string; message: string; retry: boolean } {
  if (snapshot.sourceUnavailable) return { title: ui("waiting"), message: "", retry: true };
  return { title: ui("ready"), message: ui("emptyMessage"), retry: false };
}

