import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Calendar,
  Phone,
  TrendingUp,
  Users,
  MessageSquare,
  Star,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientDashboard() {
  const { agencyId } = useAgency();
  const { user } = useAuth();

  const { data: dashData } = trpc.analytics.getDashboard.useQuery({ agencyId });
  const { data: appointments = [] } = trpc.appointments.list.useQuery({ agencyId, limit: 5 });
  const { data: leads } = trpc.leads.list.useQuery({ agencyId, limit: 5 });
  const { data: notifs = [] } = trpc.notifications.list.useQuery({ agencyId, limit: 5 });

  const recentLeads = leads?.leads ?? [];
  const unreadNotifs = notifs.filter((n: any) => !n.isRead);

  const kpis = [
    { label: "My Leads", value: dashData?.kpis.totalLeads ?? 0, icon: <Users className="w-4 h-4" />, color: "text-blue-600", href: "/contacts" },
    { label: "Appointments", value: dashData?.kpis.totalAppointments ?? 0, icon: <Calendar className="w-4 h-4" />, color: "text-purple-600", href: "/activity" },
    { label: "Calls Made", value: dashData?.kpis.totalCalls ?? 0, icon: <Phone className="w-4 h-4" />, color: "text-orange-600", href: "/ai-calling" },
    { label: "Converted", value: dashData?.kpis.convertedLeads ?? 0, icon: <TrendingUp className="w-4 h-4" />, color: "text-green-600", href: "/contacts" },
  ];

  const STAGE_COLORS: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    contacted: "bg-yellow-100 text-yellow-700",
    qualified: "bg-purple-100 text-purple-700",
    proposal: "bg-orange-100 text-orange-700",
    negotiation: "bg-pink-100 text-pink-700",
    closed_won: "bg-green-100 text-green-700",
    closed_lost: "bg-red-100 text-red-700",
  };

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Here's what's happening with your pipeline today.</p>
          </div>
          {unreadNotifs.length > 0 && (
            <Badge className="gap-1">
              <MessageSquare className="w-3 h-3" />
              {unreadNotifs.length} unread
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(kpi => (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className={`${kpi.color} mb-2`}>{kpi.icon}</div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" /> Upcoming Appointments
                </CardTitle>
                <Link href="/activity">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {appointments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                  <p className="text-sm">No upcoming appointments</p>
                  <Link href="/activity">
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">Schedule one</Button>
                  </Link>
                </div>
              ) : (
                appointments.slice(0, 5).map((appt: any) => (
                  <div key={appt.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{appt.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(appt.startAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{appt.type}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" /> Recent Leads
                </CardTitle>
                <Link href="/contacts">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentLeads.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                  <p className="text-sm">No leads yet</p>
                </div>
              ) : (
                recentLeads.map((lead: any) => (
                  <div key={lead.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-semibold text-xs">
                      {(lead.firstName?.[0] ?? "?").toUpperCase()}{(lead.lastName?.[0] ?? "").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.firstName} {lead.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.email ?? lead.phone ?? "No contact info"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize ${STAGE_COLORS[lead.pipelineStage] ?? "bg-gray-100 text-gray-700"}`}>
                      {lead.pipelineStage?.replace("_", " ")}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Add Lead", href: "/contacts", icon: <Users className="w-4 h-4" />, color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
                { label: "Schedule Appt", href: "/activity", icon: <Calendar className="w-4 h-4" />, color: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
                { label: "Make Call", href: "/ai-calling", icon: <Phone className="w-4 h-4" />, color: "bg-orange-50 text-orange-700 hover:bg-orange-100" },
                { label: "Send Campaign", href: "/marketing", icon: <MessageSquare className="w-4 h-4" />, color: "bg-green-50 text-green-700 hover:bg-green-100" },
              ].map(action => (
                <Link key={action.label} href={action.href}>
                  <button className={`w-full flex items-center gap-2.5 p-3 rounded-xl font-medium text-sm transition-colors ${action.color}`}>
                    {action.icon}
                    {action.label}
                  </button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        {notifs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifs.slice(0, 4).map((n: any) => (
                <div key={n.id} className={`flex items-start gap-3 p-2.5 rounded-lg ${!n.isRead ? "bg-primary/5" : "hover:bg-muted/50"} transition-colors`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? "bg-primary" : "bg-muted"}`} />
                  <div>
                    <p className={`text-sm ${!n.isRead ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </CRMLayout>
  );
}
