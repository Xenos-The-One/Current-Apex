import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
} from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "ytd" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "ytd": "Year to Date",
  "all": "All Time",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  appointment_set: "Appt. Set",
  appointment_completed: "Appt. Done",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-amber-500",
  qualified: "bg-purple-500",
  appointment_set: "bg-indigo-500",
  appointment_completed: "bg-teal-500",
  closed_won: "bg-emerald-500",
  closed_lost: "bg-red-500",
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  purchase: "Purchase",
  refinance: "Refinance",
  heloc: "HELOC",
  reverse_mortgage: "Reverse Mortgage",
  construction: "Construction",
  other: "Other",
};

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AdvancedReports() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const { data, isLoading, refetch } = trpc.publicFeatures.getAdvancedReports.useQuery(
    { dateRange },
    { refetchOnWindowFocus: false }
  );

  const maxSource = Math.max(...(data?.sourceBreakdown.map(s => s.total) || [1]));
  const maxDailyVolume = Math.max(...(data?.dailyVolume.map(d => d.count) || [1]));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Advanced Reports
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Source ROI, funnel performance, and pipeline analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DATE_RANGE_LABELS) as [DateRange, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-5 pb-4">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-8 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Leads",
                  value: data.totalLeads.toLocaleString(),
                  icon: Users,
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                },
                {
                  label: "Appointments",
                  value: data.totalAppointments.toLocaleString(),
                  icon: Calendar,
                  color: "text-indigo-500",
                  bg: "bg-indigo-500/10",
                  sub: `${data.appointmentRate}% of leads`,
                },
                {
                  label: "Closed Won",
                  value: data.closedWon.toLocaleString(),
                  icon: CheckCircle2,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10",
                  sub: `${data.conversionRate}% conversion`,
                },
                {
                  label: "Loan Volume",
                  value: formatCurrency(data.closedLoanVolume),
                  icon: DollarSign,
                  color: "text-teal-500",
                  bg: "bg-teal-500/10",
                  sub: `~${formatCurrency(data.estimatedRevenue)} est. commission`,
                },
              ].map(kpi => (
                <Card key={kpi.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className={`h-9 w-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    {kpi.sub && <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Funnel + Daily Volume */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Conversion Funnel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Conversion Funnel
                  </CardTitle>
                  <CardDescription>{DATE_RANGE_LABELS[dateRange]}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Leads Captured", value: data.funnel.leads, color: "bg-blue-500" },
                    { label: "Contacted", value: data.funnel.contacted, color: "bg-amber-500" },
                    { label: "Qualified", value: data.funnel.qualified, color: "bg-purple-500" },
                    { label: "Appointments Set", value: data.funnel.appointmentsSet, color: "bg-indigo-500" },
                    { label: "Closed Won", value: data.funnel.closedWon, color: "bg-emerald-500" },
                  ].map((stage, i, arr) => {
                    const pct = arr[0].value > 0 ? Math.round((stage.value / arr[0].value) * 100) : 0;
                    return (
                      <div key={stage.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{stage.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{stage.value.toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs">{pct}%</Badge>
                          </div>
                        </div>
                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stage.color} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Daily Volume Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Daily Lead Volume
                  </CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.dailyVolume.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                      No data for this period
                    </div>
                  ) : (
                    <div className="flex items-end gap-0.5 h-40">
                      {data.dailyVolume.map(d => {
                        const height = maxDailyVolume > 0 ? Math.max(4, (d.count / maxDailyVolume) * 140) : 4;
                        const date = new Date(d.date);
                        return (
                          <div
                            key={d.date}
                            className="flex-1 group relative"
                            title={`${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${d.count} leads`}
                          >
                            <div
                              className="w-full bg-primary/60 hover:bg-primary rounded-t transition-all cursor-pointer"
                              style={{ height: `${height}px` }}
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover border rounded px-1.5 py-0.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                              {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: {d.count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Source ROI Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Lead Source ROI
                </CardTitle>
                <CardDescription>Which sources are converting best</CardDescription>
              </CardHeader>
              <CardContent>
                {data.sourceBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No source data available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-xs">
                          <th className="text-left py-2 pr-4 font-medium">Source</th>
                          <th className="text-right py-2 px-2 font-medium">Leads</th>
                          <th className="text-right py-2 px-2 font-medium">Appts</th>
                          <th className="text-right py-2 px-2 font-medium">Closed</th>
                          <th className="text-right py-2 px-2 font-medium">Conv %</th>
                          <th className="text-right py-2 pl-2 font-medium">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.sourceBreakdown.map(source => (
                          <tr key={source.source} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{source.source.replace(/_/g, " ")}</span>
                                {source.conversionRate >= 20 && (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1">
                                    <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />Top
                                  </Badge>
                                )}
                              </div>
                              <MiniBar value={source.total} max={maxSource} color="bg-primary/50" />
                            </td>
                            <td className="text-right py-3 px-2 font-mono">{source.total}</td>
                            <td className="text-right py-3 px-2 font-mono">{source.appointmentsSet}</td>
                            <td className="text-right py-3 px-2 font-mono text-emerald-600 dark:text-emerald-400">{source.closedWon}</td>
                            <td className="text-right py-3 px-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${source.conversionRate >= 20 ? "border-emerald-500 text-emerald-600" : source.conversionRate >= 10 ? "border-amber-500 text-amber-600" : ""}`}
                              >
                                {source.conversionRate}%
                              </Badge>
                            </td>
                            <td className="text-right py-3 pl-2 font-mono text-teal-600 dark:text-teal-400">
                              {source.totalLoanVolume > 0 ? formatCurrency(source.totalLoanVolume) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status + Loan Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pipeline Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.statusBreakdown.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No data</p>
                  ) : (
                    data.statusBreakdown
                      .sort((a, b) => b.count - a.count)
                      .map(s => {
                        const pct = data.totalLeads > 0 ? Math.round((s.count / data.totalLeads) * 100) : 0;
                        return (
                          <div key={s.status} className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[s.status] || "bg-gray-400"}`} />
                            <span className="text-sm flex-1">{STATUS_LABELS[s.status] || s.status}</span>
                            <span className="text-sm font-mono text-muted-foreground">{s.count}</span>
                            <div className="w-20">
                              <MiniBar value={s.count} max={data.totalLeads} color={STATUS_COLORS[s.status] || "bg-gray-400"} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                          </div>
                        );
                      })
                  )}
                </CardContent>
              </Card>

              {/* Loan Type Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Loan Type Mix</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.loanTypeBreakdown.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No loan type data yet</p>
                  ) : (
                    (() => {
                      const maxLoan = Math.max(...data.loanTypeBreakdown.map(l => l.count));
                      return data.loanTypeBreakdown
                        .sort((a, b) => b.count - a.count)
                        .map(l => (
                          <div key={l.type} className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-primary/60 flex-shrink-0" />
                            <span className="text-sm flex-1">{LOAN_TYPE_LABELS[l.type] || l.type}</span>
                            <span className="text-sm font-mono text-muted-foreground">{l.count}</span>
                            <div className="w-20">
                              <MiniBar value={l.count} max={maxLoan} color="bg-primary/60" />
                            </div>
                          </div>
                        ));
                    })()
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Score Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Lead Quality Distribution
                </CardTitle>
                <CardDescription>Based on AI lead scoring (Hot / Warm / Cold)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { tier: "hot", label: "Hot Leads", color: "text-red-500", bg: "bg-red-500/10", barColor: "bg-red-500" },
                    { tier: "warm", label: "Warm Leads", color: "text-amber-500", bg: "bg-amber-500/10", barColor: "bg-amber-500" },
                    { tier: "cold", label: "Cold Leads", color: "text-blue-500", bg: "bg-blue-500/10", barColor: "bg-blue-500" },
                  ].map(tier => {
                    const found = data.scoreDistribution.find(s => s.tier === tier.tier);
                    const count = found?.count || 0;
                    const pct = data.totalLeads > 0 ? Math.round((count / data.totalLeads) * 100) : 0;
                    return (
                      <div key={tier.tier} className={`rounded-xl p-4 ${tier.bg}`}>
                        <p className={`text-2xl font-bold ${tier.color}`}>{count}</p>
                        <p className="text-sm text-muted-foreground">{tier.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{pct}% of total</p>
                        <div className="mt-2">
                          <MiniBar value={count} max={data.totalLeads} color={tier.barColor} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No report data available. Add leads to see analytics.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
