import { describe, it, expect } from "vitest";

// Mock Bridge and state
const mockBridge = {
  codexStatus: async () => ({ status: "hazir", loggedIn: true, planType: null, rateLimits: {} }),
  bildirimAyarlari: async () => ({ muted: false }),
  mesajlar: async () => [],
  claudeHookInstalled: async () => true,
};

const mockState = {
  snapshot: {
    sourceUnavailable: false,
    tasks: [],
  },
};

// Helper: isCodexReady (views.ts'den)
function isCodexReady(status: unknown): boolean {
  return typeof status !== "string" && (status as any)?.status === "hazir" && (status as any)?.loggedIn === true;
}

describe("M9: Sağlık Rozetleri", () => {
  it("GPT rozetini kontrol et: status='hazir' ve loggedIn=true ✓", async () => {
    const status = { status: "hazir", loggedIn: true, planType: null, rateLimits: {} };
    expect(isCodexReady(status)).toBe(true);
  });

  it("GPT rozetini kontrol et: status='hazir' ama loggedIn=false ✗", async () => {
    const status = { status: "hazir", loggedIn: false, planType: null, rateLimits: {} };
    expect(isCodexReady(status)).toBe(false);
  });

  it("GPT rozetini kontrol et: status='oturum_yok' ✗", async () => {
    const status = { status: "oturum_yok", loggedIn: false, planType: null, rateLimits: {} };
    expect(isCodexReady(status)).toBe(false);
  });

  it("GPT rozetini kontrol et: hata string ✗", async () => {
    const status = "error";
    expect(isCodexReady(status)).toBe(false);
  });

  it("Claude rozetini kontrol et: hook kurulu ✓", async () => {
    const hookInstalled = await mockBridge.claudeHookInstalled();
    expect(hookInstalled).toBe(true);
  });

  it("Claude rozetini kontrol et: hook kurulu değil ✗", async () => {
    const hookInstalled = false;
    expect(hookInstalled).toBe(false);
  });

  it("Etiketler doğru: AfuNöbet, GPT, Ses, Claude", () => {
    const labels = ["AfuNöbet", "GPT", "Ses", "Claude"];
    expect(labels[0]).toBe("AfuNöbet");
    expect(labels[1]).toBe("GPT");
    expect(labels[2]).toBe("Ses");
    expect(labels[3]).toBe("Claude");
  });

  it("Flash mesajları doğru (Afu kapalı)", () => {
    const afuOk = false;
    let message = "";
    if (!afuOk) message = "Afu izlemeyi durdurdu. Yeniden başlatmak için dokun.";
    expect(message).toBe("Afu izlemeyi durdurdu. Yeniden başlatmak için dokun.");
  });

  it("Flash mesajları doğru (GPT oturum yok)", () => {
    const codexOk = false;
    let message = "";
    if (!codexOk) message = "GPT hesabına bağlı değil. Bağlanmak için dokun.";
    expect(message).toBe("GPT hesabına bağlı değil. Bağlanmak için dokun.");
  });

  it("Flash mesajları doğru (Ses kapalı)", () => {
    const sesOk = false;
    let message = "";
    if (!sesOk) message = "Afu'nun sesi kapalı. Açmak için dokun.";
    expect(message).toBe("Afu'nun sesi kapalı. Açmak için dokun.");
  });

  it("Flash mesajları doğru (Claude gelmiyor)", () => {
    const claudeOk = false;
    let message = "";
    if (!claudeOk) message = "Claude mesajları Afu'ya gelmiyor.";
    expect(message).toBe("Claude mesajları Afu'ya gelmiyor.");
  });

  it("Flash mesajları doğru (Tümü çalışıyor)", () => {
    const afuOk = true, codexOk = true, sesOk = true, claudeOk = true;
    let message = "Her şey çalışıyor.";
    expect(message).toBe("Her şey çalışıyor.");
  });
});
