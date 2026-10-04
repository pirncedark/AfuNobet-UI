// Claude koprusunun TEK kaynagi (P8).
//
// Once iki yer ayni soruyu iki farkli yontemle soruyordu: ustteki "Afu
// baglantisi" satiri yalnizca ajan mesajlarina, saglik seridiki "Claude" rozeti
// ise yalnizca gorev zaman damgasina bakiyordu; biri "bagli" derken digeri
// "bagli degil" diyordu. Artik ikisi de bu dosyayi okur.
import type { Task } from "./state";

/** Kopru canli sayilirken en eski sinyalin yasi (ms). */
export const KOPRU_PENCERE = 5 * 60 * 1000;

/** Ajan mesaji: yalniz ajan adi ve zaman damgasi yeter. */
export interface KopruMesaj { ajan: string; zaman: number }

export interface KopruDurumu {
  /** Son 5 dakika icinde mesaj geldi. */
  mesaj: boolean;
  /** Son 5 dakika icinde Claude'a yeni bir is/proje yazildi (ada canli). */
  canli: boolean;
  /** Kurulu hook son 5 dakika icinde bir sey yazdi. */
  bagli: boolean;
}

/** Claude koprusu: son 5 dk'da mesaj ya da ada canli is. */
export function kopruDurumu(mesajlar: readonly KopruMesaj[], tasks: readonly Pick<Task, "agent" | "updatedAt">[], now: number): KopruDurumu {
  const son = (zaman: number | null | undefined) => typeof zaman === "number" && Number.isFinite(zaman) && now - zaman >= 0 && now - zaman < KOPRU_PENCERE;
  const mesaj = mesajlar.some(m => m.ajan === "claude" && son(m.zaman));
  const canli = tasks.some(t => t.agent === "claude" && son(t.updatedAt));
  return { mesaj, canli, bagli: mesaj || canli };
}
