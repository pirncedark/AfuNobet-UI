import { invoke } from "@tauri-apps/api/core";
export interface GitHubPill { service: "github"; status: "success" | "failure" | "running" | "unknown"; label: string; url: string | null }
type Request = (command: string, args?: Record<string, unknown>) => Promise<unknown>;
export class GitHubPanel {
  private open = false;
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private gate: Promise<unknown> = Promise.resolve();
  constructor(private request: Request, private paint: (pill: GitHubPill | null) => void) {}
  async setOpen(open: boolean): Promise<void> {
    if (this.open === open) return;
    this.open = open;
    const generation = ++this.generation;
    clearTimeout(this.timer);
    this.timer = undefined;
    try {
      // Keep native gate updates ordered even when users close during an opening request.
      this.gate = this.gate.catch(() => {}).then(() => this.request("servis_panel_open", { open }));
      await this.gate;
      if (open && this.open && generation === this.generation) await this.refresh(generation);
    } catch { if (this.open && generation === this.generation) this.paint(null); }
  }
  private async refresh(generation: number): Promise<void> {
    if (!this.open || generation !== this.generation) return;
    let pill: GitHubPill | null = null;
    try { pill = await this.request("servis_github_refresh") as GitHubPill | null; } catch {}
    if (!this.open || generation !== this.generation) return;
    this.paint(pill);
    this.timer = setTimeout(() => { void this.refresh(generation); }, 60_000);
  }
}
/** Secondary details stay closed until deliberately opened; collapsed hosts stop all requests. */
export function mountGitHubPanel(host: HTMLElement): () => void {
  const details = document.createElement("details");
  details.className = "sistem-servis";
  const summary = document.createElement("summary");
  summary.className = "sistem-ozet";
  // Stilsiz liste işareti yerine kendi okumuz; aynı satır dili.
  const ok = document.createElement("span");
  ok.className = "sistem-ok";
  ok.setAttribute("aria-hidden", "true");
  ok.textContent = "▸";
  const ad = document.createElement("span");
  ad.textContent = "GitHub";
  summary.append(ok, ad);
  const pill = document.createElement("span");
  pill.className = "service-pill";
  pill.setAttribute("aria-live", "polite");
  pill.textContent = "GitHub ?";
  details.append(summary, pill);
  host.append(details);
  const request: Request = async (command, args) => {
    if (!("__TAURI_INTERNALS__" in window)) return null;
    return invoke(command, args);
  };
  const controller = new GitHubPanel(request, value => {
    pill.textContent = value?.label ?? "GitHub ?";
    pill.dataset.status = value?.status ?? "unknown";
  });
  const observer = new MutationObserver(() => sync());
  const sync = () => {
    observer.disconnect();
    const visible = !document.hidden && details.isConnected && details.getClientRects().length > 0;
    if (details.open) {
      for (let ancestor: HTMLElement | null = host; ancestor; ancestor = ancestor.parentElement) {
        observer.observe(ancestor, { attributes: true, attributeFilter: ["class", "style", "hidden", "open"] });
      }
    }
    void controller.setOpen(details.open && visible);
  };
  const leave = () => { void controller.setOpen(false); };
  details.addEventListener("toggle", sync);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", leave);
  // No polling/CPU loop for hidden panels. Existing host classes/styles control visibility.
  return () => {
    void controller.setOpen(false);
    observer.disconnect();
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pagehide", leave);
    details.removeEventListener("toggle", sync);
    details.remove();
  };
}
