import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  PauseCircle,
  RefreshCw,
  CreditCard,
  Loader2,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSubscriptionStatusConfig(status: string) {
  switch (status) {
    case "active":   return { label: "Active",    color: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle2 };
    case "trial":    return { label: "Trial",     color: "bg-blue-100 text-blue-800 border-blue-200",    icon: Clock };
    case "past_due": return { label: "Past Due",  color: "bg-red-100 text-red-800 border-red-200",       icon: AlertCircle };
    case "canceled": return { label: "Canceled",  color: "bg-gray-100 text-gray-700 border-gray-200",   icon: XCircle };
    case "paused":   return { label: "Paused",    color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: PauseCircle };
    default:         return { label: status,      color: "bg-gray-100 text-gray-700 border-gray-200",   icon: Clock };
  }
}

function getTierLabel(tier: string) {
  switch (tier) {
    case "starter":      return "Starter";
    case "pro":          return "Pro";
    case "enterprise":   return "Enterprise";
    case "done_for_you": return "Done For You";
    default:             return tier;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const { data: clients = [], isLoading, refetch } = trpc.clients.list.useQuery();

  // Filter clients
  const filtered = (clients as any[]).filter((c) => {
    const matchSearch =
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.subscriptionStatus === statusFilter;
    const matchTier = tierFilter === "all" || c.subscriptionTier === tierFilter;
    return matchSearch && matchStatus && matchTier;
  });

  // Stats
  const stats = {
    active: (clients as any[]).filter(c => c.subscriptionStatus === "active").length,
    trial: (clients as any[]).filter(c => c.subscriptionStatus === "trial").length,
    pastDue: (clients as any[]).filter(c => c.subscriptionStatus === "past_due").length,
    canceled: (clients as any[]).filter(c => c.subscriptionStatus === "canceled").length,
    total: (clients as any[]).length,
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payments & Subscriptions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage client billing and subscription status</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => window.open("https://squareup.com/dashboard", "_blank")}>
              <CreditCard className="w-3.5 h-3.5" />
              Square Dashboard
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active", value: stats.active, color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
            { label: "Trial", value: stats.trial, color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
            { label: "Past Due", value: stats.pastDue, color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
            { label: "Canceled", value: stats.canceled, color: "text-gray-600", bg: "bg-gray-50", icon: XCircle },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Square integration notice */}
        <Card className="border border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Square Integration</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Connect your Square account to sync subscription billing automatically. 
                Visit your <button onClick={() => window.open("https://squareup.com/dashboard", "_blank")} className="underline font-medium">Square Dashboard</button> to manage payments and subscriptions.
                Billing data shown below is from your internal client records.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="done_for_you">Done For You</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients table */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Clients ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No clients found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Client</TableHead>
                      <TableHead className="font-semibold">Tier</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Trial Start</TableHead>
                      <TableHead className="font-semibold">Billing Start</TableHead>
                      <TableHead className="font-semibold">Square ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((client: any) => {
                      const cfg = getSubscriptionStatusConfig(client.subscriptionStatus);
                      const StatusIcon = cfg.icon;
                      return (
                        <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{client.name}</p>
                              <p className="text-xs text-muted-foreground">{client.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getTierLabel(client.subscriptionTier)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {client.trialStartDate
                              ? new Date(client.trialStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {client.billingStartDate
                              ? new Date(client.billingStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {client.stripeCustomerId || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
