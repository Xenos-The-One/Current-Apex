/**
 * OfflineQueueBanner — shows a persistent banner when there are leads
 * waiting to sync from the offline queue.
 *
 * Renders:
 * - Nothing when queue is empty and online
 * - Amber "offline" strip when the device has no connectivity
 * - Blue "pending sync" strip when online but queue has items
 * - Green "synced!" flash after a successful sync
 * - Red "sync failed" strip when some items exceeded MAX_RETRIES
 *
 * Designed to sit just below the OfflineBanner (which handles the raw
 * connectivity indicator) and above the main content area.
 */
import { useCallback } from "react";
import { CloudUpload, AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useOfflineLeadQueue } from "@/hooks/useOfflineLeadQueue";

export function OfflineQueueBanner() {
  const utils = trpc.useUtils();
  const createMut = trpc.crm.createLead.useMutation({
    onSuccess: () => {
      utils.crm.listMyLeads.invalidate();
    },
  });

  const { pendingCount, failedCount, syncStatus, lastSyncedAt, syncNow, clearFailed } =
    useOfflineLeadQueue({
      onSync: useCallback(
        async (lead) => {
          await createMut.mutateAsync({
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone || undefined,
            email: lead.email || undefined,
            source: lead.source,
            contactType: lead.contactType as any,
          });
          utils.crm.listMyLeads.invalidate();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
      ),
    });

  const isOnline = typeof navigator !== "undefined" && navigator.onLine;
  const isSyncing = syncStatus === "syncing";
  const justSynced = syncStatus === "success";

  // Nothing to show
  if (pendingCount === 0 && failedCount === 0 && !justSynced) return null;

  // ── Just synced flash ──────────────────────────────────────────────────────
  if (justSynced && pendingCount === 0 && failedCount === 0) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-emerald-500/15 text-emerald-600 border-b border-emerald-500/20 transition-all">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>
          All queued leads synced successfully
          {lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString()}` : ""}
        </span>
      </div>
    );
  }

  // ── Failed items ───────────────────────────────────────────────────────────
  if (failedCount > 0) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs font-medium bg-red-500/10 text-red-600 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {failedCount} lead{failedCount !== 1 ? "s" : ""} failed to sync after multiple attempts.
            {pendingCount > 0 ? ` ${pendingCount} still pending.` : ""}
          </span>
        </div>
        <button
          onClick={clearFailed}
          className="flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline"
          title="Dismiss failed items"
        >
          <X className="w-3.5 h-3.5" /> Dismiss
        </button>
      </div>
    );
  }

  // ── Pending items (online) ─────────────────────────────────────────────────
  if (pendingCount > 0 && isOnline) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs font-medium bg-blue-500/10 text-blue-600 border-b border-blue-500/20">
        <div className="flex items-center gap-2">
          <CloudUpload className={cn("w-3.5 h-3.5 shrink-0", isSyncing && "animate-pulse")} />
          <span>
            {isSyncing
              ? `Syncing ${pendingCount} queued lead${pendingCount !== 1 ? "s" : ""}…`
              : `${pendingCount} lead${pendingCount !== 1 ? "s" : ""} saved offline — ready to sync`}
          </span>
        </div>
        {!isSyncing && (
          <button
            onClick={syncNow}
            className="flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline"
          >
            <RefreshCw className="w-3 h-3" /> Sync now
          </button>
        )}
      </div>
    );
  }

  // ── Pending items (offline) ────────────────────────────────────────────────
  if (pendingCount > 0 && !isOnline) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-amber-500/10 text-amber-600 border-b border-amber-500/20">
        <CloudUpload className="w-3.5 h-3.5 shrink-0" />
        <span>
          {pendingCount} lead{pendingCount !== 1 ? "s" : ""} queued — will sync when back online
        </span>
      </div>
    );
  }

  return null;
}
