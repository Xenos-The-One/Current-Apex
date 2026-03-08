import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Trophy, FileText, Zap, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const MODEL_NAMES: Record<string, string> = {
  "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
  "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
};

export default function ABTesting() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    topic: "",
    customPrompt: "",
    modelA: "claude-3-5-sonnet-20241022",
    modelB: "gemini-2.5-flash",
  });

  const { data: tests, isLoading, refetch } = trpc.seo.abTests.list.useQuery();
  const { data: clients } = trpc.seo.clients.list.useQuery();
  const createMutation = trpc.seo.abTests.create.useMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.topic) {
      toast.error("Please select a client and enter a topic");
      return;
    }
    try {
      toast.info("Creating A/B test... This may take a moment");
      await createMutation.mutateAsync({
        clientId: parseInt(formData.clientId),
        topic: formData.topic,
        customPrompt: formData.customPrompt || undefined,
        enableWebResearch: false,
        shouldGenerateImage: false,
        modelA: formData.modelA,
        modelB: formData.modelB,
      });
      toast.success("A/B test created successfully!");
      setIsCreateOpen(false);
      setFormData({ clientId: "", topic: "", customPrompt: "", modelA: "claude-3-5-sonnet-20241022", modelB: "gemini-2.5-flash" });
      refetch();
    } catch {
      toast.error("Failed to create A/B test");
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground mt-2">Compare AI models side-by-side to find the best output</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New A/B Test</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create A/B Test</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="client">Client</Label>
                <Select value={formData.clientId} onValueChange={(val) => setFormData({ ...formData, clientId: val })}>
                  <SelectTrigger id="client"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} placeholder="Enter blog post topic" />
              </div>
              <div>
                <Label htmlFor="customPrompt">Custom Prompt (Optional)</Label>
                <Textarea id="customPrompt" value={formData.customPrompt} onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })} placeholder="Add custom instructions for the AI" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="modelA">Model A</Label>
                  <Select value={formData.modelA} onValueChange={(val) => setFormData({ ...formData, modelA: val })}>
                    <SelectTrigger id="modelA"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODEL_NAMES).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="modelB">Model B</Label>
                  <Select value={formData.modelB} onValueChange={(val) => setFormData({ ...formData, modelB: val })}>
                    <SelectTrigger id="modelB"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODEL_NAMES).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create Test"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">Loading tests...</p>
        </div>
      ) : tests && tests.length > 0 ? (
        <div className="space-y-6">
          {tests.map((item) => (
            <ABTestCard key={item.test.id} test={item.test} client={item.client} onUpdate={refetch} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No A/B tests yet</h3>
            <p className="text-muted-foreground mb-4">Create your first A/B test to compare AI models</p>
            <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New A/B Test</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// A/B Test Card Component
function ABTestCard({ test, client, onUpdate }: { test: any; client: any; onUpdate: () => void }) {
  const [showComparison, setShowComparison] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<{ text: string; recommendedWinner: string | null } | null>(null);
  const setWinnerMutation = trpc.seo.abTests.setWinner.useMutation();
  const analyzeMutation = trpc.seo.abTests.analyzeWinner.useMutation();

  const handleSetWinner = async (winner: "A" | "B") => {
    try {
      await setWinnerMutation.mutateAsync({ id: test.id, winner });
      toast.success(`Version ${winner} selected as winner!`);
      onUpdate();
    } catch {
      toast.error("Failed to set winner");
    }
  };

  const handleAnalyze = async () => {
    try {
      toast.info("Analyzing both versions with AI...");
      const result = await analyzeMutation.mutateAsync({ id: test.id });
      setAnalysis({ text: result.analysis, recommendedWinner: result.recommendedWinner });
      setShowAnalysis(true);
    } catch {
      toast.error("Failed to analyze versions");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{test.topic}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Client: {client?.name || "Unknown"}</p>
          </div>
          <div className="flex items-center gap-2">
            {test.winner !== "none" && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Winner: Version {test.winner}</span>
              </div>
            )}
            {analysis?.recommendedWinner && (
              <Badge variant="outline" className="border-blue-500/40 text-blue-400">
                <Brain className="h-3 w-3 mr-1" />
                AI Recommends: {analysis.recommendedWinner}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats comparison grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {[
            { label: "A", model: test.modelA, words: test.wordCountA, time: test.generationTimeMsA, tokensIn: test.inputTokensA, tokensOut: test.outputTokensA, isWinner: test.winner === "A", isRecommended: analysis?.recommendedWinner === "A" },
            { label: "B", model: test.modelB, words: test.wordCountB, time: test.generationTimeMsB, tokensIn: test.inputTokensB, tokensOut: test.outputTokensB, isWinner: test.winner === "B", isRecommended: analysis?.recommendedWinner === "B" },
          ].map((v) => (
            <div key={v.label} className={`p-4 rounded-lg border ${v.isWinner ? "bg-yellow-500/5 border-yellow-500/30" : v.isRecommended ? "bg-blue-500/5 border-blue-500/30" : "bg-muted/30 border-border/50"}`}>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${v.label === "A" ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"}`}>{v.label}</span>
                {MODEL_NAMES[v.model] || v.model}
                {v.isWinner && <Trophy className="h-4 w-4 text-yellow-400 ml-auto" />}
                {!v.isWinner && v.isRecommended && <Brain className="h-4 w-4 text-blue-400 ml-auto" />}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Words:</span><span className="font-medium">{v.words}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Time:</span><span className="font-medium">{((v.time ?? 0) / 1000).toFixed(1)}s</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tokens:</span><span className="font-medium">{(v.tokensIn ?? 0) + (v.tokensOut ?? 0)}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowComparison(!showComparison)}>
            <FileText className="h-4 w-4 mr-2" />
            {showComparison ? "Hide" : "View"} Comparison
          </Button>
          <Button variant="outline" onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
            {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
            {analyzeMutation.isPending ? "Analyzing..." : "AI Analyze"}
          </Button>
          {analysis && (
            <Button variant="outline" onClick={() => setShowAnalysis(!showAnalysis)}>
              {showAnalysis ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
              {showAnalysis ? "Hide" : "Show"} Analysis
            </Button>
          )}
          {test.winner === "none" && (
            <>
              <Button variant="outline" onClick={() => handleSetWinner("A")} disabled={setWinnerMutation.isPending}>
                <Trophy className="h-4 w-4 mr-2" />Choose A
              </Button>
              <Button variant="outline" onClick={() => handleSetWinner("B")} disabled={setWinnerMutation.isPending}>
                <Trophy className="h-4 w-4 mr-2" />Choose B
              </Button>
            </>
          )}
        </div>

        {/* AI Analysis panel */}
        {showAnalysis && analysis && (
          <div className="mt-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-400">
              <Brain className="h-4 w-4" />
              AI Analysis
              {analysis.recommendedWinner && (
                <Badge className="ml-auto bg-blue-500/20 text-blue-300 border-blue-500/30">
                  Recommends Version {analysis.recommendedWinner}
                </Badge>
              )}
            </h4>
            <div className="prose prose-sm max-w-none text-foreground">
              <Streamdown>{analysis.text}</Streamdown>
            </div>
          </div>
        )}

        {/* Content comparison */}
        {showComparison && (
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-primary/20 text-primary text-xs font-bold">A</span>
                {test.titleA}
              </h4>
              <div className="prose prose-sm max-w-none"><Streamdown>{test.contentA}</Streamdown></div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-secondary/20 text-secondary text-xs font-bold">B</span>
                {test.titleB}
              </h4>
              <div className="prose prose-sm max-w-none"><Streamdown>{test.contentB}</Streamdown></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
