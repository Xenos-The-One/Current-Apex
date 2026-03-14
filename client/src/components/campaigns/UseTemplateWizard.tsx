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
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
  specificClientId: number | null;  // when recipientFilter === "custom" (specific client)
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
    specificClientId: null,
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
  const { data: contacts = [], isLoading: contactsLoading } = trpc.campaigns.listContacts.useQuery();

  const selectedContact = state.specificClientId
    ? contacts.find((c: any) => c.id === state.specificClientId)
    : null;

  const audienceTip = () => {
    if (state.recipientFilter === "all") {
      return "This will send to all contacts. Make sure they have opted in to receive communications.";
    }
    if (state.recipientFilter === "status") {
      return `This will send to all contacts with status \"${LEAD_STATUS_OPTIONS.find((o) => o.value === state.recipientStatus)?.label ?? state.recipientStatus}\".`;
    }
    if (state.recipientFilter === "custom" && selectedContact) {
      const name = `${(selectedContact as any).firstName} ${(selectedContact as any).lastName}`.trim();
      const email = (selectedContact as any).email ? ` (${(selectedContact as any).email})` : "";
      return `This will send directly to ${name}${email}.`;
    }
    return "Select a specific contact to send directly to them.";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm">Who should receive this campaign?</Label>
        <Select
          value={state.recipientFilter}
          onValueChange={(v) => onChange({ recipientFilter: v as WizardState["recipientFilter"], specificClientId: null })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contacts</SelectItem>
            <SelectItem value="status">Contacts by Status</SelectItem>
            <SelectItem value="custom">Specific Contact</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state.recipientFilter === "status" && (
        <div className="space-y-1.5">
          <Label className="text-sm">Contact Status</Label>
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

      {state.recipientFilter === "custom" && (
        <div className="space-y-1.5">
          <Label className="text-sm">Select Contact</Label>
          <Select
            value={state.specificClientId?.toString() ?? ""}
            onValueChange={(v) => onChange({ specificClientId: v ? parseInt(v, 10) : null })}
          >
            <SelectTrigger>
              <SelectValue placeholder={contactsLoading ? "Loading contacts..." : "Choose a contact..."} />
            </SelectTrigger>
            <SelectContent>
              {contactsLoading ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
              ) : contacts.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">No contacts found</div>
              ) : (
                contacts.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.firstName} {c.lastName}{c.email ? ` — ${c.email}` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className={`rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2`}>
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-700 space-y-1">
          <p className="font-medium">Audience tip</p>
          <p>{audienceTip()}</p>
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

// ─── Preview helpers ─────────────────────────────────────────────────────────

/** Replace common template placeholders with realistic sample values. */
function substituteSampleValues(text: string): string {
  return text
    .replace(/\{name\}/g, "Alex Johnson")
    .replace(/\{first_name\}/g, "Alex")
    .replace(/\{last_name\}/g, "Johnson")
    .replace(/\{agent_name\}/g, "Sarah Miller")
    .replace(/\{company\}/g, "Sterling Mortgage")
    .replace(/\{date\}/g, new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))
    .replace(/\{time\}/g, "10:00 AM")
    .replace(/\{phone\}/g, "(555) 867-5309")
    .replace(/\{address\}/g, "123 Main St, Springfield, IL")
    .replace(/\{rate\}/g, "6.75%")
    .replace(/\{loan_amount\}/g, "$380,000");
}

/** Build the same HTML wrapper used by the sendTestEmail procedure. */
function buildPreviewHtml(subject: string, content: string): string {
  const body = substituteSampleValues(content);
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
    .header { background: #1e293b; padding: 20px 24px; }
    .header-label { display: inline-block; background: #f59e0b; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; margin-bottom: 8px; }
    .header h1 { margin: 0; color: #f8fafc; font-size: 18px; font-weight: 600; line-height: 1.3; }
    .body { padding: 28px 24px; color: #1e293b; font-size: 14px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-label">Preview</div>
      <h1>${substituteSampleValues(subject)}</h1>
    </div>
    <div class="body">${paragraphs}</div>
    <div class="footer">Sterling Mortgage &bull; 123 Agency Lane, Springfield, IL &bull; <a href="#" style="color:#94a3b8">Unsubscribe</a></div>
  </div>
</body>
</html>`;
}

type PreviewWidth = "desktop" | "mobile";

function EmailPreviewPane({ subject, content }: { subject: string; content: string }) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<PreviewWidth>("desktop");
  const html = buildPreviewHtml(subject, content);
  const wordCount = substituteSampleValues(content).trim().split(/\s+/).filter(Boolean).length;
  const charCount = substituteSampleValues(content).length;

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium">{open ? "Hide preview" : "Preview email"}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {wordCount} words &bull; {charCount} chars
        </span>
      </button>

      {open && (
        <div className="border-t border-border/60">
          {/* Width toggle */}
          <div className="flex items-center gap-1 px-3 py-2 bg-muted/20 border-b border-border/40">
            <span className="text-xs text-muted-foreground mr-1">View as:</span>
            <button
              type="button"
              onClick={() => setWidth("desktop")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                width === "desktop"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Monitor className="h-3 w-3" /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setWidth("mobile")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                width === "mobile"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Smartphone className="h-3 w-3" /> Mobile
            </button>
          </div>

          {/* Iframe container */}
          <div
            className="overflow-auto bg-gray-100 flex justify-center py-3 px-2"
            style={{ maxHeight: "420px" }}
          >
            <iframe
              title="Email preview"
              sandbox="allow-same-origin"
              srcDoc={html}
              style={{
                width: width === "mobile" ? "375px" : "100%",
                minHeight: "320px",
                border: "none",
                borderRadius: "6px",
                background: "#f3f4f6",
                display: "block",
                flexShrink: 0,
              }}
              onLoad={(e) => {
                // Auto-resize iframe height to content
                const iframe = e.currentTarget;
                try {
                  const doc = iframe.contentDocument;
                  if (doc) {
                    iframe.style.height = doc.documentElement.scrollHeight + "px";
                  }
                } catch {
                  // cross-origin guard — safe to ignore
                }
              }}
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
  testEmail,
  onTestEmailChange,
}: {
  template: CampaignTemplate;
  state: WizardState;
  onSendTest?: () => void;
  isSendingTest?: boolean;
  testEmail?: string;
  onTestEmailChange?: (email: string) => void;
}) {
  const colors = CHANNEL_COLORS[template.channel];
  const ChannelIcon =
    template.channel === "email" ? Mail : template.channel === "sms" ? MessageSquare : Phone;

  const { data: contacts = [] } = trpc.campaigns.listContacts.useQuery();
  const specificContact = state.specificClientId
    ? (contacts as any[]).find((c) => c.id === state.specificClientId)
    : null;
  const audienceLabel =
    state.recipientFilter === "all"
      ? "All Contacts"
      : state.recipientFilter === "custom"
      ? specificContact
        ? `${specificContact.firstName} ${specificContact.lastName}`.trim()
        : "Specific Contact"
      : `Contacts with status: ${LEAD_STATUS_OPTIONS.find((o) => o.value === state.recipientStatus)?.label ?? state.recipientStatus}`;

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

      {/* Email preview pane — only shown for email channel */}
      {template.channel === "email" && (
        <EmailPreviewPane
          subject={state.subject || state.campaignName}
          content={state.content}
        />
      )}

      {template.channel === "email" && onSendTest && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2.5">
          <p className="text-xs font-medium text-amber-900">Send a preview email</p>
          <p className="text-xs text-amber-700">
            Check formatting before launching. Defaults to your account email — or enter any address below.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="test-email-input" className="text-xs text-amber-800 font-medium">
              Recipient
            </Label>
            <Input
              id="test-email-input"
              type="email"
              placeholder="you@example.com"
              value={testEmail ?? ""}
              onChange={(e) => onTestEmailChange?.(e.target.value)}
              className="h-8 text-xs bg-white border-amber-300 focus-visible:ring-amber-400"
              disabled={isSendingTest}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={onSendTest}
            disabled={isSendingTest || !testEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)}
          >
            {isSendingTest ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending preview...</>
            ) : (
              <><Mail className="h-3.5 w-3.5 mr-1.5" /> Send Test Email</>
            )}
          </Button>
          {testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail) && (
            <p className="text-xs text-red-600">Please enter a valid email address.</p>
          )}
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
  const { user } = useAuth();
  const [testEmail, setTestEmail] = useState<string>("");

  // Pre-fill test email with logged-in user's email when wizard opens
  useMemo(() => {
    if (open && user?.email) {
      setTestEmail(user.email);
    }
  }, [open, user?.email]);

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
    if (currentStep === "audience") {
      // When "Specific Client" is selected, a client must be chosen
      if (state.recipientFilter === "custom" && !state.specificClientId) return false;
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

      // For specific contact: use their clientId and pass their lead ID as recipientIds
      const isSpecificContact = state.recipientFilter === "custom" && state.specificClientId;
      // We need the contact's clientId from the contacts list (fetched in ReviewStep / AudienceStep)
      // The contacts query is available via trpc but here we use the state directly.
      // The backend createEmailCampaign accepts recipientIds to target specific leads.
      const targetClientId = clientId; // always use the prop clientId for the campaign record

      if (template.channel === "email") {
        await createEmail.mutateAsync({
          clientId: targetClientId,
          name: state.campaignName,
          subject: state.subject,
          content: state.content,
          recipientFilter: isSpecificContact ? "custom" : state.recipientFilter,
          recipientStatus: state.recipientFilter === "status" ? state.recipientStatus : undefined,
          recipientIds: isSpecificContact && state.specificClientId ? [state.specificClientId] : undefined,
          scheduledDate,
          sendNow: state.sendNow,
        });
      } else if (template.channel === "sms") {
        await createSms.mutateAsync({
          clientId: targetClientId,
          name: state.campaignName,
          message: state.content,
          recipientFilter: isSpecificContact ? "custom" : state.recipientFilter,
          recipientStatus: state.recipientFilter === "status" ? state.recipientStatus : undefined,
          recipientIds: isSpecificContact && state.specificClientId ? [state.specificClientId] : undefined,
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
              onSendTest={() =>
                sendTestEmail.mutate({
                  subject: state.subject || state.campaignName,
                  content: state.content,
                  toEmail: testEmail.trim() || undefined,
                })
              }
              isSendingTest={sendTestEmail.isPending}
              testEmail={testEmail}
              onTestEmailChange={setTestEmail}
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
