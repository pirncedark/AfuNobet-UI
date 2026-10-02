export type Durum = "hata" | "uyari" | "calisiyor" | "bos";
export interface AppRegistration { id: string; ad: string; yol?: string | null; tur?: string; kurulu?: boolean; telefonda?: boolean }
export interface AppStatus { durum: Durum; ozet: string }
export interface AppsSnapshot { apps: AppRegistration[]; durumlar: Record<string, AppStatus> }
export interface AppRow { id: string; ad: string; etiket: "Aç" | "Kurulu değil" | "Telefonda"; ozet: string; nokta: "mavi" | "turuncu" | "kirmizi" | null; acilabilir: boolean }
export function appRows(apps: readonly AppRegistration[], durumlar: Readonly<Record<string, AppStatus>>): AppRow[] {
  return apps.map(app => {
    const telefonda = app.telefonda === true || app.tur === "android";
    const acilabilir = !telefonda && (app.kurulu ?? Boolean(app.yol));
    const durum = acilabilir ? durumlar[app.id] : undefined;
    return { id: app.id, ad: app.ad, etiket: telefonda ? "Telefonda" : acilabilir ? "Aç" : "Kurulu değil", acilabilir,
      ozet: durum?.ozet ?? "", nokta: durum?.durum === "hata" ? "kirmizi" : durum?.durum === "uyari" ? "turuncu" : durum?.durum === "calisiyor" ? "mavi" : null };
  });
}
export function enOnemli(durumlar: readonly Durum[]): Durum {
  return (["hata", "uyari", "calisiyor", "bos"] as const).find(durum => durumlar.includes(durum)) ?? "bos";
}
