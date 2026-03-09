import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, MousePointerClick, Share2, TrendingUp, BarChart3, Activity, Search, RefreshCw, ExternalLink, Wifi, WifiOff } from "lucide-react";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

export default function Performance() {
  const [, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<"internal" | "ga">("internal");
  const [kwClient, setKwClient] = useState<number | undefined>(undefined);
  // GSC live data state
  const [gscClient, setGscClient] = useState<number | undefined>(undefined);
  const [syncingCredId, setSyncingCredId] = useState<number | null>(null);
  // Sparkline hover state
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  // Send report dialog
  const [sendReportOpen, setSendReportOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sendName, setSendName] = useState("");
  const [sendingReport, setSendingReport] = useState(false);

  const { data: clients } = trpc.seo.clients.list.useQuery();
  const { data: summary, isLoading: summaryLoading } = trpc.seo.performance.getSummary.useQuery();
  const { data: topContent, isLoading: topLoading } = trpc.seo.performance.getTopPerforming.useQuery({ limit: 10 });
  const { data: keywordRankings, isLoading: kwLoading } = trpc.seo.performance.getKeywordRankings.useQuery({ clientId: kwClient, limit: 20 });

  // GSC credentials for selected client
  const { data: gscCredentials, refetch: refetchCreds } = trpc.seo.searchConsole.getCredentials.useQuery(
    { clientId: gscClient! },
    { enabled: gscClient != null }
  );
  // GSC top queries from DB
  const { data: gscQueries, isLoading: gscQueriesLoading, refetch: refetchQueries } = trpc.seo.searchConsole.getTopQueries.useQuery(
    { clientId: gscClient!, limit: 25, days: 28 },
    { enabled: gscClient != null }
  );
  // GSC summary
  const { data: gscSummary, refetch: refetchGscSummary } = trpc.seo.searchConsole.getSummary.useQuery(
    { clientId: gscClient!, days: 28 },
    { enabled: gscClient != null }
  );

  // Query history for expanded row sparkline
  const { data: queryHistory } = trpc.seo.searchConsole.getQueryHistory.useQuery(
    { clientId: gscClient!, query: expandedQuery!, days: 30 },
    { enabled: gscClient != null && expandedQuery != null }
  );

  // Send report mutation
  const sendReportMutation = trpc.seo.reports.sendReport.useMutation({
    onSuccess: () => {
      toast.success("Report emailed successfully!");
      setSendReportOpen(false);
      setSendEmail("");
      setSendName("");
      setSendingReport(false);
    },
    onError: (e) => {
      toast.error("Failed to send report: " + e.message);
      setSendingReport(false);
    },
  });

  const handleSendReport = useCallback(async () => {
    if (!gscClient || !sendEmail || !sendName) return;
    setSendingReport(true);
    // Build a simple HTML report for the selected client
    const reportHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>SEO Report</title></head><body style="font-family:sans-serif;padding:32px;background:#000F12;color:#fff">
      <h1 style="color:#00FFFF">SEO Performance Report</h1>
      <p>Generated: ${new Date().toLocaleDateString()}</p>
      <h2>Google Search Console Summary (28 days)</h2>
      <ul>
        <li>Total Clicks: ${gscSummary?.totalClicks ?? 0}</li>
        <li>Total Impressions: ${gscSummary?.totalImpressions ?? 0}</li>
        <li>Avg CTR: ${gscSummary ? (gscSummary.avgCtr * 100).toFixed(1) : 0}%</li>
        <li>Avg Position: ${gscSummary?.avgPosition.toFixed(1) ?? "N/A"}</li>
      </ul>
      <h2>Top Queries</h2>
      <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">
        <tr><th>Query</th><th>Position</th><th>Clicks</th><th>Impressions</th><th>CTR</th></tr>
        ${(gscQueries ?? []).slice(0, 20).map(q => `<tr><td>${q.query}</td><td>${q.position.toFixed(1)}</td><td>${q.clicks}</td><td>${q.impressions}</td><td>${(q.ctr * 100).toFixed(1)}%</td></tr>`).join('')}
      </table>
    </body></html>`;
    sendReportMutation.mutate({ clientId: gscClient, toEmail: sendEmail, toName: sendName, reportHtml });
  }, [gscClient, sendEmail, sendName, gscSummary, gscQueries, sendReportMutation]);

  const syncNowMutation = trpc.seo.searchConsole.syncNow.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.rowsSynced} keyword rows from Google Search Console`);
      refetchQueries();
      refetchGscSummary();
      setSyncingCredId(null);
    },
    onError: (e) => {
      toast.error("Sync failed: " + e.message);
      setSyncingCredId(null);
    },
  });

  // Google Analytics data
  const { data: gaMetrics, isLoading: gaLoading } = trpc.seo.googleAnalytics.getMetrics.useQuery(
    {
      clientId: selectedClient!,
      startDate: useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], []),
      endDate: useMemo(() => new Date().toISOString().split('T')[0], []),
    },
    { enabled: dataSource === "ga" && selectedClient !== null }
  );

  const { data: gaPages, isLoading: gaPagesLoading } = trpc.seo.googleAnalytics.getPageMetrics.useQuery(
    {
      clientId: selectedClient!,
      startDate: useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], []),
      endDate: useMemo(() => new Date().toISOString().split('T')[0], []),
      limit: 10,
    },
    { enabled: dataSource === "ga" && selectedClient !== null }
  );

  const isLoading = dataSource === "internal"
    ? (summaryLoading || topLoading)
    : (gaLoading || gaPagesLoading);

  const displaySummary = dataSource === "ga" && gaMetrics
    ? {
        totalViews: gaMetrics.pageviews || 0,
        totalClicks: 0,
        totalShares: 0,
        totalConversions: 0,
      }
    : summary;

  const displayContent = dataSource === "ga" && gaPages
    ? gaPages.map(page => ({
        content: { id: 0, title: page.pagePath, clientId: selectedClient! },
        views: page.pageviews,
        clicks: 0,
        shares: 0,
        conversions: 0,
      }))
    : topContent;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Helper: position stored as centesimal (3.45 → 345)
  const fmtPosition = (pos: number) => (pos / 100).toFixed(1);
  const fmtCtr = (ctr: number) => (ctr / 100).toFixed(1) + "%";

  const getPositionBadge = (pos: number) => {
    const p = pos / 100;
    if (p <= 3) return <Badge className="bg-green-100 text-green-700 border-green-200">Top 3</Badge>;
    if (p <= 10) return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Page 1</Badge>;
    if (p <= 20) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Page 2</Badge>;
    return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Page {Math.ceil(p / 10)}</Badge>;
  };

  const activeGscCred = gscCredentials?.find(c => c.isActive);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Content Performance</h1>
            <p className="text-muted-foreground mt-2">
              Track views, clicks, engagement, and keyword rankings across all your content
            </p>
          </div>
          <div className="flex gap-4">
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
            {dataSource === "ga" && (
              <Select
                value={selectedClient?.toString() || ""}
                onValueChange={(v) => setSelectedClient(parseInt(v))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Views</p>
              <p className="text-3xl font-bold mt-2">{displaySummary?.totalViews.toLocaleString() || 0}</p>
            </div>
            <Eye className="h-12 w-12 text-blue-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
              <p className="text-3xl font-bold mt-2">{displaySummary?.totalClicks.toLocaleString() || 0}</p>
            </div>
            <MousePointerClick className="h-12 w-12 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
              <p className="text-3xl font-bold mt-2">{displaySummary?.totalShares.toLocaleString() || 0}</p>
            </div>
            <Share2 className="h-12 w-12 text-purple-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conversions</p>
              <p className="text-3xl font-bold mt-2">{displaySummary?.totalConversions.toLocaleString() || 0}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="content">
        <TabsList className="mb-6">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Top Content
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Keyword Rankings
          </TabsTrigger>
          <TabsTrigger value="gsc" className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            GSC Live Data
          </TabsTrigger>
        </TabsList>

        {/* Top Performing Content Tab */}
        <TabsContent value="content">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Top Performing Content</h2>
            </div>
            {!displayContent || displayContent.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No performance data yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Performance metrics will appear here once content is published
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Title</th>
                      <th className="text-right py-3 px-4 font-semibold">Views</th>
                      <th className="text-right py-3 px-4 font-semibold">Clicks</th>
                      <th className="text-right py-3 px-4 font-semibold">Shares</th>
                      <th className="text-right py-3 px-4 font-semibold">Engagement</th>
                      <th className="text-right py-3 px-4 font-semibold">Conversions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayContent?.map((item, index) => (
                      <tr
                        key={'content' in item ? item.content.id : (item as any).id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/content/${'content' in item ? item.content.id : (item as any).id}`)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                              #{index + 1}
                            </div>
                            <div>
                              <p className="font-medium">
                                {'content' in item ? item.content.title : (item as any).title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {dataSource === "ga" ? "Page" : (('topic' in item) ? (item as any).topic : "")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-medium">{item.views?.toLocaleString() || 0}</td>
                        <td className="py-4 px-4 text-right font-medium">{item.clicks?.toLocaleString() || 0}</td>
                        <td className="py-4 px-4 text-right font-medium">{item.shares?.toLocaleString() || 0}</td>
                        <td className="py-4 px-4 text-right font-medium">
                          {('engagementRate' in item && item.engagementRate !== null) ? `${item.engagementRate}%` : "N/A"}
                        </td>
                        <td className="py-4 px-4 text-right font-medium">{item.conversions?.toLocaleString() || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Performance Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Average Engagement Rate</h3>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-primary">
                  {summary?.avgEngagementRate.toFixed(1) || 0}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Across {summary?.contentCount || 0} pieces of content
                </p>
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Click-Through Rate</h3>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-primary">
                  {summary && summary.totalViews > 0
                    ? ((summary.totalClicks / summary.totalViews) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {displaySummary?.totalClicks || 0} clicks from {displaySummary?.totalViews || 0} views
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Keyword Rankings Tab (internal DB data) */}
        <TabsContent value="keywords">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Search className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">Keyword Rankings</h2>
                  <p className="text-sm text-muted-foreground">Stored Search Console data — positions, clicks, and impressions</p>
                </div>
              </div>
              <Select
                value={kwClient?.toString() || "all"}
                onValueChange={(v) => setKwClient(v === "all" ? undefined : parseInt(v))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {kwLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !keywordRankings || keywordRankings.length === 0 ? (
              <div className="text-center py-16">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No keyword data yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use the <strong>GSC Live Data</strong> tab to connect a client's Search Console and sync real keyword positions.
                </p>
              </div>
            ) : (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-muted/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {keywordRankings.filter(k => k.position / 100 <= 10).length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Page 1 Keywords</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {keywordRankings.reduce((s, k) => s + k.clicks, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Total Clicks</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {keywordRankings.reduce((s, k) => s + k.impressions, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Total Impressions</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">#</th>
                        <th className="text-left py-3 px-4 font-semibold">Keyword</th>
                        <th className="text-left py-3 px-4 font-semibold">Page</th>
                        <th className="text-center py-3 px-4 font-semibold">Position</th>
                        <th className="text-right py-3 px-4 font-semibold">Clicks</th>
                        <th className="text-right py-3 px-4 font-semibold">Impressions</th>
                        <th className="text-right py-3 px-4 font-semibold">CTR</th>
                        <th className="text-center py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordRankings.map((kw, index) => (
                        <tr key={kw.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-4 text-muted-foreground font-medium">{index + 1}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium">{kw.query || "—"}</span>
                            </div>
                            {kw.clientName && (
                              <p className="text-xs text-muted-foreground mt-0.5 ml-6">{kw.clientName}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-muted-foreground truncate max-w-[180px]" title={kw.page || ""}>
                              {kw.page || "—"}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-2xl font-bold text-foreground">{fmtPosition(kw.position)}</span>
                          </td>
                          <td className="py-4 px-4 text-right font-medium">{kw.clicks.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right text-muted-foreground">{kw.impressions.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right font-medium">{fmtCtr(kw.ctr)}</td>
                          <td className="py-4 px-4 text-center">{getPositionBadge(kw.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* GSC Live Data Tab */}
        <TabsContent value="gsc">
          <div className="space-y-6">
            {/* Client selector + sync controls */}
            <Card className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Wifi className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">Google Search Console — Live Data</h2>
                    <p className="text-sm text-muted-foreground">Select a client and sync real keyword positions from GSC</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={gscClient?.toString() || ""}
                    onValueChange={(v) => setGscClient(parseInt(v))}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Select a client…" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeGscCred && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setSendReportOpen(true)}
                        className="gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Send to Client
                      </Button>
                      <Button
                        onClick={() => {
                          setSyncingCredId(activeGscCred.id);
                          syncNowMutation.mutate({ credentialId: activeGscCred.id });
                        }}
                        disabled={syncNowMutation.isPending}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncNowMutation.isPending ? 'animate-spin' : ''}`} />
                        {syncNowMutation.isPending ? 'Syncing…' : 'Sync Now'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* No client selected */}
            {!gscClient && (
              <Card className="p-12 text-center">
                <Wifi className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Select a client above to view GSC data</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Each client can have their own Search Console credentials configured in their detail page.
                </p>
              </Card>
            )}

            {/* Client selected but no credentials */}
            {gscClient && gscCredentials !== undefined && gscCredentials.length === 0 && (
              <Card className="p-12 text-center border-dashed border-2 border-muted">
                <WifiOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground mb-2">No GSC Credentials Connected</p>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  This client doesn't have Google Search Console credentials saved yet. Go to the client's detail page and add credentials under the SEO &amp; Strategy tab to enable live rank tracking.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/seo/clients/${gscClient}`)}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Go to Client Detail
                </Button>
              </Card>
            )}

            {/* Credentials exist — show summary + table */}
            {gscClient && gscCredentials && gscCredentials.length > 0 && (
              <>
                {/* Credential status */}
                <div className="flex flex-wrap gap-3">
                  {gscCredentials.map(cred => (
                    <div key={cred.id} className="flex items-center gap-2 bg-muted/40 rounded-lg px-4 py-2 text-sm">
                      {cred.isActive ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{cred.siteUrl}</span>
                      {cred.lastSyncedAt && (
                        <span className="text-muted-foreground">
                          · Last synced {new Date(cred.lastSyncedAt).toLocaleDateString()}
                        </span>
                      )}
                      {!cred.lastSyncedAt && (
                        <span className="text-yellow-500">· Never synced</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* GSC Summary cards */}
                {gscSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-5 text-center">
                      <p className="text-3xl font-bold text-primary">{gscSummary.totalClicks.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">Clicks (28d)</p>
                    </Card>
                    <Card className="p-5 text-center">
                      <p className="text-3xl font-bold text-blue-500">{gscSummary.totalImpressions.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">Impressions (28d)</p>
                    </Card>
                    <Card className="p-5 text-center">
                      <p className="text-3xl font-bold text-green-500">{(gscSummary.avgCtr * 100).toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground mt-1">Avg CTR</p>
                    </Card>
                    <Card className="p-5 text-center">
                      <p className="text-3xl font-bold text-orange-500">{gscSummary.avgPosition.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground mt-1">Avg Position</p>
                    </Card>
                  </div>
                )}

                {/* Top queries table */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Top Queries (last 28 days)
                  </h3>
                  {gscQueriesLoading ? (
                    <div className="space-y-3">
                      {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
                    </div>
                  ) : !gscQueries || gscQueries.length === 0 ? (
                    <div className="text-center py-12">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No data yet — click <strong>Sync Now</strong> to pull the latest rankings from Google Search Console.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold">#</th>
                            <th className="text-left py-3 px-4 font-semibold">Query</th>
                            <th className="text-center py-3 px-4 font-semibold">Avg Position</th>
                            <th className="text-right py-3 px-4 font-semibold">Clicks</th>
                            <th className="text-right py-3 px-4 font-semibold">Impressions</th>
                            <th className="text-right py-3 px-4 font-semibold">CTR</th>
                            <th className="text-center py-3 px-4 font-semibold">Rank</th>
                            <th className="text-center py-3 px-4 font-semibold">30d Trend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gscQueries.map((q, i) => (
                            <tr
                              key={i}
                              className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                              onClick={() => setExpandedQuery(expandedQuery === q.query ? null : (q.query ?? null))}
                            >
                              <td className="py-3 px-4 text-muted-foreground font-medium">{i + 1}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="font-medium">{q.query}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-xl font-bold">{q.position.toFixed(1)}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-medium">{q.clicks.toLocaleString()}</td>
                              <td className="py-3 px-4 text-right text-muted-foreground">{q.impressions.toLocaleString()}</td>
                              <td className="py-3 px-4 text-right font-medium">{(q.ctr * 100).toFixed(1)}%</td>
                              <td className="py-3 px-4 text-center">
                                {q.position <= 3 ? <Badge className="bg-green-100 text-green-700">Top 3</Badge>
                                  : q.position <= 10 ? <Badge className="bg-blue-100 text-blue-700">Page 1</Badge>
                                  : q.position <= 20 ? <Badge className="bg-yellow-100 text-yellow-700">Page 2</Badge>
                                  : <Badge className="bg-gray-100 text-gray-600">Page {Math.ceil(q.position / 10)}</Badge>}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {/* Inline SVG sparkline */}
                                {expandedQuery === q.query && queryHistory && queryHistory.length > 1 ? (
                                  <svg width="80" height="28" viewBox={`0 0 80 28`} className="overflow-visible">
                                    {(() => {
                                      const pts = queryHistory;
                                      const maxPos = Math.max(...pts.map(p => p.position), 1);
                                      const minPos = Math.min(...pts.map(p => p.position));
                                      const range = maxPos - minPos || 1;
                                      const xs = pts.map((_, idx) => (idx / (pts.length - 1)) * 78 + 1);
                                      // Invert: lower position = higher on chart (better)
                                      const ys = pts.map(p => 26 - ((maxPos - p.position) / range) * 24 + 1);
                                      const path = xs.map((x, idx) => `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[idx].toFixed(1)}`).join(' ');
                                      return (
                                        <>
                                          <path d={path} fill="none" stroke="#00FFFF" strokeWidth="1.5" strokeLinejoin="round" />
                                          <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="2.5" fill="#00FFFF" />
                                        </>
                                      );
                                    })()}
                                  </svg>
                                ) : (
                                  <button
                                    className="text-xs text-muted-foreground hover:text-primary underline"
                                    onClick={(e) => { e.stopPropagation(); setExpandedQuery(q.query ?? null); }}
                                  >
                                    View
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Send Report Dialog */}
      <Dialog open={sendReportOpen} onOpenChange={setSendReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Send Report to Client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="send-name">Recipient Name</Label>
              <Input
                id="send-name"
                placeholder="e.g. John Smith"
                value={sendName}
                onChange={(e) => setSendName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="send-email">Recipient Email</Label>
              <Input
                id="send-email"
                type="email"
                placeholder="client@example.com"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This will email a branded HTML report including the GSC summary and top queries for the selected client.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendReportOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSendReport}
              disabled={!sendEmail || !sendName || sendingReport}
              className="gap-2"
            >
              {sendingReport ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Sending…</>
              ) : (
                <><Mail className="h-4 w-4" /> Send Report</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
