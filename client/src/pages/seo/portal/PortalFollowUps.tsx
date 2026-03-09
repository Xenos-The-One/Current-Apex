import { useState } from "react";
import { trpc } from "@/lib/trpc";
import PortalLayout from "@/components/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  PhoneCall,
  MessageSquare,
  Mail,
  CheckCircle2,
  Search,
  Clock,
  TrendingUp,
  AlertTriangle,
  Copy,
  Send,
  Loader2,
  BellOff,
  Users,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

type UrgencyFilter = "all" | "high" | "medium" | "low";

type Suggestion = {
  leadId: number;
  leadName: string;
  phone: string | null;
  email: string | null;
  status: string;
  source: string | null;
  urgency: "high" | "medium" | "low";
  reason: string;
  daysSinceContact: number | null;
  score: number | null;
  suggestedAction: string;
  suggestedChannel: "call" | "sms" | "email";
  isSnoozed: boolean;
};

const URGENCY_CONFIG = {
  high: { label: "Urgent", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  medium: { label: "Follow Up", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  low: { label: "Check In", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
};

const CHANNEL_ICONS = {
  call: PhoneCall,
  sms: MessageSquare,
  email: Mail,
};

function SuggestionCard({
  s,
  onMarkContacted,
  onSnooze,
  onGetMessage,
  onSendSMS,
}: {
  s: Suggestion;
  onMarkContacted: (id: number) => void;
  onSnooze: (id: number) => void;
  onGetMessage: (s: Suggestion) => void;
  onSendSMS: (s: Suggestion) => void;
}) {
  const cfg = URGENCY_CONFIG[s.urgency];
  const ChannelIcon = CHANNEL_ICONS[s.suggestedChannel];

  return (
    <Card className={`border transition-all hover:shadow-md ${s.isSnoozed ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm truncate">{s.leadName}</span>
              <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${cfg.dot}`} />
                {cfg.label}
              </Badge>
              {s.isSnoozed && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <BellOff className="w-3 h-3 mr-1" />Snoozed
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">{s.reason}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ChannelIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{s.suggestedAction}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => onGetMessage(s)}
            >
              <Sparkles className="w-3 h-3 mr-1" />Draft
            </Button>
            {s.suggestedChannel === "sms" && s.phone && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={() => onSendSMS(s)}
              >
                <Send className="w-3 h-3 mr-1" />SMS
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2 text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => onMarkContacted(s.leadId)}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-muted-foreground"
              onClick={() => onSnooze(s.leadId)}
            >
              <Clock className="w-3 h-3 mr-1" />Snooze
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PortalFollowUps() {
  const [urgency, setUrgency] = useState<UrgencyFilter>("all");
  const [search, setSearch] = useState("");
  const [draftDialog, setDraftDialog] = useState<{ open: boolean; suggestion: Suggestion | null; message: string }>({
    open: false,
    suggestion: null,
    message: "",
  });
  const [smsDialog, setSmsDialog] = useState<{ open: boolean; suggestion: Suggestion | null; message: string }>({
    open: false,
    suggestion: null,
    message: "",
  });

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.followUps.getAllSuggested.useQuery(
    { urgency, search: search || undefined },
    { refetchInterval: 60_000 }
  );

  const statsQuery = trpc.followUps.getCompletionStats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const messageMutation = trpc.followUps.getMessageSuggestion.useMutation({
    onSuccess: (msg) => setDraftDialog((d) => ({ ...d, message: msg })),
    onError: () => toast.error("Could not generate message"),
  });

  const smsMutation = trpc.followUps.sendFollowUpSMS.useMutation({
    onSuccess: () => {
      toast.success("SMS sent!");
      setSmsDialog({ open: false, suggestion: null, message: "" });
      utils.followUps.getAllSuggested.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markContactedMutation = trpc.followUps.markContacted.useMutation({
    onSuccess: () => {
      toast.success("Marked as contacted");
      utils.followUps.getAllSuggested.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const snoozeMutation = trpc.followUps.snooze.useMutation({
    onSuccess: () => {
      toast.success("Snoozed for 3 days");
      utils.followUps.getAllSuggested.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleGetMessage(s: Suggestion) {
    setDraftDialog({ open: true, suggestion: s, message: "" });
    messageMutation.mutate({ leadId: s.leadId, channel: s.suggestedChannel });
  }

  function handleSendSMS(s: Suggestion) {
    setSmsDialog({ open: true, suggestion: s, message: "" });
    messageMutation.mutate({ leadId: s.leadId, channel: "sms" });
  }

  const suggestions = data?.suggestions ?? [];
  const counts = data?.counts ?? { high: 0, medium: 0, low: 0, total: 0 };
  const stats = statsQuery.data;

  const FILTERS: { key: UrgencyFilter; label: string; count?: number }[] = [
    { key: "all", label: "All", count: counts.total },
    { key: "high", label: "Urgent", count: counts.high },
    { key: "medium", label: "Follow Up", count: counts.medium },
    { key: "low", label: "Check In", count: counts.low },
  ];

  return (
    <PortalLayout activePath="/seo/portal/follow-ups">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Suggested Follow-Ups
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-prioritized leads that need your attention today.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Urgent</p>
                <p className="text-xl font-bold">{counts.high}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{counts.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <BarChart3 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">7-day Rate</p>
                <p className="text-xl font-bold">{stats?.completionRate ?? 0}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary banner */}
        {data?.summary && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-primary font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 shrink-0" />
            {data.summary}
          </div>
        )}

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setUrgency(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  urgency === f.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {f.label}
                {f.count !== undefined && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    urgency === f.key ? "bg-white/20" : "bg-muted"
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No follow-ups needed right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.leadId}
                s={s}
                onMarkContacted={(id) => markContactedMutation.mutate({ leadId: id })}
                onSnooze={(id) => snoozeMutation.mutate({ leadId: id, days: 3 })}
                onGetMessage={handleGetMessage}
                onSendSMS={handleSendSMS}
              />
            ))}
          </div>
        )}
      </div>

      {/* Draft message dialog */}
      <Dialog open={draftDialog.open} onOpenChange={(o) => !o && setDraftDialog({ open: false, suggestion: null, message: "" })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Message Draft
            </DialogTitle>
            <DialogDescription>
              {draftDialog.suggestion?.leadName} · {draftDialog.suggestion?.suggestedChannel?.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          {messageMutation.isPending ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating draft…</span>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={draftDialog.message}
                onChange={(e) => setDraftDialog((d) => ({ ...d, message: e.target.value }))}
                rows={5}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(draftDialog.message);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (draftDialog.suggestion) {
                      markContactedMutation.mutate({ leadId: draftDialog.suggestion.leadId });
                      setDraftDialog({ open: false, suggestion: null, message: "" });
                    }
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Mark Contacted
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send SMS dialog */}
      <Dialog open={smsDialog.open} onOpenChange={(o) => !o && setSmsDialog({ open: false, suggestion: null, message: "" })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Send SMS
            </DialogTitle>
            <DialogDescription>
              To: {smsDialog.suggestion?.phone ?? "unknown"}
            </DialogDescription>
          </DialogHeader>
          {messageMutation.isPending ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating message…</span>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={smsDialog.message}
                onChange={(e) => setSmsDialog((d) => ({ ...d, message: e.target.value }))}
                rows={4}
                className="text-sm"
                placeholder="Type your message…"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setSmsDialog({ open: false, suggestion: null, message: "" })}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={smsMutation.isPending || !smsDialog.message.trim()}
                  onClick={() => {
                    if (smsDialog.suggestion?.phone) {
                      smsMutation.mutate({
                        leadId: smsDialog.suggestion.leadId,
                        phone: smsDialog.suggestion.phone,
                        message: smsDialog.message,
                      });
                    }
                  }}
                >
                  {smsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                  Send SMS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
