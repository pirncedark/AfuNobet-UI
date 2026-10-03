import { describe, expect, it, vi, afterEach } from "vitest";
import { parseState } from "../src/core/state";
import { agentPills } from "../src/views/model";
import { sorCevapla } from "../src/sor/yerel";
import { cevapHazirla, sorulariAyikla, MAX_CEVAP } from "../src/question/question";
import { characterExpression, ANIM_HARITASI } from "../src/afu/character";
import { GitHubPanel } from "../src/sistem/servis";

const now = Date.parse("2026-10-03T12:00:00Z");
const snapshot = () => parseState({ version: 1, tasks: [
  { id: "a", agent: "codex", status: "Calisiyor", task: "Testleri denetle", updated_at: new Date(now).toISOString() },
] });
afterEach(() => vi.useRealTimers());

describe("Tüm özellikler: aktif ajanlar ve yerel sorular", () => {
  it("tek canlı iş ana ajanları korur, kullanılmayan GLM gizlidir", () => {
    const pills = agentPills(snapshot(), now);
    expect(pills.filter(p => p.id !== "orkestra").map(p => p.id).sort()).toEqual(["codex", "gemini", "opencode"]);
    expect(pills.find(p => p.id === "codex")?.state).toBe("aktif");
    expect(pills.some(p => p.id === "claude")).toBe(false);
  });
  it.each(["Codex ne yapıyor?", "Kim çalışıyor?", "Kaç iş var?", "Kota ne durumda?", "Hangi iş bitti?", "Son hata ne?", "Durum ne?"])(
    "yerel durum sorusu ağ çağrısı gerektirmez: %s", question => {
      const result = sorCevapla(question, snapshot(), now);
      expect(result.tur).toBe("yerel");
      if (result.tur === "yerel") expect(result.cevap.length).toBeGreaterThan(0);
    });
  it("serbest soru yalnız yönlendirme döndürür, kendiliğinden iş başlatmaz", () => {
    expect(sorCevapla("Bana bir şiir yaz", snapshot(), now)).toEqual({ tur: "codex" });
  });
});

describe("Tüm özellikler: soru seçenekleri ve insan onayı", () => {
  const base = { id: "test-q", ajan: "codex", tur: "izin", metin: "Yayınlansın mı?",
    secenekler: [{ id: "evet", etiket: "İzin ver" }, { id: "hayir", etiket: "Reddet" }],
    serbestMetin: true, olusturma: now, sonGecerlilik: now + 110_000, varsayilan: "hayir" };
  it("süre sınırında soru kaybolur, tam öncesinde cevaplanabilir", () => {
    expect(sorulariAyikla([base], now + 109_999)).toHaveLength(1);
    expect(sorulariAyikla([base], now + 110_000)).toEqual([]);
  });
  it("aynı kimlikte yinelenen soru tek karta iner", () => {
    expect(sorulariAyikla([base, base], now)).toHaveLength(1);
  });
  it("izin ve ret gerçek seçenek kimliğiyle gönderilir", () => {
    const [q] = sorulariAyikla([base], now);
    for (const choice of ["evet", "hayir"])
      expect(cevapHazirla(q, choice, null)).toEqual({ id: base.id, secim: choice, metin: null });
    expect(cevapHazirla(q, "uydurma", null)).toHaveProperty("hata");
  });
  it("boş cevap ve fazla uzun metin reddedilir; sınırdaki metin kabul edilir", () => {
    const [q] = sorulariAyikla([base], now);
    expect(cevapHazirla(q, null, " ")).toHaveProperty("hata");
    expect(cevapHazirla(q, null, "a".repeat(MAX_CEVAP + 1))).toHaveProperty("hata");
    expect(cevapHazirla(q, null, "a".repeat(MAX_CEVAP))).toHaveProperty("metin", "a".repeat(MAX_CEVAP));
  });
});

describe("Tüm özellikler: karakter ve konuşan Afu", () => {
  it.each(["idle", "working", "studying", "success", "error", "speaking", "awaiting"] as const)(
    "görev ifadesi gerçekten eşlenen animasyonu kullanır: %s", state => {
      expect(characterExpression({ dragging: false, questionOpen: false, voice: null, state })).toBe(state);
      expect(ANIM_HARITASI[state]).toMatch(/\.webp$/);
    });
  it("ses ifadesi soru ve görev ifadesinden önce gelir", () => {
    expect(characterExpression({ dragging: false, questionOpen: true, voice: "speaking", state: "error" })).toBe("speaking");
    expect(characterExpression({ dragging: true, questionOpen: false, voice: null, state: "idle" })).toBe("catching");
  });
});

describe("Tüm özellikler: servis paneli otomatik toparlanma", () => {
  it("istek hatasından sonra açık panel yeniden dener; kapanınca tamamen durur", async () => {
    vi.useFakeTimers();
    let failed = false;
    const request = vi.fn(async (command: string) => {
      if (command === "servis_github_refresh" && !failed) { failed = true; throw new Error("fixture offline"); }
      return null;
    });
    const paint = vi.fn();
    const panel = new GitHubPanel(request, paint);
    await panel.setOpen(true);
    expect(paint).toHaveBeenCalledWith(null);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(request.mock.calls.filter(c => c[0] === "servis_github_refresh")).toHaveLength(2);
    await panel.setOpen(false);
    const count = request.mock.calls.length;
    await vi.advanceTimersByTimeAsync(180_000);
    expect(request).toHaveBeenCalledTimes(count);
  });
});
