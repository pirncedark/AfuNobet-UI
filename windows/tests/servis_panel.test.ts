import { expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ invoke: vi.fn(async (_command: string, _args?: unknown) => null) }));
vi.mock("@tauri-apps/api/core", () => native);
import { mountGitHubPanel } from "../src/sistem/servis";

it("collapsing an ancestor details closes the native gate and stops refreshes", async () => {
  vi.useFakeTimers();
  native.invoke.mockClear();
  const observers: Observer[] = [];
  class Observer {
    targets = new Map<Element, MutationObserverInit>();
    constructor(private callback: () => void) { observers.push(this); }
    observe(target: Element, options: MutationObserverInit) { this.targets.set(target, options); }
    disconnect() { this.targets.clear(); }
    changed(target: Element, name: string) {
      if (this.targets.get(target)?.attributeFilter?.includes(name)) this.callback();
    }
  }
  class Element extends EventTarget {
    parentElement: Element | null = null;
    children: Element[] = [];
    dataset: Record<string, string> = {};
    className = "";
    textContent = "";
    isConnected = true;
    private opened = false;
    constructor(readonly tag: string) { super(); }
    get open() { return this.opened; }
    set open(open: boolean) {
      this.opened = open;
      observers.forEach(observer => observer.changed(this, "open"));
    }
    append(...children: Element[]) { children.forEach(child => { child.parentElement = this; this.children.push(child); }); }
    setAttribute(_name: string, _value: string) {}
    getClientRects() {
      for (let node: Element | null = this; node; node = node.parentElement) {
        if (node.tag === "details" && !node.open) return [];
      }
      return [{}];
    }
    remove() { this.isConnected = false; }
  }
  const document = Object.assign(new EventTarget(), { hidden: false, createElement: (tag: string) => new Element(tag) });
  const window = Object.assign(new EventTarget(), { __TAURI_INTERNALS__: {} });
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  vi.stubGlobal("MutationObserver", Observer);
  const ancestor = new Element("details");
  const host = new Element("div");
  ancestor.open = true;
  ancestor.append(host);
  const dispose = mountGitHubPanel(host as unknown as HTMLElement);
  try {
    const details = host.children[0];
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    await vi.advanceTimersByTimeAsync(0);
    expect(native.invoke).toHaveBeenCalledWith("servis_github_refresh", undefined);
    ancestor.open = false;
    await vi.advanceTimersByTimeAsync(0);
    expect(native.invoke).toHaveBeenLastCalledWith("servis_panel_open", { open: false });
    const requests = native.invoke.mock.calls.length;
    await vi.advanceTimersByTimeAsync(180_000);
    expect(native.invoke).toHaveBeenCalledTimes(requests);
  } finally {
    dispose();
    await vi.advanceTimersByTimeAsync(0);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});
