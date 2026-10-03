export interface QueuedMessage { id: string; type: "notification" | "question"; timestamp: number }

/** FIFO by arrival; completed IDs remain seen for this application session. */
export class MessageQueue {
  static readonly instance = new MessageQueue();
  private items: QueuedMessage[] = [];
  private seen = new Set<string>();
  add(message: QueuedMessage): boolean {
    if (this.seen.has(message.id)) return false;
    this.seen.add(message.id); this.items.push(message); return true;
  }
  remove(id: string) { this.items = this.items.filter(message => message.id !== id); }
  current(): QueuedMessage | null { return this.items[0] ?? null; }
  peek(): QueuedMessage | null { return this.items[1] ?? null; }
  isEmpty(): boolean { return this.items.length === 0; }
}
