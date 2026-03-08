import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Phone,
  Mail,
  DollarSign,
  GripVertical,
  User,
  Clock,
  TrendingDown,
} from "lucide-react";
import { Link } from "wouter";

// Pipeline status columns in order
export const PIPELINE_COLUMNS = [
  { id: "new", label: "New", color: "bg-amber-500", textColor: "text-amber-50" },
  { id: "contacted", label: "Contacted", color: "bg-blue-500", textColor: "text-blue-50" },
  { id: "qualified", label: "Qualified", color: "bg-cyan-500", textColor: "text-cyan-50" },
  { id: "appointment_set", label: "Appt Set", color: "bg-purple-500", textColor: "text-purple-50" },
  { id: "appointment_completed", label: "Appt Done", color: "bg-indigo-500", textColor: "text-indigo-50" },
  { id: "closed_won", label: "Won", color: "bg-emerald-500", textColor: "text-emerald-50" },
  { id: "closed_lost", label: "Lost", color: "bg-red-500", textColor: "text-red-50" },
] as const;

type LeadItem = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  status: string;
  loanAmount?: string | null;
  probability?: number | null;
  contactType?: string | null;
  partnerTier?: string | null;
  assignedToUserId?: number | null;
  scoreTier?: string | null;
  createdAt: Date | string;
  refiProspect?: boolean | null;
};

type KanbanBoardProps = {
  leads: LeadItem[];
  onStatusChange: (leadId: number, newStatus: string) => void;
  isReadOnly?: boolean;
};

function formatCurrency(amount: string | number | null | undefined): string {
  if (!amount) return "";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getScoreTierColor(tier: string | null | undefined) {
  switch (tier) {
    case "hot": return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    case "warm": return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "cold": return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    default: return "bg-muted text-muted-foreground";
  }
}

function getContactTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "real_estate_agent": return "RE Agent";
    case "attorney": return "Attorney";
    case "insurance_agent": return "Insurance";
    case "title_company": return "Title Co.";
    case "builder_developer": return "Builder";
    case "lender": return "Lender";
    case "borrower": return "Borrower";
    default: return null;
  }
}

// ─── Sortable Lead Card ────────────────────────────────────────────────────
function SortableLeadCard({ lead, isReadOnly }: { lead: LeadItem; isReadOnly?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `lead-${lead.id}`,
    data: { lead, type: "lead" },
    disabled: isReadOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <LeadCard lead={lead} dragHandleProps={{ ...attributes, ...listeners }} isReadOnly={isReadOnly} />
    </div>
  );
}

// ─── Lead Card ─────────────────────────────────────────────────────────────
function LeadCard({
  lead,
  dragHandleProps,
  isReadOnly,
}: {
  lead: LeadItem;
  dragHandleProps?: any;
  isReadOnly?: boolean;
}) {
  const contactTypeLabel = getContactTypeLabel(lead.contactType);
  const loanAmountStr = formatCurrency(lead.loanAmount);

  return (
    <Link href={`/leads/${lead.id}`}>
      <Card className="p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow border border-border/60 bg-card">
        <div className="flex items-start gap-2">
          {!isReadOnly && (
            <div
              {...dragHandleProps}
              className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground"
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2 mb-1.5">
              <p className="font-medium text-sm truncate">
                {lead.firstName} {lead.lastName}
              </p>
              {lead.scoreTier && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${getScoreTierColor(lead.scoreTier)}`}>
                  {lead.scoreTier}
                </Badge>
              )}
            </div>

            {/* Contact info */}
            <div className="space-y-1 text-xs text-muted-foreground">
              {lead.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span className="truncate">{lead.phone}</span>
                </div>
              )}
              {lead.source && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 shrink-0" />
                  <span className="truncate">{lead.source}</span>
                </div>
              )}
            </div>

            {/* Bottom row: loan amount, probability, tags */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {loanAmountStr && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                  <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                  {loanAmountStr}
                </Badge>
              )}
              {lead.probability != null && lead.probability > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {lead.probability}%
                </Badge>
              )}
              {contactTypeLabel && contactTypeLabel !== "Borrower" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  {contactTypeLabel}
                </Badge>
              )}
              {lead.refiProspect && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                  <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                  Refi
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Droppable Column ──────────────────────────────────────────────────────
function KanbanColumn({
  column,
  leads,
  totalValue,
  isReadOnly,
}: {
  column: (typeof PIPELINE_COLUMNS)[number];
  leads: LeadItem[];
  totalValue: number;
  isReadOnly?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", status: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[260px] min-w-[260px] shrink-0 rounded-lg transition-colors ${
        isOver ? "bg-primary/5 ring-2 ring-primary/20" : "bg-muted/30"
      }`}
    >
      {/* Column header */}
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
            <h3 className="font-semibold text-sm">{column.label}</h3>
          </div>
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {leads.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground ml-4.5">
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Cards area */}
      <div className="flex-1 px-2 pb-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[80px]">
        <SortableContext
          items={leads.map((l) => `lead-${l.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} isReadOnly={isReadOnly} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground/60">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Board ─────────────────────────────────────────────────────
export default function KanbanBoard({ leads, onStatusChange, isReadOnly }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group leads by status
  const columnData = useMemo(() => {
    const grouped: Record<string, LeadItem[]> = {};
    for (const col of PIPELINE_COLUMNS) {
      grouped[col.id] = [];
    }
    for (const lead of leads) {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead);
      }
    }
    return grouped;
  }, [leads]);

  // Calculate total value per column
  const columnValues = useMemo(() => {
    const values: Record<string, number> = {};
    for (const col of PIPELINE_COLUMNS) {
      values[col.id] = columnData[col.id].reduce((sum, lead) => {
        const amt = lead.loanAmount ? parseFloat(String(lead.loanAmount)) : 0;
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
    }
    return values;
  }, [columnData]);

  const activeLead = useMemo(() => {
    if (!activeId) return null;
    const leadId = parseInt(activeId.replace("lead-", ""));
    return leads.find((l) => l.id === leadId) || null;
  }, [activeId, leads]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = parseInt((active.id as string).replace("lead-", ""));
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Determine target column
    let targetStatus: string | null = null;

    // Dropped on a column
    if (over.data?.current?.type === "column") {
      targetStatus = over.data.current.status;
    }
    // Dropped on another lead card
    else if (over.data?.current?.type === "lead") {
      targetStatus = over.data.current.lead.status;
    }
    // Dropped on a column id directly
    else if (typeof over.id === "string" && PIPELINE_COLUMNS.some((c) => c.id === over.id)) {
      targetStatus = over.id;
    }

    if (targetStatus && targetStatus !== lead.status) {
      onStatusChange(leadId, targetStatus);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
        {PIPELINE_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            leads={columnData[column.id]}
            totalValue={columnValues[column.id]}
            isReadOnly={isReadOnly}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="w-[240px]">
            <LeadCard lead={activeLead} isReadOnly />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
