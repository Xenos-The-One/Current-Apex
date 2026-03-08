import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Phone, Clock, Calendar, ExternalLink, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/DashboardLayout";

export default function CallReview() {
  const { data, isLoading } = trpc.vapiCalls.getLeadsWithCallStatus.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  const leads = data?.leads || [];
  const leadsWithCalls = leads.filter(l => l.callCount > 0);
  const leadsNoCalls = leads.filter(l => l.callCount === 0);
  const leadsWithAppointments = leads.filter(l => l.appointmentBookedAt);
  const leadsNoAppointments = leads.filter(l => !l.appointmentBookedAt && l.callCount > 0);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Call Review Dashboard</h1>
        <p className="text-muted-foreground">
          Review Vapi call recordings and analyze conversion performance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Calls Made</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsWithCalls.length}</div>
            <p className="text-xs text-muted-foreground">
              {leadsNoCalls.length} not called yet
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Appointments Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsWithAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {leadsWithCalls.length > 0 
                ? `${Math.round((leadsWithAppointments.length / leadsWithCalls.length) * 100)}% conversion`
                : '0% conversion'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600">Leaked Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{leadsNoAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              Called but no appointment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leaked Leads Section */}
      {leadsNoAppointments.length > 0 && (
        <Card className="mb-8 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Leaked Leads - Needs Review</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              These leads were called by Vapi but didn't book an appointment. Review recordings to identify issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadsNoAppointments.map((lead) => (
                <div key={lead.id} className="bg-white p-4 rounded-lg border border-orange-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {lead.firstName} {lead.lastName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                        <Badge variant="outline">{lead.source}</Badge>
                        <Badge variant="secondary">{lead.status}</Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                      <div className="mt-1">
                        {lead.callCount} call{lead.callCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {lead.lastCall && (
                    <div className="bg-gray-50 p-3 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Last Call</span>
                        {lead.lastCall.callDuration && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.floor(lead.lastCall.callDuration / 60)}m {lead.lastCall.callDuration % 60}s
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {lead.lastCall.description}
                      </p>
                      {lead.lastCall.callRecordingUrl ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <a href={lead.lastCall.callRecordingUrl} target="_blank" rel="noopener noreferrer">
                              <Play className="h-4 w-4 mr-2" />
                              Listen to Recording
                            </a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={`https://dashboard.vapi.ai/call/${lead.lastCall.vapiCallId}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View in Vapi
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-orange-600">No recording available</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Leads with Calls */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads with Call History</CardTitle>
          <CardDescription>
            Complete list of leads and their Vapi call status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">
                      {lead.firstName} {lead.lastName}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </span>
                      <Badge variant="outline">{lead.source}</Badge>
                      <Badge variant="secondary">{lead.status}</Badge>
                      {lead.appointmentBookedAt && (
                        <Badge variant="default" className="bg-green-600">Appointment Booked</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </div>
                    <div className="mt-1">
                      {lead.callCount} call{lead.callCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {lead.lastCall && lead.lastCall.callRecordingUrl && (
                  <div className="mt-3">
                    <Button size="sm" variant="outline" asChild>
                      <a href={lead.lastCall.callRecordingUrl} target="_blank" rel="noopener noreferrer">
                        <Play className="h-4 w-4 mr-2" />
                        Listen to Last Call
                      </a>
                    </Button>
                  </div>
                )}

                {lead.callCount === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">No calls made yet</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
