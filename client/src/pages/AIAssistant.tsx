import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bot, Brain, Copy, Mail, MessageSquare, RefreshCw, Sparkles, Star, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function ScoreLeadPanel({ agencyId }: { agencyId: number }) {
  const [leadId, setLeadId] = useState("");
  const [result, setResult] = useState<any>(null);

  const scoreMutation = trpc.ai.scoreLead.useMutation({
    onSuccess: (data: any) => { setResult(data); toast.success("Lead scored"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Enter Lead ID to score"
          value={leadId}
          onChange={e => setLeadId(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={() => scoreMutation.mutate({ agencyId, leadId: parseInt(leadId) })}
          disabled={scoreMutation.isPending || !leadId}
          className="gap-1.5"
        >
          <Brain className="w-4 h-4" />
          {scoreMutation.isPending ? "Scoring..." : "Score Lead"}
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          {result.results?.map((r: any) => (
            <Card key={r.leadId}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">Lead #{r.leadId}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{r.reasoning}</p>
                  </div>
                  <div className="text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${r.score >= 70 ? "score-high" : r.score >= 40 ? "score-medium" : "score-low"}`}>
                      {r.score}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Score</p>
                  </div>
                </div>
                {r.nextActions?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">RECOMMENDED ACTIONS</p>
                    <div className="space-y-1">
                      {r.nextActions.map((action: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailGeneratorPanel({ agencyId }: { agencyId: number }) {
  const [form, setForm] = useState({ purpose: "", tone: "professional", recipientType: "borrower" });
  const [result, setResult] = useState<any>(null);

  const generateMutation = trpc.ai.generateEmailContent.useMutation({
    onSuccess: (data) => { setResult(data); toast.success("Email generated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Email Purpose</Label>
          <Input
            value={form.purpose}
            onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
            placeholder="Follow up after initial consultation..."
          />
        </div>
        <div className="space-y-1">
          <Label>Tone</Label>
          <Select value={form.tone} onValueChange={v => setForm(f => ({ ...f, tone: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["professional", "friendly", "urgent", "educational", "congratulatory"].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Recipient Type</Label>
        <Select value={form.recipientType} onValueChange={v => setForm(f => ({ ...f, recipientType: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["borrower", "re_agent", "referral_partner", "past_client"].map(t => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        className="w-full gap-1.5"
        onClick={() => generateMutation.mutate({ purpose: form.purpose, tone: form.tone as any })}
        disabled={generateMutation.isPending || !form.purpose}
      >
        <Sparkles className="w-4 h-4" />
        {generateMutation.isPending ? "Generating..." : "Generate Email"}
      </Button>

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Generated Email</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => generateMutation.mutate({ purpose: form.purpose, tone: form.tone as any })}>
                <RefreshCw className="w-3 h-3" /> Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">SUBJECT</Label>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(result.subject)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-sm font-medium bg-muted/50 rounded p-2">{result.subject}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">BODY</Label>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(result.body)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-sm bg-muted/50 rounded p-3 whitespace-pre-wrap max-h-64 overflow-y-auto">{result.body}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SMSGeneratorPanel({ agencyId }: { agencyId: number }) {
  const [purpose, setPurpose] = useState("");
  const [result, setResult] = useState<any>(null);

  const generateMutation = trpc.ai.generateSmsContent.useMutation({
    onSuccess: (data) => { setResult(data); toast.success("SMS generated"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>SMS Purpose</Label>
        <Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Remind about upcoming appointment..." />
      </div>
      <Button
        className="w-full gap-1.5"
        onClick={() => generateMutation.mutate({ purpose })}
        disabled={generateMutation.isPending || !purpose}
      >
        <Sparkles className="w-4 h-4" />
        {generateMutation.isPending ? "Generating..." : "Generate SMS"}
      </Button>

      {result && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm">{result.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{result.message?.length || 0}/160 characters</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(result.message).then(() => toast.success("Copied"))}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AIAssistant() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-4 fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">AI Assistant</h1>
            <p className="text-muted-foreground text-sm">LLM-powered lead scoring, content generation, and recommendations</p>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Brain, label: "Lead Scoring", desc: "AI analyzes lead behavior and data to assign priority scores", color: "blue" },
            { icon: Mail, label: "Email Generator", desc: "Generate personalized emails for any purpose and recipient", color: "purple" },
            { icon: MessageSquare, label: "SMS Generator", desc: "Create concise, effective SMS messages under 160 characters", color: "teal" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className={`p-4 rounded-xl border border-border bg-gradient-to-br from-${color}-50/50 to-transparent`}>
              <div className={`w-9 h-9 rounded-lg bg-${color}-100 flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
              </div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="scoring">
          <TabsList>
            <TabsTrigger value="scoring" className="gap-1.5"><Brain className="w-4 h-4" /> Lead Scoring</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5"><Mail className="w-4 h-4" /> Email Generator</TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5"><MessageSquare className="w-4 h-4" /> SMS Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="scoring" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Lead Scoring</CardTitle>
                <p className="text-sm text-muted-foreground">Enter a lead ID to get an AI-powered score and recommended next actions</p>
              </CardHeader>
              <CardContent>
                <ScoreLeadPanel agencyId={agencyId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Email Generator</CardTitle>
                <p className="text-sm text-muted-foreground">Generate personalized email content for your leads and partners</p>
              </CardHeader>
              <CardContent>
                <EmailGeneratorPanel agencyId={agencyId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI SMS Generator</CardTitle>
                <p className="text-sm text-muted-foreground">Generate concise SMS messages optimized for engagement</p>
              </CardHeader>
              <CardContent>
                <SMSGeneratorPanel agencyId={agencyId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
