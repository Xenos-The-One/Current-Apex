import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Rocket,
  Lock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = {
  key: string;
  title: string;
  description: string;
  detail: string;
  autoDetect: boolean;
  ctaLabel: string | null;
  ctaPath: string | null;
  order: number;
  completed: boolean;
  completedAt: string | null;
  completedBy: number | null;
  notes: string | null;
};

type Phase = {
  phase: string;
  phaseIcon: string;
  steps: Step[];
};

// ─── Step Card ───────────────────────────────────────────────────────────────
function StepCard({
  step,
  isNext,
  isAdmin,
  onMarkComplete,
  onUnmark,
  isLoading,
}: {
  step: Step;
  isNext: boolean;
  isAdmin: boolean;
  onMarkComplete: (key: string) => void;
  onUnmark: (key: string) => void;
  isLoading: boolean;
}) {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(isNext);

  return (
    <div
      className={`
        rounded-xl border transition-all duration-200 overflow-hidden
        ${step.completed
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20"
          : isNext
            ? "border-blue-300 bg-blue-50/60 dark:border-blue-700/50 dark:bg-blue-950/20 shadow-md shadow-blue-100 dark:shadow-blue-950/30"
            : "border-border bg-card opacity-70"
        }
      `}
    >
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Status icon */}
        <div className="shrink-0">
          {step.completed ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : isNext ? (
            <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
          ) : (
            <Circle className="w-6 h-6 text-muted-foreground/40" />
          )}
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {step.title}
            </span>
            {isNext && !step.completed && (
              <Badge className="text-xs bg-blue-500 text-white border-0 px-2 py-0">
                👉 Do This Next
              </Badge>
            )}
            {step.completed && step.completedBy && (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                Marked by admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{step.description}</p>
        </div>

        {/* Expand chevron */}
        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50">
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{step.detail}</p>

          {/* Completion timestamp */}
          {step.completed && step.completedAt && (
            <p className="text-xs text-emerald-600 mt-2">
              ✅ Completed {new Date(step.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {/* CTA button */}
            {step.ctaLabel && step.ctaPath && !step.completed && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => navigate(step.ctaPath!)}
              >
                {step.ctaLabel}
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Admin: mark complete / unmark */}
            {isAdmin && !step.autoDetect && (
              <>
                {!step.completed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    disabled={isLoading}
                    onClick={() => onMarkComplete(step.key)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark as Done
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground text-xs"
                    disabled={isLoading}
                    onClick={() => onUnmark(step.key)}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Undo
                  </Button>
                )}
              </>
            )}

            {/* Client: self-mark non-auto steps */}
            {!isAdmin && !step.autoDetect && !step.completed && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                disabled={isLoading}
                onClick={() => onMarkComplete(step.key)}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark as Done
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Launchpad Page ─────────────────────────────────────────────────────
export default function Launchpad() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data, isLoading, error } = trpc.launchpad.getProgress.useQuery(undefined, {
    refetchInterval: 30_000, // refresh every 30s to pick up auto-detected changes
  });

  const markComplete = trpc.launchpad.markStepComplete.useMutation({
    onSuccess: () => {
      utils.launchpad.getProgress.invalidate();
      toast.success("Step marked as complete! Great progress — keep going.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const unmarkStep = trpc.launchpad.unmarkStep.useMutation({
    onSuccess: () => {
      utils.launchpad.getProgress.invalidate();
      toast.success("Step has been reset.");
    },
  });

  const handleMarkComplete = (key: string) => {
    markComplete.mutate({ stepKey: key });
  };

  const handleUnmark = (key: string) => {
    unmarkStep.mutate({ stepKey: key });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* ── Hero Header ─────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Rocket className="w-7 h-7 text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight">Your Launchpad</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Follow these steps to get your AI-powered lead system fully up and running.
            Each step brings you closer to leads flowing in automatically.
          </p>
        </div>

        {/* ── Progress Bar ────────────────────────────────────────── */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Could not load your progress. Please refresh the page.
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* Progress summary card */}
            <Card className={`border-2 ${data.isComplete ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20" : "border-blue-200 dark:border-blue-800/40"}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {data.isComplete ? "🎉 Setup Complete!" : `${data.completedCount} of ${data.totalSteps} steps completed`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {data.isComplete
                        ? "Your AI lead system is fully operational."
                        : data.nextStep
                          ? `Next: ${data.nextStep.title}`
                          : "All steps done!"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-3xl font-bold ${data.isComplete ? "text-emerald-500" : "text-blue-500"}`}>
                      {data.progressPercent}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={data.progressPercent}
                  className={`h-3 ${data.isComplete ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500"}`}
                />

                {/* Step dots */}
                <div className="flex items-center gap-1 mt-3 flex-wrap">
                  {data.phases.flatMap(p => p.steps).map((step, i) => (
                    <div
                      key={step.key}
                      title={step.title}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        step.completed
                          ? "bg-emerald-500"
                          : step.key === data.nextStep?.key
                            ? "bg-blue-500 ring-2 ring-blue-300"
                            : "bg-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Phase Sections ───────────────────────────────────── */}
            {data.phases.map((phase) => {
              const phaseCompleted = phase.steps.every(s => s.completed);
              const phaseStarted = phase.steps.some(s => s.completed);

              return (
                <div key={phase.phase} className="space-y-3">
                  {/* Phase header */}
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{phase.phaseIcon}</span>
                    <h2 className="font-semibold text-base text-foreground">{phase.phase}</h2>
                    {phaseCompleted && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                        Complete
                      </Badge>
                    )}
                    {!phaseCompleted && phaseStarted && (
                      <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                        In Progress
                      </Badge>
                    )}
                  </div>

                  {/* Steps */}
                  <div className="space-y-2">
                    {phase.steps.map((step) => (
                      <StepCard
                        key={step.key}
                        step={step}
                        isNext={step.key === data.nextStep?.key}
                        isAdmin={isAdmin}
                        onMarkComplete={handleMarkComplete}
                        onUnmark={handleUnmark}
                        isLoading={markComplete.isPending || unmarkStep.isPending}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* ── Completion Banner ────────────────────────────────── */}
            {data.isComplete && (
              <Card className="border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                <CardContent className="p-6 text-center space-y-2">
                  <div className="text-4xl">🎉</div>
                  <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-400">
                    You're Fully Live!
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Your AI is now working 24/7 — calling leads, booking appointments, and growing your business while you sleep.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Help Section ─────────────────────────────────────── */}
            <Card className="border-dashed">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Need help with a step?</p>
                  <p className="text-xs text-muted-foreground">Your account manager can walk you through anything on this list.</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
