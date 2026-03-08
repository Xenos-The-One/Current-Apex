import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, MessageSquare, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Approvals() {
  const [, setLocation] = useLocation();
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [revisionReason, setRevisionReason] = useState("");

  const { data: pendingApprovals, isLoading, refetch } = trpc.seo.approvals.getPendingApprovals.useQuery();
  const { data: stats } = trpc.seo.approvals.getStats.useQuery();
  const approveMutation = trpc.seo.approvals.approve.useMutation();
  const requestRevisionMutation = trpc.seo.approvals.requestRevision.useMutation();

  const handleApprove = async (contentId: number, title: string) => {
    try {
      await approveMutation.mutateAsync({ contentId });
      toast.success(`"${title}" has been approved`);
      refetch();
    } catch (error) {
      toast.error("Failed to approve content");
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedContentId || !revisionReason.trim()) {
      toast.error("Please provide a reason for revision");
      return;
    }

    try {
      await requestRevisionMutation.mutateAsync({
        contentId: selectedContentId,
        reason: revisionReason
      });
      toast.success("Revision requested successfully");
      setRevisionDialogOpen(false);
      setRevisionReason("");
      setSelectedContentId(null);
      refetch();
    } catch (error) {
      toast.error("Failed to request revision");
    }
  };

  const openRevisionDialog = (contentId: number) => {
    setSelectedContentId(contentId);
    setRevisionDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Content Approvals</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve content before publishing
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              <p className="text-3xl font-bold mt-2">{stats?.pending || 0}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <p className="text-3xl font-bold mt-2">{stats?.approved || 0}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Revision Requested</p>
              <p className="text-3xl font-bold mt-2">{stats?.revisionRequested || 0}</p>
            </div>
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Pending Approvals List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
        
        {!pendingApprovals || pendingApprovals.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No content pending approval</p>
            <p className="text-sm text-muted-foreground mt-2">
              Content will appear here when it's ready for review
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map((content) => (
              <Card key={content.id} className="p-6 border-l-4 border-l-yellow-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{content.title}</h3>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500">
                        Pending Approval
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {content.topic}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Word Count: {content.wordCount}</span>
                      <span>•</span>
                      <span>Updated: {new Date(content.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/content/${content.id}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View & Comment
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRevisionDialog(content.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(content.id, content.title)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Revision Request Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Explain what changes are needed for this content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Revision Reason</Label>
              <Textarea
                id="reason"
                placeholder="Please describe what needs to be changed..."
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                rows={5}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevisionDialogOpen(false);
                setRevisionReason("");
                setSelectedContentId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestRevision}
              disabled={requestRevisionMutation.isPending || !revisionReason.trim()}
            >
              {requestRevisionMutation.isPending ? "Requesting..." : "Request Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
