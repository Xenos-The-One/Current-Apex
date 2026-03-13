import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { trpc } from "@/lib/trpc";
import {
  Bot, Calendar, CheckCircle2, Clock, ExternalLink, FileText, Loader2, Mail, MessageSquare,
  Mic, Phone, PhoneCall, PhoneMissed, PhoneOff, Play, Plus, RefreshCw, Send, Sparkles,
  Star, TrendingUp, Users, Zap, BarChart2, XCircle, AlertCircle, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "answered" || outcome === "appointment_booked") return <PhoneCall className="w-4 h-4 text-green-600" />;
  if (outcome === "no_answer") return <PhoneMissed className="w-4 h-4 text-gray-500" />;
  if (outcome === "failed") return <PhoneOff className="w-4 h-4 text-red-500" />;
  return <Phone className="w-4 h-4 text-blue-500" />;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── AI Calling Sub-components ──────────────────────────────────────────────

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
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Outcome</p>
              <p className="font-semibold text-sm mt-0.5">{OUTCOME_LABELS[call.outcome] ?? call.outcome}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-semibold text-sm mt-0.5">{duration}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-semibold text-sm mt-0.5">{new Date(call.createdAt).toLocaleString()}</p>
            </div>
            {call.sentimentScore && (
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Sentiment</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <p className="font-semibold text-sm">{call.sentimentScore}/10</p>
                </div>
              </div>
            )}
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
                <Play className="w-3.5 h-3.5" /> Play Recording
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InitiateCallDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leadId: "", phoneNumber: "", assistantId: "" });
  const { data: myInfo } = trpc.crm.getMyInfo.useQuery();
  const clientId = myInfo?.client?.id ?? 1;
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
            {callMutation.isPending ? <span className="flex items-center gap-2"><Phone className="w-4 h-4 animate-pulse" /> Initiating...</span> : <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Start AI Call</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk AI Call Dialog ─────────────────────────────────────────────────────

function BulkCallDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [segment, setSegment] = useState("new");
  const [assistantId, setAssistantId] = useState("");
  const [calling, setCalling] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const { data: myInfo } = trpc.crm.getMyInfo.useQuery();
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
      } catch {
        // continue on individual failures
      }
      done++;
      setProgress({ done, total: eligibleLeads.length });
      // Small delay to avoid rate limiting
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
            {calling ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Calling {progress.done}/{progress.total}...</span> : <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Start Bulk Call ({eligibleLeads.length} leads)</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Analytics Drill-Down Sheet ──────────────────────────────────────────────

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

  const smsStats = type === "sms" && details ? {
    sent: campaign.sentCount ?? 0,
    delivered: campaign.deliveredCount ?? 0,
    failed: campaign.failedCount ?? 0,
    total: campaign.totalRecipients ?? 0,
    deliveryRate: campaign.sentCount > 0 ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100) : 0,
  } : null;

  const stats = emailStats || smsStats;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Campaign Analytics
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Campaign Info */}
          <div className="space-y-1">
            <h3 className="font-semibold text-base">{campaign.name}</h3>
            {type === "email" && <p className="text-sm text-muted-foreground">Subject: {campaign.subject}</p>}
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={campaign.status} />
              {campaign.sentDate && <span className="text-xs text-muted-foreground">Sent {new Date(campaign.sentDate).toLocaleDateString()}</span>}
              {campaign.scheduledDate && campaign.status === "scheduled" && <span className="text-xs text-muted-foreground">Scheduled {new Date(campaign.scheduledDate).toLocaleDateString()}</span>}
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 gap-3">
              {type === "email" && emailStats && (
                <>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{emailStats.sent}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Sent</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{emailStats.deliveryRate}%</p>
                    <p className="text-xs text-green-600 mt-0.5">Delivery Rate</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-700">{emailStats.openRate}%</p>
                    <p className="text-xs text-purple-600 mt-0.5">Open Rate</p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-teal-700">{emailStats.clickRate}%</p>
                    <p className="text-xs text-teal-600 mt-0.5">Click Rate</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{emailStats.failed}</p>
                    <p className="text-xs text-red-600 mt-0.5">Failed</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-700">{emailStats.opened}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Opened</p>
                  </div>
                </>
              )}
              {type === "sms" && smsStats && (
                <>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{smsStats.total}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Total Recipients</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{smsStats.deliveryRate}%</p>
                    <p className="text-xs text-green-600 mt-0.5">Delivery Rate</p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-teal-700">{smsStats.delivered}</p>
                    <p className="text-xs text-teal-600 mt-0.5">Delivered</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{smsStats.failed}</p>
                    <p className="text-xs text-red-600 mt-0.5">Failed</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SMS Recipients */}
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

// ─── Email Campaign Dialog ───────────────────────────────────────────────────

function CreateEmailCampaignDialog({ clientId, onSuccess }: { clientId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", subject: "", textContent: "", recipientFilter: "all" as const,
    scheduledDate: "", sendNow: false,
  });
  const createCampaign = trpc.campaignsOld.createEmailCampaign.useMutation({
    onSuccess: () => { toast.success("Email campaign created"); setOpen(false); setForm({ name: "", subject: "", textContent: "", recipientFilter: "all", scheduledDate: "", sendNow: false }); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> New Email Campaign</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-purple-600" /> New Email Campaign</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Campaign Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Q2 Rate Update" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Subject Line *</Label>
            <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Rates just dropped — here's what it means for you" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Message Body *</Label>
            <Textarea value={form.textContent} onChange={e => setForm(f => ({ ...f, textContent: e.target.value }))} rows={5} placeholder="Hi {name}, I wanted to reach out..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Recipients</Label>
            <Select value={form.recipientFilter} onValueChange={(v: any) => setForm(f => ({ ...f, recipientFilter: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="status">By Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Schedule Send (optional)</Label>
            <Input type="datetime-local" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value, sendNow: false }))} />
            <p className="text-xs text-muted-foreground">Leave blank to save as draft, or check "Send Now" below</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="sendNow" checked={form.sendNow} onChange={e => setForm(f => ({ ...f, sendNow: e.target.checked, scheduledDate: e.target.checked ? "" : f.scheduledDate }))} className="rounded" />
            <Label htmlFor="sendNow" className="text-sm cursor-pointer">Send immediately</Label>
          </div>
          <Button
            className="w-full"
            disabled={createCampaign.isPending || !form.name || !form.subject || !form.textContent}
            onClick={() => createCampaign.mutate({
              clientId,
              name: form.name,
              subject: form.subject,
              textContent: form.textContent,
              recipientFilter: form.recipientFilter,
              scheduledDate: form.scheduledDate ? new Date(form.scheduledDate) : undefined,
              sendNow: form.sendNow,
            })}
          >
            {createCampaign.isPending ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span> : form.sendNow ? <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Send Now</span> : <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Create Campaign</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SMS Campaign Dialog ─────────────────────────────────────────────────────

function CreateSMSCampaignDialog({ clientId, onSuccess }: { clientId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", segment: "all", scheduledFor: "", sendNow: false });
  const { data: leadsData } = trpc.crm.listMyLeads.useQuery({ limit: 200 });
  const createCampaign = trpc.smsCampaigns.createCampaign.useMutation({
    onSuccess: () => { toast.success("SMS campaign created"); setOpen(false); setForm({ name: "", message: "", segment: "all", scheduledFor: "", sendNow: false }); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  const eligibleLeads = useMemo(() => {
    const all = leadsData?.leads ?? [];
    if (form.segment === "all") return all.filter((l: any) => l.phone);
    return all.filter((l: any) => l.phone && l.status === form.segment);
  }, [leadsData, form.segment]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> New SMS Campaign</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-green-600" /> New SMS Campaign</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Campaign Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rate Drop Alert" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Message * <span className="text-muted-foreground font-normal">({form.message.length}/160)</span></Label>
            <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} placeholder="Hi {name}! Rates just dropped to 6.5%. Reply CALL to schedule a free consultation." maxLength={1600} />
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
            <p className="text-xs text-muted-foreground">{eligibleLeads.length} leads with phone numbers</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Schedule Send (optional)</Label>
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
            {createCampaign.isPending ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span> : form.sendNow ? <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Send to {eligibleLeads.length} Leads</span> : <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Create Campaign</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Campaign Card ───────────────────────────────────────────────────────────

function CampaignCard({ campaign, type, onViewStats }: { campaign: any; type: "email" | "sms"; onViewStats: () => void }) {
  const icon = type === "email" ? <Mail className="w-4 h-4 text-purple-600" /> : <MessageSquare className="w-4 h-4 text-green-600" />;
  const sent = campaign.sentCount ?? 0;
  const failed = campaign.failedCount ?? 0;
  const total = campaign.totalRecipients ?? sent;

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">{icon}</div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{campaign.name}</p>
              {type === "email" && campaign.subject && <p className="text-xs text-muted-foreground truncate">{campaign.subject}</p>}
            </div>
          </div>
          <StatusBadge status={campaign.status} />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold">{sent}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </div>
          {type === "email" ? (
            <>
              <div className="text-center">
                <p className="text-lg font-bold">{campaign.openCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Opened</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{sent > 0 ? Math.round((campaign.openCount / sent) * 100) : 0}%</p>
                <p className="text-xs text-muted-foreground">Open Rate</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-lg font-bold">{campaign.deliveredCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{sent > 0 ? Math.round(((campaign.deliveredCount ?? 0) / sent) * 100) : 0}%</p>
                <p className="text-xs text-muted-foreground">Delivery Rate</p>
              </div>
            </>
          )}
        </div>
        {(campaign.sentDate || campaign.scheduledDate || campaign.scheduledFor) && (
          <p className="text-xs text-muted-foreground mb-3">
            {campaign.sentDate ? `Sent ${new Date(campaign.sentDate).toLocaleDateString()}` :
             (campaign.scheduledDate || campaign.scheduledFor) ? `Scheduled ${new Date(campaign.scheduledDate || campaign.scheduledFor).toLocaleDateString()}` : ""}
          </p>
        )}
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={onViewStats}>
          <BarChart2 className="w-3.5 h-3.5" /> View Stats
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Campaigns() {
  const { agencyId } = useAgency();
  const [mainTab, setMainTab] = useState("ai-calling");
  const [callSubTab, setCallSubTab] = useState("history");
  const [selectedCampaign, setSelectedCampaign] = useState<{ campaign: any; type: "email" | "sms" } | null>(null);

  // Get current user's client info
  const { data: myInfo } = trpc.crm.getMyInfo.useQuery();
  const clientId = myInfo?.client?.id ?? 1;

  // AI Calling data
  const { data: callLogs, isLoading: callsLoading, refetch: refetchCalls } = trpc.vapi.listCalls.useQuery({ limit: 50 });

  // Email campaigns
  const { data: emailCampaigns, isLoading: emailLoading, refetch: refetchEmail } = trpc.campaignsOld.listEmailCampaigns.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  // SMS campaigns
  const { data: smsCampaigns, isLoading: smsLoading, refetch: refetchSMS } = trpc.smsCampaigns.getCampaigns.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  // Summary stats
  const callStats = useMemo(() => ({
    total: callLogs?.length ?? 0,
    answered: callLogs?.filter((c: any) => c.outcome === "answered" || c.outcome === "appointment_booked").length ?? 0,
    avgDuration: callLogs?.length
      ? Math.round(callLogs.reduce((s: number, c: any) => s + (c.duration || 0), 0) / callLogs.length)
      : 0,
    appointments: callLogs?.filter((c: any) => c.outcome === "appointment_booked").length ?? 0,
    answerRate: callLogs?.length
      ? Math.round((callLogs.filter((c: any) => c.outcome === "answered" || c.outcome === "appointment_booked").length / callLogs.length) * 100)
      : 0,
  }), [callLogs]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Campaigns</h1>
            <p className="text-muted-foreground text-sm mt-0.5">AI Calling, Email, and SMS campaigns in one place</p>
          </div>
          {mainTab === "ai-calling" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetchCalls()}>
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
              <BulkCallDialog onSuccess={refetchCalls} />
              <InitiateCallDialog onSuccess={refetchCalls} />
            </div>
          )}
          {mainTab === "email" && <CreateEmailCampaignDialog clientId={clientId} onSuccess={refetchEmail} />}
          {mainTab === "sms" && <CreateSMSCampaignDialog clientId={clientId} onSuccess={refetchSMS} />}
        </div>

        {/* Summary KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setMainTab("ai-calling")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><Phone className="w-4 h-4 text-blue-600" /></div>
              <div><p className="text-xl font-bold">{callStats.total}</p><p className="text-xs text-muted-foreground">AI Calls</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setMainTab("email")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0"><Mail className="w-4 h-4 text-purple-600" /></div>
              <div><p className="text-xl font-bold">{emailCampaigns?.length ?? 0}</p><p className="text-xs text-muted-foreground">Email Campaigns</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setMainTab("sms")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0"><MessageSquare className="w-4 h-4 text-green-600" /></div>
              <div><p className="text-xl font-bold">{smsCampaigns?.length ?? 0}</p><p className="text-xs text-muted-foreground">SMS Campaigns</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-4 h-4 text-teal-600" /></div>
              <div>
                <p className="text-xl font-bold">
                  {(emailCampaigns?.filter((c: any) => c.status === "sent").length ?? 0) +
                   (smsCampaigns?.filter((c: any) => c.status === "sent").length ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">Active / Sent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="ai-calling" className="gap-1.5">
              <Phone className="w-3.5 h-3.5" /> AI Calling
              {callStats.total > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{callStats.total}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </TabsTrigger>
          </TabsList>

          {/* ── AI Calling Tab ─────────────────────────────────────────────── */}
          <TabsContent value="ai-calling" className="mt-4 space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
                    <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Sub-tabs */}
            <Tabs value={callSubTab} onValueChange={setCallSubTab}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="history" className="gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Call History
                    {callStats.total > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{callStats.total}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="assistants" className="gap-1.5"><Bot className="w-3.5 h-3.5" /> AI Assistants</TabsTrigger>
                  <TabsTrigger value="how-it-works" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> How It Works</TabsTrigger>
                </TabsList>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => refetchCalls()}>
                  <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
              </div>

              <TabsContent value="history" className="mt-3">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      Recent Calls
                      <span className="text-xs font-normal text-muted-foreground">{callStats.answerRate}% answer rate</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {callsLoading ? (
                      <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
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
                                  <p className="text-xs text-muted-foreground">{call.phoneNumber && call.leadName ? `${call.phoneNumber} · ` : ""}{new Date(call.createdAt).toLocaleString()}</p>
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
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">Click "Start AI Call" to initiate your first Vapi-powered call.</p>
                        <div className="mt-4"><InitiateCallDialog onSuccess={refetchCalls} /></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assistants" className="mt-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: "Facebook Lead Assistant", desc: "Handles inbound Facebook lead inquiries, qualifies borrowers, and schedules consultations.", icon: Users, color: "bg-blue-50 text-blue-600", calls: callLogs?.filter((c: any) => c.assistantType === "facebook").length ?? 0 },
                    { name: "Instagram Lead Assistant", desc: "Engages Instagram leads, answers mortgage questions, and books discovery calls.", icon: Bot, color: "bg-pink-50 text-pink-600", calls: callLogs?.filter((c: any) => c.assistantType === "instagram").length ?? 0 },
                    { name: "Referral Follow-Up", desc: "Follows up with referral leads, nurtures relationships, and converts warm introductions.", icon: Phone, color: "bg-green-50 text-green-600", calls: callLogs?.filter((c: any) => c.assistantType === "referral").length ?? 0 },
                  ].map(({ name, desc, icon: Icon, color, calls }) => (
                    <Card key={name} className="border-0 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}><Icon className="w-5 h-5" /></div>
                          <div>
                            <p className="font-semibold text-sm">{name}</p>
                            <Badge variant="outline" className="text-[10px] mt-0.5 text-green-700 border-green-300 bg-green-50">Active</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{desc}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{calls} calls</span>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2">Configure</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="how-it-works" className="mt-3">
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
                          <p className="text-xs text-muted-foreground mt-0.5">Our AI calling system uses Vapi's advanced voice AI to conduct natural, human-like conversations. Each call is recorded, transcribed, and analyzed for sentiment — giving you full visibility into every interaction.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ── Email Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="email" className="mt-4">
            {emailLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            ) : emailCampaigns?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {emailCampaigns.map((c: any) => (
                  <CampaignCard key={c.id} campaign={c} type="email" onViewStats={() => setSelectedCampaign({ campaign: c, type: "email" })} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No email campaigns yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Create your first campaign to start reaching leads</p>
                <div className="mt-4"><CreateEmailCampaignDialog clientId={clientId} onSuccess={refetchEmail} /></div>
              </div>
            )}
          </TabsContent>

          {/* ── SMS Tab ───────────────────────────────────────────────────── */}
          <TabsContent value="sms" className="mt-4">
            {smsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            ) : smsCampaigns?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {smsCampaigns.map((c: any) => (
                  <CampaignCard key={c.id} campaign={c} type="sms" onViewStats={() => setSelectedCampaign({ campaign: c, type: "sms" })} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No SMS campaigns yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Send your first SMS blast to your lead list</p>
                <div className="mt-4"><CreateSMSCampaignDialog clientId={clientId} onSuccess={refetchSMS} /></div>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
