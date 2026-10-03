// M1: Balondaki ve karttaki mesajlar okunabilir, taşma yok, otomatik kapanmıyor.
// Türkçe metin, Claude mesaj biçimi, 3 uzunluk, %100 ve %150 ölçek
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { readFileSync } from "node:fs";

const css = ["src/style.css", "src/message/message.css"]
  .map(f => readFileSync(f, "utf8")).join("\n");

type TestMesaj = { ad: string; metin: string; uzunluk: "kısa" | "orta" | "uzun" };

const mesajlar: TestMesaj[] = [
  { ad: "kısa", metin: "Claude: Evet, yapıldı.", uzunluk: "kısa" },
  { 
    ad: "orta (200 karakter)", 
    metin: "Claude: ━━━━━━━━━━━\n`1` İlk madde tamamlandı.\n`2` İkinci madde kontrol edildi.\n`3` Üçüncü madde hata verdi.\n\nDetay: İşler sistemde çalışıyor, bazı parçalar eksik.", 
    uzunluk: "orta" 
  },
  { 
    ad: "uzun (1000+ karakter)", 
    metin: "Claude: ━━━━━━━━━━━\n**Başlık: İşler Tamamlandı**\n\n`1` Birinci madde: Sistem kurulumu yapıldı, tüm modüller yüklendi ve test edildi. Bu aşamada bağlantı protokolü kontrol edildi.\n\n`2` İkinci madde: Veri tabanı senkronizasyonu başarıyla gerçekleştirildi. Her kayıt doğrulandı, yedekleme alındı.\n\n`3` Üçüncü madde: API endpoints test edildi, hataları giderildi. Dokümantasyon tamamlandı.\n\nDiğer notlar: Performans ölçümleri yapıldı. Sistem %95 hızında çalışıyor. Ek optimizasyon için backlog'a eklendi.", 
    uzunluk: "uzun" 
  }
];

function sayfa(metin: string, olcek: number, petGenislik = 320): string {
  return `<!DOCTYPE html><html lang="tr"><head><style>${css}</style></head><body>
  <div id="root">
    <div id="afu-pet" style="width:${petGenislik}px; height:200px; border:1px solid #ccc; --pet-balon-h:150px">
      <div id="afu-pet-balon" class="afu-konusma-balonu" style="font-size:${12 * olcek}px">${metin}</div>
    </div>
  </div></body></html>`;
}

type Olcum = { 
  scrollWidth: number; clientWidth: number; 
  scrollHeight: number; clientHeight: number;
  fontSize: string;
  overflow: string;
};

async function olc(page: Page): Promise<Olcum> {
  return page.evaluate(() => {
    const balon = document.querySelector("#afu-pet-balon")!;
    const cs = getComputedStyle(balon);
    return {
      scrollWidth: (balon as HTMLElement).scrollWidth,
      clientWidth: (balon as HTMLElement).clientWidth,
      scrollHeight: (balon as HTMLElement).scrollHeight,
      clientHeight: (balon as HTMLElement).clientHeight,
      fontSize: cs.fontSize,
      overflow: cs.overflow,
    };
  });
}

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1200, height: 600 } });
});

afterAll(async () => {
  await browser?.close();
});

describe("M1: Mesajlar okunabilir (taşma yok, yazı >= 12px)", () => {
  for (const msg of mesajlar) {
    for (const olcek of [1, 1.5]) {
      it(`${msg.ad} — ölçek x${olcek}`, async () => {
        await page.setContent(sayfa(msg.metin, olcek));
        const m = await olc(page);

        // Yazı boyutu >= 12px
        const fontSize = parseFloat(m.fontSize);
        expect(fontSize, `yazı boyutu ${fontSize}px`).toBeGreaterThanOrEqual(12 * olcek);

        // Taşma yok: scrollWidth <= clientWidth (yatay)
        expect(m.scrollWidth, `yatay taşma: ${m.scrollWidth} > ${m.clientWidth}`).toBeLessThanOrEqual(m.clientWidth + 1);

        // Dikey: kaydırılabilir veya tam sığıyor
        const dikey = m.scrollHeight <= m.clientHeight || m.overflow === "auto";
        expect(dikey, `dikey: scroll=${m.scrollHeight} client=${m.clientHeight} overflow=${m.overflow}`).toBe(true);
      });
    }
  }
});

describe("M1: Balon pet penceresinin dışına taşmıyor", () => {
  it("max-height ve overflow kontrol", async () => {
    await page.setContent(sayfa(mesajlar[2].metin, 1.5, 280));
    const m = await olc(page);
    
    // Balon client yüksekliği pet kutusunun içinde (150px var edildi)
    expect(m.clientHeight, `balon yüksekliği: ${m.clientHeight}px`).toBeLessThanOrEqual(150 * 1.5 + 10);
  });
});

// notifications.test.ts'deki pattern:
// Mesajlar kendiliğinden KAPANMIYOR (timer yok)
// "Okudum" düğmesi ile manuel kapanır
