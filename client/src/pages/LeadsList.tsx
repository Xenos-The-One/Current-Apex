import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  Users, Phone, Mail, Search, Plus, Upload, TrendingDown,
  LayoutList, Kanban, DollarSign, UserCheck, UserX,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Tag, ChevronDown, CheckSquare,
} from "lucide-react";
import { Link } from "wouter";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { toast } from "sonner";
import KanbanBoard from "@/components/KanbanBoard";

const PAGE_SIZE = 100;

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "appointment_set", label: "Appt Set" },
  { value: "appointment_completed", label: "Appt Done" },
  { value: "closed_won", label: "Won" },
  { value: "closed_lost", label: "Lost" },
] as const;

function formatCurrency(amount: string | number | null | undefined): string {
  if (!amount) return "";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getContactTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "real_estate_agent": return "RE Agent";
    case "attorney": return "Attorney";
    case "insurance_agent": return "Insurance";
    case "title_company": return "Title Co.";
    case "builder_developer": return "Builder";
    case "lender": return "Lender";
    case "borrower": return "Borrower";
    case "other": return "Other";
    default: return "Borrower";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "new": return "bg-amber-500 text-white";
    case "contacted": return "bg-blue-500 text-white";
    case "qualified": return "bg-cyan-500 text-white";
    case "appointment_set":
    case "appointment_completed": return "bg-purple-500 text-white";
    case "closed_won": return "bg-emerald-500 text-white";
    case "closed_lost": return "bg-red-500 text-white";
    default: return "";
  }
}

export default function LeadsList({ initialContactType }: { initialContactType?: string } = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contactTypeFilter, setContactTypeFilter] = useState<string>(initialContactType ?? "all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [pipelineType, setPipelineType] = useState<"loan" | "sales">("loan");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const { isImpersonating } = useImpersonation();
  const utils = trpc.useUtils();

  // Debounce search to avoid firing a query on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [statusFilter, debouncedSearch, contactTypeFilter, pipelineType, tagFilter]);

  // Sync filter when parent changes the initialContactType (tab navigation)
  useEffect(() => {
    if (initialContactType !== undefined) setContactTypeFilter(initialContactType);
  }, [initialContactType]);

  const isAdminView = (user?.role === "admin" || user?.role === "super_admin") && !isImpersonating;

  // ── Fetch distinct tags for the tag filter dropdown ────────────────────────
  const { data: availableTags = [] } = trpc.crm.getMyLeadTags.useQuery(undefined, {
    enabled: !isAdminView,
    staleTime: 60_000, // cache for 1 min — tags don't change often
  });

  // ── Admin query ────────────────────────────────────────────────────────────
  const { data: adminLeads, isLoading: adminLoading } = trpc.leads.list.useQuery(
    {
      agencyId: 1,
      status: statusFilter !== "all" ? statusFilter as any : undefined,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    },
    { enabled: isAdminView }
  );

  const { data: clientInfo } = trpc.crm.getMyInfo.useQuery(undefined, {
    enabled: !isAdminView,
  });

  // ── Client query — paginated with tag + search server-side ────────────────
  const { data: clientLeadsData, isLoading: clientLoading } = trpc.crm.listMyLeads.useQuery(
    {
      status: statusFilter !== "all" ? statusFilter as any : undefined,
      page: currentPage,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      tag: tagFilter !== "all" ? tagFilter : undefined,
    },
    { enabled: !isAdminView }
  );

  const isLoading = isAdminView ? adminLoading : clientLoading;
  const isReadOnly = clientInfo?.client.accessMode === "read_only";

  const rawLeads: any[] = isAdminView
    ? (adminLeads ?? [])
    : (clientLeadsData?.leads ?? []);

  const totalLeadsCount: number = isAdminView
    ? (adminLeads?.length ?? 0)
    : (clientLeadsData?.total ?? 0);

  // ── Bulk assign mutation ───────────────────────────────────────────────────
  const bulkAssign = trpc.crm.bulkAssignLeads.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updated} lead${data.updated !== 1 ? "s" : ""} unassigned successfully`);
      setSelectedLeadIds(new Set());
      utils.crm.listMyLeads.invalidate();
      utils.leads.list.invalidate();
    },
    onError: () => toast.error("Failed to update assignment"),
  });

  // ── Bulk status update mutation ────────────────────────────────────────────
  const bulkStatusUpdate = trpc.crm.bulkUpdateLeadStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updated} lead${data.updated !== 1 ? "s" : ""} updated successfully`);
      setSelectedLeadIds(new Set());
      utils.crm.listMyLeads.invalidate();
      utils.leads.list.invalidate();
    },
    onError: () => toast.error("Failed to update lead status"),
  });

  // ── Status change mutation for Kanban drag-and-drop ───────────────────────
  const updateStatus = trpc.crm.updateLeadStatus.useMutation({
    onSettled: () => {
      if (isAdminView) utils.leads.list.invalidate();
      else utils.crm.listMyLeads.invalidate();
    },
    onError: () => toast.error("Failed to update lead status"),
  });

  const handleStatusChange = (leadId: number, newStatus: string) => {
    updateStatus.mutate({ leadId, status: newStatus as any });
  };

  // Client-side filtering (pipeline type, contact type, assignment)
  const filteredLeads = useMemo(() => {
    return rawLeads.filter(lead => {
      const lpt = (lead as any).pipelineType || "loan";
      if (lpt !== pipelineType) return false;
      if (contactTypeFilter !== "all") {
        const ct = (lead as any).contactType || "borrower";
        if (ct !== contactTypeFilter) return false;
      }
      if (assignmentFilter === "unassigned") {
        if ((lead as any).assignedToUserId) return false;
      } else if (assignmentFilter === "assigned") {
        if (!(lead as any).assignedToUserId) return false;
      }
      return true;
    });
  }, [rawLeads, contactTypeFilter, assignmentFilter, pipelineType]);

  const toggleSelect = (id: number) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  // Pipeline KPIs
  const pipelineStats = useMemo(() => {
    let totalValue = 0;
    let probSum = 0;
    let probCount = 0;
    for (const lead of filteredLeads) {
      const amt = (lead as any).loanAmount ? parseFloat(String((lead as any).loanAmount)) : 0;
      if (!isNaN(amt)) totalValue += amt;
      const prob = (lead as any).probability;
      if (prob != null && prob > 0) { probSum += prob; probCount++; }
    }
    return {
      total: totalLeadsCount,
      totalValue,
      avgProbability: probCount > 0 ? Math.round(probSum / probCount) : 0,
    };
  }, [filteredLeads, totalLeadsCount]);

  const totalPages = Math.max(1, Math.ceil(totalLeadsCount / PAGE_SIZE));

  const activeFilterCount = [
    statusFilter !== "all",
    tagFilter !== "all",
    contactTypeFilter !== "all",
    debouncedSearch,
  ].filter(Boolean).length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="text-lg font-semibold">
              {pipelineType === "loan" ? "Loan Pipeline" : "Sales Pipeline"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {totalLeadsCount.toLocaleString()} total leads
              </span>
              {pipelineStats.totalValue > 0 && (
                <span className="text-xs text-emerald-600 font-medium">{formatCurrency(pipelineStats.totalValue)}</span>
              )}
              {pipelineStats.avgProbability > 0 && (
                <span className="text-xs text-muted-foreground">{pipelineStats.avgProbability}% avg prob</span>
              )}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
                </Badge>
              )}
            </div>
          </div>
          {!isReadOnly && (
            <div className="flex gap-1.5">
              <Link href="/leads/import">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Import
                </Button>
              </Link>
              <Link href="/leads/new">
                <Button size="sm" className="h-8 text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add Lead
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Pipeline Type Toggle */}
        <Tabs value={pipelineType} onValueChange={(v) => { setPipelineType(v as "loan" | "sales"); setStatusFilter("all"); setContactTypeFilter("all"); setTagFilter("all"); }}>
          <TabsList className="h-9">
            <TabsTrigger value="loan" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Loan Pipeline
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2">
              <Users className="w-4 h-4" />
              Sales Pipeline
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters + View Toggle */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
              {/* Search */}
              <div className="flex-1 relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* Status filter */}
              <div className="w-full md:w-36">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Tag filter — only shown for client view */}
              {!isAdminView && (
                <div className="w-full md:w-48">
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="h-9 gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Filter by tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {availableTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Contact type filter */}
              <div className="w-full md:w-36">
                <Select value={contactTypeFilter} onValueChange={setContactTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="borrower">Borrowers</SelectItem>
                    <SelectItem value="real_estate_agent">RE Agents</SelectItem>
                    <SelectItem value="attorney">Attorneys</SelectItem>
                    <SelectItem value="insurance_agent">Insurance</SelectItem>
                    <SelectItem value="title_company">Title Co.</SelectItem>
                    <SelectItem value="builder_developer">Builders</SelectItem>
                    <SelectItem value="lender">Lenders</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Assignment filter */}
              <div className="w-full md:w-36">
                <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leads</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* View toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")} className="shrink-0">
                <TabsList className="h-9">
                  <TabsTrigger value="list" className="px-3 gap-1.5">
                    <LayoutList className="w-4 h-4" />
                    <span className="hidden sm:inline">List</span>
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="px-3 gap-1.5">
                    <Kanban className="w-4 h-4" />
                    <span className="hidden sm:inline">Pipeline</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading leads...</p>
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard
            leads={filteredLeads as any}
            onStatusChange={handleStatusChange}
            isReadOnly={isReadOnly}
          />
        ) : (
          <>
          {/* ── Bulk Action Bar ── */}
          {selectedLeadIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-lg">
              <CheckSquare className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium">
                {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2 ml-auto flex-wrap">
                {/* Bulk Status Update */}
                {!isAdminView && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs gap-1.5"
                        disabled={bulkStatusUpdate.isPending}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Set Status
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="text-xs">
                        Update {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? "s" : ""} to:
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {STATUS_OPTIONS.map(s => (
                        <DropdownMenuItem
                          key={s.value}
                          onClick={() => bulkStatusUpdate.mutate({
                            leadIds: Array.from(selectedLeadIds),
                            status: s.value,
                          })}
                          className="gap-2"
                        >
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(s.value).replace("text-white", "")}`} />
                          {s.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {/* Bulk Unassign */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => bulkAssign.mutate({ leadIds: Array.from(selectedLeadIds), assignedToUserId: null })}
                  disabled={bulkAssign.isPending}
                >
                  <UserX className="w-3.5 h-3.5" />
                  Unassign
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setSelectedLeadIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all leads on this page"
                  />
                  <span className="text-sm font-semibold">
                    {filteredLeads.length} Lead{filteredLeads.length !== 1 ? "s" : ""} on page
                  </span>
                  {totalLeadsCount > PAGE_SIZE && (
                    <span className="text-xs text-muted-foreground">
                      ({totalLeadsCount.toLocaleString()} total)
                    </span>
                  )}
                  {tagFilter !== "all" && (
                    <Badge variant="outline" className="text-[10px] h-5 gap-1 px-1.5">
                      <Tag className="w-2.5 h-2.5" />
                      {tagFilter}
                    </Badge>
                  )}
                </div>
                {totalPages > 1 && (
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLeads && filteredLeads.length > 0 ? (
                <table className="w-full table-compact">
                  <thead>
                    <tr className="border-b">
                      <th className="w-8 pl-4"><span className="sr-only">Select</span></th>
                      <th className="text-left">Name</th>
                      <th className="text-left hidden sm:table-cell">Contact</th>
                      <th className="text-left hidden md:table-cell">Source / Tags</th>
                      <th className="text-left">Status</th>
                      <th className="text-right hidden lg:table-cell">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                  {filteredLeads.map((lead) => {
                    const tags: string[] = Array.isArray(lead.tags) ? lead.tags : (lead.tags ? JSON.parse(lead.tags) : []);
                    return (
                      <tr key={lead.id}>
                        <td className="pl-4">
                          <Checkbox
                            checked={selectedLeadIds.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                          />
                        </td>
                        <td>
                          <Link href={`/leads/${lead.id}`}>
                            <div className="hover:text-primary transition-colors cursor-pointer">
                              <p className="font-medium text-sm">{lead.firstName} {lead.lastName}</p>
                              {(lead as any).company && (
                                <span className="text-[10px] text-muted-foreground">{(lead as any).company}</span>
                              )}
                              {(lead as any).contactType && (lead as any).contactType !== "borrower" && !(lead as any).company && (
                                <span className="text-[10px] text-violet-600">{getContactTypeLabel((lead as any).contactType)}</span>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="hidden sm:table-cell">
                          <div className="space-y-0.5">
                            {lead.email && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[160px]">{lead.email}</span>
                              </p>
                            )}
                            {lead.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3 shrink-0" />
                                {lead.phone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {lead.source && (
                              <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{lead.source}</span>
                            )}
                            {(lead as any).refiProspect && (
                              <span className="text-[11px] bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <TrendingDown className="w-2.5 h-2.5" />Refi
                              </span>
                            )}
                            {tags.slice(0, 2).map(tag => (
                              <button
                                key={tag}
                                onClick={() => setTagFilter(tag)}
                                className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 hover:bg-violet-200 dark:hover:bg-violet-900 transition-colors"
                                title={`Filter by "${tag}"`}
                              >
                                <Tag className="w-2 h-2" />
                                {tag}
                              </button>
                            ))}
                            {tags.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <Badge className={`text-[10px] ${getStatusColor(lead.status)}`}>
                            {lead.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="text-right hidden lg:table-cell">
                          {(lead as any).loanAmount && parseFloat(String((lead as any).loanAmount)) > 0 ? (
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency((lead as any).loanAmount)}
                            </span>
                          ) : (
                            (lead as any).assignedToUserId ? (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                                <UserCheck className="w-3 h-3" />Assigned
                              </span>
                            ) : null
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No leads found</p>
                  {searchQuery || statusFilter !== "all" || contactTypeFilter !== "all" || tagFilter !== "all" ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">Try adjusting your filters</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs"
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                          setContactTypeFilter("all");
                          setTagFilter("all");
                          setAssignmentFilter("all");
                        }}
                      >
                        Clear all filters
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm mt-1">Get started by importing or adding leads</p>
                      {!isReadOnly && (
                        <div className="flex gap-2 justify-center mt-4">
                          <Link href="/leads/import">
                            <Button variant="outline" size="sm">
                              <Upload className="w-4 h-4 mr-2" />
                              Import Leads
                            </Button>
                          </Link>
                          <Link href="/leads/new">
                            <Button size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Add Lead
                            </Button>
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>

            {/* ── Pagination Controls ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Showing {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(currentPage * PAGE_SIZE, totalLeadsCount).toLocaleString()} of {totalLeadsCount.toLocaleString()} leads
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    title="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                    return start + i;
                  }).map(p => (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="icon"
                      className="h-7 w-7 text-xs"
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
