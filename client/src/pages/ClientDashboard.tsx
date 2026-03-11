import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import AISuccessCoachPanel from "@/components/AISuccessCoachPanel";
import SuggestedFollowUpsPanel from "@/components/SuggestedFollowUpsPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Phone,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  BarChart3,
  FileText,
  ExternalLink,
  Target,
  DollarSign,
  Calendar,
  ArrowRight,
  Zap,
  Star,
  ChevronRight,
  UserPlus,
  Megaphone,
  Bell,
  RefreshCw,
  TrendingDown,
  Send,
  Filter,
  Briefcase,
  ShieldAlert,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useState } from "react";
import { MessageSquare, PhoneCall, Mail, Loader2 } from "lucide-react";
import React from "react";
import { toast } from "sonner";

/* ─── Suggested Follow-ups Component ─── */
function SuggestedFollowUps() {
  const { data, isLoading } = trpc.followUps.getSuggested.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const messageMutation = trpc.followUps.getMessageSuggestion.useMutation();
  const [expandedLead, setExpandedLead] = useState<number | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<{ leadId: number; message: string; channel: string } | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Suggested Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.suggestions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Suggested Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="text-sm">{data?.summary || "All caught up! No follow-ups needed right now."}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleGenerateMessage = async (leadId: number, channel: "sms" | "email" | "call_script") => {
    try {
      const result = await messageMutation.mutateAsync({ leadId, channel });
      setGeneratedMessage({ leadId, message: result.message, channel });
    } catch {
      toast.error("Failed to generate message suggestion");
    }
  };

  const urgencyColors = {
    high: "border-l-red-500 bg-red-50/30 dark:bg-red-950/10",
    medium: "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10",
    low: "border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10",
  };

  const urgencyBadge = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Suggested Follow-ups
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {data.suggestions.length} action{data.suggestions.length > 1 ? "s" : ""}
            </Badge>
            <Link href="/follow-ups">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{data.summary}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.suggestions.map((s) => (
          <div key={s.leadId} className={`border-l-4 rounded-lg p-3 transition-all ${urgencyColors[s.urgency]}`}>
            <div
              className="flex items-start justify-between cursor-pointer"
              onClick={() => setExpandedLead(expandedLead === s.leadId ? null : s.leadId)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/leads/${s.leadId}`}>
                    <span className="text-sm font-semibold hover:underline">{s.leadName}</span>
                  </Link>
                  <Badge className={`text-[10px] px-1.5 py-0 ${urgencyBadge[s.urgency]}`}>
                    {s.urgency}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                    {s.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                <p className="text-xs font-medium mt-1.5 text-foreground/80">{s.suggestedAction}</p>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-1 ${
                expandedLead === s.leadId ? "rotate-90" : ""
              }`} />
            </div>

            {expandedLead === s.leadId && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                {/* Quick contact actions */}
                <div className="flex gap-2">
                  {s.phone && (
                    <a href={`tel:${s.phone}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                        <PhoneCall className="h-3 w-3" /> Call
                      </Button>
                    </a>
                  )}
                  {s.phone && (
                    <a href={`sms:${s.phone}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                        <MessageSquare className="h-3 w-3" /> Text
                      </Button>
                    </a>
                  )}
                  {s.email && (
                    <a href={`mailto:${s.email}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                        <Mail className="h-3 w-3" /> Email
                      </Button>
                    </a>
                  )}
                </div>

                {/* AI message generation */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => handleGenerateMessage(s.leadId, "sms")}
                    disabled={messageMutation.isPending}
                  >
                    {messageMutation.isPending && generatedMessage?.leadId !== s.leadId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Draft SMS
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => handleGenerateMessage(s.leadId, "email")}
                    disabled={messageMutation.isPending}
                  >
                    <Sparkles className="h-3 w-3" /> Draft Email
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => handleGenerateMessage(s.leadId, "call_script")}
                    disabled={messageMutation.isPending}
                  >
                    <Sparkles className="h-3 w-3" /> Call Script
                  </Button>
                </div>

                {/* Generated message display */}
                {generatedMessage && generatedMessage.leadId === s.leadId && (
                  <div className="bg-background rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground capitalize">
                        AI {generatedMessage.channel.replace("_", " ")} Suggestion
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedMessage.message);
                          toast.success("Copied to clipboard");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{generatedMessage.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─── AI Success Coach Widget ─── */
function buildCoachInsights(stats: any, slaAlerts: any): Array<{ text: React.ReactNode }> {
  if (!stats) return [];
  const insights: Array<{ text: React.ReactNode }> = [];
  const newLeads = stats.newLeads ?? 0;
  insights.push({ text: (<><strong className="text-foreground">{newLeads}</strong> new lead{newLeads !== 1 ? "s" : ""} need first contact. Speed-to-lead under 5 minutes increases conversion by ~40%.</>) });
  const qualified = stats.qualified ?? 0;
  insights.push({ text: (<><strong className="text-foreground">{qualified}</strong> qualified lead{qualified !== 1 ? "s" : ""} — prioritize booking calls within 24 hours.</>) });
  const closedWon = stats.closedWon ?? 0;
  insights.push({ text: (<><strong className="text-foreground">{closedWon}</strong> closed deal{closedWon !== 1 ? "s" : ""}. {closedWon === 0 ? "Consider requesting testimonials to increase trust." : "Request testimonials from closed clients to build social proof."}</>) });
  const contacted = stats.contacted ?? 0;
  insights.push({ text: (<>Follow up with <strong className="text-foreground">{contacted}</strong> &ldquo;Contacted&rdquo; lead{contacted !== 1 ? "s" : ""} after 48 hours if no response.</>) });
  const appointmentSet = stats.appointmentSet ?? 0;
  insights.push({ text: (<>Focus on moving leads from Qualified &rarr; Appointment Set to unlock revenue. <strong className="text-foreground">{appointmentSet}</strong> lead{appointmentSet !== 1 ? "s" : ""} currently in that stage.</>) });
  if (slaAlerts?.coldLeads > 0) {
    insights.push({ text: (<><strong className="text-foreground">{slaAlerts.coldLeads}</strong> cold lead{slaAlerts.coldLeads !== 1 ? "s" : ""} with no activity in 14+ days — re-engage with a rate drop alert or personalized SMS.</>) });
  }
  return insights;
}

function AISuccessCoachWidget({ stats, slaAlerts, onRefresh }: { stats: any; slaAlerts: any; onRefresh?: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const insights = buildCoachInsights(stats, slaAlerts);
  function handleGenerate() {
    if (onRefresh) onRefresh();
    setRefreshKey(k => k + 1);
    toast.success("Suggestions refreshed with latest pipeline data");
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          AI Success Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4" >
        <ul key={refreshKey} className="space-y-3">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
              <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              <span>{insight.text}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full" size="sm" onClick={handleGenerate}>
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Generate New Suggestions
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Success Score Ring ─── */
function SuccessScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="10" />
        <circle cx="64" cy="64" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

/* ─── Pipeline Funnel Bar ─── */
function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.max(4, (count / total) * 100) : 4;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{label}</span>
      <div className="flex-1 h-7 rounded-md overflow-hidden bg-muted/30 relative">
        <div className="h-full rounded-md transition-all duration-700 flex items-center px-2"
          style={{ width: `${pct}%`, background: color }}>
          {count > 0 && <span className="text-xs font-semibold text-white">{count}</span>}
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState<"today" | "this_week" | "this_month" | "last_30_days" | "last_90_days" | "ytd">("this_month");
  const { data: stats, isLoading: statsLoading } = trpc.crm.dashboardStats.useQuery(undefined, { retry: false });
  const { data: extStats } = trpc.crm.extendedStats.useQuery(undefined, { retry: false });
  const { data: clientInfo, isLoading: clientLoading } = trpc.crm.getMyInfo.useQuery(undefined, { retry: false });
  const { data: slaAlerts } = trpc.crm.getSlaAlerts.useQuery(undefined, { retry: false, refetchInterval: 5 * 60 * 1000 });
  const { data: rangeStats } = trpc.crm.dashboardStatsByRange.useQuery({ range: dateRange }, { retry: false });
  const welcomeMutation = trpc.crm.quickActionSendWelcome.useMutation({
    onSuccess: (d) => toast.info(d.message),
    onError: () => toast.error("Action failed"),
  });
  const reengageMutation = trpc.crm.quickActionReengage.useMutation({
    onSuccess: (d) => toast.info(d.message),
    onError: () => toast.error("Action failed"),
  });
  const rateDropMutation = trpc.crm.quickActionRateDropAlert.useMutation({
    onSuccess: (d) => toast.info(d.message),
    onError: () => toast.error("Action failed"),
  });
  const { data: seoStats } = trpc.seoBridge.getSeoStatsForClient.useQuery(
    { crmClientId: stats?.client?.id ?? 0 },
    { enabled: !!stats?.client?.id }
  );

  const isLoading = authLoading || statsLoading || clientLoading;

  /* ─── Loading skeleton ─── */
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-64 bg-muted rounded-xl" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ─── No profile ─── */
  if (!stats || !clientInfo) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle>No Client Profile</CardTitle>
            <CardDescription>
              You don't have a client profile yet. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  /* ─── Limited access ─── */
  if (stats.client.accessMode === "limited") {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-12 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold">Welcome, {stats.client.name}!</h2>
          <p className="text-muted-foreground">
            Your account is in limited mode. Complete your strategy call to unlock your full dashboard, lead pipeline, and AI-powered tools.
          </p>
          <Card className="text-left">
            <CardContent className="pt-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold capitalize">{stats.client.subscriptionTier.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-green-600">90-Day Free Trial</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trial Ends</span>
                <span className="font-medium">
                  {stats.client.trialEndDate ? new Date(stats.client.trialEndDate).toLocaleDateString() : "Not set"}
                </span>
              </div>
            </CardContent>
          </Card>
          <Link href="/appointments">
            <Button size="lg" className="gap-2">
              <Calendar className="h-4 w-4" />
              Book Strategy Call
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-4" >
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="text-lg font-semibold">
              Welcome back, {stats.client.name?.split(" ")[0] || user?.name?.split(" ")[0] || ""}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Here's your pipeline at a glance.
            </p>
          </div>
          <Badge variant={stats.client.subscriptionStatus === "active" ? "default" : "secondary"} className="capitalize text-xs">
            {stats.client.subscriptionTier} Plan
          </Badge>
        </div>

                {/* SLA Alerts */}
        {slaAlerts && (slaAlerts.newNotContacted > 0 || slaAlerts.noActivityIn7Days > 0 || slaAlerts.coldLeads > 0) && (
          <Card className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-800 dark:text-red-300">SLA Alerts</span>
                <Badge variant="destructive" className="ml-auto text-xs">{slaAlerts.newNotContacted + slaAlerts.noActivityIn7Days} alerts</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {slaAlerts.newNotContacted > 0 && (
                  <Link href="/leads">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">{slaAlerts.newNotContacted}</p>
                      <p className="text-[10px] text-red-600 dark:text-red-400">New, not contacted 24h+</p>
                    </div>
                  </Link>
                )}
                {slaAlerts.noActivityIn7Days > 0 && (
                  <Link href="/leads">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">
                      <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{slaAlerts.noActivityIn7Days}</p>
                      <p className="text-[10px] text-orange-600 dark:text-orange-400">No activity in 7 days</p>
                    </div>
                  </Link>
                )}
                {slaAlerts.coldLeads > 0 && (
                  <Link href="/leads">
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors">
                      <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{slaAlerts.coldLeads}</p>
                      <p className="text-[10px] text-yellow-600 dark:text-yellow-400">Cold (14+ days silent)</p>
                    </div>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Range Filter + KPI Row */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Performance Overview</h2>
          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-card flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-xl font-bold leading-none">{rangeStats ? rangeStats.totalLeads : stats.totalLeads}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Total Leads</div>
              <div className="text-[10px] text-blue-500 mt-0.5">{rangeStats ? `${rangeStats.totalLeads} in range` : `+${stats.leadsThisWeek} this wk`}</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-xl font-bold leading-none">{rangeStats ? rangeStats.completedAppts : stats.totalAppointments}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Appointments</div>
              <div className="text-[10px] text-green-500 mt-0.5">{rangeStats ? `${rangeStats.scheduledAppts} scheduled` : `${stats.showRate}% show rate`}</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-3">
            <Target className="h-5 w-5 text-purple-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-xl font-bold leading-none">{rangeStats ? rangeStats.conversionRate : stats.conversionRate}%</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Conversion Rate</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-xl font-bold leading-none">${(rangeStats ? rangeStats.estimatedRevenue : stats.estimatedRevenue).toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Est. Revenue</div>
              {rangeStats && rangeStats.pipelineValue > 0 && (
                <div className="text-[10px] text-emerald-500 mt-0.5">${(rangeStats.pipelineValue / 1000000).toFixed(1)}M pipeline</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Client Performance Stats ── */}
        {extStats && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">Client Performance</h2>
              {extStats.isTop10Percent && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Top 10% Client</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="stat-card flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-[11px] text-muted-foreground">Active Leads</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{extStats.activeLeads}</div>
                <div className="text-[10px] text-muted-foreground">{extStats.totalLeads} total</div>
              </div>
              <div className="stat-card flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-[11px] text-muted-foreground">Show Rate</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{extStats.showRate}%</div>
                <div className="text-[10px] text-muted-foreground">{extStats.completedAppointments}/{extStats.totalAppointments} appts</div>
              </div>
              <div className="stat-card flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="text-[11px] text-muted-foreground">Revenue Generated</span>
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  ${extStats.estimatedRevenue >= 1000
                    ? `${(extStats.estimatedRevenue / 1000).toFixed(1)}k`
                    : extStats.estimatedRevenue.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">{extStats.closedWon} closed deals</div>
              </div>
              <div className="stat-card flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                  <span className="text-[11px] text-muted-foreground">SEO Performance</span>
                </div>
                <div className="text-2xl font-bold text-violet-600">
                  {extStats.seoScore > 0
                    ? `${extStats.seoScore}%`
                    : extStats.seoPublished > 0
                    ? `${extStats.seoPublished}`
                    : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {extStats.seoScore > 0 ? "quality score" : extStats.seoPublished > 0 ? "published posts" : "No SEO data yet"}
                </div>
              </div>
              <div className="stat-card flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                  <span className="text-[11px] text-muted-foreground">Total Engagement</span>
                </div>
                <div className="text-2xl font-bold text-pink-600">{extStats.totalEngagement}</div>
                <div className="text-[10px] text-muted-foreground">lead interactions</div>
              </div>
              <div className="stat-card flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-orange-500" />
                  <span className="text-[11px] text-muted-foreground">Conversion Rate</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{extStats.conversionRate}%</div>
                <div className="text-[10px] text-muted-foreground">{extStats.closedWon} won</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-500" />
                Quick Actions
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => welcomeMutation.mutate()}
                disabled={welcomeMutation.isPending}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left group disabled:opacity-60"
              >
                <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
                  {welcomeMutation.isPending ? <Loader2 className="h-4 w-4 text-blue-600 animate-spin" /> : <Send className="h-4 w-4 text-blue-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Send Welcome Email</p>
                  <p className="text-xs text-muted-foreground">New leads from last 24h</p>
                </div>
              </button>
              <button
                onClick={() => reengageMutation.mutate()}
                disabled={reengageMutation.isPending}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left group disabled:opacity-60"
              >
                <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center shrink-0">
                  {reengageMutation.isPending ? <Loader2 className="h-4 w-4 text-orange-600 animate-spin" /> : <RefreshCw className="h-4 w-4 text-orange-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Re-engage Cold Leads</p>
                  <p className="text-xs text-muted-foreground">Silent for 14+ days</p>
                </div>
              </button>
              <button
                onClick={() => rateDropMutation.mutate()}
                disabled={rateDropMutation.isPending}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left group disabled:opacity-60"
              >
                <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                  {rateDropMutation.isPending ? <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" /> : <TrendingDown className="h-4 w-4 text-emerald-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Rate Drop Alert</p>
                  <p className="text-xs text-muted-foreground">Notify all active leads</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline + Success Score */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pipeline Funnel */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Lead Pipeline</CardTitle>
                <Link href="/leads">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <FunnelBar label="New" count={stats.newLeads} total={stats.totalLeads} color="#3b82f6" />
              <FunnelBar label="Contacted" count={stats.contacted} total={stats.totalLeads} color="#8b5cf6" />
              <FunnelBar label="Qualified" count={stats.qualified} total={stats.totalLeads} color="#f59e0b" />
              <FunnelBar label="Appt Set" count={stats.appointmentSet} total={stats.totalLeads} color="#10b981" />
              <FunnelBar label="Closed Won" count={stats.closedWon} total={stats.totalLeads} color="#059669" />
              <FunnelBar label="Closed Lost" count={stats.closedLost} total={stats.totalLeads} color="#ef4444" />
            </CardContent>
          </Card>

          {/* Success Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Success Score
              </CardTitle>
              <CardDescription className="text-xs">Pipeline health indicator</CardDescription>
            </CardHeader>
            <CardContent>
              <SuccessScoreRing score={stats.successScore} />
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lead Generation</span>
                  <span className={stats.totalLeads > 0 ? "text-green-600" : "text-red-500"}>
                    {stats.totalLeads > 0 ? "Active" : "Needs Work"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Follow-up</span>
                  <span className={stats.contacted > 0 ? "text-green-600" : "text-red-500"}>
                    {stats.contacted > 0 ? "Active" : "Needs Work"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Appointments</span>
                  <span className={stats.appointmentSet > 0 ? "text-green-600" : "text-red-500"}>
                    {stats.appointmentSet > 0 ? "Booking" : "Needs Work"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closing</span>
                  <span className={stats.closedWon > 0 ? "text-green-600" : "text-amber-500"}>
                    {stats.closedWon > 0 ? "Closing" : "In Progress"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Leads + Side Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Leads */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Leads</CardTitle>
                <Link href="/leads">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No leads yet. They'll appear here as they come in.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentLeads.map((lead: any) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors group cursor-pointer">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {lead.firstName?.[0]}{lead.lastName?.[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {lead.firstName} {lead.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.source || "Direct"} &middot; {new Date(lead.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={
                          lead.status === "new" ? "default" :
                          lead.status === "contacted" ? "secondary" :
                          lead.status === "qualified" ? "outline" :
                          lead.status === "appointment_set" ? "default" :
                          lead.status === "closed_won" ? "default" : "destructive"
                        } className="text-[10px] capitalize shrink-0">
                          {lead.status?.replace(/_/g, " ")}
                        </Badge>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Side Widgets */}
          <div className="space-y-4" >
            {/* Lead Sources */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.leadSources.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No lead data yet</p>
                ) : (
                  <div className="space-y-2">
                    {stats.leadSources.slice(0, 5).map((src: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1">{src.source}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary"
                              style={{ width: `${(src.count / stats.totalLeads) * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-6 text-right">{src.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI SEO Stats */}
            {seoStats && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-500" />
                      AI Content
                    </CardTitle>
                    <Link href="/apex-content">
                      <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                        Open <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 rounded-lg bg-muted/30">
                      <p className="text-lg font-bold">{seoStats.totalContent}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/30">
                      <p className="text-lg font-bold">{seoStats.publishedContent}</p>
                      <p className="text-[10px] text-muted-foreground">Published</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/30">
                      <p className="text-lg font-bold">{seoStats.totalViews?.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Views</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/30">
                      <p className="text-lg font-bold">{seoStats.avgQualityScore}</p>
                      <p className="text-[10px] text-muted-foreground">Quality</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
        {/* Right sidebar: AI Coach + Follow-Ups */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <AISuccessCoachPanel context="dashboard" />
          <SuggestedFollowUpsPanel />
        </div>
      </div>
    </DashboardLayout>
  );
}

