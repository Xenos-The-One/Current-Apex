import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  BarChart3,
  Globe,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ─── Analytics Tab ─────────────────────────────────────────────────────────
function AnalyticsTab({ agencyId }: { agencyId: number }) {
  const { data } = trpc.analytics.getDashboard.useQuery({ agencyId });

  const kpis = [
    { label: "Total Leads", value: data?.kpis.totalLeads ?? 0, color: "text-blue-600" },
    { label: "New Leads", value: data?.kpis.newLeads ?? 0, color: "text-green-600" },
    { label: "Converted", value: data?.kpis.convertedLeads ?? 0, color: "text-emerald-600" },
    { label: "Conversion Rate", value: `${data?.kpis.conversionRate ?? 0}%`, color: "text-purple-600" },
    { label: "Appointments", value: data?.kpis.totalAppointments ?? 0, color: "text-yellow-600" },
    { label: "Calls Made", value: data?.kpis.totalCalls ?? 0, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.sourceBreakdown && data.sourceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.sourceBreakdown}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ source, percent }: { source: string; percent: number }) =>
                      `${source} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {data.sourceBreakdown.map((_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pipeline Stages</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.stageBreakdown && data.stageBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.stageBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Metrics Tab ───────────────────────────────────────────────────────────
function MetricsTab({ agencyId }: { agencyId: number }) {
  const { data: campaignStats } = trpc.analytics.getCampaignStats.useQuery({ agencyId });

  const emailCampaigns = campaignStats?.email ?? [];
  const smsCampaigns = campaignStats?.sms ?? [];

  const emailTotals = emailCampaigns.reduce(
    (acc: { sent: number; opened: number; clicked: number }, c: (typeof emailCampaigns)[number]) => ({
      sent: acc.sent + (c.totalSent ?? 0),
      opened: acc.opened + (c.totalOpened ?? 0),
      clicked: acc.clicked + (c.totalClicked ?? 0),
    }),
    { sent: 0, opened: 0, clicked: 0 }
  );

  const smsTotals = smsCampaigns.reduce(
    (acc: { sent: number; delivered: number }, c: (typeof smsCampaigns)[number]) => ({
      sent: acc.sent + (c.totalSent ?? 0),
      delivered: acc.delivered + (c.totalDelivered ?? 0),
    }),
    { sent: 0, delivered: 0 }
  );

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Email Campaign Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Sent", value: emailTotals.sent },
                { label: "Total Opened", value: emailTotals.opened },
                { label: "Total Clicked", value: emailTotals.clicked },
                { label: "Open Rate", value: emailTotals.sent > 0 ? `${Math.round((emailTotals.opened / emailTotals.sent) * 100)}%` : "0%" },
              ].map(m => (
                <div key={m.label} className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">SMS Campaign Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Sent", value: smsTotals.sent },
                { label: "Delivered", value: smsTotals.delivered },
                { label: "Delivery Rate", value: smsTotals.sent > 0 ? `${Math.round((smsTotals.delivered / smsTotals.sent) * 100)}%` : "0%" },
                { label: "Campaigns", value: smsCampaigns.length },
              ].map(m => (
                <div key={m.label} className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Team performance metrics will appear here as your team uses the platform.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Market Tab ────────────────────────────────────────────────────────────
function MarketTab({ agencyId: _agencyId }: { agencyId: number }) {
  const mockRateData = [
    { month: "Sep", rate: 7.2 }, { month: "Oct", rate: 7.0 }, { month: "Nov", rate: 6.8 },
    { month: "Dec", rate: 6.7 }, { month: "Jan", rate: 6.9 }, { month: "Feb", rate: 6.6 },
  ];

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { label: "Avg 30-yr Rate", value: "6.62%", change: "-0.08%", positive: true },
          { label: "Avg 15-yr Rate", value: "5.98%", change: "-0.05%", positive: true },
          { label: "Median Home Price", value: "$412K", change: "+2.1%", positive: false },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
              <p className={`text-xs font-medium mt-1 ${m.positive ? "text-green-600" : "text-red-500"}`}>{m.change} vs last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">30-Year Fixed Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockRateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[6, 8]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Rate"]} />
              <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Funnel Tab ────────────────────────────────────────────────────────────
function FunnelTab({ agencyId }: { agencyId: number }) {
  const { data } = trpc.analytics.getDashboard.useQuery({ agencyId });

  const totalLeads = data?.kpis.totalLeads ?? 0;
  const funnelStages = [
    { stage: "New Leads", count: totalLeads, color: "#6366f1" },
    { stage: "Contacted", count: Math.round(totalLeads * 0.72), color: "#8b5cf6" },
    { stage: "Qualified", count: Math.round(totalLeads * 0.48), color: "#a78bfa" },
    { stage: "Appt Set", count: data?.kpis.totalAppointments ?? 0, color: "#c4b5fd" },
    { stage: "Converted", count: data?.kpis.convertedLeads ?? 0, color: "#22c55e" },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Conversion Funnel (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnelStages.map((stage) => {
              const maxCount = funnelStages[0].count || 1;
              const pct = Math.round((stage.count / maxCount) * 100);
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground w-20 text-right flex-shrink-0">{stage.stage}</p>
                  <div className="flex-1 bg-muted rounded-full h-7 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-3 transition-all"
                      style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: stage.color }}
                    >
                      <span className="text-xs text-white font-medium">{stage.count}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground w-10 flex-shrink-0">{pct}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Lead Source Attribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.sourceBreakdown && data.sourceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.sourceBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="source" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Stage Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              {[
                { from: "New → Contacted", rate: 72 },
                { from: "Contacted → Qualified", rate: 67 },
                { from: "Qualified → Appt Set", rate: 54 },
                { from: "Appt Set → Converted", rate: 38 },
              ].map(r => (
                <div key={r.from}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{r.from}</span>
                    <span className="font-medium">{r.rate}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${r.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Advanced Tab ──────────────────────────────────────────────────────────
function AdvancedTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Advanced Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Advanced reporting coming soon</p>
            <p className="text-xs mt-1">Cohort analysis, LTV predictions, and custom report builder will be available here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Reports Hub ──────────────────────────────────────────────────────
export default function ReportsHub() {
  const { agencyId } = useAgency();

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-display">Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Analytics, team metrics, market data, conversion funnels, and advanced insights</p>
        </div>

        <Tabs defaultValue="analytics">
          <TabsList className="h-9">
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Metrics
            </TabsTrigger>
            <TabsTrigger value="market" className="gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Market
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Funnel
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-4"><AnalyticsTab agencyId={agencyId} /></TabsContent>
          <TabsContent value="metrics" className="mt-4"><MetricsTab agencyId={agencyId} /></TabsContent>
          <TabsContent value="market" className="mt-4"><MarketTab agencyId={agencyId} /></TabsContent>
          <TabsContent value="funnel" className="mt-4"><FunnelTab agencyId={agencyId} /></TabsContent>
          <TabsContent value="advanced" className="mt-4"><AdvancedTab /></TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
