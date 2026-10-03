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
