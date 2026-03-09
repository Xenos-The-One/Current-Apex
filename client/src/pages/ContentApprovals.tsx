import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, Send, Eye, Sparkles, RefreshCw, CalendarPlus, CheckSquare } from "lucide-react";
import { FeedbackThread } from "@/components/FeedbackThread";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import PortalLayout from "@/components/PortalLayout";

export default function ContentApprovals() {
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");

  // Regenerate dialog state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [guidanceNotes, setGuidanceNotes] = useState("");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [currentPath, setLocation] = useLocation();
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
  const showContentReadyBanner = onboardingStatus?.completed && pendingApprovals && pendingApprovals.length > 0;

  // Social-only pending approvals for bulk action
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
    onError: (error: any) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
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
    onError: (error: any) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const sendSmsMutation = trpc.contentApprovals.sendApprovalSMS.useMutation({
    onSuccess: () => {
      toast.success("SMS approval request sent!");
    },
    onError: (error: any) => {
      toast.error(`Failed to send SMS: ${error.message}`);
    },
  });

  // Regenerate mutation
  const regenerateMutation = trpc.clientOnboarding.requestRegenerate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "New content batch is being generated!");
      setShowRegenerateDialog(false);
      setGuidanceNotes("");
      setTimeout(() => {
        utils.contentApprovals.listPending.invalidate();
        utils.contentApprovals.list.invalidate();
      }, 5000);
    },
    onError: (error: any) => {
      toast.error(`Failed to regenerate: ${error.message}`);
    },
  });

  // Auto-schedule to Social Media mutation
  const scheduleToSocialMutation = trpc.contentApprovals.scheduleApprovedToSocial.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Scheduled to Social Media!");
      utils.contentApprovals.listPending.invalidate();
      utils.contentApprovals.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to schedule: ${error.message}`);
    },
  });

  // Bulk approve & schedule mutation
  const bulkMutation = trpc.contentApprovals.bulkApproveAndSchedule.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedIds(new Set());
      utils.contentApprovals.listPending.invalidate();
      utils.contentApprovals.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Bulk action failed: ${error.message}`);
    },
  });

  const handleApprove = (approvalId: number) => {
    approveMutation.mutate({ approvalId });
  };

  const handleApproveAndSchedule = (approval: any) => {
    approveMutation.mutate(
      { approvalId: approval.id },
      {
        onSuccess: () => {
          const platform = (approval.platform || "").toLowerCase();
          const isSocialPost = ["facebook", "instagram", "linkedin", "twitter", "tiktok"].some((p) =>
            platform.includes(p)
          );
          if (isSocialPost) {
            scheduleToSocialMutation.mutate({ approvalId: approval.id });
          }
        },
      }
    );
  };

  const handleReject = () => {
    if (!selectedApproval) return;
    if (!rejectFeedback.trim()) {
      toast.error("Please provide feedback");
      return;
    }
    rejectMutation.mutate({ approvalId: selectedApproval.id, feedback: rejectFeedback });
  };

  const handleSendSMS = (approvalId: number) => {
    sendSmsMutation.mutate({ approvalId });
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate({ guidanceNotes: guidanceNotes.trim() || undefined });
  };

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

  const toggleSelectAll = () => {
    if (selectedIds.size === socialPending.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(socialPending.map((a: any) => a.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "revised":
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Revised</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const parseStats = (statsJson: string | null) => {
    if (!statsJson) return null;
    try { return JSON.parse(statsJson); } catch { return null; }
  };

  function isSocialPlatform(platform: string | null) {
    if (!platform) return false;
    return ["facebook", "instagram", "linkedin", "twitter", "tiktok"].some((p) =>
      platform.toLowerCase().includes(p)
    );
  }

  const isPortal = currentPath.startsWith("/seo/portal");
  const content = (
    <div className="container py-8">
        {showContentReadyBanner && (
          <div className="mb-6 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-cyan-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-cyan-700 dark:text-cyan-300">Your first content batch is ready!</p>
              <p className="text-sm text-muted-foreground mt-0.5">We've generated social media posts and website content based on your business profile. Review and approve them below to get started.</p>
            </div>
          </div>
        )}
        {onboardingStatus && !onboardingStatus.completed && (
          <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-400/30 p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-700 dark:text-amber-300">Complete your setup to generate content</p>
              <p className="text-sm text-muted-foreground mt-0.5">Fill in your business profile and we'll automatically generate your first batch of social media posts and website content.</p>
              <button onClick={() => setLocation("/account-setup")} className="mt-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline">Complete Setup →</button>
            </div>
          </div>
        )}

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Content Approvals</h1>
            <p className="text-muted-foreground">Review and approve content before it goes live</p>
          </div>
          {onboardingStatus?.completed && (
            <Button onClick={() => setShowRegenerateDialog(true)} variant="outline" className="shrink-0 gap-2">
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
              {/* Bulk action bar — shown when social posts are pending */}
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
                    Approve All Social Posts ({socialPending.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleSelectAll}
                    className="text-xs text-muted-foreground"
                  >
                    {selectedIds.size === socialPending.length ? "Deselect All" : "Select All"}
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
            ) : pendingApprovals && pendingApprovals.length > 0 ? (
              <div className="space-y-4">
                {pendingApprovals.map((approval: any) => {
                  const isSocial = isSocialPlatform(approval.platform);
                  const isSelected = selectedIds.has(approval.id);
                  return (
                    <Card key={approval.id} className={`border-2 transition-colors ${isSelected ? "border-primary/60 bg-primary/5" : "border-yellow-200"}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3 flex-1">
                            {/* Checkbox for social posts */}
                            {isSocial && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(approval.id)}
                                className="mt-1 shrink-0"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{approval.brand}</Badge>
                                <Badge variant="secondary">{approval.contentType}</Badge>
                                {approval.platform && <Badge variant="secondary">{approval.platform}</Badge>}
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{approval.title}</h3>
                                {(unreadCounts as Record<number, number>)[approval.id] > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                                    {(unreadCounts as Record<number, number>)[approval.id]} new
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                For: {approval.approverName} • Created {new Date(approval.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(approval.status)}
                        </div>

                        {/* Content Preview */}
                        <div className="bg-muted p-4 rounded-lg mb-4">
                          <p className="text-sm whitespace-pre-wrap line-clamp-6">{approval.content}</p>
                        </div>

                        {/* Reasoning */}
                        {approval.reasoning && (
                          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                            <h4 className="font-semibold text-sm mb-2">📊 Why This Works:</h4>
                            <p className="text-sm">{approval.reasoning}</p>
                          </div>
                        )}

                        {/* Stats */}
                        {approval.stats && parseStats(approval.stats) && (
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            {parseStats(approval.stats)?.expectedViews && (
                              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">
                                  {parseStats(approval.stats).expectedViews.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">Expected Views</p>
                              </div>
                            )}
                            {parseStats(approval.stats)?.expectedEngagement && (
                              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <p className="text-2xl font-bold text-blue-600">
                                  {parseStats(approval.stats).expectedEngagement}%
                                </p>
                                <p className="text-xs text-muted-foreground">Engagement Rate</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => setSelectedApproval(approval)} variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Full
                          </Button>
                          {isSocial ? (
                            <Button
                              onClick={() => handleApproveAndSchedule(approval)}
                              disabled={approveMutation.isPending || scheduleToSocialMutation.isPending}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {(approveMutation.isPending || scheduleToSocialMutation.isPending) ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CalendarPlus className="w-4 h-4 mr-2" />
                              )}
                              Approve & Schedule
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleApprove(approval.id)}
                              disabled={approveMutation.isPending}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Approve
                            </Button>
                          )}
                          <Button
                            onClick={() => { setSelectedApproval(approval); setShowRejectDialog(true); }}
                            variant="destructive"
                            size="sm"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          {!approval.smsApprovalSent && (
                            <Button
                              onClick={() => handleSendSMS(approval.id)}
                              disabled={sendSmsMutation.isPending}
                              variant="outline"
                              size="sm"
                            >
                              {sendSmsMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4 mr-2" />
                              )}
                              Send SMS
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No pending approvals</p>
                <p className="text-sm">All content has been reviewed</p>
                {onboardingStatus?.completed && (
                  <Button onClick={() => setShowRegenerateDialog(true)} variant="outline" size="sm" className="mt-4 gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Generate New Batch
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Approvals History */}
        <Card>
          <CardHeader>
            <CardTitle>Approval History</CardTitle>
            <CardDescription>All content approval requests</CardDescription>
          </CardHeader>
          <CardContent>
            {allApprovals && allApprovals.length > 0 ? (
              <div className="space-y-2">
                {allApprovals.map((approval: any) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{approval.brand}</Badge>
                        {getStatusBadge(approval.status)}
                      </div>
                      <h4 className="font-medium text-sm">{approval.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {approval.contentType} • {new Date(approval.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button onClick={() => setSelectedApproval(approval)} variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No approval history yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Full Content Dialog */}
        {selectedApproval && !showRejectDialog && (
          <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedApproval.title}</DialogTitle>
                <DialogDescription>{selectedApproval.brand} • {selectedApproval.contentType}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Content:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedApproval.content}</p>
                  </div>
                </div>
                {selectedApproval.reasoning && (
                  <div>
                    <h4 className="font-semibold mb-2">📊 Statistical Reasoning:</h4>
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <p className="text-sm">{selectedApproval.reasoning}</p>
                    </div>
                  </div>
                )}
                {selectedApproval.feedback && (
                  <div>
                    <h4 className="font-semibold mb-2">Feedback:</h4>
                    <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                      <p className="text-sm">{selectedApproval.feedback}</p>
                    </div>
                  </div>
                )}
                {/* Feedback Thread */}
                <FeedbackThread
                  contentApprovalId={selectedApproval.id}
                  unreadCount={(unreadCounts as Record<number, number>)[selectedApproval.id] ?? 0}
                />
              </div>
              <DialogFooter>
                {selectedApproval.status === "pending" && (
                  <>
                    {isSocialPlatform(selectedApproval.platform) ? (
                      <Button
                        onClick={() => { handleApproveAndSchedule(selectedApproval); setSelectedApproval(null); }}
                        disabled={approveMutation.isPending || scheduleToSocialMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Approve & Schedule
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleApprove(selectedApproval.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    )}
                    <Button onClick={() => setShowRejectDialog(true)} variant="destructive">
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Reject Dialog */}
        {showRejectDialog && selectedApproval && (
          <Dialog open={showRejectDialog} onOpenChange={() => setShowRejectDialog(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Content</DialogTitle>
                <DialogDescription>Provide feedback for why this content needs revision</DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="e.g., The hook isn't strong enough. Try leading with a question instead..."
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                rows={6}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleReject}
                  disabled={rejectMutation.isPending || !rejectFeedback.trim()}
                  variant="destructive"
                >
                  {rejectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Reject with Feedback
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Regenerate Dialog */}
        <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Generate New Content Batch
              </DialogTitle>
              <DialogDescription>
                We'll create 12 fresh SEO-optimized pieces (Facebook, Instagram, LinkedIn, blog posts, and website copy) tailored to your business.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="guidance">Guidance Notes (optional)</Label>
                <Textarea
                  id="guidance"
                  placeholder="e.g., Use a more formal tone, focus on refinancing, highlight our low rates, target first-time homebuyers..."
                  value={guidanceNotes}
                  onChange={(e) => setGuidanceNotes(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to regenerate with the same style, or add notes to guide the AI in a new direction.
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">What you'll get:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>3 Facebook posts with CTAs and hashtags</li>
                  <li>3 Instagram posts with visual-friendly copy</li>
                  <li>2 LinkedIn thought leadership posts</li>
                  <li>2 SEO blog post drafts with H1/meta/H2</li>
                  <li>2 website copy pieces (hero + services)</li>
                </ul>
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

  if (isPortal) {
    return <PortalLayout activePath="/seo/portal/approvals">{content}</PortalLayout>;
  }
  return <DashboardLayout>{content}</DashboardLayout>;
}
