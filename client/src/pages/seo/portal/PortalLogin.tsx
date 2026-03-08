import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: "#000F12",
        backgroundImage: "radial-gradient(circle, rgba(0,255,255,0.07) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* Glow effect behind the card */}
      <div className="relative w-full max-w-md">
        <div
          className="absolute -inset-1 rounded-2xl blur-xl opacity-20"
          style={{ background: "radial-gradient(ellipse, #00FFFF 0%, transparent 70%)" }}
        />

        <div
          className="relative rounded-2xl p-8 border"
          style={{
            backgroundColor: "rgba(2, 18, 20, 0.92)",
            borderColor: "rgba(0,255,255,0.18)",
            boxShadow: "0 0 40px rgba(0,255,255,0.06), inset 0 1px 0 rgba(0,255,255,0.08)",
          }}
        >
          {/* Logo + heading */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-5">
              <img
                src="/apex-logo.svg"
                alt="Apex AI SEO Portal"
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Client Portal</h1>
            <p className="mt-1.5 text-sm" style={{ color: "rgba(0,255,255,0.55)" }}>
              Sign in to view your content and reports
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-white/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-white/80">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20"
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-400 text-center">{errorMsg}</p>
            )}

            <Button
              type="submit"
              className="w-full font-semibold tracking-wide"
              disabled={isLoading}
              style={{
                backgroundColor: "#00FFFF",
                color: "#001417",
              }}
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            <p>Don't have an account?</p>
            <p className="mt-0.5">Contact your account manager for an invitation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
