import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { FileText, Calendar, TrendingUp, CheckSquare, Send, Sparkles } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function PortalDashboard() {
  const { user } = useAuth();
  const { data: contentList } = trpc.seo.content.listForPortal.useQuery(undefined, { enabled: !!user });
  const { data: pendingApprovals } = trpc.contentApprovals.listPending.useQuery({}, { enabled: !!user });
  const totalContent = contentList?.length ?? 0;
  const pendingCount = pendingApprovals?.length ?? 0;

  return (
    <PortalLayout activePath="/seo/portal/dashboard">
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Welcome back, {user?.name}</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(0,255,255,0.5)" }}>
          Here's an overview of your content and activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6" style={{ backgroundColor: "rgba(2,18,20,0.8)", borderColor: "rgba(0,255,255,0.12)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Content</p>
              <p className="text-3xl font-bold mt-2 text-white">{totalContent}</p>
            </div>
            <FileText className="h-12 w-12" style={{ color: "#00FFFF" }} />
          </div>
        </Card>

        <Card className="p-6" style={{ backgroundColor: "rgba(2,18,20,0.8)", borderColor: "rgba(0,255,255,0.12)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              <p className="text-3xl font-bold mt-2 text-white">{pendingCount}</p>
            </div>
            <Calendar className="h-12 w-12 text-orange-400" />
          </div>
        </Card>

        <Card className="p-6" style={{ backgroundColor: "rgba(2,18,20,0.8)", borderColor: "rgba(0,255,255,0.12)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Views</p>
              <p className="text-3xl font-bold mt-2 text-white">0</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-400" />
          </div>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { href: "/seo/portal/apex-content", icon: CheckSquare, label: "Apex Content", desc: "Review approvals and manage all your published content" },
          { href: "/seo/portal/calendar", icon: Calendar, label: "Content Calendar", desc: "See your content schedule and upcoming posts" },
          { href: "/seo/portal/performance", icon: TrendingUp, label: "Performance", desc: "Track views, engagement, and content performance" },
          { href: "/seo/portal/publishing", icon: Send, label: "Publishing", desc: "Publish or schedule approved content to your platforms" },
          { href: "/seo/portal/follow-ups", icon: Sparkles, label: "Follow-Ups", desc: "AI-prioritized leads that need your attention today" },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <a className="block group">
              <Card
                className="p-6 transition-all cursor-pointer"
                style={{
                  backgroundColor: "rgba(2,18,20,0.8)",
                  borderColor: "rgba(0,255,255,0.12)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,255,0.35)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(0,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,255,0.12)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <Icon className="h-10 w-10 mb-4" style={{ color: "#00FFFF" }} />
                <h3 className="text-lg font-semibold mb-1 text-white">{label}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </Card>
            </a>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="p-6 mt-8" style={{ backgroundColor: "rgba(2,18,20,0.8)", borderColor: "rgba(0,255,255,0.12)" }}>
        <h3 className="text-lg font-semibold mb-4 text-white">Recent Activity</h3>
        <div className="text-center py-12 text-muted-foreground">
          <p>No recent activity</p>
          <p className="text-sm mt-2">Activity will appear here as content is created and updated</p>
        </div>
      </Card>
    </PortalLayout>
  );
}
