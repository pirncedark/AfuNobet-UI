// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Island } from "../src/island/island";
import { IslandStateMachine, type FsmState } from "../src/island/fsm";
afterEach(() => vi.useRealTimers());
describe("full panel edge wake", () => {
  it.each(["hidden", "petit", "pet", "tray"] as FsmState[])("opens from %s and stays open at the edge", state => {
    vi.useFakeTimers();
    const fsm = new IslandStateMachine(); fsm.state = state;
    const island = Object.create(Island.prototype) as Island;
    Object.assign(island, { fsm, wasInIsland: false });
    fsm.onTransition = () => { if (!(island as any).wasInIsland) fsm.mouseLeft(); };
    island.onEdgeWake();
    expect(fsm.state).toBe("home");
    vi.advanceTimersByTime(70000); expect(fsm.state).toBe("home");
    fsm.mouseLeft(); vi.advanceTimersByTime(15000); expect(fsm.state).toBe("pet");
    island.onEdgeWake(); expect(fsm.state).toBe("home");
    fsm.cancelTimers();
  });
  it("cancels an existing close timer without repeated home transitions", () => {
    vi.useFakeTimers(); const fsm = new IslandStateMachine(); fsm.forceHome(); fsm.mouseLeft();
    const transition = vi.fn(); fsm.onTransition = transition;
    const island = Object.create(Island.prototype) as Island; Object.assign(island, { fsm });
    island.onEdgeWake(); island.onEdgeWake();
    vi.advanceTimersByTime(70000); expect(fsm.state).toBe("home"); expect(transition).not.toHaveBeenCalled();
    fsm.cancelTimers();
  });
});
