import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TrendingUp,
  Search,
  Globe,
  Plus,
  X,
  Play,
  Loader2,
  Lightbulb,
  Target,
  BarChart3,
  Zap,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";

// ── Helpers ──────────────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return <Badge variant="outline">Unknown</Badge>;
  const map: Record<string, string> = {
    easy: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    hard: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <Badge className={map[difficulty] ?? "bg-gray-100 text-gray-600"}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </Badge>
  );
}

function OpportunityBar({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color =
    s >= 70 ? "bg-green-500" : s >= 40 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${s}%` }}
        />
      </div>
      <span className="text-sm font-medium">{s}</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KeywordGap() {
  const [selectedClient, setSelectedClient] = useState<number | undefined>();
  const [competitorInputs, setCompetitorInputs] = useState<string[]>([""]);
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"opportunity" | "volume" | "position">(
    "opportunity"
  );
  const [briefKeyword, setBriefKeyword] = useState<{
    keyword: string;
    competitorUrl: string;
  } | null>(null);
  const [briefContent, setBriefContent] = useState<string>("");
  const [briefOpen, setBriefOpen] = useState(false);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  const { data: clients } = trpc.seo.clients.list.useQuery();

  const { data: runs, refetch: refetchRuns } = trpc.seo.keywordGap.listRuns.useQuery(
    { clientId: selectedClient! },
    { enabled: selectedClient != null }
  );

  const { data: gapKeywords, isLoading: gapLoading, refetch: refetchGap } =
    trpc.seo.keywordGap.getGapKeywords.useQuery(
      {
        clientId: selectedClient!,
        gapOnly: true,
        difficulty:
          difficultyFilter !== "all"
            ? (difficultyFilter as "easy" | "medium" | "hard")
            : undefined,
        limit: 100,
      },
      { enabled: selectedClient != null }
    );

  const { data: gapSummary } = trpc.seo.keywordGap.getSummary.useQuery(
    { clientId: selectedClient! },
    { enabled: selectedClient != null }
  );

  const runAnalysisMutation = trpc.seo.keywordGap.runAnalysis.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Analysis complete — ${data.totalGapKeywords} gap keywords found!`
      );
      refetchRuns();
      refetchGap();
    },
    onError: (e) => toast.error("Analysis failed: " + e.message),
  });

  const suggestContentMutation = trpc.seo.keywordGap.suggestContent.useMutation({
    onSuccess: (data) => {
      setBriefContent(data.brief);
      setBriefOpen(true);
    },
    onError: (e) => toast.error("Failed to generate brief: " + e.message),
  });

  const handleRunAnalysis = () => {
    if (!selectedClient) return;
    const urls = competitorInputs.filter((u) => u.trim().length > 0);
    if (urls.length === 0) {
      toast.error("Add at least one competitor URL");
      return;
    }
    runAnalysisMutation.mutate({ clientId: selectedClient, competitorUrls: urls });
  };

  const [, navigate] = useLocation();

  const handleExportCSV = () => {
    if (!sortedKeywords || sortedKeywords.length === 0) {
      toast.error("No gap keywords to export");
      return;
    }
    const headers = ["#","Keyword","Competitor URL","Competitor Rank","Search Volume","Difficulty","Opportunity Score"];
    const rows = sortedKeywords.map((kw, i) => [
      i + 1,
      `"${kw.keyword}"`,
      `"${kw.competitorUrl}"`,
      kw.estimatedPosition ?? "",
      kw.searchVolume ?? "",
      kw.difficulty ?? "",
      kw.opportunityScore ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const clientName = clients?.find((c) => c.id === selectedClient)?.name ?? "client";
    a.download = `keyword-gap-${clientName.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const handleCreateContent = (keyword: string) => {
    sessionStorage.setItem("prefill_topic", keyword);
    sessionStorage.setItem("prefill_clientId", String(selectedClient ?? ""));
    navigate("/content");
    toast.success(`Opening Content Generator for "${keyword}"`);
  };

  const handleSuggestContent = (keyword: string, competitorUrl: string) => {
    if (!selectedClient) return;
    setBriefKeyword({ keyword, competitorUrl });
    setBriefContent("");
    suggestContentMutation.mutate({
      clientId: selectedClient,
      keyword,
      competitorUrl,
    });
  };

  const sortedKeywords = useMemo(() => {
    if (!gapKeywords) return [];
    return [...gapKeywords].sort((a, b) => {
      if (sortBy === "opportunity")
        return (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0);
      if (sortBy === "volume")
        return (b.searchVolume ?? 0) - (a.searchVolume ?? 0);
      if (sortBy === "position")
        return (a.estimatedPosition ?? 99) - (b.estimatedPosition ?? 99);
      return 0;
    });
  }, [gapKeywords, sortBy]);

  // Pre-fill competitor URLs from selected client's stored competitorUrls
  const selectedClientData = clients?.find((c) => c.id === selectedClient);
  const storedCompetitorUrls = useMemo(() => {
    if (!selectedClientData?.competitorUrls) return [];
    return selectedClientData.competitorUrls
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
  }, [selectedClientData]);

  const handleClientChange = (val: string) => {
    const id = parseInt(val);
    setSelectedClient(id);
    const client = clients?.find((c) => c.id === id);
    const urls = client?.competitorUrls
      ?.split(",")
      .map((u) => u.trim())
      .filter(Boolean) ?? [];
    setCompetitorInputs(urls.length > 0 ? urls : [""]);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          Competitor Keyword Gap Analysis
        </h1>
        <p className="text-muted-foreground mt-2">
          Discover keywords your competitors rank for that you don't — and turn
          them into content opportunities.
        </p>
      </div>

      {/* Setup Panel */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Analysis Setup
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client selector */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={selectedClient?.toString() ?? ""}
              onValueChange={handleClientChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {storedCompetitorUrls.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {storedCompetitorUrls.length} competitor URL
                {storedCompetitorUrls.length > 1 ? "s" : ""} loaded from client
                profile
              </p>
            )}
          </div>

          {/* Competitor URLs */}
          <div className="space-y-2">
            <Label>Competitor URLs (up to 5)</Label>
            <div className="space-y-2">
              {competitorInputs.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="https://competitor.com"
                    value={url}
                    onChange={(e) => {
                      const next = [...competitorInputs];
                      next[i] = e.target.value;
                      setCompetitorInputs(next);
                    }}
                  />
                  {competitorInputs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCompetitorInputs(
                          competitorInputs.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {competitorInputs.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setCompetitorInputs([...competitorInputs, ""])}
                >
                  <Plus className="h-4 w-4" />
                  Add URL
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button
            onClick={handleRunAnalysis}
            disabled={!selectedClient || runAnalysisMutation.isPending}
            className="gap-2"
          >
            {runAnalysisMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Gap Analysis
              </>
            )}
          </Button>
          {runAnalysisMutation.isPending && (
            <p className="text-sm text-muted-foreground">
              Scraping competitor pages and extracting keywords — this may take
              30–60 seconds…
            </p>
          )}
        </div>
      </Card>

      {/* Summary Cards */}
      {selectedClient && gapSummary && gapSummary.totalGaps > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-5 text-center">
            <p className="text-3xl font-bold text-primary">
              {gapSummary.totalGaps}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Gaps</p>
          </Card>
          <Card className="p-5 text-center">
            <p className="text-3xl font-bold text-green-500">
              {gapSummary.easyGaps}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Easy Wins</p>
          </Card>
          <Card className="p-5 text-center">
            <p className="text-3xl font-bold text-yellow-500">
              {gapSummary.mediumGaps}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Medium</p>
          </Card>
          <Card className="p-5 text-center">
            <p className="text-3xl font-bold text-red-500">
              {gapSummary.hardGaps}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Hard</p>
          </Card>
          <Card className="p-5 text-center">
            <p className="text-3xl font-bold text-orange-500">
              {gapSummary.avgOpportunityScore}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Avg Opportunity</p>
          </Card>
        </div>
      )}

      {/* Recent Runs */}
      {selectedClient && runs && runs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Recent Analysis Runs
          </h3>
          <div className="space-y-2">
            {runs.slice(0, 5).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      run.status === "complete"
                        ? "bg-green-100 text-green-700"
                        : run.status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }
                  >
                    {run.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className="font-medium">
                  {run.totalGapKeywords} gap keywords
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Gap Keywords Table */}
      {selectedClient && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Gap Keywords</h2>
                <p className="text-sm text-muted-foreground">
                  Keywords your competitors rank for that you don't
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleExportCSV}
                disabled={!sortedKeywords || sortedKeywords.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Select
                value={difficultyFilter}
                onValueChange={setDifficultyFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy Only</SelectItem>
                  <SelectItem value="medium">Medium Only</SelectItem>
                  <SelectItem value="hard">Hard Only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(v) =>
                  setSortBy(v as "opportunity" | "volume" | "position")
                }
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opportunity">By Opportunity</SelectItem>
                  <SelectItem value="volume">By Search Volume</SelectItem>
                  <SelectItem value="position">By Competitor Rank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {gapLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !sortedKeywords || sortedKeywords.length === 0 ? (
            <div className="text-center py-16">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No gap keywords yet
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Select a client, enter competitor URLs above, and click{" "}
                <strong>Run Gap Analysis</strong> to discover keyword
                opportunities.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">#</th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Keyword
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Competitor
                    </th>
                    <th className="text-center py-3 px-4 font-semibold">
                      Comp. Rank
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Search Vol.
                    </th>
                    <th className="text-center py-3 px-4 font-semibold">
                      Difficulty
                    </th>
                    <th className="text-center py-3 px-4 font-semibold">
                      Opportunity
                    </th>
                    <th className="text-center py-3 px-4 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeywords.map((kw, i) => (
                    <tr
                      key={kw.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-muted-foreground font-medium">
                        {i + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{kw.keyword}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p
                          className="text-sm text-muted-foreground truncate max-w-[160px]"
                          title={kw.competitorUrl}
                        >
                          {kw.competitorUrl.replace(/^https?:\/\//, "")}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-lg font-bold">
                          #{kw.estimatedPosition ?? "?"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {kw.searchVolume?.toLocaleString() ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <DifficultyBadge difficulty={kw.difficulty} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <OpportunityBar score={kw.opportunityScore} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            onClick={() =>
                              handleSuggestContent(kw.keyword, kw.competitorUrl)
                            }
                            disabled={suggestContentMutation.isPending}
                          >
                            {suggestContentMutation.isPending &&
                            briefKeyword?.keyword === kw.keyword ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Lightbulb className="h-3 w-3" />
                            )}
                            Brief
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1 text-xs"
                            onClick={() => handleCreateContent(kw.keyword)}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Create
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* No client selected */}
      {!selectedClient && (
        <Card className="p-16 text-center border-dashed border-2 border-muted">
          <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">
            Select a Client to Begin
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Choose a client above, then enter their competitor URLs to run a
            keyword gap analysis. The AI will scrape each competitor page and
            identify keywords they rank for that your client doesn't.
          </p>
        </Card>
      )}

      {/* Content Brief Dialog */}
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Content Brief: "{briefKeyword?.keyword}"
            </DialogTitle>
          </DialogHeader>
          {suggestContentMutation.isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">
                Generating content brief…
              </p>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">
                {briefContent}
              </pre>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(briefContent);
                toast.success("Brief copied to clipboard");
              }}
            >
              Copy Brief
            </Button>
            <Button onClick={() => setBriefOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
