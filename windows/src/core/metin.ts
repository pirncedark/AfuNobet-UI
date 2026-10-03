// F8/Q1: uzun metin dayanıklılığı. Görünen metin "…" ile kısalır, tam metin
// title (tooltip) olarak kalır. Saf fonksiyonlar: DOM'suz, testler doğrudan sınar.

/** Kırpılmış görünen metin + tam metin (title). */
export interface Kirp { text: string; title: string }

/** Tek satırlı metin: boşluklar teke iner, uzunluk sınırı aşılırsa "…" eklenir.
 *  Kod noktası güvenli (emoji/İ/ş bozulmaz); boşluksuz uzun kelime de güvenli. */
export function clipText(value: string | null | undefined, max = 60): Kirp {
  const full = (value ?? "").replace(/\s+/g, " ").trim();
  const chars = Array.from(full);
  return { text: chars.length > max ? `${chars.slice(0, Math.max(1, max - 1)).join("").trimEnd()}…` : full, title: full };
}

/** Çok satırlı metin (sohbet yanıtı, soru metni): satır sonları korunur,
 *  toplam uzunluk aşılırsa satır ortasından "…" ile kesilir. */
export function clipBlock(value: string | null | undefined, max = 600): Kirp {
  const full = (value ?? "").replace(/\r\n?/g, "\n").replace(/\s+$/, "");
  const chars = Array.from(full);
  return { text: chars.length > max ? `${chars.slice(0, Math.max(1, max - 1)).join("").replace(/\s+$/, "")}…` : full, title: full };
}