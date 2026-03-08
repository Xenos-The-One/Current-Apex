import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  Briefcase,
  Share2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Loader2,
  Sparkles,
  Facebook,
  Instagram,
  Linkedin,
  Globe,
} from "lucide-react";

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Business Info", icon: Building2, description: "Tell us about your business" },
  { id: 2, title: "Services & Brand", icon: Briefcase, description: "What you offer and how you sound" },
  { id: 3, title: "Social & Website", icon: Share2, description: "Connect your online presence" },
  { id: 4, title: "Publishing Prefs", icon: Calendar, description: "When and how to post" },
];

// ─── Step 1: Business Info ────────────────────────────────────────────────────
function Step1({ onNext, defaultValues }: { onNext: (data: any) => void; defaultValues?: any }) {
  const [form, setForm] = useState({
    businessName: defaultValues?.businessName || "",
    businessType: defaultValues?.businessType || "",
    businessPhone: defaultValues?.businessPhone || "",
    businessEmail: defaultValues?.businessEmail || "",
    businessWebsite: defaultValues?.businessWebsite || "",
    businessAddress: defaultValues?.businessAddress || "",
    city: defaultValues?.city || "",
    state: defaultValues?.state || "",
    zipCode: defaultValues?.zipCode || "",
  });

  const mutation = trpc.clientOnboarding.saveStep1.useMutation({
    onSuccess: () => onNext(form),
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) { toast.error("Business name is required"); return; }
    if (!form.businessType.trim()) { toast.error("Business type is required"); return; }
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name <span className="text-red-500">*</span></Label>
          <Input
            id="businessName"
            placeholder="e.g. Premier Mortgage Resources"
            value={form.businessName}
            onChange={(e) => setForm(f => ({ ...f, businessName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessType">Business Type <span className="text-red-500">*</span></Label>
          <Input
            id="businessType"
            placeholder="e.g. Mortgage Broker, Real Estate Agent"
            value={form.businessType}
            onChange={(e) => setForm(f => ({ ...f, businessType: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessPhone">Business Phone</Label>
          <Input
            id="businessPhone"
            placeholder="+1 (702) 555-0100"
            value={form.businessPhone}
            onChange={(e) => setForm(f => ({ ...f, businessPhone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessEmail">Business Email</Label>
          <Input
            id="businessEmail"
            type="email"
            placeholder="info@yourbusiness.com"
            value={form.businessEmail}
            onChange={(e) => setForm(f => ({ ...f, businessEmail: e.target.value }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="businessWebsite">Website URL</Label>
          <Input
            id="businessWebsite"
            placeholder="https://yourbusiness.com"
            value={form.businessWebsite}
            onChange={(e) => setForm(f => ({ ...f, businessWebsite: e.target.value }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="businessAddress">Street Address</Label>
          <Input
            id="businessAddress"
            placeholder="123 Main St"
            value={form.businessAddress}
            onChange={(e) => setForm(f => ({ ...f, businessAddress: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="Las Vegas"
            value={form.city}
            onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              placeholder="NV"
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP Code</Label>
            <Input
              id="zipCode"
              placeholder="89101"
              value={form.zipCode}
              onChange={(e) => setForm(f => ({ ...f, zipCode: e.target.value }))}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending} className="min-w-32">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save & Continue <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 2: Services & Brand ─────────────────────────────────────────────────
function Step2({ onNext, onBack, defaultValues }: { onNext: (data: any) => void; onBack: () => void; defaultValues?: any }) {
  const [form, setForm] = useState({
    primaryServices: defaultValues?.primaryServices || "",
    uniqueSellingProp: defaultValues?.uniqueSellingProp || "",
    serviceAreas: defaultValues?.serviceAreas || "",
    targetAudience: defaultValues?.targetAudience || "",
    brandVoice: defaultValues?.brandVoice || "",
  });

  const mutation = trpc.clientOnboarding.saveStep2.useMutation({
    onSuccess: () => onNext(form),
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.primaryServices.trim()) { toast.error("Please describe your services"); return; }
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="primaryServices">Primary Services <span className="text-red-500">*</span></Label>
        <Textarea
          id="primaryServices"
          placeholder="e.g. Purchase loans, refinancing, FHA/VA loans, first-time homebuyer programs, jumbo loans..."
          rows={3}
          value={form.primaryServices}
          onChange={(e) => setForm(f => ({ ...f, primaryServices: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">List your main products and services. The more detail, the better the AI-generated content.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="uniqueSellingProp">What makes you different?</Label>
        <Textarea
          id="uniqueSellingProp"
          placeholder="e.g. We close in 21 days or less, 5-star rated on Google, bilingual team, local market expertise..."
          rows={2}
          value={form.uniqueSellingProp}
          onChange={(e) => setForm(f => ({ ...f, uniqueSellingProp: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetAudience">Who is your ideal client?</Label>
        <Textarea
          id="targetAudience"
          placeholder="e.g. First-time homebuyers aged 28-45, families looking to upsize, homeowners with 20%+ equity looking to refinance..."
          rows={2}
          value={form.targetAudience}
          onChange={(e) => setForm(f => ({ ...f, targetAudience: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="serviceAreas">Service Areas</Label>
        <Input
          id="serviceAreas"
          placeholder="e.g. Las Vegas, Henderson, North Las Vegas, Clark County"
          value={form.serviceAreas}
          onChange={(e) => setForm(f => ({ ...f, serviceAreas: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brandVoice">Brand Voice & Tone</Label>
        <Textarea
          id="brandVoice"
          placeholder="e.g. Professional but approachable. We use plain language, avoid jargon, and always lead with empathy. Think trusted advisor, not salesperson."
          rows={2}
          value={form.brandVoice}
          onChange={(e) => setForm(f => ({ ...f, brandVoice: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">How should your content sound? Formal, casual, educational, motivational?</p>
      </div>
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button type="submit" disabled={mutation.isPending} className="min-w-32">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save & Continue <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 3: Social & Website ─────────────────────────────────────────────────
function Step3({ onNext, onBack, defaultValues }: { onNext: (data: any) => void; onBack: () => void; defaultValues?: any }) {
  const [form, setForm] = useState({
    socialFacebook: defaultValues?.socialFacebook || "",
    socialInstagram: defaultValues?.socialInstagram || "",
    socialLinkedin: defaultValues?.socialLinkedin || "",
    facebookAdAccountId: defaultValues?.facebookAdAccountId || "",
    facebookPageId: defaultValues?.facebookPageId || "",
    websiteUrl: defaultValues?.websiteUrl || "",
    websitePlatform: defaultValues?.websitePlatform || "",
  });

  const mutation = trpc.clientOnboarding.saveStep3.useMutation({
    onSuccess: () => onNext(form),
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1 mb-2">
        <p className="text-sm text-muted-foreground">
          These links help us post directly to your accounts and track ad performance. You can skip any you don't have yet.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Facebook className="w-4 h-4 text-blue-600" /> Facebook
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
          <div className="space-y-2">
            <Label htmlFor="socialFacebook">Facebook Page URL</Label>
            <Input
              id="socialFacebook"
              placeholder="https://facebook.com/yourbusiness"
              value={form.socialFacebook}
              onChange={(e) => setForm(f => ({ ...f, socialFacebook: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebookPageId">Facebook Page ID</Label>
            <Input
              id="facebookPageId"
              placeholder="e.g. 123456789012345"
              value={form.facebookPageId}
              onChange={(e) => setForm(f => ({ ...f, facebookPageId: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Found in your Page Settings → About</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="facebookAdAccountId">Facebook Ad Account ID</Label>
            <Input
              id="facebookAdAccountId"
              placeholder="e.g. act_123456789"
              value={form.facebookAdAccountId}
              onChange={(e) => setForm(f => ({ ...f, facebookAdAccountId: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Found in Facebook Ads Manager → Account Settings</p>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-2">
          <Instagram className="w-4 h-4 text-pink-600" /> Instagram
        </h3>
        <div className="pl-6">
          <div className="space-y-2">
            <Label htmlFor="socialInstagram">Instagram Handle</Label>
            <Input
              id="socialInstagram"
              placeholder="@yourbusiness"
              value={form.socialInstagram}
              onChange={(e) => setForm(f => ({ ...f, socialInstagram: e.target.value }))}
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-2">
          <Linkedin className="w-4 h-4 text-blue-700" /> LinkedIn
        </h3>
        <div className="pl-6">
          <div className="space-y-2">
            <Label htmlFor="socialLinkedin">LinkedIn Profile URL</Label>
            <Input
              id="socialLinkedin"
              placeholder="https://linkedin.com/in/yourname"
              value={form.socialLinkedin}
              onChange={(e) => setForm(f => ({ ...f, socialLinkedin: e.target.value }))}
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-2">
          <Globe className="w-4 h-4 text-green-600" /> Website
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              placeholder="https://yourbusiness.com"
              value={form.websiteUrl}
              onChange={(e) => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="websitePlatform">Website Platform</Label>
            <Input
              id="websitePlatform"
              placeholder="e.g. WordPress, Wix, Squarespace"
              value={form.websitePlatform}
              onChange={(e) => setForm(f => ({ ...f, websitePlatform: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button type="submit" disabled={mutation.isPending} className="min-w-32">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save & Continue <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 4: Publishing Preferences ──────────────────────────────────────────
function Step4({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [form, setForm] = useState({
    preferredPublishDays: '["Monday","Wednesday","Friday"]',
    preferredPublishTime: "9:00 AM",
    reportingKpis: "leads,engagement,reach",
    companyColors: "",
  });

  const [selectedDays, setSelectedDays] = useState<string[]>(["Monday", "Wednesday", "Friday"]);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const toggleDay = (day: string) => {
    const updated = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    setSelectedDays(updated);
    setForm(f => ({ ...f, preferredPublishDays: JSON.stringify(updated) }));
  };

  const mutation = trpc.clientOnboarding.completeOnboarding.useMutation({
    onSuccess: () => onComplete(),
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>Preferred Posting Days</Label>
        <div className="flex flex-wrap gap-2">
          {days.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedDays.includes(day)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Select the days you'd like content published to your social media accounts.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferredPublishTime">Preferred Posting Time</Label>
        <Input
          id="preferredPublishTime"
          placeholder="e.g. 9:00 AM, 12:00 PM, 5:00 PM"
          value={form.preferredPublishTime}
          onChange={(e) => setForm(f => ({ ...f, preferredPublishTime: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">What time of day gets the most engagement from your audience?</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyColors">Brand Colors (optional)</Label>
        <Input
          id="companyColors"
          placeholder="e.g. Primary: #1E3A5F, Secondary: #C9A84C"
          value={form.companyColors}
          onChange={(e) => setForm(f => ({ ...f, companyColors: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">Your hex color codes help us match your visual content to your brand.</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Content generation starts immediately</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              When you click "Complete Setup," our AI will generate your first batch of social media posts and website content using everything you've shared. They'll appear in your <strong>Content Approvals</strong> tab within 60 seconds — ready for you to review and approve before anything goes live.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button type="submit" disabled={mutation.isPending} className="min-w-40 bg-green-600 hover:bg-green-700">
          {mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Setting up...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ onGoToApprovals }: { onGoToApprovals: () => void }) {
  return (
    <div className="text-center py-8 space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">You're all set! 🎉</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Your account is configured and our AI is generating your first batch of social media posts and website content right now.
        </p>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800/40 dark:bg-blue-950/20 p-5 max-w-md mx-auto text-left">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Content is being generated</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              10 pieces of content — Facebook posts, Instagram posts, LinkedIn posts, and blog drafts — will appear in your Content Approvals tab within 60 seconds. Nothing goes live until you approve it.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onGoToApprovals} size="lg" className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Review My Content
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientOnboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [stepData, setStepData] = useState<Record<number, any>>({});

  const { data: status, isLoading } = trpc.clientOnboarding.getStatus.useQuery(undefined, {
    enabled: !!user,
  });

  // If already completed, redirect to content approvals
  useEffect(() => {
    if (status?.onboardingComplete) {
      navigate("/content-approvals");
    } else if (status?.currentStep && status.currentStep > 1) {
      setCurrentStep(status.currentStep);
    }
  }, [status]);

  const handleNext = (data: any) => {
    setStepData(prev => ({ ...prev, [currentStep]: data }));
    setCurrentStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleComplete = () => {
    setCompleted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progressPercent = completed ? 100 : ((currentStep - 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Account Setup
              </h1>
              <p className="text-xs text-muted-foreground">
                {completed ? "Setup complete!" : `Step ${currentStep} of ${STEPS.length}`}
              </p>
            </div>
            {!completed && (
              <Badge variant="outline" className="text-xs">
                {Math.round(progressPercent)}% complete
              </Badge>
            )}
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>

      {/* Step indicators */}
      {!completed && (
        <div className="border-b bg-background/60">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              {STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isDone = currentStep > step.id;
                return (
                  <div key={step.id} className="flex items-center gap-1 shrink-0">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isDone
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                          : "text-muted-foreground"
                    }`}>
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <StepIcon className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">{step.title}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-2xl">
          {completed ? (
            <Card>
              <CardContent className="pt-6">
                <SuccessScreen onGoToApprovals={() => navigate("/content-approvals")} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  {(() => {
                    const step = STEPS[currentStep - 1];
                    const Icon = step.icon;
                    return (
                      <>
                        <Icon className="w-5 h-5 text-primary" />
                        {step.title}
                      </>
                    );
                  })()}
                </CardTitle>
                <CardDescription>{STEPS[currentStep - 1]?.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {currentStep === 1 && (
                  <Step1
                    onNext={handleNext}
                    defaultValues={status?.seoClient || stepData[1]}
                  />
                )}
                {currentStep === 2 && (
                  <Step2
                    onNext={handleNext}
                    onBack={handleBack}
                    defaultValues={status?.seoClient || stepData[2]}
                  />
                )}
                {currentStep === 3 && (
                  <Step3
                    onNext={handleNext}
                    onBack={handleBack}
                    defaultValues={status?.seoClient || stepData[3]}
                  />
                )}
                {currentStep === 4 && (
                  <Step4
                    onComplete={handleComplete}
                    onBack={handleBack}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
