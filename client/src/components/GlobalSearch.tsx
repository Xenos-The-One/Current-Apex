import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Handshake,
  CalendarClock,
  Phone,
  Mail,
  Building2,
  UserCircle,
  Search,
} from "lucide-react";

// ─── Status badge colors ─────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700",
  appointment_set: "bg-orange-100 text-orange-700",
  appointment_completed: "bg-green-100 text-green-700",
  closed_won: "bg-emerald-100 text-emerald-700",
  closed_lost: "bg-red-100 text-red-700",
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-700",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatPartnerType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Component ───────────────────────────────────────────────────────────────
interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  const { data, isLoading } = trpc.crm.globalSearch.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.trim().length >= 2,
      staleTime: 10_000,
    }
  );

  const navigate = useCallback((path: string) => {
    onOpenChange(false);
    setLocation(path);
  }, [onOpenChange, setLocation]);

  const hasResults = data && data.total > 0;
  const noResults = debouncedQuery.length >= 2 && !isLoading && data?.total === 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search leads, partners, appointments..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Loading state */}
        {isLoading && debouncedQuery.length >= 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        )}

        {/* Empty state */}
        {noResults && (
          <CommandEmpty>No results found for &ldquo;{debouncedQuery}&rdquo;</CommandEmpty>
        )}

        {/* Prompt when query is too short */}
        {debouncedQuery.length < 2 && query.length < 2 && (
          <div className="py-8 text-center">
            <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Type at least 2 characters to search
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Searches leads, referral partners, and appointments
            </p>
          </div>
        )}

        {/* Leads results */}
        {hasResults && data.leads.length > 0 && (
          <>
            <CommandGroup heading={`Leads (${data.leads.length})`}>
              {data.leads.map(lead => (
                <CommandItem
                  key={`lead-${lead.id}`}
                  value={`lead-${lead.id}-${lead.firstName}-${lead.lastName}`}
                  onSelect={() => navigate(`/leads/${lead.id}`)}
                  className="flex items-center gap-3 py-2.5 cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 shrink-0">
                    <UserCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {lead.firstName} {lead.lastName}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_COLORS[lead.status] ?? ""}`}
                      >
                        {formatStatus(lead.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                    </div>
                  </div>
                  {lead.contactType && lead.contactType !== "borrower" && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatPartnerType(lead.contactType)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {(data.partners.length > 0 || data.appointments.length > 0) && (
              <CommandSeparator />
            )}
          </>
        )}

        {/* Referral Partners results */}
        {hasResults && data.partners.length > 0 && (
          <>
            <CommandGroup heading={`Referral Partners (${data.partners.length})`}>
              {data.partners.map(partner => (
                <CommandItem
                  key={`partner-${partner.id}`}
                  value={`partner-${partner.id}-${partner.firstName}-${partner.lastName}`}
                  onSelect={() => navigate(`/referral-partners/${partner.id}`)}
                  className="flex items-center gap-3 py-2.5 cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 shrink-0">
                    <Handshake className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {partner.firstName} {partner.lastName}
                      </span>
                      {partner.partnerType && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {formatPartnerType(partner.partnerType)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {partner.company && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {partner.company}
                        </span>
                      )}
                      {partner.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {partner.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {data.appointments.length > 0 && <CommandSeparator />}
          </>
        )}

        {/* Appointments results */}
        {hasResults && data.appointments.length > 0 && (
          <CommandGroup heading={`Appointments (${data.appointments.length})`}>
            {data.appointments.map(appt => (
              <CommandItem
                key={`appt-${appt.id}`}
                value={`appt-${appt.id}-${appt.firstName}-${appt.lastName}`}
                onSelect={() => navigate(`/appointments`)}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 shrink-0">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {appt.firstName} {appt.lastName}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_COLORS[appt.status] ?? ""}`}
                    >
                      {formatStatus(appt.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {new Date(appt.appointmentDate).toLocaleDateString()} at{" "}
                      {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {appt.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <Mail className="h-3 w-3" />
                        {appt.email}
                      </span>
                    )}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer hint */}
      <div className="border-t px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Press <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">↵</kbd> to navigate</span>
        <span>Press <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">Esc</kbd> to close</span>
      </div>
    </CommandDialog>
  );
}

// ─── Hook for keyboard shortcut ───────────────────────────────────────────────
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
