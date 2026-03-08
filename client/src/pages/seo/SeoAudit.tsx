import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search, FileText, AlertTriangle, CheckCircle, Info, Loader2,
  Hash, Link2, Image, Clock, Type, BarChart3, Target, Lightbulb,
  AlertCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe } from "lucide-react";

type AuditResult = {
  contentId: number;
  title: string;
  topic: string;
  metrics: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    avgWordsPerSentence: number;
    headingCount: number;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    internalLinks: number;
    externalLinks: number;
    imageCount: number;
    readingTime: number;
  };
  keywordAnalysis: Array<{
    keyword: string;
    count: number;
    density: number;
    inTitle: boolean;
    inFirstParagraph: boolean;
    inHeadings: boolean;
  }>;
  aiAnalysis: {
    overallScore: number;
    readabilityScore: number;
    seoScore: number;
    contentQualityScore: number;
    technicalSeoScore: number;
    metaDescription: string;
    suggestedTitle: string;
    issues: Array<{
      severity: string;
      category: string;
      message: string;
      suggestion: string;
    }>;
    strengths: string[];
    improvements: string[];
  };
};

function ScoreCircle({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-400";
    if (s >= 60) return "text-yellow-400";
    if (s >= 40) return "text-orange-400";
    return "text-red-400";
  };
  const getBgColor = (s: number) => {
    if (s >= 80) return "stroke-green-400/20";
    if (s >= 60) return "stroke-yellow-400/20";
    if (s >= 40) return "stroke-orange-400/20";
    return "stroke-red-400/20";
  };
  const getStrokeColor = (s: number) => {
    if (s >= 80) return "stroke-green-400";
    if (s >= 60) return "stroke-yellow-400";
    if (s >= 40) return "stroke-orange-400";
    return "stroke-red-400";
  };

  const r = size === "lg" ? 45 : 30;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const svgSize = size === "lg" ? 120 : 80;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle cx={svgSize / 2} cy={svgSize / 2} r={r} fill="none" strokeWidth={size === "lg" ? 8 : 5} className={getBgColor(score)} />
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={r} fill="none"
          strokeWidth={size === "lg" ? 8 : 5}
          className={getStrokeColor(score)}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <text
          x={svgSize / 2} y={svgSize / 2}
          textAnchor="middle" dominantBaseline="central"
          className={`${getColor(score)} fill-current rotate-90 origin-center ${size === "lg" ? "text-2xl" : "text-sm"} font-bold`}
        >
          {score}
        </text>
      </svg>
      <span className={`${size === "lg" ? "text-sm" : "text-xs"} text-muted-foreground font-medium`}>{label}</span>
    </div>
  );
}

export default function SeoAudit() {
  const [auditMode, setAuditMode] = useState<"content" | "url">("content");
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [keywords, setKeywords] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [crawlResult, setCrawlResult] = useState<any>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  const { data: contentList } = trpc.seo.content.list.useQuery();
  const analyzeMutation = trpc.seo.seoAudit.analyze.useMutation();
  const liveCrawlMutation = trpc.seo.seoAudit.liveCrawl.useMutation();

  const handleAnalyze = async () => {
    if (!selectedContentId) {
      toast.error("Please select content to analyze");
      return;
    }
    try {
      const keywordList = keywords.split(",").map(k => k.trim()).filter(Boolean);
      const res = await analyzeMutation.mutateAsync({
        contentId: parseInt(selectedContentId),
        targetKeywords: keywordList.length > 0 ? keywordList : undefined,
      });
      setResult(res as AuditResult);
      setCrawlResult(null);
      toast.success("SEO audit complete!");
    } catch {
      toast.error("Failed to run SEO audit");
    }
  };

  const handleLiveCrawl = async () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a URL to crawl");
      return;
    }
    let url = urlInput.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    try {
      const keywordList = keywords.split(",").map(k => k.trim()).filter(Boolean);
      const res = await liveCrawlMutation.mutateAsync({
        url,
        targetKeywords: keywordList.length > 0 ? keywordList : undefined,
      });
      setCrawlResult(res);
      setResult(null);
      toast.success("Live crawl complete!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to crawl URL");
    }
  };

  const toggleIssue = (idx: number) => {
    const next = new Set(expandedIssues);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedIssues(next);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "warning": return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      default: return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "critical": return "border-red-500/30 bg-red-500/5";
      case "warning": return "border-yellow-500/30 bg-yellow-500/5";
      default: return "border-blue-500/30 bg-blue-500/5";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">SEO Audit</h1>
        <p className="text-muted-foreground mt-1">
          Analyze content for SEO best practices, keyword optimization, and readability
        </p>
      </div>

      {/* Audit Mode Tabs + Form */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <Tabs value={auditMode} onValueChange={(v) => setAuditMode(v as "content" | "url")} className="mb-4">
            <TabsList className="h-8">
              <TabsTrigger value="content" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Stored Content
              </TabsTrigger>
              <TabsTrigger value="url" className="text-xs gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Live URL Crawl
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {auditMode === "content" ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Select Content</Label>
                <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose content to audit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contentList?.map((item) => (
                      <SelectItem key={item.content.id} value={String(item.content.id)}>
                        {item.content.title} — {item.client?.name || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Target Keywords (comma-separated)</Label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. mortgage broker, home loan" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending} className="w-full sm:w-auto">
                  {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Run Audit
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Page URL</Label>
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/blog/your-post"
                  onKeyDown={(e) => e.key === "Enter" && handleLiveCrawl()}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Target Keywords (comma-separated)</Label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. mortgage broker, home loan" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleLiveCrawl} disabled={liveCrawlMutation.isPending} className="w-full sm:w-auto">
                  {liveCrawlMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                  Crawl & Audit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {analyzeMutation.isPending && (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Analyzing content...</p>
            <p className="text-sm text-muted-foreground mt-1">AI is reviewing SEO, readability, and content quality</p>
          </CardContent>
        </Card>
      )}

      {liveCrawlMutation.isPending && (
        <Card>
          <CardContent className="py-16 text-center">
            <Globe className="h-10 w-10 animate-pulse text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Crawling page...</p>
            <p className="text-sm text-muted-foreground mt-1">Fetching page metadata, headings, and content for AI analysis</p>
          </CardContent>
        </Card>
      )}

      {crawlResult && !liveCrawlMutation.isPending && (
        <div className="space-y-6">
          {/* Crawl Score Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Live Crawl — {crawlResult.crawled.pageTitle || crawlResult.url}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{crawlResult.url}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-center gap-8 py-4">
                <ScoreCircle score={crawlResult.aiAnalysis.overallScore} label="Overall" size="lg" />
                <div className="flex gap-6">
                  <ScoreCircle score={crawlResult.aiAnalysis.seoScore} label="SEO" size="sm" />
                  <ScoreCircle score={crawlResult.aiAnalysis.readabilityScore} label="Readability" size="sm" />
                  <ScoreCircle score={crawlResult.aiAnalysis.contentQualityScore} label="Quality" size="sm" />
                  <ScoreCircle score={crawlResult.aiAnalysis.technicalSeoScore} label="Technical" size="sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Page Metadata */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />Page Metadata</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Page Title</Label>
                  <p className="text-sm mt-1 p-2 rounded bg-muted/30 border border-border/50">{crawlResult.crawled.pageTitle || <span className="text-red-400">Missing</span>}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{crawlResult.crawled.pageTitle.length}/60 characters</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Meta Description</Label>
                  <p className="text-sm mt-1 p-2 rounded bg-muted/30 border border-border/50">{crawlResult.crawled.metaDescription || <span className="text-red-400">Missing — add a meta description</span>}</p>
                  {crawlResult.crawled.metaDescription && <p className="text-[10px] text-muted-foreground mt-0.5">{crawlResult.crawled.metaDescription.length}/160 characters</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Canonical", value: crawlResult.crawled.canonical ? "Set" : "Missing", ok: !!crawlResult.crawled.canonical },
                    { label: "OG Tags", value: crawlResult.crawled.ogTitle ? "Present" : "Missing", ok: !!crawlResult.crawled.ogTitle },
                    { label: "Robots", value: crawlResult.crawled.robots || "Not set", ok: true },
                    { label: "Images w/o Alt", value: String(crawlResult.crawled.imgWithoutAlt), ok: crawlResult.crawled.imgWithoutAlt === 0 },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                      {m.ok ? <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                      <div><p className="text-muted-foreground">{m.label}</p><p className="font-medium">{m.value}</p></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Crawl Metrics */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Page Metrics</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Type, label: "Words", value: crawlResult.metrics.wordCount, good: crawlResult.metrics.wordCount >= 500 },
                    { icon: Clock, label: "Reading Time", value: `${crawlResult.metrics.readingTime} min`, good: true },
                    { icon: Hash, label: "H1 Tags", value: crawlResult.metrics.h1Count, good: crawlResult.metrics.h1Count === 1 },
                    { icon: Hash, label: "H2 Tags", value: crawlResult.metrics.h2Count, good: crawlResult.metrics.h2Count >= 2 },
                    { icon: Link2, label: "Internal Links", value: crawlResult.metrics.internalLinks, good: crawlResult.metrics.internalLinks >= 2 },
                    { icon: Link2, label: "External Links", value: crawlResult.metrics.externalLinks, good: true },
                    { icon: Image, label: "Images", value: crawlResult.metrics.imageCount, good: crawlResult.metrics.imageCount >= 1 },
                    { icon: AlertTriangle, label: "Missing Alt", value: crawlResult.metrics.imgWithoutAlt, good: crawlResult.metrics.imgWithoutAlt === 0 },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                      <m.icon className={`h-4 w-4 ${m.good ? "text-green-400" : "text-yellow-400"}`} />
                      <div><p className="text-xs text-muted-foreground">{m.label}</p><p className="text-sm font-semibold">{m.value}</p></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Issues */}
          {crawlResult.aiAnalysis.issues.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Issues Found ({crawlResult.aiAnalysis.issues.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  <div className="space-y-2 pr-2">
                    {crawlResult.aiAnalysis.issues.map((issue: any, i: number) => (
                      <div key={i} className={`p-3 rounded-md border ${getSeverityBg(issue.severity)}`}>
                        <div className="flex items-start gap-2 cursor-pointer" onClick={() => toggleIssue(i)}>
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{issue.message}</p>
                            <Badge variant="outline" className="text-[10px] mt-1">{issue.category}</Badge>
                          </div>
                          {expandedIssues.has(i) ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                        </div>
                        {expandedIssues.has(i) && (
                          <p className="text-xs text-muted-foreground mt-2 pl-6">{issue.suggestion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* AI Suggestions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4" />AI Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Suggested Meta Description</Label>
                <p className="text-sm mt-1 p-2 rounded bg-muted/30 border border-border/50">{crawlResult.aiAnalysis.metaDescription}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Suggested Title</Label>
                <p className="text-sm mt-1 p-2 rounded bg-muted/30 border border-border/50">{crawlResult.aiAnalysis.suggestedTitle}</p>
              </div>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Priority Improvements</Label>
                <div className="space-y-1.5">
                  {crawlResult.aiAnalysis.improvements.map((imp: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                      <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                      <span>{imp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {result && !analyzeMutation.isPending && (
        <div className="space-y-6">
          {/* Score Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Score Overview — {result.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-center gap-8 py-4">
                <ScoreCircle score={result.aiAnalysis.overallScore} label="Overall" size="lg" />
                <div className="flex gap-6">
                  <ScoreCircle score={result.aiAnalysis.seoScore} label="SEO" size="sm" />
                  <ScoreCircle score={result.aiAnalysis.readabilityScore} label="Readability" size="sm" />
                  <ScoreCircle score={result.aiAnalysis.contentQualityScore} label="Quality" size="sm" />
                  <ScoreCircle score={result.aiAnalysis.technicalSeoScore} label="Technical" size="sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Content Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Type, label: "Words", value: result.metrics.wordCount, good: result.metrics.wordCount >= 1000 },
                    { icon: Clock, label: "Reading Time", value: `${result.metrics.readingTime} min`, good: true },
                    { icon: Hash, label: "Headings", value: result.metrics.headingCount, good: result.metrics.headingCount >= 3 },
                    { icon: FileText, label: "Paragraphs", value: result.metrics.paragraphCount, good: result.metrics.paragraphCount >= 5 },
                    { icon: Link2, label: "Internal Links", value: result.metrics.internalLinks, good: result.metrics.internalLinks >= 2 },
                    { icon: Link2, label: "External Links", value: result.metrics.externalLinks, good: result.metrics.externalLinks >= 1 },
                    { icon: Image, label: "Images", value: result.metrics.imageCount, good: result.metrics.imageCount >= 1 },
                    { icon: Type, label: "Avg Words/Sentence", value: result.metrics.avgWordsPerSentence, good: result.metrics.avgWordsPerSentence <= 20 },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                      <m.icon className={`h-4 w-4 ${m.good ? "text-green-400" : "text-yellow-400"}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className="text-sm font-semibold">{m.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Keyword Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Keyword Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.keywordAnalysis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No keywords analyzed</p>
                ) : (
                  <div className="space-y-3">
                    {result.keywordAnalysis.map((kw, i) => (
                      <div key={i} className="p-3 rounded-md border border-border/50 bg-card/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">"{kw.keyword}"</span>
                          <Badge variant="outline" className="text-xs">
                            {kw.count} occurrences ({kw.density}%)
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge className={kw.inTitle ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"} variant="outline">
                            {kw.inTitle ? "✓" : "✗"} In Title
                          </Badge>
                          <Badge className={kw.inFirstParagraph ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"} variant="outline">
                            {kw.inFirstParagraph ? "✓" : "✗"} In First Paragraph
                          </Badge>
                          <Badge className={kw.inHeadings ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"} variant="outline">
                            {kw.inHeadings ? "✓" : "✗"} In Headings
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>Density</span>
                            <span>{kw.density}% {kw.density >= 1 && kw.density <= 3 ? "(optimal)" : kw.density < 1 ? "(low)" : "(high)"}</span>
                          </div>
                          <Progress value={Math.min(kw.density * 20, 100)} className="h-1.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Meta Suggestions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Suggested Meta Description</Label>
                  <p className="text-sm mt-1 p-2 rounded bg-muted/30 border border-border/50">
                    {result.aiAnalysis.metaDescription}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {result.aiAnalysis.metaDescription.length}/160 characters
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Suggested SEO Title</Label>
                  <p className="text-sm mt-1 p-2 rounded bg-muted/30 border border-border/50">
                    {result.aiAnalysis.suggestedTitle}
                  </p>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Strengths</Label>
                  <div className="space-y-1">
                    {result.aiAnalysis.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Improvements */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Priority Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {result.aiAnalysis.improvements.map((imp, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                      <span className="text-xs font-bold text-primary mt-0.5 shrink-0">#{i + 1}</span>
                      <span>{imp}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Issues List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issues Found ({result.aiAnalysis.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.aiAnalysis.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 cursor-pointer transition-all ${getSeverityBg(issue.severity)}`}
                    onClick={() => toggleIssue(i)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(issue.severity)}
                        <span className="text-sm font-medium">{issue.message}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{issue.category}</Badge>
                        {expandedIssues.has(i) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {expandedIssues.has(i) && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Suggestion: </span>
                          {issue.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {result.aiAnalysis.issues.length === 0 && (
                  <div className="text-center py-6">
                    <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-medium">No issues found!</p>
                    <p className="text-xs text-muted-foreground">Your content looks great</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!result && !analyzeMutation.isPending && (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Run an SEO Audit</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Select a content piece and enter your target keywords to get a comprehensive SEO analysis with actionable recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
