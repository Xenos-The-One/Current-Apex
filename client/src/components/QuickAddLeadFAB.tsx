/**
 * QuickAddLeadFAB — Floating Action Button for quick lead entry on mobile.
 * Renders only on mobile screens (< 768px).
 * Opens a bottom sheet with a minimal 4-field lead form.
 * Positioned above the mobile bottom nav (if present).
 */
import { useState } from "react";
import { Plus, X, User, Phone, Mail, Tag } from "lucide-react";
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

interface QuickAddLeadFABProps {
  /** Whether the mobile bottom nav is visible (shifts FAB up) */
  hasBottomNav?: boolean;
}

export function QuickAddLeadFAB({ hasBottomNav = false }: QuickAddLeadFABProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    source: "other",
    contactType: "borrower" as const,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = trpc.useUtils();
  const createMut = trpc.crm.createLead.useMutation({
    onSuccess: () => {
      toast.success("Lead added!", { description: `${form.firstName} ${form.lastName} has been added to your contacts.` });
      utils.crm.listMyLeads.invalidate();
      setOpen(false);
      setForm({ firstName: "", lastName: "", phone: "", email: "", source: "other", contactType: "borrower" });
      setIsSubmitting(false);
    },
    onError: (e) => {
      toast.error("Failed to add lead", { description: e.message });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (!form.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!form.lastName.trim()) {
      toast.error("Last name is required");
      return;
    }
    setIsSubmitting(true);
    createMut.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      source: form.source,
      contactType: form.contactType as any,
    });
  };

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (!isMobile) return null;

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Add new lead"
        className={cn(
          "fixed right-4 z-40 w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center",
          "active:scale-95 transition-transform",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          hasBottomNav ? "bottom-[calc(4rem+env(safe-area-inset-bottom)+12px)]" : "bottom-[calc(env(safe-area-inset-bottom)+20px)]"
        )}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Quick-add bottom sheet */}
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Quick Add Lead"
        maxHeightPct={92}
      >
        <div className="px-4 py-4 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fab-first" className="text-xs font-medium">
                First Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="fab-first"
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  className="pl-8 h-10 text-sm"
                  autoComplete="given-name"
                />
              </div>
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
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="fab-phone"
                type="tel"
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="pl-8 h-10 text-sm"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="fab-email" className="text-xs font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="fab-email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="pl-8 h-10 text-sm"
                autoComplete="email"
                inputMode="email"
              />
            </div>
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
              <Label className="text-xs font-medium flex items-center gap-1">
                <Tag className="w-3 h-3" /> Type
              </Label>
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
                Adding…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Lead
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
