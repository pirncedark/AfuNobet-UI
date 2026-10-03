 // @vitest-environment happy-dom
 import { describe, test, expect, vi } from "vitest";
import { ChatView, ChatModel } from "../src/chat/chat";
import { SurekliSohbet } from "../src/chat/voice";
import { h } from "../src/views/dom";

describe("M7 Sesli GPT Bağlantısı", () => {
    test("sesli sohbette sesli turnGPT'ye gönderilir ve cevap döndürülür", async () => {
        let codexSent = false;
        const { promise: voiceResponsePromise, resolve: voiceResponseResolve } = Promise.withResolvers<void>();
        
        const actions = {
            codexStatus: vi.fn().mockResolvedValue({ status: "hazir" }),
            codexSend: vi.fn().mockImplementation(async (text: string) => {
                codexSent = true;
                return { threadId: "t1", turnId: "t2" };
            }),
            codexCancel: vi.fn().mockResolvedValue(null),
            codexLogin: vi.fn().mockResolvedValue(null),
            codexLoginCancel: vi.fn().mockResolvedValue(null),
            codexInstall: vi.fn().mockResolvedValue(null),
        };

        const voiceActions = {
            voiceListenTurn: vi.fn().mockResolvedValue("Merhaba GPT"),
            voiceResponse: vi.fn().mockImplementation(async (text) => {
                expect(text).toBe("GPT Cevabı!");
                voiceResponseResolve();
                return { warning: null };
            }),
            voiceCancel: vi.fn().mockResolvedValue(null),
            voiceSpeak: vi.fn().mockResolvedValue(null),
            voiceSilence: vi.fn().mockResolvedValue(null),
            voiceSupported: vi.fn().mockResolvedValue({ whisper: true, winrt_stt: true, tts: true, afu_tts: true })
        };

        const view = new ChatView(actions, () => "", voiceActions);
        await view.refresh();
        
        await Promise.resolve();
        view.mainVoiceBtn.click();
        
        // Wait for it to become listening then thinking
        await Promise.resolve();
        await Promise.resolve();
        
        // Since voiceListenTurn resolves immediately with "Merhaba GPT",
        // it calls chat.send("Merhaba GPT"), which calls codexSend.
        for(let i=0; i<10; i++) await Promise.resolve();
        console.log("dispatching events");
        view.onEvent({ method: "turn/started", params: { threadId: "t1", turn: { id: "t2" } } });
        view.onEvent({ method: "item/agentMessage/delta", params: { threadId: "t1", turn: { id: "t2" }, delta: "GPT Cevabı!" } });
        view.onEvent({ method: "turn/completed", params: { threadId: "t1", turn: { id: "t2", status: "completed" } } });
        console.log("waiting for voiceResponsePromise");

        // wait for voiceResponse to be called
        await voiceResponsePromise;
        
        expect(codexSent).toBe(true);
    });
});
