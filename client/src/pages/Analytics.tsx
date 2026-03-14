import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Target, Mail, MessageSquare, Activity } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Analytics() {
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});

  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getOverviewMetrics.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { data: sourcePerformance = [], isLoading: sourceLoading } = trpc.analytics.getLeadSourcePerformance.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { data: campaignPerformance, isLoading: campaignLoading } = trpc.analytics.getCampaignPerformance.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  if (overviewLoading || sourceLoading || campaignLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const statusData = overview?.leadsByStatus.map((s: any) => ({
    name: s.status.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
    value: s.count,
  })) || [];

  const conversionFunnelData = [
    { stage: "New Leads", count: overview?.leadsByStatus.find((s: any) => s.status === "new")?.count || 0, rate: 100 },
    { stage: "Contacted", count: overview?.leadsByStatus.find((s: any) => s.status === "contacted")?.count || 0, rate: overview?.conversionRates.newToContacted || 0 },
    { stage: "Qualified", count: overview?.leadsByStatus.find((s: any) => s.status === "qualified")?.count || 0, rate: overview?.conversionRates.contactedToQualified || 0 },
    { stage: "Appointment", count: overview?.leadsByStatus.find((s: any) => s.status === "appointment_set")?.count || 0, rate: overview?.conversionRates.qualifiedToAppointment || 0 },
    { stage: "Closed Won", count: overview?.leadsByStatus.find((s: any) => s.status === "closed_won")?.count || 0, rate: overview?.conversionRates.appointmentToClosed || 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track performance metrics and conversion rates</p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 grid-cols-2 analytics-kpi-grid">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totalLeads || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Conversion</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.conversionRates.overallConversion.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Lead to closed won</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email Open Rate</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignPerformance?.email.openRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{campaignPerformance?.email.totalSent} emails sent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SMS Delivery Rate</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignPerformance?.sms.deliveryRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{campaignPerformance?.sms.totalSent} SMS sent</p>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Lead Conversion Funnel
            </CardTitle>
            <CardDescription>Track how leads progress through your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Lead Count" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-5 gap-2 text-center">
              {conversionFunnelData.map((stage, index) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="text-sm font-medium">{stage.stage}</div>
                  <div className="text-2xl font-bold">{stage.count}</div>
                  {index > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {stage.rate.toFixed(1)}% conversion
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Lead Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Status Distribution</CardTitle>
              <CardDescription>Current pipeline breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead Source Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Source Performance</CardTitle>
              <CardDescription>Conversion rates by source</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sourcePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#3b82f6" name="Total Leads" />
                  <Bar dataKey="closedWon" fill="#10b981" name="Closed Won" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {sourcePerformance.map((source: any) => (
                  <div key={source.source} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{source.source}</span>
                    <div className="flex gap-4 text-muted-foreground">
                      <span>{source.total} leads</span>
                      <span className="text-green-600 font-medium">
                        {source.conversionRate.toFixed(1)}% conversion
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Performance */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Campaign Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Campaigns</div>
                  <div className="text-2xl font-bold">{campaignPerformance?.email.totalCampaigns}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Emails Sent</div>
                  <div className="text-2xl font-bold">{campaignPerformance?.email.totalSent}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Open Rate</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {campaignPerformance?.email.openRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Click Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {campaignPerformance?.email.clickRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SMS Campaign Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Campaigns</div>
                  <div className="text-2xl font-bold">{campaignPerformance?.sms.totalCampaigns}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">SMS Sent</div>
                  <div className="text-2xl font-bold">{campaignPerformance?.sms.totalSent}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Delivery Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {campaignPerformance?.sms.deliveryRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Failure Rate</div>
                  <div className="text-2xl font-bold text-red-600">
                    {campaignPerformance?.sms.failureRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
