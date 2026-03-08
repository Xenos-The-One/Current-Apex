import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  CheckCircle,
  Clock,
  Eye,
  ThumbsUp,
  MessageSquare,
  Loader2,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-400", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-400", icon: Clock },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
};

export default function ClientPortal() {
  const { user } = useAuth();
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [comment, setComment] = useState("");

  const { data: contentList, isLoading } = trpc.seo.content.list.useQuery();
  const approveMutation = trpc.seo.content.update.useMutation();
  const addCommentMutation = trpc.seo.collaboration.addComment.useMutation();

  const isClient = user?.role === "user";

  const handleApprove = async (contentId: number) => {
    try {
      await approveMutation.mutateAsync({ id: contentId, status: "approved", progress: 100 });
      toast.success("Content approved successfully!");
    } catch {
      toast.error("Failed to approve content");
    }
  };

  const handleAddComment = async (contentId: number) => {
    if (!comment.trim()) return;
    try {
      await addCommentMutation.mutateAsync({ contentId, comment: comment.trim() });
      setComment("");
      toast.success("Feedback submitted!");
    } catch {
      toast.error("Failed to submit feedback");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            {isClient ? "My Content" : "Client Portal Preview"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {isClient
            ? "Review and approve content created for you. Leave feedback on any piece."
            : "This is how clients see their content. Switch to a client account to test the restricted view."}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Content</p>
                <p className="text-3xl font-bold">{contentList?.length || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold">
                  {contentList?.filter((c) => c.content.status !== "approved").length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold">
                  {contentList?.filter((c) => c.content.status === "approved").length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {contentList && contentList.length > 0 ? (
          contentList.map((item) => {
            const config = statusConfig[item.content.status] || statusConfig.draft;
            const StatusIcon = config.icon;
            return (
              <Card key={item.content.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Blog featured image */}
                    {item.content.imageUrl ? (
                      <div className="shrink-0 w-28 h-20 rounded-lg overflow-hidden border border-border/50">
                        <img
                          src={item.content.imageUrl}
                          alt={item.content.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="shrink-0 w-28 h-20 rounded-lg bg-muted flex items-center justify-center border border-border/50">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Content info + actions */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold truncate">{item.content.title}</h3>
                            <Badge className={config.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Topic: {item.content.topic}
                          </p>
                          {item.client && (
                            <p className="text-xs text-muted-foreground">
                              Client: {item.client.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(item.content.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* View Content Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedContent(item.content)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{item.content.title}</DialogTitle>
                              </DialogHeader>
                              {item.content.imageUrl && (
                                <img
                                  src={item.content.imageUrl}
                                  alt="Featured"
                                  className="w-full h-64 object-cover rounded-lg mb-4"
                                />
                              )}
                              <div className="prose prose-invert max-w-none">
                                <Streamdown>{item.content.content}</Streamdown>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Feedback Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Feedback
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Leave Feedback</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Share your thoughts, suggestions, or requested changes..."
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  rows={4}
                                />
                                <Button
                                  onClick={() => handleAddComment(item.content.id)}
                                  disabled={addCommentMutation.isPending || !comment.trim()}
                                  className="w-full"
                                >
                                  {addCommentMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                  )}
                                  Submit Feedback
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Approve Button */}
                          {item.content.status !== "approved" && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(item.content.id)}
                              disabled={approveMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <ThumbsUp className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No content available yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Content assigned to you will appear here for review
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
