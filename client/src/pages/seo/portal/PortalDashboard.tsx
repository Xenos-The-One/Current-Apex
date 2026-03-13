import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { FileText, Calendar, TrendingUp, CheckSquare, Send, Sparkles, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

function statusIcon(status: string) {
  switch (status) {
    case "approved": return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "rejected": return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    case "revised": return <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />;
    default: return <Clock className="h-4 w-4 text-orange-500 shrink-0" />;
  }
}

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    approved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    revised: "bg-yellow-100 text-yellow-700 border-yellow-200",
    pending: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${variants[status] ?? variants.pending}`}>
      {status}
    </span>
  );
}

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

export default function PortalDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: contentList } = trpc.seo.content.listForPortal.useQuery(undefined, { enabled: !!user });
  const { data: pendingApprovals } = trpc.contentApprovals.listPending.useQuery({}, { enabled: !!user });
  const { data: recentActivity, isLoading: activityLoading } = trpc.contentApprovals.recentActivity.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60000,
  });
  const totalContent = contentList?.length ?? 0;
  const pendingCount = pendingApprovals?.length ?? 0;

  return (
    <PortalLayout activePath="/seo/portal/dashboard">
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Welcome back, {user?.name}</h2>
        <p className="text-sm mt-1 text-muted-foreground">
          Here's an overview of your content and activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Content</p>
              <p className="text-3xl font-bold mt-2">{totalContent}</p>
            </div>
            <FileText className="h-12 w-12 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              <p className="text-3xl font-bold mt-2">{pendingCount}</p>
            </div>
            <Calendar className="h-12 w-12 text-orange-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Views</p>
              <p className="text-3xl font-bold mt-2">0</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-400" />
          </div>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { path: "/seo/portal/apex-content", icon: CheckSquare, label: "Apex Content", desc: "Review approvals and manage all your published content" },
          { path: "/seo/portal/calendar", icon: Calendar, label: "Content Calendar", desc: "See your content schedule and upcoming posts" },
          { path: "/seo/portal/performance", icon: TrendingUp, label: "Performance", desc: "Track views, engagement, and content performance" },
          { path: "/seo/portal/publishing", icon: Send, label: "Publishing", desc: "Publish or schedule approved content to your platforms" },
          { path: "/seo/portal/follow-ups", icon: Sparkles, label: "Follow-Ups", desc: "AI-prioritized leads that need your attention today" },
        ].map(({ path, icon: Icon, label, desc }) => (
          <Card
            key={path}
            className="p-6 transition-all cursor-pointer hover:shadow-md hover:border-primary/30"
            onClick={() => setLocation(path)}
          >
            <Icon className="h-10 w-10 mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-1">{label}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <button
            onClick={() => setLocation("/seo/portal/apex-content")}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </button>
        </div>

        {activityLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg animate-pulse bg-muted" />
            ))}
          </div>
        ) : !recentActivity || recentActivity.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No recent activity</p>
            <p className="text-sm mt-2">Activity will appear here as content is created and updated</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                onClick={() => setLocation("/seo/portal/apex-content")}
                className="flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted"
              >
                {statusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {item.contentType.replace("_", " ")}
                    {item.brand ? ` · ${item.brand}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(item.status)}
                  <span className="text-xs text-muted-foreground">{timeAgo(item.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PortalLayout>
  );
}
