/**
 * Pipeline / Opportunities Page
 *
 * Features:
 * - Pipeline selector (DSCR, Fix & Flip, Referral, etc.)
 * - Kanban board with drag-and-drop stage transitions
 * - List view with sorting, filtering, and bulk actions
 * - Opportunity detail slide-over panel
 * - Add / Edit opportunity forms
 * - Seed sample data on first visit
 */
import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Calendar,
  ChevronDown,
  CircleDollarSign,
  Filter,
  Kanban,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  X,
  MessageSquare,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
type Pipeline = {
  id: number;
  name: string;
  description?: string | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  stages: Stage[];
};

type Stage = {
  id: number;
  pipelineId: number;
  name: string;
  color: string;
  stageOrder: number;
  probability: number;
};

type Opportunity = {
  id: number;
  pipelineId: number;
  stageId: number;
  name: string;
  contactName?: string | null;
  companyName?: string | null;
  value?: string | null;
  status: string;
  source?: string | null;
  ownerName?: string | null;
  tags?: string[] | null;
  expectedCloseDate?: Date | null;
  notes?: string | null;
  priority?: string | null;
  stageEnteredAt?: Date | null;
  createdAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(val?: string | null) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function priorityColor(p?: string | null) {
  if (p === "high") return "text-red-500";
  if (p === "medium") return "text-amber-500";
  return "text-slate-400";
}

function statusIcon(s: string) {
  if (s === "won") return <Trophy className="w-3.5 h-3.5 text-emerald-500" />;
  if (s === "lost") return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  return null;
}

function daysInStage(enteredAt?: Date | null) {
  if (!enteredAt) return null;
  const diff = Date.now() - new Date(enteredAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days;
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────
function KanbanCard({ opp, onClick }: { opp: Opportunity; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `opp-${opp.id}`,
    data: { opportunityId: opp.id, stageId: opp.stageId },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const days = daysInStage(opp.stageEnteredAt);
  const val = formatCurrency(opp.value);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all select-none ${isDragging ? "opacity-50 shadow-xl ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-sm font-semibold leading-tight line-clamp-2 flex-1">{opp.name}</p>
        {statusIcon(opp.status)}
      </div>
      {opp.contactName && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{opp.contactName}</span>
        </div>
      )}
      {opp.companyName && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Building2 className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{opp.companyName}</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        {val ? (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {val}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          {days !== null && (
            <span className={`text-xs ${days > 14 ? "text-red-400" : "text-muted-foreground"}`}>
              {days}d
            </span>
          )}
          {opp.priority && (
            <span className={`text-xs font-medium capitalize ${priorityColor(opp.priority)}`}>
              {opp.priority === "high" ? "●" : opp.priority === "medium" ? "◐" : "○"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({
  stage,
  opps,
  onCardClick,
  onAddClick,
}: {
  stage: Stage;
  opps: Opportunity[];
  onCardClick: (opp: Opportunity) => void;
  onAddClick: (stageId: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}` });
  const totalValue = opps.reduce((sum, o) => sum + (parseFloat(o.value ?? "0") || 0), 0);

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold truncate max-w-[140px]">{stage.name}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">{opps.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {totalValue > 0 && (
            <span className="text-xs text-muted-foreground">{formatCurrency(String(totalValue))}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={() => onAddClick(stage.id)}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] rounded-xl p-2 space-y-2 transition-colors ${
          isOver
            ? "bg-primary/5 ring-2 ring-primary/30"
            : "bg-slate-50 dark:bg-slate-900/50"
        }`}
      >
        {opps.map(opp => (
          <KanbanCard key={opp.id} opp={opp} onClick={() => onCardClick(opp)} />
        ))}
        {opps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-xs text-muted-foreground">
            <p>No opportunities</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Opportunity Form ─────────────────────────────────────────────────────────
function OpportunityForm({
  pipelineId,
  stages,
  defaultStageId,
  initial,
  onSuccess,
  onCancel,
}: {
  pipelineId: number;
  stages: Stage[];
  defaultStageId?: number;
  initial?: Partial<Opportunity>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    contactName: initial?.contactName ?? "",
    companyName: initial?.companyName ?? "",
    value: initial?.value ? String(parseFloat(initial.value)) : "",
    stageId: initial?.stageId ?? defaultStageId ?? stages[0]?.id ?? 0,
    status: (initial?.status ?? "open") as "open" | "won" | "lost",
    source: initial?.source ?? "",
    ownerName: initial?.ownerName ?? "",
    priority: (initial?.priority ?? "medium") as "low" | "medium" | "high",
    expectedCloseDate: initial?.expectedCloseDate
      ? new Date(initial.expectedCloseDate).toISOString().split("T")[0]
      : "",
    notes: initial?.notes ?? "",
  });

  const createMut = trpc.pipelines.createOpportunity.useMutation({
    onSuccess: () => { toast.success("Opportunity created"); onSuccess(); },
    onError: e => toast.error(e.message),
  });
  const updateMut = trpc.pipelines.updateOpportunity.useMutation({
    onSuccess: () => { toast.success("Opportunity updated"); onSuccess(); },
    onError: e => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && initial?.id) {
      updateMut.mutate({
        id: initial.id,
        name: form.name,
        contactName: form.contactName || undefined,
        companyName: form.companyName || undefined,
        value: form.value ? parseFloat(form.value) : undefined,
        status: form.status,
        source: form.source || undefined,
        ownerName: form.ownerName || undefined,
        priority: form.priority,
        expectedCloseDate: form.expectedCloseDate || undefined,
        notes: form.notes || undefined,
      });
    } else {
      createMut.mutate({
        pipelineId,
        stageId: form.stageId,
        name: form.name,
        contactName: form.contactName || undefined,
        companyName: form.companyName || undefined,
        value: form.value ? parseFloat(form.value) : undefined,
        status: form.status,
        source: form.source || undefined,
        ownerName: form.ownerName || undefined,
        priority: form.priority,
        expectedCloseDate: form.expectedCloseDate || undefined,
        notes: form.notes || undefined,
      });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Opportunity Name *</Label>
        <Input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. John Smith - DSCR Loan"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Contact Name</Label>
          <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="John Smith" />
        </div>
        <div className="space-y-1.5">
          <Label>Company</Label>
          <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="Smith Properties LLC" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Loan Value ($)</Label>
          <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="350000" />
        </div>
        {!isEdit && (
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select value={String(form.stageId)} onValueChange={v => setForm(f => ({ ...f, stageId: parseInt(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {isEdit && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={form.source || "none"} onValueChange={v => setForm(f => ({ ...f, source: v === "none" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              <SelectItem value="Facebook Ad">Facebook Ad</SelectItem>
              <SelectItem value="Referral">Referral</SelectItem>
              <SelectItem value="Website">Website</SelectItem>
              <SelectItem value="Cold Outreach">Cold Outreach</SelectItem>
              <SelectItem value="Organic">Organic</SelectItem>
              <SelectItem value="Import">Import</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Owner</Label>
          <Input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="Kyle Johnson" />
        </div>
        <div className="space-y-1.5">
          <Label>Expected Close Date</Label>
          <Input type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Add any relevant details..." />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Opportunity"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Opportunity Detail Panel ─────────────────────────────────────────────────
function OpportunityDetail({
  oppId,
  stages,
  onClose,
  onEdit,
  onDeleted,
}: {
  oppId: number;
  stages: Stage[];
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.pipelines.getOpportunity.useQuery({ id: oppId });
  const [note, setNote] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const addNoteMut = trpc.pipelines.addNote.useMutation({
    onSuccess: () => {
      toast.success("Note added");
      setNote("");
      utils.pipelines.getOpportunity.invalidate({ id: oppId });
    },
    onError: e => toast.error(e.message),
  });

  const deleteMut = trpc.pipelines.deleteOpportunity.useMutation({
    onSuccess: () => {
      toast.success("Opportunity deleted");
      onDeleted();
    },
    onError: e => toast.error(e.message),
  });

  const moveMut = trpc.pipelines.moveStage.useMutation({
    onSuccess: () => {
      toast.success("Stage updated");
      utils.pipelines.getOpportunity.invalidate({ id: oppId });
      utils.pipelines.listOpportunities.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const currentStage = stages.find(s => s.id === data.stageId);
  const val = formatCurrency(data.value);
  const days = daysInStage(data.stageEnteredAt);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold leading-tight">{data.name}</h2>
          {data.contactName && (
            <p className="text-sm text-muted-foreground mt-0.5">{data.contactName}{data.companyName ? ` · ${data.companyName}` : ""}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Value</p>
          <p className="text-sm font-bold text-emerald-600">{val ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Days in Stage</p>
          <p className={`text-sm font-bold ${days !== null && days > 14 ? "text-red-500" : ""}`}>{days ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Priority</p>
          <p className={`text-sm font-bold capitalize ${priorityColor(data.priority)}`}>{data.priority ?? "—"}</p>
        </div>
      </div>

      {/* Stage selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Current Stage</Label>
        <Select
          value={String(data.stageId)}
          onValueChange={v => moveMut.mutate({ opportunityId: data.id, newStageId: parseInt(v) })}
        >
          <SelectTrigger className="h-8 text-sm">
            <div className="flex items-center gap-2">
              {currentStage && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStage.color }} />
              )}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {stages.map(s => (
              <SelectItem key={s.id} value={String(s.id)}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {data.source && (
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Source:</span>
            <span>{data.source}</span>
          </div>
        )}
        {data.ownerName && (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Owner:</span>
            <span>{data.ownerName}</span>
          </div>
        )}
        {data.expectedCloseDate && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Close date:</span>
            <span>{new Date(data.expectedCloseDate).toLocaleDateString()}</span>
          </div>
        )}
        {data.status !== "open" && (
          <div className="flex items-center gap-2">
            {data.status === "won" ? <Trophy className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
            <span className="font-medium capitalize">{data.status}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {data.tags && (data.tags as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(data.tags as string[]).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs capitalize">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}

      {/* Activity log */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(data.activities ?? []).map((act: any) => (
            <div key={act.id} className="flex gap-2.5 text-xs">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                {act.type === "stage_change" ? <ArrowRight className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground leading-snug">{act.content}</p>
                <p className="text-muted-foreground mt-0.5">
                  {act.createdByName} · {new Date(act.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
          {(!data.activities || data.activities.length === 0) && (
            <p className="text-xs text-muted-foreground">No activity yet</p>
          )}
        </div>

        {/* Add note */}
        <div className="flex gap-2 pt-1">
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note..."
            className="h-8 text-sm"
            onKeyDown={e => {
              if (e.key === "Enter" && note.trim()) {
                addNoteMut.mutate({ opportunityId: data.id, content: note.trim() });
              }
            }}
          />
          <Button
            size="sm"
            className="h-8"
            disabled={!note.trim() || addNoteMut.isPending}
            onClick={() => addNoteMut.mutate({ opportunityId: data.id, content: note.trim() })}
          >
            Add
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{data.name}" and all its activity history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate({ id: data.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── List View Row ────────────────────────────────────────────────────────────
function ListRow({
  opp,
  stage,
  selected,
  onSelect,
  onClick,
}: {
  opp: Opportunity;
  stage?: Stage;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onClick: () => void;
}) {
  const val = formatCurrency(opp.value);
  return (
    <tr
      className={`border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${selected ? "bg-primary/5" : ""}`}
    >
      <td className="pl-4 pr-2 py-3" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={e => onSelect(opp.id, e.target.checked)}
          className="rounded border-border"
        />
      </td>
      <td className="py-3 pr-3" onClick={onClick}>
        <div>
          <p className="text-sm font-medium leading-tight">{opp.name}</p>
          {opp.contactName && <p className="text-xs text-muted-foreground">{opp.contactName}</p>}
        </div>
      </td>
      <td className="py-3 pr-3 hidden md:table-cell" onClick={onClick}>
        {stage && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
            <span className="text-sm">{stage.name}</span>
          </div>
        )}
      </td>
      <td className="py-3 pr-3 hidden lg:table-cell" onClick={onClick}>
        <span className="text-sm font-semibold text-emerald-600">{val ?? "—"}</span>
      </td>
      <td className="py-3 pr-3 hidden lg:table-cell" onClick={onClick}>
        <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
          opp.status === "won" ? "bg-emerald-100 text-emerald-700" :
          opp.status === "lost" ? "bg-red-100 text-red-700" :
          "bg-blue-100 text-blue-700"
        }`}>{opp.status}</span>
      </td>
      <td className="py-3 pr-3 hidden xl:table-cell" onClick={onClick}>
        <span className="text-xs text-muted-foreground">{opp.ownerName ?? "—"}</span>
      </td>
      <td className="py-3 pr-4 text-right" onClick={onClick}>
        <span className="text-xs text-muted-foreground">
          {new Date(opp.createdAt).toLocaleDateString()}
        </span>
      </td>
    </tr>
  );
}

// ─── Pipeline Stats Bar ───────────────────────────────────────────────────────
function PipelineStats({ opps, stages }: { opps: Opportunity[]; stages: Stage[] }) {
  const open = opps.filter(o => o.status === "open");
  const won = opps.filter(o => o.status === "won");
  const lost = opps.filter(o => o.status === "lost");
  const totalValue = open.reduce((s, o) => s + (parseFloat(o.value ?? "0") || 0), 0);
  const wonValue = won.reduce((s, o) => s + (parseFloat(o.value ?? "0") || 0), 0);
  const winRate = opps.length > 0 ? Math.round((won.length / opps.length) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {[
        { label: "Open Deals", value: open.length, icon: <CircleDollarSign className="w-4 h-4 text-blue-500" />, sub: formatCurrency(String(totalValue)) ?? "$0" },
        { label: "Won", value: won.length, icon: <Trophy className="w-4 h-4 text-emerald-500" />, sub: formatCurrency(String(wonValue)) ?? "$0" },
        { label: "Lost", value: lost.length, icon: <XCircle className="w-4 h-4 text-red-400" />, sub: `${opps.length} total` },
        { label: "Win Rate", value: `${winRate}%`, icon: <TrendingUp className="w-4 h-4 text-violet-500" />, sub: `${won.length} closed` },
      ].map(stat => (
        <Card key={stat.label} className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            {stat.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-base font-bold leading-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Pipeline() {
  const utils = trpc.useUtils();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "won" | "lost">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeOppId, setActiveOppId] = useState<number | null>(null); // detail panel
  const [addDialogStageId, setAddDialogStageId] = useState<number | null>(null);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [dragActiveId, setDragActiveId] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  // ── Data ──
  const { data: pipelines = [], isLoading: loadingPipelines } = trpc.pipelines.listPipelines.useQuery();
  const seedMut = trpc.pipelines.seedSampleData.useMutation({
    onSuccess: (res) => {
      if (res && 'success' in res) {
        toast.success(`Sample data created: ${res.pipelines} pipelines, ${res.opportunities} opportunities`);
      }
      utils.pipelines.listPipelines.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  // Auto-select default pipeline
  const activePipeline = useMemo(() => {
    if (!pipelines.length) return null;
    if (selectedPipelineId) return pipelines.find(p => p.id === selectedPipelineId) ?? pipelines[0];
    return pipelines.find(p => p.isDefault) ?? pipelines[0];
  }, [pipelines, selectedPipelineId]);

  const { data: rawOpps = [], isLoading: loadingOpps } = trpc.pipelines.listOpportunities.useQuery(
    {
      pipelineId: activePipeline?.id,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search || undefined,
      pageSize: 200,
    },
    { enabled: !!activePipeline }
  );

  const stages = activePipeline?.stages ?? [];

  // ── DnD ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const moveMut = trpc.pipelines.moveStage.useMutation({
    onSuccess: () => utils.pipelines.listOpportunities.invalidate(),
    onError: e => toast.error(e.message),
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = parseInt(String(event.active.id).replace("opp-", ""));
    setDragActiveId(id);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const oppId = parseInt(String(active.id).replace("opp-", ""));
    const stageId = parseInt(String(over.id).replace("stage-", ""));
    const opp = rawOpps.find(o => o.id === oppId);
    if (!opp || opp.stageId === stageId) return;
    // Optimistic update
    utils.pipelines.listOpportunities.setData(
      { pipelineId: activePipeline?.id, status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined, pageSize: 200 },
      (old) => old ? old.map(o => o.id === oppId ? { ...o, stageId } : o) : old
    );
    moveMut.mutate({ opportunityId: oppId, newStageId: stageId });
  }, [rawOpps, activePipeline, statusFilter, search, moveMut, utils]);

  // ── Bulk actions ──
  const bulkMut = trpc.pipelines.bulkAction.useMutation({
    onSuccess: (res) => {
      toast.success(`Updated ${res.affected} opportunities`);
      setSelectedIds(new Set());
      setBulkAction(null);
      utils.pipelines.listOpportunities.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const handleBulkAction = (action: string) => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    if (action === "delete") {
      bulkMut.mutate({ ids, action: "delete" });
    } else if (action === "mark_won") {
      bulkMut.mutate({ ids, action: "mark_won" });
    } else if (action === "mark_lost") {
      bulkMut.mutate({ ids, action: "mark_lost" });
    }
  };

  // ── Kanban grouping ──
  const oppsByStage = useMemo(() => {
    const map: Record<number, Opportunity[]> = {};
    stages.forEach(s => { map[s.id] = []; });
    rawOpps.forEach(o => {
      if (map[o.stageId]) map[o.stageId].push(o);
    });
    return map;
  }, [rawOpps, stages]);

  const dragActiveOpp = dragActiveId ? rawOpps.find(o => o.id === dragActiveId) : null;

  // ── Selection ──
  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(rawOpps.map(o => o.id)));
    else setSelectedIds(new Set());
  };

  const refreshAll = () => {
    utils.pipelines.listOpportunities.invalidate();
    utils.pipelines.listPipelines.invalidate();
  };

  // ── Empty state ──
  if (!loadingPipelines && pipelines.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Kanban className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">No Pipelines Yet</h2>
            <p className="text-muted-foreground max-w-sm">
              Get started by seeding sample pipelines (DSCR, Fix & Flip, Referral) with 60 sample opportunities, or create your own.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => seedMut.mutate()}
              disabled={seedMut.isPending}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {seedMut.isPending ? "Creating..." : "Seed Sample Data"}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Pipeline selector */}
            <Select
              value={String(activePipeline?.id ?? "")}
              onValueChange={v => setSelectedPipelineId(parseInt(v))}
            >
              <SelectTrigger className="h-8 text-sm font-semibold w-52">
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.isDefault ? " ★" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
              <SelectTrigger className="h-8 text-sm w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-8 pl-8 text-sm w-44"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2.5 py-1">
                <span className="text-xs font-medium text-primary">{selectedIds.size} selected</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleBulkAction("mark_won")}>
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Won
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleBulkAction("mark_lost")}>
                  <XCircle className="w-3 h-3 mr-1 text-red-400" /> Lost
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => handleBulkAction("delete")}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedIds(new Set())}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button
                className={`px-2.5 py-1.5 text-xs transition-colors ${view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setView("kanban")}
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>
              <button
                className={`px-2.5 py-1.5 text-xs transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setView("list")}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add opportunity */}
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddDialogStageId(stages[0]?.id ?? null)}>
              <Plus className="w-3.5 h-3.5" />
              Add Deal
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <PipelineStats opps={rawOpps} stages={stages} />

        {/* ── Kanban Board ── */}
        {view === "kanban" && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
              {stages.map(stage => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  opps={oppsByStage[stage.id] ?? []}
                  onCardClick={opp => setActiveOppId(opp.id)}
                  onAddClick={stageId => setAddDialogStageId(stageId)}
                />
              ))}
              {stages.length === 0 && !loadingOpps && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  No stages configured for this pipeline.
                </div>
              )}
            </div>
            <DragOverlay>
              {dragActiveOpp && (
                <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-primary shadow-2xl p-3 w-72 opacity-90">
                  <p className="text-sm font-semibold">{dragActiveOpp.name}</p>
                  {dragActiveOpp.contactName && <p className="text-xs text-muted-foreground">{dragActiveOpp.contactName}</p>}
                  {dragActiveOpp.value && <p className="text-xs font-semibold text-emerald-600 mt-1">{formatCurrency(dragActiveOpp.value)}</p>}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* ── List View ── */}
        {view === "list" && (
          <div className="flex-1 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="pl-4 pr-2 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === rawOpps.length && rawOpps.length > 0}
                      onChange={e => toggleSelectAll(e.target.checked)}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="py-2.5 pr-3 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="py-2.5 pr-3 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Stage</th>
                  <th className="py-2.5 pr-3 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Value</th>
                  <th className="py-2.5 pr-3 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Status</th>
                  <th className="py-2.5 pr-3 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Owner</th>
                  <th className="py-2.5 pr-4 text-right font-semibold text-xs text-muted-foreground uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody>
                {rawOpps.map(opp => (
                  <ListRow
                    key={opp.id}
                    opp={opp}
                    stage={stages.find(s => s.id === opp.stageId)}
                    selected={selectedIds.has(opp.id)}
                    onSelect={toggleSelect}
                    onClick={() => setActiveOppId(opp.id)}
                  />
                ))}
                {rawOpps.length === 0 && !loadingOpps && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                      No opportunities found. <button className="text-primary underline" onClick={() => setAddDialogStageId(stages[0]?.id ?? null)}>Add the first one.</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Opportunity Detail Sheet ── */}
      <Sheet open={activeOppId !== null} onOpenChange={open => { if (!open) setActiveOppId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Opportunity Details</SheetTitle>
          </SheetHeader>
          {activeOppId !== null && (
            <OpportunityDetail
              oppId={activeOppId}
              stages={stages}
              onClose={() => setActiveOppId(null)}
              onEdit={() => {
                const opp = rawOpps.find(o => o.id === activeOppId);
                if (opp) { setEditOpp(opp); setActiveOppId(null); }
              }}
              onDeleted={() => {
                setActiveOppId(null);
                refreshAll();
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Opportunity Dialog ── */}
      <Dialog open={addDialogStageId !== null} onOpenChange={open => { if (!open) setAddDialogStageId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Opportunity</DialogTitle>
          </DialogHeader>
          {activePipeline && addDialogStageId !== null && (
            <OpportunityForm
              pipelineId={activePipeline.id}
              stages={stages}
              defaultStageId={addDialogStageId}
              onSuccess={() => {
                setAddDialogStageId(null);
                refreshAll();
              }}
              onCancel={() => setAddDialogStageId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Opportunity Dialog ── */}
      <Dialog open={editOpp !== null} onOpenChange={open => { if (!open) setEditOpp(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Opportunity</DialogTitle>
          </DialogHeader>
          {activePipeline && editOpp && (
            <OpportunityForm
              pipelineId={activePipeline.id}
              stages={stages}
              initial={editOpp}
              onSuccess={() => {
                setEditOpp(null);
                refreshAll();
              }}
              onCancel={() => setEditOpp(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
