import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { mountGitHubPanel } from "./sistem/servis";
import { State } from "./core/state";
import { loadMessageAlert, saveMessageAlert } from "./core/settings";
import { showNotification } from "./message/notifications";

// A secondary panel opened from the tray. Existing main/island owners remain independent.
async function startSystemPanel() {
  if (!("__TAURI_INTERNALS__" in window)) return;
  const panel = document.createElement("section");
  panel.hidden = true;
  panel.setAttribute("aria-label", "Durum");
  panel.style.cssText = "position:absolute;inset:18px;z-index:80;padding:16px;border-radius:18px;background:#18222f;color:#eef4ff;overflow:auto;font:13px system-ui;box-shadow:0 8px 30px #0006";
  const heading = document.createElement("h2");
  heading.textContent = "Durum";
  const close = document.createElement("button");
  close.textContent = "Kapat";
  const message = document.createElement("p");
  message.setAttribute("role", "status");
  message.textContent = "Görevlerini ana karttan izleyebilirsin.";
  const advanced = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Gelişmiş";
  const mute = document.createElement("button");
  mute.type = "button";
  mute.setAttribute("role", "switch");
  mute.textContent = "Ses ayarı okunuyor";
  mute.disabled = true;
  advanced.append(summary, mute);
  const alertToggle = document.createElement("button");
  alertToggle.type = "button";
  alertToggle.setAttribute("role", "switch");
  alertToggle.textContent = "Mesaj gelince öne gel";
  State.settings.messageAlert = loadMessageAlert();
  const paintAlert = () => alertToggle.setAttribute("aria-checked", String(State.settings.messageAlert !== false));
  paintAlert();
  alertToggle.addEventListener("click", () => {
    const enabled = State.settings.messageAlert === false;
    if (!saveMessageAlert(enabled)) { message.textContent = "Ayar kaydedilemedi; yeniden dene."; return; }
    State.settings.messageAlert = enabled; paintAlert();
    window.dispatchEvent(new Event("afu-message-setting"));
  });
  panel.append(heading, message, alertToggle, advanced, close);
  let disposeService: (() => void) | undefined;
  let muted = false;
  const paintMute = () => {
    mute.textContent = muted ? "Sesleri aç" : "Sesleri kapat";
    mute.setAttribute("aria-checked", String(!muted));
  };
  void invoke<{ muted: boolean }>("bildirim_ayarlari").then(settings => {
    muted = settings.muted; paintMute(); mute.disabled = false;
  }).catch(() => { mute.textContent = "Ses ayarı okunamadı; yeniden aç."; });
  mute.addEventListener("click", async () => {
    mute.disabled = true;
    try { muted = (await invoke<{ muted: boolean }>("ses_sessiz", { muted: !muted })).muted; paintMute(); }
    catch { message.textContent = "Ses ayarı kaydedilemedi; yeniden dene."; }
    finally { mute.disabled = false; }
  });
  const hide = () => { panel.hidden = true; advanced.open = false; };
  close.addEventListener("click", hide);
  const attach = () => {
    const host = document.getElementById("island");
    if (host && !panel.isConnected) {
      host.append(panel);
      disposeService ??= mountGitHubPanel(advanced);
    }
  };
  const statusOff = await listen("system-status", () => { attach(); panel.hidden = false; });
  const hiddenOff = await listen("system-hidden", hide);
  // sorular/ is watched by questions.rs; soruAkisiniBagla feeds those directory
  // snapshots into the same queue, including file deletions. No FS plugin needed.
  const notificationOff = await listen<{ id: string; kind: string; message: string }>("afunobet-bildirim", event => {
    // Fixed native messages only; never render untrusted task text or HTML.
    const texts: Record<string, string> = {
      finished: "Görev tamamlandı.", error: "Görev tamamlanamadı; yeniden dene.",
      rate_limit: "Kota doldu; yenilenince devam edecek.", question: "Cevabın gerekiyor; görev kartını aç.",
    };
    const text = texts[event.payload.kind];
    if (!text) return;
    message.textContent = text;
    // A real question is presented by its answerable card, never a timed banner.
    if (event.payload.kind !== "question" && event.payload.id) showNotification({
      id: `native:${event.payload.id}`, type: "notification", timestamp: Date.now(), text,
    });
  });
  window.addEventListener("pagehide", () => { statusOff(); hiddenOff(); notificationOff(); disposeService?.(); }, { once: true });
}
void startSystemPanel();
