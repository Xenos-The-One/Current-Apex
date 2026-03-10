import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Send, Clock, CheckCircle2, XCircle, AlertCircle, Repeat2 } from "lucide-react";
import { useState as useStateExtra } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import DashboardLayout from "@/components/DashboardLayout";
export default function SMSCampaigns() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);

  // Get client ID from URL or context
  const clientId = 1; // TODO: Get from URL params or context

  const { data: campaigns, isLoading } = trpc.campaignsOld.listSMSCampaigns.useQuery({ clientId });
  const { data: demoStatus } = trpc.campaignsOld.getDemoStatus.useQuery();
  const createCampaign = trpc.campaignsOld.createSMSCampaign.useMutation({
    onSuccess: () => {
      toast.success("SMS campaign created successfully");
      setShowForm(false);
      setFormData({
        name: "",
        message: "",
        recipientFilter: "all",
        recipientStatus: "",
        sendNow: false,
        scheduleFor: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create campaign");
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    message: "",
    recipientFilter: "all" as "all" | "status" | "custom",
    recipientStatus: "",
    sendNow: false,
    scheduleFor: "", // datetime-local string
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.message.length > 1600) {
      toast.error("Message is too long (max 1600 characters)");
      return;
    }

    createCampaign.mutate({
      clientId,
      name: formData.name,
      message: formData.message,
      recipientFilter: formData.recipientFilter,
      recipientStatus: formData.recipientStatus || undefined,
      sendNow: formData.sendNow,
      scheduledDate: formData.scheduleFor ? new Date(formData.scheduleFor) : undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Sent</Badge>;
      case "sending":
        return <Badge className="bg-blue-600"><Send className="w-3 h-3 mr-1" />Sending</Badge>;
      case "scheduled":
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const characterCount = formData.message.length;
  const characterLimit = 1600;
  const isOverLimit = characterCount > characterLimit;

  if (isLoading) {
    return (
      <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </DashboardLayout>
  );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Campaigns</h1>
          <p className="text-muted-foreground mt-1">Create and manage SMS campaigns for your leads</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "New Campaign"}
        </Button>
      </div>

      {demoStatus?.smsDemoMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> Twilio credentials not configured. Campaigns will be simulated but not actually sent.
            Configure your Twilio credentials in the environment settings to enable real SMS sending.
          </AlertDescription>
        </Alert>
      )}

      {!demoStatus?.smsDemoMode && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Live Mode:</strong> Twilio is configured. SMS messages will be sent for real.
          </AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create SMS Campaign</CardTitle>
            <CardDescription>Design and send an SMS campaign to your leads</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Follow-up SMS Campaign"
                />
              </div>

              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Hi {name}, thanks for your interest! Let's schedule a time to discuss your loan options..."
                  rows={6}
                  className={isOverLimit ? "border-destructive" : ""}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">
                    Use {"{name}"} to personalize with lead's name
                  </p>
                  <p className={`text-xs ${isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {characterCount} / {characterLimit}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="recipientFilter">Recipients</Label>
                <Select
                  value={formData.recipientFilter}
                  onValueChange={(value: any) => setFormData({ ...formData, recipientFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leads</SelectItem>
                    <SelectItem value="status">Filter by Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recipientFilter === "status" && (
                <div>
                  <Label htmlFor="recipientStatus">Lead Status</Label>
                  <Select
                    value={formData.recipientStatus}
                    onValueChange={(value) => setFormData({ ...formData, recipientStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="appointment_set">Appointment Set</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3 pt-4 border-t">
                <div>
                  <Label htmlFor="scheduleFor" className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Schedule for Later (optional)
                  </Label>
                  <Input
                    id="scheduleFor"
                    type="datetime-local"
                    value={formData.scheduleFor}
                    onChange={e => setFormData({ ...formData, scheduleFor: e.target.value, sendNow: false })}
                    min={new Date().toISOString().slice(0, 16)}
                    className="mt-1"
                  />
                  {formData.scheduleFor && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Campaign will be sent at {new Date(formData.scheduleFor).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={createCampaign.isPending || isOverLimit}>
                    {createCampaign.isPending ? "Creating..." : formData.scheduleFor ? "Schedule Campaign" : "Save as Draft"}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={createCampaign.isPending || isOverLimit}
                    onClick={() => {
                      setFormData({ ...formData, sendNow: true, scheduleFor: "" });
                      setTimeout(() => handleSubmit(new Event("submit") as any), 100);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Now
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Campaign History</CardTitle>
          <CardDescription>View and manage your SMS campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns && campaigns.length > 0 ? (
            <div className="space-y-3">
              {campaigns.map((campaign: any) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{campaign.message}</p>
                    {campaign.sentDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Sent: {new Date(campaign.sentDate).toLocaleString()}
                      </p>
                    )}
                    {campaign.sentCount !== null && campaign.sentCount > 0 && (
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-green-600">✓ {campaign.sentCount} sent</span>
                        {campaign.failedCount !== null && campaign.failedCount > 0 && (
                          <span className="text-destructive">✗ {campaign.failedCount} failed</span>
                        )}
                        {campaign.deliveredCount !== null && campaign.deliveredCount > 0 && (
                          <span className="text-muted-foreground">{campaign.deliveredCount} delivered</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No campaigns yet</p>
              <p className="text-sm mt-1">Create your first SMS campaign to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Repurposing Panel */}
      <SmsRepurposingPanel />
    </div>
    </DashboardLayout>
  );
}

function SmsRepurposingPanel() {
  const [selectedContentId, setSelectedContentId] = useStateExtra<number | null>(null);
  const { data: recentContent } = trpc.seoBridge.getRecentApprovedContent.useQuery({ limit: 5 });
  const repurpose = trpc.seoBridge.repurposeToSms.useMutation({
    onSuccess: (data) => {
      toast.success("SMS copy generated! Copy it into a new campaign above.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Repeat2 className="w-5 h-5" />
          Repurpose SEO Content → SMS
        </CardTitle>
        <CardDescription>
          Turn approved blog posts into SMS campaign copy with one click.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recentContent && recentContent.length > 0 ? (
          <div className="space-y-2">
            {recentContent.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm truncate max-w-xs">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.clientName}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-700 border-green-300"
                  disabled={repurpose.isPending && selectedContentId === c.id}
                  onClick={() => { setSelectedContentId(c.id); repurpose.mutate({ contentId: c.id, channel: 'sms' }); }}
                >
                  {repurpose.isPending && selectedContentId === c.id ? "Generating..." : "→ SMS"}
                </Button>
              </div>
            ))}
            {repurpose.data && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-700 mb-1">Generated SMS Copy:</p>
                <p className="text-sm">{repurpose.data.smsText}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => navigator.clipboard.writeText(repurpose.data!.smsText)}>
                  Copy to Clipboard
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No approved SEO content yet. <a href="/seo/content" className="underline text-green-600">Create content in the SEO portal</a> first.</p>
        )}
      </CardContent>
    </Card>
  );
}
