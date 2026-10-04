import type { Agent, Status } from "./state";
import { clipText, type Kirp } from "./metin";
export const STATUS_TR: Record<Status, string> = { Hazirlaniyor: "Hazırlanıyor", Calisiyor: "Çalışıyor", Bekliyor: "Bekliyor", Duraklatildi: "Duraklatıldı", Tamamlandi: "Tamamlandı", Hata: "Hata" };
export const AGENT_TR: Record<Agent, string> = { codex: "Codex", glm: "GLM", gemini: "Gemini", opencode: "OpenCode", claude: "Claude" };
export const UI_TR = {
  claudeProtection: "Claude’a otomatik iş verilmez; yalnız mesaj ve soruları iletir.",
  brand: "AfuNöbet", waiting: "AfuNöbet bekleniyor", ready: "Afu hazır", welcome: "Afu yanında",
  orientation: "Görevlerini buradan izleyebilirsin", hint: "Üzerine gel, açmak için dokun",
  quotaShort: "Kota", quota: "Kota durumu", back: "Görevlere dön", collapse: "Küçült", done: "Tamam",
  progress: "Görev ilerlemesi", completed: "tamamlandı", nextTask: "Yeni görev gelince burada görünecek",
  quotaNote: "Kayıtlı kota bilgileri gösterilir",
  // Alt düğme satırı + menü (2 Eki): 286 px yükseklikteki panelde hiçbir düğme kırpılmaz.
  ask: "Afu'ya sor", askBack: "Geri", more: "Daha fazla", apps: "Uygulamalar", chat: "Sohbet", orkestra: "Orkestra",
  petOn: "Mini pet açık", petOff: "Mini pet kapalı",
  retry: "Tekrar dene", retrying: "Deneniyor…", retryOk: "Bağlantı kuruldu.", retryFail: "Hâlâ bağlanamadı. Biraz sonra yine dene.",
  search: "Görev ara", searchPlaceholder: "Görev adı yaz…", allAgents: "Tüm ajanlar", allStatus: "Tüm durumlar",
  running: "Çalışıyor", queued: "Bekliyor", finished: "Bitti", failed: "Hata", noMatch: "Eşleşen görev yok.",
  detail: "Görev ayrıntısı", close: "Kapat", subagents: "Alt ajanlar", stages: "Aşamalar", model: "Model",
  emptyMessage: "Şu an görev yok. Bir şey sormak için Afu'ya sor'a bas.",
} as const;
export type UiKey = keyof typeof UI_TR;
/** F13: İngilizce metinler. Uzun çeviride de arayüz bozulmaz (kırpma + title). */
export const UI_EN: Record<UiKey, string> = {
  claudeProtection: "Claude is not assigned work automatically; it only relays messages and questions.",
  brand: "AfuNöbet", waiting: "Waiting for AfuNöbet", ready: "Afu is ready", welcome: "Afu is here",
  orientation: "Follow your tasks from here", hint: "Hover, then tap to open",
  quotaShort: "Quota", quota: "Quota status", back: "Back to tasks", collapse: "Collapse", done: "Done",
  progress: "Task progress", completed: "completed", nextTask: "New tasks will appear here",
  quotaNote: "Recorded quota information is shown",
  ask: "Ask Afu", askBack: "Back", more: "More", apps: "Applications", chat: "Conversation", orkestra: "Orchestra",
  petOn: "Mini pet on", petOff: "Mini pet off",
  retry: "Try again", retrying: "Trying…", retryOk: "Connected.", retryFail: "Still not connected. Try again in a moment.",
  search: "Search tasks", searchPlaceholder: "Type a task name…", allAgents: "All agents", allStatus: "All statuses",
  running: "Running", queued: "Waiting", finished: "Finished", failed: "Failed", noMatch: "No matching task.",
  detail: "Task details", close: "Close", subagents: "Sub-agents", stages: "Stages", model: "Model",
  emptyMessage: "No tasks right now. Press Ask Afu to ask something.",
};
export type Language = "tr" | "en";
let current: Language = "tr";
export function setLanguage(lang: Language) { current = lang; }
export function language(): Language { return current; }
/** Geçerli dildeki arayüz metni. Varsayılan Türkçe. */
export function ui(key: UiKey): string { return current === "en" ? UI_EN[key] : UI_TR[key]; }
/** F13/Q1: dar yer için kırpılmış metin + tam metin (title). Uzun İngilizce
 *  karşılıklar (örn. "Still not connected. Try again in a moment.") taşmaz. */
export function uiFit(key: UiKey, max = 28): Kirp { return clipText(ui(key), max); }
/** İki sözlük de aynı anahtarları taşır; eksik anahtar arayüzü bozmaz. */
export const UI_KEYS = Object.keys(UI_TR) as UiKey[];
