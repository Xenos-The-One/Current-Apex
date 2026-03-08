import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Eye, MousePointerClick, Share2, Zap, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Analytics() {
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [filterRanking, setFilterRanking] = useState<string>("all");
  const [newMetrics, setNewMetrics] = useState({
    views: 0,
    clicks: 0,
    shares: 0,
    engagementRate: 0,
    avgTimeOnPage: 0,
    conversions: 0,
  });

  const { data: contentList } = trpc.seo.content.list.useQuery();
  const { data: metrics, refetch: refetchMetrics } = trpc.seo.analytics.getMetrics.useQuery(
    { contentId: parseInt(selectedContentId) },
    { enabled: !!selectedContentId }
  );
  const { data: allMetrics } = trpc.seo.analytics.getAllMetrics.useQuery();
  const { data: globalTrend } = trpc.seo.analytics.globalTrend.useQuery();
  const recordMutation = trpc.seo.analytics.recordMetrics.useMutation();

  const selectedContent = contentList?.find(
    (c) => c.content.id === parseInt(selectedContentId)
  );

  // Calculate summary stats for selected content
  const totalViews = metrics?.reduce((sum: number, m: any) => sum + m.views, 0) || 0;
  const totalClicks = metrics?.reduce((sum: number, m: any) => sum + m.clicks, 0) || 0;
  const totalShares = metrics?.reduce((sum: number, m: any) => sum + m.shares, 0) || 0;
  const totalConversions = metrics?.reduce((sum: number, m: any) => sum + m.conversions, 0) || 0;
  const avgEngagement =
    metrics && metrics.length > 0
      ? Math.round(
          metrics.reduce((sum: number, m: any) => sum + m.engagementRate, 0) / metrics.length
        )
      : 0;

  // Calculate global stats
  const globalViews = allMetrics?.reduce((sum: number, m: any) => sum + m.views, 0) || 0;
  const globalClicks = allMetrics?.reduce((sum: number, m: any) => sum + m.clicks, 0) || 0;
  const globalShares = allMetrics?.reduce((sum: number, m: any) => sum + m.shares, 0) || 0;
  const globalConversions = allMetrics?.reduce((sum: number, m: any) => sum + m.conversions, 0) || 0;

  const metricsCards = [
    { name: "Views", value: totalViews, icon: Eye, color: "#3b82f6" },
    { name: "Clicks", value: totalClicks, icon: MousePointerClick, color: "#10b981" },
    { name: "Shares", value: totalShares, icon: Share2, color: "#f59e0b" },
    { name: "Conversions", value: totalConversions, icon: Zap, color: "#ef4444" },
  ];

  const chartData =
    metrics?.map((m: any) => ({
      date: new Date(m.recordedAt).toLocaleDateString(),
      views: m.views,
      clicks: m.clicks,
      shares: m.shares,
      conversions: m.conversions,
      engagement: m.engagementRate,
    })) || [];

  const handleRecordMetrics = async () => {
    if (!selectedContentId) return;
    try {
      await recordMutation.mutateAsync({
        contentId: parseInt(selectedContentId),
        ...newMetrics,
      });
      toast.success("Metrics recorded successfully");
      setShowRecordDialog(false);
      setNewMetrics({ views: 0, clicks: 0, shares: 0, engagementRate: 0, avgTimeOnPage: 0, conversions: 0 });
      refetchMetrics();
    } catch {
      toast.error("Failed to record metrics");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track real-time performance metrics and engagement for your content
          </p>
        </div>
      </div>

      {/* Global Overview */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Global Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold mt-1">{globalViews.toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 opacity-50 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-2xl font-bold mt-1">{globalClicks.toLocaleString()}</p>
                </div>
                <MousePointerClick className="h-8 w-8 opacity-50 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shares</p>
                  <p className="text-2xl font-bold mt-1">{globalShares.toLocaleString()}</p>
                </div>
                <Share2 className="h-8 w-8 opacity-50 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Conversions</p>
                  <p className="text-2xl font-bold mt-1">{globalConversions.toLocaleString()}</p>
                </div>
                <Zap className="h-8 w-8 opacity-50 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global overview bar chart */}
        {globalTrend && globalTrend.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Views &amp; Clicks by Content</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={globalTrend} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                    <XAxis dataKey="label" stroke="#888" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="views" fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar dataKey="clicks" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Shares &amp; Conversions by Content</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={globalTrend} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                    <XAxis dataKey="label" stroke="#888" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="shares" fill="#f59e0b" radius={[4,4,0,0]} />
                    <Bar dataKey="conversions" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Content Selector */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <label className="block text-sm font-medium mb-2">Select Content</label>
          <Select value={selectedContentId} onValueChange={setSelectedContentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose content to analyze..." />
            </SelectTrigger>
            <SelectContent>
              {contentList
                ?.filter(item => {
                  if (filterRanking === "all") return true;
                  const score = (item as any).qualityScore ?? null;
                  if (filterRanking === "high") return score != null && score >= 70;
                  if (filterRanking === "medium") return score != null && score >= 40 && score < 70;
                  if (filterRanking === "low") return score != null && score < 40;
                  if (filterRanking === "unscored") return score == null;
                  return true;
                })
                .map((item) => (
                  <SelectItem key={item.content.id} value={item.content.id.toString()}>
                    {item.content.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <label className="block text-sm font-medium mb-2">Filter by Ranking</label>
          <Select value={filterRanking} onValueChange={(v) => { setFilterRanking(v); setSelectedContentId(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Rankings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rankings</SelectItem>
              <SelectItem value="high">High (70+)</SelectItem>
              <SelectItem value="medium">Medium (40–69)</SelectItem>
              <SelectItem value="low">Low (&lt;40)</SelectItem>
              <SelectItem value="unscored">Not Scored</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedContentId && (
          <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Metrics
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Performance Metrics</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Views</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newMetrics.views}
                      onChange={(e) =>
                        setNewMetrics({ ...newMetrics, views: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Clicks</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newMetrics.clicks}
                      onChange={(e) =>
                        setNewMetrics({ ...newMetrics, clicks: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Shares</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newMetrics.shares}
                      onChange={(e) =>
                        setNewMetrics({ ...newMetrics, shares: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Conversions</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newMetrics.conversions}
                      onChange={(e) =>
                        setNewMetrics({ ...newMetrics, conversions: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Engagement Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newMetrics.engagementRate}
                      onChange={(e) =>
                        setNewMetrics({
                          ...newMetrics,
                          engagementRate: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Avg Time on Page (sec)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newMetrics.avgTimeOnPage}
                      onChange={(e) =>
                        setNewMetrics({
                          ...newMetrics,
                          avgTimeOnPage: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={handleRecordMetrics}
                  disabled={recordMutation.isPending}
                  className="w-full"
                >
                  {recordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Save Metrics
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedContentId && selectedContent && (
        <>
          {/* Content Info */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">{selectedContent.content.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(selectedContent.content.createdAt).toLocaleDateString()} &middot;{" "}
                    Status: <span className="capitalize">{selectedContent.content.status.replace("_", " ")}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Avg Engagement</p>
                  <p className="text-3xl font-bold text-primary">{avgEngagement}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metricsCards.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.name}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{metric.name}</p>
                        <p className="text-2xl font-bold mt-1">{metric.value.toLocaleString()}</p>
                      </div>
                      <Icon className="h-8 w-8 opacity-50" style={{ color: metric.color }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts */}
          {chartData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="conversions" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                      />
                      <Legend />
                      <Bar dataKey="clicks" fill="#10b981" />
                      <Bar dataKey="shares" fill="#f59e0b" />
                      <Bar dataKey="conversions" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="mb-6">
              <CardContent className="pt-6 text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No analytics data recorded yet</p>
                <p className="text-sm text-muted-foreground">
                  Click "Record Metrics" to start tracking this content's performance
                </p>
              </CardContent>
            </Card>
          )}

          {/* Metrics History Table */}
          {metrics && metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Metrics History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Views</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Clicks</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Shares</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Conversions</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Engagement</th>
                        <th className="text-right py-3 px-2 text-muted-foreground font-medium">Avg Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((m: any) => (
                        <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-2">{new Date(m.recordedAt).toLocaleDateString()}</td>
                          <td className="text-right py-3 px-2">{m.views.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{m.clicks.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{m.shares.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{m.conversions.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{m.engagementRate}%</td>
                          <td className="text-right py-3 px-2">{m.avgTimeOnPage}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedContentId && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select a piece of content above to view its analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
