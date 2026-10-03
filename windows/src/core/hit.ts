// Tıklama alanı hesabı. island.rs imleci *pencere-mantıksal* pikselde okur
// (fiziksel / pencere ölçeği), ön yüz ise *CSS* pikselinde çizer. İkisi yalnız
// devicePixelRatio == pencere ölçeği olduğunda eşittir. Windows "Metin boyutu"
// (TextScaleFactor) WebView2'nin devicePixelRatio'sunu büyütür ama pencere
// ölçeğini değiştirmez: %132'de isabet kutusu 1/1.32 küçük kalıyor, alt düğme
// satırı kutunun dışına düşüyor ve tıklar masaüstüne geçiyordu.
import type { IslandMode } from "./layout";

export interface Rect { x: number; y: number; w: number; h: number }

/** CSS pikselinden pencere-mantıksal piksele çarpan. */
export function hitScale(dpr: number, nativeScale: number): number {
  if (!(dpr > 0) || !Number.isFinite(dpr) || !(nativeScale > 0) || !Number.isFinite(nativeScale)) return 1;
  const k = dpr / nativeScale;
  return k >= 0.25 && k <= 8 ? k : 1;
}
export function toWindow(r: Rect, k: number): Rect { return { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k }; }
export function cursorToCss(p: { x: number; y: number }, k: number) { return { x: p.x / k, y: p.y / k }; }

/** Kart açıkken (expanded) ve pet modunda pencerenin tamamı tıklamayı tutar;
 *  kompakt/gizli modda yalnız ada şekli, gerisi alttaki masaüstüne geçer.
 *
 *  P10: pet modunda balon açıkken pencerenin tepesinde şeffaf bir pay kalır
 *  (PET_BALON_PAY). O pay kutunun dışında tutulur, böylece balonun üstündeki
 *  boş (şeffaf) kısım tıklamayı geçirir ve masaüstüne geçer. */
export function hitRect(mode: IslandMode, drawn: Rect, viewport: { w: number; h: number }, petUstPay = 0): Rect {
  if (mode === "tray") return { x: 0, y: 0, w: 0, h: 0 };
  if (mode === "expanded") return { x: 0, y: 0, w: viewport.w, h: viewport.h };
  if (mode === "pet") {
    const pay = Math.max(0, petUstPay);
    return { x: 0, y: pay, w: viewport.w, h: Math.max(0, viewport.h - pay) };
  }
  return drawn;
}
export function ignoresClicks(mode: IslandMode) { return mode === "compact" || mode === "hidden" || mode === "tray"; }

/** Kart açıkken dışarı tıklanınca / odak kaybolunca ne olur. */
export function dismissAction(o: { mode: IslandMode; petEnabled: boolean; questionOpen: boolean }): "pet" | "none" {
  return o.mode === "expanded" && o.petEnabled && !o.questionOpen ? "pet" : "none";
}
