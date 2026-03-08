import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Rocket, Send, ExternalLink, CheckCircle2, XCircle, Loader2, History } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ManusPublishProps {
  contentId: number;
  clientId: number;
}

export function ManusPublish({ contentId, clientId }: ManusPublishProps) {
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");
  const [slug, setSlug] = useState("");

  const { data: websites } = trpc.manusWebsites.getWebsites.useQuery({ clientId });
  const { data: publishHistory, refetch: refetchHistory } = trpc.manusWebsites.getPublishHistory.useQuery({ contentId });
  const publishMutation = trpc.manusWebsites.publishToManus.useMutation();

  const handlePublish = async () => {
    if (!selectedWebsiteId) {
      toast.error("Please select a Manus website");
      return;
    }

    try {
      const result = await publishMutation.mutateAsync({
        contentId,
        websiteId: parseInt(selectedWebsiteId),
        slug: slug || undefined,
      });

      if (result.success) {
        toast.success(result.message);
        setIsPublishDialogOpen(false);
        setSlug("");
        refetchHistory();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to publish to Manus website");
    }
  };

  const activeWebsites = websites?.filter((w) => w.isActive === 1 && w.status === "active") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Manus Publishing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeWebsites.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Rocket className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active Manus websites</p>
            <p className="text-xs mt-1">Create a website in client settings</p>
          </div>
        ) : (
          <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Publish to Manus
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish to Manus Website</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Select Website</Label>
                  <Select value={selectedWebsiteId} onValueChange={setSelectedWebsiteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a website..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWebsites.map((website) => (
                        <SelectItem key={website.id} value={website.id.toString()}>
                          {website.projectTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug (Optional)</Label>
                  <Input
                    id="slug"
                    placeholder="e.g., my-blog-post"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom URL path for this post (leave empty for auto-generated)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handlePublish} disabled={publishMutation.isPending || !selectedWebsiteId}>
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
                      <span className="font-medium">{record.projectTitle}</span>
                    </div>
                    {record.success === 1 && record.publishedUrl && (
                      <a
                        href={record.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View published content
                      </a>
                    )}
                    {record.success === 0 && record.errorMessage && (
                      <p className="text-xs text-destructive">{record.errorMessage}</p>
                    )}
                    {record.slug && (
                      <p className="text-xs text-muted-foreground">Slug: {record.slug}</p>
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
