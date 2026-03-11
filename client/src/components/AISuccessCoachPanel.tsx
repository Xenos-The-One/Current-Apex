import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import React from "react";

interface CoachInsight {
  text: React.ReactNode;
}

function buildInsights(stats: any, slaAlerts: any, context?: string): CoachInsight[] {
  if (!stats) return [];
  const insights: CoachInsight[] = [];

  const newLeads = stats.newLeads ?? 0;
  const qualified = stats.qualified ?? 0;
  const closedWon = stats.closedWon ?? 0;
  const contacted = stats.contacted ?? 0;
  const appointmentSet = stats.appointmentSet ?? 0;

  // Context-aware insights
  if (context === "pipeline") {
    insights.push({ text: (<><strong className="text-foreground">{newLeads}</strong> new lead{newLeads !== 1 ? "s" : ""} in the pipeline — move them to Contacted within 24 hours to maximize conversion.</>) });
    insights.push({ text: (<><strong className="text-foreground">{qualified}</strong> qualified lead{qualified !== 1 ? "s" : ""} ready for appointment booking. Call them today.</>) });
    insights.push({ text: (<>Pipeline has <strong className="text-foreground">{appointmentSet}</strong> appointment{appointmentSet !== 1 ? "s" : ""} set — confirm 24 hours before to reduce no-shows.</>) });
    insights.push({ text: (<>Focus on moving Qualified leads to Appointment Set — this is your highest-leverage stage transition.</>) });
  } else if (context === "followups") {
    insights.push({ text: (<><strong className="text-foreground">{slaAlerts?.newNotContacted ?? 0}</strong> new lead{(slaAlerts?.newNotContacted ?? 0) !== 1 ? "s" : ""} not contacted within 24 hours — speed-to-lead under 5 min increases conversion by ~40%.</>) });
    insights.push({ text: (<><strong className="text-foreground">{slaAlerts?.coldLeads ?? 0}</strong> cold lead{(slaAlerts?.coldLeads ?? 0) !== 1 ? "s" : ""} (14+ days silent) — re-engage with a rate drop alert or personalized SMS.</>) });
    insights.push({ text: (<>Follow up with <strong className="text-foreground">{contacted}</strong> "Contacted" lead{contacted !== 1 ? "s" : ""} after 48 hours if no response.</>) });
    insights.push({ text: (<>No-show recovery calls within 2 hours increase rebooking rates by 60%.</>) });
  } else if (context === "campaigns") {
    insights.push({ text: (<>Target your <strong className="text-foreground">{newLeads}</strong> new lead{newLeads !== 1 ? "s" : ""} with a welcome SMS sequence within the first hour.</>) });
    insights.push({ text: (<><strong className="text-foreground">{contacted}</strong> contacted lead{contacted !== 1 ? "s" : ""} are warm — send a value-add email (rate update, market report) to re-engage.</>) });
    insights.push({ text: (<>Personalized campaigns outperform generic blasts by 3–5×. Use lead name and loan type in subject lines.</>) });
    insights.push({ text: (<>Schedule campaigns for Tuesday–Thursday 9–11am for highest open rates in the mortgage niche.</>) });
  } else if (context === "content") {
    insights.push({ text: (<>Publish content consistently — aim for 3–5 posts per week across platforms to stay top-of-mind.</>) });
    insights.push({ text: (<>Educational content (rate updates, home-buying tips) generates 2× more engagement than promotional posts.</>) });
    insights.push({ text: (<>Repurpose approved blog posts into 3–4 social media snippets to maximize content ROI.</>) });
    if ((stats.pendingApprovalsCount ?? 0) > 0) {
      insights.push({ text: (<><strong className="text-foreground">{stats.pendingApprovalsCount}</strong> content item{stats.pendingApprovalsCount !== 1 ? "s" : ""} pending approval — review to keep your publishing schedule on track.</>) });
    }
  } else if (context === "ads") {
    insights.push({ text: (<>Retarget your <strong className="text-foreground">{qualified}</strong> qualified lead{qualified !== 1 ? "s" : ""} with testimonial ads to accelerate the decision stage.</>) });
    insights.push({ text: (<>Allocate 70% of ad budget to bottom-of-funnel (appointment booking) and 30% to awareness.</>) });
    insights.push({ text: (<>A/B test ad headlines every 2 weeks — small copy changes can improve CTR by 20–40%.</>) });
    insights.push({ text: (<>Video ads showing loan officer expertise convert 2× better than static image ads in the mortgage vertical.</>) });
  } else if (context === "conversations") {
    insights.push({ text: (<>Respond to all inbound messages within 5 minutes — response time is the #1 factor in lead conversion.</>) });
    insights.push({ text: (<><strong className="text-foreground">{newLeads}</strong> new lead{newLeads !== 1 ? "s" : ""} may be waiting for a first reply — check the New filter.</>) });
    insights.push({ text: (<>Use SMS for initial outreach (98% open rate) and email for detailed follow-ups and documents.</>) });
    insights.push({ text: (<>Personalize every message with the lead's name and their specific loan inquiry to increase reply rates.</>) });
  } else {
    // Default dashboard context
    insights.push({ text: (<><strong className="text-foreground">{newLeads}</strong> new lead{newLeads !== 1 ? "s" : ""} need first contact. Speed-to-lead under 5 minutes increases conversion by ~40%.</>) });
    insights.push({ text: (<><strong className="text-foreground">{qualified}</strong> qualified lead{qualified !== 1 ? "s" : ""} — prioritize booking calls within 24 hours.</>) });
    insights.push({ text: (<><strong className="text-foreground">{closedWon}</strong> closed deal{closedWon !== 1 ? "s" : ""}. {closedWon === 0 ? "Consider requesting testimonials to increase trust." : "Request testimonials from closed clients to build social proof."}</>) });
    insights.push({ text: (<>Follow up with <strong className="text-foreground">{contacted}</strong> "Contacted" lead{contacted !== 1 ? "s" : ""} after 48 hours if no response.</>) });
    insights.push({ text: (<>Focus on moving leads from Qualified → Appointment Set to unlock revenue. <strong className="text-foreground">{appointmentSet}</strong> lead{appointmentSet !== 1 ? "s" : ""} currently in that stage.</>) });
    if (slaAlerts?.coldLeads > 0) {
      insights.push({ text: (<><strong className="text-foreground">{slaAlerts.coldLeads}</strong> cold lead{slaAlerts.coldLeads !== 1 ? "s" : ""} with no activity in 14+ days — re-engage with a rate drop alert or personalized SMS.</>) });
    }
  }

  return insights;
}

interface AISuccessCoachPanelProps {
  /** Optional context to customize the insights shown */
  context?: "pipeline" | "followups" | "campaigns" | "content" | "ads" | "conversations" | "dashboard";
  className?: string;
}

export default function AISuccessCoachPanel({ context = "dashboard", className }: AISuccessCoachPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.crm.dashboardStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: slaAlerts, isLoading: slaLoading, refetch: refetchSla } = trpc.crm.getSlaAlerts.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const isLoading = statsLoading || slaLoading;
  const insights = buildInsights(stats, slaAlerts, context);

  function handleGenerate() {
    Promise.all([refetchStats(), refetchSla()]).then(() => {
      setRefreshKey(k => k + 1);
      toast.success("Suggestions refreshed with latest pipeline data");
    });
  }

  return (
    <Card className={className}>
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
            <Button className="w-full" size="sm" onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Generating...</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5 mr-2" />Generate New Suggestions</>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
