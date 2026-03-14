import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText, Search, Calendar, Eye, CheckCircle, Clock, XCircle,
  Loader2, Send, Sparkles, RefreshCw, CalendarPlus, CheckSquare, LayoutGrid,
  ArrowLeft,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { FeedbackThread } from "@/components/FeedbackThread";
import { ContentStatusBadge } from "@/components/ContentStatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Tab = "my-content" | "approvals" | "generate";

// ─── Content Detail Sheet (inline drawer) ────────────────────────────────────
function ContentDetailSheet({
  contentId,
  open,
  onClose,
}: {
  contentId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [comment, setComment] = useState("");

  const { data: content, isLoading, refetch } = trpc.seo.content.getById.useQuery(
    { id: contentId ?? 0 },
    { enabled: !!contentId && contentId > 0 && !!user && open }
  );

  const approveMutation = trpc.seo.approvals.approve.useMutation({
    onSuccess: () => {
      toast.success("Content approved successfully");
      setShowApprovalDialog(false);
      setComment("");
      refetch();
      utils.seo.content.listForPortal.invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Failed to approve content"),
  });

  const requestRevisionMutation = trpc.seo.approvals.requestRevision.useMutation({
    onSuccess: () => {
      toast.success("Revision requested successfully");
      setShowRevisionDialog(false);
      setComment("");
      refetch();
      utils.seo.content.listForPortal.invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Failed to request revision"),
  });

  const handleClose = () => {
    setShowApprovalDialog(false);
    setShowRevisionDialog(false);
    setComment("");
    onClose();
  };

  const canApprove = content?.status === "draft" || content?.status === "in_progress" || content?.status === "pending_approval";

  const statusColor =
    content?.status === "approved"
      ? "bg-green-500/10 text-green-500 border-green-500/30"
      : content?.status === "published"
      ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
      : content?.status === "pending_approval"
      ? "bg-orange-500/10 text-orange-500 border-orange-500/30"
      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 flex flex-col"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-start gap-3 pr-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 mt-0.5"
                onClick={handleClose}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg leading-tight truncate">
                  {isLoading ? "Loading..." : content?.title ?? "Content"}
                </SheetTitle>
                {content && (
                  <SheetDescription className="mt-1 flex items-center gap-2 flex-wrap">
                    <span>{content.topic}</span>
                    <Badge className={statusColor}>
                      {content.status.replace(/_/g, " ")}
                    </Badge>
                  </SheetDescription>
                )}
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 h-0">
            <div className="px-6 py-4 space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !content ? (
                <div className="text-center py-20 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Content not found</p>
                </div>
              ) : (
                <>
                  {/* Content body */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Content</p>
                    <div className="rounded-lg bg-muted/50 border p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{content.content}</p>
                    </div>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Created</p>
                      <p className="text-sm font-medium">{new Date(content.createdAt).toLocaleDateString()}</p>
                    </div>
                    {content.scheduledPublishDate && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Scheduled</p>
                        <p className="text-sm font-medium">{new Date(content.scheduledPublishDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {content.wordCount && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Word Count</p>
                        <p className="text-sm font-medium">{content.wordCount} words</p>
                      </div>
                    )}
                    {content.aiModel && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground mb-1">AI Model</p>
                        <p className="text-sm font-medium">{content.aiModel}</p>
                      </div>
                    )}
                  </div>

                  {/* Approval actions */}
                  {canApprove && (
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => setShowApprovalDialog(true)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Content
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowRevisionDialog(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Request Revision
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Approve Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Content</DialogTitle>
            <DialogDescription>Confirm that this content is ready to be published.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approve-comment">Comment (Optional)</Label>
            <Textarea
              id="approve-comment"
              placeholder="Add any comments or feedback..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowApprovalDialog(false); setComment(""); }}>Cancel</Button>
            <Button
              onClick={() => approveMutation.mutate({ contentId: contentId ?? 0 })}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>Provide feedback on what needs to be changed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revision-comment">Feedback *</Label>
            <Textarea
              id="revision-comment"
              placeholder="Please describe what changes are needed..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRevisionDialog(false); setComment(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => requestRevisionMutation.mutate({ contentId: contentId ?? 0, reason: comment })}
              disabled={requestRevisionMutation.isPending || !comment.trim()}
            >
              {requestRevisionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Request Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── My Content sub-tab ───────────────────────────────────────────────────────
function MyContentTab() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: contentList, isLoading } = trpc.seo.content.listForPortal.useQuery(
    undefined,
    { enabled: !!user }
  );

  const clientContent = contentList || [];

  const filteredContent = clientContent.filter((item: any) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "draft": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "published": return <Eye className="h-4 w-4 text-blue-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/10 text-green-500";
      case "draft": return "bg-yellow-500/10 text-yellow-500";
      case "published": return "bg-blue-500/10 text-blue-500";
      case "pending_approval": return "bg-orange-500/10 text-orange-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleOpenContent = (id: number) => {
    setSelectedContentId(id);
    setSheetOpen(true);
  };

  return (
    <div>
      {/* Inline content detail sheet */}
      <ContentDetailSheet
        contentId={selectedContentId}
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setSelectedContentId(null); }}
      />

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "draft", "pending_approval", "approved", "published"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All" : s === "pending_approval" ? "Pending" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading content...</div>
        </div>
      ) : filteredContent.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No content found</h3>
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Your content will appear here once created"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredContent.map((item: any) => (
            <Card
              key={item.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleOpenContent(item.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(item.status)}
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.topic}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    {item.scheduledPublishDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Scheduled: {new Date(item.scheduledPublishDate).toLocaleDateString()}
                      </div>
                    )}
                    {item.wordCount && <span>{item.wordCount} words</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.replace("_", " ")}
                  </Badge>
                  {item.aiModel && (
                    <span className="text-xs text-muted-foreground">{item.aiModel}</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Approvals sub-tab ────────────────────────────────────────────────────────
function ApprovalsTab() {
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [guidanceNotes, setGuidanceNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();
  const { data: pendingApprovals, isLoading } = trpc.contentApprovals.listPending.useQuery({});
  const { data: allApprovals } = trpc.contentApprovals.list.useQuery({});
  const { data: unreadCounts = {} } = trpc.contentApprovals.unreadCommentCounts.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: onboardingStatus } = trpc.clientOnboarding.getStatus.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const showContentReadyBanner =
    onboardingStatus?.completed && pendingApprovals && pendingApprovals.length > 0;

  const socialPending = useMemo(
    () => (pendingApprovals || []).filter((a: any) => isSocialPlatform(a.platform)),
    [pendingApprovals]
  );

  const approveMutation = trpc.contentApprovals.approve.useMutation({
    onSuccess: () => {
      toast.success("Content approved!");
      utils.contentApprovals.listPending.invalidate();
      utils.contentApprovals.list.invalidate();
      setSelectedApproval(null);
    },
    onError: (e: any) => toast.error(`Failed to approve: ${e.message}`),
  });

  const rejectMutation = trpc.contentApprovals.reject.useMutation({
    onSuccess: () => {
      toast.success("Content rejected with feedback");
      utils.contentApprovals.listPending.invalidate();
      utils.contentApprovals.list.invalidate();
      setShowRejectDialog(false);
      setSelectedApproval(null);
      setRejectFeedback("");
    },
    onError: (e: any) => toast.error(`Failed to reject: ${e.message}`),
  });

  const sendSmsMutation = trpc.contentApprovals.sendApprovalSMS.useMutation({
    onSuccess: () => toast.success("SMS approval request sent!"),
    onError: (e: any) => toast.error(`Failed to send SMS: ${e.message}`),
  });

  const bulkMutation = trpc.contentApprovals.bulkApproveAndSchedule.useMutation({
    onSuccess: (data: any) => {
      toast.success(`${data.approved} posts approved and scheduled!`);
      utils.contentApprovals.listPending.invalidate();
      utils.contentApprovals.list.invalidate();
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast.error(`Bulk approve failed: ${e.message}`),
  });

  const regenerateMutation = trpc.contentApprovals.regenerateBatch.useMutation({
    onSuccess: () => {
      toast.success("New content batch is being generated! Check back in a few minutes.");
      setShowRegenerateDialog(false);
      setGuidanceNotes("");
    },
    onError: (e: any) => toast.error(`Failed to regenerate: ${e.message}`),
  });

  function isSocialPlatform(platform: string | null) {
    if (!platform) return false;
    return ["facebook", "instagram", "linkedin", "twitter", "tiktok"].some((p) =>
      platform.toLowerCase().includes(p)
    );
  }

  const handleBulkApproveAll = () => {
    const ids = socialPending.map((a: any) => a.id);
    if (ids.length === 0) return;
    bulkMutation.mutate({ approvalIds: ids });
  };

  const handleBulkSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkMutation.mutate({ approvalIds: ids });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate({ guidanceNotes: guidanceNotes || undefined });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "pending": return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "revised": return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Revised</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const parseStats = (statsJson: string | null) => {
    if (!statsJson) return null;
    try { return JSON.parse(statsJson); } catch { return null; }
  };

  return (
    <div>
      {showContentReadyBanner && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-primary/30 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-cyan-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-cyan-700 dark:text-cyan-300">Your first content batch is ready!</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              We've generated social media posts and website content based on your business profile. Review and approve them below to get started.
            </p>
          </div>
        </div>
      )}
      {onboardingStatus && !onboardingStatus.completed && (
        <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-400/30 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-700 dark:text-amber-300">Complete your setup to generate content</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fill in your business profile and we'll automatically generate your first batch of social media posts and website content.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div />
        {onboardingStatus?.completed && (
          <Button onClick={() => setShowRegenerateDialog(true)} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Regenerate Batch
          </Button>
        )}
      </div>

      {/* Pending Approvals */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Content awaiting your review</CardDescription>
            </div>
            {(pendingApprovals?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                {/* Select All */}
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground select-none">
                  <Checkbox
                    checked={
                      selectedIds.size === (pendingApprovals?.length ?? 0) &&
                      (pendingApprovals?.length ?? 0) > 0
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(new Set((pendingApprovals ?? []).map((a: any) => a.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                  />
                  Select All
                </label>
                {selectedIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleBulkSelected}
                    disabled={bulkMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 gap-1.5"
                  >
                    {bulkMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                    Approve Selected ({selectedIds.size})
                  </Button>
                )}
                {socialPending.length > 0 && selectedIds.size === 0 && (
                  <Button
                    size="sm"
                    onClick={handleBulkApproveAll}
                    disabled={bulkMutation.isPending}
                    variant="outline"
                    className="gap-1.5"
                  >
                    {bulkMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                    Approve All Social ({socialPending.length})
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !pendingApprovals?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-60" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No content is waiting for your approval.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((approval: any) => {
                const stats = parseStats(approval.stats);
                const unread = (unreadCounts as Record<number, number>)[approval.id] || 0;
                const isSocial = isSocialPlatform(approval.platform);
                return (
                  <div
                    key={approval.id}
                    className="border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedApproval(approval)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {isSocial && (
                          <Checkbox
                            checked={selectedIds.has(approval.id)}
                            onCheckedChange={() => toggleSelect(approval.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{approval.title}</h4>
                            {unread > 0 && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0">{unread} new</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="capitalize">{approval.contentType.replace("_", " ")}</span>
                            {approval.platform && <span>· {approval.platform}</span>}
                            {approval.brand && <span>· {approval.brand}</span>}
                            <span>· {new Date(approval.createdAt).toLocaleDateString()}</span>
                          </div>
                          {stats && (
                            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                              {stats.expectedViews && <span>👁 {stats.expectedViews.toLocaleString()} views</span>}
                              {stats.expectedEngagement && <span>💬 {stats.expectedEngagement}% engagement</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(approval.status)}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendSmsMutation.mutate({ approvalId: approval.id });
                          }}
                          title="Send SMS approval request"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Approvals History */}
      {allApprovals && allApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Content</CardTitle>
            <CardDescription>Complete history of your content approvals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allApprovals.filter((a: any) => a.status !== "pending").map((approval: any) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedApproval(approval)}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{approval.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {approval.contentType.replace("_", " ")}
                      {approval.platform && ` · ${approval.platform}`}
                    </p>
                  </div>
                  {getStatusBadge(approval.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      {selectedApproval && (
        <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedApproval.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <span className="capitalize">{selectedApproval.contentType.replace("_", " ")}</span>
                {selectedApproval.platform && <span>· {selectedApproval.platform}</span>}
                {getStatusBadge(selectedApproval.status)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="whitespace-pre-wrap text-sm">{selectedApproval.content}</p>
              </div>
              {selectedApproval.reasoning && (
                <div>
                  <p className="text-sm font-medium mb-1">AI Reasoning</p>
                  <p className="text-sm text-muted-foreground">{selectedApproval.reasoning}</p>
                </div>
              )}
              {selectedApproval.feedback && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm font-medium text-destructive mb-1">Feedback</p>
                  <p className="text-sm">{selectedApproval.feedback}</p>
                </div>
              )}
              <FeedbackThread approvalId={selectedApproval.id} />
            </div>
            {selectedApproval.status === "pending" && (
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowRejectDialog(true); }}
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Request Changes
                </Button>
                <Button
                  onClick={() => approveMutation.mutate({ approvalId: selectedApproval.id })}
                  disabled={approveMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>Let us know what you'd like changed about this content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="feedback">Your Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="e.g., Please use a more formal tone, or focus on first-time homebuyers..."
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate({ approvalId: selectedApproval?.id, feedback: rejectFeedback })}
              disabled={rejectMutation.isPending || !rejectFeedback.trim()}
            >
              {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New Content Batch</DialogTitle>
            <DialogDescription>
              We'll create 12 fresh SEO-optimized pieces tailored to your business.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="guidance">Guidance Notes (optional)</Label>
              <Textarea
                id="guidance"
                placeholder="e.g., Use a more formal tone, focus on refinancing, highlight our low rates..."
                value={guidanceNotes}
                onChange={(e) => setGuidanceNotes(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to regenerate with the same style, or add notes to guide the AI.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>Cancel</Button>
            <Button onClick={handleRegenerate} disabled={regenerateMutation.isPending} className="gap-2">
              {regenerateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {regenerateMutation.isPending ? "Generating..." : "Generate New Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Generate Content Tab ─────────────────────────────────────────────────────
const CONTENT_GROUPS = [
  {
    group: "Website / SEO",
    icon: "🌐",
    types: [
      { value: "blog-post",         label: "Blog Post",         description: "Long-form SEO article" },
      { value: "how-to",            label: "How-To Guide",      description: "Step-by-step instructions" },
      { value: "listicle",          label: "Listicle",          description: "List-based article" },
      { value: "case-study",        label: "Case Study",        description: "Client success story" },
      { value: "guide",             label: "Ultimate Guide",    description: "Comprehensive authority guide" },
      { value: "news",              label: "News Article",      description: "Timely news-style content" },
      { value: "faq",               label: "FAQ Content",       description: "Q&A for your website" },
      { value: "service-page",      label: "Service Page Copy", description: "Persuasive service page" },
      { value: "landing-page",      label: "Landing Page Copy", description: "Conversion-focused page" },
      { value: "product-description",label: "Product Description",description: "Feature-rich product copy" },
    ],
  },
  {
    group: "Email",
    icon: "✉️",
    types: [
      { value: "newsletter",        label: "Newsletter",        description: "Engaging email newsletter" },
      { value: "email-sequence",    label: "Email Sequence",    description: "Multi-email nurture series" },
      { value: "promotional-email", label: "Promotional Email", description: "Offer or campaign email" },
      { value: "follow-up-email",   label: "Follow-Up Email",   description: "Re-engagement email" },
    ],
  },
  {
    group: "Social Media",
    icon: "📱",
    types: [
      { value: "social-post",       label: "Social Media Post",  description: "General social content" },
      { value: "facebook-post",     label: "Facebook Post",      description: "Engagement-driven post" },
      { value: "instagram-caption", label: "Instagram Caption",  description: "Caption with hashtags" },
      { value: "linkedin-post",     label: "LinkedIn Post",      description: "Professional thought leadership" },
      { value: "twitter-post",      label: "X / Twitter Post",   description: "Tweet or short thread" },
      { value: "gbp-post",          label: "Google Business Post",description: "Local SEO post" },
      { value: "carousel-copy",     label: "Carousel Copy",      description: "Slide-by-slide social content" },
      { value: "promotional-social",label: "Promotional Post",   description: "Offer or sale social post" },
      { value: "educational-social",label: "Educational Post",   description: "Tips and insights post" },
      { value: "engagement-social", label: "Engagement Post",    description: "Conversation-starter post" },
    ],
  },
  {
    group: "PR / Authority",
    icon: "📣",
    types: [
      { value: "press-release",     label: "Press Release",     description: "Official announcement" },
      { value: "announcement",      label: "Announcement",      description: "News or update post" },
      { value: "testimonial-story", label: "Testimonial / Success Story", description: "Client result story" },
    ],
  },
  {
    group: "Long-Form / Resources",
    icon: "📚",
    types: [
      { value: "whitepaper",        label: "Whitepaper",        description: "Authoritative research doc" },
      { value: "lead-magnet",       label: "Lead Magnet Copy",  description: "Opt-in resource copy" },
      { value: "guide-resource",    label: "Guide / Resource",  description: "Comprehensive reference guide" },
    ],
  },
];

// Flat list for lookup
const ALL_CONTENT_TYPES = CONTENT_GROUPS.flatMap((g) => g.types);

function GenerateContentTab() {
  const { user } = useAuth();
  const [contentType, setContentType] = useState<string>("blog-post");
  const [topic, setTopic] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [tone, setTone] = useState("professional");
  const [customInstructions, setCustomInstructions] = useState("");
  const [enableWebResearch, setEnableWebResearch] = useState(true);
  const [shouldGenerateImage, setShouldGenerateImage] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ id: number; title: string; content: string } | null>(null);
  const utils = trpc.useUtils();

  // Resolve seo client ID for this portal user — auto-provision if missing
  const { data: myInfo } = trpc.crm.getMyInfo.useQuery(undefined, { enabled: !!user });
  const [resolvedSeoClientId, setResolvedSeoClientId] = useState<number | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const { data: seoClient, isLoading: seoClientLoading } = trpc.seo.clients.getByCrmId.useQuery(
    { crmClientId: myInfo?.client?.id ?? 0 },
    { enabled: !!myInfo?.client?.id }
  );

  const ensureMutation = trpc.seo.clients.ensureForCurrentUser.useMutation({
    onSuccess: (data) => {
      if (data.seoClientId) setResolvedSeoClientId(data.seoClientId);
      setIsProvisioning(false);
    },
    onError: () => setIsProvisioning(false),
  });

  useEffect(() => {
    if (myInfo?.client && !seoClientLoading && !seoClient?.id && !isProvisioning && !resolvedSeoClientId) {
      setIsProvisioning(true);
      ensureMutation.mutate();
    }
    if (seoClient?.id && !resolvedSeoClientId) {
      setResolvedSeoClientId(seoClient.id);
    }
  }, [myInfo, seoClient, seoClientLoading]);

  const effectiveSeoClientId = resolvedSeoClientId ?? seoClient?.id ?? null;

  const generateMutation = trpc.seo.content.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Content generated successfully!");
      setGeneratedResult({ id: data.id, title: data.title, content: data.content });
      utils.seo.content.listForPortal.invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Generation failed. Please try again."),
  });

  const selectedType = ALL_CONTENT_TYPES.find((t) => t.value === contentType);

  const handleGenerate = () => {
    if (!effectiveSeoClientId) {
      toast.error("Your account is not fully set up yet. Please contact your agency.");
      return;
    }
    if (!topic.trim()) {
      toast.error("Please enter a topic to generate content about.");
      return;
    }
    setGeneratedResult(null);
    const customPromptParts = [
      targetKeywords ? `Target keywords: ${targetKeywords}` : "",
      tone !== "professional" ? `Tone: ${tone}` : "",
      customInstructions,
    ].filter(Boolean);

    generateMutation.mutate({
      clientId: effectiveSeoClientId,
      topic: topic.trim(),
      contentType: contentType as any,
      customPrompt: customPromptParts.length > 0 ? customPromptParts.join("\n") : undefined,
      enableWebResearch,
      shouldGenerateImage,
    });
  };

  // If we just generated, show the result inline
  if (generatedResult) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setGeneratedResult(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Generator
          </Button>
          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Draft Saved
          </Badge>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{generatedResult.title}</CardTitle>
            <CardDescription>{selectedType?.label ?? contentType} · Draft</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 border p-4 max-h-[60vh] overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{generatedResult.content}</p>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                className="flex-1"
                onClick={() => {
                  setTopic("");
                  setTargetKeywords("");
                  setCustomInstructions("");
                  setGeneratedResult(null);
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Another
              </Button>
              <Button variant="outline" onClick={() => setGeneratedResult(null)}>
                View in My Content
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Generate New Content</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Choose a content type, enter your topic, and let AI do the writing.</p>
      </div>

      {/* Content type groups */}
      <div className="space-y-4">
        {CONTENT_GROUPS.map((group) => (
          <div key={group.group}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.icon} {group.group}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {group.types.map((ct) => {
                const isActive = contentType === ct.value;
                return (
                  <button
                    key={ct.value}
                    onClick={() => setContentType(ct.value)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all border ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/40 bg-muted/20 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      isActive ? "bg-primary/15" : "bg-muted"
                    }`}>
                      <FileText className={`h-3 w-3 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>
                        {ct.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{ct.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Topic */}
      <div className="space-y-1.5">
        <Label htmlFor="topic">
          Topic <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="topic"
          placeholder={`e.g. ${selectedType?.label === "Instagram Caption" ? "Behind-the-scenes look at how we help first-time homebuyers" : selectedType?.label === "Newsletter" ? "This month's mortgage rate update and what it means for buyers" : "5 reasons first-time homebuyers should work with a local mortgage broker"}`}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Keywords */}
      <div className="space-y-1.5">
        <Label htmlFor="keywords">
          Target Keywords <span className="text-muted-foreground/60 font-normal">(optional)</span>
        </Label>
        <Input
          id="keywords"
          placeholder="e.g. first-time homebuyer, Dallas mortgage, FHA loan"
          value={targetKeywords}
          onChange={(e) => setTargetKeywords(e.target.value)}
        />
      </div>

      {/* Tone */}
      <div className="space-y-1.5">
        <Label>Tone</Label>
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly &amp; Approachable</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="authoritative">Authoritative</SelectItem>
            <SelectItem value="inspirational">Inspirational</SelectItem>
            <SelectItem value="conversational">Conversational</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom instructions */}
      <div className="space-y-1.5">
        <Label htmlFor="instructions">
          Custom Instructions <span className="text-muted-foreground/60 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="instructions"
          placeholder="e.g. Mention our 5-star Google rating. Include a section about down payment assistance. Keep it under 600 words."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enableWebResearch}
            onChange={(e) => setEnableWebResearch(e.target.checked)}
            className="rounded accent-primary"
          />
          <span className="text-sm text-muted-foreground">Enable web research</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={shouldGenerateImage}
            onChange={(e) => setShouldGenerateImage(e.target.checked)}
            className="rounded accent-primary"
          />
          <span className="text-sm text-muted-foreground">Generate featured image</span>
        </label>
      </div>

      {/* Generate button */}
      <div className="space-y-2">
        <Button
          className="w-full h-11 text-base"
          onClick={handleGenerate}
          disabled={!topic.trim() || generateMutation.isPending || isProvisioning}
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating {selectedType?.label ?? "Content"}…
            </>
          ) : isProvisioning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up your account…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate {selectedType?.label ?? "Content"}
            </>
          )}
        </Button>
        {!topic.trim() && (
          <p className="text-xs text-muted-foreground text-center">Enter a topic above to get started</p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PortalApexContent() {
  const [activeTab, setActiveTab] = useState<Tab>("approvals");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "approvals", label: "Approvals", icon: <CheckSquare className="h-4 w-4" /> },
    { id: "my-content", label: "My Content", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "generate", label: "Generate", icon: <Sparkles className="h-4 w-4" /> },
  ];

  return (
    <PortalLayout activePath="/seo/portal/apex-content">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Apex Content</h2>
            <p className="text-sm mt-1 text-muted-foreground">
              Review approvals, manage published content, and generate new AI content
            </p>
          </div>
          <Button
            onClick={() => setActiveTab("generate")}
            variant="outline"
            className="shrink-0 hidden sm:flex border-primary/30 text-primary hover:bg-primary/5"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Content
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-lg mb-6 w-fit bg-muted border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "approvals" && <ApprovalsTab />}
      {activeTab === "my-content" && <MyContentTab />}
      {activeTab === "generate" && <GenerateContentTab />}
    </PortalLayout>
  );
}
