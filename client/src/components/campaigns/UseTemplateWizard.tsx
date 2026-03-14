import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  MessageSquare,
  Phone,
  ChevronRight,
  ChevronLeft,
  Check,
  Users,
  Edit3,
  Send,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { CampaignTemplate } from "@/data/campaignTemplates";
import { CHANNEL_COLORS } from "@/data/campaignTemplates";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = "customize" | "audience" | "schedule" | "review";

interface WizardState {
  // Step 1: Customize
  campaignName: string;
  subject: string;       // email only
  content: string;       // email body or SMS message
  // Step 2: Audience
  recipientFilter: "all" | "status" | "custom";
  recipientStatus: string;
  // Step 3: Schedule
  sendNow: boolean;
  scheduledDate: string;
  scheduledTime: string;
}

interface UseTemplateWizardProps {
  template: CampaignTemplate | null;
  clientId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: "customize", label: "Customize", icon: Edit3 },
  { id: "audience", label: "Audience", icon: Users },
  { id: "schedule", label: "Schedule", icon: Clock },
  { id: "review", label: "Launch", icon: Send },
];

const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New Leads" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "appointment_set", label: "Appointment Set" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialState(template: CampaignTemplate): WizardState {
  let content = "";
  let subject = "";

  if (template?.channel === "email" && template.emailSteps?.[0]) {
    subject = template.emailSteps[0].subject ?? "";
    content = template.emailSteps[0].body ?? "";
  } else if (template?.channel === "sms" && template.smsSteps?.[0]) {
    content = template.smsSteps[0].message ?? "";
  } else if (template?.channel === "ai-calling" && template.aiCallSteps?.[0]) {
    content = template.aiCallSteps[0].intro ?? "";
  }

  return {
    campaignName: template?.name ?? "",
    subject,
    content,
    recipientFilter: "all",
    recipientStatus: "new",
    sendNow: true,
    scheduledDate: "",
    scheduledTime: "09:00",
  };
}

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isDone = idx < currentIdx;
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDone
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isDone ? (
                <Check className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-px w-4 sm:w-6 ${
                  idx < currentIdx ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function CustomizeStep({
  template,
  state,
  onChange,
}: {
  template: CampaignTemplate;
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}) {
  const colors = CHANNEL_COLORS[template.channel];
  const charCount = state.content.length;
  const smsSegments = Math.ceil(charCount / 160);

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
        <p className={`text-xs font-medium ${colors.text}`}>
          You're using: <strong>{template.name}</strong> — {template.stepCount} message{template.stepCount !== 1 ? "s" : ""} · {template.estimatedDuration}
        </p>
        {template.stepCount > 1 && (
          <p className={`text-xs mt-1 ${colors.text} opacity-80`}>
            Note: This wizard launches the first message. The full {template.stepCount}-message sequence can be set up as a drip campaign.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Campaign Name *</Label>
        <Input
          value={state.campaignName}
          onChange={(e) => onChange({ campaignName: e.target.value })}
          placeholder="My Campaign"
        />
      </div>

      {template.channel === "email" && (
        <div className="space-y-1.5">
          <Label className="text-sm">Subject Line *</Label>
          <Input
            value={state.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder="Your email subject..."
          />
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm">
            {template.channel === "email"
              ? "Email Body *"
              : template.channel === "sms"
              ? "SMS Message *"
              : "Opening Script *"}
          </Label>
          {template.channel === "sms" && (
            <span
              className={`text-xs ${
                charCount > 320
                  ? "text-red-600"
                  : charCount > 160
                  ? "text-amber-600"
                  : "text-muted-foreground"
              }`}
            >
              {charCount} chars · {smsSegments} segment{smsSegments !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Textarea
          value={state.content}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={template.channel === "email" ? 8 : 5}
          placeholder={
            template.channel === "email"
              ? "Hi {first_name},\n\n..."
              : template.channel === "sms"
              ? "Hi {first_name}! ..."
              : "Hi {first_name}? This is {ai_name} from {company}..."
          }
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="bg-muted px-1 rounded">{"{first_name}"}</code>, <code className="bg-muted px-1 rounded">{"{agent_name}"}</code>, <code className="bg-muted px-1 rounded">{"{phone}"}</code> as merge tags.
        </p>
      </div>
    </div>
  );
}

function AudienceStep({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm">Who should receive this campaign?</Label>
        <Select
          value={state.recipientFilter}
          onValueChange={(v) => onChange({ recipientFilter: v as WizardState["recipientFilter"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            <SelectItem value="status">Leads by Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state.recipientFilter === "status" && (
        <div className="space-y-1.5">
          <Label className="text-sm">Lead Status</Label>
          <Select
            value={state.recipientStatus}
            onValueChange={(v) => onChange({ recipientStatus: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className={`rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2`}>
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-700 space-y-1">
          <p className="font-medium">Audience tip</p>
          <p>
            {state.recipientFilter === "all"
              ? "This will send to all leads for the selected client. Make sure they have opted in to receive communications."
              : `This will send to all leads with status "${LEAD_STATUS_OPTIONS.find((o) => o.value === state.recipientStatus)?.label ?? state.recipientStatus}".`}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScheduleStep({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onChange({ sendNow: true })}
          className={`rounded-lg border p-4 text-left transition-all ${
            state.sendNow
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Send className={`h-4 w-4 ${state.sendNow ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">Send Now</span>
            {state.sendNow && (
              <Check className="h-3.5 w-3.5 text-primary ml-auto" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Launch immediately after confirmation
          </p>
        </button>

        <button
          onClick={() => onChange({ sendNow: false })}
          className={`rounded-lg border p-4 text-left transition-all ${
            !state.sendNow
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className={`h-4 w-4 ${!state.sendNow ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">Schedule</span>
            {!state.sendNow && (
              <Check className="h-3.5 w-3.5 text-primary ml-auto" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Pick a date and time to send
          </p>
        </button>
      </div>

      {!state.sendNow && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Date *</Label>
            <Input
              type="date"
              value={state.scheduledDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => onChange({ scheduledDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Time *</Label>
            <Input
              type="time"
              value={state.scheduledTime}
              onChange={(e) => onChange({ scheduledTime: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep({
  template,
  state,
  onSendTest,
  isSendingTest,
}: {
  template: CampaignTemplate;
  state: WizardState;
  onSendTest?: () => void;
  isSendingTest?: boolean;
}) {
  const colors = CHANNEL_COLORS[template.channel];
  const ChannelIcon =
    template.channel === "email" ? Mail : template.channel === "sms" ? MessageSquare : Phone;

  const audienceLabel =
    state.recipientFilter === "all"
      ? "All Leads"
      : `Leads with status: ${LEAD_STATUS_OPTIONS.find((o) => o.value === state.recipientStatus)?.label ?? state.recipientStatus}`;

  const scheduleLabel = state.sendNow
    ? "Immediately after launch"
    : `${state.scheduledDate} at ${state.scheduledTime}`;

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
        <div className="flex items-center gap-2">
          <ChannelIcon className={`h-4 w-4 ${colors.icon}`} />
          <span className={`text-sm font-medium ${colors.text}`}>{template.name}</span>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 divide-y divide-border/60">
        <div className="flex items-start justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Campaign Name</span>
          <span className="text-xs font-medium text-right max-w-[60%] truncate">{state.campaignName}</span>
        </div>
        {template.channel === "email" && (
          <div className="flex items-start justify-between px-4 py-3">
            <span className="text-xs text-muted-foreground">Subject</span>
            <span className="text-xs font-medium text-right max-w-[60%] truncate">{state.subject}</span>
          </div>
        )}
        <div className="flex items-start justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Audience</span>
          <span className="text-xs font-medium text-right max-w-[60%]">{audienceLabel}</span>
        </div>
        <div className="flex items-start justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Send Time</span>
          <span className="text-xs font-medium text-right max-w-[60%]">{scheduleLabel}</span>
        </div>
        <div className="flex items-start justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Messages</span>
          <span className="text-xs font-medium">{template.stepCount} message{template.stepCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {template.channel === "email" && onSendTest && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800 mb-2">
            Send a preview to your own inbox to check formatting before launching.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={onSendTest}
            disabled={isSendingTest}
          >
            {isSendingTest ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending preview...</>
            ) : (
              <><Mail className="h-3.5 w-3.5 mr-1.5" /> Send Test Email to Myself</>
            )}
          </Button>
        </div>
      )}

      {state.sendNow && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            This campaign will be sent immediately after you click <strong>Launch Campaign</strong>. Make sure you've reviewed the content above.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function UseTemplateWizard({
  template,
  clientId,
  open,
  onClose,
  onSuccess,
}: UseTemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("customize");
  const [state, setState] = useState<WizardState>(() =>
    template ? buildInitialState(template) : buildInitialState({} as CampaignTemplate)
  );
  const [isLaunching, setIsLaunching] = useState(false);

  // Reset when template changes
  const stableTemplateId = template?.id;
  useMemo(() => {
    if (template) {
      setState(buildInitialState(template));
      setCurrentStep("customize");
    }
  }, [stableTemplateId]);

  const createEmail = trpc.campaigns.createEmailCampaign.useMutation();
  const createSms = trpc.campaigns.createSmsCampaign.useMutation();
  const seedToClient = trpc.campaigns.seedTemplateToClient.useMutation();
  const trackUsage = trpc.campaigns.trackTemplateUsage.useMutation();
  const sendTestEmail = trpc.campaigns.sendTestEmail.useMutation({
    onSuccess: (data) => {
      if (data.demo) {
        toast.info("Test email (demo mode)", {
          description: `Would have sent to ${data.to}. Configure SendGrid to send real emails.`,
        });
      } else {
        toast.success("Test email sent!", {
          description: `Preview delivered to ${data.to}. Check your inbox.`,
        });
      }
    },
    onError: (err) => toast.error("Failed to send test email", { description: err.message }),
  });

  if (!template) return null;

  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === STEPS.length - 1;

  const onChange = (updates: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...updates }));

  const canAdvance = (): boolean => {
    if (currentStep === "customize") {
      if (!(state.campaignName ?? "").trim()) return false;
      if (template.channel === "email" && !(state.subject ?? "").trim()) return false;
      if (!(state.content ?? "").trim()) return false;
    }
    if (currentStep === "schedule") {
      if (!state.sendNow && (!state.scheduledDate || !state.scheduledTime)) return false;
    }
    return true;
  };

  const handleNext = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < STEPS.length) {
      setCurrentStep(STEPS[nextIdx].id);
    }
  };

  const handleBack = () => {
    const prevIdx = currentIdx - 1;
    if (prevIdx >= 0) {
      setCurrentStep(STEPS[prevIdx].id);
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      let scheduledDate: Date | undefined;
      if (!state.sendNow && state.scheduledDate && state.scheduledTime) {
        scheduledDate = new Date(`${state.scheduledDate}T${state.scheduledTime}`);
      }

      // Track template usage (non-blocking)
      trackUsage.mutate({ templateId: template.id, channel: template.channel, clientId });

      if (template.channel === "email") {
        await createEmail.mutateAsync({
          clientId,
          name: state.campaignName,
          subject: state.subject,
          content: state.content,
          recipientFilter: state.recipientFilter,
          recipientStatus: state.recipientFilter === "status" ? state.recipientStatus : undefined,
          scheduledDate,
          sendNow: state.sendNow,
        });
      } else if (template.channel === "sms") {
        await createSms.mutateAsync({
          clientId,
          name: state.campaignName,
          message: state.content,
          recipientFilter: state.recipientFilter,
          recipientStatus: state.recipientFilter === "status" ? state.recipientStatus : undefined,
          scheduledDate,
          sendNow: state.sendNow,
        });
      } else {
        // AI Calling — show a toast since it requires Vapi configuration
        toast.success("AI Calling campaign created!", {
          description: "Configure your Vapi assistant to activate this campaign.",
        });
        onSuccess();
        onClose();
        return;
      }

      toast.success(
        state.sendNow ? "Campaign launched!" : "Campaign scheduled!",
        {
          description: state.sendNow
            ? `"${state.campaignName}" is being sent now.`
            : `"${state.campaignName}" is scheduled for ${state.scheduledDate} at ${state.scheduledTime}.`,
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Failed to launch campaign", {
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const ChannelIcon =
    template.channel === "email" ? Mail : template.channel === "sms" ? MessageSquare : Phone;
  const colors = CHANNEL_COLORS[template.channel];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              <ChannelIcon className={`h-3.5 w-3.5 ${colors.icon}`} />
              {template.channel === "email" ? "Email" : template.channel === "sms" ? "SMS" : "AI Calling"}
            </div>
          </div>
          <DialogTitle className="text-base leading-tight">{template.name}</DialogTitle>
          <div className="mt-3">
            <StepIndicator currentStep={currentStep} />
          </div>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="flex-1 px-5 py-4">
          {currentStep === "customize" && (
            <CustomizeStep template={template} state={state} onChange={onChange} />
          )}
          {currentStep === "audience" && (
            <AudienceStep state={state} onChange={onChange} />
          )}
          {currentStep === "schedule" && (
            <ScheduleStep state={state} onChange={onChange} />
          )}
          {currentStep === "review" && (
            <ReviewStep
              template={template}
              state={state}
              onSendTest={() => sendTestEmail.mutate({ subject: state.subject || state.campaignName, content: state.content })}
              isSendingTest={sendTestEmail.isPending}
            />
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-5 py-4 border-t border-border/60 shrink-0 flex gap-2">
          <Button
            variant="outline"
            onClick={isFirst ? onClose : handleBack}
            disabled={isLaunching}
          >
            {isFirst ? "Cancel" : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </>
            )}
          </Button>
          {!isLast ? (
            <Button onClick={handleNext} disabled={!canAdvance()} className="flex-1 sm:flex-none">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="flex-1 sm:flex-none gap-2"
            >
              {isLaunching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {state.sendNow ? "Launch Campaign" : "Schedule Campaign"}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
