import { it, expect, vi, describe, beforeEach } from "vitest";
import { AfuPet } from "../src/afu/pet";
import { Bridge } from "../src/core/bridge";

describe("AfuPet Sürükleme (Ense) Eşiği", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    class ElementStub {
      children: ElementStub[] = [];
      className = "";
      hidden = false;
      dataset = {};
      style = { setProperty: vi.fn(), transformOrigin: "", translate: "", scale: "", transform: "" };
      listeners = new Map<string, ((event: unknown) => void)[]>();
      setAttribute = vi.fn();
      getAttribute = vi.fn(() => "");
      append(...children: ElementStub[]) { this.children.push(...children); }
      replaceChildren(...children: ElementStub[]) { this.children = children; }
      addEventListener(name: string, handler: (event: unknown) => void) { this.listeners.set(name, [...this.listeners.get(name) ?? [], handler]); }
      removeEventListener(name: string, handler: (event: unknown) => void) {
        const arr = this.listeners.get(name);
        if (arr) this.listeners.set(name, arr.filter(h => h !== handler));
      }
      getAnimations() { return []; }
      animate = vi.fn(() => ({ cancel: vi.fn() }));
      getBoundingClientRect() { return {left: 20, bottom: 80, top: 20, width: 256, height: 256}; }
      querySelector() { return undefined; }
      contains(element: ElementStub) { return element === this || this.children.some(child => child.contains(element)); }
      fire(name: string, event: unknown = {}) { for (const handler of this.listeners.get(name) ?? []) handler(event); }
      dispatchEvent(event: unknown) { this.fire((event as {type: string}).type, event); }
      setPointerCapture = vi.fn();
      releasePointerCapture = vi.fn();
      focus = vi.fn();
    }

    const body = new ElementStub();
    vi.stubGlobal("document", { body, createElement: () => new ElementStub(), createTextNode: (text: string) => Object.assign(new ElementStub(), {textContent:text}), addEventListener: vi.fn(), hidden: false });
    
    const winStub = new ElementStub();
    vi.stubGlobal("window", {
      ...winStub,
      screenX: 0,
      innerWidth: 720,
      innerHeight: 320,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      addEventListener: winStub.addEventListener.bind(winStub),
      removeEventListener: winStub.removeEventListener.bind(winStub),
      dispatchEvent: winStub.dispatchEvent.bind(winStub),
    });

    class MockPointerEvent {
      type: string; button: number; clientX: number; clientY: number; pointerId: number; isTrusted: boolean;
      constructor(type: string, init: Record<string, unknown>) {
        this.type = type; this.button = (init.button as number) || 0; this.clientX = (init.clientX as number) || 0; this.clientY = (init.clientY as number) || 0;
        this.pointerId = (init.pointerId as number) || 1; this.isTrusted = init.isTrusted !== false;
      }
    }
    vi.stubGlobal("PointerEvent", MockPointerEvent);

    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal("Image", class {src="";});
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => globalThis.setTimeout(cb, 16));
    vi.stubGlobal("performance", { now: () => Date.now() });
  });

  it("sürükleme eşiği aşılmadan bridge çağrılmaz, aşılınca çağrılır ve transformOrigin ayarlanır", async () => {
    let petDragCalled = false;
    const { promise, resolve: dragResolve } = Promise.withResolvers<boolean>();
    vi.spyOn(Bridge, "petDrag").mockImplementation(() => {
      petDragCalled = true;
      return promise;
    });

    const pet = new AfuPet(vi.fn(), vi.fn(), vi.fn());
    pet.setActive(true);
    
    // Simulate active mode and wait for raf
    vi.advanceTimersByTime(100);

    const el = pet.el;

    // 1. Mouse down
    el.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: 100, clientY: 100, isTrusted: true }));
    expect(petDragCalled).toBe(false);

    // 2. Move slightly (under threshold)
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 102, clientY: 103 }));
    expect(petDragCalled).toBe(false);

    // 3. Move beyond threshold
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 110, clientY: 110 }));
    expect(petDragCalled).toBe(true);

    pet.onEvent({ kind: "JOB_FINISHED", taskId: "j", agent: "codex" });

    pet.model.setPose("surukleme");
    vi.advanceTimersByTime(100);
    
    const transformOrigin = (pet.image as unknown as { style: { transformOrigin: string } }).style.transformOrigin;
    expect(transformOrigin).toContain("35.15625%");
  });
});
