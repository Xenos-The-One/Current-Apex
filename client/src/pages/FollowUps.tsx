import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Bell,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Snooze,
  Star,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const URGENCY_COLORS: Record<string, string> = {
  high: "bg-red-50 border-red-200",
  medium: "bg-yellow-50 border-yellow-200",
  low: "bg-green-50 border-green-200",
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  appointment: Calendar,
  task: CheckCircle2,
};

// ─── Tab 1: Tasks ─────────────────────────────────────────────────────────────
function TasksTab({ agencyId }: { agencyId: number }) {
  const [filter, setFilter] = useState<"all" | "overdue" | "today" | "upcoming">("all");

  const { data: tasks, isLoading, refetch } = trpc.leads.list.useQuery(
    { agencyId },
    { enabled: agencyId > 0 }
  );

  const completeTaskMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Task marked complete");
      refetch();
    },
  });

  const now = Date.now();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const allTasks = (tasks ?? []) as any[];

  const filtered = allTasks.filter((t: any) => {
    const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
    if (filter === "overdue") return due && due < now && t.status !== "completed";
    if (filter === "today") return due && due <= todayEnd.getTime() && due >= new Date().setHours(0, 0, 0, 0);
    if (filter === "upcoming") return due && due > todayEnd.getTime();
    return true;
  });

  const overdue = allTasks.filter((t: any) => {
    const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
    return due && due < now && t.status !== "completed";
  }).length;

  const todayCount = allTasks.filter((t: any) => {
    const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
    return due && due <= todayEnd.getTime() && due >= new Date().setHours(0, 0, 0, 0);
  }).length;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Overdue", value: overdue, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Due Today", value: todayCount, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Total Tasks", value: allTasks.length, icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Completed", value: allTasks.filter((t: any) => t.status === "completed").length, icon: Star, color: "text-green-500", bg: "bg-green-50" },
        ].map(card => (
          <Card key={card.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "overdue", "today", "upcoming"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
            {f === "overdue" && overdue > 0 && (
              <Badge className="ml-1.5 h-4 min-w-4 text-xs bg-red-500 text-white border-0 px-1">{overdue}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
            <p className="font-semibold">You're all caught up!</p>
            <p className="text-sm text-muted-foreground">No follow-ups in this category right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((task: any) => {
            const Icon = ACTION_ICONS[task.taskType ?? "task"] ?? CheckCircle2;
            const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < now && task.status !== "completed";
            return (
              <Card key={task.id} className={`border shadow-sm transition-all hover:shadow-md ${task.status === "completed" ? "opacity-50" : ""}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? "bg-red-100" : "bg-primary/10"}`}>
                    <Icon className={`w-4 h-4 ${isOverdue ? "text-red-500" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.priority && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                          {task.priority}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()} {new Date(task.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {task.leadId && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> Lead #{task.leadId}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 gap-1.5 text-xs"
                      onClick={() => completeTaskMutation.mutate({ id: task.id })}
                      disabled={completeTaskMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: AI Suggestions ────────────────────────────────────────────────────
function AISuggestionsTab() {
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [search, setSearch] = useState("");
  const [draftLeadId, setDraftLeadId] = useState<number | null>(null);
  const [draftChannel, setDraftChannel] = useState<"sms" | "email" | "call_script">("sms");
  const [draftText, setDraftText] = useState("");
  const [snoozeDays, setSnoozeDays] = useState<Record<number, number>>({});

  const { data, isLoading, refetch } = trpc.followUps.getAllSuggested.useQuery({
    urgency: urgencyFilter,
    search: search || undefined,
  });

  const getMessageSuggestion = trpc.followUps.getMessageSuggestion.useMutation({
    onSuccess: (data) => setDraftText(data.message),
    onError: (err) => toast.error("Draft failed", { description: err.message }),
  });

  const markContacted = trpc.followUps.markContacted.useMutation({
    onSuccess: () => { toast.success("Marked as contacted"); refetch(); setDraftLeadId(null); setDraftText(""); },
    onError: (err) => toast.error("Failed", { description: err.message }),
  });

  const snooze = trpc.followUps.snooze.useMutation({
    onSuccess: (data) => { toast.success(`Snoozed until ${new Date(data.snoozedUntil).toLocaleDateString()}`); refetch(); },
    onError: (err) => toast.error("Snooze failed", { description: err.message }),
  });

  const sendSMS = trpc.followUps.sendFollowUpSMS.useMutation({
    onSuccess: () => { toast.success("SMS sent!"); refetch(); setDraftLeadId(null); setDraftText(""); },
    onError: (err) => toast.error("SMS failed", { description: err.message }),
  });

  const suggestions = data?.suggestions ?? [];
  const counts = data?.counts ?? { high: 0, medium: 0, low: 0, total: 0 };

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Needing Attention", value: counts.total, icon: Bell, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "High Urgency", value: counts.high, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Medium Urgency", value: counts.medium, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Completion Rate (7d)", value: `${data?.completionRate ?? 0}%`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
        ].map(card => (
          <Card key={card.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {(["all", "high", "medium", "low"] as const).map(u => (
          <Button
            key={u}
            variant={urgencyFilter === u ? "default" : "outline"}
            size="sm"
            onClick={() => setUrgencyFilter(u)}
            className="capitalize"
          >
            {u}
            {u !== "all" && counts[u] > 0 && (
              <Badge className="ml-1.5 h-4 min-w-4 text-xs bg-current/20 border-0 px-1">{counts[u]}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Summary banner */}
      {data?.summary && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <BrainCircuit className="w-4 h-4 text-primary flex-shrink-0" />
          {data.summary}
        </div>
      )}

      {/* Suggestions list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : suggestions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <Zap className="w-10 h-10 text-green-400" />
            <p className="font-semibold">No suggestions right now</p>
            <p className="text-sm text-muted-foreground">All leads are on track — check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {suggestions.map((s: any) => (
            <Card key={s.leadId} className={`border shadow-sm transition-all hover:shadow-md ${URGENCY_COLORS[s.urgency] ?? ""}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{s.leadName}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[s.urgency] ?? ""}`}>
                        {s.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                    <p className="text-xs font-medium text-primary mt-1">→ {s.suggestedAction}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setDraftLeadId(s.leadId);
                        setDraftChannel("sms");
                        setDraftText("");
                        getMessageSuggestion.mutate({ leadId: s.leadId, channel: "sms" });
                      }}
                    >
                      <MessageSquare className="w-3 h-3" /> SMS
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setDraftLeadId(s.leadId);
                        setDraftChannel("email");
                        setDraftText("");
                        getMessageSuggestion.mutate({ leadId: s.leadId, channel: "email" });
                      }}
                    >
                      <Mail className="w-3 h-3" /> Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        const days = snoozeDays[s.leadId] ?? 3;
                        snooze.mutate({ leadId: s.leadId, days });
                      }}
                      disabled={snooze.isPending}
                    >
                      <Snooze className="w-3 h-3" /> Snooze
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => markContacted.mutate({ leadId: s.leadId, channel: "manual" })}
                      disabled={markContacted.isPending}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </Button>
                  </div>
                </div>

                {/* AI Draft panel */}
                {draftLeadId === s.leadId && (
                  <div className="border rounded-lg p-3 bg-background space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <BrainCircuit className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold">AI Draft ({draftChannel.toUpperCase()})</span>
                      <div className="flex gap-1 ml-auto">
                        {(["sms", "email", "call_script"] as const).map(ch => (
                          <Button
                            key={ch}
                            size="sm"
                            variant={draftChannel === ch ? "default" : "ghost"}
                            className="h-5 text-xs px-1.5"
                            onClick={() => {
                              setDraftChannel(ch);
                              setDraftText("");
                              getMessageSuggestion.mutate({ leadId: s.leadId, channel: ch });
                            }}
                          >
                            {ch === "call_script" ? "Script" : ch.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {getMessageSuggestion.isPending ? (
                      <Skeleton className="h-16 w-full" />
                    ) : (
                      <textarea
                        className="w-full text-xs border rounded p-2 bg-muted/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={4}
                        value={draftText}
                        onChange={e => setDraftText(e.target.value)}
                        placeholder="AI draft will appear here..."
                      />
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setDraftLeadId(null); setDraftText(""); }}>
                        Cancel
                      </Button>
                      {draftChannel === "sms" && (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={!draftText || sendSMS.isPending}
                          onClick={() => sendSMS.mutate({ leadId: s.leadId, message: draftText })}
                        >
                          <Send className="w-3 h-3" /> Send SMS
                        </Button>
                      )}
                      {draftChannel !== "sms" && (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={!draftText}
                          onClick={() => {
                            navigator.clipboard.writeText(draftText);
                            toast.success("Copied to clipboard");
                          }}
                        >
                          Copy
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact info */}
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                  {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                  {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                  {s.daysSinceLastContact !== null && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last contact: {s.daysSinceLastContact}d ago</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Completion Stats ──────────────────────────────────────────────────
function CompletionStatsTab() {
  const { data, isLoading } = trpc.followUps.getCompletionStats.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  const stats = data ?? { weeklyRate: 0, monthlyRate: 0, contactedThisWeek: 0, contactedThisMonth: 0, totalActive: 0, snoozedCount: 0 };

  const getColor = (rate: number) =>
    rate >= 70 ? "text-green-600" : rate >= 40 ? "text-yellow-600" : "text-red-500";

  const getProgressColor = (rate: number) =>
    rate >= 70 ? "bg-green-500" : rate >= 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-5">
      {/* Rate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 7-Day Follow-Up Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${getColor(stats.weeklyRate)}`}>{stats.weeklyRate}%</span>
              <span className="text-sm text-muted-foreground mb-1">of active leads contacted</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${getProgressColor(stats.weeklyRate)}`}
                style={{ width: `${stats.weeklyRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.contactedThisWeek} out of {stats.totalActive} active leads contacted in the last 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" /> 30-Day Follow-Up Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${getColor(stats.monthlyRate)}`}>{stats.monthlyRate}%</span>
              <span className="text-sm text-muted-foreground mb-1">of active leads contacted</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${getProgressColor(stats.monthlyRate)}`}
                style={{ width: `${stats.monthlyRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.contactedThisMonth} out of {stats.totalActive} active leads contacted in the last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Active Leads", value: stats.totalActive, icon: User, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Contacted This Week", value: stats.contactedThisWeek, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
          { label: "Snoozed", value: stats.snoozedCount, icon: Snooze, color: "text-purple-500", bg: "bg-purple-50" },
        ].map(card => (
          <Card key={card.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance guidance */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-primary" /> Performance Guidance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {stats.weeklyRate >= 70 ? (
            <p className="text-green-600 font-medium">Excellent! You're contacting over 70% of leads weekly — top performers maintain this pace.</p>
          ) : stats.weeklyRate >= 40 ? (
            <p className="text-yellow-600 font-medium">Good progress. Aim to contact at least 70% of active leads per week to maximize conversion.</p>
          ) : (
            <p className="text-red-500 font-medium">Your follow-up rate is below 40%. Use the AI Suggestions tab to quickly work through your backlog.</p>
          )}
          {stats.snoozedCount > 0 && (
            <p>You have {stats.snoozedCount} snoozed lead{stats.snoozedCount > 1 ? "s" : ""} — check back when they wake up to re-engage.</p>
          )}
          <p>Industry benchmark: top loan officers contact 80%+ of leads within 5 days of last touchpoint.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 4: Referral Partners ─────────────────────────────────────────────────
function ReferralPartnersTab() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.referralPartners.list.useQuery(
    { search: search || undefined, limit: 50 },
    { keepPreviousData: true } as any
  );
  const partners = (data as any)?.partners ?? [];

  const getDaysSince = (date: Date | string | null | undefined) => {
    if (!date) return null;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyBg = (days: number | null) => {
    if (days === null) return "bg-gray-50 border-gray-200";
    if (days > 30) return "bg-red-50 border-red-200";
    if (days > 14) return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
  };

  const getUrgencyLabel = (days: number | null) => {
    if (days === null) return { label: "Never contacted", color: "text-gray-500" };
    if (days > 30) return { label: `${days}d overdue`, color: "text-red-600" };
    if (days > 14) return { label: `${days}d ago`, color: "text-yellow-600" };
    return { label: `${days}d ago`, color: "text-green-600" };
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;
  }

  const overdueCount = partners.filter((p: any) => { const d = getDaysSince(p.lastContactDate); return d === null || d > 30; }).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 bg-muted/40"><CardContent className="p-4"><div className="text-2xl font-bold">{partners.length}</div><div className="text-xs text-muted-foreground mt-0.5">Total Partners</div></CardContent></Card>
        <Card className="border-0 bg-red-50"><CardContent className="p-4"><div className="text-2xl font-bold text-red-600">{overdueCount}</div><div className="text-xs text-muted-foreground mt-0.5">Need Follow-Up</div></CardContent></Card>
        <Card className="border-0 bg-yellow-50"><CardContent className="p-4"><div className="text-2xl font-bold text-yellow-600">{partners.filter((p: any) => p.relationshipStatus === "vip").length}</div><div className="text-xs text-muted-foreground mt-0.5">VIP Partners</div></CardContent></Card>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search partners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {partners.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No referral partners yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add partners in the Referral Partners section to track follow-ups here.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/referral-partners"}>
            <ExternalLink className="w-4 h-4 mr-2" /> Go to Referral Partners
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {[...partners].sort((a: any, b: any) => (getDaysSince(b.lastContactDate) ?? 9999) - (getDaysSince(a.lastContactDate) ?? 9999)).map((partner: any) => {
            const days = getDaysSince(partner.lastContactDate);
            const urgency = getUrgencyLabel(days);
            const nextFollowUp = partner.nextFollowUpDate ? new Date(partner.nextFollowUpDate) : null;
            const isOverdue = nextFollowUp && nextFollowUp < new Date();
            return (
              <Card key={partner.id} className={`border ${getUrgencyBg(days)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{partner.firstName} {partner.lastName}</span>
                          {partner.relationshipStatus === "vip" && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs"><Star className="w-3 h-3 mr-1" />VIP</Badge>}
                          <Badge variant="outline" className="text-xs capitalize">{(partner.partnerType ?? "").replace(/_/g, " ")}</Badge>
                        </div>
                        {partner.company && <p className="text-xs text-muted-foreground mt-0.5">{partner.company}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {partner.phone && <a href={`tel:${partner.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Phone className="w-3 h-3" />{partner.phone}</a>}
                          {partner.email && <a href={`mailto:${partner.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Mail className="w-3 h-3" />{partner.email}</a>}
                        </div>
                        {nextFollowUp && <p className={`text-xs mt-1 flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}><Calendar className="w-3 h-3" />{isOverdue ? "Overdue: " : "Follow-up: "}{nextFollowUp.toLocaleDateString()}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xs font-medium ${urgency.color}`}><Clock className="w-3 h-3 inline mr-1" />{urgency.label}</span>
                      <div className="flex gap-1">
                        {partner.phone && <Button size="sm" variant="outline" className="h-7 px-2" asChild><a href={`tel:${partner.phone}`}><Phone className="w-3 h-3" /></a></Button>}
                        {partner.email && <Button size="sm" variant="outline" className="h-7 px-2" asChild><a href={`mailto:${partner.email}`}><Mail className="w-3 h-3" /></a></Button>}
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => window.location.href = `/referral-partners/${partner.id}`}><ExternalLink className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FollowUps() {
  const { agencyId } = useAgency();
  const [activeTab, setActiveTab] = useState("tasks");

  const { data: stats } = trpc.followUps.getCompletionStats.useQuery();
  const { data: suggested } = trpc.followUps.getAllSuggested.useQuery({ urgency: "all" });

  const highCount = suggested?.counts?.high ?? 0;

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Follow-Ups</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Tasks, AI-powered suggestions, and performance stats to keep your pipeline moving.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {highCount > 0 && (
              <Badge className="bg-red-500 text-white border-0 gap-1">
                <AlertCircle className="w-3 h-3" /> {highCount} urgent
              </Badge>
            )}
          </div>
        </div>

        {/* ── Today's Top Follow-Ups Banner ── */}
        {suggested?.suggestions && suggested.suggestions.length > 0 && (
          <div className="rounded-xl border bg-gradient-to-r from-primary/5 to-primary/10 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Today's Top Follow-Ups</span>
              <Badge variant="outline" className="text-xs">{suggested.suggestions.length} AI suggestions</Badge>
              <button
                onClick={() => setActiveTab("ai-suggestions")}
                className="ml-auto text-xs text-primary hover:underline font-medium"
              >View all →</button>
            </div>
            {suggested.suggestions.slice(0, 2).map((s: any) => (
              <div key={s.leadId} className="flex items-center gap-3 p-3 rounded-lg bg-background/80 border hover:bg-accent/40 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  s.urgency === 'high' ? 'bg-red-500' : s.urgency === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.leadName}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.reason}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${
                      s.urgency === 'high' ? 'border-red-300 text-red-600' :
                      s.urgency === 'medium' ? 'border-yellow-300 text-yellow-600' :
                      'border-green-300 text-green-600'
                    }`}
                  >{s.urgency}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setActiveTab("ai-suggestions")}
                  >
                    <Zap className="w-3 h-3" /> Act
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-1">
            <TabsTrigger value="tasks" className="gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="ai-suggestions" className="gap-1.5">
              <BrainCircuit className="w-4 h-4" /> AI Suggestions
              {highCount > 0 && (
                <Badge className="ml-1 h-4 min-w-4 text-xs bg-red-500 text-white border-0 px-1">{highCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <TrendingUp className="w-4 h-4" /> Completion Stats
              {stats && (
                <span className={`ml-1 text-xs font-semibold ${stats.weeklyRate >= 70 ? "text-green-500" : stats.weeklyRate >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                  {stats.weeklyRate}%
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-1.5">
              <Users className="w-4 h-4" /> Referral Partners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4">
            <TasksTab agencyId={agencyId} />
          </TabsContent>
          <TabsContent value="ai-suggestions" className="mt-4">
            <AISuggestionsTab />
          </TabsContent>
          <TabsContent value="stats" className="mt-4">
            <CompletionStatsTab />
          </TabsContent>
          <TabsContent value="referrals" className="mt-4">
            <ReferralPartnersTab />
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
