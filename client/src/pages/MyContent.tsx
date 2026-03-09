import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText, RefreshCw, MessageSquare, CheckCircle2, XCircle,
  Clock, Facebook, Instagram, Linkedin, Globe, Mail, Loader2,
  ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPlatformIcon(platform: string | null) {
  switch (platform?.toLowerCase()) {
    case "facebook": return <Facebook className="w-3.5 h-3.5" />;
    case "instagram": return <Instagram className="w-3.5 h-3.5" />;
    case "linkedin": return <Linkedin className="w-3.5 h-3.5" />;
    case "blog": return <Globe className="w-3.5 h-3.5" />;
    case "email": return <Mail className="w-3.5 h-3.5" />;
    default: return <FileText className="w-3.5 h-3.5" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="gap-1 text-xs"><Clock className="w-3 h-3" />Awaiting Review</Badge>;
    case "approved":
      return <Badge className="gap-1 text-xs bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="w-3 h-3" />Needs Revision</Badge>;
    case "revised":
      return <Badge variant="outline" className="gap-1 text-xs">Revised</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

// ─── Content Card ─────────────────────────────────────────────────────────────
function ContentCard({ item, onFeedback }: { item: any; onFeedback: (id: number, currentFeedback: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border border-border/60 hover:border-border transition-colors">
      <CardHeader className="py-3 px-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {item.platform && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getPlatformIcon(item.platform)}
                  <span className="capitalize">{item.platform}</span>
                </div>
              )}
              <Badge variant="outline" className="text-xs capitalize">{item.contentType?.replace("_", " ")}</Badge>
              {getStatusBadge(item.status)}
            </div>
            <p className="text-sm font-semibold leading-snug">{item.title}</p>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap border border-border/40">
            {item.content}
          </div>

          {item.reasoning && (
            <div className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
              {item.reasoning}
            </div>
          )}

          {item.feedback && item.status === "rejected" && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-xs font-semibold text-destructive mb-1">Agency Feedback</p>
              <p className="text-sm text-destructive/80">{item.feedback}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => onFeedback(item.id, item.feedback || "")}
            >
              <MessageSquare className="w-3 h-3" />
              Leave Feedback
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyContent() {
  const utils = trpc.useUtils();

  // Data queries
  const { data: allContent, isLoading } = trpc.contentApprovals.list.useQuery({});
  const { data: contentCount } = trpc.clientOnboarding.getContentCount.useQuery();

  // Regenerate dialog
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [guidanceNotes, setGuidanceNotes] = useState("");

  // Feedback dialog
  const [feedbackDialogId, setFeedbackDialogId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  // Mutations
  const regenerateMutation = trpc.clientOnboarding.requestRegenerate.useMutation({
    onSuccess: (data) => {
      toast.success("New batch requested!", { description: data.message });
      setShowRegenDialog(false);
      setGuidanceNotes("");
      setTimeout(() => utils.contentApprovals.list.invalidate(), 5000);
    },
    onError: (err) => toast.error("Could not request regeneration", { description: err.message }),
  });

  const rejectMutation = trpc.contentApprovals.reject.useMutation({
    onSuccess: () => {
      toast.success("Feedback submitted");
      setFeedbackDialogId(null);
      setFeedbackText("");
      utils.contentApprovals.list.invalidate();
    },
    onError: (err) => toast.error("Failed to submit feedback", { description: err.message }),
  });

  // Tab filtering
  const pending = (allContent || []).filter((c: any) => c.status === "pending");
  const approved = (allContent || []).filter((c: any) => c.status === "approved");
  const rejected = (allContent || []).filter((c: any) => c.status === "rejected");

  const openFeedback = (id: number, currentFeedback: string) => {
    setFeedbackDialogId(id);
    setFeedbackText(currentFeedback);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              My Content
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              View all content created for your brand. Leave feedback or request a new batch below.
            </p>
          </div>
          <Button
            onClick={() => setShowRegenDialog(true)}
            className="gap-2 shrink-0"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4" />
            Request New Batch
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{pending.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting Review</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{approved.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Approved</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{rejected.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Needs Revision</p>
          </Card>
        </div>

        {/* Content tabs */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (allContent?.length ?? 0) === 0 ? (
          <Card className="py-16 text-center">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-semibold text-muted-foreground">No content yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Complete your Account Setup to generate your first content batch.
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowRegenDialog(true)} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Request First Batch
            </Button>
          </Card>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-1.5">
                Awaiting Review
                {pending.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-4 px-1.5">{pending.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-1.5">
                Approved
                {approved.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-4 px-1.5">{approved.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1.5">
                Needs Revision
                {rejected.length > 0 && (
                  <Badge variant="destructive" className="text-xs h-4 px-1.5">{rejected.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              {pending.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No content awaiting review.
                </div>
              ) : pending.map((item: any) => (
                <ContentCard key={item.id} item={item} onFeedback={openFeedback} />
              ))}
            </TabsContent>

            <TabsContent value="approved" className="space-y-3">
              {approved.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No approved content yet.
                </div>
              ) : approved.map((item: any) => (
                <ContentCard key={item.id} item={item} onFeedback={openFeedback} />
              ))}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-3">
              {rejected.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No content needs revision.
                </div>
              ) : rejected.map((item: any) => (
                <ContentCard key={item.id} item={item} onFeedback={openFeedback} />
              ))}
            </TabsContent>

            <TabsContent value="all" className="space-y-3">
              {(allContent || []).map((item: any) => (
                <ContentCard key={item.id} item={item} onFeedback={openFeedback} />
              ))}
            </TabsContent>
          </Tabs>
        )}

        {/* How it works */}
        <Card className="bg-muted/30 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              How My Content Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1.5">
            <p>1. Your agency generates content batches tailored to your brand voice and target audience.</p>
            <p>2. Content appears here as "Awaiting Review" — your agency reviews and approves or requests revisions.</p>
            <p>3. Approved social posts are automatically queued in your Social Media calendar.</p>
            <p>4. Use "Request New Batch" anytime to get fresh content with optional guidance notes.</p>
          </CardContent>
        </Card>
      </div>

      {/* Regenerate Dialog */}
      <Dialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Request New Content Batch
            </DialogTitle>
            <DialogDescription>
              Your agency will generate 12 new pieces of content for your brand. Add optional guidance to shape the tone or focus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Optional guidance (e.g. 'more formal tone', 'focus on first-time buyers', 'highlight our low rates')…"
              value={guidanceNotes}
              onChange={e => setGuidanceNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Content will appear in your queue within 60 seconds.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenDialog(false)}>Cancel</Button>
            <Button
              onClick={() => regenerateMutation.mutate({ guidanceNotes: guidanceNotes || undefined })}
              disabled={regenerateMutation.isPending}
              className="gap-2"
            >
              {regenerateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Requesting…</>
              ) : (
                <><Sparkles className="w-4 h-4" />Request Batch</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogId !== null} onOpenChange={(open) => { if (!open) { setFeedbackDialogId(null); setFeedbackText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Leave Feedback
            </DialogTitle>
            <DialogDescription>
              Your feedback will be sent to your agency and attached to this content item.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="What would you like changed? (e.g. 'make it shorter', 'add a call to action', 'wrong tone')…"
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFeedbackDialogId(null); setFeedbackText(""); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (!feedbackDialogId || !feedbackText.trim()) {
                  toast.error("Please enter your feedback before submitting.");
                  return;
                }
                rejectMutation.mutate({ approvalId: feedbackDialogId, feedback: feedbackText });
              }}
              disabled={rejectMutation.isPending}
              className="gap-2"
            >
              {rejectMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
              ) : (
                <><MessageSquare className="w-4 h-4" />Submit Feedback</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
