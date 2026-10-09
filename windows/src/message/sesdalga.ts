import { listen } from "@tauri-apps/api/event";

/** Konuşurken (turuncu) ve mikrofon dinlerken (yeşil) maskotun altında ses dalgası gösterir. */
export function sesDalga(durum: "konusuyor" | "dinliyor" | null) {
  let el = document.getElementById("afu-ses-dalga");
  if (!durum) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("div"); el.id = "afu-ses-dalga"; el.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 5; i++) el.append(document.createElement("i"));
    document.body.append(el);
  }
  el.className = durum;
  el.title = durum === "konusuyor" ? "Afu konuşuyor" : "Seni dinliyorum";
}

let seviyeDinleniyor = false;
/** Mikrofon seviyesi (0–1) gelince yeşil dalgayı gerçek sese göre oynatır. */
export function mikSeviyesiniBagla() {
  if (seviyeDinleniyor) return;
  seviyeDinleniyor = true;
  void listen<number>("afu-mic-level", e => {
    const el = document.getElementById("afu-ses-dalga");
    if (el) el.style.setProperty("--lvl", String(Math.min(1, Math.max(0, Number(e.payload) * 12))));
  }).catch(() => { seviyeDinleniyor = false; });
}
