import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FeedbackThreadProps {
  contentApprovalId: number;
  /** Compact mode — show only comment count badge, expand on click */
  compact?: boolean;
}

export function FeedbackThread({ contentApprovalId, compact = false }: FeedbackThreadProps) {
  const [open, setOpen] = useState(!compact);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: comments = [], isLoading } = trpc.contentApprovals.listComments.useQuery(
    { contentApprovalId },
    { enabled: open || !compact }
  );

  const addComment = trpc.contentApprovals.addComment.useMutation({
    onSuccess: () => {
      setDraft("");
      utils.contentApprovals.listComments.invalidate({ contentApprovalId });
      toast.success("Comment added");
    },
    onError: (err) => toast.error(err.message),
  });

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length, open]);

  const handleSubmit = () => {
    const msg = draft.trim();
    if (!msg) return;
    addComment.mutate({ contentApprovalId, message: msg });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (compact) {
    return (
      <div className="mt-3 border-t border-border/50 pt-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span>
            {comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? "s" : ""}` : "Add comment"}
          </span>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {open && (
          <div className="mt-2">
            <ThreadBody
              comments={comments}
              isLoading={isLoading}
              draft={draft}
              setDraft={setDraft}
              onSubmit={handleSubmit}
              onKeyDown={handleKeyDown}
              isPending={addComment.isPending}
              bottomRef={bottomRef}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Feedback Thread
          {comments.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">({comments.length})</span>
          )}
        </span>
      </div>
      <ThreadBody
        comments={comments}
        isLoading={isLoading}
        draft={draft}
        setDraft={setDraft}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        isPending={addComment.isPending}
        bottomRef={bottomRef}
      />
    </div>
  );
}

interface ThreadBodyProps {
  comments: Array<{
    id: number;
    message: string;
    authorRole: "admin" | "client";
    createdAt: Date | string;
    authorName: string;
  }>;
  isLoading: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isPending: boolean;
  bottomRef: React.RefObject<HTMLDivElement>;
}

function ThreadBody({
  comments,
  isLoading,
  draft,
  setDraft,
  onSubmit,
  onKeyDown,
  isPending,
  bottomRef,
}: ThreadBodyProps) {
  return (
    <div className="space-y-3">
      {/* Comment list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-1">No comments yet. Start the conversation.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {comments.map((c) => {
            const isAdmin = c.authorRole === "admin";
            return (
              <div
                key={c.id}
                className={`flex gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isAdmin
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {(c.authorName ?? "?")[0].toUpperCase()}
                </div>
                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                    isAdmin
                      ? "bg-primary/10 text-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-semibold">{c.authorName}</span>
                    <span className="text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{c.message}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Compose */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a comment… (Ctrl+Enter to send)"
          className="min-h-[60px] text-xs resize-none"
          rows={2}
        />
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={!draft.trim() || isPending}
          className="flex-shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
