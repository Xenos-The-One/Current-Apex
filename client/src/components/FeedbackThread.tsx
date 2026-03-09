import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ChevronDown, ChevronUp, Loader2, AtSign } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface FeedbackThreadProps {
  contentApprovalId: number;
  /** Compact mode — show only comment count badge, expand on click */
  compact?: boolean;
  /** Unread count to show as badge (supplied by parent from unreadCommentCounts query) */
  unreadCount?: number;
}

export function FeedbackThread({ contentApprovalId, compact = false, unreadCount = 0 }: FeedbackThreadProps) {
  const [open, setOpen] = useState(!compact);
  const [draft, setDraft] = useState("");
  const [showMentionHint, setShowMentionHint] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "agency_owner";

  const { data: comments = [], isLoading } = trpc.contentApprovals.listComments.useQuery(
    { contentApprovalId },
    {
      enabled: open || !compact,
      // Invalidate unread counts after loading (marks as read)
      onSuccess: () => {
        utils.contentApprovals.unreadCommentCounts.invalidate();
      },
    }
  );

  const addComment = trpc.contentApprovals.addComment.useMutation({
    onSuccess: () => {
      setDraft("");
      utils.contentApprovals.listComments.invalidate({ contentApprovalId });
      utils.contentApprovals.unreadCommentCounts.invalidate();
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
    // Detect @mention
    let mentionedRole: "admin" | "client" | undefined;
    if (/@admin/i.test(msg)) mentionedRole = "admin";
    else if (/@client/i.test(msg)) mentionedRole = "client";
    addComment.mutate({ contentApprovalId, message: msg, mentionedRole });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "@") {
      setShowMentionHint(true);
      setTimeout(() => setShowMentionHint(false), 3000);
    }
  };

  const insertMention = (role: "admin" | "client") => {
    setDraft((d) => d + `@${role} `);
    setShowMentionHint(false);
  };

  // Unread badge — shown in compact toggle button
  const hasUnread = unreadCount > 0;

  if (compact) {
    return (
      <div className="mt-3 border-t border-border/50 pt-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="relative">
            <MessageCircle className="h-3.5 w-3.5" />
            {hasUnread && !open && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-background" />
            )}
          </span>
          <span>
            {comments.length > 0
              ? `${comments.length} comment${comments.length !== 1 ? "s" : ""}${hasUnread && !open ? ` (${unreadCount} new)` : ""}`
              : "Add comment"}
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
              showMentionHint={showMentionHint}
              onInsertMention={insertMention}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-background" />
          )}
        </span>
        <span className="text-sm font-medium text-foreground">
          Feedback Thread
          {comments.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">({comments.length})</span>
          )}
          {hasUnread && (
            <span className="ml-1.5 text-xs font-semibold text-red-500">{unreadCount} new</span>
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
        showMentionHint={showMentionHint}
        onInsertMention={insertMention}
        isAdmin={isAdmin}
      />
    </div>
  );
}

interface ThreadBodyProps {
  comments: Array<{
    id: number;
    message: string;
    authorRole: "admin" | "client";
    mentionedRole?: "admin" | "client" | null;
    createdAt: Date | string;
    authorName: string | null;
  }>;
  isLoading: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isPending: boolean;
  bottomRef: React.RefObject<HTMLDivElement>;
  showMentionHint: boolean;
  onInsertMention: (role: "admin" | "client") => void;
  isAdmin: boolean;
}

/** Highlight @admin and @client mentions in message text */
function renderMessage(message: string) {
  const parts = message.split(/(@admin|@client)/gi);
  return parts.map((part, i) =>
    /^@(admin|client)$/i.test(part) ? (
      <span key={i} className="font-semibold text-primary">
        {part}
      </span>
    ) : (
      part
    )
  );
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
  showMentionHint,
  onInsertMention,
  isAdmin,
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
        <p className="text-xs text-muted-foreground italic py-1">
          No comments yet. Start the conversation. Use <span className="font-mono text-primary">@admin</span> or <span className="font-mono text-primary">@client</span> to notify.
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {comments.map((c) => {
            const bubbleIsAdmin = c.authorRole === "admin";
            const isMention = !!c.mentionedRole;
            return (
              <div
                key={c.id}
                className={`flex gap-2 ${bubbleIsAdmin ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    bubbleIsAdmin
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {((c.authorName ?? "?")[0] ?? "?").toUpperCase()}
                </div>
                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                    isMention
                      ? "bg-amber-500/10 border border-amber-500/30 text-foreground"
                      : bubbleIsAdmin
                      ? "bg-primary/10 text-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="font-semibold">{c.authorName ?? "Unknown"}</span>
                    {isMention && (
                      <span className="text-amber-500 font-semibold text-[10px] flex items-center gap-0.5">
                        <AtSign className="h-2.5 w-2.5" />
                        mention
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{renderMessage(c.message)}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* @mention quick-insert hint */}
      {showMentionHint && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1">
          <AtSign className="h-3 w-3" />
          <span>Mention:</span>
          <button
            onClick={() => onInsertMention("admin")}
            className="text-primary hover:underline font-mono"
          >
            @admin
          </button>
          <button
            onClick={() => onInsertMention("client")}
            className="text-primary hover:underline font-mono"
          >
            @client
          </button>
        </div>
      )}

      {/* Compose */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Write a comment… Use @${isAdmin ? "client" : "admin"} to notify them. Ctrl+Enter to send.`}
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
