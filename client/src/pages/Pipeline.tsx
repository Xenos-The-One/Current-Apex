import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
// Lead type inferred from trpc
type Lead = { id: number; firstName: string; lastName?: string | null; email?: string | null; phone?: string | null; company?: string | null; contactType?: string | null; source?: string | null; pipelineStage?: string | null; status?: string | null; score?: number | null; loanAmount?: string | null; notes?: string | null; createdAt: Date; assignedUserId?: number | null; };
import {
  Bot,
  Building2,
  ChevronRight,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  Upload,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const STAGES = [
  { key: "new", label: "New", color: "bg-blue-500" },
  { key: "contacted", label: "Contacted", color: "bg-purple-500" },
  { key: "qualified", label: "Qualified", color: "bg-amber-500" },
  { key: "proposal", label: "Proposal", color: "bg-pink-500" },
  { key: "negotiation", label: "Negotiation", color: "bg-teal-500" },
  { key: "closed_won", label: "Won", color: "bg-green-500" },
  { key: "closed_lost", label: "Lost", color: "bg-red-400" },
] as const;

type Stage = typeof STAGES[number]["key"];

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 70 ? "score-high" : score >= 40 ? "score-medium" : "score-low";
  return <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cls}`}>{score}</span>;
}

function LeadCard({ lead, onDragStart }: { lead: Lead; onDragStart: (e: React.DragEvent, id: number) => void }) {
  const initials = `${lead.firstName[0]}${lead.lastName?.[0] || ""}`.toUpperCase();
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      className="bg-card rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:-translate-y-0.5 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-700">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{lead.firstName} {lead.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{lead.company || lead.contactType?.replace(/_/g, " ")}</p>
          </div>
        </div>
        <ScoreBadge score={lead.score ?? 0} />
      </div>

      <div className="mt-2.5 space-y-1">
        {lead.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span>{lead.phone}</span>
          </div>
        )}
        {lead.loanAmount && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span>${parseFloat(lead.loanAmount).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <Badge variant="outline" className="text-xs capitalize px-1.5 py-0">
          {lead.source?.replace(/_/g, " ")}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(lead.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function AddLeadDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", company: "",
    contactType: "borrower", source: "manual", loanAmount: "", notes: "",
  });
  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => { toast.success("Lead added"); setOpen(false); onSuccess(); setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", contactType: "borrower", source: "manual", loanAmount: "", notes: "" }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Lead</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ agencyId, ...form as any }); }} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>First Name *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Contact Type</Label>
              <Select value={form.contactType} onValueChange={v => setForm(f => ({ ...f, contactType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["borrower", "re_agent", "attorney", "insurance", "title_co", "builder", "lender", "other"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["manual", "referral", "social_media", "webinar", "facebook_ads", "website", "cold_call", "import"].map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Company</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Loan Amount</Label><Input type="number" value={form.loanAmount} onChange={e => setForm(f => ({ ...f, loanAmount: e.target.value }))} placeholder="350000" /></div>
          </div>
          <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Adding..." : "Add Lead"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CSVImportDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMutation = trpc.leads.bulkImport.useMutation({
    onSuccess: (data) => { toast.success(`Imported ${data.imported} leads`); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",");
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = (vals[i] || "").trim().replace(/^"|"$/g, ""); });
        return {
          firstName: row.first_name || row.firstname || row.name?.split(" ")[0] || "Unknown",
          lastName: row.last_name || row.lastname || row.name?.split(" ").slice(1).join(" "),
          email: row.email,
          phone: row.phone || row.phone_number,
          company: row.company,
          source: "import",
          notes: row.notes,
        };
      }).filter(r => r.firstName);
      importMutation.mutate({ agencyId, rows });
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1.5" /> Import CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Import Leads from CSV</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium mb-1">Upload CSV file</p>
            <p className="text-xs text-muted-foreground mb-3">Columns: first_name, last_name, email, phone, company, notes</p>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Choose File</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
          {importMutation.isPending && <p className="text-sm text-center text-muted-foreground">Importing leads...</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CONTACT_TYPE_TABS = [
  { value: "all", label: "All Leads" },
  { value: "borrower", label: "Borrowers" },
  { value: "re_agent", label: "RE Agents" },
  { value: "attorney", label: "Attorneys" },
  { value: "insurance", label: "Insurance" },
  { value: "title_co", label: "Title Co." },
  { value: "builder", label: "Builders" },
  { value: "lender", label: "Lenders" },
] as const;

export default function Pipeline() {
  const { agencyId } = useAgency();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const { data: kanban, refetch } = trpc.leads.getKanban.useQuery({ agencyId });
  const updateStageMutation = trpc.leads.updateStage.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    if (draggingId !== null) {
      updateStageMutation.mutate({ id: draggingId, agencyId, pipelineStage: stage });
    }
    setDraggingId(null);
    setDragOverStage(null);
  };

  const filterLeads = (leads: Lead[]) => {
    return leads.filter(l => {
      const matchSearch = !search || `${l.firstName} ${l.lastName} ${l.email} ${l.phone}`.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || l.contactType === typeFilter;
      return matchSearch && matchType;
    });
  };

  const totalLeads = Object.values(kanban || {}).flat().length;

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-4 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Lead Pipeline</h1>
            <p className="text-muted-foreground text-sm">{totalLeads} total leads across all stages</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="pl-8 h-8 w-48 text-sm" />
            </div>
            <CSVImportDialog agencyId={agencyId} onSuccess={refetch} />
            <AddLeadDialog agencyId={agencyId} onSuccess={refetch} />
          </div>
        </div>

        {/* Lead type tabs */}
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="flex-wrap h-auto gap-1">
            {CONTACT_TYPE_TABS.map(tab => {
              const count = Object.values(kanban || {}).flat().filter((l: Lead) => tab.value === "all" || l.contactType === tab.value).length;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5">
                  {tab.label}
                  <Badge variant="secondary" className="h-4 min-w-4 text-xs px-1">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Kanban Board */}
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
          {STAGES.map(stage => {
            const stageLeads = filterLeads(kanban?.[stage.key as keyof typeof kanban] || []);
            const isDragOver = dragOverStage === stage.key;
            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-64"
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage.key); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={e => handleDrop(e, stage.key)}
              >
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${isDragOver ? "bg-blue-50" : "bg-muted/60"} transition-colors`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                    <span className="text-sm font-semibold">{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs h-5 min-w-5 flex items-center justify-center">
                    {stageLeads.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className={`kanban-col rounded-t-none space-y-2 ${isDragOver ? "ring-2 ring-blue-300 bg-blue-50/50" : ""} transition-all`}
                  style={{ minHeight: "400px" }}>
                  {stageLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} />
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                      <User className="w-6 h-6 mb-1" />
                      <p className="text-xs">Drop leads here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CRMLayout>
  );
}
