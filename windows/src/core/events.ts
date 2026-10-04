import type { Agent, Task } from "./state";
export type EventKind = "JOB_STARTED" | "FILE_EDIT" | "COMMAND" | "WAITING" | "RATE_LIMIT" | "JOB_FINISHED" | "JOB_FAILED";
export interface AfuEvent { kind: EventKind; taskId: string; agent: Agent | null }
export function deriveEvents(prev: Task[], next: Task[]): AfuEvent[] {
  const previous = new Map(prev.map(task => [task.id, task]));
  const events: AfuEvent[] = [];
  for (const task of next) {
    if (task.agent === "claude") continue;
    const old = previous.get(task.id);
    let kind: EventKind | undefined;
    if (old?.status !== task.status) {
      if (task.status === "Calisiyor" || task.status === "Hazirlaniyor") kind = "JOB_STARTED";
      else if (task.status === "Bekliyor") kind = "WAITING";
      else if (task.status === "Duraklatildi") kind = "RATE_LIMIT";
      else if (old && task.status === "Tamamlandi") kind = "JOB_FINISHED";
      else if (old && task.status === "Hata") kind = "JOB_FAILED";
    } else if (task.status === "Calisiyor") {
      if (old.file !== task.file) kind = "FILE_EDIT";
      else if (old.currentAction !== task.currentAction) kind = "COMMAND";
    }
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
