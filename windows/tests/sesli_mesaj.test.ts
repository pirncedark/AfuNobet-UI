import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));
import { YankiKoruma, sesIptal } from "../src/chat/voice";
import { Island } from "../src/island/island";
import { Bridge } from "../src/core/bridge";
import { messageNotifications, type NotificationMessage } from "../src/message/notifications";
import type { Mesaj } from "../src/message/message";

let current: NotificationMessage | null;
let changed: () => void;
let island: any;
beforeEach(() => {
  vi.stubGlobal("window", { addEventListener: vi.fn(), setTimeout: vi.fn() });
  vi.stubGlobal("localStorage", { getItem: vi.fn(() => null) });
  vi.spyOn(messageNotifications, "setEnabled").mockImplementation(() => {});
  vi.spyOn(messageNotifications, "subscribe").mockImplementation(fn => { changed = fn; return () => {}; });
  vi.spyOn(messageNotifications, "current").mockImplementation(() => current);
  vi.spyOn(Bridge, "voiceSupported").mockResolvedValue({ whisper: true, winrt_stt: false, tts: true });
  vi.spyOn(Bridge, "voiceChunks").mockResolvedValue({ warning: null });
  vi.spyOn(Bridge, "voiceListenTurn").mockResolvedValue("");
  island = Object.assign(Object.create(Island.prototype), {
    yankiKoruma:new YankiKoruma(), sesliOkunan: new Set(), sesliId: null, sohbetAcik: true,
    chat: { voice: { active: false }, responses: { speaking: false } },
    sesDalga: vi.fn(), konusan: { setHarici: vi.fn() },
    fsm: { messageOpened: vi.fn(), messageClosed: vi.fn() },
    mode: "pet", syncDom: vi.fn(),
  });
  current = null;
  island.bindMessages();
});
afterEach(async () => { await sesIptal({voiceSilence:async()=>{}}); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function message(ajan: Mesaj["ajan"], tur: Mesaj["tur"]) {
  current = { id: "notification:test", type: "notification", timestamp: 1,
    raw: { surum: 1, id: "test", ajan, tur, metin: "Yeni mesaj geldi.", zaman: 1 } };
  return current;
}
it.each(["claude", "codex", "gemini", "opencode"] as const)("%s bildirimlerini okur; sadece Claude bitti cevabını dinler", async ajan => {
  for (const tur of ["bilgi", "uyari", "bitti"] as const) {
    island.sesliOkunan.clear(); message(ajan, tur); changed();
    await vi.waitFor(() => expect(Bridge.voiceChunks).toHaveBeenCalledWith("Yeni mesaj geldi.", []));
    await vi.waitFor(() => expect(island.sesliId).toBeNull(), {timeout:2000});
    await vi.waitFor(() => expect(Bridge.voiceListenTurn).toHaveBeenCalledTimes(ajan === "claude" && tur === "bitti" ? 1 : 0));
    vi.mocked(Bridge.voiceChunks).mockClear();
  }
});
it("sohbet kapalıyken Claude mesajını okur ama cevap dinlemez", async () => {
  island.sohbetAcik = false;
  await island.sesliCevap(message("claude", "bitti"));
  expect(Bridge.voiceChunks).toHaveBeenCalledOnce();
  expect(Bridge.voiceListenTurn).not.toHaveBeenCalled();
});
it("sessize alınmış mesajı okumaz", async () => {
  vi.mocked(localStorage.getItem).mockReturnValue("0");
  await island.sesliCevap(message("codex", "bilgi"));
  expect(Bridge.voiceChunks).not.toHaveBeenCalled();
});
it("aynı kimliği ikinci kez okumaz", async () => {
  const m = message("codex", "bilgi");
  await island.sesliCevap(m); await island.sesliCevap(m);
  expect(Bridge.voiceChunks).toHaveBeenCalledOnce();
});
it("komut balonunu okumaz", async () => {
  message("codex", "komut"); changed();
  await Promise.resolve();
  expect(Bridge.voiceChunks).not.toHaveBeenCalled();
});
