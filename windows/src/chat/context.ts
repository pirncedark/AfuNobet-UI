/** Bağlam yalnız beyaz listedeki kısa etiketlerden oluşur. */
export function safeLabel(value: unknown, max = 250): string {
 if (typeof value !== "string") return "";
 const text = value.replace(/[\x00-\x1f\x7f]/g," ").replace(/\s+/g," ").trim();
 if (/token|secret|password|api[_ -]?key|bearer|https?:|[a-z]:[\\/]|(?:^|\s)\/\S+|\b(?:sk|ghp|gho|AIza)[-_]|[\w.+-]+@[\w.-]+/i.test(text)) return "";
 return text.slice(0,max);
}
export function shortName(value: unknown): string { return typeof value === "string" ? safeLabel(value.replace(/\\/g,"/").split("/").filter(Boolean).pop(),100) : ""; }
export function buildContext(snapshot: unknown, focus: unknown): string {
 const s = snapshot as {tasks?:unknown[]} | null;
 const f = typeof focus === "string" ? s?.tasks?.find(t=>(t as {id?:unknown})?.id===focus) : focus;
 if (!f || typeof f !== "object") return "";
 const t = f as Record<string,unknown>;
 return [["Görev",safeLabel(t.id,100)],["Proje",shortName(t.repo)],["Başlık",safeLabel(t.title,500)],["Durum",safeLabel(t.status,60)],["Dosya",shortName(t.file)]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join("\n").slice(0,1500);
}
/** Backend ile aynı tek klasör adı sınırı. */
export function projectName(value: unknown): string | null {
 if(typeof value!=="string"||!value||value.length>100||value.endsWith(" ")||!/^[\p{L}\p{N} _-]+$/u.test(value))return null;
 return safeLabel(value,100)||null;
}
