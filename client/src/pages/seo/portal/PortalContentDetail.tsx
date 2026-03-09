import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PortalContentDetail() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const contentId = parseInt(params.id || "0");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [comment, setComment] = useState("");


  const { data: content, isLoading, refetch } = trpc.seo.content.getById.useQuery(
    { id: contentId },
    { enabled: contentId > 0 && !!user }
  );

  const approveMutation = trpc.seo.approvals.approve.useMutation();
  const requestRevisionMutation = trpc.seo.approvals.requestRevision.useMutation();

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ contentId });
      toast.success("Content approved successfully");
      setShowApprovalDialog(false);
      setComment("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve content");
    }
  };

  const handleRequestRevision = async () => {
    if (!comment.trim()) {
      toast.error("Please provide feedback for the revision");
      return;
    }
    try {
      await requestRevisionMutation.mutateAsync({ contentId, reason: comment });
      toast.success("Revision requested successfully");
      setShowRevisionDialog(false);
      setComment("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to request revision");
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isLoading) {
    return (
      <PortalLayout activePath="/seo/portal/content">
        <div className="flex items-center justify-center py-32">
          <div className="animate-pulse" style={{ color: "rgba(0,255,255,0.5)" }}>Loading content...</div>
        </div>
      </PortalLayout>
    );
  }

  if (!content) {
    return (
      <PortalLayout activePath="/seo/portal/content">
        <div className="flex items-center justify-center py-32">
          <Card className="p-8 text-center max-w-md">
            <h2 className="text-xl font-semibold mb-2">Content not found</h2>
            <p className="text-muted-foreground mb-4">This content doesn't exist or you don't have access to it.</p>
            <Link href="/seo/portal/content">
              <Button>Back to Content List</Button>
            </Link>
          </Card>
        </div>
      </PortalLayout>
    );
  }

  const canApprove = content.status === "draft" || content.status === "in_progress";

  const statusClass =
    content.status === "approved"
      ? "bg-green-500/10 text-green-500 border-green-500/30"
      : content.status === "in_progress"
      ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";

  return (
    <PortalLayout activePath="/seo/portal/content">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3">
          <Link href="/seo/portal/content">
            <Button variant="ghost" size="sm" className="mt-1">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white">{content.title}</h2>
            <p className="text-sm mt-1" style={{ color: "rgba(0,255,255,0.5)" }}>{content.topic}</p>
          </div>
        </div>
        <Badge className={statusClass}>
          {content.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content.content || "<p>No content generated yet</p>" }}
              />
            </CardContent>
          </Card>

          {canApprove && (
            <Card>
              <CardHeader>
                <CardTitle>Approval Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button className="flex-1" onClick={() => setShowApprovalDialog(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Content
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowRevisionDialog(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Request Revision
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(content.createdAt).toLocaleDateString()}</p>
              </div>
              {content.scheduledPublishDate && (
                <div>
                  <p className="text-muted-foreground">Scheduled</p>
                  <p className="font-medium">{new Date(content.scheduledPublishDate).toLocaleDateString()}</p>
                </div>
              )}
              {content.wordCount && (
                <div>
                  <p className="text-muted-foreground">Word Count</p>
                  <p className="font-medium">{content.wordCount} words</p>
                </div>
              )}
              {content.aiModel && (
                <div>
                  <p className="text-muted-foreground">AI Model</p>
                  <p className="font-medium">{content.aiModel}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Approve Content</CardTitle>
              <p className="text-sm text-muted-foreground">Confirm that this content is ready to be published</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Comment (Optional)</label>
                <Textarea
                  placeholder="Add any comments or feedback..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowApprovalDialog(false); setComment(""); }}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleApprove} disabled={approveMutation.isPending}>
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revision Dialog */}
      {showRevisionDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Request Revision</CardTitle>
              <p className="text-sm text-muted-foreground">Provide feedback on what needs to be changed</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Feedback *</label>
                <Textarea
                  placeholder="Please describe what changes are needed..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowRevisionDialog(false); setComment(""); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRequestRevision}
                  disabled={requestRevisionMutation.isPending || !comment.trim()}
                >
                  {requestRevisionMutation.isPending ? "Sending..." : "Request Revision"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PortalLayout>
  );
}
