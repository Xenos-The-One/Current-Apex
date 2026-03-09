import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  Briefcase,
  Share2,
  Calendar,
  CheckCircle2,
  Loader2,
  Sparkles,
  Facebook,
  Instagram,
  Linkedin,
  Globe,
  Save,
  ChevronRight,
} from "lucide-react";

const SECTIONS = [
  { id: "business", label: "Business Profile", icon: Building2, description: "General information and contact details" },
  { id: "services", label: "Services & Brand", icon: Briefcase, description: "What you offer and your brand voice" },
  { id: "social", label: "Social & Website", icon: Share2, description: "Connect your online presence" },
  { id: "publishing", label: "Publishing Prefs", icon: Calendar, description: "When and how to post content" },
];

// ─── Section 1: Business Profile ─────────────────────────────────────────────
function BusinessSection({ defaultValues, onSaved }: { defaultValues?: any; onSaved: () => void }) {
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
    onSuccess: () => { toast.success("Business profile saved"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">General Information</h2>
        <p className="text-sm text-gray-500 mt-0.5">Tell us about your business so we can generate relevant content.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="businessName">Business Name <span className="text-red-500">*</span></Label>
          <Input id="businessName" placeholder="e.g. Premier Mortgage Resources" value={form.businessName}
            onChange={(e) => setForm(f => ({ ...f, businessName: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="businessType">Business Type <span className="text-red-500">*</span></Label>
          <Input id="businessType" placeholder="e.g. Mortgage Broker, Real Estate Agent" value={form.businessType}
            onChange={(e) => setForm(f => ({ ...f, businessType: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="businessPhone">Business Phone</Label>
          <Input id="businessPhone" placeholder="+1 (555) 000-0000" value={form.businessPhone}
            onChange={(e) => setForm(f => ({ ...f, businessPhone: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="businessEmail">Business Email</Label>
          <Input id="businessEmail" type="email" placeholder="you@yourbusiness.com" value={form.businessEmail}
            onChange={(e) => setForm(f => ({ ...f, businessEmail: e.target.value }))} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="businessWebsite">Business Website</Label>
          <Input id="businessWebsite" placeholder="https://yourbusiness.com" value={form.businessWebsite}
            onChange={(e) => setForm(f => ({ ...f, businessWebsite: e.target.value }))} />
        </div>
      </div>

      <div className="border-t pt-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Business Physical Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="businessAddress">Street Address</Label>
            <Input id="businessAddress" placeholder="123 Main Street" value={form.businessAddress}
              onChange={(e) => setForm(f => ({ ...f, businessAddress: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="Las Vegas" value={form.city}
              onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zipCode">Postal / Zip Code</Label>
            <Input id="zipCode" placeholder="89101" value={form.zipCode}
              onChange={(e) => setForm(f => ({ ...f, zipCode: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State / Province / Region</Label>
            <Input id="state" placeholder="NV" value={form.state}
              onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ─── Section 2: Services & Brand ─────────────────────────────────────────────
function ServicesSection({ defaultValues, onSaved }: { defaultValues?: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    primaryServices: defaultValues?.primaryServices || "",
    uniqueSellingProp: defaultValues?.uniqueSellingProp || "",
    targetAudience: defaultValues?.targetAudience || "",
    serviceAreas: defaultValues?.serviceAreas || "",
    brandVoice: defaultValues?.brandVoice || "",
  });

  const mutation = trpc.clientOnboarding.saveStep2.useMutation({
    onSuccess: () => { toast.success("Services & brand saved"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Services & Brand</h2>
        <p className="text-sm text-gray-500 mt-0.5">Help our AI understand what you do and how you want to sound.</p>
      </div>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="primaryServices">Primary Services <span className="text-red-500">*</span></Label>
          <Textarea id="primaryServices" rows={3} placeholder="e.g. Purchase loans, refinancing, FHA/VA loans, first-time homebuyer programs, jumbo loans..."
            value={form.primaryServices} onChange={(e) => setForm(f => ({ ...f, primaryServices: e.target.value }))} />
          <p className="text-xs text-gray-500">List your main products and services. The more detail, the better the AI-generated content.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uniqueSellingProp">What makes you different?</Label>
          <Textarea id="uniqueSellingProp" rows={2} placeholder="e.g. We close in 21 days or less, 5-star rated on Google, bilingual team..."
            value={form.uniqueSellingProp} onChange={(e) => setForm(f => ({ ...f, uniqueSellingProp: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="targetAudience">Who is your ideal client?</Label>
          <Textarea id="targetAudience" rows={2} placeholder="e.g. First-time homebuyers aged 28-45, families looking to upsize..."
            value={form.targetAudience} onChange={(e) => setForm(f => ({ ...f, targetAudience: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="serviceAreas">Service Areas</Label>
          <Input id="serviceAreas" placeholder="e.g. Las Vegas, Henderson, North Las Vegas, Clark County"
            value={form.serviceAreas} onChange={(e) => setForm(f => ({ ...f, serviceAreas: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brandVoice">Brand Voice & Tone</Label>
          <Textarea id="brandVoice" rows={2} placeholder="e.g. Professional but approachable. Plain language, avoid jargon, trusted advisor not salesperson."
            value={form.brandVoice} onChange={(e) => setForm(f => ({ ...f, brandVoice: e.target.value }))} />
          <p className="text-xs text-gray-500">How should your content sound? Formal, casual, educational, motivational?</p>
        </div>
      </div>
      <div className="flex justify-end pt-2 border-t">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ─── Section 3: Social & Website ─────────────────────────────────────────────
function SocialSection({ defaultValues, onSaved }: { defaultValues?: any; onSaved: () => void }) {
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
    onSuccess: () => { toast.success("Social & website saved"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Social & Website</h2>
        <p className="text-sm text-gray-500 mt-0.5">Connect your online presence. You can skip any you don't have yet.</p>
      </div>

      <div className="space-y-5">
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Facebook className="w-4 h-4 text-blue-600" /> Facebook
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="socialFacebook">Facebook Page URL</Label>
              <Input id="socialFacebook" placeholder="https://facebook.com/yourbusiness"
                value={form.socialFacebook} onChange={(e) => setForm(f => ({ ...f, socialFacebook: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facebookPageId">Facebook Page ID</Label>
              <Input id="facebookPageId" placeholder="e.g. 123456789012345"
                value={form.facebookPageId} onChange={(e) => setForm(f => ({ ...f, facebookPageId: e.target.value }))} />
              <p className="text-xs text-gray-500">Found in your Page Settings → About</p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="facebookAdAccountId">Facebook Ad Account ID</Label>
              <Input id="facebookAdAccountId" placeholder="e.g. act_123456789"
                value={form.facebookAdAccountId} onChange={(e) => setForm(f => ({ ...f, facebookAdAccountId: e.target.value }))} />
              <p className="text-xs text-gray-500">Found in Facebook Ads Manager → Account Settings</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-600" /> Instagram
          </h3>
          <div className="space-y-1.5">
            <Label htmlFor="socialInstagram">Instagram Handle</Label>
            <Input id="socialInstagram" placeholder="@yourbusiness"
              value={form.socialInstagram} onChange={(e) => setForm(f => ({ ...f, socialInstagram: e.target.value }))} />
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-blue-700" /> LinkedIn
          </h3>
          <div className="space-y-1.5">
            <Label htmlFor="socialLinkedin">LinkedIn Profile URL</Label>
            <Input id="socialLinkedin" placeholder="https://linkedin.com/in/yourname"
              value={form.socialLinkedin} onChange={(e) => setForm(f => ({ ...f, socialLinkedin: e.target.value }))} />
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-600" /> Website
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input id="websiteUrl" placeholder="https://yourbusiness.com"
                value={form.websiteUrl} onChange={(e) => setForm(f => ({ ...f, websiteUrl: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="websitePlatform">Website Platform</Label>
              <Input id="websitePlatform" placeholder="e.g. WordPress, Wix, Squarespace"
                value={form.websitePlatform} onChange={(e) => setForm(f => ({ ...f, websitePlatform: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ─── Section 4: Publishing Preferences ───────────────────────────────────────
function PublishingSection({ onSaved }: { onSaved: () => void }) {
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
    onSuccess: () => { toast.success("Setup complete! Content generation started."); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Publishing Preferences</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure when and how your content gets published.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Preferred Posting Days</Label>
          <div className="flex flex-wrap gap-2">
            {days.map(day => (
              <button key={day} type="button" onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedDays.includes(day)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}>
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">Select the days you'd like content published to your social media accounts.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preferredPublishTime">Preferred Posting Time</Label>
          <Input id="preferredPublishTime" placeholder="e.g. 9:00 AM, 12:00 PM, 5:00 PM"
            value={form.preferredPublishTime} onChange={(e) => setForm(f => ({ ...f, preferredPublishTime: e.target.value }))} />
          <p className="text-xs text-gray-500">What time of day gets the most engagement from your audience?</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyColors">Brand Colors (optional)</Label>
          <Input id="companyColors" placeholder="e.g. Primary: #1E3A5F, Secondary: #C9A84C"
            value={form.companyColors} onChange={(e) => setForm(f => ({ ...f, companyColors: e.target.value }))} />
          <p className="text-xs text-gray-500">Your hex color codes help us match your visual content to your brand.</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Content generation starts immediately</p>
              <p className="text-xs text-amber-700 mt-1">
                When you save, our AI will generate your first batch of social media posts and website content. They'll appear in your <strong>Apex Content</strong> tab within 60 seconds — ready for you to review before anything goes live.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button type="submit" disabled={mutation.isPending} className="bg-green-600 hover:bg-green-700">
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Setting up...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4 mr-2" />Complete Setup</>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientOnboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState("business");
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  const { data: status, isLoading, refetch } = trpc.clientOnboarding.getStatus.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (status?.seoClient) {
      const completed = new Set<string>();
      if (status.seoClient.businessName) completed.add("business");
      if (status.seoClient.primaryServices) completed.add("services");
      if (status.seoClient.websiteUrl || status.seoClient.socialFacebook) completed.add("social");
      if (status.onboardingComplete) completed.add("publishing");
      setCompletedSections(completed);
    }
  }, [status]);

  const handleSaved = () => {
    refetch();
    // Auto-advance to next section
    const idx = SECTIONS.findIndex(s => s.id === activeSection);
    if (idx < SECTIONS.length - 1) {
      setActiveSection(SECTIONS[idx + 1].id);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Profile Settings</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your business profile information &amp; settings</p>
            </div>
            {status?.onboardingComplete ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Setup Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                {completedSections.size} of {SECTIONS.length} sections saved
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left sub-nav — GHL style */}
          <div className="w-56 shrink-0">
            <nav className="space-y-0.5">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isDone = completedSections.has(section.id);
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-blue-700" : ""}`}>{section.label}</p>
                    </div>
                    {isDone && !isActive && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    )}
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick nav to dashboard */}
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full text-xs text-gray-500 hover:text-gray-700 text-left px-3 py-1.5 rounded transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          {/* Right content area */}
          <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            {activeSection === "business" && (
              <BusinessSection defaultValues={status?.seoClient} onSaved={handleSaved} />
            )}
            {activeSection === "services" && (
              <ServicesSection defaultValues={status?.seoClient} onSaved={handleSaved} />
            )}
            {activeSection === "social" && (
              <SocialSection defaultValues={status?.seoClient} onSaved={handleSaved} />
            )}
            {activeSection === "publishing" && (
              <PublishingSection onSaved={handleSaved} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
