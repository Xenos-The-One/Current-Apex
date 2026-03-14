/**
 * QuickAddLeadFAB — Floating Action Button for quick lead entry on mobile.
 *
 * Offline-first: when the device is offline, the lead is stored in
 * localStorage via useOfflineLeadQueue and synced automatically when
 * connectivity is restored.
 *
 * Features:
 * - Pending badge on FAB showing number of queued (unsynced) leads
 * - Offline submit path: saves to queue, shows "Saved offline" toast
 * - Online submit path: sends directly to server, falls back to queue on error
 * - Auto-sync on reconnect (handled by the hook)
 * - Haptic feedback on FAB tap and form actions
 */
import { useState, useCallback } from "react";
import { Plus, WifiOff, CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BottomSheet } from "./BottomSheet";
import { useOfflineLeadQueue } from "@/hooks/useOfflineLeadQueue";

const SOURCES = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "cold_call", label: "Cold Call" },
  { value: "other", label: "Other" },
];

const CONTACT_TYPES = [
  { value: "borrower", label: "Borrower" },
  { value: "real_estate_agent", label: "RE Agent" },
  { value: "attorney", label: "Attorney" },
  { value: "insurance_agent", label: "Insurance" },
  { value: "title_company", label: "Title Co." },
  { value: "builder_developer", label: "Builder" },
  { value: "lender", label: "Lender" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  source: "other",
  contactType: "borrower" as const,
};

interface QuickAddLeadFABProps {
  /** Whether the mobile bottom nav is visible (shifts FAB up) */
  hasBottomNav?: boolean;
}

export function QuickAddLeadFAB({ hasBottomNav = false }: QuickAddLeadFABProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = trpc.useUtils();

  // ── tRPC mutation ──────────────────────────────────────────────────────────
  const createMut = trpc.crm.createLead.useMutation({
    onSuccess: () => {
      utils.crm.listMyLeads.invalidate();
    },
  });

  // ── Offline queue ──────────────────────────────────────────────────────────
  const { pendingCount, syncStatus, enqueue, syncNow } = useOfflineLeadQueue({
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

  // ── Haptic ─────────────────────────────────────────────────────────────────
  function haptic(ms = 10) {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
  }

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.firstName.trim()) {
      haptic(20);
      toast.error("First name is required");
      return;
    }
    if (!form.lastName.trim()) {
      haptic(20);
      toast.error("Last name is required");
      return;
    }

    haptic(8);
    setIsSubmitting(true);

    const leadData = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      source: form.source,
      contactType: form.contactType,
    };

    const isOnline = typeof navigator !== "undefined" && navigator.onLine;

    if (!isOnline) {
      // ── Offline path: save to queue ──────────────────────────────────────
      enqueue(leadData);
      haptic(15);
      toast.success("Lead saved offline", {
        description: `${leadData.firstName} ${leadData.lastName} will sync when you're back online.`,
        icon: <WifiOff className="w-4 h-4" />,
      });
      setOpen(false);
      setForm({ ...EMPTY_FORM });
      setIsSubmitting(false);
      return;
    }

    // ── Online path: send directly ─────────────────────────────────────────
    try {
      await createMut.mutateAsync({
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        phone: leadData.phone,
        email: leadData.email,
        source: leadData.source,
        contactType: leadData.contactType as any,
      });
      utils.crm.listMyLeads.invalidate();
      toast.success("Lead added!", {
        description: `${leadData.firstName} ${leadData.lastName} has been added to your contacts.`,
      });
      setOpen(false);
      setForm({ ...EMPTY_FORM });
    } catch (err: any) {
      // Network failure mid-request: fall back to offline queue
      if (!navigator.onLine || err?.message?.includes("fetch")) {
        enqueue(leadData);
        haptic(15);
        toast.warning("Saved to offline queue", {
          description: "Connection lost — lead will sync automatically when you're back online.",
        });
        setOpen(false);
        setForm({ ...EMPTY_FORM });
      } else {
        haptic(20);
        toast.error("Failed to add lead", { description: err?.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (!isMobile) return null;

  const isSyncing = syncStatus === "syncing";

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => { haptic(12); setOpen(true); }}
        aria-label={pendingCount > 0 ? `Add new lead (${pendingCount} pending sync)` : "Add new lead"}
        className={cn(
          "fixed right-4 z-40 w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center",
          "active:scale-95 transition-transform",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          hasBottomNav
            ? "bottom-[calc(4rem+env(safe-area-inset-bottom)+12px)]"
            : "bottom-[calc(env(safe-area-inset-bottom)+20px)]"
        )}
      >
        {isSyncing ? (
          <CloudUpload className="w-6 h-6 animate-pulse" />
        ) : (
          <Plus className="w-6 h-6" />
        )}

        {/* Pending badge */}
        {pendingCount > 0 && !isSyncing && (
          <span
            className={cn(
              "absolute -top-1 -right-1 min-w-[20px] h-5 px-1",
              "rounded-full bg-amber-500 text-white text-[10px] font-bold",
              "flex items-center justify-center",
              "border-2 border-background",
              "shadow-sm"
            )}
            aria-label={`${pendingCount} leads pending sync`}
          >
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {/* Quick-add bottom sheet */}
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Quick Add Lead"
        maxHeightPct={92}
      >
        <div className="px-4 py-4 space-y-4">
          {/* Offline notice */}
          {typeof navigator !== "undefined" && !navigator.onLine && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              <span>You're offline — this lead will be saved locally and synced when you reconnect.</span>
            </div>
          )}

          {/* Pending queue notice */}
          {pendingCount > 0 && typeof navigator !== "undefined" && navigator.onLine && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">
              <div className="flex items-center gap-2">
                <CloudUpload className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{pendingCount} lead{pendingCount !== 1 ? "s" : ""} waiting to sync</span>
              </div>
              <button
                onClick={() => { syncNow(); haptic(8); }}
                disabled={isSyncing}
                className="font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50"
              >
                {isSyncing ? "Syncing…" : "Sync now"}
              </button>
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fab-first" className="text-xs font-medium">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fab-first"
                placeholder="Jane"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="h-10 text-sm"
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fab-last" className="text-xs font-medium">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fab-last"
                placeholder="Smith"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className="h-10 text-sm"
                autoComplete="family-name"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="fab-phone" className="text-xs font-medium">Phone</Label>
            <Input
              id="fab-phone"
              type="tel"
              placeholder="(555) 000-0000"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="h-10 text-sm"
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="fab-email" className="text-xs font-medium">Email</Label>
            <Input
              id="fab-email"
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="h-10 text-sm"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          {/* Source + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Source</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type</Label>
              <Select value={form.contactType} onValueChange={(v) => set("contactType", v)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full h-11 text-sm font-medium mt-2"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {typeof navigator !== "undefined" && !navigator.onLine ? "Saving offline…" : "Adding…"}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {typeof navigator !== "undefined" && !navigator.onLine
                  ? <><WifiOff className="w-4 h-4" /> Save Offline</>
                  : <><Plus className="w-4 h-4" /> Add Lead</>
                }
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground pb-2">
            You can add more details from the contact profile.
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
