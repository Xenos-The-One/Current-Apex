import { useState } from "react";
import { Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { TrendingUp, Eye, MousePointerClick, Share2, ArrowUp, ArrowDown, BarChart3, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PortalPerformance() {
  const { user } = useAuth();
  const [dataSource, setDataSource] = useState<"internal" | "ga">("internal");


  const { data: contentList } = trpc.seo.content.listForPortal.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // Google Analytics data (disabled for now since clientId is not on user object)
  const { data: gaMetrics } = trpc.seo.googleAnalytics.getMetrics.useQuery(
    {
      clientId: 0,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    { enabled: false }
  );
  
  const { data: gaPages } = trpc.seo.googleAnalytics.getPageMetrics.useQuery(
    {
      clientId: 0,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      limit: 10,
    },
    { enabled: false }
  );


  // listForPortal already returns only content for this user's client
  const clientContent = contentList || [];

  // Calculate performance data from content list
  const performanceData = clientContent.reduce(
    (acc: any, item: any) => ({
      totalViews: acc.totalViews + (item.views || 0),
      totalClicks: acc.totalClicks + (item.clicks || 0),
      totalShares: acc.totalShares + (item.shares || 0),
    }),
    { totalViews: 0, totalClicks: 0, totalShares: 0 }
  );

  // Calculate totals
  const totalViews = dataSource === "ga" && gaMetrics 
    ? (gaMetrics.pageviews || 0)
    : (performanceData?.totalViews || 0);
  const totalClicks = dataSource === "ga" 
    ? 0 // GA doesn't track clicks in the same way
    : (performanceData?.totalClicks || 0);
  const totalShares = dataSource === "ga" 
    ? 0
    : (performanceData?.totalShares || 0);
  const avgEngagement = clientContent.length > 0 
    ? ((totalClicks + totalShares) / clientContent.length).toFixed(1)
    : "0";

  // Get top performing content
  const topContent = [...clientContent]
    .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  return (
    <PortalLayout activePath="/seo/portal/performance">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Performance Dashboard</h2>
          <p className="text-sm mt-1 text-muted-foreground">Track your content performance</p>
        </div>
        <Select value={dataSource} onValueChange={(v) => setDataSource(v as "internal" | "ga")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="internal">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Internal Tracking
              </div>
            </SelectItem>
            <SelectItem value="ga">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Google Analytics
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all content
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Click-through rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalShares.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Social shares
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgEngagement}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per content piece
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            {topContent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No performance data yet</p>
                <p className="text-sm mt-1">Performance metrics will appear as content is published</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topContent.map((item: any, index: number) => (
                  <Link key={item.id} href={`/seo/portal/content/${item.id}`}>
                    <div className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>{(item.views || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                          <span>{(item.clicks || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Share2 className="h-4 w-4 text-muted-foreground" />
                          <span>{(item.shares || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <Badge className="bg-green-500/10 text-green-500">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        Top {index + 1}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Published Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {clientContent.filter((item: any) => item.status === "approved").length}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Live and generating traffic
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {clientContent.filter((item: any) => item.status === "in_progress").length}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Being created or reviewed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {clientContent.filter((item: any) => item.status === "draft").length}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Awaiting review or approval
              </p>
            </CardContent>
          </Card>
        </div>
    </PortalLayout>
  );
}
