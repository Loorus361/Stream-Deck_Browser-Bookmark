import assert from "node:assert/strict";
import { test } from "node:test";

import { EmptySlotClickTracker } from "./empty-slot-clicks.js";

type ScheduledCallback = {
  callback: () => void;
  delayMs: number;
  timeout: NodeJS.Timeout;
  cleared: boolean;
};

function createScheduler() {
  const callbacks: ScheduledCallback[] = [];

  return {
    callbacks,
    scheduler: {
      setTimeout(callback: () => void, delayMs: number): NodeJS.Timeout {
        const timeout = { id: callbacks.length + 1 } as unknown as NodeJS.Timeout;
        callbacks.push({ callback, delayMs, timeout, cleared: false });
        return timeout;
      },
      clearTimeout(timeout: NodeJS.Timeout): void {
        const scheduled = callbacks.find((entry) => entry.timeout === timeout);
        if (scheduled) {
          scheduled.cleared = true;
        }
      }
    }
  };
}

test("EmptySlotClickTracker delays a single empty-slot click", () => {
  const { callbacks, scheduler } = createScheduler();
  const tracker = new EmptySlotClickTracker(300, scheduler);
  const events: string[] = [];

  const result = tracker.click("action-1", () => events.push("single"));

  assert.equal(result, "pending");
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0]?.delayMs, 300);
  assert.deepEqual(events, []);

  const firstCallback = callbacks[0];
  if (firstCallback && !firstCallback.cleared) {
    firstCallback.callback();
  }

  assert.deepEqual(events, ["single"]);
});

test("EmptySlotClickTracker turns a second empty-slot click into a double click", () => {
  const { callbacks, scheduler } = createScheduler();
  const tracker = new EmptySlotClickTracker(300, scheduler);
  const events: string[] = [];

  assert.equal(tracker.click("action-1", () => events.push("single")), "pending");
  assert.equal(tracker.click("action-1", () => events.push("second-single")), "doubleClick");

  assert.equal(callbacks[0]?.cleared, true);
  const firstCallback = callbacks[0];
  if (firstCallback && !firstCallback.cleared) {
    firstCallback.callback();
  }

  assert.deepEqual(events, []);
});

test("EmptySlotClickTracker pauses a pending single click when another press starts", () => {
  const { callbacks, scheduler } = createScheduler();
  const tracker = new EmptySlotClickTracker(300, scheduler);
  const events: string[] = [];

  assert.equal(tracker.click("action-1", () => events.push("single")), "pending");
  tracker.beginPress("action-1");

  assert.equal(callbacks[0]?.cleared, true);
  const firstCallback = callbacks[0];
  if (firstCallback && !firstCallback.cleared) {
    firstCallback.callback();
  }

  assert.equal(events.length, 0);
  assert.equal(tracker.click("action-1", () => events.push("second-single")), "doubleClick");
});

test("EmptySlotClickTracker cancels a paused pending single click", () => {
  const { callbacks, scheduler } = createScheduler();
  const tracker = new EmptySlotClickTracker(300, scheduler);
  const events: string[] = [];

  assert.equal(tracker.click("action-1", () => events.push("single")), "pending");
  tracker.beginPress("action-1");
  tracker.cancel("action-1");

  assert.equal(callbacks[0]?.cleared, true);
  assert.equal(tracker.click("action-1", () => events.push("next-single")), "pending");

  assert.equal(callbacks.length, 2);
  assert.deepEqual(events, []);
});

test("EmptySlotClickTracker tracks pending clicks per action", () => {
  const { callbacks, scheduler } = createScheduler();
  const tracker = new EmptySlotClickTracker(300, scheduler);
  const events: string[] = [];

  assert.equal(tracker.click("action-1", () => events.push("first")), "pending");
  assert.equal(tracker.click("action-2", () => events.push("second")), "pending");

  for (const scheduled of callbacks) {
    if (!scheduled.cleared) {
      scheduled.callback();
    }
  }

  assert.deepEqual(events, ["first", "second"]);
});

test("EmptySlotClickTracker cancels a pending empty-slot click", () => {
  const { callbacks, scheduler } = createScheduler();
  const tracker = new EmptySlotClickTracker(300, scheduler);
  const events: string[] = [];

  assert.equal(tracker.click("action-1", () => events.push("single")), "pending");
  tracker.cancel("action-1");

  assert.equal(callbacks[0]?.cleared, true);
  const firstCallback = callbacks[0];
  if (firstCallback && !firstCallback.cleared) {
    firstCallback.callback();
  }

  assert.deepEqual(events, []);
});
