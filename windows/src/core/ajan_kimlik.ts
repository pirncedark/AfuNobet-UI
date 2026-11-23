export type AjanKimlik = { id: string; kisaAd: string; renk: string; arkaPlan: string };

export function ajanKimlik(id: string): AjanKimlik {
  switch (id.toLowerCase()) {
    case "codex": return { id, kisaAd: "CDX", renk: "#10a37f", arkaPlan: "rgba(16, 163, 127, 0.15)" };
    case "gemini": return { id, kisaAd: "GEM", renk: "#d49a2a", arkaPlan: "rgba(212, 154, 42, 0.16)" };
    case "opencode": return { id, kisaAd: "OPN", renk: "#e34f26", arkaPlan: "rgba(227, 79, 38, 0.15)" };
    case "glm": return { id, kisaAd: "GLM", renk: "#b89452", arkaPlan: "rgba(184, 148, 82, 0.18)" };
    case "claude": return { id, kisaAd: "CLD", renk: "#d97757", arkaPlan: "rgba(217, 119, 87, 0.15)" };
    case "orkestra": return { id, kisaAd: "ORK", renk: "#8c8273", arkaPlan: "rgba(140, 130, 115, 0.16)" };
    default: {
      // E2: listede olmayan yeni ajan da kendi sabit rengini alır (addan türetilir, mavi/mor hariç).
      const ton = renkTonu(id.toLowerCase());
      return { id, kisaAd: id.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "?", renk: `hsl(${ton}, 56%, 46%)`, arkaPlan: `hsla(${ton}, 56%, 46%, 0.16)` };
    }
  }
}

/** Addan kararlı sıcak/zümrüt renk tonu (0–164 derece). */
export function renkTonu(ad: string): number {
  let h = 0;
  for (let i = 0; i < ad.length; i++) h = (h * 31 + ad.charCodeAt(i)) >>> 0;
  return h % 165;
}
