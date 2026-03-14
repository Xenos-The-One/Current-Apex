/**
 * useOfflineLeadQueue — Offline queue for quick-add lead submissions.
 *
 * When the device is offline, lead form submissions are stored in localStorage
 * under the key `offline_lead_queue`. When connectivity is restored, the hook
 * automatically attempts to sync all queued leads to the server.
 *
 * Shape of each queued item:
 *   { id, firstName, lastName, phone?, email?, source, contactType, queuedAt }
 *
 * Sync strategy:
 *   - On mount: attempt sync if online and queue is non-empty
 *   - On `window.online` event: attempt sync
 *   - Manual: call `syncNow()` at any time
 *   - Each item is retried up to MAX_RETRIES times before being marked failed
 *   - Failed items remain in the queue with `failed: true` so the user can see them
 */
import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "offline_lead_queue";
const MAX_RETRIES = 3;

export type QueuedLead = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  source: string;
  contactType: string;
  queuedAt: number; // Unix ms
  retries: number;
  failed: boolean;
};

export type SyncStatus = "idle" | "syncing" | "success" | "error";

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage may be full or unavailable (private browsing)
    console.warn("[OfflineQueue] Failed to write to localStorage");
  }
}

function generateId(): string {
  return `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export type UseOfflineLeadQueueOptions = {
  /**
   * The actual tRPC mutation function to call when syncing.
   * Receives one queued lead at a time and must return a Promise.
   */
  onSync: (lead: Omit<QueuedLead, "id" | "queuedAt" | "retries" | "failed">) => Promise<void>;
};

export function useOfflineLeadQueue({ onSync }: UseOfflineLeadQueueOptions) {
  const [queue, setQueue] = useState<QueuedLead[]>(() => readQueue());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const isSyncingRef = useRef(false);

  // Derived counts
  const pendingCount = queue.filter((q) => !q.failed).length;
  const failedCount = queue.filter((q) => q.failed).length;

  /** Persist queue to localStorage and update state */
  const persistQueue = useCallback((updated: QueuedLead[]) => {
    writeQueue(updated);
    setQueue(updated);
  }, []);

  /**
   * Enqueue a lead for later sync (called when offline or as fallback).
   * Returns the generated queue item id.
   */
  const enqueue = useCallback(
    (lead: Omit<QueuedLead, "id" | "queuedAt" | "retries" | "failed">): string => {
      const item: QueuedLead = {
        ...lead,
        id: generateId(),
        queuedAt: Date.now(),
        retries: 0,
        failed: false,
      };
      const current = readQueue();
      const updated = [...current, item];
      persistQueue(updated);
      return item.id;
    },
    [persistQueue]
  );

  /** Remove a specific item from the queue by id */
  const dequeue = useCallback(
    (id: string) => {
      const current = readQueue();
      persistQueue(current.filter((q) => q.id !== id));
    },
    [persistQueue]
  );

  /** Clear all failed items from the queue */
  const clearFailed = useCallback(() => {
    const current = readQueue();
    persistQueue(current.filter((q) => !q.failed));
  }, [persistQueue]);

  /** Clear the entire queue (use with caution) */
  const clearAll = useCallback(() => {
    persistQueue([]);
  }, [persistQueue]);

  /**
   * Attempt to sync all pending (non-failed) items.
   * Items that succeed are removed from the queue.
   * Items that fail increment their retry count; after MAX_RETRIES they are
   * marked as `failed: true` so the user can see them.
   */
  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;
    const current = readQueue();
    const pending = current.filter((q) => !q.failed);
    if (pending.length === 0) return;

    isSyncingRef.current = true;
    setSyncStatus("syncing");

    let anyError = false;
    let updatedQueue = [...current];

    for (const item of pending) {
      try {
        await onSync({
          firstName: item.firstName,
          lastName: item.lastName,
          phone: item.phone,
          email: item.email,
          source: item.source,
          contactType: item.contactType,
        });
        // Success: remove from queue
        updatedQueue = updatedQueue.filter((q) => q.id !== item.id);
      } catch {
        anyError = true;
        // Increment retry count; mark failed after MAX_RETRIES
        updatedQueue = updatedQueue.map((q) => {
          if (q.id !== item.id) return q;
          const newRetries = q.retries + 1;
          return { ...q, retries: newRetries, failed: newRetries >= MAX_RETRIES };
        });
      }
    }

    persistQueue(updatedQueue);
    setLastSyncedAt(Date.now());
    setSyncStatus(anyError ? "error" : "success");
    isSyncingRef.current = false;

    // Reset status to idle after a short delay
    setTimeout(() => setSyncStatus("idle"), 4000);
  }, [onSync, persistQueue]);

  // Auto-sync on mount if online and queue is non-empty
  useEffect(() => {
    if (navigator.onLine && readQueue().filter((q) => !q.failed).length > 0) {
      syncNow();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-sync when connectivity is restored
  useEffect(() => {
    const handleOnline = () => {
      const current = readQueue();
      if (current.filter((q) => !q.failed).length > 0) {
        syncNow();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncNow]);

  return {
    queue,
    pendingCount,
    failedCount,
    syncStatus,
    lastSyncedAt,
    enqueue,
    dequeue,
    clearFailed,
    clearAll,
    syncNow,
  };
}
