import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  PieChart as PieIcon,
  BarChart3,
  MapPin,
  Clock,
  Award,
  Activity,
} from "lucide-react";

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#1d4ed8",
];

const FUNNEL_COLORS = [
  "#6366f1", "#7c3aed", "#8b5cf6", "#a855f7", "#c084fc",
  "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#ef4444", "#94a3b8", "#64748b",
];

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatNumber(val: number): string {
  return new Intl.NumberFormat("en-US").format(val);
}

export default function MarketAnalytics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const dateInput = useMemo(() => ({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [startDate, endDate]);

  const { data: summary } = trpc.marketAnalytics.summary.useQuery(dateInput);
  const { data: funnel } = trpc.marketAnalytics.pipelineFunnel.useQuery(dateInput);
  const { data: loanTypes } = trpc.marketAnalytics.loanTypeDistribution.useQuery(dateInput);
  const { data: creditScores } = trpc.marketAnalytics.creditScoreDistribution.useQuery(dateInput);
  const { data: geo } = trpc.marketAnalytics.geographicDistribution.useQuery(dateInput);
  const { data: loanAmounts } = trpc.marketAnalytics.loanAmountDistribution.useQuery(dateInput);
  const { data: leadSources } = trpc.marketAnalytics.leadSourcePerformance.useQuery(dateInput);
  const { data: propertyTypes } = trpc.marketAnalytics.propertyTypeDistribution.useQuery(dateInput);
  const { data: timelines } = trpc.marketAnalytics.timelineDistribution.useQuery(dateInput);
  const { data: loPerf } = trpc.marketAnalytics.loPerformance.useQuery(dateInput);

  // Filter out zero-count items for charts
  const activeFunnel = funnel?.filter(f => f.count > 0) || [];
  const activeLoanTypes = loanTypes?.filter(l => l.count > 0) || [];
  const activeCreditScores = creditScores?.filter(c => c.count > 0) || [];
  const activePropertyTypes = propertyTypes?.filter(p => p.count > 0) || [];
  const activeTimelines = timelines?.filter(t => t.count > 0) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Market Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Aggregate borrower data across all loan officers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Borrowers</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(summary.totalBorrowers)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Active Pipeline</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(summary.activePipeline)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Total Volume</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(summary.totalLoanVolume)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Closed/Funded</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(summary.closedFunded)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-muted-foreground">Conversion Rate</span>
                </div>
                <p className="text-2xl font-bold">{summary.conversionRate}%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Row 1: Pipeline Funnel + Loan Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Pipeline Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeFunnel.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  No borrower data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activeFunnel} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [value, "Borrowers"]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {activeFunnel.map((_, i) => (
                        <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieIcon className="h-4 w-4" /> Loan Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeLoanTypes.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  No loan type data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activeLoanTypes}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    >
                      {activeLoanTypes.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Credit Score + Loan Amount */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Credit Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {activeCreditScores.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No credit score data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={creditScores} margin={{ bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [value, "Borrowers"]} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Loan Amount Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {(loanAmounts?.filter(l => l.count > 0) || []).length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No loan amount data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={loanAmounts} margin={{ bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [value, "Borrowers"]} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Property Type + Purchase Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Property Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {activePropertyTypes.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No property type data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={activePropertyTypes}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    >
                      {activePropertyTypes.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" /> Purchase Timeline / Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTimelines.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No timeline data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={activeTimelines}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [value, "Borrowers"]} />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Geographic + Lead Source */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Geographic Distribution (Top States)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(geo || []).length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No geographic data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={geo} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="state" width={50} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "totalVolume") return [formatCurrency(value), "Volume"];
                        return [value, "Borrowers"];
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Lead Source Performance</CardTitle>
            </CardHeader>
            {(leadSources || []).length === 0 ? (
              <CardContent className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No lead source data yet
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Closed</TableHead>
                      <TableHead className="text-right">Conv %</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(leadSources || []).map((s) => (
                      <TableRow key={s.source}>
                        <TableCell className="font-medium text-sm">{s.label}</TableCell>
                        <TableCell className="text-right">{s.total}</TableCell>
                        <TableCell className="text-right">{s.closedFunded}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={s.conversionRate > 20 ? "default" : "outline"} className="text-xs">
                            {s.conversionRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(s.totalVolume)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        {/* Row 5: LO Performance */}
        {(loPerf || []).length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4" /> Loan Officer Performance
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan Officer</TableHead>
                    <TableHead className="text-right">Total Borrowers</TableHead>
                    <TableHead className="text-right">Closed/Funded</TableHead>
                    <TableHead className="text-right">Conv Rate</TableHead>
                    <TableHead className="text-right">Total Volume</TableHead>
                    <TableHead className="text-right">Closed Volume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(loPerf || []).map((lo) => (
                    <TableRow key={lo.clientId}>
                      <TableCell className="font-medium">{lo.name}</TableCell>
                      <TableCell className="text-right">{lo.total}</TableCell>
                      <TableCell className="text-right">{lo.closedFunded}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={lo.conversionRate > 20 ? "default" : "outline"} className="text-xs">
                          {lo.conversionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(lo.totalVolume)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(lo.closedVolume)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
