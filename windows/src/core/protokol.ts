// Alt ajan takibi (E3): ada `ajan-olaylari` ile satır listesini gönderir.
// Sözleşme: docs/AJAN_PROTOKOLU.md. Tauri yoksa (test) sessiz çalışır.
import { invoke } from "@tauri-apps/api/core";
import { IS_TAURI, onEvent } from "./bridge";
import { State } from "./state";
export const AJAN_OLAYI = "ajan-olaylari";
export async function ajanOlaylariniDinle(): Promise<() => void> {
  if (!IS_TAURI) return () => {};
  let birak: () => void = () => {};
  try { birak = await onEvent<unknown>(AJAN_OLAYI, payload => State.applyAjanlar(payload)); } catch { /* sessiz geç */ }
  try { State.applyAjanlar(await invoke<unknown>("ajan_listesi")); } catch { /* sessiz geç */ }
  return birak;
}
