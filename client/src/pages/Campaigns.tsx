import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import AISuccessCoachPanel from "@/components/AISuccessCoachPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  MousePointerClick,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  paused: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

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

  const handleGenerate = () => {
    if (!form.name) { toast.error("Enter a campaign name first"); return; }
    setGenerating(true);
    generateMutation.mutate({ purpose: form.name, tone: "professional" });
  };

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
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleGenerate} disabled={generating}>
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
    onSuccess: (data: any) => {
      setForm(f => ({ ...f, message: data.message || f.message }));
      setGenerating(false);
      toast.success("AI content generated");
    },
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
                  onClick={() => { setGenerating(true); generateMutation.mutate({ purpose: form.name || "mortgage follow-up" }); }}
                  disabled={generating}>
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

        {type === "email" && (
          <p className="text-xs text-muted-foreground mt-2 truncate">Subject: {campaign.subject}</p>
        )}
        {type === "sms" && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{campaign.message}</p>
        )}

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
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1">
              <Send className="w-3 h-3" /> Send
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Campaigns() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;
  const [tab, setTab] = useState("email");

  const { data: emailCampaigns, refetch: refetchEmail } = trpc.campaigns.listEmail.useQuery({ agencyId });
  const { data: smsCampaigns, refetch: refetchSMS } = trpc.campaigns.listSms.useQuery({ agencyId });

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="flex gap-4 p-6">
        <div className="flex-1 min-w-0 space-y-4 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Campaigns</h1>
            <p className="text-muted-foreground text-sm">Email and SMS marketing campaigns</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === "email" ? (
              <CreateEmailCampaignDialog agencyId={agencyId} onSuccess={refetchEmail} />
            ) : (
              <CreateSMSCampaignDialog agencyId={agencyId} onSuccess={refetchSMS} />
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Email Campaigns", value: emailCampaigns?.length ?? 0, icon: Mail, color: "blue" },
            { label: "SMS Campaigns", value: smsCampaigns?.length ?? 0, icon: MessageSquare, color: "purple" },
            { label: "Total Sent", value: (emailCampaigns?.reduce((s: number, c: any) => s + (c.totalSent || 0), 0) ?? 0) + (smsCampaigns?.reduce((s: number, c: any) => s + (c.totalSent || 0), 0) ?? 0), icon: Send, color: "green" },
            { label: "Active", value: [...(emailCampaigns || []), ...(smsCampaigns || [])].filter((c: any) => c.status === "sending" || c.status === "scheduled").length, icon: CheckCircle, color: "teal" },
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

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="email" className="gap-2"><Mail className="w-4 h-4" /> Email ({emailCampaigns?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="sms" className="gap-2"><MessageSquare className="w-4 h-4" /> SMS ({smsCampaigns?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            {emailCampaigns?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {emailCampaigns.map(c => <CampaignCard key={c.id} campaign={c} type="email" />)}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No email campaigns yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Create your first campaign to start reaching leads</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sms" className="mt-4">
            {smsCampaigns?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {smsCampaigns.map(c => <CampaignCard key={c.id} campaign={c} type="sms" />)}
              </div>
            ) : (
              <div className="py-16 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No SMS campaigns yet</p>
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
