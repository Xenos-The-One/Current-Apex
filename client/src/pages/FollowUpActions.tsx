import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Phone,
  MessageSquare,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Loader2,
  UserX,
  CalendarX,
  Snowflake,
  ChevronRight,
  RefreshCw,
  Zap,
} from "lucide-react";

type TabType = "all" | "no_show" | "cancelled" | "stale";

const TAB_CONFIG = {
  all: { label: "All", icon: Filter, color: "text-foreground" },
  no_show: { label: "No-Shows", icon: UserX, color: "text-red-600" },
  cancelled: { label: "Cancellations", icon: CalendarX, color: "text-orange-600" },
  stale: { label: "Stale Leads", icon: Snowflake, color: "text-blue-600" },
};

function LeadRow({ lead, onCallInitiated }: { lead: any; onCallInitiated: (id: number) => void }) {
  const [calling, setCalling] = useState(false);
  const makeCallMutation = trpc.vapi.makeCall.useMutation({
    onSuccess: () => {
      toast.success(`Recovery call initiated for ${lead.firstName} ${lead.lastName}`);
      onCallInitiated(lead.id);
    },
    onError: (err) => {
      toast.error(`Call failed: ${err.message}`);
    },
    onSettled: () => setCalling(false),
  });

  const daysSince = lead.lastContactDate
    ? Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const urgencyColor =
    daysSince >= 14 ? "border-l-red-500" :
    daysSince >= 7 ? "border-l-orange-500" :
    "border-l-blue-500";

  function handleCall() {
    if (!lead.phone) {
      toast.error("No phone number on file for this lead");
      return;
    }
    setCalling(true);
    makeCallMutation.mutate({ leadId: lead.id, phoneNumber: lead.phone });
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${urgencyColor} bg-card hover:bg-accent/30 transition-colors`}>
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-semibold text-primary">
          {(lead.firstName?.[0] || "?")}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">
            {lead.firstName} {lead.lastName}
          </p>
          <Badge variant="outline" className="text-[10px] capitalize shrink-0">
            {lead.status?.replace(/_/g, " ")}
          </Badge>
          {lead.category && (
            <Badge variant="outline" className={`text-[10px] shrink-0 ${
              lead.category === "no_show" ? "border-red-300 text-red-600" :
              lead.category === "cancelled" ? "border-orange-300 text-orange-600" :
              "border-blue-300 text-blue-600"
            }`}>
              {lead.category === "no_show" ? "No-Show" :
               lead.category === "cancelled" ? "Cancelled" :
               `${daysSince}d silent`}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {lead.phone || "No phone"} &middot; {lead.source || "Direct"} &middot; Last contact: {daysSince}d ago
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
          onClick={handleCall}
          disabled={calling || !lead.phone}
        >
          {calling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
          Call
        </Button>
        <Link href={`/conversations?leadId=${lead.id}`}>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
            <MessageSquare className="h-3 w-3" />
            SMS
          </Button>
        </Link>
        <Link href={`/leads/${lead.id}`}>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function FollowUpActions() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [calledLeads, setCalledLeads] = useState<Set<number>>(new Set());

  const { data: slaAlerts, isLoading: slaLoading } = trpc.crm.getSlaAlerts.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: leadsData, isLoading: leadsLoading } = trpc.crm.listMyLeads.useQuery({
    status: undefined,
    limit: 200,
  }, { refetchOnWindowFocus: false });

  const isLoading = slaLoading || leadsLoading;

  // Build categorized follow-up list from leads
  const now = Date.now();
  const allLeads = (leadsData?.leads || []) as any[];

  const categorizedLeads = allLeads
    .filter(l => l.status !== "closed_won" && l.status !== "closed_lost")
    .map(l => {
      const lastContact = l.lastContactDate
        ? new Date(l.lastContactDate).getTime()
        : new Date(l.createdAt).getTime();
      const daysSince = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));

      let category: string | null = null;
      if (l.status === "no_show") category = "no_show";
      else if (l.status === "cancelled") category = "cancelled";
      else if (daysSince >= 7) category = "stale";

      return { ...l, category, daysSince };
    })
    .filter(l => l.category !== null);

  const filtered = categorizedLeads
    .filter(l => activeTab === "all" || l.category === activeTab)
    .filter(l => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        l.firstName?.toLowerCase().includes(q) ||
        l.lastName?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.email?.toLowerCase().includes(q)
      );
    })
    .filter(l => !calledLeads.has(l.id));

  const noShowCount = categorizedLeads.filter(l => l.category === "no_show").length;
  const cancelledCount = categorizedLeads.filter(l => l.category === "cancelled").length;
  const staleCount = categorizedLeads.filter(l => l.category === "stale").length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Follow-Up Actions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              No-shows, cancellations, and stale leads that need immediate attention.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{noShowCount}</p>
                  <p className="text-xs text-muted-foreground">No-Shows</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <CalendarX className="h-4 w-4 text-orange-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{cancelledCount}</p>
                  <p className="text-xs text-muted-foreground">Cancellations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{staleCount}</p>
                  <p className="text-xs text-muted-foreground">Stale (7d+)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SLA Alerts from AI Coach */}
        {slaAlerts && slaAlerts.newNotContacted > 0 && (
          <Card className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-800 dark:text-red-300">
                  {slaAlerts.newNotContacted} new lead{slaAlerts.newNotContacted > 1 ? "s" : ""} not contacted within 24 hours
                </span>
                <Link href="/contacts" className="ml-auto">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-300">
                    View <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs + Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(Object.entries(TAB_CONFIG) as [TabType, typeof TAB_CONFIG[TabType]][]).map(([key, cfg]) => {
              const count = key === "all" ? categorizedLeads.length :
                key === "no_show" ? noShowCount :
                key === "cancelled" ? cancelledCount : staleCount;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === key
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <cfg.icon className={`h-3.5 w-3.5 ${activeTab === key ? cfg.color : ""}`} />
                  {cfg.label}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${
                      activeTab === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Lead List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
              <p className="font-medium">All clear!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "No leads match your search." : "No follow-up actions needed in this category right now."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} lead{filtered.length !== 1 ? "s" : ""} — click <strong>Call</strong> to initiate an AI recovery call via Vapi
            </p>
            {filtered.map(lead => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onCallInitiated={id => setCalledLeads(prev => new Set([...prev, id]))}
              />
            ))}
          </div>
        )}

        {calledLeads.size > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {calledLeads.size} lead{calledLeads.size > 1 ? "s" : ""} called this session.{" "}
            <button onClick={() => setCalledLeads(new Set())} className="underline hover:no-underline">
              Show all
            </button>
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
