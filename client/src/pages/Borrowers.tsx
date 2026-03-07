import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BookOpen, CheckCircle, ChevronRight, Circle, Clock, FileText, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const LOAN_STAGES = [
  "inquiry", "pre_approval", "application", "processing",
  "underwriting", "conditional_approval", "clear_to_close", "closing", "funded", "denied",
];

const STAGE_COLORS: Record<string, string> = {
  inquiry: "bg-gray-100 text-gray-600",
  pre_approval: "bg-blue-100 text-blue-700",
  application: "bg-indigo-100 text-indigo-700",
  processing: "bg-purple-100 text-purple-700",
  underwriting: "bg-amber-100 text-amber-700",
  conditional_approval: "bg-orange-100 text-orange-700",
  clear_to_close: "bg-teal-100 text-teal-700",
  closing: "bg-green-100 text-green-700",
  funded: "bg-emerald-100 text-emerald-700",
};

function MilestoneTimeline({ milestones }: { milestones: any[] }) {
  const sorted = [...milestones].sort((a, b) => new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime());
  return (
    <div className="space-y-2">
      {sorted.map((m, i) => (
        <div key={m.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            {m.completedAt ? (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            {i < sorted.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
          </div>
          <div className="pb-2">
            <p className="text-sm font-medium">{m.milestone.replace(/_/g, " ")}</p>
            {m.completedAt && (
              <p className="text-xs text-muted-foreground">{new Date(m.completedAt).toLocaleDateString()}</p>
            )}
            {m.notes && <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function BorrowerDetailPanel({ borrowerId, agencyId, onClose }: { borrowerId: number; agencyId: number; onClose: () => void }) {
  const { data: borrowerData } = trpc.borrowers.getById.useQuery({ id: borrowerId, agencyId });
  const borrower = borrowerData;
  const milestones = borrowerData?.milestones;
  const { data: docs } = trpc.documents.list.useQuery({ agencyId, borrowerId });
  const updateMilestoneMutation = trpc.borrowers.updateMilestone.useMutation({
    onSuccess: () => toast.success("Milestone updated"),
  });

  if (!borrower) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">{borrower.firstName} {borrower.lastName}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Email:</span> <span>{borrower.email || "—"}</span></div>
          <div><span className="text-muted-foreground">Phone:</span> <span>{borrower.phone || "—"}</span></div>
          <div><span className="text-muted-foreground">Loan Type:</span> <span className="capitalize">{borrower.loanType?.replace(/_/g, " ") || "—"}</span></div>
          <div><span className="text-muted-foreground">Amount:</span> <span>{borrower.loanAmount ? `$${parseFloat(borrower.loanAmount).toLocaleString()}` : "—"}</span></div>
          <div><span className="text-muted-foreground">Credit Score:</span> <span>{borrower.creditScore || "—"}</span></div>
          <div><span className="text-muted-foreground">Stage:</span>
            <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[borrower.currentMilestone || ''] || 'bg-gray-100 text-gray-600'}`}>
              {borrower.currentMilestone?.replace(/_/g, ' ') || '—'}
            </span>
          </div>
        </div>

        {/* Milestones */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Loan Milestones</h3>
            <Button
              variant="ghost" size="sm" className="h-6 text-xs"
              onClick={() => updateMilestoneMutation.mutate({ borrowerId, agencyId, milestone: "application", status: "in_progress", notes: "" })}
            >
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
          {milestones?.length ? <MilestoneTimeline milestones={milestones} /> : (
            <p className="text-xs text-muted-foreground">No milestones yet</p>
          )}
        </div>

        {/* Documents */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Documents ({docs?.length || 0})</h3>
          {docs?.length ? (
            <div className="space-y-1.5">
              {docs.map(doc => (
                <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-sm">
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="flex-1 truncate">{doc.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{doc.type}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No documents uploaded</p>
          )}
        </div>

        {/* Notes */}
        {borrower.notes && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Notes</h3>
            <p className="text-sm text-muted-foreground">{borrower.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddBorrowerDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", loanType: "conventional", loanAmount: "", creditScore: "", notes: "" });
  const createMutation = trpc.borrowers.create.useMutation({
    onSuccess: () => { toast.success("Borrower added"); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Borrower</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add New Borrower</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ agencyId, ...form as any }); }} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>First Name *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Loan Type</Label>
              <Select value={form.loanType} onValueChange={v => setForm(f => ({ ...f, loanType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["conventional", "fha", "va", "usda", "jumbo", "heloc", "refinance", "other"].map(t => (
                    <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Loan Amount</Label><Input type="number" value={form.loanAmount} onChange={e => setForm(f => ({ ...f, loanAmount: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Credit Score</Label><Input type="number" value={form.creditScore} onChange={e => setForm(f => ({ ...f, creditScore: e.target.value }))} /></div>
          </div>
          <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Adding..." : "Add Borrower"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Borrowers() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: borrowers, refetch } = trpc.borrowers.list.useQuery({
    agencyId,
    search: search || undefined,
    milestone: stageFilter !== "all" ? stageFilter : undefined,
  });

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="flex h-full fade-in">
        {/* Main list */}
        <div className={`flex flex-col flex-1 min-w-0 ${selectedId ? "hidden lg:flex" : ""}`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold font-display">Borrower Database</h1>
                <p className="text-muted-foreground text-sm">{borrowers?.length ?? 0} borrowers</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search borrowers..." className="pl-8 h-8 w-48 text-sm" />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {LOAN_STAGES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <AddBorrowerDialog agencyId={agencyId} onSuccess={refetch} />
              </div>
            </div>

            {/* Borrower cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {borrowers?.map(b => (
                <Card
                  key={b.id}
                  className={`cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 ${selectedId === b.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedId(b.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                          {b.firstName[0]}{b.lastName?.[0] || ""}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{b.firstName} {b.lastName}</p>
                          <p className="text-xs text-muted-foreground">{b.email || b.phone || "—"}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[b.currentMilestone || ''] || 'bg-gray-100 text-gray-600'}`}>
                        {b.currentMilestone?.replace(/_/g, ' ') || 'No stage'}
                      </span>
                      {b.loanAmount && (
                        <span className="text-xs font-medium text-muted-foreground">
                          ${parseFloat(b.loanAmount).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Added {new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {borrowers?.length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No borrowers found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedId && (
          <div className="w-80 xl:w-96 border-l border-border bg-card flex-shrink-0 slide-in-right overflow-hidden">
            <BorrowerDetailPanel borrowerId={selectedId} agencyId={agencyId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
