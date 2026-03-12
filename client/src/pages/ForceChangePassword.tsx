/**
 * Force Password Change page.
 * Shown when a user logs in and mustChangePassword === true (e.g. after admin reset).
 * The user CANNOT navigate away — they must set a new password first.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663346016577/LMov9oD5hWD87TsDa4kZ8o/GradientLogoBlue2Green_5403585a.png";

export default function ForceChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const changePassword = trpc.onboarding.changePassword.useMutation({
    onSuccess: async () => {
      await clearFlag.mutateAsync();
    },
    onError: (err) => setError(err.message),
  });

  const clearFlag = trpc.onboarding.clearMustChangePassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated! Redirecting to your dashboard…");
      setTimeout(() => window.location.replace("/"), 1200);
    },
    onError: () => {
      toast.success("Password updated!");
      setTimeout(() => window.location.replace("/"), 1200);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  const isPending = changePassword.isPending || clearFlag.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={LOGO_URL} alt="Sterling Marketing" className="h-12 object-contain" />
        </div>

        <Card className="border-slate-700 bg-slate-800/80 backdrop-blur shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-white">Set a New Password</CardTitle>
            <CardDescription className="text-slate-400">
              Your password was reset by an admin. Please choose a new password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPwd" className="text-slate-300">Temporary Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="currentPwd"
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter the temporary password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    disabled={isPending}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" tabIndex={-1}>
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPwd" className="text-slate-300">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="newPwd"
                    type={showNew ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    disabled={isPending}
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" tabIndex={-1}>
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPwd" className="text-slate-300">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPwd"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    disabled={isPending}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11" disabled={isPending}>
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Set New Password
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
