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
import { Mail, Send, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import DashboardLayout from "@/components/DashboardLayout";
export default function EmailCampaigns() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);

  // Get client ID from URL or context
  const clientId = 1; // TODO: Get from URL params or context

  const { data: campaigns, isLoading } = trpc.campaignsOld.listEmailCampaigns.useQuery({ clientId });
  const { data: demoStatus } = trpc.campaignsOld.getDemoStatus.useQuery();
  const createCampaign = trpc.campaignsOld.createEmailCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign created successfully");
      setShowForm(false);
      setFormData({
        name: "",
        subject: "",
        htmlContent: "",
        textContent: "",
        recipientFilter: "all",
        recipientStatus: "",
        sendNow: false,
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create campaign");
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    textContent: "",
    recipientFilter: "all" as "all" | "status" | "custom",
    recipientStatus: "",
    sendNow: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.subject) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.htmlContent && !formData.textContent) {
      toast.error("Please provide either HTML or text content");
      return;
    }

    createCampaign.mutate({
      clientId,
      name: formData.name,
      subject: formData.subject,
      htmlContent: formData.htmlContent || undefined,
      textContent: formData.textContent || undefined,
      recipientFilter: formData.recipientFilter,
      recipientStatus: formData.recipientStatus || undefined,
      sendNow: formData.sendNow,
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
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground mt-1">Create and manage email campaigns for your leads</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Mail className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "New Campaign"}
        </Button>
      </div>

      {demoStatus?.emailDemoMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> SendGrid API key not configured. Campaigns will be simulated but not actually sent.
            Configure your SendGrid API key in the environment settings to enable real email sending.
          </AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Email Campaign</CardTitle>
            <CardDescription>Design and send an email campaign to your leads</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Monthly Newsletter"
                />
              </div>

              <div>
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Your Monthly Update"
                />
              </div>

              <div>
                <Label htmlFor="htmlContent">HTML Content</Label>
                <Textarea
                  id="htmlContent"
                  value={formData.htmlContent}
                  onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                  placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="textContent">Plain Text Content</Label>
                <Textarea
                  id="textContent"
                  value={formData.textContent}
                  onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                  placeholder="Plain text version of your email..."
                  rows={4}
                />
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

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button type="submit" disabled={createCampaign.isPending}>
                  {createCampaign.isPending ? "Creating..." : "Save as Draft"}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={createCampaign.isPending}
                  onClick={() => {
                    setFormData({ ...formData, sendNow: true });
                    setTimeout(() => handleSubmit(new Event("submit") as any), 100);
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Campaign History</CardTitle>
          <CardDescription>View and manage your email campaigns</CardDescription>
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
                    <p className="text-sm text-muted-foreground">Subject: {campaign.subject}</p>
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
                        {campaign.openCount !== null && campaign.openCount > 0 && (
                          <span className="text-muted-foreground">{campaign.openCount} opened</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No campaigns yet</p>
              <p className="text-sm mt-1">Create your first email campaign to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* SEO Repurposing Panel */}
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
          <RefreshCw className="w-5 h-5" />
          Repurpose SEO Content into Email Campaigns
        </CardTitle>
        <CardDescription>
          One-click convert an approved blog post into a ready-to-send email sequence.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SeoRepurposeEmail />
      </CardContent>
    </Card>
    </DashboardLayout>
  );
}

function SeoRepurposeEmail() {
  const [contentId, setContentId] = useState("");
  const [repurposeType, setRepurposeType] = useState<"email_newsletter" | "email_sequence" | "social_posts">("email_newsletter");
  const [result, setResult] = useState<{ title: string; content: string } | null>(null);

  const repurpose = trpc.seoBridge.repurposeForCampaign.useMutation({
    onSuccess: (data) => { setResult(data); toast.success("Content repurposed!"); },
    onError: (err) => toast.error(err.message),
  });

  const { data: recentContent } = trpc.seo.content.list.useQuery({ page: 1, limit: 10, status: "approved" });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Source SEO Content</Label>
          <Select value={contentId} onValueChange={setContentId}>
            <SelectTrigger><SelectValue placeholder="Select approved content" /></SelectTrigger>
            <SelectContent>
              {(recentContent?.content || []).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium">Repurpose As</Label>
          <Select value={repurposeType} onValueChange={(v: any) => setRepurposeType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email_newsletter">Email Newsletter</SelectItem>
              <SelectItem value="email_sequence">Email Drip Sequence</SelectItem>
              <SelectItem value="social_posts">Social Media Posts</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          disabled={!contentId || repurpose.isPending}
          onClick={() => repurpose.mutate({ contentId: parseInt(contentId), repurposeType })}
        >
          {repurpose.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Repurposing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Repurpose with AI</>}
        </Button>
      </div>
      {result ? (
        <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg space-y-2">
          <p className="font-semibold text-sm">{result.title}</p>
          <div className="text-xs text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-line">{result.content.substring(0, 500)}...</div>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(result.content); toast.success("Copied to clipboard!"); }}>
            <Mail className="w-3 h-3 mr-1" /> Copy to New Campaign
          </Button>
        </div>
      ) : (
        <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg text-sm text-muted-foreground">
          Select an approved SEO article and click "Repurpose with AI" to instantly generate email-ready content from it.
        </div>
      )}
    </div>
  );
}
