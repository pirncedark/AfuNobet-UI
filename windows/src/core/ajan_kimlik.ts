export type AjanKimlik = { id: string; kisaAd: string; renk: string; arkaPlan: string };

export function ajanKimlik(id: string): AjanKimlik {
  switch (id.toLowerCase()) {
    case "codex": return { id, kisaAd: "CDX", renk: "#10a37f", arkaPlan: "rgba(16, 163, 127, 0.15)" };
    case "gemini": return { id, kisaAd: "GEM", renk: "#1a73e8", arkaPlan: "rgba(26, 115, 232, 0.15)" };
    case "opencode": return { id, kisaAd: "OPN", renk: "#e34f26", arkaPlan: "rgba(227, 79, 38, 0.15)" };
    case "glm": return { id, kisaAd: "GLM", renk: "#9c27b0", arkaPlan: "rgba(156, 39, 176, 0.15)" };
    case "claude": return { id, kisaAd: "CLD", renk: "#d97757", arkaPlan: "rgba(217, 119, 87, 0.15)" };
    case "orkestra": return { id, kisaAd: "ORK", renk: "#607d8b", arkaPlan: "rgba(96, 125, 139, 0.15)" };
    default: {
      // E2: listede olmayan yeni ajan da kendi sabit rengini alır (addan türetilir).
      const ton = renkTonu(id.toLowerCase());
      return { id, kisaAd: id.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "?", renk: `hsl(${ton}, 60%, 58%)`, arkaPlan: `hsla(${ton}, 60%, 58%, 0.15)` };
    }
  }
}

/** Addan kararlı renk tonu (0–359). Aynı ad her açılışta aynı rengi verir. */
export function renkTonu(ad: string): number {
  let h = 0;
  for (let i = 0; i < ad.length; i++) h = (h * 31 + ad.charCodeAt(i)) >>> 0;
  return h % 360;
}
