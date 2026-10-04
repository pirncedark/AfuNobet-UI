import { getCurrentWindow } from "@tauri-apps/api/window";
import { Bridge } from "../core/bridge";
import { MessageQueue, type QueuedMessage } from "./queue";
import type { MesajAjan } from "./message";
import type { Mesaj } from "./message";

export interface NotificationMessage extends QueuedMessage { text?: string; ajan?: MesajAjan; requiresReply?: boolean; raw?: Mesaj }
export interface MessageWindow {
  /** Optional readers; a window without them is treated as hidden and not on top (plain island). */
  isVisible?(): Promise<boolean>;
  isAlwaysOnTop?(): Promise<boolean>;
  setAlwaysOnTop(on: boolean): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
}
/** One owner for timer, question lifetime and non-activating window operations. */
export class MessageNotifications {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private messages = new Map<string, NotificationMessage>();
  private durations = new Map<string, number>();
  private listeners = new Set<() => void>();
  private activeId: string | null = null;
  private enabled = true;
  private raised = false;
  private disposed = false;
  private onayBekliyor = false;
  private operations: Promise<void> = Promise.resolve();
  private before: Promise<{ visible: boolean; top: boolean } | null> | null = null;
  constructor(private queue: MessageQueue, private window: MessageWindow) {}
  current(): NotificationMessage | null { return this.queue.current() ? this.messages.get(this.queue.current()!.id) ?? null : null; }
  get isOpen(): boolean { return this.current() !== null; }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  settled(): Promise<void> { return this.operations; }
  showNotification(message: NotificationMessage, duration = 8000) {
    if (this.disposed || !this.queue.add(message)) return;
    this.messages.set(message.id, message); this.durations.set(message.id, duration); this.refresh();
  }
  /** The native directory watcher supplies the complete question snapshot. */
  syncQuestions(questions: QueuedMessage[]) {
    if (this.disposed) return;
    const ids = new Set(questions.map(question => question.id));
    for (const message of this.messages.values()) {
      if (message.type === "question" && !ids.has(message.id)) this.remove(message.id);
    }
    for (const question of questions) {
      if (this.queue.add(question)) this.messages.set(question.id, question);
    }
    this.refresh();
  }
  close(id = this.activeId) { if (id == null || this.disposed) return; this.remove(id); this.refresh(); }
  private remove(id: string) { this.queue.remove(id); this.messages.delete(id); this.durations.delete(id); }
  setEnabled(enabled: boolean) {
    if (enabled === this.enabled || this.disposed) return;
    this.enabled = enabled; this.updateWindow();
    for (const listener of this.listeners) listener();
  }
  private refresh() {
    const onay = [...this.messages.values()].some(message => message.type === "question");
    if (onay !== this.onayBekliyor) {
      this.onayBekliyor = onay;
      this.operations = this.operations.then(() => Bridge.petOnayBekliyor(onay)).catch(() => {});
    }
    const message = this.current();
    if ((message?.id ?? null) === this.activeId) return;
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = null; this.activeId = message?.id ?? null;
    // Otomatik kapanma YOK — kullanıcı "Okudum" ile kapatır
    this.updateWindow();
    for (const listener of this.listeners) listener();
  }
  private updateWindow() {
    const raise = this.enabled && this.isOpen;
    if (raise === this.raised) return;
    this.raised = raise;
    // Start reading before subscribers change the shared pet/island window.
    if (raise && !this.before) this.before = this.readWindow();
    const before = this.before;
    // Serializing prevents an old, slow show() from winning over a later hide().
    this.operations = this.operations.then(async () => {
      // Raising never depends on the earlier state; only the restore step waits for it.
      const previous = raise ? null : await before;
      if (!raise && !previous) {
        if (!this.raised && this.before === before) this.before = null;
        return; // Unknown state must never hide a pet; retry on the next message.
      }
      try { await this.window.setAlwaysOnTop(raise || previous!.top); } catch { /* optional window operation */ }
      try { if (raise || previous!.visible) await this.window.show(); else await this.window.hide(); } catch { /* next event can recover */ }
      if (!raise && !this.raised && this.before === before) this.before = null;
    });
  }
  /** Reads the pre-message state synchronously; a failing reader yields null (never hide). */
  private readWindow(): Promise<{ visible: boolean; top: boolean } | null> {
    try {
      return Promise.all([this.window.isVisible?.() ?? false, this.window.isAlwaysOnTop?.() ?? false])
        .then(([visible, top]) => ({ visible, top })).catch(() => null);
    } catch { return Promise.resolve(null); }
  }
  dispose() {
    if (this.disposed) return;
    for (const id of this.messages.keys()) this.queue.remove(id);
    this.messages.clear(); this.durations.clear(); this.refresh();
    this.listeners.clear(); this.disposed = true;
  }
}

const nativeWindow: MessageWindow = {
  isVisible: async () => "__TAURI_INTERNALS__" in window ? getCurrentWindow().isVisible() : true,
  isAlwaysOnTop: async () => "__TAURI_INTERNALS__" in window ? getCurrentWindow().isAlwaysOnTop() : false,
  setAlwaysOnTop: async on => { if ("__TAURI_INTERNALS__" in window) await getCurrentWindow().setAlwaysOnTop(on); },
  show: async () => { if ("__TAURI_INTERNALS__" in window) await getCurrentWindow().show(); },
  hide: async () => { if ("__TAURI_INTERNALS__" in window) await getCurrentWindow().hide(); },
};
export const messageNotifications = new MessageNotifications(MessageQueue.instance, nativeWindow);
export const showNotification = (message: NotificationMessage, duration = 8000) => messageNotifications.showNotification(message, duration);
