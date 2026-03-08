import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { TrendingUp, TrendingDown, Users, Phone, Calendar, CheckCircle, FlaskConical, Plus } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ConversionDashboard() {
  const { data: stats, isLoading } = trpc.analytics.conversionFunnel.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Conversion Funnel</h1>
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  const calculateRate = (numerator: number, denominator: number) => {
    if (denominator === 0) return 0;
    return ((numerator / denominator) * 100).toFixed(1);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Conversion Funnel Analytics</h1>
        
        {/* Funnel Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Leads</h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold">{stats?.totalLeads || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">All lead sources</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Calls Made</h3>
              <Phone className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold">{stats?.callsMade || 0}</p>
            <p className="text-xs text-green-600 mt-1">
              {calculateRate(stats?.callsMade || 0, stats?.totalLeads || 0)}% of leads
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Appointments Booked</h3>
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold">{stats?.appointmentsBooked || 0}</p>
            <p className="text-xs text-green-600 mt-1">
              {calculateRate(stats?.appointmentsBooked || 0, stats?.callsMade || 0)}% of calls
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Show Rate</h3>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold">{calculateRate(stats?.appointmentsCompleted || 0, stats?.appointmentsBooked || 0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.appointmentsCompleted || 0} / {stats?.appointmentsBooked || 0} showed
            </p>
          </Card>
        </div>

        {/* Webinar Funnel */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Webinar Conversion Funnel</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Webinar Signups</h3>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{stats?.webinarSignups || 0}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Attendance Rate</h3>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold">
                {calculateRate(stats?.webinarAttendees || 0, stats?.webinarSignups || 0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.webinarAttendees || 0} attended
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Webinar → Appointment</h3>
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold">
                {calculateRate(stats?.webinarToAppointment || 0, stats?.webinarAttendees || 0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.webinarToAppointment || 0} booked
              </p>
            </div>
          </div>
        </Card>

        {/* Source Breakdown */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Lead Source Performance</h2>
          <div className="space-y-4">
            {stats?.sourceBreakdown?.map((source: any) => (
              <div key={source.source} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">{source.source}</p>
                  <p className="text-sm text-muted-foreground">{source.count} leads</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {calculateRate(source.appointmentsBooked, source.count)}% conversion
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {source.appointmentsBooked} appointments
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* A/B Testing Panel */}
        <AbTestingPanel />
      </div>
    </DashboardLayout>
  );
}

function AbTestingPanel() {
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [testName, setTestName] = useState("");
  const createTest = trpc.seoBridge.createAbTest.useMutation({
    onSuccess: () => {
      toast.success("A/B test created in SEO portal!");
      setVariantA(""); setVariantB(""); setTestName("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <FlaskConical className="w-5 h-5" />
          A/B Test Funnel Copy
        </CardTitle>
        <CardDescription>
          Test two versions of landing page or ad copy. Results tracked in the SEO portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Test name (e.g. Headline Test)" value={testName} onChange={(e) => setTestName(e.target.value)} />
          <Input placeholder="Variant A copy" value={variantA} onChange={(e) => setVariantA(e.target.value)} />
          <Input placeholder="Variant B copy" value={variantB} onChange={(e) => setVariantB(e.target.value)} />
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={!testName || !variantA || !variantB || createTest.isPending}
            onClick={() => createTest.mutate({ testName, variantA, variantB })}
          >
            <Plus className="w-4 h-4 mr-1" />
            {createTest.isPending ? "Creating..." : "Create A/B Test"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/seo/ab-testing" target="_blank" rel="noopener noreferrer">View All Tests</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
