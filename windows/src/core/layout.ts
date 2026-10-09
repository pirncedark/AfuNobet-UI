// Original window sizes; keep these in step with unchanged island.rs.
export type IslandMode = "hidden" | "compact" | "expanded" | "pet" | "tray";
export type IslandViewName = "overview" | "quota" | "greeting" | "apps" | "chat" | "orkestra" | "sor";
/**
 * Kartın büyütme oranı (P8). Tasarım 720x320 CSS px'te yazıldı; pencere
 * KART_OLCEK katına çıkarılır ve ada `zoom` ile aynı oranda büyütülür, böylece
 * yazı, boşluk, düğme ve karakter *aynı* oranda büyür ve hiçbir kural ayrı
 * ayrı güncellenmez. CSS'teki karşılığı `--kart-olcek`.
 */
export const KART_OLCEK = 1.5;
/** Tasarım ölçüsü: kart CSS px'te bu boyutta yazıldı. */
export const DESIGN_W = 720, DESIGN_H = 320;
/** Pencere ölçüsü: tasarımın KART_OLCEK katı. Rust tarafındaki karşılığı
 *  `src-tauri/src/dpi.rs` (KART_OLCEK, PANEL_W, PANEL_H) — ikisi de aynı olmalı. */
export const PANEL_W = 1080, PANEL_H = 480;
export const PANEL_MIN_H = 480;
export const PANEL_MAX_H_RATIO = 0.85;
export const NOTCH_W = 184, NOTCH_H = 32, COMPACT_W = 288, EXPANDED_W = 640;
export const ROUNDED_CORNER = 14, EXPANDED_CORNER = 22;
/** Dar pencerede görünürlük CSS yerleşimiyle korunur; ölçek alt sınırı yoktur. */
export const PET_PENCERE = 256;
/** Design CSS width, bounded by the actual CSS viewport after zoom/fit. */
export function contentWidth(textWidth: number, viewportW: number, _viewportH: number): number {
  const limit = viewportW / (panelScale(viewportW) * KART_OLCEK);
  return Math.min(limit, Math.max(EXPANDED_W, Math.ceil(textWidth + 216)));
}
/**
 * P10 — mini pet modundayken görev/ajan mesajı balonu karakterin BAŞININ
 * ÜSTÜNDE, çizgi-roman balonu olarak durur. Balon, 256 px'lik pet kutusundan
 * ayrı bir şeritte çizilir: ölçülen alfa kutularından en yükseği (`ozel_dosya_
 * yakala`, üst ≈ 32 px) pet kutusunun tepesine kadar geldiği için balon asla
 * pet kutusuyla çakışmaz. Pencerenin alt kenarı (görev çubuğu üstü) sabit
 * kalır, karakter yerinden oynamaz; büyüme yalnız YUKARI doğrudur.
 *
 * Karşılığı Rust tarafında `src-tauri/src/glide.rs` (PET_BALON_PAY,
 * PET_BALON_YUKSEKLIK, PET_BALON_BOSLUK) — iki taraf aynı sayıları kullanır.
 */
/** Pencerenin tepesinde kalan şeffaf pay. island.rs isabet kutusuna HIT_MARGIN
 *  (14 px) eklediği için bu pay 14'ten büyük olmak zorunda: aksi hâlde balonun
 *  üstündeki "boş" kısım tıklamayı yutar ve tıklama masaüstüne geçmez. */
export const PET_BALON_PAY = 24;
export const PET_BALON_YUKSEKLIK = 340;
export const PET_BALON_GENISLIK = 296;
export const PET_BALON_PENCERE = 320;
/** Balon kuyruğu ile karakterin başı arasındaki boşluk. */
export const PET_BALON_BOSLUK = 8;
/** Balon kutusunun alt kenarı, pencerenin alt kenarından bu kadar yukarıda. */
export const PET_BALON_TABAN = PET_PENCERE + PET_BALON_BOSLUK;
/** Balon görünürken pet penceresinin yüksekliği (yalnız YUKARI büyür). */
export function petPencereYuksekligi(balon: boolean): number {
  return balon ? PET_BALON_TABAN + PET_BALON_YUKSEKLIK + PET_BALON_PAY : PET_PENCERE;
}
/** Balonun üstünde kalan şeffaf pay: isabet kutusu bu satırdan başlar. */
export function petBalonUst(balon: boolean): number { return balon ? PET_BALON_PAY : 0; }
/**
 * Kesme: ekranın üstü yetmezse pencere tepeden kırpılır ve balon da kısalır.
 * Balon kutusu pencerenin altına PET_BALON_TABAN sabit mesafeyle bağlı olduğu
 * için kalan yer kadar yükseklikte çizilir: kuyruk ucu (karakterin başına bakan
 * ::after) hep görünür, yalnız metnin üstü kırpılır.
 */
export function petBalonKutusu(pencereYuksekligi: number, taban = PET_BALON_TABAN): number {
  if (!(pencereYuksekligi > 0)) return PET_BALON_YUKSEKLIK;
  return Math.max(0, Math.min(PET_BALON_YUKSEKLIK, pencereYuksekligi - taban - PET_BALON_PAY));
}

export function islandSize(mode: IslandMode, view: IslandViewName): { w: number; h: number } {
  if (mode === "pet") return { w: PET_PENCERE, h: PET_PENCERE };
  if (mode === "hidden" || mode === "tray") return { w: NOTCH_W, h: 0 };
  if (mode === "compact") return { w: COMPACT_W, h: NOTCH_H };
  return { w: EXPANDED_W, h: view === "greeting" ? 160 : DESIGN_H };
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
  return Math.min(1, viewportW / PANEL_W, viewportH / PANEL_H);
}

export const MASCOT_VISIBLE_H = 170;
/** Expanded cards fit horizontally; height is independently bounded by the client. */
export function panelScale(viewportW: number): number { return Math.min(1, Math.max(1, viewportW) / PANEL_W); }
export function panelHeight(contentH: number, viewportW: number, viewportH: number, screenH: number) {
  const k = panelScale(viewportW) * KART_OLCEK;
  const desired = Math.min(Math.max(320 * k, contentH * k), Math.max(1, screenH) * PANEL_MAX_H_RATIO);
  return { nativeCss: desired, design: Math.min(desired, viewportH) / k };
}
/** Alpha bounds of a square sprite, fitted to a shared visible height. */
export function mascotScale(bounds: [number, number, number, number], frame: number, target = MASCOT_VISIBLE_H) {
  const width = (bounds[2] - bounds[0]) * frame, height = (bounds[3] - bounds[1]) * frame;
  return Math.min(target / Math.max(1, height), (frame - 12) / Math.max(1, width));
}

/** The small-screen CSS mode removes panel zoom and its fit transform. */
export function mascotDesignHeight(viewportW: number, logicalPerCss: number, bodyZoom = 1): number {
  const cardScale = viewportW <= 719 ? 1 : panelScale(viewportW) * KART_OLCEK;
  return MASCOT_VISIBLE_H / (cardScale * logicalPerCss * bodyZoom);
}
