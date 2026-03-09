import { useState, useMemo } from "react";
import { Link } from "wouter";
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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText, Search, Calendar, Eye, CheckCircle, Clock, XCircle,
  Loader2, Send, Sparkles, RefreshCw, CalendarPlus, CheckSquare, LayoutGrid,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { FeedbackThread } from "@/components/FeedbackThread";

type Tab = "my-content" | "approvals";

// ─── My Content sub-tab ───────────────────────────────────────────────────────
function MyContentTab() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  return (
    <div>
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
            <Link key={item.id} href={`/seo/portal/content/${item.id}`}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
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
            </Link>
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
        <div className="mb-6 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 p-4 flex items-start gap-3">
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
            {socialPending.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                {selectedIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleBulkSelected}
                    disabled={bulkMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 gap-1.5"
                  >
                    {bulkMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                    Approve & Schedule Selected ({selectedIds.size})
                  </Button>
                )}
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PortalApexContent() {
  const [activeTab, setActiveTab] = useState<Tab>("approvals");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "approvals", label: "Approvals", icon: <CheckSquare className="h-4 w-4" /> },
    { id: "my-content", label: "My Content", icon: <LayoutGrid className="h-4 w-4" /> },
  ];

  return (
    <PortalLayout activePath="/seo/portal/apex-content">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Apex Content</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(0,255,255,0.5)" }}>
          Review approvals and manage your published content
        </p>
      </div>

      {/* Tab switcher */}
      <div
        className="flex gap-1 p-1 rounded-lg mb-6 w-fit"
        style={{ backgroundColor: "rgba(0,255,255,0.06)", border: "1px solid rgba(0,255,255,0.12)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={
              activeTab === tab.id
                ? { backgroundColor: "rgba(0,255,255,0.15)", color: "#00FFFF" }
                : { color: "rgba(255,255,255,0.55)" }
            }
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "approvals" ? <ApprovalsTab /> : <MyContentTab />}
    </PortalLayout>
  );
}
