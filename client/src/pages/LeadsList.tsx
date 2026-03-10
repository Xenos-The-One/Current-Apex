import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import {
  Users, Phone, Mail, Search, Plus, Upload, TrendingDown,
  LayoutList, Kanban, DollarSign, Percent, UserCheck, UserX,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { toast } from "sonner";
import KanbanBoard from "@/components/KanbanBoard";

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

export default function LeadsList({ initialContactType }: { initialContactType?: string } = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contactTypeFilter, setContactTypeFilter] = useState<string>(initialContactType ?? "all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [pipelineType, setPipelineType] = useState<"loan" | "sales">("loan");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  const { isImpersonating } = useImpersonation();
  const utils = trpc.useUtils();

  // Sync filter when parent changes the initialContactType (tab navigation)
  const [location] = useLocation();
  useEffect(() => {
    if (initialContactType !== undefined) {
      setContactTypeFilter(initialContactType);
    }
  }, [initialContactType]);

  // Bulk assign mutation
  const bulkAssign = trpc.crm.bulkAssignLeads.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updated} lead${data.updated !== 1 ? "s" : ""} unassigned successfully`);
      setSelectedLeadIds(new Set());
      utils.crm.listMyLeads.invalidate();
      utils.leads.list.invalidate();
    },
    onError: () => toast.error("Failed to update assignment"),
  });

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

  const isAdminView = user?.role === "admin" || user?.role === "super_admin" && !isImpersonating;

  const { data: adminLeads, isLoading: adminLoading } = trpc.leads.list.useQuery(
    {
      agencyId: 1,
      status: statusFilter !== "all" ? statusFilter as any : undefined,
    },
    { enabled: isAdminView }
  );

  const { data: clientInfo } = trpc.crm.getMyInfo.useQuery(undefined, {
    enabled: !isAdminView,
  });

  const { data: clientLeads, isLoading: clientLoading } = trpc.crm.listMyLeads.useQuery(
    {
      status: statusFilter !== "all" ? statusFilter as any : undefined,
    },
    { enabled: !isAdminView }
  );

  const leads = isAdminView ? adminLeads : clientLeads;
  const isLoading = isAdminView ? adminLoading : clientLoading;
  const isReadOnly = clientInfo?.client.accessMode === "read_only";

  // Status change mutation for Kanban drag-and-drop
  const updateStatus = trpc.crm.updateLeadStatus.useMutation({
    onMutate: async ({ leadId, status }) => {
      // Optimistic update
      if (isAdminView) {
        await utils.leads.list.cancel();
        const prev = utils.leads.list.getData({ agencyId: 1, status: statusFilter !== "all" ? statusFilter as any : undefined });
        if (prev) {
          utils.leads.list.setData(
            { agencyId: 1, status: statusFilter !== "all" ? statusFilter as any : undefined },
            prev.map(l => l.id === leadId ? { ...l, status } : l)
          );
        }
        return { prev };
      } else {
        await utils.crm.listMyLeads.cancel();
        const prev = utils.crm.listMyLeads.getData({ status: statusFilter !== "all" ? statusFilter as any : undefined });
        if (prev) {
          utils.crm.listMyLeads.setData(
            { status: statusFilter !== "all" ? statusFilter as any : undefined },
            prev.map(l => l.id === leadId ? { ...l, status } : l)
          );
        }
        return { prev };
      }
    },
    onError: (_err, _vars, context: any) => {
      toast.error("Failed to update lead status");
      if (isAdminView && context?.prev) {
        utils.leads.list.setData(
          { agencyId: 1, status: statusFilter !== "all" ? statusFilter as any : undefined },
          context.prev
        );
      } else if (context?.prev) {
        utils.crm.listMyLeads.setData(
          { status: statusFilter !== "all" ? statusFilter as any : undefined },
          context.prev
        );
      }
    },
    onSettled: () => {
      if (isAdminView) {
        utils.leads.list.invalidate();
      } else {
        utils.crm.listMyLeads.invalidate();
      }
    },
  });

  const handleStatusChange = (leadId: number, newStatus: string) => {
    updateStatus.mutate({ leadId, status: newStatus as any });
  };

  // Filter leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => {
      // Pipeline type filter
      const lpt = (lead as any).pipelineType || "loan";
      if (lpt !== pipelineType) return false;
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const match = lead.firstName.toLowerCase().includes(query) ||
          lead.lastName.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query) ||
          lead.phone?.includes(query);
        if (!match) return false;
      }
      // Contact type filter
      if (contactTypeFilter !== "all") {
        const ct = (lead as any).contactType || "borrower";
        if (ct !== contactTypeFilter) return false;
      }
      // Assignment filter
      if (assignmentFilter === "unassigned") {
        if ((lead as any).assignedToUserId) return false;
      } else if (assignmentFilter === "assigned") {
        if (!(lead as any).assignedToUserId) return false;
      }
      return true;
    });
  }, [leads, searchQuery, contactTypeFilter, assignmentFilter, pipelineType]);

  // Pipeline KPIs
  const pipelineStats = useMemo(() => {
    if (!filteredLeads) return { total: 0, totalValue: 0, avgProbability: 0 };
    let totalValue = 0;
    let probSum = 0;
    let probCount = 0;
    for (const lead of filteredLeads) {
      const amt = (lead as any).loanAmount ? parseFloat(String((lead as any).loanAmount)) : 0;
      if (!isNaN(amt)) totalValue += amt;
      const prob = (lead as any).probability;
      if (prob != null && prob > 0) {
        probSum += prob;
        probCount++;
      }
    }
    return {
      total: filteredLeads.length,
      totalValue,
      avgProbability: probCount > 0 ? Math.round(probSum / probCount) : 0,
    };
  }, [filteredLeads]);

  const getStatusColor = (status: string) => {
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
  };

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
              <span className="text-xs text-muted-foreground">{pipelineStats.total} leads</span>
              {pipelineStats.totalValue > 0 && (
                <span className="text-xs text-emerald-600 font-medium">{formatCurrency(pipelineStats.totalValue)}</span>
              )}
              {pipelineStats.avgProbability > 0 && (
                <span className="text-xs text-muted-foreground">{pipelineStats.avgProbability}% avg prob</span>
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
        <Tabs value={pipelineType} onValueChange={(v) => { setPipelineType(v as "loan" | "sales"); setStatusFilter("all"); setContactTypeFilter("all"); }}>
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
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              {/* Search */}
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* Status filter */}
              <div className="w-full md:w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="appointment_set">Appt Set</SelectItem>
                    <SelectItem value="appointment_completed">Appt Done</SelectItem>
                    <SelectItem value="closed_won">Won</SelectItem>
                    <SelectItem value="closed_lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Contact type filter */}
              <div className="w-full md:w-40">
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
              <div className="w-full md:w-40">
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
          /* ─── Kanban View ─────────────────────────────────────────────── */
          <KanbanBoard
            leads={filteredLeads as any}
            onStatusChange={handleStatusChange}
            isReadOnly={isReadOnly}
          />
        ) : (
          /* ─── List View ───────────────────────────────────────────────── */
          <>
          {selectedLeadIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-lg">
              <span className="text-sm font-medium">{selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? "s" : ""} selected</span>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => bulkAssign.mutate({ leadIds: Array.from(selectedLeadIds), assignedToUserId: null })}
                  disabled={bulkAssign.isPending}
                >
                  <UserX className="w-3.5 h-3.5" />
                  Unassign Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setSelectedLeadIds(new Set())}
                >
                  Clear Selection
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
                    aria-label="Select all leads"
                  />
                  <span className="text-sm font-semibold">{filteredLeads?.length || 0} Lead{filteredLeads?.length !== 1 ? "s" : ""}</span>
                  {(statusFilter !== "all" || contactTypeFilter !== "all") && (
                    <span className="text-xs text-muted-foreground">
                      {statusFilter !== "all" && statusFilter.replace(/_/g, " ")}
                      {statusFilter !== "all" && contactTypeFilter !== "all" && " · "}
                      {contactTypeFilter !== "all" && getContactTypeLabel(contactTypeFilter)}
                    </span>
                  )}
                </div>
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
                      <th className="text-left hidden md:table-cell">Source</th>
                      <th className="text-left">Status</th>
                      <th className="text-right hidden lg:table-cell">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                  {filteredLeads.map((lead) => (
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
                            {(lead as any).contactType && (lead as any).contactType !== "borrower" && (
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
                  ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No leads found</p>
                  {searchQuery || statusFilter !== "all" || contactTypeFilter !== "all" ? (
                    <p className="text-sm mt-1">Try adjusting your filters</p>
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
          </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
