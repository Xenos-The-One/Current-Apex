import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, BookOpen, TrendingUp, Zap, Mail, Lock, Eye, EyeOff } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663346016577/LMov9oD5hWD87TsDa4kZ8o/GradientLogoBlue2Green_5403585a.png";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const loginMutation = trpc.onboarding.loginWithPassword.useMutation({
    onSuccess: (data) => {
      toast.success(`Welcome back, ${data.name || ""}!`);
      window.location.href = "/";
    },
    onError: (err) => {
      setLoginError(err.message || "Invalid email or password");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    loginMutation.mutate({ email, password });
  };

  // Check if this is a first-time sub-account login (email_password method, no onboarding progress)
  const isSubAccount = user?.loginMethod === "email_password";
  const { data: launchpadProgress } = trpc.launchpad.getProgress.useQuery(
    undefined,
    { enabled: !loading && !!user && isSubAccount }
  );

  // Redirect logged-in users to their dashboard (or Launchpad for first-time sub-accounts)
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin" || user.role === "super_admin") {
        setLocation("/admin");
      } else if (user.role === "loa") {
        // First-time LOA sub-accounts go to Launchpad
        if (isSubAccount && launchpadProgress !== undefined && launchpadProgress.completedCount === 0) {
          setLocation("/launchpad");
        } else if (launchpadProgress !== undefined || !isSubAccount) {
          setLocation("/loa");
        }
      } else {
        // First-time client sub-accounts go to Launchpad
        if (isSubAccount && launchpadProgress !== undefined && launchpadProgress.completedCount === 0) {
          setLocation("/launchpad");
        } else if (launchpadProgress !== undefined || !isSubAccount) {
          setLocation("/dashboard");
        }
      }
    }
  }, [user, loading, setLocation, isSubAccount, launchpadProgress]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="Sterling Marketing" className="w-8 h-8 object-contain" />
              <span className="text-2xl font-bold">Sterling Marketing</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={getLoginUrl()}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </a>
            <Button asChild>
              <a href={getLoginUrl()}>
                <LogIn className="w-4 h-4 mr-2" />
                Login to CRM
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero + Login */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            {/* Left: headline */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <img src={LOGO_URL} alt="" className="w-4 h-4 object-contain" />
                <span>AI-Powered Lead Management Platform</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Welcome to{" "}
                <span className="text-primary">Sterling Marketing</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Your complete CRM solution for managing leads, campaigns, and appointments.
                Log in to access your dashboard and start managing your pipeline.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center p-3 rounded-lg bg-card border">
                  <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Lead Management</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-card border">
                  <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">AI Automation</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-card border">
                  <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Analytics</p>
                </div>
              </div>
            </div>

            {/* Right: login card */}
            <Card className="shadow-xl border-2">
              <CardHeader className="text-center pb-2">
                <img src={LOGO_URL} alt="" className="w-12 h-12 object-contain mx-auto mb-2" />
                <CardTitle className="text-2xl">Sign In</CardTitle>
                <CardDescription>Access your Sterling Marketing CRM</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-2">
                {/* Email/password form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setLoginError(""); }}
                        className="pl-9"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setLoginError(""); }}
                        className="pl-9 pr-10"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {loginError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{loginError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing in…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </span>
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full bg-background" asChild>
                  <a href={getLoginUrl()}>
                    <img src={LOGO_URL} alt="" className="w-4 h-4 object-contain mr-2" />
                    Continue with Manus
                  </a>
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Don't have an account? Contact your agency administrator.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">System Updates & Guides</h2>
              <p className="text-lg text-muted-foreground">
                Stay up to date with new features, system improvements, and helpful guides
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Placeholder blog posts - will be replaced with dynamic content */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-sm text-muted-foreground mb-2">February 17, 2026</div>
                  <CardTitle>PWA Push Notifications Now Live</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Install the Sterling Marketing CRM as a Progressive Web App on your phone and receive instant push notifications for hot leads, appointments, and daily standups.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/blog/pwa-push-notifications" className="text-primary hover:underline text-sm font-medium">
                    Read more →
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-sm text-muted-foreground mb-2">February 15, 2026</div>
                  <CardTitle>Getting Started Guide</CardTitle>
                  <CardDescription className="text-base mt-2">
                    New to Sterling Marketing? Learn how to set up your account, import leads, and launch your first campaign in under 10 minutes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/blog/getting-started" className="text-primary hover:underline text-sm font-medium">
                    Read more →
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-sm text-muted-foreground mb-2">February 10, 2026</div>
                  <CardTitle>AI Operations Director</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Meet your new AI Ops Director: daily standups, smart alerts for hot leads and no-shows, weekly strategy sessions, and automated team coordination.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/blog/ai-ops-director" className="text-primary hover:underline text-sm font-medium">
                    Read more →
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-sm text-muted-foreground mb-2">February 5, 2026</div>
                  <CardTitle>Lead Scoring Algorithm</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Our new lead scoring system automatically prioritizes your hottest leads based on engagement, call history, and appointment behavior.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/blog/lead-scoring" className="text-primary hover:underline text-sm font-medium">
                    Read more →
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-12">
              <Button variant="outline" size="lg" asChild>
                <Link href="/blog">
                  View All Updates
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card/50">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="Sterling Marketing" className="w-6 h-6 object-contain" />
              <span className="text-lg font-semibold">Sterling Marketing</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Sterling Marketing. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href={getLoginUrl()} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Login
              </a>
              <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Blog
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
