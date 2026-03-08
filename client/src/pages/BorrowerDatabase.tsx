import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Plus,
  Search,
  Filter,
  Users,
  DollarSign,
  TrendingUp,
  Flame,
  Thermometer,
  Snowflake,
  LayoutGrid,
  List,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

// Pipeline status labels and colors
const PIPELINE_STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-indigo-100 text-indigo-800" },
  { value: "pre_qualified", label: "Pre-Qualified", color: "bg-violet-100 text-violet-800" },
  { value: "pre_approved", label: "Pre-Approved", color: "bg-purple-100 text-purple-800" },
  { value: "house_hunting", label: "House Hunting", color: "bg-pink-100 text-pink-800" },
  { value: "under_contract", label: "Under Contract", color: "bg-orange-100 text-orange-800" },
  { value: "processing", label: "Processing", color: "bg-amber-100 text-amber-800" },
  { value: "underwriting", label: "Underwriting", color: "bg-yellow-100 text-yellow-800" },
  { value: "conditional_approval", label: "Conditional", color: "bg-lime-100 text-lime-800" },
  { value: "clear_to_close", label: "Clear to Close", color: "bg-emerald-100 text-emerald-800" },
  { value: "closed_funded", label: "Closed/Funded", color: "bg-green-100 text-green-800" },
  { value: "closed_lost", label: "Closed/Lost", color: "bg-red-100 text-red-800" },
  { value: "on_hold", label: "On Hold", color: "bg-gray-100 text-gray-800" },
  { value: "nurture", label: "Nurture", color: "bg-teal-100 text-teal-800" },
];

const SCORE_TIERS = [
  { value: "hot", label: "Hot", icon: Flame, color: "text-red-500" },
  { value: "warm", label: "Warm", icon: Thermometer, color: "text-orange-500" },
  { value: "cold", label: "Cold", icon: Snowflake, color: "text-blue-500" },
  { value: "dead", label: "Dead", icon: Snowflake, color: "text-gray-400" },
];

function getPipelineStage(status: string) {
  return PIPELINE_STAGES.find(s => s.value === status) || PIPELINE_STAGES[0];
}

function formatCurrency(val: string | number | null | undefined): string {
  if (!val) return "-";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

export default function BorrowerDatabase() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [loanTypeFilter, setLoanTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("list");

  const listInput = useMemo(() => ({
    search: search || undefined,
    pipelineStatus: statusFilter !== "all" ? statusFilter : undefined,
    scoreTier: tierFilter !== "all" ? tierFilter : undefined,
    loanType: loanTypeFilter !== "all" ? loanTypeFilter : undefined,
    limit: 100,
    offset: 0,
  }), [search, statusFilter, tierFilter, loanTypeFilter]);

  const { data: listData, isLoading } = trpc.borrowers.list.useQuery(listInput);
  const { data: stats } = trpc.borrowers.stats.useQuery();
  const { data: pipelineData } = trpc.borrowers.pipelineSummary.useQuery();

  const borrowers = listData?.borrowers || [];
  const total = listData?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Borrower Database
            </h1>
            <p className="text-muted-foreground mt-1">
              {total} borrower{total !== 1 ? "s" : ""} in your pipeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-1" /> List
            </Button>
            <Button
              variant={viewMode === "pipeline" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("pipeline")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" /> Pipeline
            </Button>
            <Link href="/borrowers/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Borrower
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Hot</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-red-600">{stats.scoreTiers.hot}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Warm</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-orange-600">{stats.scoreTiers.warm}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Snowflake className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Cold</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-blue-600">{stats.scoreTiers.cold}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Pipeline $</span>
                </div>
                <p className="text-lg font-bold mt-1 text-green-700">{formatCurrency(stats.totalPipelineValue)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-muted-foreground">Follow-ups Today</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-amber-700">{stats.followUpsDue}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Pipeline Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PIPELINE_STAGES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Score Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
              <SelectItem value="dead">Dead</SelectItem>
            </SelectContent>
          </Select>
          <Select value={loanTypeFilter} onValueChange={setLoanTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Loan Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Loan Types</SelectItem>
              <SelectItem value="conventional">Conventional</SelectItem>
              <SelectItem value="fha">FHA</SelectItem>
              <SelectItem value="va">VA</SelectItem>
              <SelectItem value="usda">USDA</SelectItem>
              <SelectItem value="jumbo">Jumbo</SelectItem>
              <SelectItem value="non_qm">Non-QM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {viewMode === "list" ? (
          <BorrowerListView borrowers={borrowers} isLoading={isLoading} onRowClick={(id) => setLocation(`/borrowers/${id}`)} />
        ) : (
          <BorrowerPipelineView
            pipelineData={pipelineData || []}
            borrowers={borrowers}
            onCardClick={(id) => setLocation(`/borrowers/${id}`)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// ============= LIST VIEW =============
function BorrowerListView({
  borrowers,
  isLoading,
  onRowClick,
}: {
  borrowers: any[];
  isLoading: boolean;
  onRowClick: (id: number) => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading borrowers...</p>
        </CardContent>
      </Card>
    );
  }

  if (borrowers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Database className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No borrowers yet</h3>
          <p className="text-muted-foreground mb-4">Start building your borrower database by adding your first borrower profile.</p>
          <Link href="/borrowers/new">
            <Button><Plus className="h-4 w-4 mr-1" /> Add First Borrower</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Loan Type</TableHead>
              <TableHead>Loan Amount</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Follow-Up</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {borrowers.map(b => {
              const stage = getPipelineStage(b.pipelineStatus);
              const tierInfo = SCORE_TIERS.find(t => t.value === b.scoreTier);
              return (
                <TableRow
                  key={b.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onRowClick(b.id)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{b.firstName} {b.lastName}</p>
                      {b.city && b.state && (
                        <p className="text-xs text-muted-foreground">{b.city}, {b.state}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {b.phone && (
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{formatPhone(b.phone)}</span>
                        </div>
                      )}
                      {b.email && (
                        <div className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[160px]">{b.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {b.loanType ? (
                      <Badge variant="outline" className="text-xs capitalize">
                        {b.loanType.replace(/_/g, " ")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(b.desiredLoanAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${stage.color} text-xs font-medium border-0`}>
                      {stage.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tierInfo && (
                      <div className="flex items-center gap-1">
                        <tierInfo.icon className={`h-3.5 w-3.5 ${tierInfo.color}`} />
                        <span className={`text-xs font-medium ${tierInfo.color}`}>{tierInfo.label}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {b.nextFollowUpDate ? (
                      <span className="text-xs">
                        {new Date(b.nextFollowUpDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

// ============= PIPELINE VIEW =============
function BorrowerPipelineView({
  pipelineData,
  borrowers,
  onCardClick,
}: {
  pipelineData: any[];
  borrowers: any[];
  onCardClick: (id: number) => void;
}) {
  // Group borrowers by pipeline status
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    PIPELINE_STAGES.forEach(s => { map[s.value] = []; });
    borrowers.forEach(b => {
      if (map[b.pipelineStatus]) {
        map[b.pipelineStatus].push(b);
      }
    });
    return map;
  }, [borrowers]);

  // Only show stages that have borrowers or are key stages
  const keyStages = ["new", "contacted", "pre_qualified", "pre_approved", "house_hunting", "under_contract", "processing", "underwriting", "clear_to_close", "closed_funded"];
  const visibleStages = PIPELINE_STAGES.filter(s =>
    keyStages.includes(s.value) || (grouped[s.value] && grouped[s.value].length > 0)
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {visibleStages.map(stage => (
          <div key={stage.value} className="w-[260px] flex-shrink-0">
            <div className={`rounded-t-lg px-3 py-2 ${stage.color} flex items-center justify-between`}>
              <span className="text-sm font-semibold">{stage.label}</span>
              <Badge variant="secondary" className="text-xs h-5 min-w-5 flex items-center justify-center">
                {grouped[stage.value]?.length || 0}
              </Badge>
            </div>
            <div className="bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
              {(grouped[stage.value] || []).map((b: any) => {
                const tierInfo = SCORE_TIERS.find(t => t.value === b.scoreTier);
                return (
                  <Card
                    key={b.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                    onClick={() => onCardClick(b.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm">{b.firstName} {b.lastName}</p>
                        {tierInfo && <tierInfo.icon className={`h-3.5 w-3.5 ${tierInfo.color}`} />}
                      </div>
                      {b.loanType && (
                        <p className="text-xs text-muted-foreground capitalize mb-1">
                          {b.loanType.replace(/_/g, " ")}
                        </p>
                      )}
                      {b.desiredLoanAmount && (
                        <p className="text-sm font-semibold text-green-700">
                          {formatCurrency(b.desiredLoanAmount)}
                        </p>
                      )}
                      {b.phone && (
                        <p className="text-xs text-muted-foreground mt-1">{formatPhone(b.phone)}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {(!grouped[stage.value] || grouped[stage.value].length === 0) && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No borrowers
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
