import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Settings,
  Zap,
  Mail,
  MessageSquare,
  Clock,
  GitBranch,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Copy,
  LayoutTemplate,
  Workflow,
  Loader2,
  Search,
} from "lucide-react";

// ─── Trigger labels ───────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  lead_created: { label: "New Lead", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  lead_status_change: { label: "Status Change", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  lead_tag_added: { label: "Tag Added", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  lead_score_changed: { label: "Score Change", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  appointment_booking: { label: "Appt Booked", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  appointment_missed: { label: "Appt Missed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  manual: { label: "Manual", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
  time_based: { label: "Scheduled", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  form_submitted: { label: "Form Submit", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  webinar_registration: { label: "Webinar Reg.", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  email_opened: { label: "Email Opened", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  email_clicked: { label: "Email Clicked", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  sms_reply_received: { label: "SMS Reply", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  datacrawl_import: { label: "Data Import", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
};

const CATEGORY_COLORS: Record<string, string> = {
  lead_nurture: "text-blue-600",
  refi: "text-amber-600",
  appointment: "text-green-600",
  partner: "text-purple-600",
  retention: "text-teal-600",
  default: "text-slate-500",
};

// ─── Step type icons ──────────────────────────────────────────────────────────

function StepIcon({ type }: { type: string }) {
  const icons: Record<string, any> = {
    email: Mail,
    sms: MessageSquare,
    wait: Clock,
    condition: GitBranch,
    vapi_call: Zap,
    tag_lead: Zap,
    update_status: CheckCircle2,
    default: Zap,
  };
  const Icon = icons[type] || icons.default;
  return <Icon className="h-3 w-3" />;
}

// ─── Workflow card ────────────────────────────────────────────────────────────

function WorkflowCard({
  workflow,
  onToggle,
  onDelete,
  onEdit,
}: {
  workflow: any;
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}) {
  const triggerInfo = TRIGGER_LABELS[workflow.trigger] || { label: workflow.trigger, color: "bg-slate-100 text-slate-700" };

  return (
    <Card className={`transition-all hover:shadow-md ${workflow.isActive ? "border-l-4 border-l-green-500" : "border-l-4 border-l-slate-200 dark:border-l-slate-700"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {workflow.name}
              </h3>
              <Badge className={`text-[10px] px-1.5 py-0 ${triggerInfo.color}`}>
                {triggerInfo.label}
              </Badge>
              {workflow.isActive ? (
                <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  ● Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-400">
                  ○ Inactive
                </Badge>
              )}
            </div>

            {workflow.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{workflow.description}</p>
            )}

            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> {workflow.stepCount || 0} steps
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> {workflow.enrolledCount || 0} enrolled
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {workflow.completedCount || 0} completed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onToggle(workflow.id, !workflow.isActive)}
              title={workflow.isActive ? "Pause workflow" : "Activate workflow"}
            >
              {workflow.isActive
                ? <Pause className="h-3.5 w-3.5 text-amber-500" />
                : <Play className="h-3.5 w-3.5 text-green-500" />
              }
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEdit(workflow.id)}
              title="Edit in visual builder"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onDelete(workflow.id)}
              title="Delete workflow"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  index,
  onInstall,
  isInstalling,
}: {
  template: any;
  index: number;
  onInstall: (index: number) => void;
  isInstalling: boolean;
}) {
  const triggerInfo = TRIGGER_LABELS[template.trigger] || { label: template.trigger, color: "bg-slate-100 text-slate-700" };
  const categoryColor = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.default;

  const categoryIcons: Record<string, any> = {
    lead_nurture: TrendingUp,
    refi: TrendingUp,
    appointment: CheckCircle2,
    partner: Users,
    retention: Users,
  };
  const CategoryIcon = categoryIcons[template.category] || Zap;

  return (
    <Card className="hover:shadow-md transition-all border-dashed hover:border-solid">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700`}>
              <CategoryIcon className={`h-4 w-4 ${categoryColor}`} />
            </div>
            <div>
              <CardTitle className="text-sm">{template.name}</CardTitle>
              <Badge className={`text-[10px] px-1.5 py-0 mt-0.5 ${triggerInfo.color}`}>
                {triggerInfo.label}
              </Badge>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {template.stepCount} steps
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-3">{template.description}</p>

        {/* Step preview */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {template.steps.slice(0, 5).map((step: any, i: number) => (
            <div key={i} className="flex items-center gap-1">
              <div className="p-1 rounded bg-slate-100 dark:bg-slate-700">
                <StepIcon type={step.stepType} />
              </div>
              {i < Math.min(template.steps.length - 1, 4) && (
                <ChevronRight className="h-2.5 w-2.5 text-slate-300" />
              )}
            </div>
          ))}
          {template.steps.length > 5 && (
            <span className="text-[10px] text-muted-foreground">+{template.steps.length - 5} more</span>
          )}
        </div>

        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5"
          onClick={() => onInstall(index)}
          disabled={isInstalling}
        >
          {isInstalling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Use This Template
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkflowAutomations() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [installingIndex, setInstallingIndex] = useState<number | null>(null);

  const { data: workflows = [], isLoading, refetch } = trpc.workflows.list.useQuery();
  const { data: templates = [] } = trpc.workflows.getTemplates.useQuery();
  const { data: stats } = trpc.workflows.getDashboardStats.useQuery();

  const toggleMutation = trpc.workflows.toggle.useMutation();
  const deleteMutation = trpc.workflows.delete.useMutation();
  const installMutation = trpc.workflows.installTemplate.useMutation();
  const utils = trpc.useUtils();

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.description?.toLowerCase().includes(search.toLowerCase())
  );

  const activeWorkflows = filteredWorkflows.filter(w => w.isActive);
  const inactiveWorkflows = filteredWorkflows.filter(w => !w.isActive);

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, isActive });
      await utils.workflows.list.invalidate();
      await utils.workflows.getDashboardStats.invalidate();
      toast.success(isActive ? "Workflow activated!" : "Workflow paused");
    } catch {
      toast.error("Failed to update workflow");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      await utils.workflows.list.invalidate();
      await utils.workflows.getDashboardStats.invalidate();
      toast.success("Workflow deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete workflow");
    }
  };

  const handleInstallTemplate = async (index: number) => {
    setInstallingIndex(index);
    try {
      const result = await installMutation.mutateAsync({ templateIndex: index });
      await utils.workflows.list.invalidate();
      await utils.workflows.getDashboardStats.invalidate();
      toast.success("Template installed! Opening builder...");
      navigate(`/workflows/${result.id}/builder`);
    } catch {
      toast.error("Failed to install template");
    } finally {
      setInstallingIndex(null);
    }
  };

  return (
    <DashboardLayout>
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            Workflow Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build automated sequences that run in the background — from lead creation to closed deal.
          </p>
        </div>
        <Button
          onClick={() => navigate("/workflows/new/builder")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> New Workflow
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Workflows", value: stats?.totalWorkflows ?? 0, icon: Workflow, color: "text-slate-600" },
          { label: "Active", value: stats?.activeWorkflows ?? 0, icon: Play, color: "text-green-600" },
          { label: "Leads Enrolled", value: stats?.activeExecutions ?? 0, icon: Users, color: "text-blue-600" },
          { label: "Completed", value: stats?.completedExecutions ?? 0, icon: CheckCircle2, color: "text-teal-600" },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-700`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main content */}
      <Tabs defaultValue="my-workflows">
        <TabsList className="mb-4">
          <TabsTrigger value="my-workflows" className="gap-2">
            <Workflow className="h-3.5 w-3.5" /> My Workflows
            {workflows.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{workflows.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-3.5 w-3.5" /> Templates
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{templates.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-workflows" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search workflows..."
              className="pl-9 h-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
              <Workflow className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">No workflows yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Create your first automation or start from a template
              </p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={() => navigate("/workflows/new/builder")} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Build from Scratch
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeWorkflows.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" /> Active ({activeWorkflows.length})
                  </h3>
                  <div className="space-y-2">
                    {activeWorkflows.map(w => (
                      <WorkflowCard
                        key={w.id}
                        workflow={w}
                        onToggle={handleToggle}
                        onDelete={id => setDeleteId(id)}
                        onEdit={id => navigate(`/workflows/${id}/builder`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {inactiveWorkflows.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-slate-300" /> Inactive ({inactiveWorkflows.length})
                  </h3>
                  <div className="space-y-2">
                    {inactiveWorkflows.map(w => (
                      <WorkflowCard
                        key={w.id}
                        workflow={w}
                        onToggle={handleToggle}
                        onDelete={id => setDeleteId(id)}
                        onEdit={id => navigate(`/workflows/${id}/builder`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Pre-built automation sequences ready to customize for your business. Install a template to open it in the visual builder.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template: any, index: number) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                onInstall={handleInstallTemplate}
                isInstalling={installingIndex === index}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workflow and stop all active executions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </DashboardLayout>
  );
}
