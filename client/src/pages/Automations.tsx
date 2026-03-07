import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowDown,
  Bot,
  Calendar,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Play,
  Plus,
  Settings,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TRIGGERS = [
  { value: "new_lead", label: "New Lead Created", icon: Plus },
  { value: "lead_stage_changed", label: "Lead Stage Changed", icon: ArrowDown },
  { value: "email_opened", label: "Email Opened", icon: Mail },
  { value: "email_clicked", label: "Email Link Clicked", icon: CheckCircle },
  { value: "appointment_booked", label: "Appointment Booked", icon: Calendar },
  { value: "appointment_completed", label: "Appointment Completed", icon: CheckCircle },
  { value: "form_submitted", label: "Form Submitted", icon: Tag },
  { value: "tag_added", label: "Tag Added to Lead", icon: Tag },
  { value: "inactivity", label: "Lead Inactivity (days)", icon: Clock },
];

const ACTIONS = [
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "send_sms", label: "Send SMS", icon: MessageSquare },
  { value: "assign_lead", label: "Assign Lead", icon: Tag },
  { value: "update_stage", label: "Update Pipeline Stage", icon: ArrowDown },
  { value: "add_tag", label: "Add Tag", icon: Tag },
  { value: "create_task", label: "Create Task", icon: CheckCircle },
  { value: "schedule_call", label: "Schedule AI Call", icon: Phone },
  { value: "wait", label: "Wait / Delay", icon: Clock },
  { value: "notify_agent", label: "Notify Agent", icon: Bot },
];

function ActionIcon({ type }: { type: string }) {
  const action = ACTIONS.find(a => a.value === type);
  const Icon = action?.icon || Zap;
  return <Icon className="w-4 h-4" />;
}

function TriggerIcon({ type }: { type: string }) {
  const trigger = TRIGGERS.find(t => t.value === type);
  const Icon = trigger?.icon || Zap;
  return <Icon className="w-4 h-4" />;
}

function CreateAutomationDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    triggerType: "new_lead",
    steps: [{ actionType: "send_email", config: { subject: "", body: "", delayHours: 0 } }],
  });

  const createMutation = trpc.automations.createWorkflow.useMutation({
    onSuccess: () => { toast.success("Automation created"); setOpen(false); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  const addStep = () => {
    setForm(f => ({ ...f, steps: [...f.steps, { actionType: "send_email", config: { subject: "", body: "", delayHours: 0 } }] }));
  };

  const removeStep = (i: number) => {
    setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  };

  const updateStep = (i: number, field: string, value: any) => {
    setForm(f => {
      const steps = [...f.steps];
      steps[i] = { ...steps[i], [field]: value };
      return { ...f, steps };
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New Automation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Workflow Automation</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ agencyId, name: form.name, description: form.description, trigger: form.triggerType as any, steps: form.steps.map((s, i) => ({ stepOrder: i, type: s.actionType as any, config: s.config })) }); }} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Automation Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1">
              <Label>Trigger Event</Label>
              <Select value={form.triggerType} onValueChange={v => setForm(f => ({ ...f, triggerType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Workflow Steps</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add Step
              </Button>
            </div>
            {form.steps.map((step, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                  {form.steps.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeStep(i)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Action</Label>
                    <Select value={step.actionType} onValueChange={v => updateStep(i, "actionType", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Delay (hours)</Label>
                    <Input
                      type="number" min="0" className="h-8 text-xs"
                      value={step.config.delayHours}
                      onChange={e => updateStep(i, "config", { ...step.config, delayHours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                {(step.actionType === "send_email") && (
                  <>
                    <Input className="text-xs h-8" placeholder="Email subject" value={step.config.subject}
                      onChange={e => updateStep(i, "config", { ...step.config, subject: e.target.value })} />
                    <Textarea className="text-xs" rows={2} placeholder="Email body" value={step.config.body}
                      onChange={e => updateStep(i, "config", { ...step.config, body: e.target.value })} />
                  </>
                )}
                {step.actionType === "send_sms" && (
                  <Textarea className="text-xs" rows={2} placeholder="SMS message (max 160 chars)" maxLength={160}
                    value={step.config.body} onChange={e => updateStep(i, "config", { ...step.config, body: e.target.value })} />
                )}
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Automation"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AutomationCard({ automation, agencyId, onRefetch }: { automation: any; agencyId: number; onRefetch: () => void }) {
  const toggleMutation = trpc.automations.updateWorkflow.useMutation({
    onSuccess: () => onRefetch(),
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.automations.deleteWorkflow.useMutation({
    onSuccess: () => { toast.success("Automation deleted"); onRefetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const trigger = TRIGGERS.find(t => t.value === automation.triggerType);

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${automation.isActive ? "bg-green-100" : "bg-gray-100"}`}>
              <Zap className={`w-4 h-4 ${automation.isActive ? "text-green-600" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">{automation.name}</p>
              <p className="text-xs text-muted-foreground">{trigger?.label || automation.triggerType}</p>
            </div>
          </div>
          <Switch
            checked={automation.isActive}
            onCheckedChange={() => toggleMutation.mutate({ id: automation.id, agencyId, isActive: !automation.isActive } as any)}
          />
        </div>

        {automation.description && (
          <p className="text-xs text-muted-foreground mt-2">{automation.description}</p>
        )}

        {/* Steps preview */}
        <div className="mt-3 flex items-center gap-1 flex-wrap">
          {(automation.steps || []).slice(0, 4).map((step: any, i: number) => (
            <div key={i} className="flex items-center gap-1">
              <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                <ActionIcon type={step.actionType} />
                <span className="text-xs">{ACTIONS.find(a => a.value === step.actionType)?.label || step.actionType}</span>
              </div>
              {i < (automation.steps?.length || 0) - 1 && i < 3 && <ArrowDown className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
          {(automation.steps?.length || 0) > 4 && (
            <span className="text-xs text-muted-foreground">+{automation.steps.length - 4} more</span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{automation.executionCount || 0} runs</span>
            <span>{automation.steps?.length || 0} steps</span>
          </div>
          <Button
            variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate({ id: automation.id, agencyId } as any)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Automations() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;

  const { data: automations, refetch } = trpc.automations.listWorkflows.useQuery({ agencyId });

  const active = automations?.filter((a: any) => a.isActive).length ?? 0;
  const totalRuns = automations?.reduce((s: number, a: any) => s + (a.executionCount || 0), 0) ?? 0;

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-4 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Workflow Automations</h1>
            <p className="text-muted-foreground text-sm">{automations?.length ?? 0} automations, {active} active</p>
          </div>
          <CreateAutomationDialog agencyId={agencyId} onSuccess={refetch} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total", value: automations?.length ?? 0 },
            { label: "Active", value: active },
            { label: "Total Runs", value: totalRuns },
            { label: "Avg Steps", value: automations?.length ? Math.round(automations.reduce((s: number, a: any) => s + (a.steps?.length || 0), 0) / automations.length) : 0 },
          ].map(({ label, value }) => (
            <div key={label} className="stat-card">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold font-display mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Automation cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {automations?.map((a: any) => (
            <AutomationCard key={a.id} automation={a} agencyId={agencyId} onRefetch={refetch} />
          ))}
          {automations?.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Zap className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No automations yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create your first workflow to automate lead follow-ups</p>
            </div>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
