import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function BulkGeneration() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    topics: "",
    customPrompt: "",
    aiModel: "gemini-2.5-flash",
    shouldGenerateImage: true,
    enableWebResearch: true,
  });
  const [results, setResults] = useState<any>(null);

  const { data: clients } = trpc.seo.clients.list.useQuery();
  const { data: settings } = trpc.seo.agencySettings.getAll.useQuery();
  const bulkMutation = trpc.seo.bulk.generate.useMutation();

  // Update default AI model when settings load
  useEffect(() => {
    if (settings?.default_ai_model && formData.aiModel === "gemini-2.5-flash") {
      setFormData(prev => ({ ...prev, aiModel: settings.default_ai_model }));
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.topics) {
      toast.error("Please select a client and enter topics");
      return;
    }

    const topicsList = formData.topics
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (topicsList.length === 0) {
      toast.error("Please enter at least one topic");
      return;
    }

    try {
      toast.info(`Generating ${topicsList.length} blog posts... This may take a while`);
      const result = await bulkMutation.mutateAsync({
        clientId: parseInt(formData.clientId),
        topics: topicsList,
        customPrompt: formData.customPrompt || undefined,
        aiModel: formData.aiModel,
        shouldGenerateImage: formData.shouldGenerateImage,
        enableWebResearch: formData.enableWebResearch,
      });
      setResults(result);
      toast.success(`Successfully generated ${result.totalGenerated} posts!`);
    } catch (error) {
      toast.error("Failed to generate content");
      console.error(error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Generation</h1>
          <p className="text-muted-foreground mt-2">
            Generate multiple blog posts at once
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Start Bulk Generation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Generate Content</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="client">Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, clientId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="topics">Topics (one per line) *</Label>
                <Textarea
                  id="topics"
                  value={formData.topics}
                  onChange={(e) =>
                    setFormData({ ...formData, topics: e.target.value })
                  }
                  placeholder="Topic 1&#10;Topic 2&#10;Topic 3"
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter each topic on a new line
                </p>
              </div>
              <div>
                <Label htmlFor="customPrompt">Custom Prompt (Optional)</Label>
                <Textarea
                  id="customPrompt"
                  value={formData.customPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, customPrompt: e.target.value })
                  }
                  placeholder="Add specific instructions for the AI..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="aiModel">AI Model</Label>
                <Select
                  value={formData.aiModel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, aiModel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (High Quality)</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Balanced)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Cost-Effective)</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Claude models excel at creative writing, GPT models are versatile, Gemini models are cost-effective
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generateImage"
                  checked={formData.shouldGenerateImage}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, shouldGenerateImage: checked as boolean })
                  }
                />
                <Label htmlFor="generateImage" className="cursor-pointer">
                  Generate featured images
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="webResearch"
                  checked={formData.enableWebResearch}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableWebResearch: checked as boolean })
                  }
                />
                <Label htmlFor="webResearch" className="cursor-pointer">
                  Enable web research for accuracy
                </Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={bulkMutation.isPending}>
                  {bulkMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Generation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-accent rounded-lg">
              <p className="text-sm font-medium">
                Successfully generated: <span className="text-lg font-bold">{results.totalGenerated}</span> / {results.results.length} posts
              </p>
            </div>
            <div className="space-y-2">
              {results.results.map((result: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border"
                >
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{result.topic}</p>
                    {result.success ? (
                      <p className="text-xs text-muted-foreground">
                        Content ID: {result.contentId}
                      </p>
                    ) : (
                      <p className="text-xs text-red-500">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
