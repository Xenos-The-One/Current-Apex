import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Calendar, DollarSign, Phone, Mail, Target, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

import DashboardLayout from "@/components/DashboardLayout";
export default function MetricsDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Only allow Tariq and Tim (admin users) to access
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "super_admin"))) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  const { data: metrics, isLoading } = trpc.metrics.getDashboard.useQuery(undefined, {
    enabled: !!user && (user.role === "admin" || user.role === "super_admin"),
  });

  if (loading || isLoading) {
    return (
      <DashboardLayout>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    </DashboardLayout>
  );
  }

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null;
  }

  const stats = [
    {
      title: "Total Leads",
      value: metrics?.totalLeads || 0,
      icon: Users,
      description: "All-time leads in system",
      trend: "+12% from last month",
    },
    {
      title: "Appointments Booked",
      value: metrics?.appointmentsBooked || 0,
      icon: Calendar,
      description: "This month",
      trend: "+8% from last month",
    },
    {
      title: "Show Rate",
      value: `${metrics?.showRate || 0}%`,
      icon: Target,
      description: "Appointments attended",
      trend: metrics?.showRate && metrics.showRate > 75 ? "Above target" : "Below target",
    },
    {
      title: "Conversion Rate",
      value: `${metrics?.conversionRate || 0}%`,
      icon: TrendingUp,
      description: "Leads to appointments",
      trend: "+5% from last month",
    },
    {
      title: "Revenue Generated",
      value: `$${(metrics?.revenueGenerated || 0).toLocaleString()}`,
      icon: DollarSign,
      description: "This month",
      trend: "+15% from last month",
    },
    {
      title: "Calls Made",
      value: metrics?.callsMade || 0,
      icon: Phone,
      description: "Vapi AI calls this month",
      trend: `${metrics?.answerRate || 0}% answer rate`,
    },
    {
      title: "Emails Sent",
      value: metrics?.emailsSent || 0,
      icon: Mail,
      description: "Campaign emails this month",
      trend: `${metrics?.emailOpenRate || 0}% open rate`,
    },
    {
      title: "Hot Leads",
      value: metrics?.hotLeads || 0,
      icon: TrendingUp,
      description: "Score 80+ (High priority)",
      trend: "Requires immediate follow-up",
    },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation("/dashboard")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </button>
              <div className="border-l border-border pl-4">
                <h1 className="text-2xl font-bold">Metrics Dashboard</h1>
                <p className="text-sm text-muted-foreground">Real-time performance tracking for Tim's team</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Admin Access</div>
              <div className="text-sm font-medium">{user.name}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Metrics Grid */}
      <section className="py-8">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    <p className="text-xs text-primary mt-2">{stat.trend}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Daily Activity */}
      <section className="py-8">
        <div className="container">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
              <CardDescription>Track daily lead generation and conversion metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.dailyActivity && metrics.dailyActivity.length > 0 ? (
                  metrics.dailyActivity.map((day: any, index: number) => (
                    <div key={index} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                      <div>
                        <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {day.leadsAdded} leads added • {day.appointmentsBooked} appointments
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-primary">{day.conversionRate}% conversion</div>
                        <div className="text-xs text-muted-foreground">{day.callsMade} calls made</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity data available yet. Start adding leads to see daily metrics.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Lead Sources Performance */}
      <section className="py-8">
        <div className="container">
          <Card>
            <CardHeader>
              <CardTitle>Lead Source Performance</CardTitle>
              <CardDescription>Compare conversion rates across different lead sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.leadSources && metrics.leadSources.length > 0 ? (
                  metrics.leadSources.map((source: any, index: number) => (
                    <div key={index} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                      <div>
                        <div className="font-medium capitalize">{source.source}</div>
                        <div className="text-sm text-muted-foreground">{source.totalLeads} leads</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-primary">{source.conversionRate}% conversion</div>
                        <div className="text-xs text-muted-foreground">{source.appointmentsBooked} appointments</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No lead source data available yet. Import leads from different sources to see performance comparison.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-8 pb-16">
        <div className="container">
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle>30-Day ROI Projection</CardTitle>
              <CardDescription>Based on current performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">CRM Cost</div>
                  <div className="text-2xl font-bold">$2,000/mo</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Revenue Generated</div>
                  <div className="text-2xl font-bold text-success">${(metrics?.revenueGenerated || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Net ROI</div>
                  <div className="text-2xl font-bold text-primary">
                    {metrics?.revenueGenerated ? `${((metrics.revenueGenerated / 2000 - 1) * 100).toFixed(0)}%` : "0%"}
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Calculation:</strong> At {metrics?.conversionRate || 0}% conversion rate with {metrics?.appointmentsBooked || 0} appointments booked, 
                  assuming a 20% close rate and $3,000 average commission per closed loan, you're generating ${(metrics?.revenueGenerated || 0).toLocaleString()} in revenue.
                  That's a {metrics?.revenueGenerated ? `${((metrics.revenueGenerated / 2000 - 1) * 100).toFixed(0)}%` : "0%"} return on your $2,000/month CRM investment.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
    </DashboardLayout>
  );
}
