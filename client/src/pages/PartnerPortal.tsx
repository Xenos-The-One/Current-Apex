import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Home,
  ArrowRight,
  Handshake,
  BarChart3,
  Shield,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Received": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "In Review": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Qualified": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Consultation Scheduled": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Consultation Complete": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  "Closed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Not Proceeding": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function PartnerPortal() {
  const [location] = useLocation();
  const token = new URLSearchParams(location.split("?")[1] || "").get("token") || "";

  const { data, isLoading, error } = trpc.publicFeatures.getPartnerPortal.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 border-white/20 text-white text-center">
          <CardContent className="pt-10 pb-8">
            <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Required</h2>
            <p className="text-indigo-200 text-sm">Please use the link provided by your loan officer to access this portal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="h-10 w-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-indigo-200">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 border-white/20 text-white text-center">
          <CardContent className="pt-10 pb-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
            <p className="text-indigo-200 text-sm">This portal link is invalid or has expired. Please contact your loan officer for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { partner, stats, leads } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Handshake className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Partner Portal</p>
              <p className="text-indigo-300 text-xs">Referral Tracking Dashboard</p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
            Secure Access
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Welcome back, {partner.firstName} {partner.lastName}
          </h1>
          <p className="text-indigo-300 text-sm">
            {partner.company && <span>{partner.company} · </span>}
            <span className="capitalize">{partner.partnerType?.replace("_", " ")}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: "Total Referrals", value: stats.totalReferrals, icon: Users, color: "text-blue-400" },
            { label: "Active Leads", value: stats.activeLeads, icon: Clock, color: "text-amber-400" },
            { label: "Consultations", value: stats.appointmentsSet, icon: Calendar, color: "text-indigo-400" },
            { label: "Closed Loans", value: stats.closedWon, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "text-purple-400" },
            {
              label: "Total Volume",
              value: stats.totalVolume > 0 ? `$${(stats.totalVolume / 1000000).toFixed(1)}M` : "$0",
              icon: DollarSign,
              color: "text-teal-400"
            },
          ].map(stat => (
            <Card key={stat.label} className="bg-white/10 border-white/20">
              <CardContent className="pt-4 pb-3 text-center">
                <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-indigo-300">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Funnel visualization */}
        {stats.totalReferrals > 0 && (
          <Card className="bg-white/10 border-white/20 mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-400" />
                Your Referral Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-20">
                {[
                  { label: "Referred", value: stats.totalReferrals, color: "bg-blue-500" },
                  { label: "Active", value: stats.activeLeads, color: "bg-amber-500" },
                  { label: "Consultations", value: stats.appointmentsSet, color: "bg-indigo-500" },
                  { label: "Closed", value: stats.closedWon, color: "bg-emerald-500" },
                ].map(bar => {
                  const height = stats.totalReferrals > 0 ? Math.max(8, (bar.value / stats.totalReferrals) * 80) : 8;
                  return (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-white font-bold">{bar.value}</span>
                      <div
                        className={`w-full rounded-t-md ${bar.color} transition-all`}
                        style={{ height: `${height}px` }}
                      />
                      <span className="text-[10px] text-indigo-300 text-center">{bar.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leads table */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              Referred Clients ({leads.length})
            </CardTitle>
            <CardDescription className="text-indigo-300 text-xs">
              Client names are partially shown for privacy. Status updates in real time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-10 text-indigo-300">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No referrals yet. Share your loan officer's booking link to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-300">{lead.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{lead.name}</p>
                        <p className="text-xs text-indigo-400">
                          Referred {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {lead.loanType && (
                        <span className="text-xs text-indigo-300 hidden sm:block capitalize">
                          {lead.loanType.replace("_", " ")}
                        </span>
                      )}
                      <Badge className={`text-xs ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-700"}`}>
                        {lead.status}
                      </Badge>
                      {lead.appointmentDate && (
                        <div className="flex items-center gap-1 text-xs text-indigo-300 hidden md:flex">
                          <Calendar className="h-3 w-3" />
                          {new Date(lead.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-indigo-400 text-xs mt-8">
          Powered by Indigo Labs AI · This portal is private and secure
        </p>
      </div>
    </div>
  );
}
