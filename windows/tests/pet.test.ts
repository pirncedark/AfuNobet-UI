import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { PetModel, SEKANSLAR } from "../src/afu/pet";
import { T } from "../src/afu/timing";
import { IslandStateMachine } from "../src/island/fsm";
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("mini pet", () => {
  it("collapses after 15 seconds to pet and click opens home", () => {
    const fsm = new IslandStateMachine();
    fsm.forceHome(); fsm.mouseLeft();
    vi.advanceTimersByTime(15000);
    expect(fsm.state).toBe("pet");
    fsm.mouseEntered(); expect(fsm.state).toBe("pet");
    fsm.click(); expect(fsm.state).toBe("home");
    fsm.cancelTimers();
  });
  it("holds warning until acknowledged, including hover and events", () => {
    const p = new PetModel(0);
    p.onEvent({ kind: "RATE_LIMIT", taskId: "j", agent: "codex" });
    expect(p.frame).toBe("tepki_uyari");
    p.tick(60000); p.hover(true); p.hover(false);
    expect(p.pose).toBe("uyari");
    expect(p.balloon).toBe("!");
    p.acknowledge(); expect(p.balloon).toBeNull(); expect(p.pose).toBe("bekleme");
  });
  it("hover floats and leaves to idle, idle visits all breathing and blink frames", () => {
    const p = new PetModel(0);
    p.hover(true); expect(p.frame).toBe("uyan_yuzme");
    p.hover(false); expect(p.pose).toBe("bekleme");
    const frames = new Set<string>();
    for (let t = 0; t <= 30000; t += 30) { p.tick(t); frames.add(p.frame); }
    expect([...frames]).toEqual(expect.arrayContaining(["idle_normal", "idle_nefes", "idle_goz_kapali", "idle_sol", "idle_sag"]));
  });
  it("sleeps after ten quiet minutes and wakes on work", () => {
    const p = new PetModel(0);
    p.tick(600001); expect(p.pose).toBe("uyku");
    p.onEvent({ kind: "JOB_STARTED", taskId: "j", agent: "codex" });
    expect(p.pose).toBe("uyanma");
    p.tick(603000); expect(p.pose).toBe("bekleme");
  });
  it("success expires, failure uses error source and transition lasts 750ms", () => {
    const p = new PetModel(0);
    p.onEvent({ kind: "JOB_FINISHED", taskId: "j", agent: "codex" });
    expect(p.frame).toBe("tepki_basari");
    p.tick(2500); expect(p.pose).toBe("bekleme");
    p.onEvent({ kind: "JOB_FAILED", taskId: "j", agent: "codex" });
    expect(p.frame).toBe("tepki_hata");
    expect(T.shrink + T.floatDown + T.reveal + T.grab).toBe(750);
  });
  it("every sequence references actual cut assets", () => {
    for (const sequence of Object.values(SEKANSLAR)) for (const frame of sequence) {
      expect(existsSync(path.resolve("../afu-character/pet", frame.kare + ".png"))).toBe(true);
    }
  });
  it("reverses the transition frames when returning to the card", () => {
    expect(SEKANSLAR.donus.map(frame => frame.kare)).toEqual(["akis_tutunma", "akis_gorunme", "akis_suzulme", "akis_kuculme"]);
  });
  it("collapses to tray with pet disabled and tray click opens home", () => {
    const fsm = new IslandStateMachine(); fsm.petEnabled = false;
    fsm.forceHome(); fsm.collapse(); expect(fsm.state).toBe("tray");
    fsm.trayClick(); expect(fsm.state).toBe("home"); fsm.cancelTimers();
  });
});
