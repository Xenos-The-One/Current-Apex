import { useState, useMemo, useCallback } from "react";
import { CampaignTemplateCard } from "@/components/campaigns/CampaignTemplateCard";
import { TemplatePreviewDrawer } from "@/components/campaigns/TemplatePreviewDrawer";
import { TemplateCategoryFilter } from "@/components/campaigns/TemplateCategoryFilter";
import { UseTemplateWizard } from "@/components/campaigns/UseTemplateWizard";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate, type CampaignChannel, type CampaignCategory } from "@/data/campaignTemplates";
import { useAgency } from "@/contexts/AgencyContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  BarChart2, Bot, Calendar, CheckCircle2, ChevronRight, Clock, Copy, Download,
  ExternalLink, FileText, Loader2, Mail, MessageSquare, Mic, MoreHorizontal,
  Pause, Phone, PhoneCall, PhoneMissed, PhoneOff, Play, Plus, RefreshCw,
  Send, Sparkles, Star, TrendingUp, Users, Zap, AlertCircle, Info,
  ArrowUpRight, Activity, Target, Search, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ───────────────────────────────────────────────────────────────────

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "paused";
type CallOutcome = "answered" | "appointment_booked" | "no_answer" | "failed" | "voicemail";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  sending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  sent: "bg-green-100 text-green-700 border-green-200",
  failed: "bg-red-100 text-red-600 border-red-200",
  paused: "bg-orange-100 text-orange-600 border-orange-200",
};

const OUTCOME_COLORS: Record<string, string> = {
  answered: "bg-green-100 text-green-700 border-green-200",
  appointment_booked: "bg-teal-100 text-teal-700 border-teal-200",
  no_answer: "bg-gray-100 text-gray-600 border-gray-200",
  failed: "bg-red-100 text-red-600 border-red-200",
  voicemail: "bg-blue-100 text-blue-700 border-blue-200",
};

const OUTCOME_LABELS: Record<string, string> = {
  answered: "Answered",
  appointment_booked: "Appt Booked",
  no_answer: "No Answer",
  failed: "Failed",
  voicemail: "Voicemail",
};

// ─── Built-in Campaign Templates ─────────────────────────────────────────────

const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome Email",
    category: "Onboarding",
    subject: "Welcome! Let's get you the best rate possible",
    content: "Hi {name},\n\nThank you for reaching out! I'm excited to help you navigate the mortgage process and find the best rate for your situation.\n\nAs a first step, I'd love to schedule a quick 15-minute call to understand your goals. You can book directly at [your calendar link] or simply reply to this email.\n\nLooking forward to working with you!\n\nBest,\n{agent_name}",
  },
  {
    id: "rate_drop",
    name: "Rate Drop Alert",
    category: "Market Update",
    subject: "Rates just dropped — lock in your rate today",
    content: "Hi {name},\n\nGreat news — mortgage rates have dropped significantly this week. This could save you hundreds of dollars per month on your payment.\n\nBased on your profile, you may qualify for a rate as low as [rate]%. I'd love to run a quick pre-qualification to show you exactly what this means for your budget.\n\nReply to this email or call me at [phone] to get started.\n\nBest,\n{agent_name}",
  },
  {
    id: "follow_up",
    name: "Follow-Up (No Response)",
    category: "Follow-Up",
    subject: "Still thinking about your home purchase?",
    content: "Hi {name},\n\nI wanted to follow up on my previous message. I know buying a home is a big decision and timing matters.\n\nI'm here whenever you're ready — whether that's today or in a few months. In the meantime, I've put together a quick guide on current market conditions that might be helpful.\n\nFeel free to reach out anytime.\n\nBest,\n{agent_name}",
  },
  {
    id: "pre_approval",
    name: "Pre-Approval Invitation",
    category: "Conversion",
    subject: "Get pre-approved in minutes — no hard credit pull",
    content: "Hi {name},\n\nDid you know that getting pre-approved takes less than 10 minutes and won't affect your credit score?\n\nA pre-approval letter gives you a competitive edge when making offers and shows sellers you're a serious buyer.\n\nClick here to start your pre-approval: [link]\n\nQuestions? I'm just a reply away.\n\nBest,\n{agent_name}",
  },
  {
    id: "appt_confirm",
    name: "Appointment Confirmation",
    category: "Appointment",
    subject: "Confirmed: Your mortgage consultation on {date}",
    content: "Hi {name},\n\nThis is a confirmation for your mortgage consultation scheduled for {date} at {time}.\n\nWhat to expect:\n• 30-minute call to review your goals\n• Personalized rate options\n• Next steps and timeline\n\nIf you need to reschedule, please reply to this email or call [phone].\n\nLooking forward to speaking with you!\n\n{agent_name}",
  },
  {
    id: "referral_ask",
    name: "Referral Request",
    category: "Referral",
    subject: "Know anyone looking to buy or refinance?",
    content: "Hi {name},\n\nI hope your mortgage experience has been smooth! If you're happy with the service, I'd love your help.\n\nDo you know anyone who might be looking to buy a home, refinance, or explore their mortgage options? A simple introduction goes a long way.\n\nFor every referral that closes, I'll send you a thank-you gift as a token of appreciation.\n\nThank you for your trust!\n\n{agent_name}",
  },
];

const SMS_TEMPLATES = [
  {
    id: "intro",
    name: "Introduction",
    category: "Outreach",
    message: "Hi {name}! This is {agent_name} from {company}. I specialize in helping people like you get the best mortgage rates. Would you have 5 minutes for a quick call this week? Reply STOP to opt out.",
  },
  {
    id: "rate_alert",
    name: "Rate Drop Alert",
    category: "Market Update",
    message: "Hi {name}! Rates just dropped to their lowest point this year. Based on your profile, you could save $200+/month. Reply YES to see your personalized rate. Reply STOP to opt out.",
  },
  {
    id: "follow_up",
    name: "Follow-Up",
    category: "Follow-Up",
    message: "Hi {name}, just checking in! I sent you an email last week about your mortgage options. Have you had a chance to review it? Happy to answer any questions. Reply STOP to opt out.",
  },
  {
    id: "appt_reminder",
    name: "Appointment Reminder",
    category: "Appointment",
    message: "Hi {name}! Reminder: your mortgage consultation is tomorrow at {time}. Reply CONFIRM to confirm or RESCHEDULE to pick a new time. Reply STOP to opt out.",
  },
  {
    id: "docs_request",
    name: "Document Request",
    category: "Processing",
    message: "Hi {name}! To move forward with your application, I need a few documents. I've sent the full list to your email. Questions? Just reply here. Reply STOP to opt out.",
  },
  {
    id: "referral",
    name: "Referral Ask",
    category: "Referral",
    message: "Hi {name}! Hope your experience was great! Do you know anyone looking to buy or refinance? I'd love to help them too. Thanks for any referrals! Reply STOP to opt out.",
  },
];

// ─── Small Helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "answered" || outcome === "appointment_booked") return <PhoneCall className="w-4 h-4 text-green-600" />;
  if (outcome === "no_answer") return <PhoneMissed className="w-4 h-4 text-gray-500" />;
  if (outcome === "failed") return <PhoneOff className="w-4 h-4 text-red-500" />;
  return <Phone className="w-4 h-4 text-blue-500" />;
}

function KpiCard({ label, value, icon: Icon, color, bg, trend }: {
  label: string; value: string | number; icon: any; color: string; bg: string; trend?: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          {trend && <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />{trend}</span>}
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon, iconBg, iconColor, title, description, primaryCta, secondaryCta,
}: {
  icon: any; iconBg: string; iconColor: string; title: string; description: string;
  primaryCta?: React.ReactNode; secondaryCta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mb-5`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <h3 className="font-semibold text-base mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {(primaryCta || secondaryCta) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {primaryCta}
          {secondaryCta}
        </div>
      )}
    </div>
  );
}

// ─── Call Detail Dialog ───────────────────────────────────────────────────────

function CallDetailDialog({ call }: { call: any }) {
  const [open, setOpen] = useState(false);
  const duration = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "—";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
          <FileText className="w-3 h-3" /> Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <OutcomeIcon outcome={call.outcome} />
            Call with {call.leadName || call.phoneNumber || "Unknown"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Outcome", value: OUTCOME_LABELS[call.outcome] ?? call.outcome },
              { label: "Duration", value: duration },
              { label: "Date", value: new Date(call.createdAt).toLocaleString() },
              call.sentimentScore ? { label: "Sentiment", value: `${call.sentimentScore}/10` } : null,
            ].filter(Boolean).map((item: any) => (
              <div key={item.label} className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-semibold text-sm mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
          {call.summary && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Call Summary</p>
              <div className="bg-muted/40 rounded-lg p-3 text-sm">{call.summary}</div>
            </div>
          )}
          {call.transcript && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <Mic className="w-3 h-3" /> Transcript
              </p>
              <div className="bg-muted/40 rounded-lg p-3 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs">
                {call.transcript}
              </div>
            </div>
          )}
          {call.recordingUrl && (
            <Button variant="outline" size="sm" className="gap-1.5 w-full" asChild>
              <a href={call.recordingUrl} target="_blank" rel="noopener noreferrer">
                <Play className="w-3.5 h-3.5" /> Play Recording <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Initiate Call Dialog ─────────────────────────────────────────────────────

function InitiateCallDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leadId: "", phoneNumber: "", assistantId: "" });
  const { data: leadsData } = trpc.crm.listMyLeads.useQuery({ limit: 100 });
  const { data: vapiInfo } = trpc.vapi.testConnection.useQuery();
  const callMutation = trpc.vapi.makeCall.useMutation({
    onSuccess: () => {
      toast.success("AI call initiated — transcript will appear in Call History when complete");
      setOpen(false);
      setForm({ leadId: "", phoneNumber: "", assistantId: "" });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assistants = vapiInfo?.assistants
    ? Object.entries(vapiInfo.assistants)
        .filter(([, v]: any) => v.configured && v.id)
        .map(([k, v]: any) => ({ key: k, id: v.id, label: k.charAt(0).toUpperCase() + k.slice(1) + " Assistant" }))
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Bot className="w-4 h-4" /> Start AI Call</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Initiate AI Call</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary">Vapi AI Calling</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your AI assistant will call the lead, qualify them, and handle the conversation. You'll receive a full transcript and summary after the call.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">AI Assistant *</Label>
            <Select value={form.assistantId} onValueChange={v => setForm(f => ({ ...f, assistantId: v }))}>
              <SelectTrigger><SelectValue placeholder="Choose an assistant..." /></SelectTrigger>
              <SelectContent>
                {assistants.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                {assistants.length === 0 && <SelectItem value="default">Default Assistant</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Select Lead (optional)</Label>
            <Select value={form.leadId} onValueChange={v => {
              const lead = leadsData?.leads?.find((l: any) => l.id.toString() === v);
              setForm(f => ({ ...f, leadId: v, phoneNumber: lead?.phone || f.phoneNumber }));
            }}>
              <SelectTrigger><SelectValue placeholder="Choose a lead..." /></SelectTrigger>
              <SelectContent>
                {leadsData?.leads?.map((lead: any) => (
                  <SelectItem key={lead.id} value={lead.id.toString()}>
                    {lead.firstName} {lead.lastName}{lead.phone ? ` · ${lead.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Phone Number *</Label>
            <Input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="+1 555-0100" />
          </div>
          <Button
            className="w-full"
            disabled={callMutation.isPending || !form.phoneNumber || !form.assistantId}
            onClick={() => callMutation.mutate({
              assistantId: form.assistantId,
              phoneNumber: form.phoneNumber,
              leadId: form.leadId ? parseInt(form.leadId) : undefined,
            })}
          >
            {callMutation.isPending
              ? <span className="flex items-center gap-2"><Phone className="w-4 h-4 animate-pulse" /> Initiating...</span>
              : <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Start AI Call</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Call Dialog ─────────────────────────────────────────────────────────

function BulkCallDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [segment, setSegment] = useState("new");
  const [assistantId, setAssistantId] = useState("");
  const [calling, setCalling] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const { data: leadsData } = trpc.crm.listMyLeads.useQuery({ status: segment as any, limit: 100 });
  const { data: vapiInfo } = trpc.vapi.testConnection.useQuery();
  const callMutation = trpc.vapi.makeCall.useMutation();

  const assistants = vapiInfo?.assistants
    ? Object.entries(vapiInfo.assistants)
        .filter(([, v]: any) => v.configured && v.id)
        .map(([k, v]: any) => ({ key: k, id: v.id, label: k.charAt(0).toUpperCase() + k.slice(1) + " Assistant" }))
    : [];

  const eligibleLeads = leadsData?.leads?.filter((l: any) => l.phone) ?? [];

  const handleBulkCall = async () => {
    if (!assistantId || eligibleLeads.length === 0) return;
    setCalling(true);
    setProgress({ done: 0, total: eligibleLeads.length });
    let done = 0;
    for (const lead of eligibleLeads) {
      try {
        await callMutation.mutateAsync({
          assistantId,
          phoneNumber: lead.phone!,
          customerName: `${lead.firstName} ${lead.lastName}`,
          leadId: lead.id,
        });
      } catch { /* continue on individual failures */ }
      done++;
      setProgress({ done, total: eligibleLeads.length });
      await new Promise(r => setTimeout(r, 500));
    }
    setCalling(false);
    toast.success(`Bulk call campaign complete — ${done} calls initiated`);
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Users className="w-4 h-4" /> Bulk Call</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Bulk AI Call Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700">⚠ Bulk Calling</p>
            <p className="text-xs text-amber-600 mt-0.5">This will initiate AI calls to all leads in the selected segment with a phone number. Calls are queued with a 500ms delay between each.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Lead Segment</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Leads</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="appointment_set">Appointment Set</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{eligibleLeads.length} leads with phone numbers in this segment</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">AI Assistant *</Label>
            <Select value={assistantId} onValueChange={setAssistantId}>
              <SelectTrigger><SelectValue placeholder="Choose an assistant..." /></SelectTrigger>
              <SelectContent>
                {assistants.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {calling && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Calling leads...</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <Button
            className="w-full"
            disabled={calling || !assistantId || eligibleLeads.length === 0}
            onClick={handleBulkCall}
          >
            {calling
              ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Calling {progress.done}/{progress.total}...</span>
              : <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Start Bulk Call ({eligibleLeads.length} leads)</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Email Campaign Dialog ────────────────────────────────────────────────────

function CreateEmailCampaignDialog({ clientId, onSuccess, initialTemplate }: { clientId: number; onSuccess: () => void; initialTemplate?: typeof EMAIL_TEMPLATES[0] }) {
  const [open, setOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [form, setForm] = useState({
    name: initialTemplate?.name ?? "",
    subject: initialTemplate?.subject ?? "",
    previewText: "",
    content: initialTemplate?.content ?? "",
    recipientFilter: "all" as const, scheduledDate: "", sendNow: false,
  });
  const createCampaign = trpc.campaignsOld.createEmailCampaign.useMutation({
    onSuccess: () => {
      toast.success("Email campaign created");
      setOpen(false);
      setForm({ name: "", subject: "", previewText: "", content: "", recipientFilter: "all", scheduledDate: "", sendNow: false });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const applyTemplate = (t: typeof EMAIL_TEMPLATES[0]) => {
    setForm(f => ({ ...f, name: t.name, subject: t.subject, content: t.content }));
    setShowTemplates(false);
    toast.success(`Template "${t.name}" applied`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> New Email Campaign</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-purple-600" /> New Email Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Template Picker */}
          <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Start from a template</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-purple-600 hover:text-purple-700 px-2" onClick={() => setShowTemplates(v => !v)}>
                {showTemplates ? "Hide" : "Browse templates"}
              </Button>
            </div>
            {showTemplates && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {EMAIL_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="text-left p-2.5 rounded-lg bg-white border border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                  >
                    <p className="text-xs font-semibold text-foreground group-hover:text-purple-700">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.category}</p>
                  </button>
                ))}
              </div>
            )}
            {!showTemplates && (
              <div className="flex gap-1.5 flex-wrap">
                {EMAIL_TEMPLATES.slice(0, 3).map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t)} className="text-xs px-2.5 py-1 rounded-full bg-white border border-purple-200 hover:bg-purple-100 hover:border-purple-300 text-purple-700 transition-colors">
                    {t.name}
                  </button>
                ))}
                <button onClick={() => setShowTemplates(true)} className="text-xs px-2.5 py-1 rounded-full bg-white border border-purple-200 hover:bg-purple-100 text-purple-500 transition-colors">+{EMAIL_TEMPLATES.length - 3} more</button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Campaign Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Q2 Rate Drop Announcement" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Subject Line *</Label>
            <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Rates just dropped — lock in your rate today" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Preview Text <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={form.previewText} onChange={e => setForm(f => ({ ...f, previewText: e.target.value }))} placeholder="Short preview shown in inbox..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Message Body *</Label>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} placeholder="Hi {name}, I wanted to reach out because..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Recipient Audience</Label>
            <Select value={form.recipientFilter} onValueChange={v => setForm(f => ({ ...f, recipientFilter: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="new">New Leads</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="status">By Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Schedule Send <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input type="datetime-local" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value, sendNow: false }))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="sendNow" checked={form.sendNow} onChange={e => setForm(f => ({ ...f, sendNow: e.target.checked, scheduledDate: e.target.checked ? "" : f.scheduledDate }))} className="rounded" />
            <Label htmlFor="sendNow" className="text-sm cursor-pointer">Send immediately</Label>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Leave schedule blank to save as draft. Check "Send immediately" to send now. Open and click tracking are enabled automatically.</span>
          </div>
          <Button
            className="w-full"
            disabled={createCampaign.isPending || !form.name || !form.subject || !form.content}
            onClick={() => createCampaign.mutate({
              clientId,
              name: form.name,
              subject: form.subject,
              content: form.content,
              recipientFilter: form.recipientFilter,
              scheduledDate: form.scheduledDate ? new Date(form.scheduledDate) : undefined,
              sendNow: form.sendNow,
            })}
          >
            {createCampaign.isPending
              ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span>
              : form.sendNow
                ? <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Send Now</span>
                : <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Create Campaign</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SMS Campaign Dialog ──────────────────────────────────────────────────────

function CreateSMSCampaignDialog({ clientId, onSuccess }: { clientId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", segment: "all", scheduledFor: "", sendNow: false });
  const { data: leadsData } = trpc.crm.listMyLeads.useQuery({ limit: 200 });
  const createCampaign = trpc.smsCampaigns.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("SMS campaign created");
      setOpen(false);
      setForm({ name: "", message: "", segment: "all", scheduledFor: "", sendNow: false });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const applyTemplate = (t: typeof SMS_TEMPLATES[0]) => {
    setForm(f => ({ ...f, name: t.name, message: t.message }));
    setShowTemplates(false);
    toast.success(`Template "${t.name}" applied`);
  };

  const eligibleLeads = useMemo(() => {
    const all = leadsData?.leads ?? [];
    if (form.segment === "all") return all.filter((l: any) => l.phone);
    return all.filter((l: any) => l.phone && l.status === form.segment);
  }, [leadsData, form.segment]);

  const charCount = form.message.length;
  const msgCount = Math.ceil(charCount / 160) || 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> New SMS Campaign</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-green-600" /> New SMS Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Template Picker */}
          <div className="rounded-lg border border-dashed border-green-200 bg-green-50/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Start from a template</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-green-600 hover:text-green-700 px-2" onClick={() => setShowTemplates(v => !v)}>
                {showTemplates ? "Hide" : "Browse templates"}
              </Button>
            </div>
            {showTemplates && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SMS_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="text-left p-2.5 rounded-lg bg-white border border-green-100 hover:border-green-300 hover:bg-green-50 transition-colors group"
                  >
                    <p className="text-xs font-semibold text-foreground group-hover:text-green-700">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.category}</p>
                  </button>
                ))}
              </div>
            )}
            {!showTemplates && (
              <div className="flex gap-1.5 flex-wrap">
                {SMS_TEMPLATES.slice(0, 3).map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t)} className="text-xs px-2.5 py-1 rounded-full bg-white border border-green-200 hover:bg-green-100 hover:border-green-300 text-green-700 transition-colors">
                    {t.name}
                  </button>
                ))}
                <button onClick={() => setShowTemplates(true)} className="text-xs px-2.5 py-1 rounded-full bg-white border border-green-200 hover:bg-green-100 text-green-500 transition-colors">+{SMS_TEMPLATES.length - 3} more</button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Campaign Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rate Drop Alert — March" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Message *</Label>
              <span className={`text-xs ${charCount > 160 ? "text-amber-600" : "text-muted-foreground"}`}>
                {charCount}/160 · {msgCount} {msgCount === 1 ? "message" : "messages"}
              </span>
            </div>
            <Textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={4}
              placeholder="Hi {name}! Rates just dropped to 6.5%. Reply CALL to schedule a free consultation. Reply STOP to opt out."
              maxLength={1600}
            />
            <p className="text-xs text-muted-foreground">Use {"{name}"} to personalize. Always include opt-out instructions (STOP).</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Recipient Segment</Label>
            <Select value={form.segment} onValueChange={v => setForm(f => ({ ...f, segment: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads ({leadsData?.leads?.filter((l: any) => l.phone).length ?? 0})</SelectItem>
                <SelectItem value="new">New Leads</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{eligibleLeads.length} leads with phone numbers in this segment</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Schedule Send <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input type="datetime-local" value={form.scheduledFor} onChange={e => setForm(f => ({ ...f, scheduledFor: e.target.value, sendNow: false }))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="sendNowSms" checked={form.sendNow} onChange={e => setForm(f => ({ ...f, sendNow: e.target.checked, scheduledFor: e.target.checked ? "" : f.scheduledFor }))} className="rounded" />
            <Label htmlFor="sendNowSms" className="text-sm cursor-pointer">Send immediately</Label>
          </div>
          <Button
            className="w-full"
            disabled={createCampaign.isPending || !form.name || !form.message || eligibleLeads.length === 0}
            onClick={() => createCampaign.mutate({
              clientId,
              name: form.name,
              message: form.message,
              recipients: eligibleLeads.map((l: any) => ({ name: `${l.firstName} ${l.lastName}`, phone: l.phone! })),
              scheduledFor: form.sendNow ? undefined : (form.scheduledFor ? new Date(form.scheduledFor) : undefined),
            })}
          >
            {createCampaign.isPending
              ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span>
              : form.sendNow
                ? <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Send to {eligibleLeads.length} Leads</span>
                : <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Create Campaign</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Campaign Row (table-style) ───────────────────────────────────────────────

function CampaignRow({ campaign, type, onViewStats, onDuplicate, onSaveAsTemplate }: { campaign: any; type: "email" | "sms"; onViewStats: () => void; onDuplicate?: () => void; onSaveAsTemplate?: () => void }) {
  const sent = campaign.sentCount ?? 0;
  const openRate = type === "email" && sent > 0 ? Math.round((campaign.openCount / sent) * 100) : null;
  const deliveryRate = type === "sms" && sent > 0 ? Math.round(((campaign.deliveredCount ?? 0) / sent) * 100) : null;

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-medium text-sm truncate">{campaign.name}</p>
          <StatusBadge status={campaign.status} />
        </div>
        {type === "email" && campaign.subject && (
          <p className="text-xs text-muted-foreground truncate">{campaign.subject}</p>
        )}
        {(campaign.scheduledDate || campaign.scheduledFor || campaign.sentDate) && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {campaign.sentDate
              ? `Sent ${new Date(campaign.sentDate).toLocaleDateString()}`
              : `Scheduled ${new Date(campaign.scheduledDate || campaign.scheduledFor).toLocaleDateString()}`}
          </p>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-6 text-sm">
        <div className="text-right w-14">
          <p className="font-semibold">{sent}</p>
          <p className="text-xs text-muted-foreground">Sent</p>
        </div>
        {type === "email" ? (
          <>
            <div className="text-right w-16">
              <p className="font-semibold">{campaign.openCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Opened</p>
            </div>
            <div className="text-right w-16">
              <p className="font-semibold text-purple-600">{openRate ?? 0}%</p>
              <p className="text-xs text-muted-foreground">Open Rate</p>
            </div>
            <div className="text-right w-16">
              <p className="font-semibold">{campaign.clickCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Clicks</p>
            </div>
          </>
        ) : (
          <>
            <div className="text-right w-16">
              <p className="font-semibold">{campaign.deliveredCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <div className="text-right w-16">
              <p className="font-semibold text-green-600">{deliveryRate ?? 0}%</p>
              <p className="text-xs text-muted-foreground">Delivery</p>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={onViewStats}>
          <BarChart2 className="w-3 h-3" /> Stats
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => toast.info("Edit coming soon")}><FileText className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate ? onDuplicate() : toast.info("Duplicate coming soon")}><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSaveAsTemplate ? onSaveAsTemplate() : toast.info("Save as template coming soon")}>
              <Star className="w-3.5 h-3.5 mr-2" /> Save as Template
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("Pause coming soon")} className="text-amber-600">
              <Pause className="w-3.5 h-3.5 mr-2" /> Pause
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Campaign Analytics Sheet ─────────────────────────────────────────────────

function CampaignAnalyticsSheet({ campaign, type, onClose }: { campaign: any; type: "email" | "sms"; onClose: () => void }) {
  const { data: details } = trpc.smsCampaigns.getCampaignDetails.useQuery(
    { campaignId: campaign.id },
    { enabled: type === "sms" }
  );

  const emailStats = type === "email" ? {
    sent: campaign.sentCount ?? 0,
    failed: campaign.failedCount ?? 0,
    opened: campaign.openCount ?? 0,
    clicked: campaign.clickCount ?? 0,
    openRate: campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0,
    clickRate: campaign.sentCount > 0 ? Math.round((campaign.clickCount / campaign.sentCount) * 100) : 0,
    deliveryRate: campaign.sentCount > 0 ? Math.round(((campaign.sentCount - campaign.failedCount) / campaign.sentCount) * 100) : 0,
  } : null;

  const smsStats = type === "sms" ? {
    sent: campaign.sentCount ?? 0,
    delivered: campaign.deliveredCount ?? 0,
    failed: campaign.failedCount ?? 0,
    total: campaign.totalRecipients ?? 0,
    deliveryRate: campaign.sentCount > 0 ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100) : 0,
  } : null;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> Campaign Analytics
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-1">
            <h3 className="font-semibold text-base">{campaign.name}</h3>
            {type === "email" && <p className="text-sm text-muted-foreground">Subject: {campaign.subject}</p>}
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={campaign.status} />
              {campaign.sentDate && <span className="text-xs text-muted-foreground">Sent {new Date(campaign.sentDate).toLocaleDateString()}</span>}
            </div>
          </div>
          {type === "email" && emailStats && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Sent", value: emailStats.sent, bg: "bg-blue-50", text: "text-blue-700" },
                { label: "Delivery Rate", value: `${emailStats.deliveryRate}%`, bg: "bg-green-50", text: "text-green-700" },
                { label: "Open Rate", value: `${emailStats.openRate}%`, bg: "bg-purple-50", text: "text-purple-700" },
                { label: "Click Rate", value: `${emailStats.clickRate}%`, bg: "bg-teal-50", text: "text-teal-700" },
                { label: "Opened", value: emailStats.opened, bg: "bg-amber-50", text: "text-amber-700" },
                { label: "Failed", value: emailStats.failed, bg: "bg-red-50", text: "text-red-700" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                  <p className={`text-xs mt-0.5 ${s.text} opacity-80`}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {type === "sms" && smsStats && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Recipients", value: smsStats.total, bg: "bg-blue-50", text: "text-blue-700" },
                { label: "Delivery Rate", value: `${smsStats.deliveryRate}%`, bg: "bg-green-50", text: "text-green-700" },
                { label: "Delivered", value: smsStats.delivered, bg: "bg-teal-50", text: "text-teal-700" },
                { label: "Failed", value: smsStats.failed, bg: "bg-red-50", text: "text-red-700" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                  <p className={`text-xs mt-0.5 ${s.text} opacity-80`}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {type === "sms" && details?.recipients && details.recipients.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Recipients ({details.recipients.length})</h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {details.recipients.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 text-sm">
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.phone}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      r.status === "delivered" ? "bg-green-100 text-green-700 border-green-200" :
                      r.status === "sent" ? "bg-blue-100 text-blue-700 border-blue-200" :
                      r.status === "failed" ? "bg-red-100 text-red-600 border-red-200" :
                      "bg-gray-100 text-gray-600 border-gray-200"
                    }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── AI Calling Analytics Sub-tab ────────────────────────────────────────────

function AICallingAnalytics({ callLogs }: { callLogs: any[] }) {
  const answered = callLogs.filter(c => c.outcome === "answered" || c.outcome === "appointment_booked").length;
  const appointments = callLogs.filter(c => c.outcome === "appointment_booked").length;
  const totalDuration = callLogs.reduce((s, c) => s + (c.duration || 0), 0);
  const avgDuration = callLogs.length ? Math.round(totalDuration / callLogs.length) : 0;
  const answerRate = callLogs.length ? Math.round((answered / callLogs.length) * 100) : 0;
  const appointmentRate = callLogs.length ? Math.round((appointments / callLogs.length) * 100) : 0;
  const completionRate = callLogs.length ? Math.round((callLogs.filter(c => c.duration && c.duration > 30).length / callLogs.length) * 100) : 0;

  const outcomeBreakdown = [
    { label: "Answered", count: callLogs.filter(c => c.outcome === "answered").length, color: "bg-green-500" },
    { label: "Appt Booked", count: appointments, color: "bg-teal-500" },
    { label: "No Answer", count: callLogs.filter(c => c.outcome === "no_answer").length, color: "bg-gray-400" },
    { label: "Voicemail", count: callLogs.filter(c => c.outcome === "voicemail").length, color: "bg-blue-400" },
    { label: "Failed", count: callLogs.filter(c => c.outcome === "failed").length, color: "bg-red-400" },
  ].filter(o => o.count > 0);

  if (callLogs.length === 0) {
    return (
      <EmptyState
        icon={BarChart2}
        iconBg="bg-blue-50"
        iconColor="text-blue-400"
        title="No analytics yet"
        description="Analytics will appear here once you've made your first AI calls."
        primaryCta={<InitiateCallDialog onSuccess={() => {}} />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Answer Rate", value: `${answerRate}%`, icon: PhoneCall, color: "text-green-600", bg: "bg-green-50" },
          { label: "Appointment Rate", value: `${appointmentRate}%`, icon: Calendar, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "Avg Duration", value: `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Completion Rate", value: `${completionRate}%`, icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50" },
        ].map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold">Outcome Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            {outcomeBreakdown.map(o => (
              <div key={o.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{o.label}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className={`${o.color} h-2 rounded-full transition-all`} style={{ width: `${callLogs.length > 0 ? (o.count / callLogs.length) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-semibold w-8 text-right">{o.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Campaigns() {
  const [mainTab, setMainTab] = useState("ai-calling");
  const [callSubTab, setCallSubTab] = useState("history");
  const [selectedCampaign, setSelectedCampaign] = useState<{ campaign: any; type: "email" | "sms" } | null>(null);
  // Template library state
  const [templateLibraryTab, setTemplateLibraryTab] = useState<"email" | "sms" | "ai-calling" | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateChannel, setTemplateChannel] = useState<CampaignChannel | "all">("all");
  const [templateCategory, setTemplateCategory] = useState<CampaignCategory | "all">("all");
  const [previewTemplate, setPreviewTemplate] = useState<CampaignTemplate | null>(null);
  const [wizardTemplate, setWizardTemplate] = useState<CampaignTemplate | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const openTemplateLibrary = useCallback((channel: "email" | "sms" | "ai-calling") => {
    setTemplateChannel(channel);
    setTemplateCategory("all");
    setTemplateSearch("");
    setTemplateLibraryTab(channel);
    setMainTab("templates");
  }, []);

  const handleUseTemplate = useCallback((template: CampaignTemplate) => {
    setWizardTemplate(template);
    setWizardOpen(true);
  }, []);

  const filteredTemplates = useMemo(() => {
    return CAMPAIGN_TEMPLATES.filter((t) => {
      if (templateChannel !== "all" && t.channel !== templateChannel) return false;
      if (templateCategory !== "all" && t.category !== templateCategory) return false;
      if (templateSearch) {
        const q = templateSearch.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [templateChannel, templateCategory, templateSearch]);

  const templateCounts = useMemo(() => {
    const all = CAMPAIGN_TEMPLATES;
    const byCategory: Record<string, number> = {};
    all.forEach((t) => {
      if (templateChannel === "all" || t.channel === templateChannel) {
        byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
      }
    });
    return {
      all: templateChannel === "all" ? all.length : all.filter((t) => t.channel === templateChannel).length,
      email: all.filter((t) => t.channel === "email").length,
      sms: all.filter((t) => t.channel === "sms").length,
      "ai-calling": all.filter((t) => t.channel === "ai-calling").length,
      byCategory,
    };
  }, [templateChannel]);

  // Template usage analytics
  const { data: usageCounts = {} } = trpc.campaigns.getTemplateUsageCounts.useQuery();
  const mostPopularIds = useMemo(() => {
    const entries = Object.entries(usageCounts as Record<string, number>);
    if (entries.length === 0) return new Set<string>();
    const maxCount = Math.max(...entries.map(([, c]) => c));
    if (maxCount === 0) return new Set<string>();
    return new Set(entries.filter(([, c]) => c >= maxCount * 0.7).slice(0, 3).map(([id]) => id));
  }, [usageCounts]);

  const { data: myInfo } = trpc.crm.getMyInfo.useQuery();
  const clientId = myInfo?.client?.id ?? 1;

  const { data: callLogs, isLoading: callsLoading, refetch: refetchCalls } = trpc.vapi.listCalls.useQuery({ limit: 100 });
  const { data: emailCampaigns, isLoading: emailLoading, refetch: refetchEmail } = trpc.campaignsOld.listEmailCampaigns.useQuery({ clientId }, { enabled: clientId > 0 });
  const { data: smsCampaigns, isLoading: smsLoading, refetch: refetchSMS } = trpc.smsCampaigns.getCampaigns.useQuery({ clientId }, { enabled: clientId > 0 });
  const { data: vapiInfo } = trpc.vapi.testConnection.useQuery();

  const duplicateEmail = trpc.campaignsOld.createEmailCampaign.useMutation({
    onSuccess: () => { toast.success("Campaign duplicated"); refetchEmail(); },
    onError: (e: any) => toast.error(e.message),
  });
  const duplicateSMS = trpc.smsCampaigns.createCampaign.useMutation({
    onSuccess: () => { toast.success("Campaign duplicated"); refetchSMS(); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveAsTemplate = trpc.campaigns.saveAsTemplate.useMutation({
    onSuccess: (result) => {
      toast.success("Saved as template!", {
        description: `"${result.name}" is now available in your Template Library.`,
        action: { label: "View Library", onClick: () => setMainTab("templates") },
      });
    },
    onError: (e: any) => toast.error("Failed to save template", { description: e.message }),
  });
  const handleSaveAsTemplate = (campaign: any, type: "email" | "sms") => {
    saveAsTemplate.mutate({
      name: campaign.name,
      channel: type,
      subject: type === "email" ? (campaign.subject ?? "") : undefined,
      content: campaign.content ?? campaign.message ?? "",
      clientId,
    });
  };

  const handleDuplicate = (campaign: any, type: "email" | "sms") => {
    const copyName = `${campaign.name} (Copy)`;
    if (type === "email") {
      duplicateEmail.mutate({
        clientId,
        name: copyName,
        subject: campaign.subject ?? copyName,
        content: campaign.content ?? "",
        recipientFilter: campaign.recipientFilter ?? "all",
      });
    } else {
      duplicateSMS.mutate({
        clientId,
        name: copyName,
        message: campaign.message ?? campaign.content ?? "",
        recipients: [],
      });
    }
  };

  const callStats = useMemo(() => {
    const logs = callLogs ?? [];
    const answered = logs.filter((c: any) => c.outcome === "answered" || c.outcome === "appointment_booked").length;
    const avgDuration = logs.length ? Math.round(logs.reduce((s: number, c: any) => s + (c.duration || 0), 0) / logs.length) : 0;
    return {
      total: logs.length,
      answered,
      avgDuration,
      appointments: logs.filter((c: any) => c.outcome === "appointment_booked").length,
      answerRate: logs.length ? Math.round((answered / logs.length) * 100) : 0,
    };
  }, [callLogs]);

  const emailStats = useMemo(() => {
    const campaigns = emailCampaigns ?? [];
    return {
      drafts: campaigns.filter((c: any) => c.status === "draft").length,
      scheduled: campaigns.filter((c: any) => c.status === "scheduled").length,
      active: campaigns.filter((c: any) => c.status === "active" || c.status === "sending").length,
      sent: campaigns.filter((c: any) => c.status === "sent").length,
      totalSent: campaigns.reduce((s: number, c: any) => s + (c.sentCount ?? 0), 0),
      avgOpenRate: (() => {
        const withSends = campaigns.filter((c: any) => c.sentCount > 0);
        if (!withSends.length) return 0;
        return Math.round(withSends.reduce((s: number, c: any) => s + (c.openCount / c.sentCount) * 100, 0) / withSends.length);
      })(),
    };
  }, [emailCampaigns]);

  const smsStats = useMemo(() => {
    const campaigns = smsCampaigns ?? [];
    return {
      drafts: campaigns.filter((c: any) => c.status === "draft").length,
      scheduled: campaigns.filter((c: any) => c.status === "scheduled").length,
      sent: campaigns.filter((c: any) => c.status === "sent").length,
      totalSent: campaigns.reduce((s: number, c: any) => s + (c.sentCount ?? 0), 0),
      avgDeliveryRate: (() => {
        const withSends = campaigns.filter((c: any) => c.sentCount > 0);
        if (!withSends.length) return 0;
        return Math.round(withSends.reduce((s: number, c: any) => s + ((c.deliveredCount ?? 0) / c.sentCount) * 100, 0) / withSends.length);
      })(),
      responseRate: (() => {
        const withSends = campaigns.filter((c: any) => c.sentCount > 0);
        if (!withSends.length) return 0;
        return Math.round(withSends.reduce((s: number, c: any) => s + ((c.responseCount ?? c.clickCount ?? 0) / c.sentCount) * 100, 0) / withSends.length);
      })(),
    };
  }, [smsCampaigns]);

  const assistants = vapiInfo?.assistants
    ? Object.entries(vapiInfo.assistants)
        .filter(([, v]: any) => v.configured)
        .map(([k, v]: any) => ({ key: k, id: (v as any).id, label: k.charAt(0).toUpperCase() + k.slice(1) + " Assistant", configured: (v as any).configured }))
    : [];

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-5 max-w-7xl mx-auto">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold font-display">Campaigns</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Manage AI calling, email, and SMS campaigns in one place</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => toast.info("Reports coming soon")}>
                <BarChart2 className="w-3.5 h-3.5" /> View Reports
              </Button>
              {mainTab === "ai-calling" && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetchCalls()}>
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </Button>
                  <BulkCallDialog onSuccess={refetchCalls} />
                  <InitiateCallDialog onSuccess={refetchCalls} />
                </>
              )}
              {mainTab === "email" && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Import coming soon")}>
                    <Download className="w-3.5 h-3.5" /> Import Leads
                  </Button>
                  <CreateEmailCampaignDialog clientId={clientId} onSuccess={refetchEmail} />
                </>
              )}
              {mainTab === "sms" && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Import coming soon")}>
                    <Download className="w-3.5 h-3.5" /> Import Leads
                  </Button>
                  <CreateSMSCampaignDialog clientId={clientId} onSuccess={refetchSMS} />
                </>
              )}
            </div>
          </div>

          {/* ── Top Summary Cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "AI Calls", value: callStats.total, icon: Phone, color: "text-blue-600", bg: "bg-blue-50", tab: "ai-calling" },
              { label: "Email Campaigns", value: emailCampaigns?.length ?? 0, icon: Mail, color: "text-purple-600", bg: "bg-purple-50", tab: "email" },
              { label: "SMS Campaigns", value: smsCampaigns?.length ?? 0, icon: MessageSquare, color: "text-green-600", bg: "bg-green-50", tab: "sms" },
              {
                label: "Active / Sent",
                value: (emailCampaigns?.filter((c: any) => c.status === "sent").length ?? 0) + (smsCampaigns?.filter((c: any) => c.status === "sent").length ?? 0),
                icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50", tab: null,
              },
            ].map(({ label, value, icon: Icon, color, bg, tab }) => (
              <Card
                key={label}
                className={`border-0 shadow-sm transition-shadow ${tab ? "cursor-pointer hover:shadow-md" : ""} ${mainTab === tab ? "ring-2 ring-primary/30" : ""}`}
                onClick={() => tab && setMainTab(tab)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    {tab && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 mt-1" />}
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Channel Tabs ─────────────────────────────────────────────── */}
          <Tabs value={mainTab} onValueChange={setMainTab}>
            <div className="flex items-center justify-between">
              <TabsList className="h-9">
                <TabsTrigger value="ai-calling" className="gap-1.5 text-xs sm:text-sm">
                  <Phone className="w-3.5 h-3.5" /> AI Calling
                  {callStats.total > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{callStats.total}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-1.5 text-xs sm:text-sm">
                  <Mail className="w-3.5 h-3.5" /> Email
                  {(emailCampaigns?.length ?? 0) > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{emailCampaigns?.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="sms" className="gap-1.5 text-xs sm:text-sm">
                  <MessageSquare className="w-3.5 h-3.5" /> SMS
                  {(smsCampaigns?.length ?? 0) > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{smsCampaigns?.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm">
                  <LayoutGrid className="w-3.5 h-3.5" /> Templates
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{CAMPAIGN_TEMPLATES.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ════════════════════════════════════════════════════════════
                AI CALLING TAB
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="ai-calling" className="mt-4 space-y-4">
              {/* KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: "Total Calls", value: callStats.total, icon: Phone, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Answered", value: callStats.answered, icon: PhoneCall, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Avg Duration", value: `${Math.floor(callStats.avgDuration / 60)}m ${callStats.avgDuration % 60}s`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Appts Booked", value: callStats.appointments, icon: Calendar, color: "text-teal-600", bg: "bg-teal-50" },
                  { label: "Answer Rate", value: `${callStats.answerRate}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
                ].map(k => <KpiCard key={k.label} {...k} />)}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-blue-900">Single AI Call</p>
                      <p className="text-xs text-blue-700/70 mt-0.5">Call one lead with a personalized AI conversation</p>
                    </div>
                    <InitiateCallDialog onSuccess={refetchCalls} />
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-purple-900">Bulk AI Campaign</p>
                      <p className="text-xs text-purple-700/70 mt-0.5">Launch AI calls to multiple leads simultaneously</p>
                    </div>
                    <BulkCallDialog onSuccess={refetchCalls} />
                  </CardContent>
                </Card>
              </div>

              {/* Sub-tabs */}
              <Tabs value={callSubTab} onValueChange={setCallSubTab}>
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="history" className="gap-1.5 text-xs">
                      <Phone className="w-3.5 h-3.5" /> Call History
                      {callStats.total > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{callStats.total}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="assistants" className="gap-1.5 text-xs"><Bot className="w-3.5 h-3.5" /> AI Assistants</TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-1.5 text-xs"><BarChart2 className="w-3.5 h-3.5" /> Analytics</TabsTrigger>
                    <TabsTrigger value="how-it-works" className="gap-1.5 text-xs"><Sparkles className="w-3.5 h-3.5" /> How It Works</TabsTrigger>
                  </TabsList>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => refetchCalls()}>
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </Button>
                </div>

                {/* Call History */}
                <TabsContent value="history" className="mt-3">
                  <Card className="border-0 shadow-sm">
                    {/* Table header */}
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Recent Calls</h3>
                      <span className="text-xs text-muted-foreground">{callStats.answerRate}% answer rate</span>
                    </div>
                    {/* Column headers */}
                    {(callLogs?.length ?? 0) > 0 && (
                      <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-muted/30 text-xs text-muted-foreground font-medium border-b border-border">
                        <span className="flex-1">Contact</span>
                        <span className="w-32">Date & Time</span>
                        <span className="w-20">Duration</span>
                        <span className="w-24">Assistant</span>
                        <span className="w-28">Outcome</span>
                        <span className="w-16 text-right">Action</span>
                      </div>
                    )}
                    <CardContent className="p-0">
                      {callsLoading ? (
                        <div className="p-4 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
                      ) : (callLogs?.length ?? 0) > 0 ? (
                        <div className="divide-y divide-border">
                          {callLogs!.map((call: any) => {
                            const duration = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "—";
                            return (
                              <div key={call.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    <OutcomeIcon outcome={call.outcome} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{call.leadName || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground truncate">{call.phoneNumber || "—"}</p>
                                  </div>
                                </div>
                                <div className="hidden sm:block w-32 text-xs text-muted-foreground">
                                  {new Date(call.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </div>
                                <div className="hidden sm:block w-20 text-xs text-muted-foreground">{duration}</div>
                                <div className="hidden sm:block w-24 text-xs text-muted-foreground capitalize">
                                  {call.assistantType ? call.assistantType.replace(/_/g, " ") : "—"}
                                </div>
                                <div className="w-28">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${OUTCOME_COLORS[call.outcome] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                    {OUTCOME_LABELS[call.outcome] ?? call.outcome?.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <div className="w-16 text-right">
                                  <CallDetailDialog call={call} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyState
                          icon={Bot}
                          iconBg="bg-primary/10"
                          iconColor="text-primary/60"
                          title="No calls yet"
                          description="Start your first AI call to see call history, transcripts, and outcomes here."
                          primaryCta={<InitiateCallDialog onSuccess={refetchCalls} />}
                          secondaryCta={
                            <Button variant="outline" onClick={() => setCallSubTab("how-it-works")}>
                              <Info className="w-4 h-4 mr-2" /> How It Works
                            </Button>
                          }
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* AI Assistants */}
                <TabsContent value="assistants" className="mt-3">
                  {assistants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {assistants.map(({ key, id, label, configured }) => {
                        const callCount = callLogs?.filter((c: any) => c.assistantType === key).length ?? 0;
                        const lastCall = callLogs?.find((c: any) => c.assistantType === key);
                        const descriptions: Record<string, string> = {
                          facebook: "Handles inbound Facebook lead inquiries, qualifies borrowers, and schedules consultations.",
                          instagram: "Engages Instagram leads, answers mortgage questions, and books discovery calls.",
                          referral: "Follows up with referral leads, nurtures relationships, and converts warm introductions.",
                        };
                        return (
                          <Card key={key} className="border-0 shadow-sm">
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">{label}</p>
                                    <Badge variant="outline" className="text-[10px] mt-0.5 text-green-700 border-green-300 bg-green-50">
                                      {configured ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                                {descriptions[key] || "AI assistant for lead qualification and follow-up."}
                              </p>
                              <Separator className="mb-3" />
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                <span>{callCount} calls handled</span>
                                {lastCall && <span>Last active {new Date(lastCall.createdAt).toLocaleDateString()}</span>}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => toast.info("Configure coming soon")}>Configure</Button>
                                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => toast.info("Test call coming soon")}>Test</Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Bot}
                      iconBg="bg-primary/10"
                      iconColor="text-primary/60"
                      title="No AI assistants configured"
                      description="Connect your Vapi account to enable AI calling assistants for Facebook, Instagram, and referral leads."
                      primaryCta={<Button onClick={() => toast.info("Vapi setup coming soon")}><Zap className="w-4 h-4 mr-2" /> Connect Vapi</Button>}
                      secondaryCta={<Button variant="outline" onClick={() => setCallSubTab("how-it-works")}><Info className="w-4 h-4 mr-2" /> Learn More</Button>}
                    />
                  )}
                </TabsContent>

                {/* Analytics */}
                <TabsContent value="analytics" className="mt-3">
                  <AICallingAnalytics callLogs={callLogs ?? []} />
                </TabsContent>

                {/* How It Works */}
                <TabsContent value="how-it-works" className="mt-3">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-6 space-y-6">
                      <div>
                        <h3 className="font-semibold text-base mb-4">How AI Calling Works</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {[
                            { step: "1", title: "Select a Lead", desc: "Choose a lead from your pipeline or enter a phone number. The AI uses their profile to personalize the conversation.", icon: Users, color: "bg-blue-50 text-blue-600" },
                            { step: "2", title: "AI Handles the Call", desc: "Your Vapi assistant calls the lead, qualifies them, answers mortgage questions, and handles objections automatically.", icon: Bot, color: "bg-purple-50 text-purple-600" },
                            { step: "3", title: "Review Outcome", desc: "Get a full transcript, sentiment score, and outcome summary within minutes of the call completing.", icon: FileText, color: "bg-green-50 text-green-600" },
                            { step: "4", title: "Follow Up", desc: "Appointments are booked automatically. Leads are updated in your pipeline based on call outcome.", icon: Calendar, color: "bg-teal-50 text-teal-600" },
                          ].map(({ step, title, desc, icon: Icon, color }) => (
                            <div key={step} className="flex flex-col items-start gap-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">Step {step}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-sm mb-1">{title}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-3">
                          <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">Powered by Vapi AI</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Our AI calling system uses Vapi's advanced voice AI to conduct natural, human-like conversations. Each call is recorded, transcribed, and analyzed for sentiment — giving you full visibility into every interaction.</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <InitiateCallDialog onSuccess={refetchCalls} />
                        <BulkCallDialog onSuccess={refetchCalls} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                EMAIL TAB
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="email" className="mt-4 space-y-4">
              {/* Email KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {[
                  { label: "Drafts", value: emailStats.drafts, icon: FileText, color: "text-gray-600", bg: "bg-gray-100" },
                  { label: "Scheduled", value: emailStats.scheduled, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Active", value: emailStats.active, icon: Zap, color: "text-orange-600", bg: "bg-orange-50" },
                  { label: "Sent", value: emailStats.sent, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Total Delivered", value: emailStats.totalSent, icon: Send, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Avg Open Rate", value: `${emailStats.avgOpenRate}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
                ].map(k => <KpiCard key={k.label} {...k} />)}
              </div>

              {/* Campaign List */}
              <Card className="border-0 shadow-sm">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Email Campaigns</h3>
                  <CreateEmailCampaignDialog clientId={clientId} onSuccess={refetchEmail} />
                </div>
                {/* Column headers */}
                {(emailCampaigns?.length ?? 0) > 0 && (
                  <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-muted/30 text-xs text-muted-foreground font-medium border-b border-border">
                    <span className="flex-1">Campaign</span>
                    <span className="w-14 text-right">Sent</span>
                    <span className="w-16 text-right">Opened</span>
                    <span className="w-16 text-right">Open Rate</span>
                    <span className="w-16 text-right">Clicks</span>
                    <span className="w-24 text-right">Actions</span>
                  </div>
                )}
                <CardContent className="p-0">
                  {emailLoading ? (
                    <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
                  ) : (emailCampaigns?.length ?? 0) > 0 ? (
                    <div>
                      {emailCampaigns!.map((c: any) => (
                        <CampaignRow key={c.id} campaign={c} type="email" onViewStats={() => setSelectedCampaign({ campaign: c, type: "email" })} onDuplicate={() => handleDuplicate(c, "email")} onSaveAsTemplate={() => handleSaveAsTemplate(c, "email")} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Mail}
                      iconBg="bg-purple-50"
                      iconColor="text-purple-400"
                      title="No email campaigns yet"
                      description="Create your first email campaign to start reaching leads with personalized messages, rate updates, and follow-ups."
                      primaryCta={<CreateEmailCampaignDialog clientId={clientId} onSuccess={refetchEmail} />}
                      secondaryCta={
                        <Button variant="outline" onClick={() => openTemplateLibrary("email")}>
                          <LayoutGrid className="w-4 h-4 mr-2" /> Browse Templates
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>

              {/* Email Reporting Summary */}
              {(emailCampaigns?.length ?? 0) > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-purple-600" /> Reporting Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: "Total Sent", value: emailStats.totalSent, color: "text-blue-600" },
                        { label: "Avg Open Rate", value: `${emailStats.avgOpenRate}%`, color: "text-purple-600" },
                        { label: "Active Campaigns", value: emailStats.active, color: "text-orange-600" },
                        { label: "Drafts Pending", value: emailStats.drafts, color: "text-gray-600" },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/40 rounded-xl p-4 text-center">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                SMS TAB
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="sms" className="mt-4 space-y-4">
              {/* SMS KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {[
                  { label: "Drafts", value: smsStats.drafts, icon: FileText, color: "text-gray-600", bg: "bg-gray-100" },
                  { label: "Scheduled", value: smsStats.scheduled, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Sent", value: smsStats.sent, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Total Messages", value: smsStats.totalSent, icon: Send, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Avg Delivery Rate", value: `${smsStats.avgDeliveryRate}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Response Rate", value: `${smsStats.responseRate}%`, icon: MessageSquare, color: "text-teal-600", bg: "bg-teal-50" },
                ].map(k => <KpiCard key={k.label} {...k} />)}
              </div>

              {/* Campaign List */}
              <Card className="border-0 shadow-sm">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold">SMS Campaigns</h3>
                  <CreateSMSCampaignDialog clientId={clientId} onSuccess={refetchSMS} />
                </div>
                {/* Column headers */}
                {(smsCampaigns?.length ?? 0) > 0 && (
                  <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-muted/30 text-xs text-muted-foreground font-medium border-b border-border">
                    <span className="flex-1">Campaign</span>
                    <span className="w-14 text-right">Sent</span>
                    <span className="w-16 text-right">Delivered</span>
                    <span className="w-16 text-right">Delivery %</span>
                    <span className="w-24 text-right">Actions</span>
                  </div>
                )}
                <CardContent className="p-0">
                  {smsLoading ? (
                    <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
                  ) : (smsCampaigns?.length ?? 0) > 0 ? (
                    <div>
                      {smsCampaigns!.map((c: any) => (
                        <CampaignRow key={c.id} campaign={c} type="sms" onViewStats={() => setSelectedCampaign({ campaign: c, type: "sms" })} onDuplicate={() => handleDuplicate(c, "sms")} onSaveAsTemplate={() => handleSaveAsTemplate(c, "sms")} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={MessageSquare}
                      iconBg="bg-green-50"
                      iconColor="text-green-400"
                      title="No SMS campaigns yet"
                      description="Send your first SMS blast to reach leads instantly. SMS has a 98% open rate — the most effective channel for mortgage follow-ups."
                      primaryCta={<CreateSMSCampaignDialog clientId={clientId} onSuccess={refetchSMS} />}
                      secondaryCta={
                        <Button variant="outline" onClick={() => openTemplateLibrary("sms")}>
                          <LayoutGrid className="w-4 h-4 mr-2" /> Browse Templates
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>

              {/* SMS Reporting Summary */}
              {(smsCampaigns?.length ?? 0) > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-green-600" /> Reporting Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: "Total Sent", value: smsStats.totalSent, color: "text-blue-600" },
                        { label: "Avg Delivery Rate", value: `${smsStats.avgDeliveryRate}%`, color: "text-green-600" },
                        { label: "Campaigns Sent", value: smsStats.sent, color: "text-teal-600" },
                        { label: "Drafts Pending", value: smsStats.drafts, color: "text-gray-600" },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/40 rounded-xl p-4 text-center">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                TEMPLATE LIBRARY TAB
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="templates" className="mt-4 space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Campaign Template Library</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{CAMPAIGN_TEMPLATES.length} proven templates across Email, SMS, and AI Calling</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {/* Filters */}
              <TemplateCategoryFilter
                selectedChannel={templateChannel}
                selectedCategory={templateCategory}
                onChannelChange={setTemplateChannel}
                onCategoryChange={setTemplateCategory}
                counts={templateCounts}
              />

              {/* Grid */}
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium">No templates found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => { setTemplateSearch(""); setTemplateChannel("all"); setTemplateCategory("all"); }}>Clear filters</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <CampaignTemplateCard
                      key={template.id}
                      template={template}
                      onPreview={setPreviewTemplate}
                      onUse={handleUseTemplate}
                      usageCount={(usageCounts as Record<string, number>)[template.id] ?? 0}
                      isMostPopular={mostPopularIds.has(template.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* ── Template Preview Drawer ──────────────────────────────── */}
          <TemplatePreviewDrawer
            template={previewTemplate}
            open={!!previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onUse={handleUseTemplate}
          />

          {/* ── Use Template Wizard ──────────────────────────────────── */}
          <UseTemplateWizard
            template={wizardTemplate}
            clientId={clientId}
            open={wizardOpen}
            onClose={() => { setWizardOpen(false); setWizardTemplate(null); }}
            onSuccess={() => { refetchEmail(); refetchSMS(); }}
          />

          {/* ── Recent Activity ──────────────────────────────────────────── */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const activities: { id: string; icon: any; iconColor: string; iconBg: string; text: string; time: string }[] = [];

                // Build activity from real data
                callLogs?.slice(0, 3).forEach((c: any) => {
                  activities.push({
                    id: `call-${c.id}`,
                    icon: Phone,
                    iconColor: c.outcome === "appointment_booked" ? "text-teal-600" : c.outcome === "answered" ? "text-green-600" : "text-gray-500",
                    iconBg: c.outcome === "appointment_booked" ? "bg-teal-50" : c.outcome === "answered" ? "bg-green-50" : "bg-gray-100",
                    text: `AI call ${c.outcome === "appointment_booked" ? "booked appointment with" : c.outcome === "answered" ? "answered by" : "to"} ${c.leadName || c.phoneNumber || "unknown contact"}`,
                    time: new Date(c.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
                  });
                });

                emailCampaigns?.slice(0, 2).forEach((c: any) => {
                  activities.push({
                    id: `email-${c.id}`,
                    icon: Mail,
                    iconColor: "text-purple-600",
                    iconBg: "bg-purple-50",
                    text: `Email campaign "${c.name}" ${c.status === "sent" ? "sent" : c.status === "scheduled" ? "scheduled" : "created as draft"}`,
                    time: new Date(c.createdAt || Date.now()).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
                  });
                });

                smsCampaigns?.slice(0, 2).forEach((c: any) => {
                  activities.push({
                    id: `sms-${c.id}`,
                    icon: MessageSquare,
                    iconColor: "text-green-600",
                    iconBg: "bg-green-50",
                    text: `SMS campaign "${c.name}" ${c.status === "sent" ? `sent to ${c.totalRecipients ?? 0} recipients` : c.status === "scheduled" ? "scheduled" : "created as draft"}`,
                    time: new Date(c.createdAt || Date.now()).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
                  });
                });

                if (activities.length === 0) {
                  return (
                    <div className="py-10 text-center">
                      <Activity className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No activity yet — create your first campaign or AI call to see activity here.</p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-border">
                    {activities.slice(0, 6).map(a => (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                        <div className={`w-8 h-8 rounded-lg ${a.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <a.icon className={`w-4 h-4 ${a.iconColor}`} />
                        </div>
                        <p className="text-sm flex-1 min-w-0 truncate">{a.text}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{a.time}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Analytics Drill-Down Sheet */}
      {selectedCampaign && (
        <CampaignAnalyticsSheet
          campaign={selectedCampaign.campaign}
          type={selectedCampaign.type}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </DashboardLayout>
  );
}
