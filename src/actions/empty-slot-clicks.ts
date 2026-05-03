export type EmptySlotClickResult = "pending" | "doubleClick";

export type EmptySlotClickScheduler = {
  setTimeout(callback: () => void, delayMs: number): NodeJS.Timeout;
  clearTimeout(timeout: NodeJS.Timeout): void;
};

type PendingEmptySlotClick = {
  timeout: NodeJS.Timeout | undefined;
  onSingleClick: () => void;
};

export class EmptySlotClickTracker {
  private readonly pendingClicks = new Map<string, PendingEmptySlotClick>();
  private readonly delayMs: number;
  private readonly scheduler: EmptySlotClickScheduler;

  constructor(delayMs: number, scheduler: EmptySlotClickScheduler = globalThis) {
    this.delayMs = delayMs;
    this.scheduler = scheduler;
  }

  click(actionId: string, onSingleClick: () => void): EmptySlotClickResult {
    const pending = this.pendingClicks.get(actionId);
    if (pending) {
      if (pending.timeout) {
        this.scheduler.clearTimeout(pending.timeout);
      }
      this.pendingClicks.delete(actionId);
      return "doubleClick";
    }

    const timeout = this.scheduler.setTimeout(() => {
      this.pendingClicks.delete(actionId);
      onSingleClick();
    }, this.delayMs);

    this.pendingClicks.set(actionId, { timeout, onSingleClick });
    return "pending";
  }

  beginPress(actionId: string): void {
    const pending = this.pendingClicks.get(actionId);
    if (!pending?.timeout) {
      return;
    }

    this.scheduler.clearTimeout(pending.timeout);
    pending.timeout = undefined;
  }

  cancel(actionId: string): void {
    const pending = this.pendingClicks.get(actionId);
    if (!pending) {
      return;
    }

    if (pending.timeout) {
      this.scheduler.clearTimeout(pending.timeout);
    }
    this.pendingClicks.delete(actionId);
  }
}
