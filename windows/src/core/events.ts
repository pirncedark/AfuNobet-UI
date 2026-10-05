import type { Agent, Task } from "./state";
export type EventKind = "JOB_STARTED" | "FILE_EDIT" | "COMMAND" | "WAITING" | "RATE_LIMIT" | "JOB_FINISHED" | "JOB_FAILED";
export interface AfuEvent { kind: EventKind; taskId: string; agent: Agent | null }
const CLAUDE_OLAYLARI: EventKind[] = ["WAITING", "RATE_LIMIT", "JOB_FINISHED", "JOB_FAILED"];
export function deriveEvents(prev: Task[], next: Task[]): AfuEvent[] {
  const previous = new Map(prev.map(task => [task.id, task]));
  const events: AfuEvent[] = [];
  for (const task of next) {
    const old = previous.get(task.id);
    let kind: EventKind | undefined;
    if (old?.status !== task.status) {
      if (task.status === "Calisiyor" || task.status === "Hazirlaniyor") kind = "JOB_STARTED";
      else if (task.status === "Bekliyor") kind = "WAITING";
      // Ajan borusunda "Duraklatildi" onay sorusu da olabilir; kota yalnız quotaPaused ile.
      else if (task.status === "Duraklatildi") kind = task.id.startsWith("ajan:") && !task.quotaPaused ? "WAITING" : "RATE_LIMIT";
      else if (old && task.status === "Tamamlandi") kind = "JOB_FINISHED";
      else if (old && task.status === "Hata") kind = "JOB_FAILED";
    } else if (task.status === "Calisiyor") {
      if (old.file !== task.file) kind = "FILE_EDIT";
      else if (old.currentAction !== task.currentAction) kind = "COMMAND";
    }
    // Claude (1.0.4): yalnız Afu'nun ifadesini oynatan sonuç olayları; iş başlangıcı ve
    // dosya/komut adımları her turda tekrarlandığı için olay sayılmaz.
    if (kind && task.agent === "claude" && !CLAUDE_OLAYLARI.includes(kind)) kind = undefined;
    if (kind) events.push({ kind, taskId: task.id, agent: task.agent });
  }
  return events;
}
export class EventDeduper {
  private seen = new Map<string, number>();
  accept(event: AfuEvent, now: number): boolean {
    for (const [key, timestamp] of this.seen) if (now - timestamp >= 60000) this.seen.delete(key);
    const key = `${event.kind}:${event.taskId}`;
    if (this.seen.has(key)) return false;
    if (this.seen.size >= 512) this.seen.delete(this.seen.keys().next().value!);
    this.seen.set(key, now);
    return true;
  }
}
