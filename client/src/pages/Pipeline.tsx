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
import { BottomSheet } from "@/components/BottomSheet";
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
  GripVertical,
  Kanban,
  Link2,
  List,
  MoreHorizontal,
  Pencil,
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
  FileDown,
  Send,
  Mail,
  Phone,
  Target,
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
  contactId?: number | null;
  closedReason?: string | null;
  closedReasonNotes?: string | null;
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
  const isStale = days !== null && days >= 14 && opp.status === "open";
  const isVeryStale = days !== null && days >= 30 && opp.status === "open";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      title={isStale ? `⚠️ Stale: ${days} days in this stage` : undefined}
      className={`bg-white dark:bg-slate-800 rounded-lg p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all select-none
        ${isDragging ? "opacity-50 shadow-xl ring-2 ring-primary" : ""}
        ${isVeryStale ? "border-2 border-red-400 dark:border-red-500" : isStale ? "border-2 border-amber-400 dark:border-amber-500" : "border border-slate-200 dark:border-slate-700"}
      `}
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
            <span className={`text-xs font-medium flex items-center gap-0.5 ${
              isVeryStale ? "text-red-500" : isStale ? "text-amber-500" : "text-muted-foreground"
            }`}>
              {isStale && <Clock className="w-3 h-3" />}
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
  onMarkStatus,
}: {
  oppId: number;
  stages: Stage[];
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onMarkStatus?: (oppId: number, status: "won" | "lost") => void;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.pipelines.getOpportunity.useQuery({ id: oppId });
  const [note, setNote] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showQuickSend, setShowQuickSend] = useState(false);
  const [quickSendType, setQuickSendType] = useState<"sms" | "email">("sms");
  const [quickSendMsg, setQuickSendMsg] = useState("");
  const [quickSendSubject, setQuickSendSubject] = useState("");

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

  const quickSendMut = trpc.pipelines.quickSend.useMutation({
    onSuccess: () => {
      toast.success("Message sent successfully");
      setShowQuickSend(false);
      setQuickSendMsg("");
      setQuickSendSubject("");
      utils.pipelines.getOpportunity.invalidate({ id: oppId });
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
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {data.status === "open" && onMarkStatus && (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => onMarkStatus(data.id, "won")}>
                <Trophy className="w-3 h-3" /> Won
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => onMarkStatus(data.id, "lost")}>
                <XCircle className="w-3 h-3" /> Lost
              </Button>
            </>
          )}
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

      {/* Contact Linking */}
      <ContactLinker
        opportunityId={data.id}
        currentContactId={(data as any).contactId}
        onLinked={() => utils.pipelines.getOpportunity.invalidate({ id: oppId })}
      />

      {/* Quick Send Message */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 flex-1"
            onClick={() => { setQuickSendType("sms"); setShowQuickSend(v => !v || quickSendType !== "sms"); }}
          >
            <Phone className="w-3.5 h-3.5" />
            Send SMS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 flex-1"
            onClick={() => { setQuickSendType("email"); setShowQuickSend(v => !v || quickSendType !== "email"); }}
          >
            <Mail className="w-3.5 h-3.5" />
            Send Email
          </Button>
        </div>
        {showQuickSend && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                {quickSendType === "sms" ? <Phone className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                {quickSendType === "sms" ? "Send SMS" : "Send Email"}
              </p>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowQuickSend(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            {quickSendType === "email" && (
              <Input
                value={quickSendSubject}
                onChange={e => setQuickSendSubject(e.target.value)}
                placeholder="Subject line..."
                className="h-8 text-sm"
              />
            )}
            <Textarea
              value={quickSendMsg}
              onChange={e => setQuickSendMsg(e.target.value)}
              placeholder={quickSendType === "sms" ? "Type your SMS message (max 160 chars)..." : "Type your email body..."}
              rows={3}
              className="text-sm resize-none"
            />
            {quickSendType === "sms" && quickSendMsg.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">{quickSendMsg.length}/160</p>
            )}
            {!(data as any).contactId && (
              <p className="text-xs text-amber-500">⚠ Link a contact first to enable sending</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 gap-1.5 flex-1"
                disabled={!quickSendMsg.trim() || quickSendMut.isPending || !(data as any).contactId}
                onClick={() => quickSendMut.mutate({
                  opportunityId: data.id,
                  type: quickSendType,
                  message: quickSendMsg.trim(),
                  subject: quickSendType === "email" ? quickSendSubject || undefined : undefined,
                })}
              >
                <Send className="w-3.5 h-3.5" />
                {quickSendMut.isPending ? "Sending..." : "Send"}
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setShowQuickSend(false)}>Cancel</Button>
            </div>
          </div>
        )}
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

// ─── CSV Export Helper ────────────────────────────────────────────────────
function exportToCSV(opps: Opportunity[], stages: Stage[], pipelineName: string) {
  const headers = ["Name", "Contact", "Company", "Stage", "Value", "Status", "Priority", "Source", "Owner", "Expected Close", "Created"];
  const rows = opps.map(o => [
    o.name,
    o.contactName ?? "",
    o.companyName ?? "",
    stages.find(s => s.id === o.stageId)?.name ?? "",
    o.value ?? "",
    o.status,
    o.priority ?? "",
    o.source ?? "",
    o.ownerName ?? "",
    o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : "",
    new Date(o.createdAt).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pipelineName.replace(/\s+/g, "-").toLowerCase()}-opportunities-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${opps.length} opportunities to CSV`);
}

// ─── Create Pipeline Inline Form ───────────────────────────────────────────────
function CreatePipelineInline({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const createMut = trpc.pipelines.createPipeline.useMutation({
    onSuccess: () => { toast.success("Pipeline created!"); onSuccess(); },
    onError: e => toast.error(e.message),
  });
  return (
    <div className="flex items-center gap-2 mt-2 p-3 rounded-xl border border-border bg-muted/30 w-full max-w-sm">
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Pipeline name (e.g. DSCR Loans)"
        className="h-8 text-sm flex-1"
        autoFocus
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) createMut.mutate({ name: name.trim(), isDefault: true }); }}
      />
      <Button size="sm" className="h-8" onClick={() => { if (name.trim()) createMut.mutate({ name: name.trim(), isDefault: true }); }} disabled={createMut.isPending || !name.trim()}>
        Create
      </Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

// ─── Pipeline Analytics Component ────────────────────────────────────────────────────
function PipelineAnalytics({ pipelineId, pipelineName }: { pipelineId: number; pipelineName: string }) {
  const { data, isLoading } = trpc.pipelines.getAnalytics.useQuery({ pipelineId });
  const { data: goalData, refetch: refetchGoal } = trpc.pipelines.getGoal.useQuery({ pipelineId });
  const { data: lossReasonsData } = trpc.pipelines.getLossReasons.useQuery({ pipelineId });
  const { data: teamData } = trpc.pipelines.getTeamLeaderboard.useQuery({ pipelineId });
  const [analyticsTab, setAnalyticsTab] = useState<"overview" | "team">("overview");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const setGoalMut = trpc.pipelines.setGoal.useMutation({
    onSuccess: () => { toast.success("Goal saved"); setEditingGoal(false); refetchGoal(); },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading analytics...</div>;
  if (!data) return null;

  const { summary, stageStats, monthlyTrends } = data;
  const maxCount = Math.max(...stageStats.map(s => s.count), 1);
  const maxValue = Math.max(...stageStats.map(s => s.totalValue), 1);
  const monthlyGoal = goalData?.monthlyGoal ?? null;
  const currentMonthWon = (() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return monthlyTrends.find(t => t.month === key)?.value ?? 0;
  })();
  const goalPct = monthlyGoal && monthlyGoal > 0 ? Math.min(100, Math.round((currentMonthWon / monthlyGoal) * 100)) : null;

  return (
    <div className="flex-1 overflow-auto space-y-6 pb-6">
      {/* Analytics sub-tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setAnalyticsTab("overview")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            analyticsTab === "overview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setAnalyticsTab("team")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            analyticsTab === "team" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Team Leaderboard
        </button>
      </div>

      {/* Team Leaderboard Tab */}
      {analyticsTab === "team" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Team Leaderboard</h3>
            <Badge variant="secondary" className="text-xs ml-auto">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Badge>
          </div>
          {!teamData || teamData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No team data yet. Assign owners to opportunities to see the leaderboard.</p>
          ) : (
            <div className="space-y-3">
              {teamData.map((member, idx) => (
                <div key={member.ownerId} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    idx === 0 ? "bg-amber-100 text-amber-700" :
                    idx === 1 ? "bg-slate-100 text-slate-600" :
                    idx === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{member.ownerName}</p>
                    <p className="text-xs text-muted-foreground">{member.open} open · {member.lost} lost</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-600">{member.won} won</p>
                    <p className="text-xs text-muted-foreground">{member.winRate}% win rate</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-sm font-semibold">{formatCurrency(String(member.wonValue))}</p>
                    <p className="text-xs text-muted-foreground">won value</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overview Tab */}
      {analyticsTab === "overview" && (<>
      {/* Monthly Goal Progress */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Monthly Revenue Goal</h3>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setGoalInput(String(monthlyGoal ?? "")); setEditingGoal(true); }}>
            <Pencil className="w-3 h-3" />
            {monthlyGoal ? "Edit Goal" : "Set Goal"}
          </Button>
        </div>
        {editingGoal ? (
          <div className="flex gap-2">
            <Input
              type="number"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder="e.g. 500000"
              className="h-8 text-sm"
              autoFocus
            />
            <Button size="sm" className="h-8" disabled={setGoalMut.isPending} onClick={() => setGoalMut.mutate({ pipelineId, monthlyGoal: parseFloat(goalInput) || 0 })}>Save</Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingGoal(false)}>Cancel</Button>
          </div>
        ) : monthlyGoal ? (
          <div className="space-y-2">
            <div className="flex items-end justify-between text-sm">
              <span className="text-muted-foreground">This month: <span className="font-bold text-foreground">{formatCurrency(String(currentMonthWon))}</span></span>
              <span className="text-muted-foreground">Goal: <span className="font-bold text-foreground">{formatCurrency(String(monthlyGoal))}</span></span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${goalPct! >= 100 ? "bg-emerald-500" : goalPct! >= 70 ? "bg-blue-500" : "bg-amber-500"}`}
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {goalPct! >= 100 ? "🎉 Goal achieved!" : `${goalPct}% of monthly goal reached`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No goal set. Click "Set Goal" to track monthly revenue progress.</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Deals", value: summary.total, icon: <Kanban className="w-4 h-4" />, color: "text-blue-500" },
          { label: "Win Rate", value: `${summary.winRate}%`, icon: <Trophy className="w-4 h-4" />, color: "text-emerald-500" },
          { label: "Won Value", value: formatCurrency(String(summary.wonValue)), icon: <CircleDollarSign className="w-4 h-4" />, color: "text-emerald-500" },
          { label: "Pipeline Value", value: formatCurrency(String(summary.totalValue)), icon: <TrendingUp className="w-4 h-4" />, color: "text-primary" },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`mb-2 ${card.color}`}>{card.icon}</div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Stage funnel */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">Stage Breakdown</h3>
        <div className="space-y-3">
          {stageStats.filter(s => s.count > 0).map(stage => (
            <div key={stage.stageId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.stageColor }} />
                  <span className="font-medium">{stage.stageName}</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{stage.count} deals</span>
                  <span>{formatCurrency(String(stage.totalValue))}</span>
                  <span className="text-xs">{stage.avgDaysInStage}d avg</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round((stage.count / maxCount) * 100)}%`, backgroundColor: stage.stageColor }}
                />
              </div>
            </div>
          ))}
          {stageStats.every(s => s.count === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No opportunities in any stage yet.</p>
          )}
        </div>
      </div>

      {/* Monthly trends */}
      {monthlyTrends.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-4">Monthly Trends (Last 6 Months)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left pb-2 font-semibold">Month</th>
                  <th className="text-right pb-2 font-semibold text-emerald-500">Won</th>
                  <th className="text-right pb-2 font-semibold text-red-400">Lost</th>
                  <th className="text-right pb-2 font-semibold text-blue-500">Open</th>
                  <th className="text-right pb-2 font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map(row => (
                  <tr key={row.month} className="border-b border-border/50 last:border-0">
                    <td className="py-2 text-sm">{new Date(row.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                    <td className="py-2 text-right font-semibold text-emerald-500">{row.won}</td>
                    <td className="py-2 text-right font-semibold text-red-400">{row.lost}</td>
                    <td className="py-2 text-right font-semibold text-blue-500">{row.open}</td>
                    <td className="py-2 text-right">{formatCurrency(String(row.value))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stage value distribution */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">Value by Stage</h3>
        <div className="space-y-2">
          {stageStats.filter(s => s.totalValue > 0).map(stage => (
            <div key={stage.stageId} className="flex items-center gap-3">
              <span className="text-xs w-32 truncate text-muted-foreground">{stage.stageName}</span>
              <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                <div
                  className="h-full rounded transition-all flex items-center justify-end pr-2"
                  style={{ width: `${Math.round((stage.totalValue / maxValue) * 100)}%`, backgroundColor: stage.stageColor + "cc" }}
                >
                  <span className="text-xs font-semibold text-white">{formatCurrency(String(stage.totalValue))}</span>
                </div>
              </div>
            </div>
          ))}
          {stageStats.every(s => s.totalValue === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No deal values recorded yet.</p>
          )}
        </div>
      </div>

      {/* Loss Reasons Breakdown */}
      {lossReasonsData && lossReasonsData.length > 0 && (() => {
        const maxLoss = Math.max(...lossReasonsData.map(r => r.count), 1);
        return (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold">Loss Reasons Breakdown</h3>
              <Badge variant="secondary" className="text-xs ml-auto">{lossReasonsData.reduce((s, r) => s + r.count, 0)} lost deals</Badge>
            </div>
            <div className="space-y-2.5">
              {lossReasonsData.map(r => (
                <div key={r.reason} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{r.reason}</span>
                    <span className="text-muted-foreground">{r.count} ({r.pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400 transition-all"
                      style={{ width: `${Math.round((r.count / maxLoss) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      </>)}
    </div>
  );
}

// ─── Stage Manager Dialog ────────────────────────────────────────────────────
function StageManagerDialog({
  pipeline,
  open,
  onClose,
}: {
  pipeline: Pipeline;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#6366f1");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const addMut = trpc.pipelines.addStage.useMutation({
    onSuccess: () => {
      toast.success("Stage added");
      setNewStageName("");
      utils.pipelines.listPipelines.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const updateMut = trpc.pipelines.updateStage.useMutation({
    onSuccess: () => {
      toast.success("Stage updated");
      setEditingId(null);
      utils.pipelines.listPipelines.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const deleteMut = trpc.pipelines.deleteStage.useMutation({
    onSuccess: () => {
      toast.success("Stage deleted");
      utils.pipelines.listPipelines.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const [editingThresholds, setEditingThresholds] = useState(false);
  const [warningDays, setWarningDays] = useState("14");
  const [criticalDays, setCriticalDays] = useState("30");

  const { data: thresholds } = trpc.pipelines.getThresholds.useQuery({ pipelineId: pipeline.id });
  const setThresholdsMut = trpc.pipelines.setThresholds.useMutation({
    onSuccess: () => { toast.success("Thresholds saved"); setEditingThresholds(false); utils.pipelines.getThresholds.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const stages = [...(pipeline.stages ?? [])].sort((a, b) => a.stageOrder - b.stageOrder);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Stages — {pipeline.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {stages.map((stage, idx) => (
            <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-grab" />
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
              {editingId === stage.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                  />
                  <Button size="sm" className="h-7 px-2 text-xs" onClick={() => updateMut.mutate({ id: stage.id, name: editName, color: editColor })} disabled={updateMut.isPending}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{stage.name}</span>
                  <span className="text-xs text-muted-foreground">{stage.probability}%</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(stage.id); setEditName(stage.name); setEditColor(stage.color); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate({ id: stage.id })} disabled={deleteMut.isPending}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            value={newStageName}
            onChange={e => setNewStageName(e.target.value)}
            placeholder="New stage name..."
            className="h-8 text-sm flex-1"
            onKeyDown={e => { if (e.key === "Enter" && newStageName.trim()) addMut.mutate({ pipelineId: pipeline.id, name: newStageName.trim(), color: newStageColor }); }}
          />
          <input
            type="color"
            value={newStageColor}
            onChange={e => setNewStageColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border p-0.5"
          />
          <Button size="sm" className="h-8" onClick={() => { if (newStageName.trim()) addMut.mutate({ pipelineId: pipeline.id, name: newStageName.trim(), color: newStageColor }); }} disabled={addMut.isPending || !newStageName.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
        {/* Deal Age Thresholds */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Deal Age Alerts</span>
            </div>
            {!editingThresholds && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setWarningDays(String(thresholds?.staleWarningDays ?? 14)); setCriticalDays(String(thresholds?.staleCriticalDays ?? 30)); setEditingThresholds(true); }}>
                <Pencil className="w-3 h-3 mr-1" /> Edit
              </Button>
            )}
          </div>
          {editingThresholds ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-500 w-20">Warning after</span>
                <Input type="number" value={warningDays} onChange={e => setWarningDays(e.target.value)} className="h-7 text-xs w-20" min={1} max={365} />
                <span className="text-xs text-muted-foreground">days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500 w-20">Critical after</span>
                <Input type="number" value={criticalDays} onChange={e => setCriticalDays(e.target.value)} className="h-7 text-xs w-20" min={1} max={365} />
                <span className="text-xs text-muted-foreground">days</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" disabled={setThresholdsMut.isPending} onClick={() => setThresholdsMut.mutate({ pipelineId: pipeline.id, staleWarningDays: parseInt(warningDays) || 14, staleCriticalDays: parseInt(criticalDays) || 30 })}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingThresholds(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              <span className="text-amber-500 font-medium">{thresholds?.staleWarningDays ?? 14}d</span> warning &nbsp;·&nbsp; <span className="text-red-500 font-medium">{thresholds?.staleCriticalDays ?? 30}d</span> critical
            </p>
          )}
        </div>
        <Button variant="outline" className="w-full mt-2" onClick={onClose}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contact Linker ───────────────────────────────────────────────────────────
function ContactLinker({ opportunityId, currentContactId, onLinked }: { opportunityId: number; currentContactId?: number | null; onLinked: () => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data: results = [], isFetching } = trpc.pipelines.searchContacts.useQuery(
    { query },
    { enabled: query.length >= 2 }
  );

  const linkMut = trpc.pipelines.linkContact.useMutation({
    onSuccess: () => {
      toast.success("Contact linked");
      setOpen(false);
      setQuery("");
      onLinked();
    },
    onError: e => toast.error(e.message),
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Linked Contact</Label>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setOpen(o => !o)}>
          <Link2 className="w-3 h-3" />
          {currentContactId ? "Change" : "Link Contact"}
        </Button>
      </div>
      {currentContactId && !open && (
        <p className="text-xs text-muted-foreground">Contact ID: {currentContactId} — <button className="text-primary underline" onClick={() => linkMut.mutate({ opportunityId, contactId: null })}>Unlink</button></p>
      )}
      {open && (
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search contacts by name or email..."
              className="h-8 text-sm pl-8"
              autoFocus
            />
          </div>
          {isFetching && <p className="text-xs text-muted-foreground">Searching...</p>}
          {results.length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
              {results.map(c => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                  onClick={() => linkMut.mutate({ opportunityId, contactId: c.id })}
                >
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </button>
              ))}
            </div>
          )}
          {query.length >= 2 && results.length === 0 && !isFetching && (
            <p className="text-xs text-muted-foreground">No contacts found for "{query}"</p>
          )}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Pipeline() {
  const utils = trpc.useUtils();
  const [view, setView] = useState<"kanban" | "list" | "analytics">("kanban");
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "won" | "lost">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeOppId, setActiveOppId] = useState<number | null>(null); // detail panel
  const [addDialogStageId, setAddDialogStageId] = useState<number | null>(null);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [dragActiveId, setDragActiveId] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [showStageManager, setShowStageManager] = useState(false);
  const [reasonModal, setReasonModal] = useState<{ oppId: number; status: "won" | "lost" } | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [reasonNotes, setReasonNotes] = useState("");

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

  const updateStatusMut = trpc.pipelines.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      setReasonModal(null);
      setReasonInput("");
      setReasonNotes("");
      utils.pipelines.listOpportunities.invalidate();
      utils.pipelines.getOpportunity.invalidate();
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
            <Button variant="outline" className="gap-2" onClick={() => setShowCreatePipeline(true)}>
              <Plus className="w-4 h-4" />
              Create Pipeline
            </Button>
          </div>
          {showCreatePipeline && (
            <CreatePipelineInline onSuccess={() => { setShowCreatePipeline(false); utils.pipelines.listPipelines.invalidate(); }} onCancel={() => setShowCreatePipeline(false)} />
          )}
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
                title="Kanban view"
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>
              <button
                className={`px-2.5 py-1.5 text-xs transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setView("list")}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                className={`px-2.5 py-1.5 text-xs transition-colors ${view === "analytics" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setView("analytics")}
                title="Analytics"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stage Manager */}
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowStageManager(true)}>
              <Settings2 className="w-3.5 h-3.5" />
              Stages
            </Button>

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
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0 kanban-board-scroll">
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

        {/* ── Analytics View ── */}
        {view === "analytics" && activePipeline && (
          <PipelineAnalytics pipelineId={activePipeline.id} pipelineName={activePipeline.name} />
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
                  <th className="py-2.5 pr-4 text-right font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                    <button
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => exportToCSV(rawOpps, stages, activePipeline?.name ?? "pipeline")}
                      title="Export to CSV"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Export
                    </button>
                  </th>
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

      {/* ── Opportunity Detail Sheet (BottomSheet on mobile, side sheet on desktop) ── */}
      <BottomSheet
        open={activeOppId !== null}
        onClose={() => setActiveOppId(null)}
        title="Opportunity Details"
        maxHeightPct={92}
      >
        {activeOppId !== null && (
          <div className="px-1">
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
              onMarkStatus={(id, status) => setReasonModal({ oppId: id, status })}
            />
          </div>
        )}
      </BottomSheet>

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

      {/* ── Stage Manager Dialog ── */}
      {activePipeline && (
        <StageManagerDialog
          pipeline={activePipeline}
          open={showStageManager}
          onClose={() => { setShowStageManager(false); refreshAll(); }}
        />
      )}

      {/* ── Won/Lost Reason Dialog ── */}
      <Dialog open={reasonModal !== null} onOpenChange={open => { if (!open) { setReasonModal(null); setReasonInput(""); setReasonNotes(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reasonModal?.status === "won"
                ? <><Trophy className="w-4 h-4 text-emerald-500" /> Mark as Won</>
                : <><XCircle className="w-4 h-4 text-red-400" /> Mark as Lost</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Reason {reasonModal?.status === "lost" ? "(required)" : "(optional)"}</Label>
              <Select value={reasonInput} onValueChange={setReasonInput}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {reasonModal?.status === "won" ? (
                    <>
                      <SelectItem value="Best price">Best price</SelectItem>
                      <SelectItem value="Best product fit">Best product fit</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Relationship">Relationship</SelectItem>
                      <SelectItem value="Speed of close">Speed of close</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Price too high">Price too high</SelectItem>
                      <SelectItem value="Chose competitor">Chose competitor</SelectItem>
                      <SelectItem value="No longer interested">No longer interested</SelectItem>
                      <SelectItem value="Timing not right">Timing not right</SelectItem>
                      <SelectItem value="Could not qualify">Could not qualify</SelectItem>
                      <SelectItem value="No response">No response</SelectItem>
                      <SelectItem value="Budget constraints">Budget constraints</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Additional notes (optional)</Label>
              <Textarea
                value={reasonNotes}
                onChange={e => setReasonNotes(e.target.value)}
                placeholder="Any additional context..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                disabled={updateStatusMut.isPending || (reasonModal?.status === "lost" && !reasonInput)}
                onClick={() => {
                  if (!reasonModal) return;
                  updateStatusMut.mutate({
                    opportunityId: reasonModal.oppId,
                    status: reasonModal.status,
                    closedReason: reasonInput || undefined,
                    closedReasonNotes: reasonNotes || undefined,
                  });
                }}
              >
                {updateStatusMut.isPending ? "Saving..." : `Confirm ${reasonModal?.status === "won" ? "Won" : "Lost"}`}
              </Button>
              <Button variant="outline" onClick={() => { setReasonModal(null); setReasonInput(""); setReasonNotes(""); }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
