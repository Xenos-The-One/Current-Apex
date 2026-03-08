import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  User, Building2, Globe, FileText, ChevronRight, ChevronLeft,
  Check, Loader2, UserPlus, BarChart2, Target
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const STEPS = [
  { id: 1, title: "Contact Info", description: "Client's personal details", icon: User },
  { id: 2, title: "Business Info", description: "Company and industry details", icon: Building2 },
  { id: 3, title: "Website Access", description: "Website login credentials", icon: Globe },
  { id: 4, title: "Content Brief", description: "Initial content preferences", icon: FileText },
  { id: 5, title: "SEO & Strategy", description: "GSC, brand voice, competitors", icon: Target },
  { id: 6, title: "Review & Create", description: "Confirm and create client", icon: Check },
];

export default function ClientOnboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const createMutation = trpc.seo.clients.create.useMutation();

  // Step 1: Contact Info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");

  // Step 2: Business Info
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Step 3: Website Access
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websitePlatform, setWebsitePlatform] = useState("");
  const [websiteLoginUrl, setWebsiteLoginUrl] = useState("");
  const [websiteUsername, setWebsiteUsername] = useState("");
  const [websitePassword, setWebsitePassword] = useState("");
  const [websiteNotes, setWebsiteNotes] = useState("");

  // Step 4: Content Brief
  const [notes, setNotes] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");

  // Step 5: SEO & Strategy
  const [gscPropertyUrl, setGscPropertyUrl] = useState("");
  const [gscHasAccess, setGscHasAccess] = useState(false);
  const [brandVoice, setBrandVoice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState("");
  const [preferredPublishDays, setPreferredPublishDays] = useState("");
  const [preferredPublishTime, setPreferredPublishTime] = useState("");
  const [primaryServices, setPrimaryServices] = useState("");
  const [uniqueSellingProp, setUniqueSellingProp] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [reportingKpis, setReportingKpis] = useState("");
  const [reportingFrequency, setReportingFrequency] = useState("");

  const canProceed = () => {
    if (currentStep === 1) return name.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleCreate = async () => {
    try {
      const result = await createMutation.mutateAsync({
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        country: country || undefined,
        company: businessName || undefined,
        businessName: businessName || undefined,
        businessType: businessType || undefined,
        industry: industry || undefined,
        businessPhone: businessPhone || undefined,
        businessEmail: businessEmail || undefined,
        businessWebsite: businessWebsite || undefined,
        businessAddress: businessAddress || undefined,
        websiteUrl: websiteUrl || undefined,
        websitePlatform: websitePlatform || undefined,
        websiteLoginUrl: websiteLoginUrl || undefined,
        websiteUsername: websiteUsername || undefined,
        websitePassword: websitePassword || undefined,
        websiteNotes: websiteNotes || undefined,
        notes: notes || undefined,
        socialFacebook: socialFacebook || undefined,
        socialInstagram: socialInstagram || undefined,
        socialLinkedin: socialLinkedin || undefined,
        socialTwitter: socialTwitter || undefined,
        gscPropertyUrl: gscPropertyUrl || undefined,
        gscHasAccess: gscHasAccess ? 1 : 0,
        brandVoice: brandVoice || undefined,
        targetAudience: targetAudience || undefined,
        competitorUrls: competitorUrls || undefined,
        preferredPublishDays: preferredPublishDays || undefined,
        preferredPublishTime: preferredPublishTime || undefined,
        primaryServices: primaryServices || undefined,
        uniqueSellingProp: uniqueSellingProp || undefined,
        serviceAreas: serviceAreas || undefined,
        reportingKpis: reportingKpis || undefined,
        reportingFrequency: reportingFrequency || undefined,
      });
      toast.success("Client created successfully!");
      setLocation(`/clients/${result.id}`);
    } catch {
      toast.error("Failed to create client");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <UserPlus className="h-8 w-8" />
          Client Onboarding
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up a new client with all their information in one guided flow
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : isActive
                        ? "border-primary text-primary bg-primary/10"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <p className={`text-xs mt-2 font-medium text-center ${
                    isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {step.title}
                  </p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mt-[-1rem] ${
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Contact Info */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="NY" />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                <Input id="zipCode" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="10001" />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
              </div>
            </div>
          )}

          {/* Step 2: Business Info */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div>
                <Label htmlFor="businessType">Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="nonprofit">Non-Profit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="businessPhone">Business Phone</Label>
                <Input id="businessPhone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="+1 (555) 987-6543" />
              </div>
              <div>
                <Label htmlFor="businessEmail">Business Email</Label>
                <Input id="businessEmail" type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} placeholder="info@acmecorp.com" />
              </div>
              <div>
                <Label htmlFor="businessWebsite">Business Website</Label>
                <Input id="businessWebsite" value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} placeholder="https://acmecorp.com" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Input id="businessAddress" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="456 Business Ave, Suite 100" />
              </div>
            </div>
          )}

          {/* Step 3: Website Access */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-400">
                  Website credentials are stored securely and used to publish content directly to the client's site.
                </p>
              </div>
              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input id="websiteUrl" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://clientsite.com" />
              </div>
              <div>
                <Label htmlFor="websitePlatform">CMS Platform</Label>
                <Select value={websitePlatform} onValueChange={setWebsitePlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                    <SelectItem value="shopify">Shopify</SelectItem>
                    <SelectItem value="wix">Wix</SelectItem>
                    <SelectItem value="squarespace">Squarespace</SelectItem>
                    <SelectItem value="webflow">Webflow</SelectItem>
                    <SelectItem value="ghost">Ghost</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="websiteLoginUrl">Login URL</Label>
                <Input id="websiteLoginUrl" value={websiteLoginUrl} onChange={(e) => setWebsiteLoginUrl(e.target.value)} placeholder="https://clientsite.com/wp-admin" />
              </div>
              <div>
                <Label htmlFor="websiteUsername">Username</Label>
                <Input id="websiteUsername" value={websiteUsername} onChange={(e) => setWebsiteUsername(e.target.value)} placeholder="admin" />
              </div>
              <div>
                <Label htmlFor="websitePassword">Password</Label>
                <Input id="websitePassword" type="password" value={websitePassword} onChange={(e) => setWebsitePassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="websiteNotes">Website Notes</Label>
                <Textarea id="websiteNotes" value={websiteNotes} onChange={(e) => setWebsiteNotes(e.target.value)} placeholder="Any special instructions for accessing or publishing to this site..." rows={3} />
              </div>
            </div>
          )}

          {/* Step 4: Content Brief */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="notes">Content Notes & Preferences</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the client's content needs, preferred topics, target audience, tone of voice, keywords to focus on..." rows={5} />
              </div>
              <div>
                <Label htmlFor="socialFacebook">Facebook</Label>
                <Input id="socialFacebook" value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} placeholder="https://facebook.com/acmecorp" />
              </div>
              <div>
                <Label htmlFor="socialInstagram">Instagram</Label>
                <Input id="socialInstagram" value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} placeholder="https://instagram.com/acmecorp" />
              </div>
              <div>
                <Label htmlFor="socialLinkedin">LinkedIn</Label>
                <Input id="socialLinkedin" value={socialLinkedin} onChange={(e) => setSocialLinkedin(e.target.value)} placeholder="https://linkedin.com/company/acmecorp" />
              </div>
              <div>
                <Label htmlFor="socialTwitter">Twitter/X</Label>
                <Input id="socialTwitter" value={socialTwitter} onChange={(e) => setSocialTwitter(e.target.value)} placeholder="https://x.com/acmecorp" />
              </div>
            </div>
          )}

          {/* Step 5: SEO & Strategy */}
          {currentStep === 5 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary">This information helps AI generate more targeted content and improves SEO performance tracking.</p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="gscPropertyUrl">Google Search Console Property URL</Label>
                <Input id="gscPropertyUrl" value={gscPropertyUrl} onChange={(e) => setGscPropertyUrl(e.target.value)} placeholder="https://yoursite.com" />
                <p className="text-xs text-muted-foreground mt-1">The exact property URL registered in Google Search Console</p>
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <input type="checkbox" id="gscHasAccess" checked={gscHasAccess} onChange={(e) => setGscHasAccess(e.target.checked)} className="h-4 w-4 accent-primary" />
                <Label htmlFor="gscHasAccess" className="cursor-pointer">Client has granted Google Search Console access</Label>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="brandVoice">Brand Voice & Tone Guidelines</Label>
                <Textarea id="brandVoice" value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} placeholder="e.g. Professional but approachable, avoid jargon, use active voice, speak directly to small business owners..." rows={3} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="targetAudience">Target Audience Personas</Label>
                <Textarea id="targetAudience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g. Small business owners aged 35-55, tech-savvy entrepreneurs, local service businesses..." rows={2} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="competitorUrls">Competitor URLs</Label>
                <Textarea id="competitorUrls" value={competitorUrls} onChange={(e) => setCompetitorUrls(e.target.value)} placeholder="https://competitor1.com, https://competitor2.com" rows={2} />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated — used to avoid duplicate content angles</p>
              </div>
              <div>
                <Label htmlFor="preferredPublishDays">Preferred Publish Days</Label>
                <Input id="preferredPublishDays" value={preferredPublishDays} onChange={(e) => setPreferredPublishDays(e.target.value)} placeholder="Mon, Wed, Fri" />
              </div>
              <div>
                <Label htmlFor="preferredPublishTime">Preferred Publish Time</Label>
                <Input id="preferredPublishTime" type="time" value={preferredPublishTime} onChange={(e) => setPreferredPublishTime(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="primaryServices">Primary Products / Services</Label>
                <Textarea id="primaryServices" value={primaryServices} onChange={(e) => setPrimaryServices(e.target.value)} placeholder="List key products or services with brief descriptions..." rows={2} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="uniqueSellingProp">Unique Selling Proposition (USP)</Label>
                <Textarea id="uniqueSellingProp" value={uniqueSellingProp} onChange={(e) => setUniqueSellingProp(e.target.value)} placeholder="What makes this client different from competitors?" rows={2} />
              </div>
              <div>
                <Label htmlFor="serviceAreas">Service Areas (Local SEO)</Label>
                <Input id="serviceAreas" value={serviceAreas} onChange={(e) => setServiceAreas(e.target.value)} placeholder="New York, Brooklyn, Queens" />
              </div>
              <div>
                <Label htmlFor="reportingFrequency">Reporting Frequency</Label>
                <Select value={reportingFrequency} onValueChange={setReportingFrequency}>
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="reportingKpis">Primary KPIs</Label>
                <Input id="reportingKpis" value={reportingKpis} onChange={(e) => setReportingKpis(e.target.value)} placeholder="traffic, rankings, leads, conversions" />
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Contact Information
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {name}</p>
                    {email && <p><span className="text-muted-foreground">Email:</span> {email}</p>}
                    {phone && <p><span className="text-muted-foreground">Phone:</span> {phone}</p>}
                    {city && <p><span className="text-muted-foreground">Location:</span> {city}{state ? `, ${state}` : ""}{country ? `, ${country}` : ""}</p>}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Business Information
                  </h3>
                  <div className="space-y-1 text-sm">
                    {businessName && <p><span className="text-muted-foreground">Business:</span> {businessName}</p>}
                    {businessType && <p><span className="text-muted-foreground">Type:</span> {businessType}</p>}
                    {industry && <p><span className="text-muted-foreground">Industry:</span> {industry}</p>}
                    {businessWebsite && <p><span className="text-muted-foreground">Website:</span> {businessWebsite}</p>}
                    {!businessName && <p className="text-muted-foreground italic">No business info provided</p>}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Website Access
                  </h3>
                  <div className="space-y-1 text-sm">
                    {websiteUrl && <p><span className="text-muted-foreground">URL:</span> {websiteUrl}</p>}
                    {websitePlatform && <p><span className="text-muted-foreground">Platform:</span> {websitePlatform}</p>}
                    {websiteUsername && <p><span className="text-muted-foreground">Username:</span> {websiteUsername}</p>}
                    {websitePassword && <p><span className="text-muted-foreground">Password:</span> {"•".repeat(8)}</p>}
                    {!websiteUrl && <p className="text-muted-foreground italic">No website access provided</p>}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Content & Social
                  </h3>
                  <div className="space-y-1 text-sm">
                    {notes && <p><span className="text-muted-foreground">Notes:</span> {notes.substring(0, 100)}{notes.length > 100 ? "..." : ""}</p>}
                    {socialFacebook && <p><span className="text-muted-foreground">Facebook:</span> Set</p>}
                    {socialInstagram && <p><span className="text-muted-foreground">Instagram:</span> Set</p>}
                    {socialLinkedin && <p><span className="text-muted-foreground">LinkedIn:</span> Set</p>}
                    {socialTwitter && <p><span className="text-muted-foreground">Twitter:</span> Set</p>}
                    {!notes && !socialFacebook && !socialInstagram && <p className="text-muted-foreground italic">No content brief provided</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border/50">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {currentStep < 6 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Create Client
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
