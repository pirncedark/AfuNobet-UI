import type { Agent, Status } from "./state";
export const STATUS_TR: Record<Status, string> = { Hazirlaniyor: "Hazırlanıyor", Calisiyor: "Çalışıyor", Bekliyor: "Bekliyor", Duraklatildi: "Duraklatıldı", Tamamlandi: "Tamamlandı", Hata: "Hata" };
export const AGENT_TR: Record<Agent, string> = { codex: "Codex", glm: "GLM", gemini: "Gemini", opencode: "OpenCode", claude: "Claude" };
export const UI_TR = {
  brand: "AfuNöbet", waiting: "AfuNöbet bekleniyor", ready: "Afu hazır", welcome: "Afu yanında",
  orientation: "Görevlerini buradan izleyebilirsin", hint: "Üzerine gel, açmak için dokun",
  quota: "Kota durumu", back: "Görevlere dön", collapse: "Küçült", done: "Tamam",
  progress: "Görev ilerlemesi", completed: "tamamlandı", nextTask: "Yeni görev gelince burada görünecek",
  quotaNote: "Kayıtlı kota bilgileri gösterilir",
} as const;
