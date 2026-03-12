/**
 * ContactsPage — GHL-inspired full-featured contacts management page.
 * Features: smart lists, advanced filters, bulk actions, add/edit drawer,
 * CSV import, manage fields, sort, search, pagination, tags.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import SuggestedFollowUpsPanel from "@/components/SuggestedFollowUpsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Search, Plus, Upload, MoreHorizontal, Filter, SlidersHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Tag, Trash2, UserCheck, Download, Mail, MessageSquare,
  ChevronUp, ChevronDown, ChevronsUpDown, X, Check, Pencil,
  Phone, Building2, Calendar, Clock, Star, Settings2, ListFilter,
  Loader2, AlertCircle, Users, FileText
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Lead = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status: string;
  contactType?: string | null;
  tags?: string | null;
  notes?: string | null;
  score?: number | null;
  createdAt: Date;
  updatedAt: Date;
  lastContactDate?: Date | null;
};

type SortField = "firstName" | "email" | "phone" | "company" | "status" | "createdAt" | "lastContactDate";
type SortDir = "asc" | "desc";

type FilterSet = {
  search?: string;
  tag?: string;
  status?: string;
  contactType?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
};

type SmartList = { id: number; name: string; filters: string; createdAt: Date };

const STATUS_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified",
  appointment_set: "Appt Set", appointment_completed: "Appt Done",
  closed_won: "Won", closed_lost: "Lost",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700", contacted: "bg-purple-100 text-purple-700",
  qualified: "bg-amber-100 text-amber-700", appointment_set: "bg-teal-100 text-teal-700",
  appointment_completed: "bg-green-100 text-green-700",
  closed_won: "bg-emerald-100 text-emerald-700", closed_lost: "bg-red-100 text-red-600",
};
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function timeAgo(date?: Date | null): string {
  if (!date) return "No activity";
  const d = date instanceof Date ? date : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function fullName(lead: Lead) {
  return `${lead.firstName} ${lead.lastName || ""}`.trim();
}

function initials(lead: Lead) {
  return `${lead.firstName?.[0] || ""}${lead.lastName?.[0] || ""}`.toUpperCase() || "?";
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-teal-500", "bg-amber-500",
  "bg-rose-500", "bg-indigo-500", "bg-emerald-500", "bg-orange-500",
];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
}

function TagPill({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-red-500 transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// ─── Add/Edit Contact Drawer ──────────────────────────────────────────────────
function ContactDrawer({
  open, onClose, lead, onSaved
}: {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!lead;
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    company: "", source: "", notes: "", contactType: "borrower",
    tags: [] as string[], newTag: "",
  });

  useEffect(() => {
    if (lead) {
      setForm({
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        source: lead.source || "",
        notes: lead.notes || "",
        contactType: lead.contactType || "borrower",
        tags: parseTags(lead.tags),
        newTag: "",
      });
    } else {
      setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", source: "", notes: "", contactType: "borrower", tags: [], newTag: "" });
    }
  }, [lead, open]);

  const createMut = trpc.crm.createLead.useMutation({
    onSuccess: () => { toast.success("Contact added"); utils.crm.listMyLeads.invalidate(); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.crm.updateLead.useMutation({
    onSuccess: () => { toast.success("Contact updated"); utils.crm.listMyLeads.invalidate(); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.firstName.trim()) { toast.error("First name is required"); return; }
    if (isEdit && lead) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { company, newTag, ...rest } = form;
      updateMut.mutate({ leadId: lead.id, ...rest, businessName: company, tags: form.tags });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { company, newTag, ...rest } = form;
      createMut.mutate({ ...rest, businessName: company, contactType: form.contactType as any });
    }
  };

  const addTag = () => {
    const t = form.newTag.trim();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    set("newTag", "");
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? "Edit Contact" : "Add Contact"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">First Name *</Label>
              <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="John" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Last Name</Label>
              <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Smith" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Email</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="john@example.com" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Phone</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Business Name</Label>
            <Input value={form.company} onChange={e => set("company", e.target.value)} placeholder="Acme Corp" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Contact Type</Label>
            <Select value={form.contactType} onValueChange={v => set("contactType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Source</Label>
            <Input value={form.source} onChange={e => set("source", e.target.value)} placeholder="Facebook, Referral, etc." />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Tags</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(tag => (
                <TagPill key={tag} tag={tag} onRemove={() => set("tags", form.tags.filter(t => t !== tag))} />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={form.newTag}
                onChange={e => set("newTag", e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add tag..."
                className="text-sm"
              />
              <Button variant="outline" size="sm" onClick={addTag} type="button">Add</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any notes about this contact..." rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Save Changes" : "Add Contact"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Advanced Filters Panel ───────────────────────────────────────────────────
function AdvancedFiltersPanel({
  open, onClose, filters, onChange, tags, onSaveSmartList
}: {
  open: boolean;
  onClose: () => void;
  filters: FilterSet;
  onChange: (f: FilterSet) => void;
  tags: string[];
  onSaveSmartList: (name: string, filters: FilterSet) => void;
}) {
  const [local, setLocal] = useState<FilterSet>(filters);
  const [smartListName, setSmartListName] = useState("");
  const [showSave, setShowSave] = useState(false);

  useEffect(() => { setLocal(filters); }, [filters, open]);

  const set = (k: keyof FilterSet, v: any) => setLocal(f => ({ ...f, [k]: v }));
  const clear = () => setLocal({});

  const activeCount = Object.values(local).filter(v => v !== undefined && v !== "" && v !== null).length;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Advanced Filters
            {activeCount > 0 && <Badge variant="secondary" className="text-xs">{activeCount} active</Badge>}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-5">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
            <Select value={local.status || ""} onValueChange={v => set("status", v || undefined)}>
              <SelectTrigger><SelectValue placeholder="Any status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Contact Type</Label>
            <Select value={local.contactType || ""} onValueChange={v => set("contactType", v || undefined)}>
              <SelectTrigger><SelectValue placeholder="Any type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any type</SelectItem>
                {CONTACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Tag</Label>
            <Select value={local.tag || ""} onValueChange={v => set("tag", v || undefined)}>
              <SelectTrigger><SelectValue placeholder="Any tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any tag</SelectItem>
                {tags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Contact Info</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasEmail"
                  checked={local.hasEmail === true}
                  onCheckedChange={v => set("hasEmail", v ? true : undefined)}
                />
                <label htmlFor="hasEmail" className="text-sm cursor-pointer">Has email</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="noEmail"
                  checked={local.hasEmail === false}
                  onCheckedChange={v => set("hasEmail", v ? false : undefined)}
                />
                <label htmlFor="noEmail" className="text-sm cursor-pointer">No email</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasPhone"
                  checked={local.hasPhone === true}
                  onCheckedChange={v => set("hasPhone", v ? true : undefined)}
                />
                <label htmlFor="hasPhone" className="text-sm cursor-pointer">Has phone</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="noPhone"
                  checked={local.hasPhone === false}
                  onCheckedChange={v => set("hasPhone", v ? false : undefined)}
                />
                <label htmlFor="noPhone" className="text-sm cursor-pointer">No phone</label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => { onChange(local); onClose(); }}>Apply Filters</Button>
            <Button variant="outline" onClick={clear}>Clear</Button>
          </div>

          <div className="border-t pt-4">
            {!showSave ? (
              <Button variant="ghost" size="sm" className="w-full text-primary" onClick={() => setShowSave(true)}>
                <Star className="w-4 h-4 mr-2" /> Save as Smart List
              </Button>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Smart List Name</Label>
                <Input value={smartListName} onChange={e => setSmartListName(e.target.value)} placeholder="e.g. Hot Leads" />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => {
                    if (!smartListName.trim()) { toast.error("Enter a name"); return; }
                    onSaveSmartList(smartListName.trim(), local);
                    setShowSave(false);
                    setSmartListName("");
                    onChange(local);
                    onClose();
                  }}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowSave(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── CSV Import Dialog ────────────────────────────────────────────────────────
function ImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const createLead = trpc.crm.createLead.useMutation();

  const FIELDS = ["firstName", "lastName", "email", "phone", "company", "source", "notes", "tags"];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { toast.error("CSV must have at least a header row and one data row"); return; }
      const hdrs = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      setHeaders(hdrs);
      const dataRows = lines.slice(1, 51).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj: Record<string, string> = {};
        hdrs.forEach((h, i) => { obj[h] = vals[i] || ""; });
        return obj;
      });
      setRows(dataRows);
      // Auto-map common header names
      const autoMap: Record<string, string> = {};
      hdrs.forEach(h => {
        const lower = h.toLowerCase().replace(/[\s_-]/g, "");
        if (lower.includes("first")) autoMap[h] = "firstName";
        else if (lower.includes("last")) autoMap[h] = "lastName";
        else if (lower.includes("email")) autoMap[h] = "email";
        else if (lower.includes("phone") || lower.includes("mobile")) autoMap[h] = "phone";
        else if (lower.includes("company") || lower.includes("business")) autoMap[h] = "company";
        else if (lower.includes("source")) autoMap[h] = "source";
        else if (lower.includes("note")) autoMap[h] = "notes";
        else if (lower.includes("tag")) autoMap[h] = "tags";
      });
      setMapping(autoMap);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0, fail = 0;
    const allLines = rows;
    for (const row of allLines) {
      const data: any = {};
      Object.entries(mapping).forEach(([header, field]) => {
        if (field && row[header]) data[field] = row[header];
      });
      if (!data.firstName) {
        // Try to split a full name
        const name = Object.values(row)[0] as string || "";
        const parts = name.split(" ");
        data.firstName = parts[0] || "Unknown";
        data.lastName = parts.slice(1).join(" ") || "";
      }
      try {
        await createLead.mutateAsync({ ...data });
        success++;
      } catch { fail++; }
    }
    setImporting(false);
    setStep("done");
    utils.crm.listMyLeads.invalidate();
    toast.success(`Imported ${success} contacts${fail > 0 ? `, ${fail} failed` : ""}`);
    onImported();
  };

  const reset = () => { setStep("upload"); setRows([]); setHeaders([]); setMapping({}); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import Contacts
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Click to upload a CSV file</p>
              <p className="text-xs text-muted-foreground">Supports: first name, last name, email, phone, company, tags</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Map your CSV columns to contact fields. Preview shows first 5 rows.</p>
            <div className="space-y-2">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded text-xs w-40 truncate">{h}</span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <Select value={mapping[h] || ""} onValueChange={v => setMapping(m => ({ ...m, [h]: v }))}>
                    <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Skip" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Skip</SelectItem>
                      {FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="border rounded-lg overflow-auto max-h-40">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>{headers.map(h => <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {headers.map(h => <td key={h} className="px-2 py-1.5 truncate max-w-24">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">{rows.length} rows found (showing first 5 preview)</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="font-semibold text-lg mb-1">Import Complete</p>
            <p className="text-sm text-muted-foreground">Your contacts have been added to the CRM.</p>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {rows.length} Contacts
              </Button>
            </>
          )}
          {step === "done" && <Button onClick={() => { reset(); onClose(); }}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Fields Dialog ─────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: "name", label: "Contact Name", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "company", label: "Business Name" },
  { key: "status", label: "Status" },
  { key: "contactType", label: "Type" },
  { key: "createdAt", label: "Created" },
  { key: "lastActivity", label: "Last Activity" },
  { key: "tags", label: "Tags" },
  { key: "source", label: "Source" },
  { key: "score", label: "Score" },
];

function ManageFieldsDialog({
  open, onClose, visible, onChange
}: {
  open: boolean;
  onClose: () => void;
  visible: string[];
  onChange: (cols: string[]) => void;
}) {
  const [local, setLocal] = useState(visible);
  useEffect(() => setLocal(visible), [visible, open]);

  const toggle = (key: string) => {
    setLocal(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Manage Fields</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          {ALL_COLUMNS.map(col => (
            <div key={col.key} className="flex items-center gap-3">
              <Checkbox
                id={`col-${col.key}`}
                checked={local.includes(col.key)}
                disabled={col.required}
                onCheckedChange={() => !col.required && toggle(col.key)}
              />
              <label htmlFor={`col-${col.key}`} className={`text-sm ${col.required ? "text-muted-foreground" : "cursor-pointer"}`}>
                {col.label} {col.required && <span className="text-xs text-muted-foreground">(required)</span>}
              </label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onChange(local); onClose(); }}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [, navigate] = useLocation();
  // ── State ──
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<FilterSet>({});
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activeSmartList, setActiveSmartList] = useState<SmartList | null>(null);

  // Drawers/Dialogs
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showManageFields, setShowManageFields] = useState(false);
  const [showSmartListRename, setShowSmartListRename] = useState<SmartList | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // Bulk action dialogs
  const [showBulkSms, setShowBulkSms] = useState(false);
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [bulkSmsText, setBulkSmsText] = useState("");
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailBody, setBulkEmailBody] = useState("");

  // Visible columns
  const [visibleCols, setVisibleCols] = useState<string[]>(
    ["name", "phone", "email", "company", "status", "createdAt", "lastActivity", "tags"]
  );

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filters, activeSmartList]);

  // ── Data ──
  const activeFilters = activeSmartList
    ? (() => { try { return JSON.parse(activeSmartList.filters) as FilterSet; } catch { return filters; } })()
    : filters;

  const { data, isLoading, refetch } = trpc.crm.listMyLeads.useQuery({
    page,
    limit,
    search: debouncedSearch || activeFilters.search || undefined,
    tag: activeFilters.tag || undefined,
    status: activeFilters.status as any || undefined,
  }, { keepPreviousData: true } as any);

  const { data: allTags = [] } = trpc.crm.getMyLeadTags.useQuery();
  const { data: smartLists = [], refetch: refetchSmartLists } = trpc.crm.getSmartLists.useQuery();

  const utils = trpc.useUtils();

  // ── Mutations ──
  const bulkSmsMut = trpc.crm.bulkSendSMS.useMutation({
    onSuccess: (r: any) => { toast.success(`SMS sent to ${r.sent ?? selected.size} contacts`); setShowBulkSms(false); setBulkSmsText(""); setSelected(new Set()); },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkEmailMut = trpc.crm.bulkSendEmail.useMutation({
    onSuccess: (r: any) => { toast.success(`Email sent to ${r.sent ?? selected.size} contacts`); setShowBulkEmail(false); setBulkEmailSubject(""); setBulkEmailBody(""); setSelected(new Set()); },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkStatusMut = trpc.crm.bulkUpdateLeadStatus.useMutation({
    onSuccess: (r) => { toast.success(`Updated ${r.updated} contacts`); utils.crm.listMyLeads.invalidate(); setSelected(new Set()); },
    onError: (e) => toast.error(e.message),
  });
  const bulkDeleteMut = trpc.crm.bulkDeleteLeads.useMutation({
    onSuccess: (r) => { toast.success(`Deleted ${r.deleted} contacts`); utils.crm.listMyLeads.invalidate(); setSelected(new Set()); },
    onError: (e) => toast.error(e.message),
  });
  const bulkAddTagMut = trpc.crm.bulkAddTag.useMutation({
    onSuccess: () => { toast.success("Tag added"); utils.crm.listMyLeads.invalidate(); setSelected(new Set()); },
    onError: (e) => toast.error(e.message),
  });
  const createSmartListMut = trpc.crm.createSmartList.useMutation({
    onSuccess: () => { toast.success("Smart list saved"); refetchSmartLists(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSmartListMut = trpc.crm.deleteSmartList.useMutation({
    onSuccess: () => { toast.success("Smart list deleted"); refetchSmartLists(); setActiveSmartList(null); },
  });
  const updateSmartListMut = trpc.crm.updateSmartList.useMutation({
    onSuccess: () => { toast.success("Renamed"); refetchSmartLists(); setShowSmartListRename(null); },
  });

  // ── Client-side sort (on current page) ──
  const leads: Lead[] = useMemo(() => {
    const rows = (data?.leads || []) as Lead[];
    // Apply client-side filters (hasEmail, hasPhone, contactType)
    let filtered = rows;
    if (activeFilters.hasEmail === true) filtered = filtered.filter(l => !!l.email);
    if (activeFilters.hasEmail === false) filtered = filtered.filter(l => !l.email);
    if (activeFilters.hasPhone === true) filtered = filtered.filter(l => !!l.phone);
    if (activeFilters.hasPhone === false) filtered = filtered.filter(l => !l.phone);
    if (activeFilters.contactType) filtered = filtered.filter(l => l.contactType === activeFilters.contactType);

    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      if (sortField === "firstName") { av = fullName(a).toLowerCase(); bv = fullName(b).toLowerCase(); }
      else if (sortField === "createdAt") { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
      else if (sortField === "lastContactDate") { av = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0; bv = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0; }
      else { av = (a as any)[sortField] || ""; bv = (b as any)[sortField] || ""; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDir, activeFilters]);

  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ── Selection ──
  const allSelected = leads.length > 0 && leads.every(l => selected.has(l.id));
  const someSelected = leads.some(l => selected.has(l.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l.id)));
  };
  const toggleOne = (id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── Sort ──
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── Bulk tag prompt ──
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [showBulkTag, setShowBulkTag] = useState(false);

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== "").length;

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 bg-background">
        {/* ── Main contacts area ── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">

        {/* ── Header ── */}
        <div className="border-b bg-card px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
              <Badge variant="secondary" className="text-sm font-semibold px-2.5">
                {total.toLocaleString()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                <Upload className="w-4 h-4 mr-1.5" /> Import
              </Button>
              <Button size="sm" onClick={() => setShowAddDrawer(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Contact
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="w-8 h-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowManageFields(true)}>
                    <Settings2 className="w-4 h-4 mr-2" /> Manage Fields
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Export coming soon")}>
                    <Download className="w-4 h-4 mr-2" /> Export All
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Smart List Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-none">
            <button
              onClick={() => { setActiveSmartList(null); setFilters({}); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${!activeSmartList ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Users className="w-3.5 h-3.5" /> All
            </button>
            {(smartLists as SmartList[]).map(sl => (
              <div key={sl.id} className="flex items-center group">
                <button
                  onClick={() => setActiveSmartList(activeSmartList?.id === sl.id ? null : sl)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeSmartList?.id === sl.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <Star className="w-3 h-3" /> {sl.name}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:text-foreground text-muted-foreground transition-opacity">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => { setShowSmartListRename(sl); setRenameValue(sl.name); }}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-500" onClick={() => deleteSmartListMut.mutate({ id: sl.id })}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-primary border-b-2 border-transparent transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add smart list
            </button>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 px-6 py-3 border-b bg-card/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(true)}
            className={activeFilterCount > 0 ? "border-primary text-primary" : ""}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Advanced Filters
            {activeFilterCount > 0 && <Badge className="ml-1.5 text-xs px-1.5 py-0">{activeFilterCount}</Badge>}
          </Button>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({})} className="text-muted-foreground">
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}

          <div className="flex-1" />

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="pl-8 w-64 h-8 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowManageFields(true)}>
            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Manage Fields
          </Button>
        </div>

        {/* ── Bulk Action Bar ── */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-primary/5 border-b border-primary/20">
            <span className="text-sm font-medium text-primary">{selected.size} selected</span>
             <div className="h-4 w-px bg-border mx-1" />
            <Button size="sm" variant="outline" className="gap-1.5 hover:bg-green-50 hover:border-green-400 hover:text-green-700" onClick={() => toast.info("Call feature — coming soon")}>
              <Phone className="w-3.5 h-3.5" /> Call
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700" onClick={() => setShowBulkSms(true)}>
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700" onClick={() => setShowBulkEmail(true)}>
              <Mail className="w-3.5 h-3.5" /> Email
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Set Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <DropdownMenuItem key={v} onClick={() => bulkStatusMut.mutate({ leadIds: Array.from(selected), status: v as any })}>
                    {l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover open={showBulkTag} onOpenChange={setShowBulkTag}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline"><Tag className="w-3.5 h-3.5 mr-1.5" /> Add Tag</Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3">
                <div className="flex gap-2">
                  <Input
                    value={bulkTagInput}
                    onChange={e => setBulkTagInput(e.target.value)}
                    placeholder="Tag name..."
                    className="h-8 text-sm"
                    onKeyDown={e => {
                      if (e.key === "Enter" && bulkTagInput.trim()) {
                        bulkAddTagMut.mutate({ leadIds: Array.from(selected), tag: bulkTagInput.trim() });
                        setBulkTagInput("");
                        setShowBulkTag(false);
                      }
                    }}
                  />
                  <Button size="sm" onClick={() => {
                    if (bulkTagInput.trim()) {
                      bulkAddTagMut.mutate({ leadIds: Array.from(selected), tag: bulkTagInput.trim() });
                      setBulkTagInput("");
                      setShowBulkTag(false);
                    }
                  }}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {allTags.slice(0, 8).map(t => (
                    <button key={t} onClick={() => {
                      bulkAddTagMut.mutate({ leadIds: Array.from(selected), tag: t });
                      setShowBulkTag(false);
                    }} className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors">
                      {t}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button size="sm" variant="outline" onClick={() => toast.info("Export coming soon")}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => {
                if (confirm(`Delete ${selected.size} contacts? This cannot be undone.`)) {
                  bulkDeleteMut.mutate({ leadIds: Array.from(selected) });
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>

            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No contacts found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {debouncedSearch || activeFilterCount > 0 ? "Try adjusting your search or filters" : "Add your first contact to get started"}
              </p>
              {!debouncedSearch && activeFilterCount === 0 && (
                <Button size="sm" className="mt-4" onClick={() => setShowAddDrawer(true)}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Contact
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </th>
                  {visibleCols.includes("name") && (
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("firstName")}>
                        Contact Name <SortIcon field="firstName" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                  )}
                  {visibleCols.includes("phone") && (
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort("phone")}>
                        Phone <SortIcon field="phone" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                  )}
                  {visibleCols.includes("email") && (
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort("email")}>
                        Email <SortIcon field="email" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                  )}
                  {visibleCols.includes("company") && (
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort("company")}>
                        Business <SortIcon field="company" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                  )}
                  {visibleCols.includes("status") && (
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort("status")}>
                        Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                  )}
                  {visibleCols.includes("createdAt") && (
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort("createdAt")}>
                        Created <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                  )}
                  {visibleCols.includes("lastActivity") && (
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort("lastContactDate")}>
                        Last Activity <SortIcon field="lastContactDate" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                  )}
                  {visibleCols.includes("tags") && (
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">Tags</th>
                  )}
                  {visibleCols.includes("source") && (
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">Source</th>
                  )}
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {leads.map(lead => {
                  const tags = parseTags(lead.tags);
                  const isSelected = selected.has(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className={`group hover:bg-muted/40 transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
                      onClick={() => navigate(`/contacts/${lead.id}`)}
                    >
                      <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleOne(lead.id); }}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(lead.id)} />
                      </td>
                      {visibleCols.includes("name") && (
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarColor(lead.id)}`}>
                              {initials(lead)}
                            </div>
                            <span className="font-medium hover:text-primary transition-colors">{fullName(lead)}</span>
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("phone") && (
                        <td className="px-3 py-3 text-muted-foreground">
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary transition-colors">
                              <Phone className="w-3.5 h-3.5" /> {lead.phone}
                            </a>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      )}
                      {visibleCols.includes("email") && (
                        <td className="px-3 py-3 text-muted-foreground max-w-48">
                          {lead.email ? (
                            <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary transition-colors truncate" title={lead.email}>
                              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </a>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      )}
                      {visibleCols.includes("company") && (
                        <td className="px-3 py-3 text-muted-foreground">
                          {lead.company ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate max-w-32">{lead.company}</span>
                            </div>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      )}
                      {visibleCols.includes("status") && (
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-600"}`}>
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </td>
                      )}
                      {visibleCols.includes("createdAt") && (
                        <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("lastActivity") && (
                        <td className="px-3 py-3 text-muted-foreground text-xs">
                          {lead.lastContactDate ? (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {timeAgo(lead.lastContactDate)}
                            </div>
                          ) : <span className="text-muted-foreground/40">No activity</span>}
                        </td>
                      )}
                      {visibleCols.includes("tags") && (
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1 max-w-48">
                            {tags.slice(0, 3).map(t => (
                              <button
                                key={t}
                                onClick={e => { e.stopPropagation(); setFilters(f => ({ ...f, tag: t })); setActiveSmartList(null); }}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors whitespace-nowrap"
                              >
                                {t}
                              </button>
                            ))}
                            {tags.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("source") && (
                        <td className="px-3 py-3 text-muted-foreground text-xs">{lead.source || "—"}</td>
                      )}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditLead(lead)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            {lead.phone && (
                              <DropdownMenuItem asChild>
                                <a href={`tel:${lead.phone}`}><Phone className="w-3.5 h-3.5 mr-2" /> Call</a>
                              </DropdownMenuItem>
                            )}
                            {lead.email && (
                              <DropdownMenuItem asChild>
                                <a href={`mailto:${lead.email}`}><Mail className="w-3.5 h-3.5 mr-2" /> Email</a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500" onClick={() => {
                              if (confirm("Delete this contact?")) {
                                bulkDeleteMut.mutate({ leadIds: [lead.id] });
                              }
                            }}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-card text-sm">
          <span className="text-muted-foreground">
            {total > 0 ? `${((page - 1) * limit) + 1}–${Math.min(page * limit, total)} of ${total.toLocaleString()} contacts` : "0 contacts"}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon"
                  className="w-8 h-8 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="w-4 h-4" />
            </Button>
           </div>
        </div>
        </div>{/* end main contacts area */}
        {/* ── Right Sidebar: Suggested Follow-Ups ── */}
        <div className="hidden lg:flex flex-col w-80 border-l bg-card/50 overflow-y-auto p-4 gap-4">
          <SuggestedFollowUpsPanel showAll />
        </div>
      </div>
      {/* ── Modals / Drawers ── */}
      <ContactDrawer
        open={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        onSaved={() => refetch()}
      />
      <ContactDrawer
        open={!!editLead}
        onClose={() => setEditLead(null)}
        lead={editLead}
        onSaved={() => refetch()}
      />
      <AdvancedFiltersPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onChange={f => { setFilters(f); setActiveSmartList(null); }}
        tags={allTags}
        onSaveSmartList={(name, f) => createSmartListMut.mutate({ name, filters: JSON.stringify(f) })}
      />
      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => refetch()}
      />
      <ManageFieldsDialog
        open={showManageFields}
        onClose={() => setShowManageFields(false)}
        visible={visibleCols}
        onChange={setVisibleCols}
      />

      {/* Smart List Rename Dialog */}
      <Dialog open={!!showSmartListRename} onOpenChange={() => setShowSmartListRename(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Smart List</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="Smart list name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSmartListRename(null)}>Cancel</Button>
            <Button onClick={() => {
              if (showSmartListRename && renameValue.trim()) {
                updateSmartListMut.mutate({ id: showSmartListRename.id, name: renameValue.trim() });
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk SMS Dialog */}
      <Dialog open={showBulkSms} onOpenChange={setShowBulkSms}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600" /> Send SMS to {selected.size} Contact{selected.size !== 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This message will be sent to all selected contacts that have a phone number.</p>
            <Textarea
              value={bulkSmsText}
              onChange={e => setBulkSmsText(e.target.value)}
              placeholder="Type your SMS message here…"
              className="min-h-[120px] text-sm resize-none"
              maxLength={1600}
            />
            <p className="text-xs text-muted-foreground text-right">{bulkSmsText.length}/1600</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkSms(false)}>Cancel</Button>
            <Button
              onClick={() => bulkSmsMut.mutate({ leadIds: Array.from(selected), message: bulkSmsText })}
              disabled={!bulkSmsText.trim() || bulkSmsMut.isPending}
              className="gap-1.5"
            >
              {bulkSmsMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk Email Dialog */}
      <Dialog open={showBulkEmail} onOpenChange={setShowBulkEmail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" /> Send Email to {selected.size} Contact{selected.size !== 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This email will be sent to all selected contacts that have an email address.</p>
            <Input
              value={bulkEmailSubject}
              onChange={e => setBulkEmailSubject(e.target.value)}
              placeholder="Subject"
              className="h-9 text-sm"
            />
            <Textarea
              value={bulkEmailBody}
              onChange={e => setBulkEmailBody(e.target.value)}
              placeholder="Type your email message here…"
              className="min-h-[160px] text-sm resize-none"
              maxLength={10000}
            />
            <p className="text-xs text-muted-foreground text-right">{bulkEmailBody.length}/10000</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEmail(false)}>Cancel</Button>
            <Button
              onClick={() => bulkEmailMut.mutate({ leadIds: Array.from(selected), subject: bulkEmailSubject, body: bulkEmailBody })}
              disabled={!bulkEmailSubject.trim() || !bulkEmailBody.trim() || bulkEmailMut.isPending}
              className="gap-1.5"
            >
              {bulkEmailMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
