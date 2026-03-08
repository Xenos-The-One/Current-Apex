import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Clock, DollarSign, Calendar, Zap, Shield } from "lucide-react";
import { Link } from "wouter";

export default function Info() {
  const steps = [
    {
      number: "1",
      title: "Choose Your Plan",
      description: "Select a monthly subscription that fits your needs. No setup fees, no contracts. Start from $297/month with a 30-day money-back guarantee.",
      icon: DollarSign,
    },
    {
      number: "2",
      title: "Complete Onboarding",
      description: "Fill out our detailed form about your business, target markets, team size, and current tools so we can customize everything for you.",
      icon: CheckCircle2,
    },
    {
      number: "3",
      title: "Book Strategy Call",
      description: "Schedule a 1-on-1 strategy session with us via Google Calendar to discuss your goals and get your account activated.",
      icon: Calendar,
    },
    {
      number: "4",
      title: "4K AI Avatar Creation",
      description: "Choose self-recording (results vary) or visit our professional studio for guaranteed 4K quality. We capture 30 minutes of clean footage in 5-minute segments with breaks for outfit changes (bring 5-6 outfits). Retakes included until perfect.",
      icon: Clock,
    },
    {
      number: "5",
      title: "Start Generating Leads",
      description: "Import your leads, set up campaigns, and start converting. Change tiers anytime as your business grows.",
      icon: Zap,
    },
  ];

  const accessLevels = [
    {
      title: "Before Strategy Call",
      description: "Limited Access Mode",
      details: "You can view the CRM, explore features, and see how everything works, but cannot modify data until after your strategy call.",
      icon: Shield,
    },
    {
      title: "After Strategy Call",
      description: "Full Access Mode",
      details: "Complete access to all features. Import leads, create campaigns, manage your team, and leverage all automation tools.",
      icon: CheckCircle2,
    },
    {
      title: "Done-For-You Clients",
      description: "Read-Only Dashboard",
      details: "We run everything for you. You get a beautiful dashboard to review performance, reports, and results without the operational work.",
      icon: Zap,
    },
  ];

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
          <Link href="/get-started">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              How Indigo Labs Works
            </h1>
            <p className="text-xl text-muted-foreground">
              A complete, done-for-you lead management system designed specifically for loan officers and real estate agents
            </p>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Your Journey to Success</h2>
            
            <div className="space-y-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card key={index} className="border-2">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shrink-0">
                          {step.number}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon className="w-6 h-6 text-primary" />
                            <CardTitle className="text-2xl">{step.title}</CardTitle>
                          </div>
                          <CardDescription className="text-base leading-relaxed">
                            {step.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Access Levels */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">Access Levels Explained</h2>
            <p className="text-center text-muted-foreground mb-12 text-lg">
              Different access modes based on your journey stage and chosen tier
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {accessLevels.map((level, index) => {
                const Icon = level.icon;
                return (
                  <Card key={index} className="border-2">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{level.title}</CardTitle>
                      <CardDescription className="font-semibold text-primary">
                        {level.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {level.details}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Reminder */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <Card className="border-2 border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-2xl">Investment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <DollarSign className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">No Setup Fees</h3>
                    <p className="text-muted-foreground">
                      Start immediately with your chosen plan. Full CRM access, lead management, social media tools, and campaign automation included.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">4K AI Avatar Creation</h3>
                    <p className="text-muted-foreground mb-2">
                      Your custom AI Avatar for use across all social media platforms
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• <strong>Professional Studio (Recommended):</strong> 30 minutes of clean footage captured in 5-minute segments with breaks. Bring 5-6 outfits for variety. Retakes included until perfect. Guaranteed 4K quality.</li>
                      <li>• <strong>Self-Recording:</strong> Send us your footage (results may vary based on equipment quality)</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Zap className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Monthly Subscription</h3>
                    <p className="text-muted-foreground">
                      Choose from Starter ($297), Professional ($497), Enterprise ($997), or Done-For-You ($2,000) based on your needs. All tiers include unlimited leads.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Important:</strong> At day 75, you'll receive a reminder that you can change your subscription tier before billing starts. 
                    All tiers include unlimited leads—no artificial caps.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">What's Included</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                "AI voice calling with Vapi integration",
                "Unlimited lead management",
                "Email & SMS campaign automation",
                "Social media post scheduler",
                "AI script generator for all channels",
                "Google Calendar integration",
                "Multi-channel analytics",
                "Team management tools",
                "Custom Vapi assistants per lead source",
                "Automatic appointment booking",
                "Activity tracking & logging",
                "Performance reporting",
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground">
              Join the growing number of loan officers and real estate agents who are closing more deals with less effort
            </p>
            <Link href="/get-started">
              <Button size="lg" className="text-lg px-8">
                Get Started Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Questions? Email us or book a call to learn more
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/">
              <a className="flex items-center gap-3">
                <img src="/indigo-labs-logo.png" alt="Indigo Labs" className="h-8 w-auto" />
              </a>
            </Link>
            <p className="text-sm text-muted-foreground">
              © 2026 Indigo Labs. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
