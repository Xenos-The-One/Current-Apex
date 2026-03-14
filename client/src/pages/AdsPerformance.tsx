import DashboardLayout from "@/components/DashboardLayout";
import AISuccessCoachPanel from "@/components/AISuccessCoachPanel";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  MousePointer,
  Eye,
  BarChart3,
  Facebook,
  Instagram,
  Globe,
  ArrowRight,
  AlertCircle,
  Megaphone,
} from "lucide-react";

interface AdMetric {
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

function MetricCard({ label, value, subtext, trend, trendValue }: AdMetric) {
  return (
    <div className="stat-card">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {(subtext || trendValue) && (
        <div className="flex items-center gap-1 mt-1">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
          <p className="text-[10px] text-muted-foreground">{trendValue || subtext}</p>
        </div>
      )}
    </div>
  );
}

function PlatformCard({
  platform,
  icon: Icon,
  color,
  leads,
  spend,
  cpl,
  status,
}: {
  platform: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  leads: number;
  spend: string;
  cpl: string;
  status: "active" | "paused" | "none";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <span className="font-medium text-sm">{platform}</span>
          </div>
          <Badge
            variant="outline"
            className={
              status === "active" ? "border-emerald-300 text-emerald-600" :
              status === "paused" ? "border-amber-300 text-amber-600" :
              "border-muted text-muted-foreground"
            }
          >
            {status === "active" ? "Active" : status === "paused" ? "Paused" : "Not Set Up"}
          </Badge>
        </div>
        {status !== "none" ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold">{leads}</p>
              <p className="text-[10px] text-muted-foreground">Leads</p>
            </div>
            <div>
              <p className="text-lg font-bold">{spend}</p>
              <p className="text-[10px] text-muted-foreground">Spend</p>
            </div>
            <div>
              <p className="text-lg font-bold">{cpl}</p>
              <p className="text-[10px] text-muted-foreground">CPL</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            No active campaigns on this platform
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdsPerformance() {
  const { data: leadsData, isLoading } = trpc.crm.dashboardStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Derive ad-sourced lead counts from the lead source breakdown
  const leadSources = (leadsData as any)?.leadSources || [];
  const fbLeads = leadSources.find((s: any) => s.source?.toLowerCase().includes("facebook"))?.count || 0;
  const igLeads = leadSources.find((s: any) => s.source?.toLowerCase().includes("instagram"))?.count || 0;
  const googleLeads = leadSources.find((s: any) => s.source?.toLowerCase().includes("google"))?.count || 0;
  const totalAdLeads = fbLeads + igLeads + googleLeads;
  const totalLeads = (leadsData as any)?.totalLeads || 0;

  return (
    <DashboardLayout>
      <div className="flex gap-4 flex-col lg:flex-row dashboard-main-flex">
        <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-500" />
              Ads Performance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lead volume and cost metrics from your paid advertising campaigns.
            </p>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Ad-Sourced Leads"
            value={totalAdLeads.toString()}
            subtext={`${totalLeads > 0 ? Math.round((totalAdLeads / totalLeads) * 100) : 0}% of total`}
            trend="up"
            trendValue={`${totalLeads > 0 ? Math.round((totalAdLeads / totalLeads) * 100) : 0}% of total leads`}
          />
          <MetricCard
            label="Facebook Leads"
            value={fbLeads.toString()}
            subtext="from Facebook Ads"
          />
          <MetricCard
            label="Instagram Leads"
            value={igLeads.toString()}
            subtext="from Instagram Ads"
          />
          <MetricCard
            label="Google Leads"
            value={googleLeads.toString()}
            subtext="from Google Ads"
          />
        </div>

        {/* Platform Breakdown */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Platform Breakdown</h2>
          <div className="grid grid-cols-1 gap-4">
            <PlatformCard
              platform="Facebook Ads"
              icon={Facebook}
              color="bg-blue-600"
              leads={fbLeads}
              spend="—"
              cpl="—"
              status={fbLeads > 0 ? "active" : "none"}
            />
            <PlatformCard
              platform="Instagram Ads"
              icon={Instagram}
              color="bg-gradient-to-br from-purple-600 to-pink-500"
              leads={igLeads}
              spend="—"
              cpl="—"
              status={igLeads > 0 ? "active" : "none"}
            />
            <PlatformCard
              platform="Google Ads"
              icon={Globe}
              color="bg-red-500"
              leads={googleLeads}
              spend="—"
              cpl="—"
              status={googleLeads > 0 ? "active" : "none"}
            />
          </div>
        </div>

        {/* Lead Source Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              All Lead Sources
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of all leads by acquisition source
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
              </div>
            ) : leadSources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No lead source data yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {leadSources.map((src: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm w-32 truncate shrink-0">{src.source || "Unknown"}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${totalLeads > 0 ? (src.count / totalLeads) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                      {src.count} ({totalLeads > 0 ? Math.round((src.count / totalLeads) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Full ad spend data coming soon
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                  Cost-per-lead, ROAS, and impression data will be available once your Facebook and Google ad accounts are connected. Contact your account manager to enable this integration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        {/* Right sidebar: AI Coach */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4 dashboard-sidebar">
          <AISuccessCoachPanel context="ads" />
        </div>
      </div>
    </DashboardLayout>
  );
}
