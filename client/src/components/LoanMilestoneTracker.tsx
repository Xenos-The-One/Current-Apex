import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

type MilestoneStatus = "pending" | "in_progress" | "completed" | "blocked";

const statusConfig: Record<
  MilestoneStatus,
  { icon: React.ElementType; color: string; label: string; bg: string }
> = {
  pending: { icon: Circle, color: "text-muted-foreground", label: "Pending", bg: "bg-muted/30" },
  in_progress: { icon: Clock, color: "text-amber-500", label: "In Progress", bg: "bg-amber-500/10" },
  completed: { icon: CheckCircle2, color: "text-green-500", label: "Completed", bg: "bg-green-500/10" },
  blocked: { icon: AlertCircle, color: "text-red-500", label: "Blocked", bg: "bg-red-500/10" },
};

const statusCycle: MilestoneStatus[] = ["pending", "in_progress", "completed", "blocked"];

function nextStatus(current: MilestoneStatus): MilestoneStatus {
  const idx = statusCycle.indexOf(current);
  return statusCycle[(idx + 1) % statusCycle.length];
}

export default function LoanMilestoneTracker({ leadId }: { leadId: number }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

  const { data: milestones, refetch, isLoading } = trpc.milestonesTasks.getMilestones.useQuery(
    { leadId },
    { enabled: leadId > 0 }
  );

  const updateMutation = trpc.milestonesTasks.updateMilestone.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Failed to update milestone"),
  });

  const resetMutation = trpc.milestonesTasks.resetMilestones.useMutation({
    onSuccess: () => {
      toast.success("Milestones reset");
      refetch();
    },
    onError: () => toast.error("Failed to reset milestones"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const completedCount = milestones?.filter((m) => m.status === "completed").length ?? 0;
  const totalCount = milestones?.length ?? 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Loan Milestone Tracker
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} complete
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => resetMutation.mutate({ leadId })}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              Reset
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{progressPct}% complete</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {milestones?.map((milestone, idx) => {
          const cfg = statusConfig[milestone.status as MilestoneStatus];
          const Icon = cfg.icon;
          const isExpanded = expandedId === milestone.id;
          const isUpdating = updateMutation.isPending;

          return (
            <div
              key={milestone.id}
              className={`rounded-lg border border-border/40 transition-all ${cfg.bg}`}
            >
              <div
                className="flex items-center gap-2 p-2.5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : milestone.id)}
              >
                {/* Step number */}
                <span className="text-[10px] text-muted-foreground w-4 shrink-0 text-center">
                  {idx + 1}
                </span>

                {/* Status icon — click to cycle */}
                <button
                  className={`shrink-0 ${cfg.color} hover:opacity-70 transition-opacity`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = nextStatus(milestone.status as MilestoneStatus);
                    updateMutation.mutate({
                      milestoneId: milestone.id,
                      status: next,
                      notes: editingNotes[milestone.id] ?? milestone.notes ?? undefined,
                    });
                  }}
                  disabled={isUpdating}
                  title={`Click to advance to ${nextStatus(milestone.status as MilestoneStatus)}`}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </button>

                {/* Label */}
                <span
                  className={`text-xs font-medium flex-1 ${
                    milestone.status === "completed" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {milestone.milestoneLabel}
                </span>

                {/* Status badge */}
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 shrink-0 ${cfg.color} border-current/30`}
                >
                  {cfg.label}
                </Badge>

                {/* Expand toggle */}
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </div>

              {/* Expanded notes */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                  <Textarea
                    placeholder="Add notes for this milestone..."
                    className="text-xs min-h-[60px] resize-none"
                    value={
                      editingNotes[milestone.id] !== undefined
                        ? editingNotes[milestone.id]
                        : milestone.notes ?? ""
                    }
                    onChange={(e) =>
                      setEditingNotes((prev) => ({ ...prev, [milestone.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    {(["pending", "in_progress", "completed", "blocked"] as MilestoneStatus[]).map(
                      (s) => (
                        <Button
                          key={s}
                          variant={milestone.status === s ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-[10px] px-2 capitalize"
                          onClick={() =>
                            updateMutation.mutate({
                              milestoneId: milestone.id,
                              status: s,
                              notes: editingNotes[milestone.id] ?? milestone.notes ?? undefined,
                            })
                          }
                          disabled={isUpdating}
                        >
                          {s.replace("_", " ")}
                        </Button>
                      )
                    )}
                  </div>
                  {milestone.completedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Completed: {new Date(milestone.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
