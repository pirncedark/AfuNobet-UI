// Q5: sahte test modu (scripts/sahte_olay.py) ürettiği dosyaları UYGULAMANIN
// KENDİ ayrıştırıcıları okur: state.ts (parseState) ve question.ts (sorulariAyikla).
// Fixture'lar gerçek üreticinin çıktısıdır; yeniden üretme:
//   python scripts/sahte_olay.py --senaryo <s> --hedef <geçici> --bekleme 0 --sabit --fixture <çıktı>
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { currentTasks, isCurrent, parseState, taskMessage, type Task } from "../src/core/state";
import { ajanAdi, SoruModeli, sorulariAyikla } from "../src/question/question";

type Durum = { version: number; tasks: Record<string, unknown>[]; mesaj?: string; quotas?: Record<string, unknown> };
const oku = (ad: string) => JSON.parse(readFileSync(new URL(`./fixtures/${ad}`, import.meta.url), "utf8")) as Durum;

/** Fixture donduruludur: canlilik penceresi (isCurrent) test aninda tazelenir. */
function tazele(durum: Durum, now = new Date().toISOString()): Durum {
  return { ...durum, tasks: durum.tasks.map(t => ({ ...t, started: t.started ?? now, started_at: t.started_at ?? now, updated_at: now })) };
}
const ilk = (durum: Durum, now?: number) => {
  const snap = parseState(tazele(durum));
  expect(snap.sourceUnavailable).toBe(false);
  return snap.tasks[0] as Task;
};

describe("sahte mod: bos senaryo", () => {
  it("uygulama bağlanır, tahta boş kalır", () => {
    const snap = parseState(oku("sahte_bos.json"));
    expect([snap.connected, snap.sourceUnavailable, snap.tasks.length]).toEqual([true, false, 0]);
  });
});

describe("sahte mod: codex_soru senaryosu", () => {
  it("onay cevaplanan görev tamamlandı olarak okunur", () => {
    const t = ilk(oku("sahte_codex_soru.json"));
    expect([t.agent, t.status, t.progress]).toEqual(["codex", "Tamamlandi", 100]);
    expect(t.title).toBeTruthy();
    expect(taskMessage(t)).toBe("Görev tamamlandı");
  });
  it("görev başlığı teknik süzgeçten geçer (yol, port, komut sızmaz)", () => {
    const t = ilk(oku("sahte_codex_soru.json"));
    expect([t.task, t.currentAction, t.model]).toEqual(["Test senaryosu - Onay Bekliyor", "Basariyla tamamlandi", "gpt-6"]);
  });
});

describe("sahte mod: gemini_kota senaryosu", () => {
  it("kota hatası duraklatıldı olarak okunur, hata değil", () => {
    const t = ilk(oku("sahte_gemini_kota.json"));
    expect([t.status, t.quotaPaused, t.quota.remaining_percent]).toEqual(["Duraklatildi", true, 0]);
  });
  it("kota mesajı kullanıcıya tek cümle olarak gider", () => {
    expect(taskMessage(ilk(oku("sahte_gemini_kota.json")))).toBe("Gemini duraklatıldı. Kota yenilenince devam edecek.");
  });
  it("sürücü mesajı ve hata ayrıntısı arayüze sızmaz", () => {
    const t = ilk(oku("sahte_gemini_kota.json"));
    expect([t.currentAction, t.task, t.title].some(v => /429|quota|last_error/i.test(v ?? ""))).toBe(false);
  });
});

describe("sahte mod: hata senaryosu", () => {
  it("hata duraklatıldı değil, hata olarak okunur", () => {
    const t = ilk(oku("sahte_hata.json"));
    expect([t.status, t.quotaPaused]).toEqual(["Hata", false]);
    expect(taskMessage(t)).toBe("Görev tamamlanamadı, yeniden deneyin");
  });
  it("ham hata metni arayüze taşınmaz", () => {
    const t = ilk(oku("sahte_hata.json"));
    expect(t.task + (t.title ?? "") + (t.currentAction ?? "")).not.toContain("src/main.rs");
  });
});

describe("sahte mod: bayat senaryosu", () => {
  it("eskimiş kayıt canlı sayılmaz, ana kartta gösterilmez", () => {
    const t = parseState(oku("sahte_bayat.json")).tasks[0] as Task;
    expect([t.status, t.updatedAt !== null, isCurrent(t)]).toEqual(["Calisiyor", true, false]);
    expect(currentTasks([t])).toHaveLength(0);
  });
  it("bayat kayıt yine de anlaşılır bir metinle anılır", () => {
    const t = parseState(oku("sahte_bayat.json")).tasks[0] as Task;
    expect(taskMessage(t)).toContain("bayat");
  });
});

describe("sahte mod: soru kaydı (codex_soru)", () => {
  const ham = oku("sahte_soru_kodu.json") as unknown as Record<string, unknown>;
  /** Zamanlama göreli bir sözleşmedir: üretim anı değil, test anı kullanılır. */
  const canli = (simdi: number) => ({ ...ham, olusturma: simdi - 1000, sonGecerlilik: simdi + 110000 });
  const coz = (simdi = Date.now()) => sorulariAyikla([canli(simdi)], simdi);

  it("soru kartı olarak okunur", () => {
    const [s] = coz();
    expect(s).toMatchObject({ id: "codex-soru", ajan: "codex", tur: "komut", baslik: "Komut çalıştırılsın mı?", metin: "npm run build" });
    expect(ajanAdi(s.ajan)).toBe("Codex");
  });
  it("iki seçenek ve varsayılan (reddet) gelir", () => {
    const [s] = coz();
    expect(s.secenekler.map(x => [x.id, x.etiket])).toEqual([["evet", "İzin ver"], ["hayir", "Reddet"]]);
    expect([s.varsayilan, s.serbestMetin, s.gizli]).toEqual(["hayir", false, false]);
  });
  it("süresi geçen soru kart olmaz", () => {
    const simdi = Date.now();
    expect(sorulariAyikla([canli(simdi)], simdi + 200000)).toHaveLength(0);
  });
  it("kayda uymayan soru (kimlik/tür/seçenek) atılır", () => {
    const simdi = Date.now();
    expect(sorulariAyikla([{ ...canli(simdi), id: "../kacis" }], simdi)).toHaveLength(0);
    expect(sorulariAyikla([{ ...canli(simdi), tur: "bilinmez" }], simdi)).toHaveLength(0);
    expect(sorulariAyikla([{ ...canli(simdi), metin: "  " }], simdi)).toHaveLength(0);
    expect(sorulariAyikla([{ ...canli(simdi), secenekler: [], serbestMetin: false }], simdi)).toHaveLength(0);
  });
  it("bekleyen akış soruyu sırayla gösterir", () => {
    const simdi = Date.now();
    const akis = new SoruModeli();
    akis.guncelle([canli(simdi)], simdi);
    expect(akis.aktif?.id).toBe("codex-soru");
    expect(akis.bekleyen).toBe(1);
    akis.cevaplandi("codex-soru");
    expect([akis.aktif, akis.bekleyen]).toEqual([null, 0]);
  });
});
