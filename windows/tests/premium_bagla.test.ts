import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { petDurum, SEKANSLAR, type PetPose } from "../src/afu/pet";
import { getDurum } from "../src/afu/character";

const css = readFileSync("src/style.css", "utf8");
const island = readFileSync("src/island/island.ts", "utf8");
const DURUMLAR = ["calisiyor", "dusunuyor", "hata", "basari", "onay-bekliyor", "bosta", "uyku"];

describe("Premium görünüm bağlantısı: durum -> sınıf/değişken", () => {
  it("petin kendi tepkisi görev durumundan önce gelir", () => {
    expect(petDurum("hata", "calisiyor")).toBe("hata");
    expect(petDurum("uyari", "bosta")).toBe("hata");
    expect(petDurum("basari", "calisiyor")).toBe("basari");
    expect(petDurum("mutlu", "bosta")).toBe("basari");
    expect(petDurum("dusunme", "calisiyor")).toBe("onay-bekliyor");
    expect(petDurum("uyku", "calisiyor")).toBe("uyku");
  });

  it("sakin pozlarda pet görevin durumunu gösterir", () => {
    for (const pose of ["bekleme", "yuzme", "gecis", "uyanma", "donus", "etkilesim", "surukleme", "geri_donus", "yaslanma"] as PetPose[]) {
      expect(petDurum(pose, "calisiyor")).toBe("calisiyor");
      expect(petDurum(pose, "bosta")).toBe("bosta");
    }
  });

  it("her poz bilinen bir duruma düşer", () => {
    for (const pose of Object.keys(SEKANSLAR) as PetPose[]) {
      for (const gorev of ["working", "thinking", "error", "success", "awaiting", "idle"] as const) {
        expect(DURUMLAR).toContain(petDurum(pose, getDurum(gorev)));
      }
    }
  });

  it("her durumun filtre, ışık ve kenar değişkeni CSS'te tanımlı ve uygulanıyor", () => {
    for (const durum of DURUMLAR) {
      const kural = new RegExp(String.raw`\[data-durum="${durum}"\]\s*\{[^}]*--pet-filtre:[^}]*--pet-arka:[^}]*--pet-kenar:`);
      expect(css, durum).toMatch(kural);
    }
    expect(css).toMatch(/#afu-pet \.pet-image\s*\{[^}]*filter:[^}]*var\(--pet-filtre/);
    expect(css).toMatch(/#afu-character, #afu-pet\s*\{[^}]*background:\s*var\(--pet-arka/);
  });

  it("kenar rengi kartın çerçevesine bağlı; boştayken varsayılan çerçeve kalır", () => {
    expect(css).toMatch(/#island\[data-durum\]:not\(\[data-durum="bosta"\]\)\s*\{\s*border-color:\s*var\(--pet-kenar\)/);
    expect(css).not.toMatch(/#afu-pet\s*\{[^}]*box-shadow:\s*inset/);
  });

  it("ada hem karta hem pete durumu yazar", () => {
    expect(island).toMatch(/this\.islandEl\.dataset\.durum = durum/);
    expect(island).toMatch(/this\.pet\.setDurum\(durum\)/);
  });

  it("sürekli animasyon yok; hareket azaltmada geçişler kapanır", () => {
    const blok = css.slice(css.indexOf("Premium Gorunum Degiskenleri"), css.indexOf("Proje eylemi sabit"));
    expect(blok).not.toMatch(/animation\s*:/);
    expect(blok).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*#island, #afu-character, #afu-pet[^}]*transition: none/);
  });
});
