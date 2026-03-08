import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, FileText, Loader2, Image as ImageIcon, Trash2, RefreshCw, CheckSquare, ZoomIn, Star, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Content() {
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterRanking, setFilterRanking] = useState<string>("all");
  const [filterContentType, setFilterContentType] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const CONTENT_TYPES = [
    { value: "blog-post",          label: "Blog Post",            group: "SEO Content" },
    { value: "how-to",             label: "How-To Guide",         group: "SEO Content" },
    { value: "listicle",           label: "Listicle",             group: "SEO Content" },
    { value: "case-study",         label: "Case Study",           group: "SEO Content" },
    { value: "guide",              label: "Ultimate Guide",       group: "SEO Content" },
    { value: "news",               label: "News Article",         group: "SEO Content" },
    { value: "newsletter",         label: "Newsletter",           group: "Email" },
    { value: "email-sequence",     label: "Email Sequence (5-part)", group: "Email" },
    { value: "social-post",        label: "Social Media Post",   group: "Social" },
    { value: "press-release",      label: "Press Release",        group: "PR" },
    { value: "landing-page",       label: "Landing Page Copy",   group: "Web Copy" },
    { value: "product-description",label: "Product Description",  group: "Web Copy" },
    { value: "video-script",       label: "Video Script",         group: "Video" },
    { value: "whitepaper",         label: "Whitepaper",           group: "Long-form" },
  ];
  const SOCIAL_SUBTYPES = [
    { value: "linkedin", label: "LinkedIn" },
    { value: "twitter", label: "Twitter / X" },
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "tiktok", label: "TikTok" },
  ];
  const [formData, setFormData] = useState({
    clientId: "",
    topic: "",
    customPrompt: "",
    aiModel: "gemini-2.5-flash",
    shouldGenerateImage: true,
    enableWebResearch: true,
    contentType: "blog-post",
    contentSubtype: "",
  });

  const { data: contentList, isLoading, refetch } = trpc.seo.content.list.useQuery();
  const { data: clients } = trpc.seo.clients.list.useQuery();
  const { data: settings } = trpc.seo.agencySettings.getAll.useQuery();
  const generateMutation = trpc.seo.content.generate.useMutation();

  // Update default AI model when settings load
  useEffect(() => {
    if (settings?.default_ai_model && formData.aiModel === "gemini-2.5-flash") {
      setFormData(prev => ({ ...prev, aiModel: settings.default_ai_model }));
    }
  }, [settings]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.topic) {
      toast.error("Please select a client and enter a topic");
      return;
    }

    try {
      toast.info("Generating content... This may take a moment");
      await generateMutation.mutateAsync({
        clientId: parseInt(formData.clientId),
        topic: formData.topic,
        customPrompt: formData.customPrompt || undefined,
        aiModel: formData.aiModel,
        shouldGenerateImage: formData.shouldGenerateImage,
        enableWebResearch: formData.enableWebResearch,
        contentType: formData.contentType as any,
        contentSubtype: formData.contentSubtype || undefined,
      });
      toast.success("Content generated successfully!");
      setIsGenerateOpen(false);
      setFormData({
        clientId: "",
        topic: "",
        customPrompt: "",
        aiModel: "gemini-2.5-flash",
        shouldGenerateImage: true,
        enableWebResearch: true,
        contentType: "blog-post",
        contentSubtype: "",
      });
      refetch();
    } catch (error) {
      toast.error("Failed to generate content");
    }
  };

  const filteredContent = contentList?.filter((item) => {
    if (filterStatus !== "all" && item.content.status !== filterStatus) return false;
    if (filterClient !== "all" && item.content.clientId.toString() !== filterClient) return false;
    if (filterRanking !== "all") {
      const score = (item as any).qualityScore ?? null;
      if (filterRanking === "high" && (score == null || score < 70)) return false;
      if (filterRanking === "medium" && (score == null || score < 40 || score >= 70)) return false;
      if (filterRanking === "low" && (score == null || score >= 40)) return false;
      if (filterRanking === "unscored" && score != null) return false;
    }
    if (filterContentType !== "all") {
      const ct = (item.content as any).contentType || "blog-post";
      if (ct !== filterContentType) return false;
    }
    return true;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content</h1>
          <p className="text-muted-foreground mt-2">
            AI-generated content: blogs, newsletters, email sequences, social posts, press releases, landing pages, video scripts, whitepapers, and more
          </p>
        </div>
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate New Content</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-4">
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
                <Label>Content Type *</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(v) => setFormData({ ...formData, contentType: v, contentSubtype: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(CONTENT_TYPES.map(t => t.group))).map(group => (
                      <div key={group}>
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group}</div>
                        {CONTENT_TYPES.filter(t => t.group === group).map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.contentType === "social-post" && (
                <div>
                  <Label>Platform</Label>
                  <Select
                    value={formData.contentSubtype}
                    onValueChange={(v) => setFormData({ ...formData, contentSubtype: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOCIAL_SUBTYPES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="topic">Topic / Subject *</Label>
                <Input
                  id="topic"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData({ ...formData, topic: e.target.value })
                  }
                  placeholder="e.g., The Future of AI in Marketing"
                  required
                />
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
                  Generate featured image
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
                  Enable web research for accurate data
                </Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? (
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
                  onClick={() => setIsGenerateOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <BulkStatusChange selectedIds={selectedIds} onSuccess={() => { setSelectedIds([]); refetch(); }} />
            <BulkRegenerate selectedIds={selectedIds} onSuccess={() => { setSelectedIds([]); refetch(); }} />
            <BulkDelete selectedIds={selectedIds} onSuccess={() => { setSelectedIds([]); refetch(); }} />
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by client" />
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
        <Select value={filterRanking} onValueChange={setFilterRanking}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by ranking" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rankings</SelectItem>
            <SelectItem value="high">High (70+)</SelectItem>
            <SelectItem value="medium">Medium (40–69)</SelectItem>
            <SelectItem value="low">Low (&lt;40)</SelectItem>
            <SelectItem value="unscored">Not Scored</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterContentType} onValueChange={setFilterContentType}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Array.from(new Set(CONTENT_TYPES.map(t => t.group))).map(group => (
              <div key={group}>
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group}</div>
                {CONTENT_TYPES.filter(t => t.group === group).map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
        {(filterStatus !== "all" || filterClient !== "all" || filterRanking !== "all" || filterContentType !== "all") && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterStatus("all"); setFilterClient("all"); setFilterRanking("all"); setFilterContentType("all"); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">Loading content...</p>
        </div>
      ) : filteredContent && filteredContent.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredContent.map((item) => (
            <Card key={item.content.id} className="hover:shadow-lg transition-shadow relative">
              <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(item.content.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds([...selectedIds, item.content.id]);
                    } else {
                      setSelectedIds(selectedIds.filter(id => id !== item.content.id));
                    }
                  }}
                />
              </div>
              <Link href={`/seo/content/${item.content.id}`}>
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Thumbnail with lightbox trigger */}
                    <div
                      className="relative flex-shrink-0 w-40 h-28 rounded-lg overflow-hidden group cursor-pointer"
                      onClick={(e) => {
                        if (item.content.imageUrl) {
                          e.preventDefault();
                          e.stopPropagation();
                          setLightboxUrl(item.content.imageUrl);
                        }
                      }}
                    >
                      {item.content.imageUrl ? (
                        <>
                          <img
                            src={item.content.imageUrl}
                            alt={item.content.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold truncate">
                          {item.content.title}
                        </h3>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          {(item as any).qualityScore != null && (
                            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${
                              (item as any).qualityScore >= 70 ? "bg-green-100 text-green-700" :
                              (item as any).qualityScore >= 40 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              <Star className="h-3 w-3" />
                              {(item as any).qualityScore}
                            </span>
                          )}
                          <span
                            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
                              item.content.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : item.content.status === "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.content.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm text-muted-foreground">
                          Client: {item.client?.name || "Unknown"}
                        </p>
                        {(item.content as any).contentType && (item.content as any).contentType !== "blog-post" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                            {(item.content as any).contentType.replace(/-/g, " ")}
                            {(item.content as any).contentSubtype ? ` · ${(item.content as any).contentSubtype}` : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.content.topic}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Tokens: {item.content.totalTokens}</span>
                        {item.content.webSearches > 0 && (
                          <span>Research: {item.content.urlsFetched} URLs</span>
                        )}
                        <span>Progress: {item.content.progress}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No content yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first AI-powered blog post
            </p>
            <Button onClick={() => setIsGenerateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Content
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={lightboxUrl}
              alt="Full size preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Bulk Delete Component
function BulkDelete({ selectedIds, onSuccess }: { selectedIds: number[]; onSuccess: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const deleteMutation = trpc.seo.content.delete.useMutation();

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await deleteMutation.mutateAsync({ id });
      }
      toast.success(`${selectedIds.length} item(s) deleted successfully`);
      setShowConfirm(false);
      onSuccess();
    } catch {
      toast.error("Failed to delete items");
    }
  };

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)}>
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Confirm Bulk Delete</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete {selectedIds.length} item(s)? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// Bulk Status Change Component
function BulkStatusChange({ selectedIds, onSuccess }: { selectedIds: number[]; onSuccess: () => void }) {
  const [showDialog, setShowDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<"draft" | "in_progress" | "approved">("draft");
  const updateMutation = trpc.seo.content.update.useMutation();

  const handleBulkStatusChange = async () => {
    try {
      for (const id of selectedIds) {
        await updateMutation.mutateAsync({ id, status: newStatus });
      }
      toast.success(`${selectedIds.length} item(s) status updated to ${newStatus}`);
      setShowDialog(false);
      onSuccess();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
        <CheckSquare className="h-4 w-4 mr-2" />
        Change Status
      </Button>
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Bulk Status Change</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-status">New Status</Label>
                  <Select value={newStatus} onValueChange={(val: any) => setNewStatus(val)}>
                    <SelectTrigger id="bulk-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will update {selectedIds.length} item(s) to {newStatus} status.
                </p>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkStatusChange} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  )}
                  Update Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// Bulk Regenerate Component
function BulkRegenerate({ selectedIds, onSuccess }: { selectedIds: number[]; onSuccess: () => void }) {
  const [showDialog, setShowDialog] = useState(false);
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
  const [enableWebResearch, setEnableWebResearch] = useState(false);
  const [shouldGenerateImage, setShouldGenerateImage] = useState(false);
  const regenerateMutation = trpc.seo.content.regenerate.useMutation();

  const handleBulkRegenerate = async () => {
    try {
      toast.info(`Regenerating ${selectedIds.length} item(s)... This may take a while`);
      for (const id of selectedIds) {
        await regenerateMutation.mutateAsync({
          id,
          aiModel,
          enableWebResearch,
          shouldGenerateImage,
        });
      }
      toast.success(`${selectedIds.length} item(s) regenerated successfully`);
      setShowDialog(false);
      onSuccess();
    } catch {
      toast.error("Failed to regenerate items");
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Regenerate
      </Button>
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Bulk Regenerate</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-model">AI Model</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger id="bulk-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bulk-research"
                    checked={enableWebResearch}
                    onCheckedChange={(checked: boolean) => setEnableWebResearch(checked)}
                  />
                  <Label htmlFor="bulk-research" className="cursor-pointer">
                    Enable web research
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bulk-image"
                    checked={shouldGenerateImage}
                    onCheckedChange={(checked: boolean) => setShouldGenerateImage(checked)}
                  />
                  <Label htmlFor="bulk-image" className="cursor-pointer">
                    Generate new images
                  </Label>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-400">
                    Warning: This will regenerate {selectedIds.length} item(s). This may take several minutes.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkRegenerate} disabled={regenerateMutation.isPending}>
                  {regenerateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
