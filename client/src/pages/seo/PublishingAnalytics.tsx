import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Globe, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PublishingAnalytics() {
  const { data: stats } = trpc.seo.publishingAnalytics.getOverallStats.useQuery();
  const { data: topContent } = trpc.seo.publishingAnalytics.getTopPublishedContent.useQuery({ limit: 10 });
  const { data: recentActivity } = trpc.seo.publishingAnalytics.getRecentActivity.useQuery({ limit: 20 });

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Publishing Analytics</h1>
        <p className="text-muted-foreground">
          Track publishing performance across WordPress and Manus platforms
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Publishes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.combined.total || 0}</div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-500">{stats?.combined.successful || 0} successful</span>
              <XCircle className="h-4 w-4 text-red-500 ml-2" />
              <span className="text-red-500">{stats?.combined.failed || 0} failed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">WordPress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.wordpress.total || 0}</div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Success Rate</span>
                <span className="font-medium">{stats?.wordpress.successRate.toFixed(1) || 0}%</span>
              </div>
              <Progress value={stats?.wordpress.successRate || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Manus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.manus.total || 0}</div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Success Rate</span>
                <span className="font-medium">{stats?.manus.successRate.toFixed(1) || 0}%</span>
              </div>
              <Progress value={stats?.manus.successRate || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Published Content */}
        <Card>
          <CardHeader>
            <CardTitle>Top Published Content</CardTitle>
            <CardDescription>Content with the most successful publishes</CardDescription>
          </CardHeader>
          <CardContent>
            {topContent && topContent.length > 0 ? (
              <div className="space-y-4">
                {topContent.map((item) => (
                  <div key={item.contentId} className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium line-clamp-1">{item.title}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{Number(item.wpPublishCount)} WordPress</span>
                        <span>{Number(item.manusPublishCount)} Manus</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {item.totalPublishes} total
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No published content yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Publishing Activity</CardTitle>
            <CardDescription>Latest publishes across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {recentActivity.map((activity) => (
                  <div key={`${activity.platform}-${activity.id}`} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    {activity.success === 1 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{activity.contentTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {activity.platform}
                        </Badge>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {activity.siteName}
                        </span>
                      </div>
                      {activity.url && (
                        <a
                          href={activity.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View post
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.publishedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
