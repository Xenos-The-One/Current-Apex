import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Star,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  appointment: Calendar,
  task: CheckCircle2,
};

export default function FollowUps() {
  const { agencyId } = useAgency();
  const [filter, setFilter] = useState<"all" | "overdue" | "today" | "upcoming">("all");

  const { data: tasks, isLoading, refetch } = trpc.leads.list.useQuery(
    { agencyId },
    { enabled: agencyId > 0 }
  );

  const completeTaskMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Task marked complete");
      refetch();
    },
  });

  const now = Date.now();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const allTasks = (tasks ?? []) as any[];

  const filtered = allTasks.filter((t: any) => {
    const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
    if (filter === "overdue") return due && due < now && t.status !== "completed";
    if (filter === "today") return due && due <= todayEnd.getTime() && due >= new Date().setHours(0, 0, 0, 0);
    if (filter === "upcoming") return due && due > todayEnd.getTime();
    return true;
  });

  const overdue = allTasks.filter((t: any) => {
    const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
    return due && due < now && t.status !== "completed";
  }).length;

  const todayCount = allTasks.filter((t: any) => {
    const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
    return due && due <= todayEnd.getTime() && due >= new Date().setHours(0, 0, 0, 0);
  }).length;

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Follow-Ups</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Suggested actions and reminders to keep your pipeline moving.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Overdue", value: overdue, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
            { label: "Due Today", value: todayCount, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Total Tasks", value: allTasks.length, icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Completed", value: allTasks.filter((t: any) => t.status === "completed").length, icon: Star, color: "text-green-500", bg: "bg-green-50" },
          ].map(card => (
            <Card key={card.label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
                  <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "overdue", "today", "upcoming"] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
              {f === "overdue" && overdue > 0 && (
                <Badge className="ml-1.5 h-4 min-w-4 text-xs bg-red-500 text-white border-0 px-1">{overdue}</Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
              <p className="font-semibold">You're all caught up!</p>
              <p className="text-sm text-muted-foreground">No follow-ups in this category right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((task: any) => {
              const Icon = ACTION_ICONS[task.taskType ?? "task"] ?? CheckCircle2;
              const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < now && task.status !== "completed";
              return (
                <Card key={task.id} className={`border shadow-sm transition-all hover:shadow-md ${task.status === "completed" ? "opacity-50" : ""}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? "bg-red-100" : "bg-primary/10"}`}>
                      <Icon className={`w-4 h-4 ${isOverdue ? "text-red-500" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{task.title}</p>
                        {task.priority && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                            {task.priority}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString()} {new Date(task.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {task.leadId && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" /> Lead #{task.leadId}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0 gap-1.5 text-xs"
                        onClick={() => completeTaskMutation.mutate({ id: task.id })}
                        disabled={completeTaskMutation.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
