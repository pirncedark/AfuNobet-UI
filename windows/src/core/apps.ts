export type Durum = "hata" | "uyari" | "calisiyor" | "bos";
export interface AppRegistration { id: string; ad: string; yol?: string | null; tur?: string; kurulu?: boolean; telefonda?: boolean; indirUrl?: string | null }
export interface AppStatus { durum: Durum; ozet: string }
export interface AppsSnapshot { apps: AppRegistration[]; durumlar: Record<string, AppStatus> }
export interface AppRow { id: string; ad: string; etiket: "Aç" | "Kurulu değil" | "Telefonda" | "İndir" | "APK indir"; ozet: string; nokta: "mavi" | "turuncu" | "kirmizi" | null; acilabilir: boolean; indirilebilir: boolean; indirUrl?: string }
export function appRows(apps: readonly AppRegistration[], durumlar: Readonly<Record<string, AppStatus>>): AppRow[] {
  return apps.map(app => {
    const telefonda = app.telefonda === true || app.tur === "android";
    const acilabilir = !telefonda && (app.kurulu ?? Boolean(app.yol));
    const durum = acilabilir ? durumlar[app.id] : undefined;
    
    let etiket: AppRow["etiket"] = telefonda ? "Telefonda" : acilabilir ? "Aç" : "Kurulu değil";
    let indirilebilir = false;
    if (app.indirUrl && (!acilabilir || telefonda)) {
      etiket = telefonda ? "APK indir" : "İndir";
      indirilebilir = true;
    }
    
    return { id: app.id, ad: app.ad, etiket, acilabilir, indirilebilir, indirUrl: app.indirUrl ?? undefined,
      ozet: durum?.ozet ?? "", nokta: durum?.durum === "hata" ? "kirmizi" : durum?.durum === "uyari" ? "turuncu" : durum?.durum === "calisiyor" ? "mavi" : null };
  });
}
export function enOnemli(durumlar: readonly Durum[]): Durum {
  return (["hata", "uyari", "calisiyor", "bos"] as const).find(durum => durumlar.includes(durum)) ?? "bos";
}
