import { describe, expect, it } from "vitest";
import { AJAN_DURUMLARI, ajanDurumMetni, parseAjanlar, State } from "../src/core/state";
import { AJAN_OLAYI, ajanOlaylariniDinle } from "../src/core/protokol";

const satir = (degisim: Record<string, unknown> = {}) => ({
  oturum: "c-1", ajan: "claude", durum: "working", gorev: "Planı uygula",
  ust: null, alt: false, baslangic: 1790000000000, guncelleme: 1790000004000, bitti: false, ...degisim,
});
const yuk = (...satirlar: Record<string, unknown>[]) => ({ surum: 1, satirlar });

describe("ajan-olaylari protokolü (E3)", () => {
  it("olay adı sözleşmeyle aynı", () => {
    expect(AJAN_OLAYI).toBe("ajan-olaylari");
  });
  it("bilinmeyen yeni-ajan satırı kod değişmeden görünür", () => {
    const [r] = parseAjanlar(yuk(satir({ oturum: "y-1", ajan: "yeni-ajan", gorev: "Rapor hazırla" })));
    expect(r).toMatchObject({ oturum: "y-1", ajan: "yeni-ajan", ad: "YENI-AJAN", durum: "working", gorev: "Rapor hazırla" });
  });
  it("bilinen ajan NAMES adını alır", () => {
    expect(parseAjanlar(yuk(satir({ ajan: "codex" })))[0].ad).toBe("CODEX");
    expect(parseAjanlar(yuk(satir()))[0].ad).toBe("Claude");
  });
  it("geçersiz ajan adı, oturum ve durum atlanır", () => {
    const sonuc = parseAjanlar(yuk(
      satir({ oturum: "a", ajan: "Kötü Ad" }),
      satir({ oturum: "b", ajan: "x".repeat(33) }),
      satir({ oturum: "c d" }),
      satir({ oturum: "x".repeat(81) }),
      satir({ oturum: "e", durum: "uyuyor" }),
      satir({ oturum: "f", ajan: 5 }),
      satir({ oturum: "tamam" }),
    ));
    expect(sonuc.map(r => r.oturum)).toEqual(["tamam"]);
  });
  it("geçersiz yük boş liste verir", () => {
    expect(parseAjanlar(null)).toEqual([]);
    expect(parseAjanlar({ surum: 2, satirlar: [satir()] })).toEqual([]);
    expect(parseAjanlar({ surum: 1, satirlar: "x" })).toEqual([]);
  });
  it("alt ajan satırı ana satırın hemen altında", () => {
    const sonuc = parseAjanlar(yuk(
      satir({ oturum: "ag-9", ust: "x-1", alt: true, baslangic: 5 }),
      satir({ oturum: "x-1", ajan: "codex", baslangic: 3 }),
      satir({ oturum: "ag-7", ust: "c-1", alt: true, baslangic: 2 }),
      satir({ oturum: "c-1", baslangic: 1 }),
      satir({ oturum: "yetim", ust: "yok", alt: true, baslangic: 0 }),
    ));
    expect(sonuc.map(r => r.oturum)).toEqual(["c-1", "ag-7", "x-1", "ag-9", "yetim"]);
  });
  it("tekrar eden oturum atlanır", () => {
    expect(parseAjanlar(yuk(satir(), satir({ ajan: "codex" }))).map(r => r.ajan)).toEqual(["claude"]);
  });
  it("bitti satırı finished ve Bitti metni", () => {
    const [r] = parseAjanlar(yuk(satir({ durum: "finished", bitti: true })));
    expect(r.bitti).toBe(true);
    expect(ajanDurumMetni(r)).toBe("Bitti");
  });
  it("durum metinleri kısa ve Türkçe", () => {
    const metin = AJAN_DURUMLARI.map(durum => ajanDurumMetni(parseAjanlar(yuk(satir({ durum })))[0]));
    expect(metin).toEqual(["Düşünüyor", "Çalışıyor", "Onay bekliyor", "Bitti", "Tamamlanamadı", "Kota doldu, bekliyor"]);
  });
  it("en fazla 64 satır", () => {
    const cok = Array.from({ length: 100 }, (_, i) => satir({ oturum: `s-${i}`, baslangic: i }));
    expect(parseAjanlar(yuk(...cok))).toHaveLength(64);
  });
  it("görevde yol veya gizli bilgi null olur", () => {
    const sonuc = parseAjanlar(yuk(
      satir({ oturum: "a", gorev: "C:\\Users\\kullanici\\gizli.txt oku" }),
      satir({ oturum: "b", gorev: "token=abc123" }),
      satir({ oturum: "c", gorev: "git push --force" }),
      satir({ oturum: "d", gorev: 42 }),
    ));
    expect(sonuc.map(r => r.gorev)).toEqual([null, null, null, null]);
  });
  it("State.applyAjanlar notify eder ve altAjanlar doğru", () => {
    let sayac = 0;
    const birak = State.subscribe(() => { sayac++; });
    State.applyAjanlar(yuk(satir(), satir({ oturum: "ag-7", ust: "c-1", alt: true, baslangic: 1790000002000 })));
    birak();
    expect(sayac).toBe(1);
    expect(State.ajanlar.map(r => r.oturum)).toEqual(["c-1", "ag-7"]);
    expect(State.altAjanlar.map(r => r.oturum)).toEqual(["ag-7"]);
    State.applyAjanlar(null);
    expect(State.ajanlar).toEqual([]);
  });
  it("Tauri yokken dinleyici sessiz çalışır", async () => {
    const birak = await ajanOlaylariniDinle();
    expect(typeof birak).toBe("function");
    expect(() => birak()).not.toThrow();
  });
});
