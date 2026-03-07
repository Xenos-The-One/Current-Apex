import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  Phone,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STAGE_COLORS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#8b5cf6",
  qualified: "#f59e0b",
  proposal: "#ec4899",
  negotiation: "#14b8a6",
  closed_won: "#22c55e",
  closed_lost: "#ef4444",
};

const SOURCE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#22c55e", "#ef4444"];

function StatCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ComponentType<{ className?: string }>; trend?: number; color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600", orange: "bg-orange-50 text-orange-600",
    teal: "bg-teal-50 text-teal-600",
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 font-display">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          <TrendingUp className={`w-3.5 h-3.5 ${trend >= 0 ? "text-green-500" : "text-red-500"}`} />
          <span className={`text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend >= 0 ? "+" : ""}{trend}% vs last month
          </span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;
  const [dateRange] = useState(() => ({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  }));

  const { data: analytics, isLoading } = trpc.analytics.getDashboard.useQuery({ agencyId, ...dateRange });
  const { data: funnel } = trpc.analytics.getFunnel.useQuery({ agencyId });
  const { data: upcomingAppts } = trpc.appointments.upcoming.useQuery({ agencyId, limit: 5 });

  const funnelData = useMemo(() => {
    if (!funnel) return [];
    return funnel.map(f => ({ ...f, fill: STAGE_COLORS[f.stage] || "#3b82f6" }));
  }, [funnel]);

  const sourceData = useMemo(() => {
    if (!analytics?.sourceBreakdown) return [];
    return analytics.sourceBreakdown.map((s, i) => ({
      name: s.source?.replace(/_/g, " ") || "unknown",
      value: s.count,
      fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
    }));
  }, [analytics]);

  // Mock trend data for area chart
  const trendData = useMemo(() => {
    const days = 14;
    return Array.from({ length: days }, (_, i) => ({
      day: `Day ${i + 1}`,
      leads: Math.floor(Math.random() * 8) + 2,
      conversions: Math.floor(Math.random() * 3),
    }));
  }, []);

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
              {user?.name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Here's what's happening with your pipeline today.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pipeline">
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-1.5" /> View Pipeline
              </Button>
            </Link>
            <Link href="/pipeline">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Add Lead
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-8 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Leads" value={analytics?.kpis.totalLeads ?? 0} icon={Users} color="blue" trend={12} />
            <StatCard title="New This Month" value={analytics?.kpis.newLeads ?? 0} subtitle="Last 30 days" icon={TrendingUp} color="green" trend={8} />
            <StatCard title="Converted" value={analytics?.kpis.convertedLeads ?? 0} subtitle={`${analytics?.kpis.conversionRate ?? 0}% conversion rate`} icon={ArrowUpRight} color="purple" trend={5} />
            <StatCard title="Borrowers" value={analytics?.kpis.totalBorrowers ?? 0} icon={Users} color="teal" />
            <StatCard title="Appointments" value={analytics?.kpis.totalAppointments ?? 0} subtitle="This month" icon={Calendar} color="orange" />
            <StatCard title="Calls Made" value={analytics?.kpis.totalCalls ?? 0} subtitle="This month" icon={Phone} color="blue" />
            <StatCard title="Team Members" value={analytics?.kpis.totalUsers ?? 0} icon={Users} color="purple" />
            <StatCard title="Conversion Rate" value={`${analytics?.kpis.conversionRate ?? 0}%`} icon={BarChart3} color="green" trend={3} />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lead Trend */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Lead Activity (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="url(#leadsGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="conversions" stroke="#22c55e" fill="none" strokeWidth={2} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead Sources */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Lead Sources</CardTitle>
            </CardHeader>
            <CardContent>
              {sourceData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                        {sourceData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, "Leads"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {sourceData.slice(0, 4).map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
                          <span className="text-muted-foreground capitalize">{s.name}</span>
                        </div>
                        <span className="font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Funnel + Upcoming Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Pipeline Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90}
                      tickFormatter={v => v.replace(/_/g, " ")} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No pipeline data</div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Upcoming Appointments</CardTitle>
              <Link href="/appointments">
                <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingAppts?.length ? (
                <div className="space-y-2">
                  {upcomingAppts.map(appt => (
                    <div key={appt.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{appt.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appt.startAt).toLocaleDateString()} at {new Date(appt.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{appt.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Calendar className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No upcoming appointments</p>
                  <Link href="/appointments">
                    <Button size="sm" variant="outline">Schedule one</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </CRMLayout>
  );
}
