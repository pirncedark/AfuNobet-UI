type StorageRead = Pick<Storage, "getItem">;
type StorageWrite = Pick<Storage, "setItem">;
const KEY = "afunobet-message-alert-v1";
export function loadMessageAlert(storage?: StorageRead): boolean {
  try { return (storage ?? localStorage).getItem(KEY) !== "false"; } catch { return true; }
}
export function saveMessageAlert(enabled: boolean, storage?: StorageWrite): boolean {
  try { (storage ?? localStorage).setItem(KEY, String(enabled)); return true; } catch { return false; }
}
