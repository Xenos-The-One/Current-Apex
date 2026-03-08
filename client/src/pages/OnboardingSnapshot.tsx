import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  User,
  Building2,
  Share2,
  Settings2,
  Zap,
  Loader2,
  ExternalLink,
} from "lucide-react";

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Client Info", icon: User, description: "Basic contact details" },
  { id: 2, title: "Business Info", icon: Building2, description: "Company and industry" },
  { id: 3, title: "Social & Ads", icon: Share2, description: "Facebook, Instagram, ad accounts" },
  { id: 4, title: "Brand & SEO", icon: Settings2, description: "Voice, audience, services" },
  { id: 5, title: "Automation", icon: Zap, description: "Vapi, SMS, email settings" },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingSnapshot() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [currentStep, setCurrentStep] = useState(1);
  const [result, setResult] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({
    clientFirstName: "",
    clientLastName: "",
    clientEmail: "",
    clientPhone: "",
    businessName: "",
    businessType: "",
    industry: "",
    businessPhone: "",
    businessEmail: "",
    businessWebsite: "",
    socialFacebook: "",
    socialInstagram: "",
    facebookAdAccountId: "",
    facebookPageId: "",
    brandVoice: "",
    targetAudience: "",
    primaryServices: "",
    uniqueSellingProp: "",
    serviceAreas: "",
    monthlyBudget: "",
    agencyId: 1,
    enableVapiCalls: true,
    enableSmsFollowUp: true,
    enableEmailFollowUp: true,
    sendWelcomeEmail: true,
  });

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const applySnapshot = trpc.onboardingSnapshot.applySnapshot.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success(`✅ Snapshot applied for ${data.summary.clientName}!`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to apply snapshot");
    },
  });

  const handleSubmit = () => {
    if (!form.clientFirstName || !form.clientLastName || !form.clientEmail || !form.clientPhone || !form.businessName) {
      toast.error("Please fill in all required fields (Step 1 & 2)");
      setCurrentStep(1);
      return;
    }

    applySnapshot.mutate({
      ...form,
      monthlyBudget: form.monthlyBudget ? Number(form.monthlyBudget) : undefined,
    });
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </DashboardLayout>
    );
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Rocket className="w-8 h-8 text-emerald-500" />
              <h1 className="text-2xl font-bold">Snapshot Applied! 🎉</h1>
            </div>
            <p className="text-muted-foreground">
              {result.summary.clientName} ({result.summary.businessName}) is now set up in the CRM.
            </p>
          </div>

          <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="text-emerald-700 dark:text-emerald-400 text-base">Setup Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <StatusBadge done={true} label={`Client record created (ID: ${result.clientId})`} />
              <StatusBadge done={result.summary.vapiEnabled} label="Vapi auto-calls enabled" />
              <StatusBadge done={result.summary.welcomeEmailSent} label="Welcome email sent" />
              <StatusBadge done={result.summary.welcomeSmsSent} label="Welcome SMS sent" />
              <StatusBadge done={result.summary.templatesAvailable > 0} label={`${result.summary.templatesAvailable} system templates available`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 font-mono text-xs text-muted-foreground">
                {result.log.map((line: string, i: number) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/leads")}>
              View Pipeline
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => { setResult(null); setCurrentStep(1); setForm(f => ({ ...f, clientFirstName: "", clientLastName: "", clientEmail: "", clientPhone: "" })); }}>
              Onboard Another Client
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Rocket className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold">Onboarding Snapshot</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Fill in the client's info from your onboarding call. The system will provision their full account in under 1 minute.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : isDone
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Step 1: Client Info */}
            {currentStep === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>First Name <span className="text-red-500">*</span></Label>
                    <Input value={form.clientFirstName} onChange={e => set("clientFirstName", e.target.value)} placeholder="Kyle" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name <span className="text-red-500">*</span></Label>
                    <Input value={form.clientLastName} onChange={e => set("clientLastName", e.target.value)} placeholder="Smith" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input type="email" value={form.clientEmail} onChange={e => set("clientEmail", e.target.value)} placeholder="kyle@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone <span className="text-red-500">*</span></Label>
                  <Input type="tel" value={form.clientPhone} onChange={e => set("clientPhone", e.target.value)} placeholder="+1 702-555-0100" />
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly Budget ($)</Label>
                  <Input type="number" value={form.monthlyBudget} onChange={e => set("monthlyBudget", e.target.value)} placeholder="2000" />
                </div>
              </>
            )}

            {/* Step 2: Business Info */}
            {currentStep === 2 && (
              <>
                <div className="space-y-1.5">
                  <Label>Business Name <span className="text-red-500">*</span></Label>
                  <Input value={form.businessName} onChange={e => set("businessName", e.target.value)} placeholder="Premier Realty Group" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Business Type</Label>
                    <Input value={form.businessType} onChange={e => set("businessType", e.target.value)} placeholder="Real Estate" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Industry</Label>
                    <Input value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="Mortgage / Real Estate" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Business Phone</Label>
                  <Input type="tel" value={form.businessPhone} onChange={e => set("businessPhone", e.target.value)} placeholder="+1 702-555-0200" />
                </div>
                <div className="space-y-1.5">
                  <Label>Business Email</Label>
                  <Input type="email" value={form.businessEmail} onChange={e => set("businessEmail", e.target.value)} placeholder="info@premierrealty.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website URL</Label>
                  <Input type="url" value={form.businessWebsite} onChange={e => set("businessWebsite", e.target.value)} placeholder="https://premierrealty.com" />
                </div>
              </>
            )}

            {/* Step 3: Social & Ads */}
            {currentStep === 3 && (
              <>
                <div className="space-y-1.5">
                  <Label>Facebook Page URL</Label>
                  <Input value={form.socialFacebook} onChange={e => set("socialFacebook", e.target.value)} placeholder="https://facebook.com/premierrealty" />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram Handle</Label>
                  <Input value={form.socialInstagram} onChange={e => set("socialInstagram", e.target.value)} placeholder="@premierrealty" />
                </div>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Facebook Ads (from Business Manager)</p>
                <div className="space-y-1.5">
                  <Label>Facebook Ad Account ID</Label>
                  <Input value={form.facebookAdAccountId} onChange={e => set("facebookAdAccountId", e.target.value)} placeholder="act_123456789" />
                </div>
                <div className="space-y-1.5">
                  <Label>Facebook Page ID</Label>
                  <Input value={form.facebookPageId} onChange={e => set("facebookPageId", e.target.value)} placeholder="123456789012345" />
                </div>
              </>
            )}

            {/* Step 4: Brand & SEO */}
            {currentStep === 4 && (
              <>
                <div className="space-y-1.5">
                  <Label>Brand Voice</Label>
                  <Textarea value={form.brandVoice} onChange={e => set("brandVoice", e.target.value)} rows={3} placeholder="Professional, trustworthy, approachable. We speak plainly and avoid jargon." />
                </div>
                <div className="space-y-1.5">
                  <Label>Target Audience</Label>
                  <Textarea value={form.targetAudience} onChange={e => set("targetAudience", e.target.value)} rows={2} placeholder="First-time homebuyers in Las Vegas, NV aged 28-45" />
                </div>
                <div className="space-y-1.5">
                  <Label>Primary Services</Label>
                  <Textarea value={form.primaryServices} onChange={e => set("primaryServices", e.target.value)} rows={2} placeholder="Home purchase loans, refinancing, FHA/VA loans, jumbo loans" />
                </div>
                <div className="space-y-1.5">
                  <Label>Unique Selling Proposition</Label>
                  <Textarea value={form.uniqueSellingProp} onChange={e => set("uniqueSellingProp", e.target.value)} rows={2} placeholder="We close in 21 days or less and offer the lowest rates in Nevada" />
                </div>
                <div className="space-y-1.5">
                  <Label>Service Areas</Label>
                  <Input value={form.serviceAreas} onChange={e => set("serviceAreas", e.target.value)} placeholder="Las Vegas, Henderson, Summerlin, North Las Vegas" />
                </div>
              </>
            )}

            {/* Step 5: Automation */}
            {currentStep === 5 && (
              <>
                <div className="space-y-4">
                  {[
                    { key: "enableVapiCalls", label: "Enable Vapi AI Calls", description: "AI calls new leads within 5 minutes of capture (during business hours)" },
                    { key: "enableSmsFollowUp", label: "Enable SMS Follow-Up", description: "Instant welcome SMS + automated follow-up sequences" },
                    { key: "enableEmailFollowUp", label: "Enable Email Follow-Up", description: "Welcome email + nurture sequences sent automatically" },
                    { key: "sendWelcomeEmail", label: "Send Welcome Email Now", description: "Send a welcome email to the client immediately after applying the snapshot" },
                  ].map(item => (
                    <div key={item.key} className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-card">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                      <Switch
                        checked={(form as any)[item.key]}
                        onCheckedChange={v => set(item.key, v)}
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Summary */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <p className="text-sm font-semibold">Ready to apply snapshot for:</p>
                  <p className="text-sm"><strong>Client:</strong> {form.clientFirstName} {form.clientLastName}</p>
                  <p className="text-sm"><strong>Business:</strong> {form.businessName || "—"}</p>
                  <p className="text-sm"><strong>Email:</strong> {form.clientEmail}</p>
                  <p className="text-sm"><strong>Phone:</strong> {form.clientPhone}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={() => setCurrentStep(s => Math.min(STEPS.length, s + 1))}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={applySnapshot.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {applySnapshot.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying Snapshot...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Apply Snapshot
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
