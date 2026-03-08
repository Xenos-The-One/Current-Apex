import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Plus,
  Trash2,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Webhook,
  ExternalLink,
  RefreshCw,
  Zap,
  Eye,
  Info,
  Calendar,
  ListOrdered,
  Search,
  AlertTriangle,
  CheckCircle2,
  Image,
  Wand2,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const platformConfig: Record<string, { label: string; color: string; icon: string; description: string; urlHint: string; authHint: string }> = {
  wordpress: {
    label: "WordPress",
    color: "bg-blue-500/20 text-blue-400",
    icon: "W",
    description: "WordPress REST API v2. Posts are created as drafts with SEO meta, excerpts, and slugs.",
    urlHint: "https://yoursite.com/wp-json/wp/v2/posts",
    authHint: "Use Application Password: Basic base64(user:app_password) or JWT Bearer token",
  },
  ghost: {
    label: "Ghost",
    color: "bg-purple-500/20 text-purple-400",
    icon: "G",
    description: "Ghost Admin API. Posts include HTML content, feature images, tags, and SEO metadata.",
    urlHint: "https://yoursite.com/ghost/api/admin/posts/",
    authHint: "Admin API Key in id:secret format, or use custom auth header",
  },
  webflow: {
    label: "Webflow",
    color: "bg-indigo-500/20 text-indigo-400",
    icon: "Wf",
    description: "Webflow CMS API v2. Items are created with fieldData including body, summary, and images.",
    urlHint: "https://api.webflow.com/v2/collections/{collection_id}/items",
    authHint: "Webflow API Bearer token from site settings",
  },
  custom: {
    label: "Custom API",
    color: "bg-gray-500/20 text-gray-400",
    icon: "C",
    description: "Generic JSON POST. Sends title, content (markdown + HTML), image URL, and metadata.",
    urlHint: "https://api.example.com/posts",
    authHint: "Bearer token or custom Authorization header",
  },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  success: { label: "Published", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

export default function Publishing() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>("");
  const [publishAsDraft, setPublishAsDraft] = useState(true);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [queueSelections, setQueueSelections] = useState<Record<number, { webhookId: string; scheduledDate: string }>>({});
  const [publishingQueue, setPublishingQueue] = useState<number[]>([]);
  const [newWebhook, setNewWebhook] = useState({
    clientId: "",
    name: "",
    platform: "wordpress" as "wordpress" | "ghost" | "webflow" | "custom",
    endpointUrl: "",
    apiKey: "",
    authHeader: "",
  });

  const { data: webhooks, refetch: refetchWebhooks } = trpc.seo.webhooks.list.useQuery();
  const { data: contentList } = trpc.seo.content.list.useQuery();
  const { data: clientsList } = trpc.seo.clients.list.useQuery();
  const { data: publishLogs, refetch: refetchLogs } = trpc.seo.webhooks.getLogs.useQuery(
    { contentId: parseInt(selectedContentId) },
    { enabled: !!selectedContentId && !isNaN(parseInt(selectedContentId)) }
  );
  const { data: payloadPreview } = trpc.seo.webhooks.previewPayload.useQuery(
    { contentId: parseInt(selectedContentId), webhookId: parseInt(selectedWebhookId) },
    { enabled: showPreviewDialog && !!selectedContentId && !!selectedWebhookId }
  );

  const createMutation = trpc.seo.webhooks.create.useMutation();
  const deleteMutation = trpc.seo.webhooks.delete.useMutation();
  const publishMutation = trpc.seo.webhooks.publish.useMutation();
  const testMutation = trpc.seo.webhooks.testConnection.useMutation();

  const approvedContent = useMemo(
    () => contentList?.filter((c) => c.content.status === "approved") || [],
    [contentList]
  );

  const currentPlatform = platformConfig[newWebhook.platform];

  const handleCreateWebhook = async () => {
    if (!newWebhook.name || !newWebhook.endpointUrl || !newWebhook.clientId) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await createMutation.mutateAsync({
        ...newWebhook,
        clientId: parseInt(newWebhook.clientId),
      });
      toast.success("Webhook created successfully!");
      setShowAddDialog(false);
      setNewWebhook({ clientId: "", name: "", platform: "wordpress", endpointUrl: "", apiKey: "", authHeader: "" });
      refetchWebhooks();
    } catch {
      toast.error("Failed to create webhook");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Webhook deleted");
      refetchWebhooks();
    } catch {
      toast.error("Failed to delete webhook");
    }
  };

  const handleTestConnection = async (webhookId: number) => {
    setTestingId(webhookId);
    try {
      const result = await testMutation.mutateAsync({ webhookId });
      if (result.success) {
        toast.success(`Connection successful! (HTTP ${result.statusCode})`);
      } else {
        toast.error(`Connection failed: ${result.message}`);
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTestingId(null);
    }
  };

  const handlePublish = async () => {
    if (!selectedContentId || !selectedWebhookId) {
      toast.error("Please select content and a webhook");
      return;
    }
    try {
      const result = await publishMutation.mutateAsync({
        contentId: parseInt(selectedContentId),
        webhookId: parseInt(selectedWebhookId),
        publishAsDraft,
      });
      if (result.success) {
        toast.success(
          result.publishedUrl
            ? `Published successfully! URL: ${result.publishedUrl}`
            : "Content published successfully!"
        );
      } else {
        toast.error(`Publishing failed: ${result.error}${result.errorDetails ? ` - ${result.errorDetails}` : ""}`);
      }
      setShowPublishDialog(false);
      refetchLogs();
    } catch {
      toast.error("Failed to publish content");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Webhook className="h-8 w-8" />
          Publishing & Webhooks
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure CMS endpoints and publish approved content directly to client websites
        </p>
      </div>

      {/* Platform Support Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(platformConfig).map(([key, config]) => (
          <div key={key} className="p-3 rounded-lg border border-border/50 bg-card/50">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={config.color}>{config.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Webhook Configuration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={newWebhook.clientId} onValueChange={(v) => setNewWebhook({ ...newWebhook, clientId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsList?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  placeholder="e.g., Client Blog WordPress"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Platform *</Label>
                <Select
                  value={newWebhook.platform}
                  onValueChange={(v: any) => setNewWebhook({ ...newWebhook, platform: v, endpointUrl: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                    <SelectItem value="ghost">Ghost</SelectItem>
                    <SelectItem value="webflow">Webflow</SelectItem>
                    <SelectItem value="custom">Custom API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Platform-specific setup guide */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs space-y-1">
                    <p className="font-medium text-primary">{currentPlatform.label} Setup</p>
                    <p className="text-muted-foreground">URL format: <code className="text-primary/80">{currentPlatform.urlHint}</code></p>
                    <p className="text-muted-foreground">Auth: {currentPlatform.authHint}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Endpoint URL *</Label>
                <Input
                  placeholder={currentPlatform.urlHint}
                  value={newWebhook.endpointUrl}
                  onChange={(e) => setNewWebhook({ ...newWebhook, endpointUrl: e.target.value })}
                />
              </div>
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder={newWebhook.platform === "ghost" ? "Ghost Admin API Key (id:secret)" : "Bearer token or API key"}
                  value={newWebhook.apiKey}
                  onChange={(e) => setNewWebhook({ ...newWebhook, apiKey: e.target.value })}
                />
              </div>
              <div>
                <Label>Custom Auth Header (overrides API Key)</Label>
                <Input
                  placeholder="Basic dXNlcjpwYXNz or Token xxx"
                  value={newWebhook.authHeader}
                  onChange={(e) => setNewWebhook({ ...newWebhook, authHeader: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateWebhook} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={!approvedContent.length || !webhooks?.length}>
              <Send className="h-4 w-4 mr-2" />
              Publish Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Publish Content to CMS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Approved Content</Label>
                <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose content..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedContent.map((item) => (
                      <SelectItem key={item.content.id} value={item.content.id.toString()}>
                        {item.content.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Select Webhook Endpoint</Label>
                <Select value={selectedWebhookId} onValueChange={setSelectedWebhookId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose webhook..." />
                  </SelectTrigger>
                  <SelectContent>
                    {webhooks?.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.name} ({platformConfig[w.platform]?.label})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Publish Mode</Label>
                <Select value={publishAsDraft ? "draft" : "publish"} onValueChange={(v) => setPublishAsDraft(v === "draft")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Save as Draft</SelectItem>
                    <SelectItem value="publish">Publish Immediately</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {publishAsDraft ? "Content will be saved as a draft in the CMS for final review" : "Content will be published live immediately"}
                </p>
              </div>

              {/* Preview Payload Button */}
              {selectedContentId && selectedWebhookId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewDialog(true)}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview API Payload
                </Button>
              )}

              <Button onClick={handlePublish} disabled={publishMutation.isPending} className="w-full">
                {publishMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {publishAsDraft ? "Publish as Draft" : "Publish Live"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payload Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Payload Preview</DialogTitle>
          </DialogHeader>
          {payloadPreview ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={platformConfig[payloadPreview.platform]?.color}>
                  {platformConfig[payloadPreview.platform]?.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {payloadPreview.method} {payloadPreview.url}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Headers:</p>
                <pre className="text-xs bg-muted/30 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(payloadPreview.headers, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Payload:</p>
                <pre className="text-xs bg-muted/30 p-3 rounded-lg overflow-x-auto max-h-96">
                  {JSON.stringify(payloadPreview.payload, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" className="flex items-center gap-1.5">
            <ListOrdered className="h-4 w-4" />
            Publishing Queue
            {approvedContent.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{approvedContent.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="webhooks">Webhook Configurations</TabsTrigger>
          <TabsTrigger value="history">Publish History</TabsTrigger>
          <TabsTrigger value="seo-audit" className="flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            WP SEO Audit
          </TabsTrigger>
          <TabsTrigger value="alt-text" className="flex items-center gap-1.5">
            <Image className="h-4 w-4" />
            Alt Text
          </TabsTrigger>
          <TabsTrigger value="social-posts" className="flex items-center gap-1.5">
            <Send className="h-4 w-4" />
            Social Posts
          </TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5" />
                Approved Content Ready to Publish
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a webhook and optional scheduled date for each piece, then publish directly.
              </p>
            </CardHeader>
            <CardContent>
              {approvedContent.length > 0 ? (
                <div className="space-y-3">
                  {approvedContent.map((item) => {
                    const sel = queueSelections[item.content.id] || { webhookId: "", scheduledDate: "" };
                    const isPublishing = publishingQueue.includes(item.content.id);
                    const clientWebhooks = webhooks?.filter((w) => w.clientId === item.content.clientId) || [];
                    return (
                      <div
                        key={item.content.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.content.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.client?.name || "Unknown client"}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                          <Select
                            value={sel.webhookId}
                            onValueChange={(v) =>
                              setQueueSelections((prev) => ({
                                ...prev,
                                [item.content.id]: { ...sel, webhookId: v },
                              }))
                            }
                          >
                            <SelectTrigger className="w-48 h-8 text-xs">
                              <SelectValue placeholder="Select site..." />
                            </SelectTrigger>
                            <SelectContent>
                              {clientWebhooks.length > 0 ? (
                                clientWebhooks.map((w) => (
                                  <SelectItem key={w.id} value={w.id.toString()}>
                                    {w.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__none__" disabled>
                                  No webhooks for this client
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <input
                              type="datetime-local"
                              value={sel.scheduledDate}
                              onChange={(e) =>
                                setQueueSelections((prev) => ({
                                  ...prev,
                                  [item.content.id]: { ...sel, scheduledDate: e.target.value },
                                }))
                              }
                              className="h-8 pl-7 pr-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            disabled={!sel.webhookId || sel.webhookId === "__none__" || isPublishing}
                            onClick={async () => {
                              setPublishingQueue((prev) => [...prev, item.content.id]);
                              try {
                                const result = await publishMutation.mutateAsync({
                                  contentId: item.content.id,
                                  webhookId: parseInt(sel.webhookId),
                                  publishAsDraft: true,
                                });
                                if (result.success) {
                                  toast.success(
                                    result.publishedUrl
                                      ? `Published! ${result.publishedUrl}`
                                      : `"${item.content.title}" published successfully`
                                  );
                                } else {
                                  toast.error(`Failed: ${result.error}`);
                                }
                              } catch {
                                toast.error("Publishing failed");
                              } finally {
                                setPublishingQueue((prev) => prev.filter((id) => id !== item.content.id));
                                refetchLogs();
                              }
                            }}
                          >
                            {isPublishing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1">{isPublishing ? "Publishing..." : "Publish"}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground font-medium">No approved content yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Approve content pieces to add them to the publishing queue.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configured Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              {webhooks && webhooks.length > 0 ? (
                <div className="space-y-3">
                  {webhooks.map((webhook) => (
                    <div
                      key={webhook.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{webhook.name}</span>
                          <Badge className={platformConfig[webhook.platform]?.color || "bg-gray-500/20"}>
                            {platformConfig[webhook.platform]?.label || webhook.platform}
                          </Badge>
                          {webhook.isActive ? (
                            <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {webhook.endpointUrl.length > 60
                            ? webhook.endpointUrl.substring(0, 60) + "..."
                            : webhook.endpointUrl}
                        </p>
                        {webhook.lastPublishedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last published: {new Date(webhook.lastPublishedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(webhook.id)}
                          disabled={testingId === webhook.id}
                        >
                          {testingId === webhook.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">Test</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(webhook.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No webhooks configured yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add a webhook to start publishing content to client CMS platforms
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Recent Publish Activity
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedContentId} onValueChange={(v) => { setSelectedContentId(v); }}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Select content to view logs..." />
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

              {selectedContentId && publishLogs && publishLogs.length > 0 ? (
                <div className="space-y-2">
                  {publishLogs.map((log) => {
                    const config = statusConfig[log.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    let publishedUrl = "";
                    try {
                      const body = JSON.parse(log.responseBody || "{}");
                      publishedUrl = body.publishedUrl || "";
                    } catch {}
                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`h-5 w-5 ${config.color.split(" ")[1]}`} />
                          <div>
                            <Badge className={config.color}>{config.label}</Badge>
                            {log.responseCode ? (
                              <span className="text-xs text-muted-foreground ml-2">
                                HTTP {log.responseCode}
                              </span>
                            ) : null}
                            {publishedUrl && (
                              <a
                                href={publishedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary ml-2 hover:underline"
                              >
                                View Post
                              </a>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.publishedAt).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : selectedContentId ? (
                <p className="text-center text-muted-foreground py-4">
                  No publish logs for this content
                </p>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Select content above to view publish history
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WP SEO Audit Tab */}
        <TabsContent value="seo-audit">
          <WpSeoAuditTab />
        </TabsContent>

        {/* Alt Text Tab */}
        <TabsContent value="alt-text">
          <WpAltTextTab />
        </TabsContent>

        {/* Social Posts Tab */}
        <TabsContent value="social-posts">
          <SocialPostsTab contentList={contentList || []} clientsList={clientsList || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── WP SEO Audit Panel ─────────────────────────────────────────────────────

function WpSeoAuditTab() {
  const { data: connections = [] } = trpc.seo.wordpress.getConnections.useQuery({ clientId: 0 }, { enabled: false });
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [postType, setPostType] = useState<"posts" | "pages">("posts");
  const [limit, setLimit] = useState(10);
  const [results, setResults] = useState<any[]>([]);
  const [applying, setApplying] = useState<number | null>(null);

  const { data: allConnections = [] } = trpc.seo.wordpress.getConnections.useQuery({ clientId: -1 }, {
    // Fetch connections across all clients by using a special query
    // We'll use a different approach — fetch all connections
    enabled: true,
  });

  const auditMutation = trpc.seo.wordpress.bulkSeoAudit.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
      toast.success(`Audited ${data.audited} ${postType}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePostMutation = trpc.seo.wordpress.updatePost.useMutation({
    onSuccess: () => toast.success("SEO meta applied to WordPress"),
    onError: (e) => toast.error(e.message),
  });

  const handleApply = async (result: any) => {
    if (!selectedConnectionId) return;
    setApplying(result.postId);
    await updatePostMutation.mutateAsync({
      connectionId: selectedConnectionId,
      wordpressPostId: result.postId,
      seoTitle: result.suggestedSeoTitle,
      seoDescription: result.suggestedMetaDescription,
      isPage: postType === "pages",
    });
    setApplying(null);
  };

  const scoreColor = (score: number) =>
    score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          WordPress Bulk SEO Audit
        </CardTitle>
        <p className="text-sm text-muted-foreground">AI scores your existing WordPress posts/pages and suggests improved SEO titles and meta descriptions.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label>WordPress Connection</Label>
            <Select value={selectedConnectionId?.toString() ?? ""} onValueChange={(v) => setSelectedConnectionId(Number(v))}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select connection" />
              </SelectTrigger>
              <SelectContent>
                {allConnections.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.siteName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={postType} onValueChange={(v: any) => setPostType(v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="posts">Posts</SelectItem>
                <SelectItem value="pages">Pages</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Limit</Label>
            <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => selectedConnectionId && auditMutation.mutate({ connectionId: selectedConnectionId, type: postType, limit })}
            disabled={!selectedConnectionId || auditMutation.isPending}
            className="gap-2"
          >
            {auditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Run Audit
          </Button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.postId} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-lg font-bold ${scoreColor(r.score)}`}>{r.score}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate">{r.title}</a>
                    </div>
                    {r.issues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {r.issues.map((issue: string, i: number) => (
                          <span key={i} className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded px-2 py-0.5">{issue}</span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1 text-xs">
                      <p><span className="text-muted-foreground">Suggested SEO title:</span> <span className="text-foreground">{r.suggestedSeoTitle}</span></p>
                      <p><span className="text-muted-foreground">Suggested meta desc:</span> <span className="text-foreground">{r.suggestedMetaDescription}</span></p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => handleApply(r)}
                    disabled={applying === r.postId || updatePostMutation.isPending}
                  >
                    {applying === r.postId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !auditMutation.isPending && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a connection and click Run Audit to analyse your WordPress content.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── WP Alt Text Panel ──────────────────────────────────────────────────────

function WpAltTextTab() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: allConnections = [] } = trpc.seo.wordpress.getConnections.useQuery({ clientId: -1 }, { enabled: true });
  const { data: mediaItems = [], refetch, isFetching } = trpc.seo.wordpress.listMediaMissingAltText.useQuery(
    { connectionId: selectedConnectionId ?? 0, perPage: 50 },
    { enabled: !!selectedConnectionId }
  );

  const updateAltMutation = trpc.seo.wordpress.optimizeImageAltText.useMutation({
    onSuccess: () => {
      toast.success("Alt text updated");
      setEditingId(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const generateAltMutation = trpc.seo.wordpress.generateAltText.useMutation({
    onSuccess: (data) => {
      setEditValue(data.altText);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Image Alt Text Optimization
        </CardTitle>
        <p className="text-sm text-muted-foreground">Find images missing alt text and add AI-generated descriptions for better accessibility and SEO.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="space-y-1">
            <Label>WordPress Connection</Label>
            <Select value={selectedConnectionId?.toString() ?? ""} onValueChange={(v) => setSelectedConnectionId(Number(v))}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Select connection" /></SelectTrigger>
              <SelectContent>
                {allConnections.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.siteName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={!selectedConnectionId || isFetching} className="gap-2">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {mediaItems.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{mediaItems.length} image{mediaItems.length !== 1 ? "s" : ""} missing alt text</p>
            {(mediaItems as any[]).map((item) => (
              <div key={item.id} className="border rounded-lg p-3 flex items-start gap-3">
                <img src={item.url} alt="" className="h-16 w-16 object-cover rounded shrink-0 bg-muted" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate mb-1">{item.title || `Media #${item.id}`}</p>
                  {editingId === item.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Alt text description..."
                        className="text-sm"
                      />
                      <Button size="sm" variant="outline" className="gap-1 shrink-0"
                        onClick={() => generateAltMutation.mutate({ imageUrl: item.url })}
                        disabled={generateAltMutation.isPending}
                      >
                        {generateAltMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                        AI
                      </Button>
                      <Button size="sm" className="shrink-0"
                        onClick={() => selectedConnectionId && updateAltMutation.mutate({ connectionId: selectedConnectionId, mediaId: item.id, altText: editValue })}
                        disabled={!editValue.trim() || updateAltMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                      onClick={() => { setEditingId(item.id); setEditValue(""); }}
                    >
                      <Plus className="h-3 w-3" /> Add Alt Text
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : selectedConnectionId && !isFetching ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-400" />
            <p className="text-sm text-muted-foreground">All images have alt text. Great job!</p>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Image className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a connection to scan for images missing alt text.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Social Posts Scheduler Tab ─────────────────────────────────────────────

const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
  linkedin:  { label: "LinkedIn",    color: "bg-blue-600/20 text-blue-400",   icon: "in" },
  twitter:   { label: "Twitter / X", color: "bg-sky-500/20 text-sky-400",     icon: "𝕏"  },
  instagram: { label: "Instagram",   color: "bg-pink-500/20 text-pink-400",   icon: "IG" },
  facebook:  { label: "Facebook",    color: "bg-indigo-500/20 text-indigo-400", icon: "f" },
  tiktok:    { label: "TikTok",      color: "bg-rose-500/20 text-rose-400",   icon: "TT" },
  general:   { label: "Social",      color: "bg-muted text-muted-foreground", icon: "📢" },
};

function SocialPostsTab({
  contentList,
  clientsList,
}: {
  contentList: any[];
  clientsList: any[];
}) {
  const updateMutation = trpc.seo.content.update.useMutation();
  const utils = trpc.useUtils();

  const [filterClient, setFilterClient] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");

  const socialPosts = useMemo(
    () =>
      contentList.filter(
        (c) => (c.content as any).contentType === "social-post"
      ),
    [contentList]
  );

  const filtered = useMemo(() => {
    return socialPosts.filter((c) => {
      if (filterClient !== "all" && c.content.clientId.toString() !== filterClient) return false;
      const sub = (c.content as any).contentSubtype || "general";
      if (filterPlatform !== "all" && sub !== filterPlatform) return false;
      return true;
    });
  }, [socialPosts, filterClient, filterPlatform]);

  const handleMarkPosted = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "approved" ? "draft" : "approved";
    try {
      await updateMutation.mutateAsync({ id, status: newStatus as any });
      utils.seo.content.list.invalidate();
      toast.success(newStatus === "approved" ? "Marked as posted" : "Unmarked");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleScheduleDate = async (id: number, date: string) => {
    try {
      await updateMutation.mutateAsync({ id, scheduledDate: date } as any);
      utils.seo.content.list.invalidate();
      toast.success("Schedule date saved");
    } catch {
      toast.error("Failed to save date");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Social Posts Scheduler
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage and schedule all AI-generated social media posts. Mark as posted when published.
        </p>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clientsList.map((c: any) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {Object.entries(PLATFORM_META).filter(([k]) => k !== "general").map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterClient !== "all" || filterPlatform !== "all") && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterClient("all"); setFilterPlatform("all"); }}>
              Clear
            </Button>
          )}
          <span className="ml-auto text-sm text-muted-foreground self-center">
            {filtered.length} post{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No social posts yet</p>
            <p className="text-sm mt-1">Generate a Social Media Post from the Content page to see it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item: any) => {
              const sub = item.content.contentSubtype || "general";
              const meta = PLATFORM_META[sub] || PLATFORM_META.general;
              const isPosted = item.content.status === "approved";
              const client = clientsList.find((c: any) => c.id === item.content.clientId);
              return (
                <div
                  key={item.content.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${isPosted ? "border-green-500/30 bg-green-500/5" : "border-border bg-card"}`}
                >
                  {/* Platform badge */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${meta.color}`}>
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
                      {client && <span className="text-xs text-muted-foreground">{client.name}</span>}
                      {isPosted && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Posted
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{item.content.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.content.topic}</p>
                  </div>

                  {/* Schedule date */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="date"
                        className="text-xs bg-transparent border border-border rounded px-2 py-1 text-foreground"
                        defaultValue={(item.content as any).scheduledDate?.slice(0, 10) || ""}
                        onBlur={(e) => {
                          if (e.target.value) handleScheduleDate(item.content.id, e.target.value);
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant={isPosted ? "outline" : "default"}
                      className={`text-xs h-7 ${isPosted ? "border-green-500/50 text-green-400" : ""}`}
                      onClick={() => handleMarkPosted(item.content.id, item.content.status)}
                      disabled={updateMutation.isPending}
                    >
                      {isPosted ? (
                        <><X className="h-3 w-3 mr-1" /> Unmark</>
                      ) : (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Mark as Posted</>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
