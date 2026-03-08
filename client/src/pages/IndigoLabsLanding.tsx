import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, TrendingUp, Users, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function IndigoLabsLanding() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const captureLead = trpc.indigoLabs.captureLead.useMutation({
    onSuccess: () => {
      toast.success("Success! Check your email for the blueprint.");
      setEmail("");
      setName("");
      setPhone("");
      // TODO: Redirect to thank you page
      // window.location.href = "/thank-you";
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast.error("Please enter your name and email");
      return;
    }

    captureLead.mutate({
      name,
      email,
      phone: phone || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-blue-600">INDIGO LABS</h3>
            <p className="text-sm text-muted-foreground">AI-Powered Lead Management</p>
          </div>

          {/* Main Headline */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Fill Your Calendar with<br />
              <span className="text-blue-600">Qualified Appointments</span><br />
              Using AI
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              The exact system one loan officer used to go from <span className="font-semibold text-foreground">0 to 15 appointments/week</span> in just 14 days
            </p>
          </div>

          {/* Lead Capture Form */}
          <Card className="max-w-2xl mx-auto mb-16 shadow-2xl border-2 border-blue-100">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Download the Free Blueprint</h2>
                <p className="text-muted-foreground">
                  Get the step-by-step guide: "How to Convert 80% of Your Leads Using AI"
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 text-lg"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-lg"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number (Optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={captureLead.isPending}
                  className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
                >
                  {captureLead.isPending ? "Sending..." : "Get Free Blueprint"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  No spam. Unsubscribe anytime. Your data is secure.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Social Proof Stats */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">15+</div>
              <p className="text-muted-foreground">Appointments Per Week</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">80%</div>
              <p className="text-muted-foreground">Show-Up Rate</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">$50K+</div>
              <p className="text-muted-foreground">Monthly Closed Loans</p>
            </div>
          </div>

          {/* Problem Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Sound Familiar?</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                "Spending $1000s on leads but can't follow up fast enough",
                "Leads going cold because you're too busy",
                "Using CRM software but still manually calling everyone",
                "Missing appointments because leads forget",
                "No time to create social media content",
                "Conversion rates stuck at 20-30%"
              ].map((problem, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                  <div className="text-red-500 mt-1">✗</div>
                  <p className="text-foreground">{problem}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Solution Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">The AI Lead System</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Instant Response</h3>
                  <p className="text-muted-foreground">
                    AI voice assistant calls leads within 5 minutes. No more cold leads.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Auto Booking</h3>
                  <p className="text-muted-foreground">
                    Appointments booked automatically. SMS reminders prevent no-shows.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Content Creation</h3>
                  <p className="text-muted-foreground">
                    AI avatar creates social media content. Build your brand on autopilot.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Case Study Teaser */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white mb-16">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Real Results from a Real Loan Officer</h2>
              <p className="text-xl mb-6 opacity-90">
                "I went from spending 4 hours a day calling leads to having my calendar filled automatically. 
                The AI handles everything - calls, booking, reminders. I just show up to appointments."
              </p>
              <p className="font-semibold text-lg">- Tim Haskins, Loan Officer</p>
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-3xl font-bold">0 → 15</div>
                  <div className="text-sm opacity-80">Appointments/Week</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">14 Days</div>
                  <div className="text-sm opacity-80">To Full Calendar</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">$50/day</div>
                  <div className="text-sm opacity-80">Ad Spend</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">$50K+</div>
                  <div className="text-sm opacity-80">Monthly Revenue</div>
                </div>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">What's in the Blueprint?</h2>
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {[
                "The exact AI voice script that converts 80% of leads",
                "Step-by-step CRM setup guide (no tech skills needed)",
                "Social media content templates (30 days of posts)",
                "ROI calculator to project your results",
                "Implementation checklist (launch in 7 days)",
                "Case study: Tim's complete before/after numbers"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <Card className="max-w-2xl mx-auto shadow-2xl border-2 border-blue-100">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Fill Your Calendar?</h2>
              <p className="text-muted-foreground mb-6">
                Download the free blueprint and see exactly how Tim did it.
              </p>
              <Button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 h-14 px-8 text-lg"
              >
                Get Free Blueprint Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-16 text-sm text-muted-foreground">
            <p>© 2026 Indigo Labs AI. All rights reserved.</p>
            <p className="mt-2">
              Questions? Email us at{" "}
              <a href="mailto:tariqhaskins@indigolabsai.com" className="text-blue-600 hover:underline">
                tariqhaskins@indigolabsai.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
