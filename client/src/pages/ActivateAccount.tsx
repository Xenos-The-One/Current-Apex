import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function ActivateAccount() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activated, setActivated] = useState(false);

  // Extract token from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  // Validate token on load
  const { data: invitation, isLoading: validating, error: tokenError } =
    trpc.onboarding.validateInvitationToken.useQuery(
      { token: token! },
      { enabled: !!token, retry: false }
    );

  const activateMutation = trpc.onboarding.activateAccount.useMutation({
    onSuccess: (data) => {
      setActivated(true);
      toast.success("Account activated! Redirecting to login...");
      setTimeout(() => setLocation("/"), 3000);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to activate account");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    activateMutation.mutate({ token: token!, password });
  };

  const getPasswordStrength = () => {
    if (!password) return null;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score = [password.length >= 8, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 2) return { label: "Weak", color: "bg-destructive", width: "w-1/4" };
    if (score === 3) return { label: "Fair", color: "bg-yellow-500", width: "w-2/4" };
    if (score === 4) return { label: "Good", color: "bg-blue-500", width: "w-3/4" };
    return { label: "Strong", color: "bg-green-500", width: "w-full" };
  };

  const strength = getPasswordStrength();

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>This activation link is missing or invalid. Please check your email for the correct link.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Loading token validation
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying your activation link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Token error (expired, already used, invalid)
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Activation Failed</CardTitle>
            <CardDescription>{tokenError.message}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Please contact your administrator to send a new activation link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (activated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-green-200">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-700">Account Activated!</CardTitle>
            <CardDescription>
              Welcome, {invitation?.firstName}! Your account is ready. Redirecting you to the login page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sterling Marketing</h1>
          <p className="text-blue-300 text-sm mt-1">AI-Powered CRM Platform</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Activate Your Account</CardTitle>
            <CardDescription>
              Welcome, <strong>{invitation?.firstName} {invitation?.lastName}</strong>!
              {invitation?.company && <> ({invitation.company})</>}
              {" "}Set a secure password to complete your account setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Account info banner */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {invitation?.firstName?.[0]}{invitation?.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {invitation?.firstName} {invitation?.lastName}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">{invitation?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  <Lock className="h-3.5 w-3.5 inline mr-1" />
                  Create Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {strength && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">Strength: <span className="font-medium">{strength.label}</span></p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  <Lock className="h-3.5 w-3.5 inline mr-1" />
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && password.length >= 8 && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                  Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols for a strong password.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={activateMutation.isPending || !password || !confirmPassword || password !== confirmPassword}
              >
                {activateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Activating Account...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Activate Account</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-blue-400 mt-6">
          © {new Date().getFullYear()} Sterling Marketing · AI-Powered Lead Management
        </p>
      </div>
    </div>
  );
}
