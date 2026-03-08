import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, BarChart3, Sparkles, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function KeywordResearch() {
  const [topic, setTopic] = useState(() => {
    // Pre-fill topic from ?topic= query param (used by ContentDetail shortcut)
    const params = new URLSearchParams(window.location.search);
    return params.get("topic") ?? "";
  });
  const [autoSearched, setAutoSearched] = useState(false);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [targetKeywords, setTargetKeywords] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  const suggestMutation = trpc.seo.keywords.suggest.useMutation();
  const analyzeMutation = trpc.seo.keywords.analyze.useMutation();
  const optimizeMutation = trpc.seo.keywords.optimize.useMutation();

  // Auto-trigger search if topic was pre-filled from URL params
  useEffect(() => {
    if (topic.trim() && !autoSearched) {
      setAutoSearched(true);
      suggestMutation.mutateAsync({ topic, count: 15 })
        .then((results) => {
          setKeywords(results);
          toast.success(`Found ${results.length} keywords for "${topic}"`);
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSuggest = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    try {
      const results = await suggestMutation.mutateAsync({ topic, count: 15 });
      setKeywords(results);
      toast.success(`Found ${results.length} keyword suggestions`);
    } catch (error) {
      toast.error("Failed to get keyword suggestions");
    }
  };

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error("Please enter content to analyze");
      return;
    }

    if (targetKeywords.length === 0) {
      toast.error("Please add at least one target keyword");
      return;
    }

    try {
      const result = await analyzeMutation.mutateAsync({ content, targetKeywords });
      setAnalysis(result);
      toast.success("Content analyzed successfully");
    } catch (error) {
      toast.error("Failed to analyze content");
    }
  };

  const handleOptimize = async () => {
    if (!content.trim()) {
      toast.error("Please enter content to optimize");
      return;
    }

    if (targetKeywords.length === 0) {
      toast.error("Please add at least one target keyword");
      return;
    }

    try {
      const optimized = await optimizeMutation.mutateAsync({ content, targetKeywords });
      setContent(optimized);
      toast.success("Content optimized for target keywords");
      // Re-analyze after optimization
      handleAnalyze();
    } catch (error) {
      toast.error("Failed to optimize content");
    }
  };

  const addKeyword = (keyword: string) => {
    if (!targetKeywords.includes(keyword)) {
      setTargetKeywords([...targetKeywords, keyword]);
      toast.success(`Added "${keyword}" to target keywords`);
    }
  };

  const removeKeyword = (keyword: string) => {
    setTargetKeywords(targetKeywords.filter(k => k !== keyword));
  };

  const copyKeyword = (keyword: string) => {
    navigator.clipboard.writeText(keyword);
    setCopiedKeyword(keyword);
    setTimeout(() => setCopiedKeyword(null), 2000);
    toast.success("Keyword copied to clipboard");
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 30) return "bg-green-500";
    if (difficulty < 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty < 30) return "Easy";
    if (difficulty < 60) return "Medium";
    return "Hard";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Keyword Research & SEO Optimization</h1>
        <p className="text-muted-foreground mt-2">
          Discover high-value keywords and optimize your content for better search rankings
        </p>
      </div>

      <Tabs defaultValue="research" className="space-y-6">
        <TabsList>
          <TabsTrigger value="research">
            <Search className="h-4 w-4 mr-2" />
            Keyword Research
          </TabsTrigger>
          <TabsTrigger value="optimize">
            <Sparkles className="h-4 w-4 mr-2" />
            Content Optimization
          </TabsTrigger>
        </TabsList>

        {/* Keyword Research Tab */}
        <TabsContent value="research" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="topic">Topic or Seed Keyword</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="topic"
                    placeholder="e.g., content marketing, SEO strategies, social media tips"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
                  />
                  <Button onClick={handleSuggest} disabled={suggestMutation.isPending}>
                    {suggestMutation.isPending ? "Searching..." : "Get Suggestions"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {keywords.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Keyword Suggestions</h3>
              <div className="space-y-3">
                {keywords.map((kw, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{kw.keyword}</span>
                        <Badge variant="outline" className={`${getDifficultyColor(kw.difficulty)} text-white`}>
                          {getDifficultyLabel(kw.difficulty)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{kw.searchVolume.toLocaleString()} searches/mo</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          <span>Difficulty: {kw.difficulty}/100</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-4 w-4" />
                          <span>Relevance: {kw.relevance}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyKeyword(kw.keyword)}
                      >
                        {copiedKeyword === kw.keyword ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => addKeyword(kw.keyword)}
                        disabled={targetKeywords.includes(kw.keyword)}
                      >
                        {targetKeywords.includes(kw.keyword) ? "Added" : "Add to Target"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Content Optimization Tab */}
        <TabsContent value="optimize" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label>Target Keywords</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-4">
                  {targetKeywords.map((kw, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {kw}
                      <button
                        onClick={() => removeKeyword(kw)}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {targetKeywords.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No target keywords yet. Add keywords from the Research tab.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="content">Content to Optimize</Label>
                <Textarea
                  id="content"
                  placeholder="Paste your content here to analyze and optimize for target keywords..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
                  {analyzeMutation.isPending ? "Analyzing..." : "Analyze Content"}
                </Button>
                <Button onClick={handleOptimize} disabled={optimizeMutation.isPending} variant="default">
                  {optimizeMutation.isPending ? "Optimizing..." : "Auto-Optimize"}
                </Button>
              </div>
            </div>
          </Card>

          {analysis && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">SEO Analysis Results</h3>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">SEO Score</span>
                  <span className="text-2xl font-bold">{analysis.score}/100</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      analysis.score >= 70 ? "bg-green-500" :
                      analysis.score >= 40 ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Keyword Density</h4>
                  <div className="space-y-2">
                    {Object.entries(analysis.keywordDensity).map(([keyword, density]: [string, any]) => (
                      <div key={keyword} className="flex items-center justify-between text-sm">
                        <span>{keyword}</span>
                        <span className={`font-medium ${
                          density === 0 ? "text-red-500" :
                          density < 0.5 ? "text-yellow-500" :
                          density > 3 ? "text-red-500" :
                          "text-green-500"
                        }`}>
                          {density.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {analysis.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Optimization Suggestions</h4>
                    <ul className="space-y-2">
                      {analysis.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
