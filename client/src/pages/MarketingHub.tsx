import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  FileText,
  Mail,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-yellow-100 text-yellow-700",
  sent: "bg-green-100 text-green-700",
  paused: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

// ─── Email Tab ─────────────────────────────────────────────────────────────
function EmailTab({ agencyId }: { agencyId: number }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", fromName: "", fromEmail: "", content: "" });

  const { data: campaigns = [], refetch } = trpc.campaigns.listEmail.useQuery({ agencyId, limit: 50, offset: 0 });

  const createCampaign = trpc.campaigns.createEmail.useMutation({
    onSuccess: () => { toast.success("Email campaign created"); setShowCreate(false); refetch(); },
    onError: () => toast.error("Failed to create campaign"),
  });



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{campaigns.length} email campaigns</p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Email Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Campaign Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Q1 Lead Nurture" />
              </div>
              <div>
                <Label>Subject Line *</Label>
                <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Ready to get pre-approved?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>From Name</Label>
                  <Input value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} placeholder="John Smith" />
                </div>
                <div>
                  <Label>From Email</Label>
                  <Input type="email" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} placeholder="john@agency.com" />
                </div>
              </div>
              <div>
                <Label>Email Content *</Label>
                <Textarea rows={6} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your email content here..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createCampaign.mutate({ agencyId, name: form.name, subject: form.subject, fromName: form.fromName || undefined, fromEmail: form.fromEmail || undefined, content: form.content })}
                disabled={!form.name || !form.subject || !form.content || createCampaign.isPending}
              >
                {createCampaign.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No email campaigns yet. Create your first campaign.
            </CardContent>
          </Card>
        ) : (
          campaigns.map((c: (typeof campaigns)[number]) => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[c.status ?? "draft"]}`}>
                        {c.status ?? "draft"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {c.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => toast.info("Connect SendGrid API key to enable sending")}
                      >
                        <Send className="w-3 h-3 mr-1" /> Send
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Sent", value: c.totalSent ?? 0 },
                    { label: "Opened", value: c.totalOpened ?? 0 },
                    { label: "Clicked", value: c.totalClicked ?? 0 },
                    { label: "Bounced", value: c.totalBounced ?? 0 },
                  ].map(stat => (
                    <div key={stat.label} className="bg-muted/40 rounded-lg p-2">
                      <p className="text-sm font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── SMS Tab ───────────────────────────────────────────────────────────────
function SmsTab({ agencyId }: { agencyId: number }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", message: "" });

  const { data: campaigns = [], refetch } = trpc.campaigns.listSms.useQuery({ agencyId, limit: 50, offset: 0 });

  const createCampaign = trpc.campaigns.createSms.useMutation({
    onSuccess: () => { toast.success("SMS campaign created"); setShowCreate(false); refetch(); },
    onError: () => toast.error("Failed to create SMS campaign"),
  });



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{campaigns.length} SMS campaigns</p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New SMS Campaign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create SMS Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Campaign Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="New Lead Welcome" />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea
                  rows={4}
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Hi {{firstName}}, I saw you're interested in getting pre-approved. I'd love to help! Reply YES to schedule a quick call."
                />
                <p className="text-xs text-muted-foreground mt-1">{form.message.length}/160 characters</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createCampaign.mutate({ agencyId, name: form.name, message: form.message })}
                disabled={!form.name || !form.message || createCampaign.isPending}
              >
                {createCampaign.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No SMS campaigns yet. Create your first SMS campaign.
            </CardContent>
          </Card>
        ) : (
          campaigns.map((c: (typeof campaigns)[number]) => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[c.status ?? "draft"]}`}>
                        {c.status ?? "draft"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.message}</p>
                  </div>
                  {c.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs flex-shrink-0"
                      onClick={() => toast.info("Connect Twilio API key to enable sending")}
                    >
                      <Send className="w-3 h-3 mr-1" /> Send
                    </Button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Sent", value: c.totalSent ?? 0 },
                    { label: "Delivered", value: c.totalDelivered ?? 0 },
                    { label: "Failed", value: c.totalFailed ?? 0 },
                  ].map(stat => (
                    <div key={stat.label} className="bg-muted/40 rounded-lg p-2">
                      <p className="text-sm font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── AI Scripts Tab ────────────────────────────────────────────────────────
function AIScriptsTab({ agencyId }: { agencyId: number }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", purpose: "cold_call" as const, script: "" });
  const [generating, setGenerating] = useState(false);

  const { data: scripts = [], refetch } = trpc.vapi.listScripts.useQuery({ agencyId });

  const createScript = trpc.vapi.createScript.useMutation({
    onSuccess: () => { toast.success("AI script created"); setShowCreate(false); refetch(); },
    onError: () => toast.error("Failed to create script"),
  });

  const generateScript = trpc.ai.generateCallScript.useMutation({
    onSuccess: (data: { script: string }) => {
      setForm(p => ({ ...p, script: data.script }));
      setGenerating(false);
    },
    onError: () => { toast.error("Failed to generate script"); setGenerating(false); },
  });

  const handleGenerate = () => {
    setGenerating(true);
    generateScript.mutate({
      purpose: form.purpose,
      leadContext: `Lead type: borrower, Script name: ${form.name}`,
    });
  };

  const PURPOSE_LABELS: Record<string, string> = {
    cold_call: "Cold Call",
    follow_up: "Follow-Up",
    appointment_booking: "Appointment Booking",
    re_engagement: "Re-Engagement",
    referral_request: "Referral Request",
    other: "Other",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{scripts.length} AI scripts</p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New Script</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create AI Script</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Script Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Cold Call - New Borrower" />
              </div>
              <div>
                <Label>Purpose</Label>
                <Select value={form.purpose} onValueChange={v => setForm(p => ({ ...p, purpose: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PURPOSE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Script Content *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs gap-1"
                    onClick={handleGenerate}
                    disabled={!form.name || generating}
                  >
                    <Sparkles className="w-3 h-3" />
                    {generating ? "Generating..." : "AI Generate"}
                  </Button>
                </div>
                <Textarea rows={8} value={form.script} onChange={e => setForm(p => ({ ...p, script: e.target.value }))} placeholder="Hi {{firstName}}, this is {{agentName}} calling from {{agencyName}}..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createScript.mutate({ agencyId, name: form.name, purpose: form.purpose, script: form.script })}
                disabled={!form.name || !form.script || createScript.isPending}
              >
                {createScript.isPending ? "Saving..." : "Save Script"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {scripts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No AI scripts yet. Create scripts for your Vapi calling assistants.
            </CardContent>
          </Card>
        ) : (
          scripts.map((s: (typeof scripts)[number]) => (
            <Card key={s.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    <Badge variant="outline" className="text-xs mt-1 capitalize">{(s.purpose ?? "").replace("_", " ")}</Badge>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.script}</p>
                  </div>
                  <Badge variant={s.isActive ? "default" : "secondary"} className="text-xs flex-shrink-0">
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Templates Tab ─────────────────────────────────────────────────────────
function TemplatesTab({ agencyId }: { agencyId: number }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "email" as const, subject: "", content: "" });

  const { data: templates = [], refetch } = trpc.campaigns.listTemplates.useQuery({ agencyId });

  const createTemplate = trpc.campaigns.createTemplate.useMutation({
    onSuccess: () => { toast.success("Template created"); setShowCreate(false); refetch(); },
    onError: () => toast.error("Failed to create template"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} templates</p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Template Name *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Welcome Email" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.type === "email" && (
                <div>
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Welcome to {{agencyName}}" />
                </div>
              )}
              <div>
                <Label>Content *</Label>
                <Textarea rows={6} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Use {{firstName}}, {{lastName}}, {{agencyName}} as variables..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createTemplate.mutate({ agencyId, name: form.name, type: form.type, subject: form.subject || undefined, content: form.content })}
                disabled={!form.name || !form.content || createTemplate.isPending}
              >
                {createTemplate.isPending ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {templates.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No templates yet. Create reusable email and SMS templates.
            </CardContent>
          </Card>
        ) : (
          templates.map((t: (typeof templates)[number]) => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{t.name}</p>
                    {t.subject && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.subject}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">{t.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{t.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Marketing Hub ────────────────────────────────────────────────────
export default function MarketingHub() {
  const { agencyId } = useAgency();

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-display">Marketing</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Email campaigns, SMS blasts, AI calling scripts, and reusable templates</p>
        </div>

        <Tabs defaultValue="email">
          <TabsList className="h-9">
            <TabsTrigger value="email" className="gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </TabsTrigger>
            <TabsTrigger value="ai-scripts" className="gap-1.5">
              <Bot className="w-3.5 h-3.5" /> AI Scripts
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            <EmailTab agencyId={agencyId} />
          </TabsContent>
          <TabsContent value="sms" className="mt-4">
            <SmsTab agencyId={agencyId} />
          </TabsContent>
          <TabsContent value="ai-scripts" className="mt-4">
            <AIScriptsTab agencyId={agencyId} />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <TemplatesTab agencyId={agencyId} />
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
