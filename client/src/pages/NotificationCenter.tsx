import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Bell, Mail, MessageSquare, Smartphone, Info,
  CheckCircle2, XCircle, Ban, RefreshCw, Send,
  FlaskConical, ChevronLeft, ChevronRight, Play, Loader2
} from "lucide-react";

const CAMPAIGN_TYPES = [
  { value: "new_lead_welcome", label: "New Lead Welcome" },
  { value: "appointment_confirmation", label: "Appointment Confirmation" },
  { value: "appointment_reminder_24h", label: "Appointment Reminder (24h)" },
  { value: "appointment_reminder_2h", label: "Appointment Reminder (2h)" },
  { value: "post_appointment_followup", label: "Post-Appointment Follow-up" },
  { value: "webinar_confirmation", label: "Webinar Confirmation" },
  { value: "webinar_reminder_24h", label: "Webinar Reminder (24h)" },
  { value: "webinar_reminder_1h", label: "Webinar Reminder (1h)" },
  { value: "webinar_last_chance", label: "Webinar Last Chance" },
  { value: "sales_followup_day1", label: "Sales Follow-up Day 1" },
  { value: "sales_followup_day3", label: "Sales Follow-up Day 3" },
  { value: "sales_followup_day7", label: "Sales Follow-up Day 7" },
  { value: "birthday_notification", label: "Birthday Notification" },
  { value: "anniversary_6month", label: "6-Month Anniversary" },
  { value: "anniversary_1year", label: "1-Year Anniversary" },
  { value: "rank_alert", label: "Rank Alert" },
  { value: "seo_audit_report", label: "SEO Audit Report" },
];

function channelIcon(channel: string) {
  switch (channel) {
    case "email": return <Mail className="w-3.5 h-3.5" />;
    case "sms": return <MessageSquare className="w-3.5 h-3.5" />;
    case "push": return <Smartphone className="w-3.5 h-3.5" />;
    default: return <Info className="w-3.5 h-3.5" />;
  }
}

function statusBadge(status: string, suppressed: boolean) {
  if (suppressed || status === "suppressed") {
    return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 gap-1"><Ban className="w-3 h-3" />Suppressed</Badge>;
  }
  if (status === "sent") {
    return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 gap-1"><CheckCircle2 className="w-3 h-3" />Sent</Badge>;
  }
  return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
}

function channelBadge(channel: string) {
  const colors: Record<string, string> = {
    email: "bg-blue-50 text-blue-700 border-blue-200",
    sms: "bg-purple-50 text-purple-700 border-purple-200",
    push: "bg-amber-50 text-amber-700 border-amber-200",
    in_app: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <Badge variant="outline" className={`gap-1 ${colors[channel] ?? ""}`}>
      {channelIcon(channel)}
      {channel.toUpperCase()}
    </Badge>
  );
}

type RunAllSummary = {
  results: Array<{ campaignType: string; success: boolean; error?: string }>;
  sent: number;
  failed: number;
  total: number;
  sentTo: string;
};

export default function NotificationCenter() {
  // Filters
  const [channel, setChannel] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Test campaign modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testCampaignType, setTestCampaignType] = useState("new_lead_welcome");
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("Test Lead");

  // Run All results
  const [runAllSummary, setRunAllSummary] = useState<RunAllSummary | null>(null);

  // Selected log for detail view
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: stats, refetch: refetchStats } = trpc.notificationCenter.getNotificationStats.useQuery();
  const { data: logsData, isLoading, refetch: refetchLogs } = trpc.notificationCenter.getNotificationLogs.useQuery({
    page,
    limit: 50,
    channel: channel as any,
    status: status as any,
  });

  const sendTestCampaign = trpc.notificationCenter.sendTestCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(`Test email sent to ${data.sentTo}`);
      setShowTestModal(false);
      refetchLogs();
      refetchStats();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const sendAllTestCampaigns = trpc.notificationCenter.sendAllTestCampaigns.useMutation({
    onSuccess: (data) => {
      setRunAllSummary(data);
      refetchLogs();
      refetchStats();
      if (data.failed === 0) {
        toast.success(`All ${data.total} campaigns sent successfully to ${data.sentTo}!`);
      } else {
        toast.warning(`${data.sent} sent, ${data.failed} failed. Check results below.`);
      }
    },
    onError: (err) => {
      toast.error(`Run All failed: ${err.message}`);
    },
  });

  const logs = logsData?.logs ?? [];
  const totalPages = logsData?.totalPages ?? 1;

  function handleRefresh() {
    refetchLogs();
    refetchStats();
    toast.success("Notification feed updated");
  }

  function handleCloseModal() {
    if (!sendAllTestCampaigns.isPending && !sendTestCampaign.isPending) {
      setShowTestModal(false);
      setRunAllSummary(null);
    }
  }

  const runAllProgress = runAllSummary
    ? Math.round(((runAllSummary.sent + runAllSummary.failed) / runAllSummary.total) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Notification Center
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Live feed of all outbound notifications — real campaigns and suppressed test events
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowTestModal(true)}>
              <FlaskConical className="w-4 h-4 mr-1" />
              Test Campaigns
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-foreground" },
              { label: "Sent", value: stats.sent, color: "text-green-600" },
              { label: "Failed", value: stats.failed, color: "text-red-600" },
              { label: "Suppressed", value: stats.suppressed, color: "text-orange-600" },
              { label: "Emails", value: stats.emails, color: "text-blue-600" },
              { label: "SMS", value: stats.sms, color: "text-purple-600" },
              { label: "Push", value: stats.push, color: "text-amber-600" },
            ].map((s) => (
              <Card key={s.label} className="text-center py-3">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={(v) => { setChannel(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="suppressed">Suppressed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Log Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Notification Log
              {logsData && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  ({logsData.total} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No notifications yet.</p>
                <p className="text-xs mt-1">Notifications will appear here as campaigns fire.</p>
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {channelBadge(log.channel)}
                          {statusBadge(log.status, log.suppressed)}
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                            {log.type}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1 truncate">
                          {log.subject ?? "(no subject)"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          To: {log.recipient}
                          {log.suppressionReason && (
                            <span className="ml-2 text-orange-500">
                              · Suppressed: {log.suppressionReason}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && channelBadge(selectedLog.channel)}
              {selectedLog?.subject ?? "(no subject)"}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Type:</span> <code className="bg-muted px-1 rounded text-xs">{selectedLog.type}</code></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedLog.status, selectedLog.suppressed)}</div>
                <div><span className="text-muted-foreground">Recipient:</span> {selectedLog.recipient}</div>
                <div><span className="text-muted-foreground">Time:</span> {new Date(selectedLog.createdAt).toLocaleString()}</div>
                {selectedLog.leadId && <div><span className="text-muted-foreground">Lead ID:</span> {selectedLog.leadId}</div>}
                {selectedLog.suppressionReason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Suppression Reason:</span>{" "}
                    <span className="text-orange-600">{selectedLog.suppressionReason}</span>
                  </div>
                )}
              </div>
              {selectedLog.body && (
                <div>
                  <p className="text-muted-foreground mb-1 font-medium">Message Preview:</p>
                  <div className="bg-muted rounded p-3 text-xs whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {selectedLog.body}
                  </div>
                </div>
              )}
              {selectedLog.metadata && (
                <div>
                  <p className="text-muted-foreground mb-1 font-medium">Metadata:</p>
                  <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Campaign Modal */}
      <Dialog open={showTestModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Campaign Test Runner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview exactly what a lead receives at each campaign touchpoint. Emails are sent with a <strong>[TEST]</strong> prefix and logged to the feed automatically.
            </p>

            {/* Email + Name inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Test Email Address</Label>
                <Input
                  type="email"
                  placeholder="tariqhaskins@indigolabsai.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={sendAllTestCampaigns.isPending}
                />
              </div>
              <div className="space-y-1">
                <Label>Test Lead Name</Label>
                <Input
                  placeholder="Test Lead"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  disabled={sendAllTestCampaigns.isPending}
                />
              </div>
            </div>

            {/* Single campaign selector — hidden while run-all is active or done */}
            {!sendAllTestCampaigns.isPending && !runAllSummary && (
              <div className="space-y-1">
                <Label>Send Single Campaign</Label>
                <Select value={testCampaignType} onValueChange={setTestCampaignType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Run All in-progress spinner */}
            {sendAllTestCampaigns.isPending && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Sending all 17 campaigns...</p>
                  <p className="text-xs text-blue-600 mt-0.5">This may take 10–20 seconds. Please wait.</p>
                </div>
              </div>
            )}

            {/* Run All results summary */}
            {runAllSummary && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1.5 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Run complete — {runAllSummary.sent}/{runAllSummary.total} sent
                    {runAllSummary.failed > 0 && (
                      <span className="text-red-600 ml-1">({runAllSummary.failed} failed)</span>
                    )}
                  </span>
                </div>
                <Progress value={runAllProgress} className="h-2" />
                <div className="max-h-52 overflow-y-auto space-y-1 rounded border bg-muted/30 p-2">
                  {runAllSummary.results.map((r) => (
                    <div key={r.campaignType} className="flex items-center justify-between text-xs px-1 py-0.5 rounded hover:bg-muted/50">
                      <span className="truncate">
                        {CAMPAIGN_TYPES.find((ct) => ct.value === r.campaignType)?.label ?? r.campaignType}
                      </span>
                      <span className="ml-2 shrink-0">
                        {r.success
                          ? <CheckCircle2 className="w-3 h-3 text-green-500" />
                          : (
                            <span className="text-red-500 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              {r.error && <span className="max-w-[120px] truncate">{r.error}</span>}
                            </span>
                          )
                        }
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  All sent emails are now visible in the Notification Log above.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleCloseModal}
              disabled={sendAllTestCampaigns.isPending || sendTestCampaign.isPending}
            >
              {runAllSummary ? "Close" : "Cancel"}
            </Button>

            {/* Run All button */}
            {!sendAllTestCampaigns.isPending && !runAllSummary && (
              <Button
                variant="outline"
                disabled={!testEmail}
                onClick={() => {
                  if (!testEmail) { toast.error("Enter a test email first"); return; }
                  sendAllTestCampaigns.mutate({ testEmail, testName });
                }}
              >
                <Play className="w-4 h-4 mr-1" />
                Run All 17
              </Button>
            )}

            {/* Run Again after summary */}
            {runAllSummary && !sendAllTestCampaigns.isPending && (
              <Button
                variant="outline"
                onClick={() => {
                  setRunAllSummary(null);
                }}
              >
                Run Again
              </Button>
            )}

            {/* Single send — only when not running all */}
            {!sendAllTestCampaigns.isPending && !runAllSummary && (
              <Button
                disabled={!testEmail || sendTestCampaign.isPending}
                onClick={() => {
                  if (!testEmail) { toast.error("Enter a test email first"); return; }
                  sendTestCampaign.mutate({
                    campaignType: testCampaignType as any,
                    testEmail,
                    testName,
                  });
                }}
              >
                <Send className="w-4 h-4 mr-1" />
                {sendTestCampaign.isPending ? "Sending..." : "Send One"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
