import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Search,
  MessageCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function ScoreGauge({ score, label, icon: Icon, details }: {
  score: number;
  label: string;
  icon: any;
  details?: string | null;
}) {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-400";
    if (s >= 60) return "text-yellow-400";
    if (s >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getProgressColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    if (s >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getIcon = (s: number) => {
    if (s >= 80) return CheckCircle;
    if (s >= 60) return AlertTriangle;
    return XCircle;
  };

  const StatusIcon = getIcon(score);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${getColor(score)}`} />
            <span className={`text-2xl font-bold ${getColor(score)}`}>{score}</span>
          </div>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${getProgressColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        {details && (
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{details}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function QualityScore() {
  const [selectedContentId, setSelectedContentId] = useState<string>("");

  const { data: contentList } = trpc.seo.content.list.useQuery();
  const { data: qualityScore, refetch: refetchScore } = trpc.seo.qualityScore.getScore.useQuery(
    { contentId: parseInt(selectedContentId) },
    { enabled: !!selectedContentId }
  );
  const analyzeMutation = trpc.seo.qualityScore.analyze.useMutation();

  const selectedContent = contentList?.find(
    (c) => c.content.id === parseInt(selectedContentId)
  );

  const handleAnalyze = async () => {
    if (!selectedContentId) return;
    try {
      await analyzeMutation.mutateAsync({ contentId: parseInt(selectedContentId) });
      toast.success("Quality analysis complete!");
      refetchScore();
    } catch {
      toast.error("Failed to analyze content quality");
    }
  };

  const suggestions = qualityScore?.suggestions
    ? (() => {
        try {
          return JSON.parse(qualityScore.suggestions);
        } catch {
          return [];
        }
      })()
    : [];

  const getOverallGrade = (score: number) => {
    if (score >= 90) return { grade: "A+", color: "text-green-400", bg: "bg-green-500/10" };
    if (score >= 80) return { grade: "A", color: "text-green-400", bg: "bg-green-500/10" };
    if (score >= 70) return { grade: "B", color: "text-yellow-400", bg: "bg-yellow-500/10" };
    if (score >= 60) return { grade: "C", color: "text-orange-400", bg: "bg-orange-500/10" };
    if (score >= 50) return { grade: "D", color: "text-red-400", bg: "bg-red-500/10" };
    return { grade: "F", color: "text-red-500", bg: "bg-red-500/10" };
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Sparkles className="h-8 w-8" />
          Content Quality Scoring
        </h1>
        <p className="text-muted-foreground mt-2">
          AI-powered analysis of readability, SEO optimization, tone consistency, and engagement potential
        </p>
      </div>

      {/* Content Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium mb-2">Select Content to Analyze</label>
              <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose content..." />
                </SelectTrigger>
                <SelectContent>
                  {contentList?.map((item) => (
                    <SelectItem key={item.content.id} value={item.content.id.toString()}>
                      {item.content.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedContentId && (
              <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
                {analyzeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : qualityScore ? (
                  <RefreshCw className="h-4 w-4 mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {qualityScore ? "Re-analyze" : "Analyze Quality"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {analyzeMutation.isPending && (
        <Card className="mb-6">
          <CardContent className="pt-6 text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-foreground font-medium">Analyzing content quality...</p>
            <p className="text-sm text-muted-foreground mt-2">
              AI is evaluating readability, SEO, tone, and engagement
            </p>
          </CardContent>
        </Card>
      )}

      {selectedContentId && qualityScore && !analyzeMutation.isPending && (
        <>
          {/* Overall Score */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-8">
                <div
                  className={`w-28 h-28 rounded-full flex items-center justify-center ${
                    getOverallGrade(qualityScore.overallScore).bg
                  } border-2 border-border`}
                >
                  <div className="text-center">
                    <p
                      className={`text-4xl font-bold ${
                        getOverallGrade(qualityScore.overallScore).color
                      }`}
                    >
                      {getOverallGrade(qualityScore.overallScore).grade}
                    </p>
                    <p className="text-xs text-muted-foreground">{qualityScore.overallScore}/100</p>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">
                    {selectedContent?.content.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Overall quality score based on readability, SEO, tone, and engagement analysis
                  </p>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Analyzed:</span>{" "}
                      <span className="font-medium">
                        {new Date(qualityScore.analyzedAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <span className="font-medium capitalize">
                        {selectedContent?.content.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ScoreGauge
              score={qualityScore.readabilityScore}
              label="Readability"
              icon={BookOpen}
              details={qualityScore.readabilityDetails}
            />
            <ScoreGauge
              score={qualityScore.seoScore}
              label="SEO Optimization"
              icon={Search}
              details={qualityScore.seoDetails}
            />
            <ScoreGauge
              score={qualityScore.toneScore}
              label="Tone Consistency"
              icon={MessageCircle}
              details={qualityScore.toneDetails}
            />
            <ScoreGauge
              score={qualityScore.engagementScore}
              label="Engagement Potential"
              icon={Sparkles}
              details={qualityScore.engagementDetails}
            />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  Improvement Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestions.map((suggestion: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      <p className="text-sm leading-relaxed">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedContentId && !qualityScore && !analyzeMutation.isPending && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No quality analysis available yet</p>
            <p className="text-sm text-muted-foreground">
              Click "Analyze Quality" to run an AI-powered quality assessment
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedContentId && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select content above to analyze its quality</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
