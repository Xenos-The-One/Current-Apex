import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, Send, Eye, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
export default function ContentApprovals() {
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");

  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: pendingApprovals, isLoading } = trpc.contentApprovals.listPending.useQuery({});
  const { data: allApprovals } = trpc.contentApprovals.list.useQuery({});
  const { data: onboardingStatus } = trpc.clientOnboarding.getStatus.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const showContentReadyBanner = onboardingStatus?.completed && pendingApprovals && pendingApprovals.length > 0;

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

  const handleApprove = (approvalId: number) => {
    approveMutation.mutate({ approvalId });
  };

  const handleReject = () => {
    if (!selectedApproval) return;
    if (!rejectFeedback.trim()) {
      toast.error("Please provide feedback");
      return;
    }

    rejectMutation.mutate({
      approvalId: selectedApproval.id,
      feedback: rejectFeedback,
    });
  };

  const handleSendSMS = (approvalId: number) => {
    sendSmsMutation.mutate({ approvalId });
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
    try {
      return JSON.parse(statsJson);
    } catch {
      return null;
    }
  };

  return (
    <DashboardLayout>
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
            <button onClick={() => setLocation("/client-onboarding")} className="mt-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline">Complete Setup →</button>
          </div>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve content before it goes live
        </p>
      </div>

      {/* Pending Approvals */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Content awaiting your review</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingApprovals && pendingApprovals.length > 0 ? (
            <div className="space-y-4">
              {pendingApprovals.map((approval: any) => (
                <Card key={approval.id} className="border-2 border-yellow-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{approval.brand}</Badge>
                          <Badge variant="secondary">{approval.contentType}</Badge>
                          {approval.platform && <Badge variant="secondary">{approval.platform}</Badge>}
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{approval.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          For: {approval.approverName} • Created {new Date(approval.createdAt).toLocaleDateString()}
                        </p>
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
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedApproval(approval)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Full
                      </Button>
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
                      <Button
                        onClick={() => {
                          setSelectedApproval(approval);
                          setShowRejectDialog(true);
                        }}
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
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No pending approvals</p>
              <p className="text-sm">All content has been reviewed</p>
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
                  <Button
                    onClick={() => setSelectedApproval(approval)}
                    variant="ghost"
                    size="sm"
                  >
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
              <DialogDescription>
                {selectedApproval.brand} • {selectedApproval.contentType}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Full Content */}
              <div>
                <h4 className="font-semibold mb-2">Content:</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedApproval.content}</p>
                </div>
              </div>

              {/* Reasoning */}
              {selectedApproval.reasoning && (
                <div>
                  <h4 className="font-semibold mb-2">📊 Statistical Reasoning:</h4>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <p className="text-sm">{selectedApproval.reasoning}</p>
                  </div>
                </div>
              )}

              {/* Feedback (if rejected) */}
              {selectedApproval.feedback && (
                <div>
                  <h4 className="font-semibold mb-2">Feedback:</h4>
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                    <p className="text-sm">{selectedApproval.feedback}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              {selectedApproval.status === "pending" && (
                <>
                  <Button
                    onClick={() => handleApprove(selectedApproval.id)}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    variant="destructive"
                  >
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
              <DialogDescription>
                Provide feedback for why this content needs revision
              </DialogDescription>
            </DialogHeader>

            <div>
              <Textarea
                placeholder="e.g., The hook isn't strong enough. Try leading with a question instead..."
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                rows={6}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectFeedback.trim()}
                variant="destructive"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject with Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </DashboardLayout>
  );
}
