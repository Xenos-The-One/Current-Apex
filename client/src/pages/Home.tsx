import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  BarChart3,
  Bot,
  Building2,
  Calendar,
  CheckCircle,
  FileText,
  Mail,
  Phone,
  Shield,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const FEATURES = [
  { icon: Users, label: "Lead Pipeline", desc: "Drag-and-drop Kanban pipeline with AI lead scoring and bulk CSV import" },
  { icon: Bot, label: "AI Calling", desc: "Vapi-powered AI calls with transcripts, recordings, and automated follow-ups" },
  { icon: Mail, label: "Email & SMS Campaigns", desc: "Multi-channel campaigns with SendGrid/Twilio, audience targeting, and delivery tracking" },
  { icon: Workflow, label: "Workflow Automation", desc: "Visual automation builder with triggers, multi-step actions, and conditional logic" },
  { icon: Calendar, label: "Appointment Scheduling", desc: "Calendar management with automated email/SMS reminders and availability control" },
  { icon: FileText, label: "Borrower Database", desc: "Loan milestones, document storage with version control, and activity tracking" },
  { icon: BarChart3, label: "Analytics Dashboard", desc: "Real-time KPIs, conversion funnels, lead source attribution, and team metrics" },
  { icon: Sparkles, label: "AI Assistant", desc: "LLM-powered lead scoring, personalized email/SMS generation, and next-action recommendations" },
  { icon: Building2, label: "Multi-Agency Management", desc: "Secure multi-tenant architecture with role-based access and agency isolation" },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg font-display">MortgageCRM</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <a href="#features">Features</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#pricing">Pricing</a>
            </Button>
            <Button size="sm" asChild>
              <a href={getLoginUrl()}>Get Started</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-background to-purple-50/30 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Mortgage CRM
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold font-display leading-tight text-foreground">
              Close More Loans.<br />
              <span className="text-primary">Automate Everything.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              The complete CRM and marketing automation platform built for mortgage professionals. Manage leads, automate follow-ups, schedule AI calls, and track every loan from application to close.
            </p>
            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <Button size="lg" className="gap-2 text-base px-6" asChild>
                <a href={getLoginUrl()}>
                  <Zap className="w-4 h-4" /> Start Free Trial
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-6">
                Watch Demo
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              {["No credit card required", "14-day free trial", "Cancel anytime"].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10,000+", label: "Loans Processed" },
              { value: "500+", label: "Agencies" },
              { value: "98%", label: "Uptime SLA" },
              { value: "3.2x", label: "Avg. Conversion Lift" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold font-display text-primary">{value}</p>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-display">Everything You Need to Grow</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">A complete platform purpose-built for mortgage loan officers and real estate professionals</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-5 rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all bg-card group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-display">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mt-3">Choose the plan that fits your team</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Starter", price: 97, desc: "Individual loan officers", features: ["500 leads", "Email campaigns", "Pipeline", "1 seat"], popular: false },
              { name: "Professional", price: 297, desc: "Growing teams", features: ["Unlimited leads", "Email + SMS", "AI calling", "AI scoring", "5 seats", "Analytics"], popular: true },
              { name: "Enterprise", price: 697, desc: "Large agencies", features: ["Everything in Pro", "Unlimited seats", "White-label", "Custom AI", "Dedicated support"], popular: false },
            ].map(plan => (
              <div key={plan.name} className={`p-6 rounded-2xl border-2 bg-card ${plan.popular ? "border-primary shadow-lg relative" : "border-border"}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <p className="font-bold text-lg font-display">{plan.name}</p>
                <p className="text-sm text-muted-foreground">{plan.desc}</p>
                <div className="mt-3 mb-5">
                  <span className="text-4xl font-bold font-display">${plan.price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                  <a href={getLoginUrl()}>Get Started</a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold font-display">Ready to Transform Your Business?</h2>
          <p className="text-muted-foreground mt-3">Join hundreds of mortgage professionals who use MortgageCRM to close more loans and grow their pipeline.</p>
          <div className="mt-8">
            <Button size="lg" className="gap-2 text-base px-8" asChild>
              <a href={getLoginUrl()}>
                <Zap className="w-4 h-4" /> Start Your Free Trial
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-bold font-display text-sm">MortgageCRM</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>SOC 2 Type II · GDPR Compliant · 256-bit Encryption</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 MortgageCRM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
