import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Phone,
  TrendingUp,
  TrendingDown,
  X,
  ArrowRight,
  Zap,
  Target,
  Star,
  RefreshCw,
  Send,
  Calendar,
  Loader2,
  BrainCircuit,
  ShieldAlert,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

type RecommendationCategory = "urgent" | "growth" | "optimization" | "content";

interface Recommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  action: string;
  href: string;
  metric?: string;
  dismissed?: boolean;
}

const CATEGORY_CONFIG: Record<RecommendationCategory, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  urgent: { label: "Urgent", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800", icon: AlertCircle },
  growth: { label: "Growth", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800", icon: TrendingUp },
  optimization: { label: "Optimize", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800", icon: Target },
  content: { label: "Content", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800", icon: Sparkles },
};

const IMPACT_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

function buildRecommendations(slaAlerts: any, stats: any): Recommendation[] {
  const recs: Recommendation[] = [];

  if (slaAlerts?.newNotContacted > 0) {
    recs.push({
      id: "new-not-contacted",
      category: "urgent",
      title: `${slaAlerts.newNotContacted} new lead${slaAlerts.newNotContacted > 1 ? "s" : ""} not contacted within 24 hours`,
      description: "Speed-to-lead is the #1 driver of conversion. Leads contacted within 5 minutes are 21x more likely to qualify. These leads are going cold right now.",
      impact: "high",
      action: "Contact Now",
      href: "/contacts",
      metric: `${slaAlerts.newNotContacted} leads at risk`,
    });
  }

  if (slaAlerts?.noActivityIn7Days > 0) {
    recs.push({
      id: "no-activity-7d",
      category: "urgent",
      title: `${slaAlerts.noActivityIn7Days} lead${slaAlerts.noActivityIn7Days > 1 ? "s" : ""} with no activity in 7+ days`,
      description: "Leads that go silent for a week are 3x more likely to choose a competitor. A quick check-in SMS or call can re-activate 30–40% of these.",
      impact: "high",
      action: "View Follow-Ups",
      href: "/follow-up-actions",
      metric: `${slaAlerts.noActivityIn7Days} stale leads`,
    });
  }

  if (slaAlerts?.coldLeads > 0) {
    recs.push({
      id: "cold-leads",
      category: "optimization",
      title: `${slaAlerts.coldLeads} cold lead${slaAlerts.coldLeads > 1 ? "s" : ""} silent for 14+ days`,
      description: "These leads haven't been contacted in over two weeks. A rate drop alert or market update email is a natural, non-pushy reason to re-engage.",
      impact: "medium",
      action: "Re-engage",
      href: "/follow-up-actions",
      metric: `${slaAlerts.coldLeads} cold leads`,
    });
  }

  if (stats?.conversionRate < 20 && stats?.totalLeads > 5) {
    recs.push({
      id: "low-conversion",
      category: "growth",
      title: "Conversion rate below 20% — pipeline needs attention",
      description: `Your current conversion rate is ${stats.conversionRate}%. Top performers average 25–35%. Review your qualification criteria and follow-up cadence to identify the drop-off point.`,
      impact: "high",
      action: "View Pipeline",
      href: "/pipeline",
      metric: `${stats.conversionRate}% conversion`,
    });
  }

  if (stats?.appointmentSet === 0 && stats?.totalLeads > 10) {
    recs.push({
      id: "no-appointments",
      category: "growth",
      title: "No appointments booked — activate your calendar",
      description: "You have leads in the pipeline but no appointments scheduled. Enable automated appointment booking in your campaigns to convert more leads to consultations.",
      impact: "high",
      action: "View Calendar",
      href: "/calendar",
      metric: "0 appointments",
    });
  }

  if (stats?.pendingApprovalsCount > 0) {
    recs.push({
      id: "pending-content",
      category: "content",
      title: `${stats.pendingApprovalsCount} content item${stats.pendingApprovalsCount > 1 ? "s" : ""} waiting for your approval`,
      description: "Content that sits in review loses its relevance window. Approve or request changes now to keep your publishing schedule on track.",
      impact: "medium",
      action: "Review Content",
      href: "/content-approvals",
      metric: `${stats.pendingApprovalsCount} pending`,
    });
  }

  // Always add a growth tip if pipeline is healthy
  if (recs.filter(r => r.category === "growth").length === 0) {
    recs.push({
      id: "referral-tip",
      category: "growth",
      title: "Activate your referral partner network",
      description: "Referral leads close at 3x the rate of cold leads and cost nothing to acquire. Reach out to your top 3 referral partners this week with a personalized market update.",
      impact: "medium",
      action: "View Partners",
      href: "/referral-partners",
    });
  }

  return recs;
}

export default function AISuccessCoach() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<RecommendationCategory | "all">("all");

  const { data: slaAlerts, isLoading: slaLoading } = trpc.crm.getSlaAlerts.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: stats, isLoading: statsLoading } = trpc.crm.dashboardStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const welcomeMutation = trpc.crm.quickActionSendWelcome.useMutation({
    onSuccess: () => toast.success("Welcome emails sent to new leads"),
    onError: () => toast.error("Failed to send welcome emails"),
  });
  const reengageMutation = trpc.crm.quickActionReengage.useMutation({
    onSuccess: () => toast.success("Re-engagement messages sent"),
    onError: () => toast.error("Failed to send re-engagement messages"),
  });
  const rateDropMutation = trpc.crm.quickActionRateDropAlert.useMutation({
    onSuccess: () => toast.success("Rate drop alerts sent"),
    onError: () => toast.error("Failed to send rate drop alerts"),
  });

  const isLoading = slaLoading || statsLoading;

  const allRecs = buildRecommendations(slaAlerts, stats);
  const activeRecs = allRecs.filter(r => !dismissed.has(r.id));
  const filteredRecs = activeFilter === "all" ? activeRecs : activeRecs.filter(r => r.category === activeFilter);

  const urgentCount = activeRecs.filter(r => r.category === "urgent").length;
  const coachScore = Math.max(0, 100 - urgentCount * 25 - activeRecs.filter(r => r.impact === "high").length * 10);

  function dismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]));
    toast.success("Recommendation dismissed");
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-violet-500" />
              AI Success Coach
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Personalized recommendations to grow your pipeline and close more loans.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDismissed(new Set())}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        {/* Coach Score + Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Score Card */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Pipeline Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
              ) : (
                <>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-4xl font-bold">{coachScore}</span>
                    <span className="text-muted-foreground text-sm mb-1">/100</span>
                  </div>
                  <Progress value={coachScore} className="h-2 mb-3" />
                  <p className="text-xs text-muted-foreground">
                    {coachScore >= 80 ? "Excellent — your pipeline is healthy." :
                     coachScore >= 60 ? "Good — a few areas need attention." :
                     coachScore >= 40 ? "Fair — take action on urgent items." :
                     "Needs work — address urgent alerts now."}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                One-Click Actions
              </CardTitle>
              <CardDescription className="text-xs">Execute common outreach tasks instantly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => welcomeMutation.mutate()}
                  disabled={welcomeMutation.isPending}
                  className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-accent/50 transition-colors text-left disabled:opacity-60"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
                    {welcomeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" /> : <Send className="h-3.5 w-3.5 text-blue-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium">Welcome Email</p>
                    <p className="text-[10px] text-muted-foreground">New leads 24h</p>
                  </div>
                </button>
                <button
                  onClick={() => reengageMutation.mutate()}
                  disabled={reengageMutation.isPending}
                  className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-accent/50 transition-colors text-left disabled:opacity-60"
                >
                  <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center shrink-0">
                    {reengageMutation.isPending ? <Loader2 className="h-3.5 w-3.5 text-orange-600 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-orange-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium">Re-engage Cold</p>
                    <p className="text-[10px] text-muted-foreground">14+ days silent</p>
                  </div>
                </button>
                <button
                  onClick={() => rateDropMutation.mutate()}
                  disabled={rateDropMutation.isPending}
                  className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-accent/50 transition-colors text-left disabled:opacity-60"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                    {rateDropMutation.isPending ? <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin" /> : <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium">Rate Drop Alert</p>
                    <p className="text-[10px] text-muted-foreground">All active leads</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Filter:</span>
          {(["all", "urgent", "growth", "optimization", "content"] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeFilter === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent"
              }`}
            >
              {cat === "all" ? `All (${activeRecs.length})` : (
                <>
                  {CATEGORY_CONFIG[cat].label}
                  {cat === "urgent" && urgentCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white rounded-full px-1 text-[10px]">{urgentCount}</span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Recommendations */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredRecs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
              <p className="font-medium">All clear in this category!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeFilter === "all"
                  ? "No recommendations right now. Your pipeline is in great shape."
                  : "No recommendations in this category. Switch to 'All' to see everything."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecs.map(rec => {
              const config = CATEGORY_CONFIG[rec.category];
              const CategoryIcon = config.icon;
              return (
                <Card key={rec.id} className={`border ${config.bg} relative`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                        rec.category === "urgent" ? "bg-red-100 dark:bg-red-900/40" :
                        rec.category === "growth" ? "bg-blue-100 dark:bg-blue-900/40" :
                        rec.category === "optimization" ? "bg-amber-100 dark:bg-amber-900/40" :
                        "bg-purple-100 dark:bg-purple-900/40"
                      }`}>
                        <CategoryIcon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color} border-current`}>
                              {config.label}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${IMPACT_BADGE[rec.impact]}`}>
                              {rec.impact} impact
                            </Badge>
                            {rec.metric && (
                              <span className="text-[10px] text-muted-foreground">{rec.metric}</span>
                            )}
                          </div>
                          <button
                            onClick={() => dismiss(rec.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5"
                            title="Dismiss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold mb-1">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{rec.description}</p>
                        <Link href={rec.href}>
                          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                            {rec.action}
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dismissed count */}
        {dismissed.size > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {dismissed.size} recommendation{dismissed.size > 1 ? "s" : ""} dismissed.{" "}
            <button onClick={() => setDismissed(new Set())} className="underline hover:no-underline">
              Show all
            </button>
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
