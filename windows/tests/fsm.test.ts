import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IslandStateMachine } from "../src/island/fsm";

describe("preserved island state machine", () => {
  let fsm: IslandStateMachine;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
    fsm = new IslandStateMachine();
    fsm.petEnabled = false;
  });
  afterEach(() => {
    fsm.cancelTimers();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("wakes from hidden to petit on hover then opens home on click", () => {
    const transitions: string[] = [];
    fsm.onTransition = (from, to) => transitions.push(`${from}:${to}`);
    fsm.mouseEntered();
    expect(fsm.state).toBe("petit");
    fsm.click();
    expect(fsm.state).toBe("home");
    expect(transitions).toEqual(["hidden:petit", "petit:home"]);
  });

  it("collapses home to tray while explicit petit still hides after leaving", () => {
    fsm.forceHome();
    fsm.mouseLeft();
    vi.advanceTimersByTime(14999);
    expect(fsm.state).toBe("home");
    vi.advanceTimersByTime(1);
    expect(fsm.state).toBe("tray");
    fsm.forcePetit();
    fsm.mouseLeft();
    vi.advanceTimersByTime(59999);
    expect(fsm.state).toBe("petit");
    vi.advanceTimersByTime(1);
    expect(fsm.state).toBe("hidden");
  });

  it("cancels the collapse timer when the cursor returns", () => {
    fsm.forceHome();
    fsm.mouseLeft();
    vi.advanceTimersByTime(10000);
    fsm.mouseEntered();
    vi.advanceTimersByTime(60000);
    expect(fsm.state).toBe("home");
  });

  it("keeps a pinned home open after mouse leave", () => {
    fsm.pinned = true;
    fsm.forceHome();
    fsm.mouseLeft();
    vi.advanceTimersByTime(120000);
    expect(fsm.state).toBe("home");
  });

  it("pinning an already scheduled collapse cancels it", () => {
    fsm.forceHome();
    fsm.mouseLeft();
    vi.advanceTimersByTime(10000);
    fsm.pinned = true;
    vi.advanceTimersByTime(120000);
    expect(fsm.state).toBe("home");
  });

  it("reveals incoming work without repeatedly extending its timer", () => {
    fsm.reveal();
    expect(fsm.state).toBe("petit");
    vi.advanceTimersByTime(30000);
    fsm.reveal();
    vi.advanceTimersByTime(30000);
    expect(fsm.state).toBe("hidden");
  });

  it("uses the renamed greeting and collapses after animation completion", () => {
    fsm.launch();
    expect(fsm.state).toBe("greeting");
    fsm.greetComplete();
    vi.advanceTimersByTime(599);
    expect(fsm.state).toBe("greeting");
    vi.advanceTimersByTime(1);
    expect(fsm.state).toBe("petit");
  });

  it("does not replace an active greeting hover timer on completion", () => {
    fsm.launch();
    fsm.mouseEntered();
    fsm.greetComplete();
    vi.advanceTimersByTime(9999);
    expect(fsm.state).toBe("greeting");
    vi.advanceTimersByTime(1);
    expect(fsm.state).toBe("petit");
  });

  it("explicit transitions cancel stale reveal and greeting timers", () => {
    fsm.reveal();
    fsm.forceHome();
    vi.advanceTimersByTime(120000);
    expect(fsm.state).toBe("home");
    fsm.launch();
    fsm.greetComplete();
    fsm.forceHidden();
    vi.advanceTimersByTime(120000);
    expect(fsm.state).toBe("hidden");
  });
});
