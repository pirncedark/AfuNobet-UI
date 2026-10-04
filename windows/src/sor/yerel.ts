// "Afu'ya sor" yerel cevaplari: durum sorulari gorev verisinden, model cagrisi olmadan cevaplanir.
// Saf fonksiyonlar; DOM yok, ag yok, kota harcamaz.
import { AGENT_TR } from "../core/labels";
import { quotaRows, type Agent, type Snapshot, type Status, type Task } from "../core/state";

export type Niyet = "ajan_ne" | "biten" | "aktif_ajan" | "kota" | "is_sayisi" | "son_hata" | "durum";
export type IzlenenAjan = Exclude<Agent, "claude">;
export interface NiyetSonuc { niyet: Niyet; ajan?: IzlenenAjan }
export type SorSonuc = { tur: "yerel"; niyet: Niyet; cevap: string } | { tur: "codex" };

const BAYAT_MS = 30 * 60 * 1000;
const SURUYOR: Status[] = ["Calisiyor", "Hazirlaniyor", "Bekliyor", "Duraklatildi"];
const IZLENEN: IzlenenAjan[] = ["codex", "glm", "gemini", "opencode"];

/** Kucuk harf, Turkce harfleri sadelestir, noktalama ve kesme isaretlerini at. */
export function sadelestir(metin: string): string {
  return metin.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/['’‘`´]/g, "").replace(/[^a-z0-9%]+/g, " ").replace(/\s+/g, " ").trim();
}

const AJAN_ADI: [RegExp, IzlenenAjan][] = [
  [/\b(?:codex|kodeks|kodex|codeks)\w*/, "codex"],
  [/\b(?:gemini|cemini|gemi ni)\w*/, "gemini"],
  [/\b(?:opencode|open code|opencod|opnkod)\w*/, "opencode"],
  [/\bglm\w*/, "glm"],
];
// Aciklama, yorum veya uretim isteyen sorular Codex'e gider.
const ACIKLAMA = /\b(?:neden|niye|nicin|niçin|acikla\w*|anlat\w*|degerlendir\w*|yorum\w*|analiz\w*|incele\w*|ozetle\w*|oner\w*|tavsiye\w*|dusun\w*|fikr\w*|karsilastir\w*|duzelt\w*|cozum\w*|coz\w*|yaz\w* misin|yazar misin|yapar misin|nasil yap\w*|ne yapmali\w*|ne yapayim|kodu\w*|kod\b)/;
const HATA = /\b(?:tamamlanama\w*|hata\w*|sorun\w*|problem\w*|ariza\w*|patla\w*|basarisiz\w*|cok(?:tu|mus|en)\w*|bozul\w*|takil\w*)/;
const KOTA = /\b(?:kota\w*|limit\w*|hak\w* (?:kal|ne|var|bit)\w*|kredi\w*)/;
const SAYI = /\b(?:kac (?:tane )?(?:is|gorev|job)\w*|is sayisi|gorev sayisi|kac tane|toplam (?:is|gorev)\w*|ne kadar is)/;
const BITEN = /\b(?:bit(?:ti|en|mis|ir|tir|is)\w*|tamamla\w*|tamam mi|biten\w*|sonuclan\w*)/;
const AKTIF = /\b(?:kim(?:ler)? (?:calis|aktif|is ba|mesgul|var)\w*|hangi (?:ajan|model|yapay zeka)\w*|aktif (?:ajan|model)\w*|calisan (?:ajan|model|kim)\w*|su an kim|kim calis\w*|ajan(?:lar)? ne yap\w*)/;
const NE_YAPIYOR = /\b(?:ne yap\w*|napi\w*|napiyo\w*|ne is\w*|neyle\w*|ne ile ugras\w*|ne alemde|ne durumda|durum\w*|calisiyor mu|calisio\w*|bos mu|mesgul mu|nerde|nerede)/;
const DURUM = /\b(?:durum\w*|ne oluyor|neler oluyor|ne var ne yok|nasil gidiyor|isler nasil|son durum|ozet durum|ne yapiliyor|naber)/;

/** Soruyu yerel niyete esler; eslesmezse ya da aciklama isteniyorsa null (Codex'e gider). */
export function niyetBul(soru: string): NiyetSonuc | null {
  const s = sadelestir(soru);
  if (!s || s.split(" ").length > 12 || ACIKLAMA.test(s)) return null;
  const ajan = AJAN_ADI.find(([desen]) => desen.test(s))?.[1];
  const ek = ajan ? { ajan } : {};
  if (KOTA.test(s)) return { niyet: "kota", ...ek };
  if (HATA.test(s)) return { niyet: "son_hata", ...ek };
  if (SAYI.test(s)) return { niyet: "is_sayisi", ...ek };
  if (BITEN.test(s)) return { niyet: "biten", ...ek };
  if (AKTIF.test(s)) return { niyet: "aktif_ajan" };
  if (ajan && NE_YAPIYOR.test(s)) return { niyet: "ajan_ne", ajan };
  if (ajan && s.split(" ").length <= 2) return { niyet: "ajan_ne", ajan };
  if (DURUM.test(s) || NE_YAPIYOR.test(s)) return { niyet: "durum" };
  return null;
}

function ad(ajan: Agent | null): string { return ajan ? AGENT_TR[ajan] : "Bir ajan"; }
function baslik(task: Task): string {
  const t = task.title.length > 60 ? task.title.slice(0, 57).trimEnd() + "…" : task.title;
  return `"${t}"`;
}
function once(ms: number): string {
  if (ms < 60000) return "az önce";
  const dk = Math.floor(ms / 60000);
  if (dk < 60) return `${dk} dk önce`;
  const saat = Math.floor(dk / 60);
  if (saat < 24) return `${saat} saat önce`;
  return `${Math.floor(saat / 24)} gün önce`;
}
function zaman(task: Task, now: number): string { return task.updatedAt === null || task.updatedAt > now ? "" : once(now - task.updatedAt); }
function bayatMi(task: Task, now: number): boolean {
  return SURUYOR.includes(task.status) && task.status !== "Duraklatildi" && (task.updatedAt === null || now - task.updatedAt > BAYAT_MS);
}
function yeniOnce(a: Task, b: Task): number { return (b.updatedAt ?? -1) - (a.updatedAt ?? -1); }
function liste(adlar: string[]): string {
  return adlar.length <= 1 ? adlar.join("") : `${adlar.slice(0, -1).join(", ")} ve ${adlar.at(-1)}`;
}
const SIRA: Status[] = ["Calisiyor", "Hazirlaniyor", "Duraklatildi", "Bekliyor"];
function oncelikli(tasks: Task[]): Task | undefined {
  return [...tasks].sort((a, b) => SIRA.indexOf(a.status) - SIRA.indexOf(b.status) || yeniOnce(a, b))[0];
}

function isCumlesi(task: Task, now: number, kim = ad(task.agent)): string {
  if (bayatMi(task, now)) {
    const z = zaman(task, now);
    return `${kim} en son ${baslik(task)} işindeydi ama bilgi bayat${z ? ` (son güncelleme ${z})` : ""}.`;
  }
  if (task.quotaPaused) return `${kim} ${baslik(task)} işinde kota dolduğu için duraklatıldı; kota yenilenince devam edecek.`;
  const yuzde = task.progress !== null && task.status === "Calisiyor" ? ` (%${Math.round(task.progress)})` : "";
  switch (task.status) {
    case "Calisiyor": return `${kim} şu an ${baslik(task)} işinde çalışıyor${yuzde}.`;
    case "Hazirlaniyor": return `${kim} ${baslik(task)} işini hazırlıyor.`;
    case "Bekliyor": return `${kim} için ${baslik(task)} işi sırada bekliyor.`;
    default: return `${kim} ${baslik(task)} işinde duraklatıldı.`;
  }
}

function ajanNe(snapshot: Snapshot, ajan: IzlenenAjan, now: number): string {
  const kendi = snapshot.tasks.filter(t => t.agent === ajan);
  const suren = oncelikli(kendi.filter(t => SURUYOR.includes(t.status)));
  if (suren) return isCumlesi(suren, now);
  const son = kendi.filter(t => t.status === "Tamamlandi").sort(yeniOnce)[0];
  return `${AGENT_TR[ajan]} şu an boşta.${son ? ` Son bitirdiği iş: ${baslik(son)}${zaman(son, now) ? `, ${zaman(son, now)}` : ""}.` : ""}`;
}

function aktifAjan(snapshot: Snapshot, now: number): string {
  const canli = snapshot.tasks.filter(t => (t.status === "Calisiyor" || t.status === "Hazirlaniyor") && !bayatMi(t, now));
  const adlar = [...new Set(canli.map(t => ad(t.agent)))];
  if (adlar.length === 1) return isCumlesi(oncelikli(canli)!, now);
  if (adlar.length > 1) return `Şu an ${liste(adlar)} çalışıyor.`;
  const bayat = snapshot.tasks.filter(t => (t.status === "Calisiyor" || t.status === "Hazirlaniyor") && bayatMi(t, now));
  if (bayat.length) return "Şu an çalışan ajan görünmüyor; çalışıyor görünen iş var ama bilgisi bayat.";
  const sirada = snapshot.tasks.filter(t => t.status === "Bekliyor").length;
  return `Şu an çalışan ajan yok.${sirada ? ` ${sirada} iş sırada bekliyor.` : ""}`;
}

function biten(snapshot: Snapshot, ajan: IzlenenAjan | undefined, now: number): string {
  const bitenler = snapshot.tasks.filter(t => t.status === "Tamamlandi" && (!ajan || t.agent === ajan)).sort(yeniOnce);
  const kim = ajan ? `${AGENT_TR[ajan]} için ` : "";
  if (!bitenler.length) return `${kim}Henüz biten iş yok.`.replace(/^(\S+ için )H/, "$1h");
  const son = bitenler[0], z = zaman(son, now);
  const ek = `${son.agent ? AGENT_TR[son.agent] : ""}${son.agent && z ? ", " : ""}${z}`;
  const sonCumle = `${ek ? ` (${ek})` : ""}.`;
  if (bitenler.length === 1) return `${kim}Son biten iş: ${baslik(son)}${sonCumle}`.replace(/^(\S+ için )S/, "$1s");
  return `${kim}Toplam ${bitenler.length} iş bitti. En son biten: ${baslik(son)}${sonCumle}`.replace(/^(\S+ için )T/, "$1t");
}

function isSayisi(snapshot: Snapshot, ajan: IzlenenAjan | undefined, now: number): string {
  const tasks = snapshot.tasks.filter(t => !ajan || t.agent === ajan);
  const kim = ajan ? `${AGENT_TR[ajan]} için ` : "";
  if (!tasks.length) return ajan ? `${AGENT_TR[ajan]} için kayıtlı iş yok.` : "Şu an kayıtlı iş yok.";
  const say = (s: Status) => tasks.filter(t => t.status === s).length;
  const parcalar = [
    [say("Calisiyor") + say("Hazirlaniyor"), "çalışıyor"], [say("Bekliyor"), "sırada"], [say("Duraklatildi"), "duraklatıldı"],
    [say("Tamamlandi"), "bitti"], [say("Hata"), "tamamlanamadı"],
  ].filter(([n]) => (n as number) > 0).map(([n, metin]) => `${n} ${metin}`);
  const bayat = tasks.filter(t => bayatMi(t, now)).length;
  return `${kim}${kim ? "t" : "T"}oplam ${tasks.length} iş var: ${parcalar.join(", ")}.${bayat ? ` ${bayat} işin bilgisi bayat.` : ""}`;
}

function kota(snapshot: Snapshot, ajan: IzlenenAjan | undefined, now: number): string {
  const satirlar = quotaRows(snapshot, now).filter(r => (!ajan || r.agent === ajan) && r.percent !== "—");
  if (!satirlar.length) return ajan ? `${AGENT_TR[ajan]} için kota bilgisi henüz yok.` : "Kota bilgisi henüz yok.";
  const parcalar = satirlar.map(r => r.percent === "%0"
    ? `${AGENT_TR[r.agent]} kotası dolu${r.reset !== "—" ? ` (yenilenme ${r.reset})` : ""}`
    : `${AGENT_TR[r.agent]} ${r.percent} kaldı`);
  const bayat = satirlar.filter(r => r.stale).map(r => AGENT_TR[r.agent]);
  const bekleyen = snapshot.tasks.some(t => t.quotaPaused && (!ajan || t.agent === ajan));
  return `${parcalar.join(", ")}.${bekleyen ? " Bir iş kota yüzünden bekliyor." : ""}${bayat.length ? ` ${liste(bayat)} bilgisi bayat.` : ""}`;
}

function sonHata(snapshot: Snapshot, ajan: IzlenenAjan | undefined, now: number): string {
  const hata = snapshot.tasks.filter(t => t.status === "Hata" && (!ajan || t.agent === ajan)).sort(yeniOnce)[0];
  if (!hata) {
    const kotaBekleyen = snapshot.tasks.find(t => t.quotaPaused && (!ajan || t.agent === ajan));
    if (kotaBekleyen) return `Hata yok; ${ad(kotaBekleyen.agent)} kota dolduğu için bekliyor.`;
    return ajan ? `${AGENT_TR[ajan]} için kayıtlı hata yok.` : "Kayıtlı hata yok.";
  }
  const z = zaman(hata, now), ek = `${hata.agent ? AGENT_TR[hata.agent] : ""}${hata.agent && z ? ", " : ""}${z}`;
  return `Son hata: ${baslik(hata)} işi tamamlanamadı${ek ? ` (${ek})` : ""}. Yeniden denemek için Orkestra'dan tekrar ver.`;
}

function durum(snapshot: Snapshot, now: number): string {
  if (!snapshot.tasks.length) return "Şu an kayıtlı iş yok.";
  const bitti = snapshot.tasks.filter(t => t.status === "Tamamlandi").length;
  return `${aktifAjan(snapshot, now)} Toplam ${snapshot.tasks.length} işin ${bitti} tanesi bitti.`;
}

/** Niyete gore tek-iki cumlelik cevap. Kaynak bayatsa belirtir. */
export function cevapUret(n: NiyetSonuc, snapshot: Snapshot, now = Date.now()): string {
  const veriYok = !snapshot.connected && !snapshot.tasks.length;
  if (veriYok && n.niyet !== "kota") return "Görev bilgisi henüz gelmedi. AfuNöbet açılınca tekrar sor.";
  let cevap: string;
  switch (n.niyet) {
    case "ajan_ne": cevap = ajanNe(snapshot, n.ajan ?? "codex", now); break;
    case "aktif_ajan": cevap = aktifAjan(snapshot, now); break;
    case "biten": cevap = biten(snapshot, n.ajan, now); break;
    case "is_sayisi": cevap = isSayisi(snapshot, n.ajan, now); break;
    case "kota": cevap = kota(snapshot, n.ajan, now); break;
    case "son_hata": cevap = sonHata(snapshot, n.ajan, now); break;
    default: cevap = durum(snapshot, now);
  }
  if (snapshot.connected && snapshot.sourceUnavailable && n.niyet !== "kota") cevap += " Bu bilgi bayat; AfuNöbet şu an güncellemiyor.";
  return cevap;
}

/** Tek giris: yerel cevap ya da Codex'e yonlendirme. */
export function sorCevapla(soru: string, snapshot: Snapshot, now = Date.now()): SorSonuc {
  const n = niyetBul(soru);
  return n ? { tur: "yerel", niyet: n.niyet, cevap: cevapUret(n, snapshot, now) } : { tur: "codex" };
}

export const YEREL_AJANLAR = IZLENEN;
