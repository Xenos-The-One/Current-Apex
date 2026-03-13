import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PortalLogin() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loginMutation = trpc.seo.clientPortal.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("client_portal_token", data.token);
      localStorage.setItem("client_portal_user", JSON.stringify(data.user));
      setLocation("/seo/portal/dashboard");
    },
    onError: (error) => {
      setErrorMsg(error.message || "Login failed. Please check your credentials.");
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-4">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346016577/LMov9oD5hWD87TsDa4kZ8o/GradientLogoBlue2Green_5403585a.png"
                alt="Logo"
                className="h-10 w-10 object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Client Portal</CardTitle>
            <CardDescription>Sign in to view your content and reports</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive text-center">{errorMsg}</p>
              )}

              <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
                {isLoading ? "Signing in…" : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-muted-foreground">
              <p>Don't have an account?</p>
              <p className="mt-0.5">Contact your account manager for an invitation.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
