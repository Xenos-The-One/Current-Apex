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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FORMATS = [
  { value: "social-snippet", label: "Social Media Snippet", icon: "📱" },
  { value: "email-summary", label: "Email Summary", icon: "📧" },
  { value: "short-form", label: "Short Form", icon: "📝" },
  { value: "infographic-script", label: "Infographic Script", icon: "📊" },
  { value: "video-script", label: "Video Script", icon: "🎬" },
];

export default function Repurposing() {
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [platform, setPlatform] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: contentList } = trpc.seo.content.list.useQuery();
  const { data: repurposedList } = trpc.seo.repurposing.getRepurposed.useQuery(
    { contentId: parseInt(selectedContentId) },
    { enabled: !!selectedContentId }
  );

  const generateMutation = trpc.seo.repurposing.generateRepurposed.useMutation();
  const deleteMutation = trpc.seo.repurposing.deleteRepurposed.useMutation();

  const selectedContent = contentList?.find(
    (c) => c.content.id === parseInt(selectedContentId)
  );

  const handleGenerate = async () => {
    if (!selectedContentId || !selectedFormat) {
      toast.error("Please select content and format");
      return;
    }

    try {
      toast.info("Generating repurposed content... This may take a moment");
      await generateMutation.mutateAsync({
        contentId: parseInt(selectedContentId),
        format: selectedFormat as any,
        originalContent: selectedContent?.content.content || "",
        platform: platform || undefined,
      });
      setSelectedFormat("");
      setPlatform("");
      toast.success("Content repurposed successfully!");
    } catch (error) {
      toast.error("Failed to generate repurposed content");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this repurposed content?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Content Repurposing</h1>
        <p className="text-muted-foreground mt-2">
          Transform your blog posts into multiple formats for different channels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Generate Repurposed Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="content-select">Select Content</Label>
                <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose content..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contentList?.map((item) => (
                      <SelectItem
                        key={item.content.id}
                        value={item.content.id.toString()}
                      >
                        {item.content.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedContentId && (
                <>
                  <div>
                    <Label htmlFor="format">Output Format</Label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose format..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.icon} {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="platform">Platform (Optional)</Label>
                    <Input
                      id="platform"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      placeholder="e.g., LinkedIn, Twitter, Instagram"
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending || !selectedFormat}
                    className="w-full"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Format Guide */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Format Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {FORMATS.map((f) => (
                  <div key={f.value} className="text-sm">
                    <p className="font-medium">{f.icon} {f.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.value === "social-snippet" && "Concise, shareable posts for social media"}
                      {f.value === "email-summary" && "Compelling email content with CTAs"}
                      {f.value === "short-form" && "Quick-read version for mobile"}
                      {f.value === "infographic-script" && "Visual content outline and talking points"}
                      {f.value === "video-script" && "Full script for video production"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Repurposed Content List */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generated Versions</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedContentId ? (
                <p className="text-sm text-muted-foreground">
                  Select content to view repurposed versions
                </p>
              ) : repurposedList?.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No repurposed content yet. Generate some!
                </p>
              ) : (
                <div className="space-y-3">
                  {repurposedList?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {FORMATS.find((f) => f.value === item.format)?.label}
                          </p>
                          {item.platform && (
                            <p className="text-xs text-muted-foreground">
                              {item.platform}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {item.content}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCopy(item.content)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
