import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
export function copyExecutable(original, preferred, copy = copyFileSync) {
  try { copy(original, preferred); return preferred; }
  catch (error) {
    if (!["EBUSY", "EPERM", "EACCES"].includes(error.code)) throw error;
    const alternative = join(dirname(preferred), "afunobet-ui-yeni.exe");
    copy(original, alternative);
    return alternative;
  }
}
