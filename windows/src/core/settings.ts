type StorageRead = Pick<Storage, "getItem">;
type StorageWrite = Pick<Storage, "setItem">;
const KEY = "afunobet-message-alert-v1";
export function loadMessageAlert(storage?: StorageRead): boolean {
  try { return (storage ?? localStorage).getItem(KEY) !== "false"; } catch { return true; }
}
export function saveMessageAlert(enabled: boolean, storage?: StorageWrite): boolean {
  try { (storage ?? localStorage).setItem(KEY, String(enabled)); return true; } catch { return false; }
}
// W7: "Arada ifade yap" — Afu boştayken arada kısa ifade yapar. Varsayılan açık.
const IFADE_KEY = "afunobet-pet-ifade-v1";
export const PET_IFADE_OLAYI = "afu-pet-ifade-setting";
export function loadPetIfade(storage?: StorageRead): boolean {
  try { return (storage ?? localStorage).getItem(IFADE_KEY) !== "false"; } catch { return true; }
}
export function savePetIfade(enabled: boolean, storage?: StorageWrite): boolean {
  try { (storage ?? localStorage).setItem(IFADE_KEY, String(enabled)); return true; } catch { return false; }
}
// 1.0.4: Windows "Animasyon efektleri" kapalıyken (prefers-reduced-motion) Afu yine
// de hareket etsin mi. Varsayılan açık; kapatılırsa Windows ayarına uyulur.
const HAREKET_KEY = "afunobet-hareket-zorla-v1";
export const HAREKET_OLAYI = "afu-hareket-setting";
export function loadHareketZorla(storage?: StorageRead): boolean {
  try { return (storage ?? localStorage).getItem(HAREKET_KEY) !== "false"; } catch { return true; }
}
export function saveHareketZorla(enabled: boolean, storage?: StorageWrite): boolean {
  try { (storage ?? localStorage).setItem(HAREKET_KEY, String(enabled)); hareketSinifi(); return true; } catch { return false; }
}
/** CSS'teki prefers-reduced-motion kuralları `:root.afu-hareket-zorla` varken uygulanmaz. */
export function hareketSinifi() {
  try { document.documentElement.classList.toggle("afu-hareket-zorla", loadHareketZorla()); } catch { /* belge yok (test) */ }
}
/** matchMedia("(prefers-reduced-motion: reduce)") yerine: Afu ayarı açıksa hareket hiç azaltılmaz. */
export const hareketAzalt = {
  get matches(): boolean {
    if (loadHareketZorla()) return false;
    try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
  },
  addEventListener(_type: "change", fn: () => void) {
    try { matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", fn); } catch { /* matchMedia yok (test) */ }
    try { window.addEventListener(HAREKET_OLAYI, fn); } catch { /* pencere yok (test) */ }
  },
};
hareketSinifi();

export const DISCOVERY_HINTS = [
  "Afu’yu tutup sürükleyebilirsin",
  "Sağ alttaki tepsi simgesinden ayarlara ulaşırsın",
  "Dosyayı Afu’ya bırakırsan ajana iletilir",
  "Afu’ya sor’a 'Codex ne yapıyor?' yazabilirsin",
] as const;
/** Her ipucu gösterildiği anda kaydedilir; yarıda kapanırsa sıradakiyle devam eder. */
export function nextDiscoveryHint(storage?: StorageRead & StorageWrite): string | null {
  try {
    const target = storage ?? localStorage;
    const value = Number(target.getItem("afunobet-discovery-v1") ?? 0);
    const index = Number.isInteger(value) && value >= 0 ? value : 0;
    if (index >= DISCOVERY_HINTS.length) return null;
    target.setItem("afunobet-discovery-v1", String(index + 1));
    return DISCOVERY_HINTS[index];
  } catch { return null; }
}
