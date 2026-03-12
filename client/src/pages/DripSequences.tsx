import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Mail, MessageSquare, Clock, Users, Play, Pause,
  Trash2, Edit, ChevronRight, BarChart2, Zap, ArrowRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SequenceStep {
  stepOrder: number;
  channel: "email" | "sms";
  delayHours: number;
  subject?: string;
  body: string;
}

// ─── Step Builder ─────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  onChange,
  onRemove,
}: {
  step: SequenceStep;
  index: number;
  onChange: (s: SequenceStep) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            {index + 1}
          </div>
          <span className="font-medium text-sm">Step {index + 1}</span>
          {step.channel === "email" ? (
            <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10">
              <Mail className="w-3 h-3 mr-1" /> Email
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
              <MessageSquare className="w-3 h-3 mr-1" /> SMS
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7 text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Channel</Label>
          <Select value={step.channel} onValueChange={(v) => onChange({ ...step, channel: v as "email" | "sms" })}>
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">
            <Clock className="w-3 h-3 inline mr-1" />
            Delay (hours after previous step)
          </Label>
          <Input
            type="number"
            min={0}
            value={step.delayHours}
            onChange={(e) => onChange({ ...step, delayHours: Number(e.target.value) })}
            className="h-8 mt-1"
          />
        </div>
      </div>

      {step.channel === "email" && (
        <div>
          <Label className="text-xs">Subject Line</Label>
          <Input
            value={step.subject ?? ""}
            onChange={(e) => onChange({ ...step, subject: e.target.value })}
            placeholder="e.g. Quick question about your investment property"
            className="h-8 mt-1"
          />
        </div>
      )}

      <div>
        <Label className="text-xs">
          Message Body
          <span className="text-muted-foreground ml-2 font-normal">
            Use {"{{firstName}}"}, {"{{bookingUrl}}"}, {"{{loanType}}"}
          </span>
        </Label>
        <Textarea
          value={step.body}
          onChange={(e) => onChange({ ...step, body: e.target.value })}
          rows={4}
          className="mt-1 text-sm"
          placeholder="Hi {{firstName}}, I wanted to follow up..."
        />
      </div>
    </div>
  );
}

// ─── Create / Edit Sequence Dialog ────────────────────────────────────────────

function SequenceDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leadType, setLeadType] = useState("all");
  const [triggerEvent, setTriggerEvent] = useState("lead_created");
  const [stopOnAppointment, setStopOnAppointment] = useState(true);
  const [stopOnReply, setStopOnReply] = useState(true);
  const [steps, setSteps] = useState<SequenceStep[]>([
    { stepOrder: 1, channel: "sms", delayHours: 0, body: "" },
  ]);

  const createMutation = trpc.dripSequences.createSequence.useMutation({
    onSuccess: () => {
      toast.success("Sequence created successfully!");
      onSaved();
      onClose();
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setName(""); setDescription(""); setLeadType("all");
    setTriggerEvent("lead_created"); setStopOnAppointment(true); setStopOnReply(true);
    setSteps([{ stepOrder: 1, channel: "sms", delayHours: 0, body: "" }]);
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { stepOrder: prev.length + 1, channel: "email", delayHours: 24, body: "" },
    ]);
  };

  const updateStep = (i: number, s: SequenceStep) => {
    setSteps((prev) => prev.map((x, idx) => (idx === i ? { ...s, stepOrder: i + 1 } : x)));
  };

  const removeStep = (i: number) => {
    setSteps((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepOrder: idx + 1 })));
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error("Sequence name is required");
    if (steps.some((s) => !s.body.trim())) return toast.error("All steps must have a message body");
    if (steps.some((s) => s.channel === "email" && !s.subject?.trim())) {
      return toast.error("All email steps must have a subject line");
    }
    createMutation.mutate({ name, description, leadType, triggerEvent, stopOnAppointment, stopOnReply, steps });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Follow-Up Sequence</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Sequence Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DSCR New Lead Follow-Up" className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this sequence does..." className="mt-1" />
            </div>
            <div>
              <Label>Lead Type</Label>
              <Select value={leadType} onValueChange={setLeadType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  <SelectItem value="dscr">DSCR Leads</SelectItem>
                  <SelectItem value="fix_flip">Fix &amp; Flip Leads</SelectItem>
                  <SelectItem value="old_lead">Old / Re-engagement Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Auto-Enroll Trigger</Label>
              <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_created">On Lead Created</SelectItem>
                  <SelectItem value="no_appointment_24h">No Appointment After 24h</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={stopOnAppointment} onCheckedChange={setStopOnAppointment} id="stop-appt" />
              <Label htmlFor="stop-appt" className="text-sm">Stop when appointment booked</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={stopOnReply} onCheckedChange={setStopOnReply} id="stop-reply" />
              <Label htmlFor="stop-reply" className="text-sm">Stop when lead replies</Label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Sequence Steps</Label>
              <Button variant="outline" size="sm" onClick={addStep}>
                <Plus className="w-4 h-4 mr-1" /> Add Step
              </Button>
            </div>
            {steps.map((step, i) => (
              <StepCard key={i} step={step} index={i} onChange={(s) => updateStep(i, s)} onRemove={() => removeStep(i)} />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sequence Card ────────────────────────────────────────────────────────────

function SequenceCard({
  seq,
  onSelect,
  onToggle,
}: {
  seq: any;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const leadTypeLabel: Record<string, string> = {
    dscr: "DSCR",
    fix_flip: "Fix & Flip",
    old_lead: "Old Leads",
    all: "All Leads",
  };

  const triggerLabel: Record<string, string> = {
    lead_created: "On Lead Created",
    no_appointment_24h: "No Appt After 24h",
    manual: "Manual Only",
  };

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{seq.name}</h3>
              <Badge variant={seq.isActive ? "default" : "secondary"} className="text-xs">
                {seq.isActive ? "Active" : "Paused"}
              </Badge>
              {seq.leadType && (
                <Badge variant="outline" className="text-xs">
                  {leadTypeLabel[seq.leadType] ?? seq.leadType}
                </Badge>
              )}
            </div>
            {seq.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{seq.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" /> {triggerLabel[seq.triggerEvent] ?? seq.triggerEvent}
              </span>
              <span className="flex items-center gap-1">
                <ArrowRight className="w-3 h-3" /> {seq.stepCount ?? 0} steps
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {seq.activeEnrollments ?? 0} active
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggle}
              title={seq.isActive ? "Pause sequence" : "Activate sequence"}
            >
              {seq.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSelect}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sequence Detail View ─────────────────────────────────────────────────────

function SequenceDetail({ sequenceId, onBack }: { sequenceId: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data: seq, isLoading } = trpc.dripSequences.getSequence.useQuery({ id: sequenceId });
  const { data: stats } = trpc.dripSequences.getEnrollmentStats.useQuery({ sequenceId });

  const toggleMutation = trpc.dripSequences.updateSequence.useMutation({
    onSuccess: () => { utils.dripSequences.getSequence.invalidate(); toast.success("Sequence updated"); },
  });
  const deleteMutation = trpc.dripSequences.deleteSequence.useMutation({
    onSuccess: () => { utils.dripSequences.listSequences.invalidate(); onBack(); toast.success("Sequence deactivated"); },
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!seq) return <div className="p-8 text-center text-muted-foreground">Sequence not found</div>;

  const channelIcon = (ch: string) =>
    ch === "email" ? <Mail className="w-4 h-4 text-blue-500" /> : <MessageSquare className="w-4 h-4 text-green-500" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{seq.name}</h2>
          {seq.description && <p className="text-sm text-muted-foreground">{seq.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleMutation.mutate({ id: seq.id, isActive: !seq.isActive })}
          >
            {seq.isActive ? <><Pause className="w-4 h-4 mr-1" /> Pause</> : <><Play className="w-4 h-4 mr-1" /> Activate</>}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Enrolled", value: stats.total, color: "text-foreground" },
            { label: "Active", value: stats.active, color: "text-blue-500" },
            { label: "Completed", value: stats.completed, color: "text-green-500" },
            { label: "Stopped", value: stats.stopped, color: "text-muted-foreground" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Steps */}
      <div>
        <h3 className="font-semibold mb-3">Sequence Steps ({seq.steps?.length ?? 0})</h3>
        <div className="space-y-3">
          {seq.steps?.map((step: any, i: number) => (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {i + 1}
                </div>
                {i < (seq.steps?.length ?? 0) - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[20px]" />
                )}
              </div>
              <Card className="flex-1 mb-2">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {channelIcon(step.channel)}
                    <span className="font-medium text-sm capitalize">{step.channel}</span>
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {step.delayHours === 0
                        ? "Immediately"
                        : step.delayHours < 24
                        ? `${step.delayHours}h delay`
                        : `${Math.round(step.delayHours / 24)}d delay`}
                    </span>
                  </div>
                  {step.subject && (
                    <div className="text-xs font-medium text-muted-foreground mb-1">Subject: {step.subject}</div>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">{step.body}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DripSequences() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: sequences, isLoading } = trpc.dripSequences.listSequences.useQuery();
  const { data: seededCheck } = trpc.seedCampaigns.getSeededCampaigns.useQuery();

  const seedMutation = trpc.seedCampaigns.seedPrebuiltCampaigns.useMutation({
    onSuccess: (data) => {
      utils.dripSequences.listSequences.invalidate();
      utils.seedCampaigns.getSeededCampaigns.invalidate();
      const created = data.results.filter(r => r.startsWith('CREATED')).length;
      const skipped = data.results.filter(r => r.startsWith('SKIPPED')).length;
      if (created > 0) toast.success(`Installed ${created} pre-built campaign${created > 1 ? 's' : ''}!`);
      else toast.info(`All campaigns already installed (${skipped} skipped)`);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.dripSequences.updateSequence.useMutation({
    onSuccess: () => { utils.dripSequences.listSequences.invalidate(); },
  });

  if (selectedId) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <SequenceDetail sequenceId={selectedId} onBack={() => setSelectedId(null)} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Follow-Up Sequences</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Automated email &amp; SMS drip campaigns that run until a lead books an appointment.
            </p>
          </div>
          <div className="flex gap-2">
            {(!seededCheck || seededCheck.length < 3) && (
              <Button
                variant="outline"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
              >
                <Zap className="w-4 h-4 mr-2" />
                {seedMutation.isPending ? "Installing..." : "Install Pre-Built Campaigns"}
              </Button>
            )}
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Sequence
            </Button>
          </div>
        </div>

        {/* How it works */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">How Sequences Work</p>
                <p className="text-xs text-muted-foreground mt-1">
                  New leads are automatically enrolled when they enter the CRM. Kyle or the Vapi AI agent calls within 5 minutes.
                  If no appointment is booked, the sequence sends timed emails and SMS messages until the lead converts.
                  Sequences stop automatically when an appointment is booked.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sequences List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading sequences...</div>
        ) : !sequences?.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No sequences yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first follow-up sequence to start automatically nurturing leads.
              </p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create First Sequence
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sequences.map((seq) => (
              <SequenceCard
                key={seq.id}
                seq={seq}
                onSelect={() => setSelectedId(seq.id)}
                onToggle={() => toggleMutation.mutate({ id: seq.id, isActive: !seq.isActive })}
              />
            ))}
          </div>
        )}

        <SequenceDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSaved={() => utils.dripSequences.listSequences.invalidate()}
        />
      </div>
    </DashboardLayout>
  );
}
