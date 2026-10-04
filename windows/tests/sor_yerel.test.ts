import { describe, expect, it } from "vitest";
import { parseState, type Snapshot } from "../src/core/state";
import { cevapUret, niyetBul, sadelestir, sorCevapla } from "../src/sor/yerel";

const NOW = Date.parse("2026-10-02T12:00:00Z");
const iso = (dkOnce: number) => new Date(NOW - dkOnce * 60000).toISOString();
function snap(tasks: Record<string, unknown>[], extra: Record<string, unknown> = {}): Snapshot {
  return parseState({ version: 1, tasks, ...extra });
}
const ORNEK = snap([
  { id: "1", agent: "codex", status: "Calisiyor", title: "Sohbet düğmesini bağla", progress: 40, updated_at: iso(2) },
  { id: "2", agent: "gemini", status: "Tamamlandi", title: "Belgeleri düzelt", updated_at: iso(12) },
  { id: "3", agent: "opencode", status: "Tamamlandi", title: "Testleri koştur", updated_at: iso(50) },
  { id: "4", agent: "opencode", status: "Hata", title: "Paket derle", updated_at: iso(5) },
  { id: "5", agent: "gemini", status: "Bekliyor", title: "Rapor hazırla", updated_at: iso(1) },
], { quotas: { codex: { remaining_percent: 62, reset_at: null, checked_at: iso(3) }, gemini: { remaining_percent: 0, reset_at: iso(-60), checked_at: iso(4) } } });

describe("sadeleştirme", () => {
  it("Türkçe harf, büyük İ/I ve noktalama", () => {
    expect(sadelestir("KOTA NE DURUMDA?")).toBe("kota ne durumda");
    expect(sadelestir("İŞ BİTTİ Mİ")).toBe("is bitti mi");
    expect(sadelestir("Codex'in ŞU AN işi ne?")).toBe("codexin su an isi ne");
  });
});

describe("niyet eşleme (25+ varyant)", () => {
  const ornekler: [string, string, string?][] = [
    ["Codex ne yapıyor?", "ajan_ne", "codex"],
    ["codex ne yapiyor", "ajan_ne", "codex"],
    ["CODEX NE YAPIYOR", "ajan_ne", "codex"],
    ["Codex napıyo", "ajan_ne", "codex"],
    ["codex'in durumu ne", "ajan_ne", "codex"],
    ["Codex çalışıyor mu?", "ajan_ne", "codex"],
    ["Gemini ne işle uğraşıyor?", "ajan_ne", "gemini"],
    ["opencode?", "ajan_ne", "opencode"],
    ["OpenCode şu an ne yapıyor", "ajan_ne", "opencode"],
    ["Hangi iş bitti?", "biten"],
    ["hangi is bitti", "biten"],
    ["Bitenler neler?", "biten"],
    ["Ne bitti?", "biten"],
    ["Tamamlanan işler", "biten"],
    ["Codex işini bitirdi mi?", "biten", "codex"],
    ["Şu an hangi ajan çalışıyor?", "aktif_ajan"],
    ["Kim çalışıyor?", "aktif_ajan"],
    ["aktif ajan hangisi", "aktif_ajan"],
    ["Kota ne durumda?", "kota"],
    ["kotalar", "kota"],
    ["Codex kotası kaldı mı?", "kota", "codex"],
    ["Limit doldu mu?", "kota"],
    ["Kaç iş var?", "is_sayisi"],
    ["KAÇ GÖREV VAR", "is_sayisi"],
    ["Kaç tane iş var acaba", "is_sayisi"],
    ["Son hata ne?", "son_hata"],
    ["son hata", "son_hata"],
    ["Hata var mı?", "son_hata"],
    ["Hangi iş tamamlanamadı?", "son_hata"],
    ["Bir sorun var mı?", "son_hata"],
    ["Durum ne?", "durum"],
    ["Son durum", "durum"],
    ["İşler nasıl gidiyor?", "durum"],
  ];
  it.each(ornekler)("%s → %s", (soru, niyet, ajan) => {
    const n = niyetBul(soru);
    expect(n?.niyet).toBe(niyet);
    if (ajan) expect(n?.ajan).toBe(ajan);
  });
  it.each([
    "Bu kodu neden böyle yazdın?",
    "Son hata neden oldu, açıkla",
    "Codex'in yaptığı işi değerlendir",
    "Bir README yazar mısın?",
    "Hava nasıl?",
    "Merhaba",
    "Bu iki yaklaşımı karşılaştır",
    "Orkestra ekranını nasıl yapmalıyım ki kullanıcı kolayca görev versin ve sonucu takip etsin",
    "",
  ])("eşleşmeyen / açıklama isteyen → Codex: %s", soru => {
    expect(niyetBul(soru)).toBeNull();
    expect(sorCevapla(soru, ORNEK, NOW)).toEqual({ tur: "codex" });
  });
});

describe("cevaplar", () => {
  const cevap = (soru: string, s = ORNEK) => { const r = sorCevapla(soru, s, NOW); expect(r.tur).toBe("yerel"); return r.tur === "yerel" ? r.cevap : ""; };
  it("Codex ne yapıyor", () => expect(cevap("Codex ne yapıyor?")).toBe('Codex şu an "Sohbet düğmesini bağla" işinde çalışıyor (%40).'));
  it("boştaki ajan son işini söyler", () => expect(cevap("Gemini ne yapıyor?")).toBe('Gemini için "Rapor hazırla" işi sırada bekliyor.'));
  it("boşta ajan", () => expect(cevap("OpenCode ne yapıyor")).toBe('OpenCode şu an boşta. Son bitirdiği iş: "Testleri koştur", 50 dk önce.'));
  it("hangi iş bitti", () => expect(cevap("Hangi iş bitti?")).toBe('Toplam 2 iş bitti. En son biten: "Belgeleri düzelt" (Gemini, 12 dk önce).'));
  it("aktif ajan", () => expect(cevap("Şu an hangi ajan çalışıyor?")).toBe('Codex şu an "Sohbet düğmesini bağla" işinde çalışıyor (%40).'));
  it("kaç iş", () => expect(cevap("Kaç iş var?")).toBe("Toplam 5 iş var: 1 çalışıyor, 1 sırada, 2 bitti, 1 tamamlanamadı."));
  it("son hata", () => expect(cevap("Son hata ne?")).toBe('Son hata: "Paket derle" işi tamamlanamadı (OpenCode, 5 dk önce). Yeniden denemek için Orkestra\'dan tekrar ver.'));
  it("kota: dolu olan açıkça söylenir", () => {
    const c = cevap("Kota ne durumda?");
    expect(c).toMatch(/^Codex %62 kaldı, Gemini kotası dolu \(yenilenme .+\)\.$/);
  });
  it("cevaplar kısa, teknik terim yok", () => {
    for (const soru of ["Codex ne yapıyor?", "Hangi iş bitti?", "Kaç iş var?", "Son hata ne?", "Kota ne durumda?", "Durum ne?", "Kim çalışıyor?"]) {
      const c = cevap(soru);
      expect(c.length).toBeLessThanOrEqual(220);
      expect(c.split(/[.!?](?:\s|$)/).filter(Boolean).length).toBeLessThanOrEqual(3);
      expect(c).not.toMatch(/state\.json|pid|token|model|api|json|undefined|null|NaN/i);
    }
  });
});

describe("veri yok / bayat / kota dolu", () => {
  const bos: Snapshot = { connected: false, tasks: [], sourceUnavailable: true };
  it("veri yoksa tek cümle", () => {
    const r = sorCevapla("Codex ne yapıyor?", bos, NOW);
    expect(r).toEqual({ tur: "yerel", niyet: "ajan_ne", cevap: "Görev bilgisi henüz gelmedi. AfuNöbet açılınca tekrar sor." });
  });
  it("veri yokken kota bilgisi de yoksa söyler", () => expect(cevapUret({ niyet: "kota" }, bos, NOW)).toBe("Kota bilgisi henüz yok."));
  it("kayıt yoksa iş sayısı", () => expect(cevapUret({ niyet: "is_sayisi" }, snap([]), NOW)).toBe("Şu an kayıtlı iş yok."));
  it("hiç biten yoksa", () => expect(cevapUret({ niyet: "biten" }, snap([]), NOW)).toBe("Henüz biten iş yok."));
  it("hata yoksa", () => expect(cevapUret({ niyet: "son_hata" }, snap([]), NOW)).toBe("Kayıtlı hata yok."));
  it("uzun süredir güncellenmeyen çalışan iş bayat diye belirtilir", () => {
    const s = snap([{ id: "1", agent: "codex", status: "Calisiyor", title: "Eski iş", updated_at: iso(95) }]);
    expect(cevapUret({ niyet: "ajan_ne", ajan: "codex" }, s, NOW)).toBe('Codex en son "Eski iş" işindeydi ama bilgi bayat (son güncelleme 1 saat önce).');
    expect(cevapUret({ niyet: "aktif_ajan" }, s, NOW)).toContain("bayat");
    expect(cevapUret({ niyet: "is_sayisi" }, s, NOW)).toBe("Toplam 1 iş var: 1 çalışıyor. 1 işin bilgisi bayat.");
  });
  it("kaynak güncellemiyorsa cevaba bayat notu eklenir", () => {
    const s = { ...ORNEK, sourceUnavailable: true };
    expect(cevapUret({ niyet: "biten" }, s, NOW)).toMatch(/Bu bilgi bayat; AfuNöbet şu an güncellemiyor\.$/);
  });
  it("eski kota bilgisi bayat diye belirtilir", () => {
    const s = snap([], { quotas: { codex: { remaining_percent: 30, reset_at: null, checked_at: iso(120) } } });
    expect(cevapUret({ niyet: "kota" }, s, NOW)).toBe("Codex %30 kaldı. Codex bilgisi bayat.");
  });
  it("kota dolunca duraklatılan iş söylenir", () => {
    const s = snap([{ id: "1", agent: "codex", status: "Duraklatildi", title: "Ses ekle", mesaj: "kota doldu", updated_at: iso(10) }],
      { quotas: { codex: { remaining_percent: 0, reset_at: null, checked_at: iso(1) } } });
    expect(cevapUret({ niyet: "kota" }, s, NOW)).toBe("Codex kotası dolu. Bir iş kota yüzünden bekliyor.");
    expect(cevapUret({ niyet: "ajan_ne", ajan: "codex" }, s, NOW)).toBe('Codex "Ses ekle" işinde kota dolduğu için duraklatıldı; kota yenilenince devam edecek.');
    expect(cevapUret({ niyet: "son_hata" }, s, NOW)).toBe("Hata yok; Codex kota dolduğu için bekliyor.");
  });
  it("birden çok ajan çalışıyorsa adları sayılır", () => {
    const s = snap([
      { id: "1", agent: "codex", status: "Calisiyor", title: "A", updated_at: iso(1) },
      { id: "2", agent: "gemini", status: "Calisiyor", title: "B", updated_at: iso(1) },
      { id: "3", agent: "opencode", status: "Hazirlaniyor", title: "C", updated_at: iso(1) },
    ]);
    expect(cevapUret({ niyet: "aktif_ajan" }, s, NOW)).toBe("Şu an Codex, Gemini ve OpenCode çalışıyor.");
  });
  it("çalışan yoksa sıradakileri söyler", () => {
    const s = snap([{ id: "1", agent: "gemini", status: "Bekliyor", title: "A", updated_at: iso(1) }]);
    expect(cevapUret({ niyet: "aktif_ajan" }, s, NOW)).toBe("Şu an çalışan ajan yok. 1 iş sırada bekliyor.");
  });
  it("teknik içerikli başlık cevaba sızmaz", () => {
    const s = snap([{ id: "1", agent: "codex", status: "Calisiyor", title: "token=abc C:\\gizli\\dosya", updated_at: iso(1) }]);
    expect(cevapUret({ niyet: "ajan_ne", ajan: "codex" }, s, NOW)).not.toMatch(/token|gizli/);
  });
});
