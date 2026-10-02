export class Gestures {
  private clicks: number[] = [];
  private hoverAt: number | null = null;
  private cheered = false;
  click(now: number): "squash" | "dizzy" {
    this.clicks = this.clicks.filter(time => now - time <= 1000);
    this.clicks.push(now);
    if (this.clicks.length >= 3) { this.clicks = []; return "dizzy"; }
    return "squash";
  }
  hoverStart(now: number) { this.hoverAt = now; this.cheered = false; }
  hoverTick(now: number): "cheer" | null {
    if (this.hoverAt === null || this.cheered || now - this.hoverAt < 2000) return null;
    this.cheered = true;
    return "cheer";
  }
  hoverEnd() { this.hoverAt = null; this.cheered = false; }
}
