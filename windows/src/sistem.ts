import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { mountGitHubPanel } from "./sistem/servis";
import "./sistem/sistem.css";
import { State } from "./core/state";
import { PET_IFADE_OLAYI, loadMessageAlert, loadPetIfade, saveMessageAlert, savePetIfade } from "./core/settings";
import { showNotification } from "./message/notifications";

interface AyarSatiri {
  dugme: HTMLButtonElement;
  aciklama: HTMLElement;
  koy: (acik: boolean) => void;
}

/** Bir ayar satırı: solda ad + kısa açıklama, sağda gerçek anahtar. */
function ayarSatiri(document: Document, name: string, description: string, paint: (button: HTMLButtonElement) => void): AyarSatiri {
  const dugme = document.createElement("button");
  dugme.type = "button";
  dugme.className = "sistem-ayar";
  dugme.setAttribute("role", "switch");
  const metin = document.createElement("span");
  metin.className = "sistem-ayar-metin";
  const ad = document.createElement("span");
  ad.className = "sistem-ayar-ad";
  ad.textContent = name;
  const aciklamaEl = document.createElement("small");
  aciklamaEl.className = "sistem-ayar-not";
  aciklamaEl.textContent = description;
  metin.append(ad, aciklamaEl);
  const anahtar = document.createElement("span");
  anahtar.className = "sistem-anahtar";
  anahtar.setAttribute("aria-hidden", "true");
  dugme.append(metin, anahtar);
  paint(dugme);
  return {
    dugme,
    aciklama: aciklamaEl,
    koy: acik => dugme.setAttribute("aria-checked", String(acik)),
  };
}

// A secondary panel opened from the tray. Existing main/island owners remain independent.
async function startSystemPanel() {
  if (!("__TAURI_INTERNALS__" in window)) return;
  const panel = document.createElement("section");
  panel.hidden = true;
  panel.className = "sistem-panel";
  panel.setAttribute("aria-label", "Durum");
  const head = document.createElement("header");
  head.className = "sistem-head";
  const heading = document.createElement("h2");
  heading.className = "sistem-title";
  heading.textContent = "Durum";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "sistem-kapat";
  close.textContent = "✕";
  close.setAttribute("aria-label", "Kapat");
  close.title = "Kapat";
  head.append(heading, close);
  const message = document.createElement("p");
  message.className = "sistem-durum";
  message.setAttribute("role", "status");
  message.textContent = "Görevlerini ana karttan izleyebilirsin.";
  const advanced = document.createElement("details");
  advanced.className = "sistem-gelisimis";
  const summary = document.createElement("summary");
  summary.className = "sistem-ozet";
  const ok = document.createElement("span");
  ok.className = "sistem-ok";
  ok.setAttribute("aria-hidden", "true");
  ok.textContent = "▸";
  const ozetAd = document.createElement("span");
  ozetAd.textContent = "Gelişmiş";
  summary.append(ok, ozetAd);
  advanced.append(summary);
  const satirlar = document.createElement("div");
  satirlar.className = "sistem-ayarlar";

  State.settings.messageAlert = loadMessageAlert();
  // Ana karttaki Ayarlar menüsüyle aynı ad ve açıklama metni.
  const alert = ayarSatiri(document, "Mesaj gelince öne gel", "Yeni mesaj geldiğinde Afu görünür.",
    dugme => dugme.setAttribute("aria-checked", String(State.settings.messageAlert !== false)));
  alert.dugme.title = "Yeni mesaj geldiğinde Afu görünür.";
  alert.dugme.addEventListener("click", () => {
    const enabled = State.settings.messageAlert === false;
    if (!saveMessageAlert(enabled)) { message.textContent = "Ayar kaydedilemedi; yeniden dene."; return; }
    State.settings.messageAlert = enabled; alert.koy(enabled);
    window.dispatchEvent(new Event("afu-message-setting"));
  });
  window.addEventListener("afu-message-setting", () => alert.koy(State.settings.messageAlert !== false));

  // W7: Afu boştayken arada kısa ifade yapar (varsayılan açık).
  let ifadeAcik = loadPetIfade();
  const ifade = ayarSatiri(document, "Arada ifade yap", "Afu boştayken kısa ifadeler yapar.",
    dugme => dugme.setAttribute("aria-checked", String(ifadeAcik)));
  ifade.dugme.title = "Afu boştayken kısa ifadeler yapar.";
  window.addEventListener(PET_IFADE_OLAYI, () => { ifadeAcik = loadPetIfade(); ifade.koy(ifadeAcik); });
  ifade.dugme.addEventListener("click", () => {
    if (!savePetIfade(!ifadeAcik)) { message.textContent = "Ayar kaydedilemedi; yeniden dene."; return; }
    ifadeAcik = !ifadeAcik; ifade.koy(ifadeAcik);
    window.dispatchEvent(new Event(PET_IFADE_OLAYI));
  });

  // Ses: aynı anahtar satırı, ana listede; "Gelişmiş" yalnız GitHub'ı tutar.
  let muted = false;
  const mute = ayarSatiri(document, "Afu'nun sesi", "Ses açık.", dugme => dugme.setAttribute("aria-checked", "true"));
  mute.dugme.disabled = true;
  const paintMute = () => {
    mute.koy(!muted);
    mute.aciklama.textContent = muted ? "Ses kapalı." : "Ses açık.";
    mute.dugme.setAttribute("aria-label", muted ? "Afu'nun sesi. Ses kapalı." : "Afu'nun sesi. Ses açık.");
  };
  void invoke<{ muted: boolean }>("bildirim_ayarlari").then(settings => {
    muted = settings.muted; paintMute(); mute.dugme.disabled = false;
  }).catch(() => { mute.aciklama.textContent = "Ses ayarı okunamadı; yeniden aç."; mute.koy(false); });
  mute.dugme.addEventListener("click", async () => {
    mute.dugme.disabled = true;
    try { muted = (await invoke<{ muted: boolean }>("ses_sessiz", { muted: !muted })).muted; paintMute(); }
    catch { message.textContent = "Ses ayarı kaydedilemedi; yeniden dene."; }
    finally { mute.dugme.disabled = false; }
  });

  satirlar.append(alert.dugme, ifade.dugme, mute.dugme);
  panel.append(head, message, satirlar, advanced);
  let disposeService: (() => void) | undefined;
  const attach = () => {
    const host = document.getElementById("island");
    if (host && !panel.isConnected) {
      host.append(panel);
      disposeService ??= mountGitHubPanel(advanced);
    }
  };
  const hide = () => { panel.hidden = true; advanced.open = false; };
  const show = () => { attach(); panel.hidden = false; };
  close.addEventListener("click", hide);
  // Esc de kapatır; odak kapat düğmesine döner, panel bir sonraki açılışta hazır.
  window.addEventListener("keydown", event => { if (event.key === "Escape" && !panel.hidden) { hide(); close.focus(); } });
  const statusOff = await listen("system-status", show);
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
