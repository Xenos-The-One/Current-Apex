import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Globe, Send, ExternalLink, CheckCircle2, XCircle, Loader2, History } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WordPressPublishProps {
  contentId: number;
  clientId: number;
}

export function WordPressPublish({ contentId, clientId }: WordPressPublishProps) {
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [publishStatus, setPublishStatus] = useState<"draft" | "publish" | "pending">("draft");

  const { data: connections } = trpc.wordpress.getConnections.useQuery({ clientId });
  const { data: publishHistory, refetch: refetchHistory } = trpc.wordpress.getPublishHistory.useQuery({ contentId });
  const publishMutation = trpc.wordpress.publishToWordPress.useMutation();

  const handlePublish = async () => {
    if (!selectedConnectionId) {
      toast.error("Please select a WordPress site");
      return;
    }

    try {
      const result = await publishMutation.mutateAsync({
        contentId,
        connectionId: parseInt(selectedConnectionId),
        publishStatus,
      });

      if (result.success) {
        toast.success(result.message);
        setIsPublishDialogOpen(false);
        refetchHistory();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to publish to WordPress");
    }
  };

  const activeConnections = connections?.filter((c) => c.isActive === 1) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          WordPress Publishing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeConnections.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active WordPress connections</p>
            <p className="text-xs mt-1">Configure connections in client settings</p>
          </div>
        ) : (
          <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Publish to WordPress
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish to WordPress</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="connection">Select WordPress Site</Label>
                  <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a site..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeConnections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id.toString()}>
                          {connection.siteName} - {connection.siteUrl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publishStatus">Publish Status</Label>
                  <Select
                    value={publishStatus}
                    onValueChange={(value: "draft" | "publish" | "pending") => setPublishStatus(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="publish">Publish</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {publishStatus === "draft" && "Save as draft (not visible to public)"}
                    {publishStatus === "publish" && "Publish immediately (visible to public)"}
                    {publishStatus === "pending" && "Submit for review (requires approval)"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handlePublish} disabled={publishMutation.isPending || !selectedConnectionId}>
                  {publishMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publish
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Publish History */}
        {publishHistory && publishHistory.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4" />
              Publish History
            </div>
            <div className="space-y-2">
              {publishHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-start justify-between p-3 border rounded-lg bg-muted/30 text-sm"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {record.success === 1 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium">{record.siteName}</span>
                      <Badge variant="outline" className="text-xs">
                        {record.publishStatus}
                      </Badge>
                    </div>
                    {record.success === 1 && record.wordpressPostUrl && (
                      <a
                        href={record.wordpressPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on WordPress
                      </a>
                    )}
                    {record.success === 0 && record.errorMessage && (
                      <p className="text-xs text-destructive">{record.errorMessage}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.publishedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
