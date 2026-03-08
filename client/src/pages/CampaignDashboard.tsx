import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Calendar, 
  Users, 
  Mail, 
  Phone, 
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  ExternalLink,
  Upload
} from "lucide-react";

export default function CampaignDashboard() {
  const [activeTab, setActiveTab] = useState("webinars");

  // Mock data - will be replaced with real tRPC queries
  const webinarStats = {
    totalRegistrations: 0,
    confirmedAttendees: 0,
    pendingReminders: 0,
    upcomingWebinars: [
      {
        id: "dpa-feb-19",
        title: "Down Payment Assistance Programs for Real Estate Agents",
        date: new Date("2026-02-19T18:00:00-08:00"),
        registrations: 0,
        status: "upcoming",
      },
    ],
  };

  const referralCampaignStats = {
    emailsSent: 0,
    emailsOpened: 0,
    linksClicked: 0,
    signups: 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Campaign Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage all marketing campaigns
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Webinar Registrations
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{webinarStats.totalRegistrations}</div>
              <p className="text-xs text-muted-foreground">
                For upcoming webinars
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Email Campaigns
              </CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referralCampaignStats.emailsSent}</div>
              <p className="text-xs text-muted-foreground">
                Sent this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Open Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {referralCampaignStats.emailsSent > 0
                  ? Math.round((referralCampaignStats.emailsOpened / referralCampaignStats.emailsSent) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Email engagement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Referral Signups
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referralCampaignStats.signups}</div>
              <p className="text-xs text-muted-foreground">
                From datacrawl offer
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="webinars">Webinars</TabsTrigger>
            <TabsTrigger value="referral">Referral Campaign</TabsTrigger>
            <TabsTrigger value="facebook">Facebook Ads</TabsTrigger>
          </TabsList>

          {/* Webinars Tab */}
          <TabsContent value="webinars" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Webinars</CardTitle>
                <CardDescription>
                  Manage webinar registrations and send reminders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {webinarStats.upcomingWebinars.map((webinar) => (
                  <div key={webinar.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{webinar.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{webinar.date.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{webinar.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{webinar.registrations} registered</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={webinar.status === "upcoming" ? "default" : "secondary"}>
                        {webinar.status}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export Registrations
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="w-4 h-4 mr-2" />
                        Send Reminder
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href="/webinar/dpa" target="_blank">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Registration Page
                        </a>
                      </Button>
                    </div>

                    {webinar.registrations === 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          <strong>No registrations yet.</strong> Share the registration link to start collecting signups.
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="text-xs bg-white px-2 py-1 rounded border">
                            {window.location.origin}/webinar/dpa
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/webinar/dpa`);
                            }}
                          >
                            Copy Link
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webinar Registrations</CardTitle>
                <CardDescription>
                  All registrants for upcoming webinars
                </CardDescription>
              </CardHeader>
              <CardContent>
                {webinarStats.totalRegistrations === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No registrations yet</p>
                    <p className="text-sm">Registrations will appear here once people sign up</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Will be populated with real data */}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referral Campaign Tab */}
          <TabsContent value="referral" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Referral Partnership Campaign</CardTitle>
                <CardDescription>
                  Free datacrawl offer for real estate agents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{referralCampaignStats.emailsSent}</div>
                    <div className="text-sm text-gray-600">Emails Sent</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{referralCampaignStats.emailsOpened}</div>
                    <div className="text-sm text-gray-600">Opened</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{referralCampaignStats.linksClicked}</div>
                    <div className="text-sm text-gray-600">Clicked</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{referralCampaignStats.signups}</div>
                    <div className="text-sm text-gray-600">Signups</div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Ready to launch:</strong> Import your Model Match real estate agent leads and send the datacrawl offer campaign.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Leads
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Campaign
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Facebook Ads Tab */}
          <TabsContent value="facebook" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Facebook Ad Campaigns</CardTitle>
                <CardDescription>
                  DPA webinar promotion and lead generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-900 mb-3">
                    <strong>Facebook Ad Copy Ready:</strong> Use the HeyGen video script and ad copy from the campaign assets folder.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>HeyGen video script created (45 seconds)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Facebook ad headline and description ready</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Targeting: Real estate agents, nationwide (49 states)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
