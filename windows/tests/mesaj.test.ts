import { describe, expect, it, vi } from "vitest";
import { terminalPetMetni, bildirimBalonu, BalonKuyrugu, BalonModeli, kisalt, balonMetni, balonOlustur, bolunBaslik, ilkCumle, temizSatirlar, type Mesaj } from "../src/message/message";
const mesaj = (id: string, metin = `Mesaj ${id}`): Mesaj => ({ surum: 1, id, ajan: "claude", tur: "bilgi", metin, zaman: 0 });
describe("Konuşan Afu", () => {
  it("balon kullanıcı kapatana kadar kalır, sıradakine × ile geçer", () => {
    const m = new BalonKuyrugu(); m.gorunur(true, 0); m.ekle(mesaj("a"), 0); m.ekle(mesaj("b"), 0);
    expect(m.aktif?.id).toBe("a");
    m.tick(8000); m.tick(60_000); expect(m.aktif?.id).toBe("a");
    expect(m.kapat()).toBe(true); expect(m.aktif?.id).toBe("b");
    expect(m.kapat()).toBe(true); expect(m.aktif).toBeNull();
  });
  it("yeni mesaj görünen balonu kapatmaz, kuyruğa ekler", () => {
    const m = new BalonKuyrugu(); m.gorunur(true, 0); m.ekle(mesaj("a"), 0);
    m.ekle(mesaj("b"), 10); m.ekle(mesaj("c"), 20);
    expect(m.aktif?.id).toBe("a"); expect(m.sira).toBe(2);
    m.kapat(); expect(m.aktif?.id).toBe("b");
  });
  it("aynı mesaj iki kez gelmez", () => {
    const m = new BalonKuyrugu(); m.gorunur(true, 0); m.ekle(mesaj("a"), 0); m.ekle(mesaj("a"), 1);
    expect(m.sira).toBe(0); expect(m.aktif?.id).toBe("a");
  });
  it("gizliyken beş mesaj tutar, en eskiyi düşürür", () => {
    const m = new BalonModeli(); for (let i = 0; i < 7; i++) m.ekle(mesaj(String(i)), i);
    expect(m.aktif).toBeNull(); expect(m.bekleyen.map(x => x.id)).toEqual(["2", "3", "4", "5", "6"]);
    m.gorunur(true, 10000); expect(m.aktif?.id).toBe("2");
  });
  it("oyun/gizlenme sırasında gösterilen balon korunur", () => {
    const m = new BalonKuyrugu(); m.gorunur(true, 0); m.ekle(mesaj("a"), 0); m.gorunur(false, 3000);
    m.tick(20000); expect(m.aktif).toBeNull();
    m.gorunur(true, 20000); expect(m.aktif?.id).toBe("a");
    expect(m.kapat()).toBe(true);
  });
  it("Unicode metni 140 karaktere üç noktayla keser", () => {
    expect(Array.from(kisalt("😀".repeat(200))).length).toBe(140);
    expect(kisalt("kısa")).toBe("kısa"); expect(kisalt("x".repeat(200)).endsWith("…")).toBe(true);
  });
  it("son 5 dakikada mesaj gelen ajanı işaretler", () => {
    const m = new BalonKuyrugu(); m.ekle(mesaj("a"), 1000);
    expect(m.bagli("claude", 300999)).toBe(true); expect(m.bagli("claude", 301000)).toBe(false);
  });
  it("markdown, çizgi ve tablo kalıntısı atılır; emoji kalır", () => {
    const ham = "──────\n===\n**kalın** metin `kod` # etiket\n| sütun | diğer |\n---\nsonda 🎉";
    expect(temizSatirlar(ham)).toEqual(["kalın metin kod # etiket", "sonda 🎉"]);
  });
  it("boş satırlar birleşir, ilk iki cümle kalır", () => {
    expect(ilkCumle("Bir. İki. Üç. Dört.")).toBe("Bir. İki.");
    expect(ilkCumle("Nokta yok bir metin")).toBe("Nokta yok bir metin");
  });
  it("'Claude:' başlığı ayrı etikete gider, gövdede tekrar etmez", () => {
    expect(bolunBaslik("Claude:\nİş bitti. Devam ediyorum.")).toEqual({ etiket: "Claude", govde: "İş bitti. Devam ediyorum." });
    expect(bolunBaslik("Sadece metin")).toEqual({ etiket: null, govde: "Sadece metin" });
  });
  it("balon 140 karakteri geçmez, gövde iki cümlede biter", () => {
    const yazi = balonMetni({ ...mesaj("a", "x ".repeat(300) + " Son. Burada biter."), ajan: "codex" });
    expect(yazi.etiket).toBe("Codex");
    expect(Array.from(yazi.govde).length).toBeLessThanOrEqual(140);
    expect(yazi.govde.endsWith("…")).toBe(true);
  });
  it("balona tıklama tam mesajı kart açıcıya verir ve pet sürüklemesini engeller", () => {
    const handlers: Record<string, (e: any) => void> = {};
    const fake = { textContent: "", className: "", setAttribute() {}, addEventListener(k: string, f: any) { handlers[k] = f; }, append() {} };
    let opened: Mesaj | null = null, stopped = false;
    const full = { ...mesaj("a"), metin: "Tam metin bir. Tam metin iki. Üçüncü." };
    balonOlustur({ createElement: () => fake } as any, full, m => { opened = m; });
    handlers.pointerdown({ stopPropagation() { stopped = true; } });
    handlers.click({ stopPropagation() {} }); expect(opened).toEqual(full); expect(stopped).toBe(true);
  });
  it("× düğmesi kapanma işlevini çağırır", () => {
    const olusan: any[] = [];
    const belge = { createElement: () => {
      const e: any = { textContent: "", className: "", attrs: {}, handlers: {} as Record<string, (ev: any) => void>,
        setAttribute(k: string, v: string) { e.attrs[k] = v; }, append() {},
        addEventListener(k: string, f: (ev: any) => void) { e.handlers[k] = f; } };
      olusan.push(e); return e;
    } };
    let kapandi = 0;
    balonOlustur(belge as any, mesaj("a"), () => {}, () => { kapandi++; }, 3);
    const kapat = olusan.find(e => e.className === "afu-balon-kapat");
    expect(kapat.textContent).toBe("×");
    kapat.handlers.click({ stopPropagation() {} });
    expect(kapandi).toBe(1);
    const rozet = olusan.find(e => e.className === "afu-balon-ek");
    expect(rozet.textContent).toBe("+3 mesaj");
  });
  it("balonu çizen ortak katman kart ve pet için aynıdır", () => {
    const m = new BalonKuyrugu(); m.gorunur(true, 0); m.ekle(mesaj("a"), 0);
    // pet modunda da aynı kuyruk kullanılır: guncelle yalnız host değiştirir.
    expect(m.aktif?.id).toBe("a"); expect(BalonKuyrugu).toBe(BalonModeli);
    vi.useFakeTimers();
    m.tick(1000); expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
 describe("R3 terminal pet conversion", () => {
  it("drops terminal decoration and markdown while preserving a question beyond the preview", () => {
    const raw = "━━━\n**Gemini:**\n# Tamamlandı\n`dosya` ve *metin*.\n═─━\nDevam edelim mi?";
    const result = terminalPetMetni(raw, "gemini");
    expect(result.etiket).toBe("Gemini");
    expect(result.tam).toBe("Tamamlandı dosya ve metin. Devam edelim mi?");
    expect(result.soru).toBe(true);
    expect(terminalPetMetni("Bitti.", "codex").soru).toBe(false);
    expect(terminalPetMetni("Cevap bekliyorum.", "opencode").soru).toBe(true);
    const long = terminalPetMetni("Bitti. " + "Açıklama ".repeat(100) + "Devam edelim mi?", "codex");
    expect(long.soru).toBe(true); expect(long.govde).not.toContain("Devam edelim mi?");
    expect(terminalPetMetni("━ **Eksik kapanış ─═ metni", "codex").tam).toBe("Eksik kapanış metni");
    expect(terminalPetMetni("npm test | kaydet", "codex").tam).toBe("npm test | kaydet");
  });
  it("renders plain text in one balloon and clears it when a contract question owns the queue", () => {
    class El {
      className = ""; textContent = ""; hidden = false; title = ""; children: El[] = [];
      handlers: Record<string, Function> = {};
      append(...els: El[]) { this.children.push(...els); }
      replaceChildren(...els: El[]) { this.children = els; }
      setAttribute() {};
      addEventListener(event: string, fn: Function) { this.handlers[event] = fn; }
    }
    const host = new El(); const doc = { createElement: () => new El() };
    const close = vi.fn();
    bildirimBalonu(doc as any, host as any, { id: "n", type: "notification", timestamp: 0, text: "**Bitti** <script>" }, close);
    expect(host.children).toHaveLength(1);
    expect(host.children[0].className).toContain("afu-konusma-balonu");
    expect(host.children[0].children[1].textContent).toBe("Bitti <script>");
    host.children[0].children[2].handlers.click({ stopPropagation() {} });
    expect(close).toHaveBeenCalledWith("n");
    bildirimBalonu(doc as any, host as any, { id: "q", type: "question", timestamp: 1 }, close);
    expect(host.hidden).toBe(true); expect(host.children).toHaveLength(0);
  });
 });
    class El {
      className = ""; textContent = ""; hidden = false; title = ""; children: El[] = [];
      handlers: Record<string, Function> = {};
      append(...els: El[]) { this.children.push(...els); }
      replaceChildren(...els: El[]) { this.children = els; }