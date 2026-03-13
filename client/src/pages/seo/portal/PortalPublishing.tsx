/**
 * Portal Publishing Page
 *
 * Allows client portal users (with appropriate permissions) to:
 *  - View content approved for publishing
 *  - Publish directly to WordPress or Manus
 *  - Schedule content for future publishing
 *  - View their publishing history / schedule
 */

import { useState } from "react";
import { Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  Calendar,
  FileText,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

export default function PortalPublishing() {
  const { user } = useAuth();
  const [branding, setBranding] = useState<any>(null);

  // Dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [publishToWordPress, setPublishToWordPress] = useState(false);
  const [selectedWordPress, setSelectedWordPress] = useState<number[]>([]);
  const [wordpressStatus, setWordpressStatus] = useState<"draft" | "publish" | "pending">("publish");
  const [publishToManus, setPublishToManus] = useState(false);
  const [selectedManus, setSelectedManus] = useState<number[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );


  // Queries
  const { data: permissions } = trpc.seo.clientPublishingPermissions.getPermissions.useQuery(
    { clientId: (user as any)?.clientId || 0 },
    { enabled: !!(user as any)?.clientId }
  );

  const { data: contentList, isLoading: contentLoading } = trpc.seo.content.listForPortal.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: schedules, refetch: refetchSchedules } = trpc.seo.publishingScheduler.getSchedules.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: wpConnections } = trpc.seo.wordpress.getConnections.useQuery(
    { clientId: 0 },
    { enabled: false }
  );

  const { data: manusWebsites } = trpc.seo.manusWebsites.getWebsites.useQuery(
    { clientId: 0 },
    { enabled: false }
  );

  // Mutations
  const createSchedule = trpc.seo.publishingScheduler.create.useMutation();
  const cancelSchedule = trpc.seo.publishingScheduler.cancel.useMutation();

  // listForPortal already returns only content for this user's client (flat format)
  const clientContent = (contentList || []).map((c: any) => ({ content: c }));

  const approvedContent = clientContent.filter(
    (c) => c.content.status === "approved"
  );

  // Client schedules
  const clientSchedules = schedules?.filter((s) => {
    return (contentList || []).some((c: any) => c.id === s.contentId);
  }) || [];

  const pendingSchedules = clientSchedules.filter((s) => s.status === "pending");
  const completedSchedules = clientSchedules.filter((s) => s.status === "completed");
  const failedSchedules = clientSchedules.filter((s) => s.status === "failed");

  const handleLogout = () => {
    // Logout handled by main app auth
  };

  const openPublishDialog = (contentId: number) => {
    setSelectedContentId(contentId);
    setPublishToWordPress(false);
    setSelectedWordPress([]);
    setPublishToManus(false);
    setSelectedManus([]);
    setPublishDialogOpen(true);
  };

  const openScheduleDialog = (contentId: number) => {
    setSelectedContentId(contentId);
    setPublishToWordPress(false);
    setSelectedWordPress([]);
    setPublishToManus(false);
    setSelectedManus([]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split("T")[0]);
    setScheduleTime("09:00");
    setScheduleDialogOpen(true);
  };

  // Publish now = schedule for 1 minute from now
  const handlePublishNow = async () => {
    if (!selectedContentId) return;
    if (!publishToWordPress && !publishToManus) {
      toast.error("Please select at least one platform");
      return;
    }
    const scheduledFor = new Date(Date.now() + 60 * 1000);
    try {
      await createSchedule.mutateAsync({
        contentId: selectedContentId,
        scheduledFor,
        publishToWordPress,
        wordpressConnectionIds: publishToWordPress ? selectedWordPress : undefined,
        wordpressStatus,
        publishToManus,
        manusWebsiteIds: publishToManus ? selectedManus : undefined,
      });
      toast.success("Content queued for publishing!");
      setPublishDialogOpen(false);
      refetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish");
    }
  };

  const handleSchedule = async () => {
    if (!selectedContentId || !scheduleDate) {
      toast.error("Please select a date");
      return;
    }
    if (!publishToWordPress && !publishToManus) {
      toast.error("Please select at least one platform");
      return;
    }
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledFor = new Date(scheduleDate);
    scheduledFor.setHours(hours, minutes, 0, 0);
    if (scheduledFor <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }
    try {
      await createSchedule.mutateAsync({
        contentId: selectedContentId,
        scheduledFor,
        publishToWordPress,
        wordpressConnectionIds: publishToWordPress ? selectedWordPress : undefined,
        wordpressStatus,
        publishToManus,
        manusWebsiteIds: publishToManus ? selectedManus : undefined,
      });
      toast.success("Publishing scheduled!");
      setScheduleDialogOpen(false);
      refetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule");
    }
  };

  const handleCancelSchedule = async (id: number) => {
    try {
      await cancelSchedule.mutateAsync({ id });
      toast.success("Schedule cancelled");
      refetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-purple-500/10 text-purple-500">Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-400/10 text-blue-400">Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500">Published</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const canPublishWP = permissions?.canPublishToWordPress;
  const canPublishManus = permissions?.canPublishToManus;
  const canSchedule = permissions?.canSchedulePublishing;
  const canPublishAny = canPublishWP || canPublishManus;

  // Platform selection section (reused in both dialogs)
  const PlatformSelector = () => (
    <div className="space-y-4">
      {canPublishWP && wpConnections && wpConnections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="wp-portal"
              checked={publishToWordPress}
              onCheckedChange={(c) => setPublishToWordPress(!!c)}
            />
            <label htmlFor="wp-portal" className="text-sm font-medium cursor-pointer">
              Publish to WordPress
            </label>
          </div>
          {publishToWordPress && (
            <div className="ml-6 space-y-2">
              {wpConnections.map((conn) => (
                <div key={conn.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`wp-conn-${conn.id}`}
                    checked={selectedWordPress.includes(conn.id)}
                    onCheckedChange={(c) =>
                      setSelectedWordPress(
                        c
                          ? [...selectedWordPress, conn.id]
                          : selectedWordPress.filter((id) => id !== conn.id)
                      )
                    }
                  />
                  <label htmlFor={`wp-conn-${conn.id}`} className="text-sm cursor-pointer">
                    {conn.siteName}
                  </label>
                </div>
              ))}
              <div className="mt-1">
                <Label className="text-xs">Post Status</Label>
                <Select
                  value={wordpressStatus}
                  onValueChange={(v: any) => setWordpressStatus(v)}
                >
                  <SelectTrigger className="h-8 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publish">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {canPublishManus && manusWebsites && manusWebsites.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="manus-portal"
              checked={publishToManus}
              onCheckedChange={(c) => setPublishToManus(!!c)}
            />
            <label htmlFor="manus-portal" className="text-sm font-medium cursor-pointer">
              Publish to Manus Website
            </label>
          </div>
          {publishToManus && (
            <div className="ml-6 space-y-2">
              {manusWebsites.map((site) => (
                <div key={site.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`manus-site-${site.id}`}
                    checked={selectedManus.includes(site.id)}
                    onCheckedChange={(c) =>
                      setSelectedManus(
                        c
                          ? [...selectedManus, site.id]
                          : selectedManus.filter((id) => id !== site.id)
                      )
                    }
                  />
                  <label htmlFor={`manus-site-${site.id}`} className="text-sm cursor-pointer">
                    {site.projectTitle}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!canPublishAny && (
        <p className="text-sm text-muted-foreground">
          You don't have permission to publish to any platforms. Please contact your account manager.
        </p>
      )}
    </div>
  );

  return (
    <PortalLayout activePath="/seo/portal/publishing">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Publishing Center</h2>
        <p className="mt-1" className="text-muted-foreground">
          Publish approved content to your connected platforms
        </p>
      </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500">{approvedContent.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Ready to Publish</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-500">{pendingSchedules.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Scheduled</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">{completedSchedules.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Published</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-red-500">{failedSchedules.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Failed</div>
          </Card>
        </div>

        <Tabs defaultValue="ready">
          <TabsList className="mb-6">
            <TabsTrigger value="ready">
              <FileText className="h-4 w-4 mr-2" />
              Ready to Publish
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <Clock className="h-4 w-4 mr-2" />
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="history">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Ready to Publish */}
          <TabsContent value="ready">
            {!canPublishAny && !canSchedule ? (
              <Card className="p-8 text-center">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Publishing Not Available</h3>
                <p className="text-muted-foreground">
                  You don't have permission to publish content. Please contact your account manager to enable publishing access.
                </p>
              </Card>
            ) : contentLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : approvedContent.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Approved Content</h3>
                <p className="text-muted-foreground">
                  There's no approved content ready to publish. Content must be approved before it can be published.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {approvedContent.map((item) => (
                  <Card key={item.content.id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{item.content.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {item.content.topic}
                          {item.content.wordCount ? ` · ${item.content.wordCount} words` : ""}
                          {item.content.createdAt
                            ? ` · Created ${format(new Date(item.content.createdAt), "MMM d, yyyy")}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {canPublishAny && (
                          <Button
                            size="sm"
                            onClick={() => openPublishDialog(item.content.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Publish Now
                          </Button>
                        )}
                        {canSchedule && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openScheduleDialog(item.content.id)}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Schedule
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Scheduled */}
          <TabsContent value="scheduled">
            {pendingSchedules.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Scheduled Posts</h3>
                <p className="text-muted-foreground">
                  You have no content scheduled for publishing.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingSchedules.map((sched) => (
                  <Card key={sched.id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {sched.contentTitle || `Content #${sched.contentId}`}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Scheduled for{" "}
                          <strong>
                            {format(new Date(sched.scheduledFor), "MMM d, yyyy 'at' h:mm a")}
                          </strong>
                          {sched.publishToWordPress ? " · WordPress" : ""}
                          {sched.publishToManus ? " · Manus" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(sched.status)}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelSchedule(sched.id)}
                          disabled={cancelSchedule.isPending}
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            {completedSchedules.length === 0 && failedSchedules.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Publishing History</h3>
                <p className="text-muted-foreground">
                  Your publishing history will appear here.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {[...completedSchedules, ...failedSchedules]
                  .sort(
                    (a, b) =>
                      new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
                  )
                  .map((sched) => (
                    <Card key={sched.id} className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {sched.contentTitle || `Content #${sched.contentId}`}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {format(new Date(sched.scheduledFor), "MMM d, yyyy 'at' h:mm a")}
                            {sched.publishToWordPress ? " · WordPress" : ""}
                            {sched.publishToManus ? " · Manus" : ""}
                          </p>
                          {sched.errorMessage && (
                            <p className="text-xs text-red-500 mt-1">{sched.errorMessage}</p>
                          )}
                        </div>
                        {getStatusBadge(sched.status)}
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

      {/* Publish Now Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publish Content</DialogTitle>
            <DialogDescription>
              Select where to publish this content. It will be queued immediately.
            </DialogDescription>
          </DialogHeader>
          <PlatformSelector />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublishNow} disabled={createSchedule.isPending}>
              {createSchedule.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publishing...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Publish Now</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Publishing</DialogTitle>
            <DialogDescription>
              Choose when and where to publish this content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PlatformSelector />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={createSchedule.isPending}>
              {createSchedule.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scheduling...</>
              ) : (
                <><Clock className="h-4 w-4 mr-2" />Schedule</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
