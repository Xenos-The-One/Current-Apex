import { useAuth } from "@/_core/hooks/useAuth";
import { useAgency } from "@/contexts/AgencyContext";
import CRMLayout from "@/components/CRMLayout";
import AISuccessCoachPanel from "@/components/AISuccessCoachPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Mic,
  MousePointerClick,
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  Play,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Shared Status Colors ─────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  paused: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

// ─── AI Calling helpers ───────────────────────────────────────────────────────
const OUTCOME_COLORS: Record<string, string> = {
  answered: "bg-green-100 text-green-700 border-green-200",
  no_answer: "bg-gray-100 text-gray-600 border-gray-200",
  voicemail: "bg-blue-100 text-blue-700 border-blue-200",
  busy: "bg-amber-100 text-amber-700 border-amber-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  callback_requested: "bg-purple-100 text-purple-700 border-purple-200",
  appointment_booked: "bg-teal-100 text-teal-700 border-teal-200",
};
const OUTCOME_LABELS: Record<string, string> = {
  answered: "Answered",
  no_answer: "No Answer",
  voicemail: "Voicemail",
  busy: "Busy",
  failed: "Failed",
  callback_requested: "Callback Requested",
  appointment_booked: "Appt Booked",
};

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "answered" || outcome === "appointment_booked") return <PhoneCall className="w-4 h-4 text-green-600" />;
  if (outcome === "no_answer") return <PhoneMissed className="w-4 h-4 text-gray-500" />;
  if (outcome === "failed") return <PhoneOff className="w-4 h-4 text-red-500" />;
  return <Phone className="w-4 h-4 text-blue-500" />;
}

function InitiateCallDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leadId: "", phoneNumber: "", objective: "" });
  const { data: leads } = trpc.leads.list.useQuery({ clientId: 1, limit: 50 });
  const callMutation = trpc.vapi.makeCall.useMutation({
    onSuccess: () => {
      toast.success("AI call initiated — you'll receive a transcript when it completes");
      setOpen(false);
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Bot className="w-4 h-4" /> Start AI Call</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> Initiate AI Call
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary">Vapi AI Calling</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your AI assistant will call the lead, qualify them, and handle the conversation. You'll receive a full transcript and summary after the call.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Select Lead (optional)</Label>
            <Select
              value={form.leadId}
              onValueChange={v => {
                const lead = leads?.leads?.find((l: any) => l.id.toString() === v);
                setForm(f => ({ ...f, leadId: v, phoneNumber: lead?.phone || f.phoneNumber }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Choose a lead..." /></SelectTrigger>
              <SelectContent>
                {leads?.leads?.map((lead: any) => (
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
          <div className="space-y-1.5">
            <Label className="text-sm">Call Objective</Label>
            <Textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} rows={2} placeholder="Schedule a mortgage consultation, follow up on application..." />
          </div>
          <Button className="w-full" disabled={callMutation.isPending || !form.phoneNumber}
            onClick={() => callMutation.mutate({ agencyId, leadId: form.leadId ? parseInt(form.leadId) : undefined, toNumber: form.phoneNumber })}>
            {callMutation.isPending
              ? <span className="flex items-center gap-2"><Phone className="w-4 h-4 animate-pulse" /> Initiating...</span>
              : <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Start AI Call</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
            <div className="bg-muted/40 rounded-lg p-3"><p className="text-xs text-muted-foreground">Outcome</p><p className="font-semibold text-sm mt-0.5">{OUTCOME_LABELS[call.outcome] ?? call.outcome}</p></div>
            <div className="bg-muted/40 rounded-lg p-3"><p className="text-xs text-muted-foreground">Duration</p><p className="font-semibold text-sm mt-0.5">{duration}</p></div>
            <div className="bg-muted/40 rounded-lg p-3"><p className="text-xs text-muted-foreground">Date</p><p className="font-semibold text-sm mt-0.5">{new Date(call.createdAt).toLocaleString()}</p></div>
            {call.sentimentScore && (
              <div className="bg-muted/40 rounded-lg p-3"><p className="text-xs text-muted-foreground">Sentiment</p>
                <div className="flex items-center gap-1 mt-0.5"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><p className="font-semibold text-sm">{call.sentimentScore}/10</p></div>
              </div>
            )}
          </div>
          {call.summary && <div><p className="text-xs font-medium text-muted-foreground mb-1.5">Call Summary</p><div className="bg-muted/40 rounded-lg p-3 text-sm">{call.summary}</div></div>}
          {call.transcript && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Mic className="w-3 h-3" /> Transcript</p>
              <div className="bg-muted/40 rounded-lg p-3 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs">{call.transcript}</div>
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

// ─── Email Campaign Dialogs ───────────────────────────────────────────────────
function CreateEmailCampaignDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "", fromName: "", fromEmail: "", audienceType: "all_leads" });
  const [generating, setGenerating] = useState(false);
  const createMutation = trpc.campaigns.createEmail.useMutation({
    onSuccess: () => { toast.success("Campaign created"); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const generateMutation = trpc.ai.generateEmailContent.useMutation({
    onSuccess: (data: any) => {
      setForm(f => ({ ...f, subject: data.subject || f.subject, body: data.body || f.body }));
      setGenerating(false);
      toast.success("AI content generated");
    },
    onError: () => setGenerating(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New Email Campaign</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Create Email Campaign</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ agencyId, ...form as any }); }} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Campaign Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1">
              <Label>Audience</Label>
              <Select value={form.audienceType} onValueChange={v => setForm(f => ({ ...f, audienceType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["all_leads", "new_leads", "qualified_leads", "borrowers", "referral_partners", "custom_list"].map(a => (
                    <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>From Name</Label><Input value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))} placeholder="John Smith" /></div>
            <div className="space-y-1"><Label>From Email</Label><Input type="email" value={form.fromEmail} onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))} placeholder="john@agency.com" /></div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Subject Line *</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { setGenerating(true); generateMutation.mutate({ purpose: form.name, tone: "professional" }); }} disabled={generating || !form.name}>
                <Sparkles className="w-3 h-3" /> {generating ? "Generating..." : "AI Generate"}
              </Button>
            </div>
            <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label>Email Body *</Label>
            <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={8} required placeholder="Write your email content here..." />
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Campaign"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateSMSCampaignDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", audienceType: "all_leads", fromNumber: "" });
  const [generating, setGenerating] = useState(false);
  const createMutation = trpc.campaigns.createSms.useMutation({
    onSuccess: () => { toast.success("SMS campaign created"); setOpen(false); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });
  const generateMutation = trpc.ai.generateSmsContent.useMutation({
    onSuccess: (data: any) => { setForm(f => ({ ...f, message: data.message || f.message })); setGenerating(false); toast.success("AI content generated"); },
    onError: (_e: any) => setGenerating(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New SMS Campaign</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create SMS Campaign</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ agencyId, ...form as any }); }} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Campaign Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1">
              <Label>Audience</Label>
              <Select value={form.audienceType} onValueChange={v => setForm(f => ({ ...f, audienceType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["all_leads", "new_leads", "qualified_leads", "borrowers", "referral_partners"].map(a => (
                    <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label>From Number</Label><Input value={form.fromNumber} onChange={e => setForm(f => ({ ...f, fromNumber: e.target.value }))} placeholder="+1 555-0100" /></div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Message *</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{form.message.length}/160</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1"
                  onClick={() => { setGenerating(true); generateMutation.mutate({ purpose: form.name || "mortgage follow-up" }); }} disabled={generating}>
                  <Sparkles className="w-3 h-3" /> {generating ? "..." : "AI"}
                </Button>
              </div>
            </div>
            <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} maxLength={160} required />
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Campaign"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CampaignCard({ campaign, type }: { campaign: any; type: "email" | "sms" }) {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${type === "email" ? "bg-blue-100" : "bg-purple-100"}`}>
              {type === "email" ? <Mail className="w-4 h-4 text-blue-600" /> : <MessageSquare className="w-4 h-4 text-purple-600" />}
            </div>
            <div>
              <p className="font-semibold text-sm">{campaign.name}</p>
              <p className="text-xs text-muted-foreground">{campaign.audienceType?.replace(/_/g, " ")}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status] || ""}`}>
            {campaign.status}
          </span>
        </div>
        {type === "email" && <p className="text-xs text-muted-foreground mt-2 truncate">Subject: {campaign.subject}</p>}
        {type === "sms" && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{campaign.message}</p>}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {type === "email" ? (
            <>
              <div><p className="text-sm font-bold">{campaign.totalSent || 0}</p><p className="text-xs text-muted-foreground">Sent</p></div>
              <div><p className="text-sm font-bold">{campaign.totalOpened || 0}</p><p className="text-xs text-muted-foreground">Opens</p></div>
              <div><p className="text-sm font-bold">{campaign.totalClicked || 0}</p><p className="text-xs text-muted-foreground">Clicks</p></div>
              <div><p className="text-sm font-bold">{campaign.totalUnsubscribed || 0}</p><p className="text-xs text-muted-foreground">Unsubs</p></div>
            </>
          ) : (
            <>
              <div><p className="text-sm font-bold">{campaign.totalSent || 0}</p><p className="text-xs text-muted-foreground">Sent</p></div>
              <div><p className="text-sm font-bold">{campaign.totalDelivered || 0}</p><p className="text-xs text-muted-foreground">Delivered</p></div>
              <div><p className="text-sm font-bold">{campaign.totalReplied || 0}</p><p className="text-xs text-muted-foreground">Replies</p></div>
              <div><p className="text-sm font-bold">{campaign.totalOptOut || 0}</p><p className="text-xs text-muted-foreground">Opt-outs</p></div>
            </>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{new Date(campaign.createdAt).toLocaleDateString()}</span>
          {campaign.status === "draft" && (
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1"><Send className="w-3 h-3" /> Send</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Campaigns Page ──────────────────────────────────────────────────────
export default function Campaigns() {
  const { user } = useAuth();
  const { agencyId } = useAgency();
  const resolvedAgencyId = agencyId || (user as any)?.agencyId || 1;
  const [tab, setTab] = useState("ai-calling");
  const [aiSubTab, setAiSubTab] = useState("calls");

  // Email + SMS campaign data
  const { data: emailCampaigns, refetch: refetchEmail } = trpc.campaigns.listEmail.useQuery({ agencyId: resolvedAgencyId });
  const { data: smsCampaigns, refetch: refetchSMS } = trpc.campaigns.listSms.useQuery({ agencyId: resolvedAgencyId });

  // AI Calling data
  const { data: callLogs, isLoading: callsLoading, refetch: refetchCalls } = trpc.vapi.listCalls.useQuery({ limit: 50 });

  const callStats = {
    total: callLogs?.length ?? 0,
    answered: callLogs?.filter((c: any) => c.outcome === "answered" || c.outcome === "appointment_booked").length ?? 0,
    avgDuration: callLogs?.length
      ? Math.round(callLogs.reduce((s: number, c: any) => s + (c.duration || 0), 0) / callLogs.length)
      : 0,
    appointments: callLogs?.filter((c: any) => c.outcome === "appointment_booked").length ?? 0,
    answerRate: callLogs?.length
      ? Math.round((callLogs.filter((c: any) => c.outcome === "answered" || c.outcome === "appointment_booked").length / callLogs.length) * 100)
      : 0,
  };

  return (
    <CRMLayout agencyId={resolvedAgencyId}>
      <div className="flex gap-4 p-6">
        <div className="flex-1 min-w-0 space-y-4 fade-in">

          {/* Page Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold font-display">Campaigns</h1>
              <p className="text-muted-foreground text-sm">AI Calling, Email, and SMS campaigns in one place</p>
            </div>
            <div className="flex items-center gap-2">
              {tab === "ai-calling" && <InitiateCallDialog agencyId={resolvedAgencyId} onSuccess={refetchCalls} />}
              {tab === "email" && <CreateEmailCampaignDialog agencyId={resolvedAgencyId} onSuccess={refetchEmail} />}
              {tab === "sms" && <CreateSMSCampaignDialog agencyId={resolvedAgencyId} onSuccess={refetchSMS} />}
            </div>
          </div>

          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "AI Calls", value: callStats.total, icon: Bot, color: "blue" },
              { label: "Email Campaigns", value: emailCampaigns?.length ?? 0, icon: Mail, color: "purple" },
              { label: "SMS Campaigns", value: smsCampaigns?.length ?? 0, icon: MessageSquare, color: "green" },
              {
                label: "Active",
                value: [...(emailCampaigns || []), ...(smsCampaigns || [])].filter((c: any) => c.status === "sending" || c.status === "scheduled").length,
                icon: CheckCircle,
                color: "teal",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold font-display mt-0.5">{value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${color}-50`}>
                    <Icon className={`w-4 h-4 text-${color}-600`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main 3-Tab Navigation */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-10">
              <TabsTrigger value="ai-calling" className="gap-2">
                <Bot className="w-4 h-4" /> AI Calling
                {callStats.total > 0 && <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-xs px-1">{callStats.total}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" /> Email
                {(emailCampaigns?.length ?? 0) > 0 && <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-xs px-1">{emailCampaigns?.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-2">
                <MessageSquare className="w-4 h-4" /> SMS
                {(smsCampaigns?.length ?? 0) > 0 && <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-xs px-1">{smsCampaigns?.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* ── AI Calling Tab ─────────────────────────────────────────── */}
            <TabsContent value="ai-calling" className="mt-4 space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Total Calls", value: callStats.total, icon: Phone, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Answered", value: callStats.answered, icon: PhoneCall, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Avg Duration", value: `${Math.floor(callStats.avgDuration / 60)}m ${callStats.avgDuration % 60}s`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Appts Booked", value: callStats.appointments, icon: Calendar, color: "text-teal-600", bg: "bg-teal-50" },
                  { label: "Answer Rate", value: `${callStats.answerRate}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <Card key={label} className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* AI Calling Sub-Tabs */}
              <Tabs value={aiSubTab} onValueChange={setAiSubTab}>
                <div className="flex items-center justify-between mb-1">
                  <TabsList>
                    <TabsTrigger value="calls" className="gap-1.5">
                      <Phone className="w-4 h-4" /> Call History
                      {callStats.total > 0 && <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-xs px-1">{callStats.total}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="assistants" className="gap-1.5"><Bot className="w-4 h-4" /> AI Assistants</TabsTrigger>
                    <TabsTrigger value="how-it-works" className="gap-1.5"><Zap className="w-4 h-4" /> How It Works</TabsTrigger>
                  </TabsList>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetchCalls()}>
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </Button>
                </div>

                <TabsContent value="calls" className="mt-2">
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">Recent Calls</CardTitle>
                        {callStats.total > 0 && <Badge variant="outline" className="text-xs">{callStats.answerRate}% answer rate</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {callsLoading ? (
                        <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
                      ) : callLogs?.length ? (
                        <div className="divide-y divide-border">
                          {callLogs.map((call: any) => {
                            const duration = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "—";
                            return (
                              <div key={call.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    <OutcomeIcon outcome={call.outcome} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{call.leadName || call.phoneNumber || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {call.phoneNumber && call.leadName ? `${call.phoneNumber} · ` : ""}
                                      {new Date(call.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right hidden sm:block">
                                    <p className="text-xs text-muted-foreground">{duration}</p>
                                    {call.sentimentScore && (
                                      <div className="flex items-center gap-0.5 justify-end">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        <span className="text-xs font-medium">{call.sentimentScore}/10</span>
                                      </div>
                                    )}
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${OUTCOME_COLORS[call.outcome] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                    {OUTCOME_LABELS[call.outcome] ?? call.outcome?.replace(/_/g, " ")}
                                  </span>
                                  <CallDetailDialog call={call} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-20 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <Bot className="w-8 h-8 text-primary/60" />
                          </div>
                          <p className="font-semibold text-base">No calls yet</p>
                          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                            Click "Start AI Call" to initiate your first Vapi-powered call.
                          </p>
                          <div className="mt-4"><InitiateCallDialog agencyId={resolvedAgencyId} onSuccess={refetchCalls} /></div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="assistants" className="mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { name: "Facebook Lead Assistant", desc: "Handles inbound Facebook lead inquiries, qualifies borrowers, and schedules consultations.", icon: Users, color: "bg-blue-50 text-blue-600", calls: callLogs?.filter((c: any) => c.assistantType === "facebook").length ?? 0 },
                      { name: "Instagram Lead Assistant", desc: "Engages Instagram leads, answers mortgage questions, and books discovery calls.", icon: Bot, color: "bg-pink-50 text-pink-600", calls: callLogs?.filter((c: any) => c.assistantType === "instagram").length ?? 0 },
                      { name: "Referral Follow-Up", desc: "Follows up with referral leads from partner agents, nurtures relationships, and converts to appointments.", icon: CheckCircle2, color: "bg-green-50 text-green-600", calls: callLogs?.filter((c: any) => c.assistantType === "referral").length ?? 0 },
                    ].map(assistant => (
                      <Card key={assistant.name} className="border-0 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl ${assistant.color} flex items-center justify-center flex-shrink-0`}>
                              <assistant.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{assistant.name}</p>
                              <Badge variant="outline" className="text-xs mt-0.5 text-green-600 border-green-300">active</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{assistant.desc}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{assistant.calls} calls handled</span>
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2">Configure</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="how-it-works" className="mt-2">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                          { step: "1", title: "Select a Lead", desc: "Choose a lead from your pipeline or enter a phone number manually. The AI will use their profile to personalize the conversation.", icon: Phone, color: "bg-blue-50 text-blue-600" },
                          { step: "2", title: "AI Handles the Call", desc: "Your Vapi assistant calls the lead, qualifies them, answers mortgage questions, and handles objections — all without you lifting a finger.", icon: Bot, color: "bg-purple-50 text-purple-600" },
                          { step: "3", title: "Review & Follow Up", desc: "Get a full transcript, sentiment score, and outcome summary. Appointments are booked automatically and synced to your calendar.", icon: FileText, color: "bg-green-50 text-green-600" },
                        ].map(({ step, title, desc, icon: Icon, color }) => (
                          <div key={step} className="flex gap-4">
                            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0 font-bold text-sm`}>{step}</div>
                            <div><p className="font-semibold text-sm mb-1">{title}</p><p className="text-xs text-muted-foreground leading-relaxed">{desc}</p></div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-3">
                          <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">Powered by Vapi AI</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Our AI calling system uses Vapi's advanced voice AI to conduct natural, human-like conversations. Each call is recorded, transcribed, and analyzed for sentiment — giving you full visibility into every interaction.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* ── Email Tab ──────────────────────────────────────────────── */}
            <TabsContent value="email" className="mt-4">
              {emailCampaigns?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {emailCampaigns.map((c: any) => <CampaignCard key={c.id} campaign={c} type="email" />)}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <Mail className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No email campaigns yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Create your first campaign to start reaching leads</p>
                  <div className="mt-4"><CreateEmailCampaignDialog agencyId={resolvedAgencyId} onSuccess={refetchEmail} /></div>
                </div>
              )}
            </TabsContent>

            {/* ── SMS Tab ────────────────────────────────────────────────── */}
            <TabsContent value="sms" className="mt-4">
              {smsCampaigns?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {smsCampaigns.map((c: any) => <CampaignCard key={c.id} campaign={c} type="sms" />)}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No SMS campaigns yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Send your first SMS blast to your lead list</p>
                  <div className="mt-4"><CreateSMSCampaignDialog agencyId={resolvedAgencyId} onSuccess={refetchSMS} /></div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar: AI Coach */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <AISuccessCoachPanel context="campaigns" />
        </div>
      </div>
    </CRMLayout>
  );
}
