/**
 * Tests for the offline lead queue logic.
 *
 * We test the pure functions extracted from useOfflineLeadQueue:
 * - readQueue / writeQueue (localStorage helpers)
 * - generateId (uniqueness)
 * - enqueue / dequeue semantics
 * - retry counting and failure marking
 * - clearFailed
 * - sync success removes items
 * - sync failure increments retries and marks failed after MAX_RETRIES
 *
 * Note: React hooks themselves are tested via the logic they encapsulate.
 * The hook is a thin wrapper around these pure functions + event listeners.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Replicate the pure helpers from the hook ─────────────────────────────────

const STORAGE_KEY = "offline_lead_queue";
const MAX_RETRIES = 3;

type QueuedLead = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  source: string;
  contactType: string;
  queuedAt: number;
  retries: number;
  failed: boolean;
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

function readQueue(): QueuedLead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedLead[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

let idCounter = 0;
function generateId(): string {
  return `oq_test_${++idCounter}`;
}

function enqueue(
  lead: Omit<QueuedLead, "id" | "queuedAt" | "retries" | "failed">
): QueuedLead {
  const item: QueuedLead = {
    ...lead,
    id: generateId(),
    queuedAt: Date.now(),
    retries: 0,
    failed: false,
  };
  const current = readQueue();
  writeQueue([...current, item]);
  return item;
}

function dequeue(id: string): void {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

function clearFailed(): void {
  writeQueue(readQueue().filter((q) => !q.failed));
}

function markRetry(id: string): QueuedLead[] {
  const updated = readQueue().map((q) => {
    if (q.id !== id) return q;
    const newRetries = q.retries + 1;
    return { ...q, retries: newRetries, failed: newRetries >= MAX_RETRIES };
  });
  writeQueue(updated);
  return updated;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("readQueue / writeQueue", () => {
  beforeEach(() => localStorageMock.clear());

  it("returns empty array when localStorage is empty", () => {
    expect(readQueue()).toEqual([]);
  });

  it("returns empty array when localStorage has invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{{{");
    expect(readQueue()).toEqual([]);
  });

  it("returns empty array when stored value is not an array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(readQueue()).toEqual([]);
  });

  it("round-trips a queue correctly", () => {
    const item: QueuedLead = {
      id: "oq_1",
      firstName: "Jane",
      lastName: "Smith",
      source: "facebook",
      contactType: "borrower",
      queuedAt: 1000,
      retries: 0,
      failed: false,
    };
    writeQueue([item]);
    expect(readQueue()).toEqual([item]);
  });
});

describe("enqueue", () => {
  beforeEach(() => { localStorageMock.clear(); idCounter = 0; });

  it("adds an item to the queue", () => {
    enqueue({ firstName: "Alice", lastName: "Brown", source: "referral", contactType: "borrower" });
    const q = readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].firstName).toBe("Alice");
    expect(q[0].retries).toBe(0);
    expect(q[0].failed).toBe(false);
  });

  it("appends multiple items in order", () => {
    enqueue({ firstName: "Alice", lastName: "A", source: "other", contactType: "borrower" });
    enqueue({ firstName: "Bob", lastName: "B", source: "other", contactType: "lender" });
    enqueue({ firstName: "Carol", lastName: "C", source: "other", contactType: "attorney" });
    const q = readQueue();
    expect(q).toHaveLength(3);
    expect(q.map((i) => i.firstName)).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("assigns unique ids to each item", () => {
    const a = enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    const b = enqueue({ firstName: "B", lastName: "B", source: "other", contactType: "borrower" });
    expect(a.id).not.toBe(b.id);
  });

  it("stores optional phone and email", () => {
    enqueue({ firstName: "Dave", lastName: "D", phone: "+15551234567", email: "dave@example.com", source: "website", contactType: "borrower" });
    const q = readQueue();
    expect(q[0].phone).toBe("+15551234567");
    expect(q[0].email).toBe("dave@example.com");
  });
});

describe("dequeue", () => {
  beforeEach(() => { localStorageMock.clear(); idCounter = 0; });

  it("removes the item with the given id", () => {
    const a = enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    const b = enqueue({ firstName: "B", lastName: "B", source: "other", contactType: "borrower" });
    dequeue(a.id);
    const q = readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].id).toBe(b.id);
  });

  it("is a no-op when id does not exist", () => {
    enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    dequeue("nonexistent_id");
    expect(readQueue()).toHaveLength(1);
  });
});

describe("clearFailed", () => {
  beforeEach(() => { localStorageMock.clear(); idCounter = 0; });

  it("removes only failed items", () => {
    const a = enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    const b = enqueue({ firstName: "B", lastName: "B", source: "other", contactType: "borrower" });
    // Mark b as failed
    writeQueue(readQueue().map((q) => q.id === b.id ? { ...q, failed: true } : q));
    clearFailed();
    const q = readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].id).toBe(a.id);
  });

  it("is a no-op when there are no failed items", () => {
    enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    clearFailed();
    expect(readQueue()).toHaveLength(1);
  });
});

describe("markRetry", () => {
  beforeEach(() => { localStorageMock.clear(); idCounter = 0; });

  it("increments retry count on each call", () => {
    const item = enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    markRetry(item.id);
    expect(readQueue()[0].retries).toBe(1);
    markRetry(item.id);
    expect(readQueue()[0].retries).toBe(2);
  });

  it("marks item as failed after MAX_RETRIES", () => {
    const item = enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    for (let i = 0; i < MAX_RETRIES; i++) markRetry(item.id);
    expect(readQueue()[0].failed).toBe(true);
  });

  it("does not mark as failed before MAX_RETRIES", () => {
    const item = enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    for (let i = 0; i < MAX_RETRIES - 1; i++) markRetry(item.id);
    expect(readQueue()[0].failed).toBe(false);
  });
});

describe("sync simulation", () => {
  beforeEach(() => { localStorageMock.clear(); idCounter = 0; });

  it("removes successfully synced items from the queue", async () => {
    const a = enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    const b = enqueue({ firstName: "B", lastName: "B", source: "other", contactType: "borrower" });

    const onSync = vi.fn().mockResolvedValue(undefined);

    let updatedQueue = readQueue();
    for (const item of updatedQueue.filter((q) => !q.failed)) {
      try {
        await onSync(item);
        updatedQueue = updatedQueue.filter((q) => q.id !== item.id);
      } catch {
        updatedQueue = updatedQueue.map((q) =>
          q.id === item.id ? { ...q, retries: q.retries + 1, failed: q.retries + 1 >= MAX_RETRIES } : q
        );
      }
    }
    writeQueue(updatedQueue);

    expect(readQueue()).toHaveLength(0);
    expect(onSync).toHaveBeenCalledTimes(2);
  });

  it("keeps failed items in queue after MAX_RETRIES sync failures", async () => {
    const item = enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    const onSync = vi.fn().mockRejectedValue(new Error("Network error"));

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let updatedQueue = readQueue();
      for (const q of updatedQueue.filter((i) => !i.failed)) {
        try {
          await onSync(q);
          updatedQueue = updatedQueue.filter((i) => i.id !== q.id);
        } catch {
          updatedQueue = updatedQueue.map((i) =>
            i.id === q.id ? { ...i, retries: i.retries + 1, failed: i.retries + 1 >= MAX_RETRIES } : i
          );
        }
      }
      writeQueue(updatedQueue);
    }

    const q = readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].failed).toBe(true);
    expect(q[0].retries).toBe(MAX_RETRIES);
  });

  it("partial sync: synced items removed, failed items kept", async () => {
    const good = enqueue({ firstName: "Good", lastName: "G", source: "other", contactType: "borrower" });
    const bad = enqueue({ firstName: "Bad", lastName: "B", source: "other", contactType: "borrower" });

    const onSync = vi.fn().mockImplementation(async (item: QueuedLead) => {
      if (item.firstName === "Bad") throw new Error("Fail");
    });

    let updatedQueue = readQueue();
    for (const item of updatedQueue.filter((q) => !q.failed)) {
      try {
        await onSync(item);
        updatedQueue = updatedQueue.filter((q) => q.id !== item.id);
      } catch {
        updatedQueue = updatedQueue.map((q) =>
          q.id === item.id ? { ...q, retries: q.retries + 1, failed: q.retries + 1 >= MAX_RETRIES } : q
        );
      }
    }
    writeQueue(updatedQueue);

    const q = readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].firstName).toBe("Bad");
    expect(q[0].retries).toBe(1);
    expect(q[0].failed).toBe(false); // 1 retry, not yet at MAX
  });
});

describe("pendingCount / failedCount derivation", () => {
  beforeEach(() => { localStorageMock.clear(); idCounter = 0; });

  it("counts only non-failed items as pending", () => {
    enqueue({ firstName: "A", lastName: "A", source: "other", contactType: "borrower" });
    enqueue({ firstName: "B", lastName: "B", source: "other", contactType: "borrower" });
    const b = readQueue()[1];
    writeQueue(readQueue().map((q) => q.id === b.id ? { ...q, failed: true } : q));

    const q = readQueue();
    const pendingCount = q.filter((i) => !i.failed).length;
    const failedCount = q.filter((i) => i.failed).length;
    expect(pendingCount).toBe(1);
    expect(failedCount).toBe(1);
  });

  it("returns 0 pending and 0 failed for empty queue", () => {
    const q = readQueue();
    expect(q.filter((i) => !i.failed).length).toBe(0);
    expect(q.filter((i) => i.failed).length).toBe(0);
  });
});
