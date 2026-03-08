import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Users, Phone, Mail, Search, Download, TrendingUp, Flame, Zap, Snowflake } from "lucide-react";
import { Link } from "wouter";

import DashboardLayout from "@/components/DashboardLayout";
export default function AdminLeads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("score"); // Default sort by score
  
  // For admin view, we query leads by agency ID
  const { data: leads, isLoading } = trpc.leads.list.useQuery({
    agencyId: 1, // Premier Mortgage Resources
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    leadSource: sourceFilter !== "all" ? sourceFilter : undefined,
  });

  // Sort and filter leads
  let sortedLeads = leads ? [...leads] : [];
  
  // Sort by score (hottest first) or other criteria
  if (sortBy === "score") {
    sortedLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
  } else if (sortBy === "recent") {
    sortedLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  const filteredLeads = sortedLeads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.firstName.toLowerCase().includes(query) ||
      lead.lastName.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-green-500 text-white";
      case "contacted":
        return "bg-blue-500 text-white";
      case "qualified":
        return "bg-purple-500 text-white";
      case "appointment_set":
        return "bg-orange-500 text-white";
      case "appointment_completed":
        return "bg-indigo-500 text-white";
      case "closed_won":
        return "bg-emerald-600 text-white";
      case "closed_lost":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getSourceBadgeColor = (source: string) => {
    if (source?.includes("Facebook")) return "bg-blue-600 text-white";
    if (source?.includes("Instagram")) return "bg-pink-600 text-white";
    if (source?.includes("Referral")) return "bg-purple-600 text-white";
    return "bg-gray-600 text-white";
  };

  const getScoreTierBadge = (tier: string, score: number) => {
    switch (tier) {
      case "hot":
        return (
          <Badge className="bg-red-500 text-white flex items-center gap-1">
            <Flame className="w-3 h-3" />
            Hot ({score})
          </Badge>
        );
      case "warm":
        return (
          <Badge className="bg-yellow-500 text-white flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Warm ({score})
          </Badge>
        );
      case "cold":
        return (
          <Badge className="bg-blue-500 text-white flex items-center gap-1">
            <Snowflake className="w-3 h-3" />
            Cold ({score})
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const stats = {
    total: leads?.length || 0,
    new: leads?.filter(l => l.status === "new").length || 0,
    contacted: leads?.filter(l => l.status === "contacted").length || 0,
    qualified: leads?.filter(l => l.status === "qualified").length || 0,
    appointments: leads?.filter(l => l.status === "appointment_set" || l.status === "appointment_completed").length || 0,
    closed: leads?.filter(l => l.status === "closed_won").length || 0,
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">All Leads (Admin View)</h1>
            <p className="text-muted-foreground mt-2">
              View and manage all leads across Premier Mortgage Resources
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.new}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contacted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.contacted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.qualified}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.appointments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Closed Won</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.closed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="appointment_set">Appointment Set</SelectItem>
                  <SelectItem value="appointment_completed">Appointment Completed</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="Facebook Ad">Facebook Ad</SelectItem>
                  <SelectItem value="Instagram Ad">Instagram Ad</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">🔥 Hottest First</SelectItem>
                  <SelectItem value="recent">🕐 Most Recent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leads ({filteredLeads?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
            ) : filteredLeads && filteredLeads.length > 0 ? (
              <div className="space-y-4">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {lead.firstName} {lead.lastName}
                          </h3>
                          {getScoreTierBadge(lead.scoreTier || 'cold', lead.score || 0)}
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                          {lead.source && (
                            <Badge variant="outline" className={getSourceBadgeColor(lead.source)}>
                              {lead.source}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-sm text-muted-foreground">
                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                          <div className="text-xs">
                            Created: {new Date(lead.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {lead.notes && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-100 rounded p-2">
                            {lead.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <Link href={`/leads/${lead.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No leads found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" || sourceFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Leads will appear here once they're captured from your campaigns"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
}
