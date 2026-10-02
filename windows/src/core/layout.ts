// Original window sizes; keep these in step with unchanged island.rs.
export type IslandMode = "hidden" | "compact" | "expanded" | "pet" | "tray";
export type IslandViewName = "overview" | "quota" | "greeting" | "apps" | "chat" | "orkestra";
export const PANEL_W = 720, PANEL_H = 320;
export const NOTCH_W = 184, NOTCH_H = 32, COMPACT_W = 288, EXPANDED_W = 640;
export const ROUNDED_CORNER = 14, EXPANDED_CORNER = 22;
/** Smallest scale the island may shrink to before it would be unreadable. */
export const MIN_FIT = 0.5;
export function islandSize(mode: IslandMode, view: IslandViewName): { w: number; h: number } {
  if (mode === "pet") return { w: 128, h: 128 };
  if (mode === "hidden" || mode === "tray") return { w: NOTCH_W, h: 0 };
  if (mode === "compact") return { w: COMPACT_W, h: NOTCH_H };
  return { w: EXPANDED_W, h: view === "greeting" ? 160 : 286 };
}
/**
 * Uniform scale that keeps the whole panel inside the viewport the webview
 * really has.
 *
 * The native side sizes the window in physical pixels, the front end is laid
 * out in CSS pixels, and the two are only the same when the native scale factor
 * matches the webview's. When it does not — mixed-DPI desktops, a display change
 * between show and paint — the CSS viewport is smaller than PANEL_W x PANEL_H
 * and the design would be cut off on the right and the bottom. Scaling by the
 * ratio turns that clipping into a proportionally smaller island instead.
 *
 * Never enlarges: above the design size the panel keeps its original size and
 * simply sits in the middle of the extra room.
 */
export function fitScale(viewportW: number, viewportH: number): number {
  if (!(viewportW > 0) || !(viewportH > 0)) return 1;
  return Math.max(MIN_FIT, Math.min(1, viewportW / PANEL_W, viewportH / PANEL_H));
}
