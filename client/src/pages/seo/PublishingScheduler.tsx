import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Plus, Trash2, Edit, PlayCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PublishingScheduler() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [publishToWordPress, setPublishToWordPress] = useState(false);
  const [selectedWordPress, setSelectedWordPress] = useState<number[]>([]);
  const [wordpressStatus, setWordpressStatus] = useState<"draft" | "publish" | "pending">("draft");
  const [publishToManus, setPublishToManus] = useState(false);
  const [selectedManus, setSelectedManus] = useState<number[]>([]);

  const { data: schedules, refetch } = trpc.seo.publishingScheduler.getSchedules.useQuery();
  // Get all content - we'll need to add this endpoint or use a different approach
  const [allContent, setAllContent] = useState<any[]>([]);
  const createMutation = trpc.seo.publishingScheduler.create.useMutation();
  const cancelMutation = trpc.seo.publishingScheduler.cancel.useMutation();
  const triggerMutation = trpc.seo.publishingScheduler.triggerScheduledPublishing.useMutation();

  // Get unique client IDs from content
  const clientIds = Array.from(new Set(allContent?.map((c: any) => c.clientId) || []));

  const handleCreate = async () => {
    if (!selectedContentId || !scheduledDate || !scheduledTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!publishToWordPress && !publishToManus) {
      toast.error("Please select at least one platform");
      return;
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);

    try {
      await createMutation.mutateAsync({
        contentId: selectedContentId,
        scheduledFor,
        publishToWordPress,
        wordpressConnectionIds: publishToWordPress ? selectedWordPress : undefined,
        wordpressStatus,
        publishToManus,
        manusWebsiteIds: publishToManus ? selectedManus : undefined,
      });

      toast.success("Publishing scheduled successfully");
      setIsCreateDialogOpen(false);
      refetch();
      
      // Reset form
      setSelectedContentId(null);
      setScheduledDate("");
      setScheduledTime("");
      setPublishToWordPress(false);
      setSelectedWordPress([]);
      setPublishToManus(false);
      setSelectedManus([]);
    } catch (error: any) {
      toast.error(error.message || "Failed to schedule publishing");
    }
  };

  const handleCancel = async (scheduleId: number) => {
    try {
      await cancelMutation.mutateAsync({ id: scheduleId });
      toast.success("Schedule cancelled");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel schedule");
    }
  };

  const handleTrigger = async () => {
    try {
      const result = await triggerMutation.mutateAsync();
      if (result.success) {
        toast.success("Scheduled publishing triggered");
        refetch();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to trigger scheduled publishing");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
      case "completed":
        return <Badge variant="outline" className="gap-1 text-green-600 border-green-600"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="gap-1 text-red-600 border-red-600"><XCircle className="h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get WordPress connections for selected content
  const selectedContent = allContent?.find((c: any) => c.id === selectedContentId);
  const { data: wpConnections } = trpc.seo.wordpress.getConnections.useQuery(
    { clientId: selectedContent?.clientId || 0 },
    { enabled: !!selectedContent }
  );
  const { data: manusWebsites } = trpc.seo.manusWebsites.getWebsites.useQuery(
    { clientId: selectedContent?.clientId || 0 },
    { enabled: !!selectedContent }
  );

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Publishing Scheduler</h1>
          <p className="text-muted-foreground">
            Schedule content to be published automatically at specific times
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTrigger} disabled={triggerMutation.isPending}>
            {triggerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Trigger Now
              </>
            )}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Publishing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule Content Publishing</DialogTitle>
                <DialogDescription>
                  Choose content and platforms to publish at a scheduled time
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Content Selection */}
                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Select
                    value={selectedContentId?.toString() || ""}
                    onValueChange={(value) => setSelectedContentId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select content to publish" />
                    </SelectTrigger>
                    <SelectContent>
                      {allContent?.map((content: any) => (
                        <SelectItem key={content.id} value={content.id.toString()}>
                          {content.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Schedule Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* WordPress Sites */}
                {selectedContent && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="publishToWordPress"
                        checked={publishToWordPress}
                        onCheckedChange={(checked) => setPublishToWordPress(!!checked)}
                      />
                      <label
                        htmlFor="publishToWordPress"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Publish to WordPress
                      </label>
                    </div>

                    {publishToWordPress && wpConnections && wpConnections.length > 0 && (
                      <div className="ml-6 space-y-2">
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
                              className="text-sm leading-none cursor-pointer"
                            >
                              {connection.siteName}
                            </label>
                          </div>
                        ))}

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
                      </div>
                    )}
                  </div>
                )}

                {/* Manus Websites */}
                {selectedContent && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="publishToManus"
                        checked={publishToManus}
                        onCheckedChange={(checked) => setPublishToManus(!!checked)}
                      />
                      <label
                        htmlFor="publishToManus"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Publish to Manus Websites
                      </label>
                    </div>

                    {publishToManus && manusWebsites && manusWebsites.length > 0 && (
                      <div className="ml-6 space-y-2">
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
                              className="text-sm leading-none cursor-pointer"
                            >
                              {website.projectTitle}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Schedules List */}
      <div className="space-y-4">
        {schedules && schedules.length > 0 ? (
          schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{schedule.contentTitle}</h3>
                      {getStatusBadge(schedule.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(schedule.scheduledFor).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(schedule.scheduledFor).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {schedule.publishToWordPress === 1 && (
                        <Badge variant="secondary">
                          WordPress ({schedule.wordpressConnectionIds.length} sites)
                        </Badge>
                      )}
                      {schedule.publishToManus === 1 && (
                        <Badge variant="secondary">
                          Manus ({schedule.manusWebsiteIds.length} sites)
                        </Badge>
                      )}
                    </div>
                    {schedule.errorMessage && (
                      <p className="mt-2 text-sm text-red-600">{schedule.errorMessage}</p>
                    )}
                  </div>
                  {schedule.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(schedule.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No scheduled publishing tasks. Click "Schedule Publishing" to create one.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
