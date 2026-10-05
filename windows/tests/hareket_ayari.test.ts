// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { HAREKET_OLAYI, hareketAzalt, loadHareketZorla, saveHareketZorla } from "../src/core/settings";

// 1.0.4: Windows "Animasyon efektleri" kapalıyken Afu yine de hareket edebilir.
describe("Hep hareketli ayarı", () => {
  const azalt = (reduce: boolean) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q.includes("reduce"), addEventListener() {} }));
  afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); document.documentElement.classList.remove("afu-hareket-zorla"); });

  it("varsayılan açık: Windows hareketi azaltsa da Afu hareket eder", () => {
    azalt(true);
    expect(loadHareketZorla()).toBe(true);
    expect(hareketAzalt.matches).toBe(false);
  });
  it("kapatılınca Windows ayarına uyar ve CSS sınıfını kaldırır", () => {
    azalt(true);
    expect(saveHareketZorla(false)).toBe(true);
    expect(hareketAzalt.matches).toBe(true);
    expect(document.documentElement.classList.contains("afu-hareket-zorla")).toBe(false);
    saveHareketZorla(true);
    expect(document.documentElement.classList.contains("afu-hareket-zorla")).toBe(true);
  });
  it("Windows hareketi azaltmıyorsa ayar kapalıyken de hareket var", () => {
    azalt(false);
    saveHareketZorla(false);
    expect(hareketAzalt.matches).toBe(false);
  });
  it("ayar değişimi dinleyiciye ulaşır", () => {
    azalt(true);
    const fn = vi.fn();
    hareketAzalt.addEventListener("change", fn);
    window.dispatchEvent(new Event(HAREKET_OLAYI));
    expect(fn).toHaveBeenCalled();
  });
});
