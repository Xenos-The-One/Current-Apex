import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Flag,
  Loader2,
  AlertTriangle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: number;
  leadId: number;
  clientId: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assignedToUserId: number | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const priorityConfig = {
  high: { color: "text-red-500", badge: "bg-red-500/10 text-red-600 border-red-500/30", label: "High" },
  medium: { color: "text-amber-500", badge: "bg-amber-500/10 text-amber-600 border-amber-500/30", label: "Medium" },
  low: { color: "text-blue-500", badge: "bg-blue-500/10 text-blue-600 border-blue-500/30", label: "Low" },
};

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "completed" || task.status === "cancelled") return false;
  return new Date(task.dueDate) < new Date();
}

function formatDueDate(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LeadTaskManager({ leadId }: { leadId: number }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: tasks, refetch, isLoading } = trpc.milestonesTasks.getTasks.useQuery(
    { leadId },
    { enabled: leadId > 0 }
  );

  const createMutation = trpc.milestonesTasks.createTask.useMutation({
    onSuccess: () => {
      toast.success("Task created");
      setAddOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewPriority("medium");
      refetch();
    },
    onError: () => toast.error("Failed to create task"),
  });

  const updateMutation = trpc.milestonesTasks.updateTask.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Failed to update task"),
  });

  const deleteMutation = trpc.milestonesTasks.deleteTask.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
      refetch();
    },
    onError: () => toast.error("Failed to delete task"),
  });

  const activeTasks = tasks?.filter((t) => t.status !== "completed" && t.status !== "cancelled") ?? [];
  const completedTasks = tasks?.filter((t) => t.status === "completed" || t.status === "cancelled") ?? [];

  const overdueTasks = activeTasks.filter(isOverdue);
  const upcomingTasks = activeTasks.filter((t) => !isOverdue(t));

  function handleToggleComplete(task: Task) {
    updateMutation.mutate({
      taskId: task.id,
      status: task.status === "completed" ? "pending" : "completed",
    });
  }

  function renderTask(task: Task) {
    const pcfg = priorityConfig[task.status === "completed" ? "low" : task.priority];
    const overdue = isOverdue(task);

    return (
      <div
        key={task.id}
        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
          task.status === "completed"
            ? "bg-muted/20 border-border/20 opacity-60"
            : overdue
            ? "bg-red-500/5 border-red-500/20"
            : "bg-background border-border/40 hover:border-border/80"
        }`}
      >
        <Checkbox
          checked={task.status === "completed"}
          onCheckedChange={() => handleToggleComplete(task)}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-medium ${
              task.status === "completed" ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${pcfg.badge}`}>
              {pcfg.label}
            </Badge>
            {task.dueDate && (
              <span
                className={`text-[10px] flex items-center gap-0.5 ${
                  overdue ? "text-red-500 font-medium" : "text-muted-foreground"
                }`}
              >
                {overdue && <AlertTriangle className="h-2.5 w-2.5" />}
                <Calendar className="h-2.5 w-2.5" />
                {formatDueDate(task.dueDate)}
                {overdue && " (overdue)"}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 shrink-0"
          onClick={() => deleteMutation.mutate({ taskId: task.id })}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckSquare className="w-4 h-4 text-primary" />
              Tasks
              {activeTasks.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {activeTasks.length}
                </Badge>
              )}
              {overdueTasks.length > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 bg-red-500/15 text-red-600 border-red-500/30">
                  {overdueTasks.length} overdue
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3 w-3" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center py-4">
              <CheckSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No tasks yet</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs mt-1 gap-1"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-3 w-3" /> Add first task
              </Button>
            </div>
          ) : (
            <>
              {/* Overdue tasks */}
              {overdueTasks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide px-1">
                    Overdue
                  </p>
                  {overdueTasks.map(renderTask)}
                </div>
              )}

              {/* Upcoming tasks */}
              {upcomingTasks.length > 0 && (
                <div className="space-y-1">
                  {overdueTasks.length > 0 && (
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mt-2">
                      Upcoming
                    </p>
                  )}
                  {upcomingTasks.map(renderTask)}
                </div>
              )}

              {/* Completed tasks toggle */}
              {completedTasks.length > 0 && (
                <div className="pt-1">
                  <button
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${showCompleted ? "rotate-180" : ""}`}
                    />
                    {completedTasks.length} completed
                  </button>
                  {showCompleted && (
                    <div className="space-y-1 mt-1">{completedTasks.map(renderTask)}</div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Task Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Task Title *</label>
              <Input
                placeholder="e.g. Send pre-approval letter"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <Textarea
                placeholder="Additional details..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1 text-sm min-h-[60px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <Flag className="h-3 w-3 text-red-500" /> High
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <Flag className="h-3 w-3 text-amber-500" /> Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <Flag className="h-3 w-3 text-blue-500" /> Low
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() =>
                createMutation.mutate({
                  leadId,
                  title: newTitle,
                  description: newDescription || undefined,
                  dueDate: newDueDate || undefined,
                  priority: newPriority,
                })
              }
              disabled={createMutation.isPending || !newTitle.trim()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
