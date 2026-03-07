import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

function KPICard({ label, value, sub, icon: Icon, trend, color = "blue" }: {
  label: string; value: string | number; sub?: string; icon: any; trend?: number; color?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold font-display mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-50`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
          <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? "rotate-180" : ""}`} />
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;
  const [period, setPeriod] = useState("30");

  const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
  const { data: dashboard } = trpc.analytics.getDashboard.useQuery({ agencyId, startDate });
  const { data: funnelRaw } = trpc.analytics.getFunnel.useQuery({ agencyId });
  const { data: campaignStats } = trpc.analytics.getCampaignStats.useQuery({ agencyId });
  const overview = dashboard?.kpis;
  const leadsBySource = dashboard?.sourceBreakdown;
  const leadsByStage = dashboard?.stageBreakdown;

  // Build chart data from real API
  const sourceData = leadsBySource?.map((s: any) => ({ name: s.source?.replace(/_/g, " ") || "Unknown", value: s.count })) || [];
  const stageData = leadsByStage?.map((s: any) => ({ name: s.stage?.replace(/_/g, " ") || "Unknown", count: s.count })) || [];
  const funnelData = funnelRaw || [];
  const campaignPerf = campaignStats;

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Analytics</h1>
            <p className="text-muted-foreground text-sm">Business intelligence and performance metrics</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Leads" value={overview?.totalLeads ?? 0} icon={Users} color="blue" />
          <KPICard label="New Leads" value={overview?.newLeads ?? 0} sub={`in last ${period} days`} icon={TrendingUp} color="green" />
          <KPICard label="Appointments" value={overview?.totalAppointments ?? 0} icon={Calendar} color="purple" />
          <KPICard label="Calls Made" value={overview?.totalCalls ?? 0} icon={Mail} color="amber" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Borrowers" value={overview?.totalBorrowers ?? 0} icon={Users} color="teal" />
          <KPICard label="Converted" value={overview?.convertedLeads ?? 0} icon={DollarSign} color="green" />
          <KPICard label="Team Members" value={overview?.totalUsers ?? 0} icon={Phone} color="blue" />
          <KPICard label="Conversion Rate" value={`${overview?.conversionRate ?? 0}%`} icon={BarChart3} color="purple" />
        </div>

        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="sources">Lead Sources</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Leads by Pipeline Stage</CardTitle></CardHeader>
              <CardContent>
                {stageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stageData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <p>No pipeline data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Lead Sources Distribution</CardTitle></CardHeader>
                <CardContent>
                  {sourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={sourceData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {sourceData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <p>No source data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Source Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sourceData.length > 0 ? sourceData.map((s: any, i: number) => {
                      const total = sourceData.reduce((acc: number, x: any) => acc + x.value, 0);
                      const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                      return (
                        <div key={s.name}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="capitalize">{s.name}</span>
                            <span className="font-medium">{s.value} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                      );
                    }) : <p className="text-muted-foreground text-sm">No data yet</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Campaign Performance</CardTitle></CardHeader>
              <CardContent>
                {(campaignStats?.email?.length || campaignStats?.sms?.length) ? (
                  <div className="space-y-3">
                    {[...(campaignStats?.email || []), ...(campaignStats?.sms || [])].map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{c.type}</p>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center"><p className="font-bold">{c.sent || 0}</p><p className="text-xs text-muted-foreground">Sent</p></div>
                          <div className="text-center"><p className="font-bold">{c.opened || 0}</p><p className="text-xs text-muted-foreground">Opened</p></div>
                          <div className="text-center"><p className="font-bold">{c.clicked || 0}</p><p className="text-xs text-muted-foreground">Clicked</p></div>
                          <div className="text-center">
                            <p className="font-bold">{c.sent > 0 ? `${Math.round((c.opened / c.sent) * 100)}%` : "0%"}</p>
                            <p className="text-xs text-muted-foreground">Open Rate</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <p>No campaign data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
              <CardContent>
                {funnelData.length > 0 ? (
                  <div className="space-y-3">
                    {funnelData.map((stage: any, i: number) => {
                      const maxCount = funnelData[0]?.count || 1;
                      const pct = Math.round((stage.count / maxCount) * 100);
                      return (
                        <div key={stage.stage}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="capitalize font-medium">{stage.stage?.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground">{stage.count} leads ({pct}%)</span>
                          </div>
                          <div className="h-8 bg-muted rounded-lg overflow-hidden">
                            <div
                              className="h-full rounded-lg flex items-center pl-3 text-xs font-medium text-white transition-all"
                              style={{ width: `${Math.max(pct, 5)}%`, background: COLORS[i % COLORS.length] }}
                            >
                              {pct}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <p>No funnel data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
