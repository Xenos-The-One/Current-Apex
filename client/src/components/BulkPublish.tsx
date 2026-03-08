import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Globe, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface BulkPublishProps {
  contentId: number;
  clientId: number;
}

export function BulkPublish({ contentId, clientId }: BulkPublishProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWordPress, setSelectedWordPress] = useState<number[]>([]);
  const [selectedManus, setSelectedManus] = useState<number[]>([]);
  const [wordpressStatus, setWordpressStatus] = useState<"draft" | "publish" | "pending">("draft");
  const [manusSlug, setManusSlug] = useState("");
  const [publishResults, setPublishResults] = useState<any>(null);

  const { data: wpConnections } = trpc.wordpress.getConnections.useQuery({ clientId });
  const { data: manusWebsites } = trpc.manusWebsites.getWebsites.useQuery({ clientId });
  const publishMutation = trpc.bulkPublishing.publishToMultiplePlatforms.useMutation();

  const handlePublish = async () => {
    if (selectedWordPress.length === 0 && selectedManus.length === 0) {
      toast.error("Please select at least one platform to publish to");
      return;
    }

    try {
      const result = await publishMutation.mutateAsync({
        contentId,
        wordpressConnectionIds: selectedWordPress.length > 0 ? selectedWordPress : undefined,
        wordpressStatus,
        manusWebsiteIds: selectedManus.length > 0 ? selectedManus : undefined,
        manusSlug: manusSlug || undefined,
      });

      setPublishResults(result);

      if (result.success) {
        toast.success(`Published to ${result.summary.wordpress.success + result.summary.manus.success} platforms`);
      } else {
        toast.error("All publishing attempts failed");
      }
    } catch (error) {
      toast.error("Failed to publish content");
    }
  };

  const handleReset = () => {
    setSelectedWordPress([]);
    setSelectedManus([]);
    setWordpressStatus("draft");
    setManusSlug("");
    setPublishResults(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        handleReset();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Globe className="h-4 w-4" />
          Bulk Publish
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Publish to Multiple Platforms</DialogTitle>
          <DialogDescription>
            Publish this content to multiple WordPress sites and Manus websites simultaneously
          </DialogDescription>
        </DialogHeader>

        {!publishResults ? (
          <div className="space-y-6">
            {/* WordPress Sites */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">WordPress Sites</Label>
              {wpConnections && wpConnections.length > 0 ? (
                <div className="space-y-2">
                  {wpConnections.map((connection) => (
                    <div key={connection.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`wp-${connection.id}`}
                        checked={selectedWordPress.includes(connection.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedWordPress([...selectedWordPress, connection.id]);
                          } else {
                            setSelectedWordPress(selectedWordPress.filter(id => id !== connection.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`wp-${connection.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {connection.siteName}
                      </label>
                    </div>
                  ))}
                  
                  {selectedWordPress.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="wpStatus">WordPress Post Status</Label>
                      <Select
                        value={wordpressStatus}
                        onValueChange={(value: "draft" | "publish" | "pending") => setWordpressStatus(value)}
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
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No WordPress connections available</p>
              )}
            </div>

            {/* Manus Websites */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Manus Websites</Label>
              {manusWebsites && manusWebsites.length > 0 ? (
                <div className="space-y-2">
                  {manusWebsites.map((website) => (
                    <div key={website.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`manus-${website.id}`}
                        checked={selectedManus.includes(website.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedManus([...selectedManus, website.id]);
                          } else {
                            setSelectedManus(selectedManus.filter(id => id !== website.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`manus-${website.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {website.projectTitle}
                      </label>
                    </div>
                  ))}

                  {selectedManus.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="manusSlug">URL Slug (optional)</Label>
                      <Input
                        id="manusSlug"
                        placeholder="my-blog-post"
                        value={manusSlug}
                        onChange={(e) => setManusSlug(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Custom URL slug for the blog post. Leave empty for auto-generated slug.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No Manus websites available</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Publishing Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Publishing Results</h3>
                <div className="text-sm text-muted-foreground">
                  {publishResults.summary.wordpress.success + publishResults.summary.manus.success} of{" "}
                  {publishResults.summary.wordpress.total + publishResults.summary.manus.total} successful
                </div>
              </div>

              {/* WordPress Results */}
              {publishResults.results.wordpress.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">WordPress Sites</h4>
                  {publishResults.results.wordpress.map((result: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-lg border bg-card"
                    >
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{result.siteName}</p>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                        {result.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View post →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manus Results */}
              {publishResults.results.manus.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Manus Websites</h4>
                  {publishResults.results.manus.map((result: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-lg border bg-card"
                    >
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{result.projectTitle}</p>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                        {result.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View post →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {!publishResults ? (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={publishMutation.isPending}>
                {publishMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Now"
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsOpen(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
