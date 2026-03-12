/**
 * Universal login page for ALL users.
 * - Sub-account users (Kyle, Tim, LOAs): email + password form
 * - Admin (Thailer): "Continue with Manus" button (Google OAuth)
 *
 * This page deliberately does NOT call useAuth() on mount and is
 * listed in PUBLIC_PATHS in main.tsx so the global error handler
 * can NEVER redirect away from it.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lock, Mail, Eye, EyeOff, LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getLoginUrl } from "@/const";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663346016577/LMov9oD5hWD87TsDa4kZ8o/GradientLogoBlue2Green_5403585a.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.onboarding.loginWithPassword.useMutation({
    onSuccess: (data) => {
      if (data.mustChangePassword) {
        window.location.replace("/force-change-password");
      } else {
        toast.success(`Welcome back, ${data.name || ""}!`);
        window.location.replace("/");
      }
    },
    onError: (err) => {
      setError(err.message || "Invalid email or password. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={LOGO_URL} alt="Sterling Marketing" className="h-12 object-contain" />
        </div>

        <Card className="border-slate-700 bg-slate-800/80 backdrop-blur shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to your CRM account
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {/* Email + Password form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    autoComplete="email"
                    autoFocus
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    autoComplete="current-password"
                    disabled={loginMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <Separator className="flex-1 bg-slate-700" />
              <span className="text-xs text-slate-500">or</span>
              <Separator className="flex-1 bg-slate-700" />
            </div>

            {/* Admin OAuth login */}
            <Button
              variant="outline"
              className="w-full border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white h-11"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
            >
              <span className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Admin: Continue with Manus
              </span>
            </Button>

            <p className="text-center text-xs text-slate-500">
              Having trouble? Contact your account manager.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
