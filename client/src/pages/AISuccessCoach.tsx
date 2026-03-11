import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";

interface CoachInsight {
  text: React.ReactNode;
}

function buildInsights(stats: any, slaAlerts: any): CoachInsight[] {
  if (!stats) return [];
  const insights: CoachInsight[] = [];

  // 1. New leads needing first contact
  const newLeads = stats.newLeads ?? 0;
  insights.push({
    text: (
      <>
        <strong className="text-foreground">{newLeads}</strong> new lead{newLeads !== 1 ? "s" : ""} need first contact.{" "}
        Speed-to-lead under 5 minutes increases conversion by ~40%.
      </>
    ),
  });

  // 2. Qualified leads
  const qualified = stats.qualified ?? 0;
  insights.push({
    text: (
      <>
        <strong className="text-foreground">{qualified}</strong> qualified lead{qualified !== 1 ? "s" : ""} — prioritize booking calls within 24 hours.
      </>
    ),
  });

  // 3. Closed deals
  const closedWon = stats.closedWon ?? 0;
  insights.push({
    text: (
      <>
        <strong className="text-foreground">{closedWon}</strong> closed deal{closedWon !== 1 ? "s" : ""}.{" "}
        {closedWon === 0
          ? "Consider requesting testimonials to increase trust."
          : "Request testimonials from closed clients to build social proof."}
      </>
    ),
  });

  // 4. Contacted leads follow-up
  const contacted = stats.contacted ?? 0;
  insights.push({
    text: (
      <>
        Follow up with{" "}
        <strong className="text-foreground">{contacted}</strong> &ldquo;Contacted&rdquo; lead{contacted !== 1 ? "s" : ""} after 48 hours if no response.
      </>
    ),
  });

  // 5. Pipeline movement tip
  const appointmentSet = stats.appointmentSet ?? 0;
  insights.push({
    text: (
      <>
        Focus on moving leads from Qualified &rarr; Appointment Set to unlock revenue.{" "}
        <strong className="text-foreground">{appointmentSet}</strong> lead{appointmentSet !== 1 ? "s" : ""} currently in that stage.
      </>
    ),
  });

  // 6. Cold leads from SLA alerts (bonus insight when data exists)
  if (slaAlerts?.coldLeads > 0) {
    insights.push({
      text: (
        <>
          <strong className="text-foreground">{slaAlerts.coldLeads}</strong> cold lead{slaAlerts.coldLeads !== 1 ? "s" : ""} with no activity in 14+ days — re-engage with a rate drop alert or personalized SMS.
        </>
      ),
    });
  }

  // 7. Content approvals pending
  if ((stats.pendingApprovalsCount ?? 0) > 0) {
    insights.push({
      text: (
        <>
          <strong className="text-foreground">{stats.pendingApprovalsCount}</strong> content item{stats.pendingApprovalsCount !== 1 ? "s" : ""} awaiting approval — review to keep your publishing schedule on track.
        </>
      ),
    });
  }

  return insights;
}

export default function AISuccessCoach() {
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.crm.dashboardStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const {
    data: slaAlerts,
    isLoading: slaLoading,
    refetch: refetchSla,
  } = trpc.crm.getSlaAlerts.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const isLoading = statsLoading || slaLoading;
  const insights = buildInsights(stats, slaAlerts);

  function handleGenerate() {
    Promise.all([refetchStats(), refetchSla()]).then(() => {
      setRefreshKey(k => k + 1);
      toast.success("Suggestions refreshed with latest pipeline data");
    });
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              AI Success Coach
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing your pipeline...
              </div>
            ) : (
              <>
                <ul key={refreshKey} className="space-y-3">
                  {insights.map((insight, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
                    >
                      <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>{insight.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate New Suggestions
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
