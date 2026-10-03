import { expect, it, vi } from "vitest";
import { GitHubPanel } from "../src/sistem/servis";

it("closed GitHub panel makes zero requests, including timer advances", async () => {
  vi.useFakeTimers();
  const request = vi.fn(async (_command: string, _args?: Record<string, unknown>) => null);
  const panel = new GitHubPanel(request, () => {});
  await vi.advanceTimersByTimeAsync(180_000);
  expect(request).not.toHaveBeenCalled();
  await panel.setOpen(true);
  expect(request.mock.calls.map(c => c[0])).toEqual(["servis_panel_open", "servis_github_refresh"]);
  await panel.setOpen(false);
  const count = request.mock.calls.length;
  await vi.advanceTimersByTimeAsync(180_000);
  expect(request).toHaveBeenCalledTimes(count);
  vi.useRealTimers();
});

it("a result arriving after closure cannot repaint or restart polling", async () => {
  vi.useFakeTimers();
  let finish!: (value: unknown) => void;
  const paint = vi.fn();
  const request = async (command: string) => command === "servis_github_refresh"
    ? new Promise(resolve => { finish = resolve; }) : null;
  const panel = new GitHubPanel(request, paint);
  const opened = panel.setOpen(true);
  await vi.advanceTimersByTimeAsync(0);
  await panel.setOpen(false);
  finish({service:"github",status:"success",label:"GitHub ✓",url:null});
  await opened;
  await vi.advanceTimersByTimeAsync(120_000);
  expect(paint).not.toHaveBeenCalled();
  vi.useRealTimers();
});
