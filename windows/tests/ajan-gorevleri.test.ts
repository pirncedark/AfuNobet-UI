import { describe, expect, it } from "vitest";
import { ajanGorevleri, currentTasks, parseAjanlar, State } from "../src/core/state";

const satir = (degisim: Record<string, unknown> = {}) => ({
  oturum: "c-1", ajan: "claude", durum: "working", gorev: "Planı uygula",
  ust: null, alt: false, baslangic: Date.now() - 4000, guncelleme: Date.now(), bitti: false, ...degisim,
});
const yuk = (...satirlar: Record<string, unknown>[]) => ({ surum: 1, satirlar });

describe("borudaki ana oturumlar görev listesine girer", () => {
  it("Claude oturumu salt okunur görev olur", () => {
    const [t] = ajanGorevleri(parseAjanlar(yuk(satir())));
    expect(t).toMatchObject({ id: "ajan:c-1", agent: "claude", status: "Calisiyor", title: "Planı uygula", currentAction: "Çalışıyor" });
    expect(currentTasks([t])).toHaveLength(1);
  });
  it("durumlar Afu durumlarına çevrilir", () => {
    const durum = (d: Record<string, unknown>) => ajanGorevleri(parseAjanlar(yuk(satir(d))))[0];
    expect(durum({ durum: "thinking" }).status).toBe("Calisiyor");
    expect(durum({ durum: "question" }).status).toBe("Duraklatildi");
    expect(durum({ durum: "error" }).status).toBe("Hata");
    expect(durum({ durum: "rate_limit" })).toMatchObject({ status: "Duraklatildi", quotaPaused: true });
    expect(durum({ durum: "finished", bitti: true })).toMatchObject({ status: "Tamamlandi", progress: 100 });
  });
  it("alt ajanlar ayrı görev olmaz; görevsiz oturum adını taşır", () => {
    const g = ajanGorevleri(parseAjanlar(yuk(satir({ gorev: null }), satir({ oturum: "a-1", alt: true, ust: "c-1" }))));
    expect(g).toHaveLength(1);
    expect(g[0].title).toBe("Claude oturumu");
  });
  it("yeni ajan adı ajanAdi olarak kalır", () => {
    expect(ajanGorevleri(parseAjanlar(yuk(satir({ ajan: "yeni-ajan" }))))[0]).toMatchObject({ agent: null, ajanAdi: "yeni-ajan" });
  });
  it("State, state.json görevleriyle boru oturumlarını birleştirir ve odaklar", () => {
    State.apply({ version: 1, tasks: [] });
    State.applyAjanlar(yuk(satir({ oturum: "c-9" })));
    expect(State.snapshot.tasks.map(t => t.id)).toContain("ajan:c-9");
    expect(State.focusTask?.id).toBe("ajan:c-9");
    State.apply({ version: 1, tasks: [] });
    expect(State.snapshot.tasks.map(t => t.id)).toContain("ajan:c-9");
    State.applyAjanlar(yuk());
    expect(State.snapshot.tasks).toHaveLength(0);
  });
});
