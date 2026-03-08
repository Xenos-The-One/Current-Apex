import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, CheckCircle2, Loader2, Reply, AtSign, ChevronDown, ChevronRight, User, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { toast } from "sonner";

// Extract @mentions from comment text
function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

// Render comment text with highlighted @mentions
function CommentText({ text }: { text: string }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="text-primary font-semibold bg-primary/10 px-0.5 rounded">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

interface CommentCardProps {
  comment: any;
  onReply: (parentId: number, parentText: string) => void;
  onResolve: (id: number) => void;
  onRequestRevision: (commentId: number, contentId: number) => void;
  isResolvePending: boolean;
  depth?: number;
  contentId: number;
}

function CommentCard({ comment, onReply, onResolve, onRequestRevision, isResolvePending, depth = 0, contentId }: CommentCardProps) {
  const [showReplies, setShowReplies] = useState(true);
  const replies = comment.replies || [];
  const isResolved = comment.isResolved === 1;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-primary/20 pl-4" : ""}>
      <div className={`p-3 rounded-lg border mb-2 transition-opacity ${isResolved ? "opacity-50 bg-muted/30" : "bg-card"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-foreground">Team Member</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {isResolved && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300 py-0">Resolved</Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed"><CommentText text={comment.comment} /></p>
              {comment.mentions && comment.mentions.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <AtSign className="h-3 w-3 text-muted-foreground" />
                  {comment.mentions.map((m: string) => (
                    <span key={m} className="text-xs text-primary">@{m}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isResolved && depth === 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onReply(comment.id, comment.comment)}>
                <Reply className="h-3 w-3 mr-1" />Reply
              </Button>
            )}
            {!isResolved && depth === 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-amber-500 hover:text-amber-600"
                onClick={() => onRequestRevision(comment.id, contentId)}
              >
                <RotateCcw className="h-3 w-3 mr-1" />Request Revision
              </Button>
            )}
            {!isResolved && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600 hover:text-green-700" onClick={() => onResolve(comment.id)} disabled={isResolvePending}>
                <CheckCircle2 className="h-3 w-3 mr-1" />Resolve
              </Button>
            )}
          </div>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="ml-6 mb-2">
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2" onClick={() => setShowReplies(!showReplies)}>
            {showReplies ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </button>
          {showReplies && replies.map((reply: any) => (
            <CommentCard key={reply.id} comment={reply} onReply={onReply} onResolve={onResolve} onRequestRevision={onRequestRevision} isResolvePending={isResolvePending} depth={depth + 1} contentId={contentId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Collaboration() {
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const { data: contentList } = trpc.seo.content.list.useQuery();
  const { data: comments, isLoading: commentsLoading } = trpc.seo.collaboration.getComments.useQuery(
    { contentId: parseInt(selectedContentId) },
    { enabled: !!selectedContentId }
  );

  const addCommentMutation = trpc.seo.collaboration.addComment.useMutation({
    onSuccess: () => {
      utils.seo.collaboration.getComments.invalidate({ contentId: parseInt(selectedContentId) });
      setNewComment("");
      setReplyTo(null);
      toast.success(replyTo ? "Reply added" : "Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const resolveCommentMutation = trpc.seo.collaboration.resolveComment.useMutation({
    onSuccess: () => {
      utils.seo.collaboration.getComments.invalidate({ contentId: parseInt(selectedContentId) });
      toast.success("Comment resolved");
    },
    onError: () => toast.error("Failed to resolve comment"),
  });

  const [revisionDialog, setRevisionDialog] = useState<{ commentId: number; contentId: number } | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

  const requestRevisionMutation = trpc.seo.collaboration.requestRevision.useMutation({
    onSuccess: () => {
      utils.seo.collaboration.getComments.invalidate({ contentId: parseInt(selectedContentId) });
      utils.seo.content.list.invalidate();
      setRevisionDialog(null);
      setRevisionNote("");
      toast.success("Revision requested — content moved back to In Progress");
    },
    onError: () => toast.error("Failed to request revision"),
  });

  const handleRequestRevision = (commentId: number, contentId: number) => {
    setRevisionDialog({ commentId, contentId });
    setRevisionNote("");
  };

  const handleAddComment = () => {
    if (!selectedContentId || !newComment.trim()) {
      toast.error("Please select content and enter a comment");
      return;
    }
    const mentions = extractMentions(newComment);
    addCommentMutation.mutate({
      contentId: parseInt(selectedContentId),
      comment: newComment,
      parentCommentId: replyTo?.id,
      mentions,
    });
  };

  const handleReply = (parentId: number, parentText: string) => {
    setReplyTo({ id: parentId, text: parentText });
    setNewComment("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const selectedContent = contentList?.find((c) => c.content.id === parseInt(selectedContentId));
  const pendingComments = (comments || []).filter((c: any) => c.isResolved !== 1);
  const resolvedComments = (comments || []).filter((c: any) => c.isResolved === 1);
  const totalReplies = (comments || []).reduce((sum: number, c: any) => sum + (c.replies?.length || 0), 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Team Collaboration</h1>
        <p className="text-muted-foreground mt-2">Collaborate with your team through threaded comments, @mentions, and feedback</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Content selector + compose */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Select Content</CardTitle></CardHeader>
            <CardContent>
              <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                <SelectTrigger><SelectValue placeholder="Choose a content piece..." /></SelectTrigger>
                <SelectContent>
                  {contentList?.map((item) => (
                    <SelectItem key={item.content.id} value={item.content.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[200px]">{item.content.title}</span>
                        <span className="text-xs text-muted-foreground capitalize">{item.content.status}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedContent && (
                <div className="mt-4 p-3 bg-muted/40 rounded-lg">
                  <h3 className="font-semibold text-sm mb-1">{selectedContent.content.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{selectedContent.content.topic}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{selectedContent.content.status}</Badge>
                    <Badge variant="outline" className="text-xs">{selectedContent.content.progress}% done</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedContentId && (
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <p className="text-xl font-bold text-foreground">{(comments || []).length}</p>
                <p className="text-xs text-muted-foreground">Threads</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xl font-bold text-orange-500">{pendingComments.length}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xl font-bold text-green-500">{resolvedComments.length}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </Card>
            </div>
          )}

          {selectedContentId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {replyTo ? "Reply to Comment" : "Add Comment"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {replyTo && (
                  <div className="p-2 bg-muted/50 rounded border-l-2 border-primary text-xs">
                    <p className="text-muted-foreground mb-0.5">Replying to:</p>
                    <p className="line-clamp-2 text-foreground">{replyTo.text}</p>
                    <button className="text-primary text-xs mt-1 hover:underline" onClick={() => setReplyTo(null)}>Cancel reply</button>
                  </div>
                )}
                <div>
                  <Label htmlFor="comment" className="text-xs text-muted-foreground mb-1.5 block">Use @username to mention team members</Label>
                  <Textarea
                    id="comment"
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment(); }}
                    placeholder={replyTo ? "Write a reply... (@mention to notify)" : "Share feedback... (@mention to notify)"}
                    rows={4}
                    className="text-sm"
                  />
                </div>
                {newComment && extractMentions(newComment).length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <AtSign className="h-3 w-3" />
                    Mentioning: {extractMentions(newComment).map(m => (
                      <span key={m} className="text-primary font-medium">@{m}</span>
                    ))}
                  </div>
                )}
                <Button onClick={handleAddComment} disabled={addCommentMutation.isPending || !newComment.trim()} className="w-full" size="sm">
                  {addCommentMutation.isPending ? (
                    <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Posting...</>
                  ) : (
                    <><MessageSquare className="h-3 w-3 mr-2" />{replyTo ? "Post Reply" : "Post Comment"}<span className="ml-1 text-xs opacity-60">(⌘↵)</span></>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Threaded comments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Feedback Threads
                {(comments || []).length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {(comments || []).length} thread{(comments || []).length !== 1 ? "s" : ""}, {totalReplies} repl{totalReplies !== 1 ? "ies" : "y"}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedContentId ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Select content to view and add feedback</p>
                </div>
              ) : commentsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
              ) : (comments || []).length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No comments yet — be the first to add feedback</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {pendingComments.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Open ({pendingComments.length})</p>
                      {pendingComments.map((comment: any) => (
                        <CommentCard key={comment.id} comment={comment} onReply={handleReply}
                          onResolve={(id) => resolveCommentMutation.mutate({ commentId: id })}
                          onRequestRevision={handleRequestRevision}
                          isResolvePending={resolveCommentMutation.isPending}
                          contentId={parseInt(selectedContentId)} />
                      ))}
                    </div>
                  )}
                  {resolvedComments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resolved ({resolvedComments.length})</p>
                      {resolvedComments.map((comment: any) => (
                        <CommentCard key={comment.id} comment={comment} onReply={handleReply}
                          onResolve={(id) => resolveCommentMutation.mutate({ commentId: id })}
                          onRequestRevision={handleRequestRevision}
                          isResolvePending={resolveCommentMutation.isPending}
                          contentId={parseInt(selectedContentId)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revision Request Dialog */}
      <Dialog open={!!revisionDialog} onOpenChange={(open) => { if (!open) setRevisionDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Request Revision
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will move the content back to <strong>In Progress</strong> and create a revision record.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Revision Notes</label>
              <Textarea
                placeholder="Describe what changes are needed..."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionDialog(null)}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                if (!revisionDialog || !revisionNote.trim()) {
                  toast.error("Please describe what needs to be revised");
                  return;
                }
                requestRevisionMutation.mutate({
                  contentId: revisionDialog.contentId,
                  commentId: revisionDialog.commentId,
                  revisionNote: revisionNote.trim(),
                });
              }}
              disabled={requestRevisionMutation.isPending || !revisionNote.trim()}
            >
              {requestRevisionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Request Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
