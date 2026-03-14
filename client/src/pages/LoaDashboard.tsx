import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  Phone, 
  Mail,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Upload,
  Eye,
  UserCheck,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function LoaDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: assignment, isLoading: assignmentLoading } = trpc.loa.getMyAssignment.useQuery(undefined, {
    retry: false,
    enabled: !!user && user.role === "loa",
  });
  const { data: leads, isLoading: leadsLoading } = trpc.loa.listLeads.useQuery({}, {
    enabled: !!assignment,
    retry: false,
  });

  if (authLoading || assignmentLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>Please sign in to access your LOA dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <a href={getLoginUrl()}>
              <Button className="w-full">Sign In</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assignment) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle>No Assignment Found</CardTitle>
            <CardDescription>
              You haven't been assigned to a Loan Officer yet. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  const allLeads = leads || [];
  const newLeads = allLeads.filter(l => l.status === "new");
  const contactedLeads = allLeads.filter(l => l.status === "contacted" || l.status === "qualified");
  const appointmentLeads = allLeads.filter(l => l.status === "appointment_set");
  const closedWon = allLeads.filter(l => l.status === "closed_won");
  const hotLeads = allLeads.filter(l => l.scoreTier === "hot");

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    contacted: "bg-yellow-100 text-yellow-800",
    qualified: "bg-purple-100 text-purple-800",
    appointment_set: "bg-green-100 text-green-800",
    appointment_completed: "bg-emerald-100 text-emerald-800",
    closed_won: "bg-green-200 text-green-900",
    closed_lost: "bg-red-100 text-red-800",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">LOA Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              <UserCheck className="w-4 h-4 inline mr-1" />
              Assisting as Loan Officer Assistant
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/leads/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </Link>
            <Link href="/leads/import">
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import Leads
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{allLeads.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Total Leads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{newLeads.length}</div>
                <p className="text-sm text-muted-foreground mt-1">New Leads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{hotLeads.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Hot Leads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{appointmentLeads.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Appointments Set</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{closedWon.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Closed Won</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Leads</CardTitle>
                <CardDescription>Latest leads in the pipeline</CardDescription>
              </div>
              <Link href="/leads">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {allLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No leads yet. Add your first lead to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allLeads.slice(0, 10).map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {lead.firstName[0]}{lead.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {lead.phone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {lead.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.scoreTier === "hot" && (
                          <Badge variant="destructive" className="text-xs">HOT</Badge>
                        )}
                        <Badge className={statusColors[lead.status] || "bg-gray-100 text-gray-800"}>
                          {lead.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3">
          <Link href="/appointments">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Appointments</p>
                    <p className="text-sm text-muted-foreground">View & manage bookings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/analytics">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Analytics</p>
                    <p className="text-sm text-muted-foreground">Campaign performance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/notifications">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Notifications</p>
                    <p className="text-sm text-muted-foreground">Alerts & updates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
