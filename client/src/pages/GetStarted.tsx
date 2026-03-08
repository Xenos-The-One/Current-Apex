import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Check, Loader2, X, Shield } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function GetStarted() {
  const [step, setStep] = useState<"form" | "tier" | "checkout">("form");
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [businessName, setBusinessName] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [businessType, setBusinessType] = useState<"loan_officer" | "real_estate">("loan_officer");
  const [targetZipCodes, setTargetZipCodes] = useState("");
  const [targetCities, setTargetCities] = useState("");
  const [targetStates, setTargetStates] = useState("");
  const [borrowerProfile, setBorrowerProfile] = useState("");
  const [webinarWillingness, setWebinarWillingness] = useState(false);
  const [teamSize, setTeamSize] = useState("");
  const [currentTools, setCurrentTools] = useState("");
  const [avatarRecording, setAvatarRecording] = useState<"self" | "studio">("self");
  const [selectedTier, setSelectedTier] = useState<"starter" | "pro" | "enterprise" | "done_for_you">("pro");

  const createCheckout = trpc.payment.createSetupCheckout.useMutation();

  const tiers = [
    {
      id: "starter" as const,
      name: "Starter",
      price: "$297",
      description: "DIY lead management for solo agents",
      features: [
        "Full CRM access (unlimited leads)",
        "Email & SMS campaigns",
        "Social media scheduler",
        "AI script generator",
        "Lead scoring & analytics",
        "Google Calendar integration",
      ],
      notIncluded: [
        "No AI Avatar",
        "No Vapi AI calling",
        "Self-setup with tutorials",
      ],
    },
    {
      id: "pro" as const,
      name: "Professional",
      price: "$497",
      description: "Automation for busy agents",
      features: [
        "Everything in Starter",
        "Vapi AI calling (auto-call in 60s)",
        "Self-recorded AI avatar",
        "30-min onboarding call",
        "Campaign A/B testing",
        "Priority support",
      ],
      notIncluded: [
        "No professional avatar shoot",
        "No done-for-you content",
      ],
      popular: true,
    },
    {
      id: "enterprise" as const,
      name: "Enterprise",
      price: "$997",
      description: "Full-service with pro avatar",
      features: [
        "Everything in Professional",
        "Professional HeyGen avatar shoot",
        "Monthly strategy calls",
        "50+ pre-written scripts",
        "White-label options",
        "API access",
        "Dedicated account manager",
      ],
      notIncluded: [],
    },
    {
      id: "done_for_you" as const,
      name: "Done-For-You",
      price: "$2,000",
      description: "We run everything for you",
      features: [
        "Everything in Enterprise",
        "Full campaign management",
        "We create all content",
        "We manage your ads",
        "We monitor & follow-up leads",
        "Monthly funnel optimization",
        "White-glove service",
      ],
      notIncluded: [],
    },
  ];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName || !businessLocation || !teamSize) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setStep("tier");
  };

  const handleTierSelection = () => {
    setStep("checkout");
  };

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const result = await createCheckout.mutateAsync({
        businessName,
        businessLocation,
        businessType,
        targetMarkets: {
          zipCodes: targetZipCodes.split(",").map(z => z.trim()).filter(Boolean),
          cities: targetCities.split(",").map(c => c.trim()).filter(Boolean),
          states: targetStates.split(",").map(s => s.trim()).filter(Boolean),
        },
        borrowerProfile,
        webinarWillingness,
        teamSize: parseInt(teamSize) || 1,
        currentTools,
        avatarRecording,
        selectedTier,
      });
      
      // Redirect to Stripe checkout
      window.open(result.checkoutUrl, "_blank");
      toast.success("Redirecting to secure checkout...");
    } catch (error: any) {
      toast.error(error.message || "Failed to create checkout session");
    } finally {
      setLoading(false);
    }
  };

  const selectedTierData = tiers.find(t => t.id === selectedTier);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-3">
              <img src="/indigo-labs-logo.png" alt="Indigo Labs" className="h-10 w-auto" />
            </a>
          </Link>
        </div>
      </header>

      <div className="py-12">
        <div className="container max-w-5xl">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4">
              <div className={`flex items-center gap-2 ${step === "form" ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "form" ? "bg-primary text-primary-foreground" : "bg-green-600 text-white"}`}>
                  {step !== "form" ? <Check className="w-4 h-4" /> : "1"}
                </div>
                <span className="hidden sm:inline">Business Info</span>
              </div>
              <div className="w-12 h-0.5 bg-border" />
              <div className={`flex items-center gap-2 ${step === "tier" ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "tier" ? "bg-primary text-primary-foreground" : step === "checkout" ? "bg-green-600 text-white" : "bg-muted"}`}>
                  {step === "checkout" ? <Check className="w-4 h-4" /> : "2"}
                </div>
                <span className="hidden sm:inline">Choose Plan</span>
              </div>
              <div className="w-12 h-0.5 bg-border" />
              <div className={`flex items-center gap-2 ${step === "checkout" ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "checkout" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  3
                </div>
                <span className="hidden sm:inline">Subscribe</span>
              </div>
            </div>
          </div>

          {/* Step 1: Business Information Form */}
          {step === "form" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Tell Us About Your Business</CardTitle>
                <CardDescription>
                  This information helps us customize your CRM experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Your Agency Name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessLocation">Business Location *</Label>
                      <Input
                        id="businessLocation"
                        value={businessLocation}
                        onChange={(e) => setBusinessLocation(e.target.value)}
                        placeholder="City, State"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Business Type *</Label>
                    <RadioGroup value={businessType} onValueChange={(v: any) => setBusinessType(v)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="loan_officer" id="loan_officer" />
                        <Label htmlFor="loan_officer" className="font-normal cursor-pointer">Loan Officer</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="real_estate" id="real_estate" />
                        <Label htmlFor="real_estate" className="font-normal cursor-pointer">Real Estate Agent</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetZipCodes">Target Zip Codes</Label>
                    <Input
                      id="targetZipCodes"
                      value={targetZipCodes}
                      onChange={(e) => setTargetZipCodes(e.target.value)}
                      placeholder="90210, 90211, 90212 (comma separated)"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="targetCities">Target Cities</Label>
                      <Input
                        id="targetCities"
                        value={targetCities}
                        onChange={(e) => setTargetCities(e.target.value)}
                        placeholder="Los Angeles, Beverly Hills"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="targetStates">Target States</Label>
                      <Input
                        id="targetStates"
                        value={targetStates}
                        onChange={(e) => setTargetStates(e.target.value)}
                        placeholder="CA, NY, TX"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrowerProfile">Preferred Borrower/Client Profile</Label>
                    <Textarea
                      id="borrowerProfile"
                      value={borrowerProfile}
                      onChange={(e) => setBorrowerProfile(e.target.value)}
                      placeholder="Describe your ideal client (e.g., first-time homebuyers, luxury market, investors)"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Team Size *</Label>
                    <Input
                      id="teamSize"
                      type="number"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      placeholder="Number of team members"
                      min="1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentTools">Current Tools & Systems</Label>
                    <Textarea
                      id="currentTools"
                      value={currentTools}
                      onChange={(e) => setCurrentTools(e.target.value)}
                      placeholder="List any CRMs, email platforms, or tools you currently use"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="webinar"
                      checked={webinarWillingness}
                      onCheckedChange={(checked) => setWebinarWillingness(checked as boolean)}
                    />
                    <Label htmlFor="webinar" className="font-normal cursor-pointer">
                      I'm willing to do webinars to generate leads
                    </Label>
                  </div>

                  <div className="space-y-3">
                    <Label>AI Avatar Recording Preference</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      AI Avatar availability depends on your selected plan
                    </p>
                    <RadioGroup value={avatarRecording} onValueChange={(v: any) => setAvatarRecording(v)}>
                      <div className="flex items-start space-x-3 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                        <RadioGroupItem value="self" id="self" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="self" className="font-medium cursor-pointer">I'll Record My Own Footage</Label>
                          <p className="text-sm text-muted-foreground mt-1">Record yourself and send us the footage. Available on Pro plan and above.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
                        <RadioGroupItem value="studio" id="studio" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Label htmlFor="studio" className="font-medium cursor-pointer">Professional Studio Recording</Label>
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Enterprise+</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Professional studio shoot included with Enterprise and Done-For-You plans.</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" size="lg">
                      Continue to Plan Selection
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Tier Selection */}
          {step === "tier" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
                <p className="text-muted-foreground">
                  No setup fees. No contracts. 30-day money-back guarantee.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tiers.map((tier) => (
                  <Card
                    key={tier.id}
                    className={`relative cursor-pointer transition-all ${
                      selectedTier === tier.id
                        ? "border-primary border-2 shadow-lg"
                        : "border-2 hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    {tier.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-2xl">{tier.name}</CardTitle>
                      <CardDescription>{tier.description}</CardDescription>
                      <div className="pt-4">
                        <span className="text-4xl font-bold">{tier.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {tier.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                        {tier.notIncluded.map((item, nIndex) => (
                          <li key={`not-${nIndex}`} className="flex items-start gap-2 text-muted-foreground">
                            <X className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("form")}>
                  Back
                </Button>
                <Button size="lg" onClick={handleTierSelection}>
                  Continue to Subscribe
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Checkout Summary */}
          {step === "checkout" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Review & Subscribe</CardTitle>
                <CardDescription>
                  Start your subscription today. Cancel anytime within 30 days for a full refund.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="font-semibold">Business Name:</span>
                    <span>{businessName}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="font-semibold">Selected Plan:</span>
                    <span>{selectedTierData?.name} ({selectedTierData?.price}/mo)</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="font-semibold">Monthly Total:</span>
                    <span className="text-2xl font-bold">{selectedTierData?.price}/mo</span>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-200">30-Day Money-Back Guarantee</p>
                      <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                        If you're not satisfied within the first 30 days, we'll give you a full refund. No questions asked.
                      </p>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>What happens next:</strong>
                    </p>
                    <ul className="text-sm space-y-1 mt-2 text-muted-foreground">
                      <li>1. Complete your subscription payment</li>
                      <li>2. Book your strategy call with the Indigo Labs team</li>
                      <li>3. Get immediate access to your CRM dashboard</li>
                      <li>4. Start importing leads and running campaigns</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep("tier")}>
                    Back
                  </Button>
                  <Button size="lg" onClick={handleCheckout} disabled={loading}>
                    {loading && <Loader2 className="mr-2 w-5 h-5 animate-spin" />}
                    Subscribe Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
