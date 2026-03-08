import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  PhoneCall,
  MessageSquare,
  Mail,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Send,
  Loader2,
  AlertTriangle,
  Clock,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  BellOff,
  Users,
  BarChart3,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  suggestedAction: string;
  daysSinceLastContact: number | null;
  daysSinceCreated: number;
  score: number;
  snoozedUntil?: string | null;
};

// ─── Urgency styling ──────────────────────────────────────────────────────────
const urgencyConfig = {
  high: {
    border: "border-l-red-500",
    bg: "bg-red-500/5",
    badge: "bg-red-500/15 text-red-600 border-red-500/30",
    icon: AlertTriangle,
    iconColor: "text-red-500",
    label: "Urgent",
  },
  medium: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    icon: Clock,
    iconColor: "text-amber-500",
    label: "Medium",
  },
  low: {
    border: "border-l-blue-500",
    bg: "bg-blue-500/5",
    badge: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    icon: TrendingUp,
    iconColor: "text-blue-500",
    label: "Low",
  },
};

// ─── Single suggestion card ───────────────────────────────────────────────────
function SuggestionCard({
  suggestion,
  selected,
  onSelect,
  onMarkContacted,
  onRefresh,
}: {
  suggestion: Suggestion;
  selected: boolean;
  onSelect: (leadId: number, checked: boolean) => void;
  onMarkContacted: (leadId: number, channel: "call" | "sms" | "email") => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeChannel, setActiveChannel] = useState<"sms" | "email" | "call_script" | null>(null);
  const [draftedMessage, setDraftedMessage] = useState<string>("");
  const [editedMessage, setEditedMessage] = useState<string>("");
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);

  const messageMutation = trpc.followUps.getMessageSuggestion.useMutation({
    onSuccess: (data) => {
      setDraftedMessage(data.message);
      setEditedMessage(data.message);
    },
    onError: () => toast.error("Failed to generate message. Please try again."),
  });

  const smsMutation = trpc.followUps.sendFollowUpSMS.useMutation({
    onSuccess: (data) => {
      toast.success(data.demo ? "SMS logged (demo mode)" : "SMS sent successfully!");
      setSmsDialogOpen(false);
      onMarkContacted(suggestion.leadId, "sms");
      onRefresh();
    },
    onError: (err) => toast.error(err.message || "Failed to send SMS"),
  });

  const markContactedMutation = trpc.followUps.markContacted.useMutation({
    onSuccess: () => {
      toast.success(`${suggestion.leadName} marked as contacted`);
      onRefresh();
    },
    onError: () => toast.error("Failed to mark as contacted"),
  });

  const snoozeMutation = trpc.followUps.snooze.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Snoozed for ${vars.days} day${vars.days > 1 ? "s" : ""}`);
      onRefresh();
    },
    onError: () => toast.error("Failed to snooze"),
  });

  const cfg = urgencyConfig[suggestion.urgency];
  const UrgencyIcon = cfg.icon;

  function handleDraft(channel: "sms" | "email" | "call_script") {
    setActiveChannel(channel);
    setDraftedMessage("");
    setEditedMessage("");
    messageMutation.mutate({ leadId: suggestion.leadId, channel });
  }

  function handleCopy() {
    navigator.clipboard.writeText(editedMessage);
    toast.success("Copied to clipboard");
  }

  function handleSendSMS() {
    if (!editedMessage.trim()) return;
    smsMutation.mutate({ leadId: suggestion.leadId, message: editedMessage });
  }

  const statusLabel = suggestion.status.replace(/_/g, " ");
  const contactTime =
    suggestion.daysSinceLastContact !== null
      ? `${suggestion.daysSinceLastContact}d ago`
      : `${suggestion.daysSinceCreated}d old`;

  return (
    <>
      <div
        className={`border-l-4 rounded-xl p-4 transition-all ${cfg.border} ${cfg.bg} border border-border/40 ${selected ? "ring-2 ring-primary/40" : ""}`}
      >
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <div className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect(suggestion.leadId, !!checked)}
            />
          </div>

          <div
            className="flex items-start justify-between cursor-pointer gap-3 flex-1"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>
                <UrgencyIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Link href={`/leads/${suggestion.leadId}`}>
                    <span className="text-sm font-semibold hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      {suggestion.leadName}
                    </span>
                  </Link>
                  <Badge className={`text-[10px] px-1.5 py-0 border ${cfg.badge}`}>
                    {cfg.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                    {statusLabel}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{contactTime}</span>
                  {suggestion.score > 0 && (
                    <span className="text-[10px] text-muted-foreground">Score: {suggestion.score}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                <p className="text-xs font-medium text-foreground/80 mt-1">{suggestion.suggestedAction}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Snooze dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BellOff className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Snooze</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {[1, 3, 7, 14].map((days) => (
                    <DropdownMenuItem
                      key={days}
                      onClick={(e) => {
                        e.stopPropagation();
                        snoozeMutation.mutate({ leadId: suggestion.leadId, days });
                      }}
                    >
                      {days === 1 ? "1 day" : days === 7 ? "1 week" : days === 14 ? "2 weeks" : `${days} days`}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  markContactedMutation.mutate({ leadId: suggestion.leadId, channel: "call" });
                }}
                disabled={markContactedMutation.isPending}
              >
                {markContactedMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Done</span>
              </Button>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div className="mt-4 ml-7 space-y-4 border-t border-border/30 pt-4">
            {/* Quick contact actions */}
            <div className="flex flex-wrap gap-2">
              {suggestion.phone && (
                <a href={`tel:${suggestion.phone}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => onMarkContacted(suggestion.leadId, "call")}
                  >
                    <PhoneCall className="h-3.5 w-3.5" /> Call
                  </Button>
                </a>
              )}
              {suggestion.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() => {
                    handleDraft("sms");
                    setSmsDialogOpen(true);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Text
                </Button>
              )}
              {suggestion.email && (
                <a href={`mailto:${suggestion.email}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => onMarkContacted(suggestion.leadId, "email")}
                  >
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Button>
                </a>
              )}
              <Link href={`/leads/${suggestion.leadId}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  <ExternalLink className="h-3.5 w-3.5" /> View Lead
                </Button>
              </Link>
            </div>

            {/* AI drafting buttons */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">AI Draft Message</p>
              <div className="flex flex-wrap gap-2">
                {(["sms", "email", "call_script"] as const).map((ch) => (
                  <Button
                    key={ch}
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => handleDraft(ch)}
                    disabled={messageMutation.isPending}
                  >
                    {messageMutation.isPending && activeChannel === ch ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {ch === "call_script" ? "Call Script" : ch === "sms" ? "Draft SMS" : "Draft Email"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Drafted message display */}
            {messageMutation.isPending && !draftedMessage && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating AI draft...
              </div>
            )}
            {draftedMessage && (
              <div className="bg-background rounded-lg p-3 border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground capitalize">
                    AI {activeChannel?.replace("_", " ")} Draft
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleCopy}>
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                    {activeChannel === "sms" && suggestion.phone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1 text-blue-600"
                        onClick={() => setSmsDialogOpen(true)}
                      >
                        <Send className="h-3 w-3" /> Send
                      </Button>
                    )}
                  </div>
                </div>
                <Textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  className="text-xs min-h-[80px] resize-none"
                  placeholder="AI-generated message will appear here..."
                />
                {activeChannel === "sms" && (
                  <p className="text-[10px] text-muted-foreground">
                    {editedMessage.length}/160 characters
                    {editedMessage.length > 160 && (
                      <span className="text-amber-500 ml-1">(will be split)</span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SMS Send Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send SMS to {suggestion.leadName}</DialogTitle>
            <DialogDescription>
              {suggestion.phone ? `Sending to ${suggestion.phone}` : "No phone number available"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="min-h-[100px] resize-none text-sm"
              placeholder="Type your message..."
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{editedMessage.length}/160 characters</span>
              {editedMessage.length > 160 && (
                <span className="text-amber-500">Multiple messages</span>
              )}
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleSendSMS}
              disabled={smsMutation.isPending || !editedMessage.trim()}
            >
              {smsMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SuggestedFollowUpsPage() {
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSnoozeOpen, setBulkSnoozeOpen] = useState(false);

  const { data, isLoading, refetch } = trpc.followUps.getAllSuggested.useQuery(
    { urgency: urgencyFilter, search: search || undefined },
    { refetchInterval: 60_000 }
  );

  const statsQuery = trpc.followUps.getCompletionStats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const bulkMarkMutation = trpc.followUps.bulkMarkContacted.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.updated} lead${res.updated !== 1 ? "s" : ""} marked as contacted`);
      setSelectedIds(new Set());
      refetch();
    },
    onError: () => toast.error("Bulk action failed"),
  });

  const bulkSnoozeMutation = trpc.followUps.bulkSnooze.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.updated} lead${res.updated !== 1 ? "s" : ""} snoozed`);
      setSelectedIds(new Set());
      setBulkSnoozeOpen(false);
      refetch();
    },
    onError: () => toast.error("Bulk snooze failed"),
  });

  const counts = data?.counts ?? { high: 0, medium: 0, low: 0, total: 0 };
  const stats = statsQuery.data;
  const suggestions = data?.suggestions ?? [];

  function handleSelect(leadId: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(leadId);
      else next.delete(leadId);
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map((s) => s.leadId)));
    }
  }

  function handleMarkContacted(leadId: number, _channel: "call" | "sms" | "email") {
    setTimeout(() => refetch(), 500);
  }

  const allSelected = suggestions.length > 0 && selectedIds.size === suggestions.length;
  const someSelected = selectedIds.size > 0;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Suggested Follow-Ups
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {data?.summary ?? "AI-powered follow-up recommendations based on lead activity and timing."}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: counts.total, color: "text-foreground", Icon: Users },
            { label: "Urgent", value: counts.high, color: "text-red-600", Icon: AlertTriangle },
            { label: "Medium", value: counts.medium, color: "text-amber-600", Icon: Clock },
            { label: "Snoozed", value: data?.snoozedCount ?? 0, color: "text-muted-foreground", Icon: BellOff },
          ].map((stat) => (
            <Card key={stat.label} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <stat.Icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Completion rate banner */}
        {stats && (
          <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Follow-Up Completion Rate</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.contactedThisWeek} of {stats.totalActive} active leads contacted this week
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p
                    className={`text-2xl font-bold ${
                      stats.weeklyRate >= 70
                        ? "text-green-600"
                        : stats.weeklyRate >= 40
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {stats.weeklyRate}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{stats.monthlyRate}%</p>
                  <p className="text-[10px] text-muted-foreground">This Month</p>
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    stats.weeklyRate >= 70
                      ? "bg-green-500"
                      : stats.weeklyRate >= 40
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(stats.weeklyRate, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stats.weeklyRate < 40
                  ? "⚠️ Below target — prioritize urgent leads today"
                  : stats.weeklyRate < 70
                  ? "📈 Getting there — keep up the momentum"
                  : "✅ Great job — you're on top of your follow-ups!"}
              </p>
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs
            value={urgencyFilter}
            onValueChange={(v) => {
              setUrgencyFilter(v as UrgencyFilter);
              setSelectedIds(new Set());
            }}
          >
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-3">
                All ({counts.total})
              </TabsTrigger>
              <TabsTrigger value="high" className="text-xs px-3 text-red-600">
                Urgent ({counts.high})
              </TabsTrigger>
              <TabsTrigger value="medium" className="text-xs px-3 text-amber-600">
                Medium ({counts.medium})
              </TabsTrigger>
              <TabsTrigger value="low" className="text-xs px-3 text-blue-600">
                Low ({counts.low})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Bulk action bar */}
        {suggestions.length > 0 && (
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50 border border-border/40">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className="shrink-0"
            />
            <span className="text-xs text-muted-foreground flex-1">
              {someSelected
                ? `${selectedIds.size} selected`
                : `Select all ${suggestions.length} leads`}
            </span>
            {someSelected && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() =>
                    bulkMarkMutation.mutate({
                      leadIds: Array.from(selectedIds),
                      channel: "call",
                    })
                  }
                  disabled={bulkMarkMutation.isPending}
                >
                  {bulkMarkMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3 w-3" />
                  )}
                  Mark All Contacted
                </Button>
                <DropdownMenu open={bulkSnoozeOpen} onOpenChange={setBulkSnoozeOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <BellOff className="h-3 w-3" />
                      Snooze All
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {[1, 3, 7, 14].map((days) => (
                      <DropdownMenuItem
                        key={days}
                        onClick={() =>
                          bulkSnoozeMutation.mutate({
                            leadIds: Array.from(selectedIds),
                            days,
                          })
                        }
                      >
                        {days === 1 ? "1 day" : days === 7 ? "1 week" : days === 14 ? "2 weeks" : `${days} days`}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Suggestions list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : !suggestions.length ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">
              {urgencyFilter === "all" ? "All caught up!" : `No ${urgencyFilter} priority items`}
            </h3>
            <p className="text-muted-foreground text-sm">
              {urgencyFilter === "all"
                ? "All your leads are on track. Check back later or add new leads."
                : `No ${urgencyFilter} priority follow-ups right now.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.leadId}
                suggestion={s}
                selected={selectedIds.has(s.leadId)}
                onSelect={handleSelect}
                onMarkContacted={handleMarkContacted}
                onRefresh={refetch}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
