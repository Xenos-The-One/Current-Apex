import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  TrendingUp,
  Search,
  Globe,
  FileText,
  AlertCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  ExternalLink,
} from "lucide-react";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" :
    score >= 60 ? "border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/20" :
    "border-red-300 text-red-600 bg-red-50 dark:bg-red-950/20";
  return (
    <Badge variant="outline" className={`text-xs font-bold ${color}`}>
      {score}/100
    </Badge>
  );
}

export default function SEOInsights() {
  const { data: dashStats, isLoading: dashLoading } = trpc.crm.dashboardStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: contentData, isLoading: contentLoading } = trpc.seo.contentApprovals.listForPortal.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const isLoading = dashLoading || contentLoading;

  const stats = {
    totalContent: contentData?.length || 0,
    publishedContent: contentData?.filter((c: any) => c.status === 'approved').length || 0,
    pendingContent: (dashStats as any)?.pendingApprovalsCount || 0,
    totalViews: 0,
    avgQualityScore: null,
  };
  const content = (contentData || []).filter((c: any) => c.status === 'approved').slice(0, 5);
  const audit = null;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Search className="h-5 w-5 text-cyan-500" />
              SEO Insights
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your website's search visibility, content performance, and optimization opportunities.
            </p>
          </div>
          <Link href="/apex-content">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Content Portal
            </Button>
          </Link>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
            </>
          ) : (
            <>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground mb-1">Total Content</p>
                <p className="text-2xl font-bold">{stats?.totalContent || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{stats?.publishedContent || 0} published</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground mb-1">Total Views</p>
                <p className="text-2xl font-bold">{(stats?.totalViews || 0).toLocaleString()}</p>
                <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> Organic traffic
                </p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground mb-1">Avg Quality Score</p>
                <p className="text-2xl font-bold">{stats?.avgQualityScore || "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">out of 100</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground mb-1">Pending Approval</p>
                <p className="text-2xl font-bold">{stats?.pendingContent || 0}</p>
                <p className="text-[10px] text-amber-500 mt-1">needs review</p>
              </div>
            </>
          )}
        </div>

        {/* SEO Audit Summary */}
        {audit && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-cyan-500" />
                  Latest Website Audit
                </CardTitle>
                <div className="flex items-center gap-2">
                  <ScoreBadge score={audit.overallScore || 0} />
                  <span className="text-xs text-muted-foreground">
                    {audit.auditDate ? new Date(audit.auditDate).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Performance", score: audit.performanceScore },
                  { label: "SEO", score: audit.seoScore },
                  { label: "Accessibility", score: audit.accessibilityScore },
                  { label: "Best Practices", score: audit.bestPracticesScore },
                ].map(({ label, score }) => (
                  <div key={label} className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-lg font-bold">{score || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {audit.recommendations && audit.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Top Recommendations</p>
                  <div className="space-y-1.5">
                    {(audit.recommendations as string[]).slice(0, 4).map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Published Content */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                Recent Published Content
              </CardTitle>
              <Link href="/apex-content">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {contentLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
              </div>
            ) : content.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No published content yet</p>
                <Link href="/apex-content">
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    Go to Content Portal
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {content.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
                    <div className="h-8 w-8 rounded bg-purple-100 dark:bg-purple-950 flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.contentType} &middot; {item.views?.toLocaleString() || 0} views
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.qualityScore && <ScoreBadge score={item.qualityScore} />}
                      {item.publishedUrl && (
                        <a href={item.publishedUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyword Opportunities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-500" />
              Keyword Opportunities
            </CardTitle>
            <CardDescription className="text-xs">
              High-value mortgage keywords your website can rank for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { keyword: "mortgage loan officer near me", volume: "2.4K/mo", difficulty: "Medium", opportunity: "High" },
                { keyword: "FHA loan requirements 2025", volume: "1.8K/mo", difficulty: "Low", opportunity: "High" },
                { keyword: "first time home buyer programs", volume: "5.2K/mo", difficulty: "High", opportunity: "Medium" },
                { keyword: "refinance mortgage rates today", volume: "3.1K/mo", difficulty: "High", opportunity: "Medium" },
                { keyword: "VA loan eligibility", volume: "1.2K/mo", difficulty: "Low", opportunity: "High" },
              ].map((kw, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{kw.keyword}</p>
                    <p className="text-xs text-muted-foreground">{kw.volume} searches</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${
                    kw.difficulty === "Low" ? "border-emerald-300 text-emerald-600" :
                    kw.difficulty === "Medium" ? "border-amber-300 text-amber-600" :
                    "border-red-300 text-red-600"
                  }`}>
                    {kw.difficulty} difficulty
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${
                    kw.opportunity === "High" ? "border-blue-300 text-blue-600" : "border-muted text-muted-foreground"
                  }`}>
                    {kw.opportunity} opportunity
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Link href="/apex-content">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs w-full">
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Content for These Keywords
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
