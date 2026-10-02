import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { State, type Settings } from "./state";
export const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!IS_TAURI) return null;
  try { return await invoke<T>(command, args); } catch { return null; }
}
export interface BootInfo { settings: Settings; screen: { x: number; y: number; width: number; height: number; scale: number }; version: string }
export interface AppDto { id: string; ad: string; kurulu: boolean; telefonda: boolean; durum: "bos" | "calisiyor" | "uyari" | "hata" | null; ozet: string | null }
async function action<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!IS_TAURI) throw new Error("Bu işlem uygulamada kullanılabilir.");
  try { return await invoke<T>(command, args); }
  catch (error) { throw new Error(typeof error === "string" && error.length < 180 && !/[\\/]|token|secret|password|traceback/i.test(error) ? error : "İşlem tamamlanamadı. Yeniden dene."); }
}
export const Bridge = {
  codexStatus: async () => {
    const status = await action<{ status: string; loggedIn: boolean; planType: string | null; rateLimits: unknown }>("codex_status");
    State.setCodexLimits(status.rateLimits); return status;
  },
  codexSend: (text: string, attachments: string[]) => action<unknown>("codex_send", { text, attachments }),
  orkestraProjects: async () => call<string[]>("orkestra_projects"),
  orkestraSend: async (agent: string, project: string, task: string) => action<void>("orkestra_send", { agent, project, task }),
  logAc: async () => action<void>("log_ac"),
  codexCancel: () => action<unknown>("codex_cancel"),
  codexLogin: () => action<void>("codex_login"),
  codexLoginCancel: () => action<unknown>("codex_login_cancel"),
  voiceOpenSettings: (kind: "speech" | "microphone" | "network") => action<void>("voice_open_settings", { kind }),
  voiceStart: () => action<void>("voice_start"),
  voiceStop: () => action<string>("voice_stop"),
  voiceCancel: () => action<void>("voice_cancel"),
  voiceSpeak: (text: string) => action<void>("voice_speak", { text }),
  voiceSilence: () => action<void>("voice_silence"),
  voiceSupported: () => action<{ whisper: boolean; winrt_stt: boolean; tts: boolean }>("voice_supported"),
  projectOpen: (project: string) => action<void>("project_open", { project }),
  appsList: () => call<AppDto[]>("apps_list"),
  appOpen: (id: string) => action<void>("app_open", { id }),
  boot: () => call<BootInfo>("boot"), readState: () => call<unknown>("read_state"),
  setCollapsed: (collapsed: boolean) => call<void>("set_collapsed", { collapsed }),
  setIslandRect: (x: number, y: number, width: number, height: number) => call<void>("set_island_rect", { x, y, width, height }),
  focusWindow: (focused: boolean) => call<void>("focus_window", { focused }),
  setCardOpen: (open: boolean) => call<void>("set_card_open", { open }),
  scaleFactor: async (): Promise<number | null> => {
    if (!IS_TAURI) return null;
    try { const { getCurrentWindow } = await import("@tauri-apps/api/window"); return await getCurrentWindow().scaleFactor(); } catch { return null; }
  },
  reposition: () => call<void>("reposition"),
  petAppsPopup: (on: boolean) => action<void>("pet_apps_popup", { on }),
  petMode: (on: boolean) => call<void>("pet_mode", { on }),
  setPet: (on: boolean) => call<boolean>("set_pet", { on }),
  trayMode: (on: boolean) => call<void>("tray_mode", { on }),
  trayStatus: (durum: string, title: string) => call<void>("set_tray_status", { durum, title }),
};
export async function onEvent<T>(name: string, handler: (payload: T) => void) {
  if (!IS_TAURI) return () => {};
  return listen<T>(name, e => handler(e.payload));
}


