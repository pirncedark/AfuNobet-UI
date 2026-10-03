import "./style.css";
import { Bridge, onEvent } from "./core/bridge";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { IS_TAURI } from "./core/bridge";
import { State } from "./core/state";
import { ajanOlaylariniDinle } from "./core/protokol";
import { Island } from "./island/island";
async function main() {
  const root = document.getElementById("root");
  if (!root) return;
  const island = new Island(root);
  const boot = await Bridge.boot();
  if (boot) State.settings = { ...State.settings, ...boot.settings };
  if (boot) island.setNativeScale(boot.screen.scale);
  void Bridge.scaleFactor().then(scale => { if (scale) island.setNativeScale(scale); });
  island.applySettings();
  await ajanOlaylariniDinle();
  await onEvent<{ method: string; params: unknown }>("codex", event => { if (event.method === "account/rateLimits/updated") State.setCodexLimits(event.params); island.chat.onEvent(event); });
  if (IS_TAURI) {
    await getCurrentWebviewWindow().onDragDropEvent(event => {
      island.setDragging(event.payload.type === "enter" || event.payload.type === "over");
      if (event.payload.type === "drop") island.attachFiles(event.payload.paths);
    });
  }
  window.addEventListener("beforeunload", () => { void island.chat.detach(); });
  await island.refreshApps();
  await onEvent<null>("afu-apps-changed", () => void island.refreshApps());
  await onEvent<string>("apps-error", () => island.appsError("Uygulama açılamadı; yeniden dene."));
  await onEvent<{ x: number; y: number }>("cursor", point => island.onCursor(point.x, point.y));
  await onEvent<string>("tray", action => {
    if (action === "open") island.fsm.trayClick();
    if (action === "pause" || action === "resume") { State.setPaused(action === "pause"); if (action === "pause") { void island.chat.suspend(); void Bridge.voiceSilence(); } }
  });
  await onEvent<null>("screen-changed", () => { island.onScreenChanged(); void Bridge.reposition(); });
  await onEvent<null>("pet-idle", () => island.onPetIdle());
  await onEvent<null>("outside-click", () => island.dismiss());
  await onEvent<boolean>("pet", on => island.onPet(on));
  await onEvent<boolean>("pet-visible", visible => island.pet.setVisible(visible));
  await onEvent<boolean>("pet-enabled", on => island.setPetEnabled(on));
  await onEvent<string>("pet-setting-error", message => { island.fsm.trayClick(); island.settingError(message); });
  let received = false;
  await onEvent<unknown>("afunobet-state", value => { received = true; island.applySnapshot(value); });
  island.launch();
  const initial = await Bridge.readState();
  // A change arriving while the initial IPC read is in flight wins.
  if (!received && initial !== null) island.applySnapshot(initial);
}
void main();


