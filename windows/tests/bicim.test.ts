import { describe, it, expect } from "vitest";
import { bicimle } from "../src/message/bicim";

describe("bicimle", () => {
  it("ekran görüntüsündeki metni doğru dönüştürür", () => {
    const metin = `✨ **Commit atıldı: 0068b0a**
━━━━━━━━━━━━━━━━━━━
1. \`GOREV_R3A.md\` okundu
2. testler çalıştırıldı
3. \`bicim.ts\` eklendi
4. dördüncü madde uzun uzun yazıldı ki altmış karakteri geçsin ve kırılsın diye bekliyoruz böylece test edeceğiz.`;
    
    const sonuc = bicimle(metin);
    
    expect(sonuc.baslik).toBe("Commit atıldı: 0068b0a");
    expect(sonuc.maddeler).toHaveLength(3);
    expect(sonuc.maddeler[0]).toBe("GOREV_R3A.md okundu");
    expect(sonuc.maddeler[1]).toBe("testler çalıştırıldı");
    expect(sonuc.maddeler[2]).toBe("bicim.ts eklendi");
    expect(sonuc.soru).toBe(false);
    expect(sonuc.ayrinti).not.toContain("━");
    expect(sonuc.ayrinti).not.toContain("**");
    expect(sonuc.ayrinti).toContain("✨ Commit atıldı: 0068b0a");
  });

  it("soru algılar (❓)", () => {
    const metin = "Bunu yapayım mı? ❓";
    const sonuc = bicimle(metin);
    expect(sonuc.soru).toBe(true);
  });

  it("soru algılar (1 = / 2 =)", () => {
    const metin = "Ne yapalım?\n1 = Evet / 2 = Hayır";
    const sonuc = bicimle(metin);
    expect(sonuc.soru).toBe(true);
  });
  
  it("ANSI kodlarını temizler", () => {
    const metin = "\x1B[32mBaşarı!\x1B[0m\n- İşlem tamam";
    const sonuc = bicimle(metin);
    expect(sonuc.baslik).toBe("Başarı!");
    expect(sonuc.maddeler[0]).toBe("İşlem tamam");
    expect(sonuc.ayrinti).toBe("Başarı!\n- İşlem tamam");
  });
  
  it("60 karakterden uzun maddeleri keser", () => {
    const metin = "Başlık\n- Bu madde çok uzun olduğu için altmış karakter sınırını geçecek ve sonunda üç nokta ile kesilmesi gerekecek.";
    const sonuc = bicimle(metin);
    expect(sonuc.maddeler[0]).toHaveLength(60);
    expect(sonuc.maddeler[0].endsWith("…")).toBe(true);
  });

  it("metin yoksa boş döner", () => {
    const sonuc = bicimle(undefined);
    expect(sonuc.baslik).toBe("");
    expect(sonuc.maddeler).toHaveLength(0);
    expect(sonuc.soru).toBe(false);
  });
});
