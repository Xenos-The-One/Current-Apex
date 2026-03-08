import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Users, Phone, Mail, ArrowLeft, Globe, TrendingUp, Sparkles, Loader2, ExternalLink, DollarSign, Key, Search, AlertTriangle, CheckCircle, XCircle, BarChart2, FileText, Zap, Trash2, Wrench, BookMarked, Download, Play, GitCompare, Bell, BellOff, Layers, CalendarDays, Send, Image, ClipboardCopy, BookOpen, Target, Link2, Lightbulb, ChevronRight, History } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Link } from "wouter";
import { toast } from "sonner";
import { SetupProgressTracker } from "@/components/SetupProgressTracker";
import { LeadSourceMappings } from "@/components/LeadSourceMappings";

// Avatar status select component
function AvatarStatusSelect({ agencyId, currentStatus }: { agencyId: number; currentStatus: string }) {
  const utils = trpc.useUtils();
  const updateStatus = trpc.admin.updateAvatarStatus.useMutation({
    onSuccess: () => {
      toast.success("Avatar status updated");
      utils.admin.getAgency.invalidate({ id: agencyId });
    },
  });

  return (
    <Select
      value={currentStatus}
      onValueChange={(value: any) => {
        updateStatus.mutate({ id: agencyId, avatarStatus: value });
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="recording_scheduled">Recording Scheduled</SelectItem>
        <SelectItem value="in_progress">In Progress</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
      </SelectContent>
    </Select>
  );
}

// Third-party account card component
function ThirdPartyAccountCard({ title, email, status, agencyId, type }: {
  title: string;
  email: string | null;
  status: string;
  agencyId: number;
  type: "elevenlabs" | "heygen";
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(email || "");
  const [newStatus, setNewStatus] = useState(status);
  const utils = trpc.useUtils();

  const updateAccount = type === "elevenlabs" 
    ? trpc.admin.updateElevenLabsAccount.useMutation({
        onSuccess: () => {
          toast.success("ElevenLabs account updated");
          setIsEditing(false);
          utils.admin.getAgency.invalidate({ id: agencyId });
        },
      })
    : trpc.admin.updateHeyGenAccount.useMutation({
        onSuccess: () => {
          toast.success("HeyGen account updated");
          setIsEditing(false);
          utils.admin.getAgency.invalidate({ id: agencyId });
        },
      });

  const handleSave = () => {
    if (!newEmail) {
      toast.error("Email is required");
      return;
    }
    updateAccount.mutate({
      id: agencyId,
      email: newEmail,
      status: newStatus as any,
    });
  };

  const statusColors: Record<string, string> = {
    not_created: "bg-gray-500",
    pending: "bg-yellow-500",
    active: "bg-blue-500",
    credentials_shared: "bg-green-500",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Badge className={statusColors[status]}>
          {status.replace("_", " ")}
        </Badge>
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Account email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_created">Not Created</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="credentials_shared">Credentials Shared</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={updateAccount.isPending}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {email || "No account created yet"}
          </p>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            {email ? "Update" : "Create Account"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AgencyDetail() {
  const [, params] = useRoute("/admin/agencies/:id");
  const agencyId = params?.id ? parseInt(params.id) : 0;
  
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  
  const { data: agency, isLoading } = trpc.admin.getAgency.useQuery(
    { id: agencyId },
    { enabled: isAdmin && agencyId > 0 }
  );
  const { data: clients } = trpc.admin.listClients.useQuery(
    { agencyId },
    { enabled: isAdmin && agencyId > 0 }
  );
  
  const activateAgency = trpc.admin.activateAgency.useMutation({
    onSuccess: () => {
      toast.success("Client activated successfully");
      utils.admin.getAgency.invalidate({ id: agencyId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStatus = trpc.admin.updateAgencyStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.admin.getAgency.invalidate({ id: agencyId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [newClientDialog, setNewClientDialog] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientTier, setNewClientTier] = useState<"starter" | "pro" | "enterprise" | "done_for_you">("pro");

  const createClient = trpc.admin.createClient.useMutation({
    onSuccess: () => {
      toast.success("Customer created successfully");
      setNewClientDialog(false);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientTier("pro");
      utils.admin.listClients.invalidate({ agencyId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateClient = () => {
    if (!newClientName || !newClientEmail) {
      toast.error("Name and email are required");
      return;
    }

    createClient.mutate({
      agencyId,
      name: newClientName,
      email: newClientEmail,
      phone: newClientPhone || undefined,
      subscriptionTier: newClientTier,
    });
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

  if (!agency || (user?.role !== "admin" && user?.role !== "super_admin")) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>Client not found or access denied</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{agency.name}</h1>
            <p className="text-muted-foreground">
              {agency.businessType === "loan_officer" ? "Loan Officer" : "Real Estate Agent"}
            </p>
          </div>
          <Badge className={agency.status === "active" ? "bg-success" : ""}>
            {agency.status}
          </Badge>
        </div>

        {/* Setup Progress Tracker */}
        <SetupProgressTracker agency={agency} />

        {/* Agency Info */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Team Size</Label>
                <p className="font-medium">{agency.teamSize} members</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Setup Fee</Label>
                <p className="font-medium">
                  {agency.setupFeePaid ? (
                    <span className="text-success flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Paid
                    </span>
                  ) : (
                    <span className="text-destructive">Not Paid</span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Strategy Call</Label>
                <p className="font-medium">
                  {agency.strategyCallBooked ? (
                    agency.strategyCallDate ? (
                      `Scheduled: ${new Date(agency.strategyCallDate).toLocaleDateString()}`
                    ) : (
                      "Booked (date pending)"
                    )
                  ) : (
                    "Not booked"
                  )}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Webinar Willingness</Label>
                <p className="font-medium">{agency.webinarWillingness ? "Yes" : "No"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target Markets</CardTitle>
            </CardHeader>
            <CardContent>
              {agency.targetMarkets ? (
                <div className="space-y-2 text-sm">
                  {JSON.parse(agency.targetMarkets).zipCodes?.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Zip Codes:</Label>
                      <p>{JSON.parse(agency.targetMarkets).zipCodes.join(", ")}</p>
                    </div>
                  )}
                  {JSON.parse(agency.targetMarkets).cities?.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Cities:</Label>
                      <p>{JSON.parse(agency.targetMarkets).cities.join(", ")}</p>
                    </div>
                  )}
                  {JSON.parse(agency.targetMarkets).states?.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">States:</Label>
                      <p>{JSON.parse(agency.targetMarkets).states.join(", ")}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No target markets specified</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Third-Party Account Management */}
        <Card>
          <CardHeader>
            <CardTitle>Third-Party Account Setup</CardTitle>
            <CardDescription>
              Manage ElevenLabs and HeyGen accounts (included in Enterprise and DFY plans)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* AI Avatar Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>AI Avatar Status</Label>
                  <Badge variant={agency.avatarStatus === "completed" ? "default" : "secondary"}>
                    {agency.avatarStatus?.replace("_", " ")}
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    Recording: <span className="font-medium text-foreground">{agency.avatarRecording === "studio" ? "Professional Studio" : "Self-Record"}</span>
                  </p>
                </div>
                <AvatarStatusSelect agencyId={agencyId} currentStatus={agency.avatarStatus || "pending"} />
              </div>

              {/* ElevenLabs Account */}
              <ThirdPartyAccountCard
                title="ElevenLabs (Voice AI)"
                email={agency.elevenLabsEmail}
                status={agency.elevenLabsStatus || "not_created"}
                agencyId={agencyId}
                type="elevenlabs"
              />

              {/* HeyGen Account */}
              <ThirdPartyAccountCard
                title="HeyGen (AI Avatar)"
                email={agency.heygenEmail}
                status={agency.heygenStatus || "not_created"}
                agencyId={agencyId}
                type="heygen"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lead Source Auto-Call Configuration */}
        <LeadSourceMappings agencyId={agencyId} />

        {/* Actions */}
        {agency.status === "pending_call" && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Activate Agency</CardTitle>
              <CardDescription>
                Mark the strategy call as complete and activate this agency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => activateAgency.mutate({ id: agencyId })}
                disabled={activateAgency.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Activate Agency
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Customers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Customers</CardTitle>
                <CardDescription>Manage customers for this client</CardDescription>
              </div>
              <Dialog open={newClientDialog} onOpenChange={setNewClientDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Users className="w-4 h-4 mr-2" />
                    Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Customer</DialogTitle>
                    <DialogDescription>
                      Add a new customer for this client
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        placeholder="customer@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier">Subscription Tier</Label>
                      <Select value={newClientTier} onValueChange={(v: any) => setNewClientTier(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter ($297/mo)</SelectItem>
                          <SelectItem value="pro">Professional ($497/mo)</SelectItem>
                          <SelectItem value="enterprise">Enterprise ($997/mo)</SelectItem>
                          <SelectItem value="done_for_you">Done-For-You ($2,000/mo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleCreateClient}
                      disabled={createClient.isPending}
                      className="w-full"
                    >
                      Create Customer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {clients && clients.length > 0 ? (
              <div className="space-y-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </span>
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{client.subscriptionTier}</Badge>
                      <Badge variant="outline">{client.accessMode}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No clients yet. Add a client to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEO Integration Section */}
      <SeoAgencyPanel agencyId={agencyId} agencyName={agency?.name || ""} />
    </DashboardLayout>
  );
}

function SeoAgencyPanel({ agencyId, agencyName }: { agencyId: number; agencyName: string }) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [keywordNiche, setKeywordNiche] = useState("");
  const [auditResult, setAuditResult] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [savedKwIds, setSavedKwIds] = useState<Set<string>>(new Set());
  const [generateFromKeyword, setGenerateFromKeyword] = useState<string | null>(null);
  const [fixThisIssue, setFixThisIssue] = useState<string | null>(null);
  const [compareAudit, setCompareAudit] = useState<any | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkQueue, setBulkQueue] = useState<string[]>([]);
  const [bulkIndex, setBulkIndex] = useState(0);
  const [groupByCluster, setGroupByCluster] = useState(false);
  const [auditReminderEnabled, setAuditReminderEnabled] = useState(() => {
    try { return localStorage.getItem(`audit_reminder_${agencyId}`) === "true"; } catch { return false; }
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarKeywords, setCalendarKeywords] = useState<string[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<[number, number]>([0, 100]);
  const [clientEmailForReport, setClientEmailForReport] = useState("");
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  const [rankingKeywordId, setRankingKeywordId] = useState<number | null>(null);
  const [scoreThreshold, setScoreThreshold] = useState<number>(() => {
    try { return Number(localStorage.getItem(`audit_threshold_${agencyId}`)) || 70; } catch { return 70; }
  });
  const [thresholdEnabled, setThresholdEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(`audit_threshold_enabled_${agencyId}`) === 'true'; } catch { return false; }
  });
  const [portalInviteEmail, setPortalInviteEmail] = useState("");
  const [budgetData, setBudgetData] = useState<{ monthlyCost: number } | null | undefined>(undefined);
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [competitorGapResults, setCompetitorGapResults] = useState<any[]>([]);
  const [showCompetitorGap, setShowCompetitorGap] = useState(false);
  const [liveRankingsData, setLiveRankingsData] = useState<any[]>([]);
  const [scheduledGapCalendar, setScheduledGapCalendar] = useState<any[]>([]);
  const [rankAlertThreshold, setRankAlertThreshold] = useState<Record<number, number>>({});
  const [rankAlertActive, setRankAlertActive] = useState<Record<number, boolean>>({});
  const [activeBrief, setActiveBrief] = useState<any | null>(null);
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [showBriefHistory, setShowBriefHistory] = useState(false);
  const utils = trpc.useUtils();

  const runAudit = trpc.seoBridge.runAuditForClient.useMutation({
    onSuccess: (data) => {
      setAuditResult(data);
      toast.success("SEO audit complete!");
      // Auto-save to history
      saveAuditResult.mutate({
        crmClientId: agencyId,
        websiteUrl,
        overallScore: data.overallScore,
        seoScore: data.seoScore,
        readabilityScore: data.readabilityScore,
        technicalSeoScore: data.technicalSeoScore,
        wordCount: data.wordCount,
        imgWithoutAlt: data.imgWithoutAlt,
        pageTitle: data.pageTitle,
        issues: data.issues,
        strengths: data.strengths,
        improvements: data.improvements,
      });
        // Threshold alert check
      if (thresholdEnabled && data.overallScore != null && data.overallScore < scoreThreshold) {
        toast.error(`⚠️ Score Alert: ${agencyName}'s SEO score (${data.overallScore}) dropped below your threshold of ${scoreThreshold}!`, { duration: 8000 });
        // Send push notification via browser if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('SEO Score Alert', {
            body: `${agencyName}'s SEO score (${data.overallScore}) is below your threshold of ${scoreThreshold}. Review needed.`,
            icon: '/favicon.ico',
          });
        }
        // Send email alert to tariqhaskins@indigolabsai.com
        sendAuditThresholdAlert.mutate({
          crmClientId: agencyId,
          clientName: agencyName,
          websiteUrl,
          overallScore: data.overallScore,
          threshold: scoreThreshold,
          recipientEmail: 'tariqhaskins@indigolabsai.com',
        });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const saveAuditResult = trpc.seoBridge.saveAuditResult.useMutation({
    onSuccess: () => utils.seoBridge.getAuditHistory.invalidate({ crmClientId: agencyId }),
  });

  const auditHistory = trpc.seoBridge.getAuditHistory.useQuery({ crmClientId: agencyId });

  const getKeywords = trpc.seoBridge.keywordsForClient.useMutation({
    onSuccess: (data) => { setKeywords(Array.isArray(data) ? data : []); toast.success(`Found ${Array.isArray(data) ? data.length : 0} keyword opportunities`); },
    onError: (err) => toast.error(err.message),
  });

  const deleteKeyword = trpc.seoBridge.deleteKeyword.useMutation({
    onSuccess: () => {
      toast.success("Keyword removed");
      utils.seoBridge.getSavedKeywords.invalidate({ crmClientId: agencyId });
    },
    onError: (err) => toast.error(err.message),
  });

  const saveKeyword = trpc.seoBridge.saveKeyword.useMutation({
    onSuccess: (data, vars) => {
      if (data.duplicate) {
        toast.info("Already saved");
      } else {
        toast.success("Keyword saved!");
        setSavedKwIds(prev => new Set([...prev, vars.keyword]));
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const savedKeywords = trpc.seoBridge.getSavedKeywords.useQuery({ crmClientId: agencyId });

  const sendPortalInvite = trpc.seoBridge.sendClientPortalInvite.useMutation({
    onSuccess: () => { toast.success("Portal invitation sent!"); setPortalInviteEmail(""); },
    onError: (err) => toast.error(err.message),
  });

  const getBudget = trpc.seoBridge.budgetForClient.useMutation({
    onSuccess: (data) => setBudgetData(data ?? null),
    onError: () => setBudgetData(null),
  });

  const sendAuditEmail = trpc.seoBridge.sendAuditEmailReport.useMutation({
    onSuccess: (data: any) => {
      if (data?.demo) toast.success("Audit report sent (demo mode — configure SendGrid to deliver)");
      else toast.success("Audit report emailed to client!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sendAuditThresholdAlert = trpc.seoBridge.sendAuditThresholdAlert.useMutation({
    onSuccess: (data: any) => {
      if (data?.demo) toast.success("Threshold alert email sent (demo mode)");
      else toast.success("Threshold alert email sent to tariqhaskins@indigolabsai.com!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadClientLogo = trpc.seoBridge.uploadClientLogo.useMutation({
    onSuccess: (data: any) => {
      setClientLogoUrl(data.url);
      toast.success("Client logo uploaded! It will appear in exported PDFs.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const checkRankAlerts = trpc.seoBridge.checkRankAlerts.useMutation({
    onSuccess: (data: any) => {
      if (data.triggered.length > 0) {
        toast.error(`⚠️ ${data.triggered.length} keyword(s) dropped below alert threshold! Email sent.`);
      } else if (data.total > 0) {
        toast.success(`All ${data.total} rank alerts checked — no drops detected.`);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addRankSnapshot = trpc.seoBridge.addRankSnapshot.useMutation({
    onSuccess: () => {
      toast.success("Rank position recorded!");
      utils.seoBridge.getAllRankSnapshots.invalidate({ crmClientId: agencyId });
      // Auto-check rank alerts after every new snapshot
      checkRankAlerts.mutate({ crmClientId: agencyId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rankSnapshots = trpc.seoBridge.getAllRankSnapshots.useQuery({ crmClientId: agencyId });

  const generateCalendarPDF = trpc.seoBridge.generateCalendarPDF.useMutation({
    onSuccess: (data: any) => {
      // Decode base64 and trigger download
      const byteChars = atob(data.base64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Content calendar PDF downloaded!');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const competitorKeywordGap = trpc.seoBridge.competitorKeywordGap.useMutation({
    onSuccess: (data: any[]) => {
      setCompetitorGapResults(data);
      toast.success(`Found ${data.length} competitor keyword gaps!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const exportRankingsCSV = trpc.seoBridge.exportRankingsCSV.useMutation({
    onSuccess: (data: any) => {
      if (data.count === 0) { toast.info('No rank snapshots to export yet.'); return; }
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${agencyName.replace(/\s+/g, '_')}_rankings.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.count} rank snapshots to CSV!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const fetchLiveRankings = trpc.seoBridge.fetchLiveRankings.useMutation({
    onSuccess: (data: any[]) => {
      setLiveRankingsData(data);
      toast.success(`Fetched live positions for ${data.length} keywords!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const setRankAlert = trpc.seoBridge.setRankAlert.useMutation({
    onSuccess: (_, vars) => {
      setRankAlertActive(prev => ({ ...prev, [vars.savedKeywordId]: true }));
      toast.success(`Alert set: notify if "${vars.keyword}" drops below position #${vars.thresholdPosition}`);
    },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteRankAlert = trpc.seoBridge.deleteRankAlert.useMutation({
    onSuccess: (_, vars) => {
      setRankAlertActive(prev => ({ ...prev, [vars.savedKeywordId]: false }));
      toast.success('Rank alert removed');
    },
    onError: (err: any) => toast.error(err.message),
  });
  const allRankAlerts = trpc.seoBridge.getAllRankAlerts.useQuery({ crmClientId: agencyId }, {
    onSuccess: (data: any[]) => {
      const active: Record<number, boolean> = {};
      const thresholds: Record<number, number> = {};
      data.forEach((a: any) => { active[a.savedKeywordId] = true; thresholds[a.savedKeywordId] = a.thresholdPosition; });
      setRankAlertActive(active);
      setRankAlertThreshold(prev => ({ ...prev, ...thresholds }));
    },
  });
  const scheduleGapKeywords = trpc.seoBridge.scheduleGapKeywords.useMutation({
    onSuccess: (data: any[]) => {
      setScheduledGapCalendar(data);
      toast.success(`Scheduled ${data.length} gap keywords to content calendar!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const generateContentBrief = trpc.seoBridge.generateContentBrief.useMutation({
    onSuccess: (data: any) => {
      setActiveBrief(data);
      setShowBriefModal(true);
      utils.seoBridge.getContentBriefs.invalidate({ crmClientId: agencyId });
      toast.success(`Content brief generated for "${data.keyword}"!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const contentBriefs = trpc.seoBridge.getContentBriefs.useQuery({ crmClientId: agencyId });

  // ─── AI Content Hub ─────────────────────────────────────────────────
  const [showContentHub, setShowContentHub] = useState(false);
  const [contentHubTab, setContentHubTab] = useState<"packages" | "setup">("packages");
  const [activePackage, setActivePackage] = useState<any | null>(null);
  const [heygenAvatarIdInput, setHeygenAvatarIdInput] = useState("");
  const [heygenVoiceIdInput, setHeygenVoiceIdInput] = useState("");
  const [heygenVideoFormatInput, setHeygenVideoFormatInput] = useState<"portrait" | "landscape" | "square">("portrait");
  const [contentHubEnabledInput, setContentHubEnabledInput] = useState(false);

  const linkedSeoClient = trpc.seo.clients.getByCrmId.useQuery(
    { crmClientId: agencyId },
    { enabled: showContentHub }
  );
  const seoClientId = linkedSeoClient.data?.id ?? null;

  const contentPackages = trpc.seoBridge.getContentPackages.useQuery(
    { clientId: seoClientId ?? 0 },
    { enabled: !!seoClientId && showContentHub, refetchInterval: showContentHub ? 30000 : false }
  );
  const heygenAvatars = trpc.seoBridge.listHeyGenAvatars.useQuery(
    undefined,
    { enabled: contentHubTab === "setup" && showContentHub }
  );
  const heygenVoices = trpc.seoBridge.listHeyGenVoices.useQuery(
    { language: "en" },
    { enabled: contentHubTab === "setup" && showContentHub }
  );
  const heygenQuota = trpc.seoBridge.getHeyGenQuota.useQuery(
    undefined,
    { enabled: contentHubTab === "setup" && showContentHub }
  );

  const generateContentPackage = trpc.seoBridge.generateContentPackage.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.seoBridge.getContentPackages.invalidate({ clientId: seoClientId ?? 0 });
    },
    onError: (err: any) => toast.error(err.message),
  });
  const approveContentPackage = trpc.seoBridge.approveContentPackage.useMutation({
    onSuccess: () => {
      toast.success("Package approved!");
      setActivePackage(null);
      utils.seoBridge.getContentPackages.invalidate({ clientId: seoClientId ?? 0 });
    },
    onError: (err: any) => toast.error(err.message),
  });
  const rejectContentPackage = trpc.seoBridge.rejectContentPackage.useMutation({
    onSuccess: () => {
      toast.success("Package rejected — generate a new one when ready.");
      setActivePackage(null);
      utils.seoBridge.getContentPackages.invalidate({ clientId: seoClientId ?? 0 });
    },
    onError: (err: any) => toast.error(err.message),
  });
  const saveContentHubSetup = trpc.seo.clients.update.useMutation({
    onSuccess: () => toast.success("Content Hub settings saved!"),
    onError: (err: any) => toast.error(err.message),
  });

  // ICS calendar export helper
  const exportICS = () => {
    if (calendarKeywords.length === 0) return;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sterling Marketing//SEO Content Calendar//EN",
    ];
    calendarKeywords.forEach((kw, i) => {
      const d = new Date();
      d.setDate(d.getDate() + Math.floor((i / calendarKeywords.length) * 30) + 1);
      const pad = (n: number) => String(n).padStart(2, "0");
      const dtStr = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
      lines.push(
        "BEGIN:VEVENT",
        `DTSTART;VALUE=DATE:${dtStr}`,
        `DTEND;VALUE=DATE:${dtStr}`,
        `SUMMARY:Publish: ${kw.replace(/,/g, "\\,")}`,
        `DESCRIPTION:SEO content for ${agencyName}: ${kw.replace(/,/g, "\\,")}`,
        `UID:seo-${agencyId}-${i}-${Date.now()}@indigolabsai.com`,
        "END:VEVENT",
      );
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agencyName.replace(/\s+/g, "_")}_content_calendar.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${calendarKeywords.length} events to .ics file`);
  };

  // CSV export helper
  const exportKeywordsCSV = () => {
    const rows = savedKeywords.data as any[];
    if (!rows || rows.length === 0) return;
    const header = "Keyword,Search Volume,Difficulty,Relevance,Saved Date";
    const lines = rows.map((kw: any) =>
      `"${kw.keyword}",${kw.searchVolume ?? ""},${kw.difficulty ?? ""},${kw.relevance ?? ""},${new Date(kw.createdAt).toLocaleDateString()}`
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agencyName.replace(/\s+/g, "_")}_keywords.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} keywords to CSV`);
  };

  // Auto-load budget on mount
  useEffect(() => {
    getBudget.mutate({ crmClientId: agencyId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  // Merge saved keyword IDs from DB into local set
  useEffect(() => {
    if (savedKeywords.data) {
      setSavedKwIds(new Set((savedKeywords.data as any[]).map((k: any) => k.keyword)));
    }
  }, [savedKeywords.data]);

  return (
    <>
    <div className="mt-2 grid md:grid-cols-2 gap-6">
      {/* SEO Audit */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Globe className="w-5 h-5" />
              SEO Website Audit
            </CardTitle>
            <button
              title={auditReminderEnabled ? "Disable monthly audit reminder" : "Enable monthly audit reminder (1st of each month)"}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${auditReminderEnabled ? "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300" : "border-border text-muted-foreground hover:bg-muted"}`}
              onClick={() => {
                const next = !auditReminderEnabled;
                setAuditReminderEnabled(next);
                try { localStorage.setItem(`audit_reminder_${agencyId}`, String(next)); } catch {}
                toast.success(next ? "Monthly audit reminder enabled — you'll be notified on the 1st of each month" : "Monthly audit reminder disabled");
              }}>
              {auditReminderEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              {auditReminderEnabled ? "Reminder On" : "Remind Monthly"}
            </button>
          </div>
          <CardDescription>Run a full SEO audit on this client's website.{auditReminderEnabled && <span className="ml-1 text-blue-600 dark:text-blue-400 font-medium">· Monthly reminder active</span>}</CardDescription>
          {/* Client logo upload for PDF branding */}
          <div className="flex items-center gap-2 mt-1">
            <label className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted cursor-pointer transition-colors">
              {uploadClientLogo.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
              {clientLogoUrl ? "Logo Uploaded ✓" : "Upload Client Logo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  uploadClientLogo.mutate({ crmClientId: agencyId, base64Image: base64, mimeType: file.type });
                };
                reader.readAsDataURL(file);
              }} />
            </label>
            {clientLogoUrl && <span className="text-xs text-green-600 dark:text-green-400">Logo will appear in PDF exports</span>}
          </div>
          {/* Score threshold alert row */}
          <div className="flex items-center gap-2 mt-2">
            <button
              title={thresholdEnabled ? "Disable score threshold alert" : "Enable score threshold alert"}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors shrink-0 ${thresholdEnabled ? "bg-red-100 border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-300" : "border-border text-muted-foreground hover:bg-muted"}`}
              onClick={() => {
                const next = !thresholdEnabled;
                setThresholdEnabled(next);
                try { localStorage.setItem(`audit_threshold_enabled_${agencyId}`, String(next)); } catch {}
                toast.success(next ? `Score alert enabled — you'll be notified if score drops below ${scoreThreshold}` : "Score alert disabled");
              }}>
              <AlertTriangle className="w-3 h-3" />
              {thresholdEnabled ? "Alert On" : "Set Alert"}
            </button>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-xs text-muted-foreground shrink-0">Alert if score &lt;</span>
              <input
                type="number"
                min={0}
                max={100}
                value={scoreThreshold}
                onChange={(e) => {
                  const v = Math.min(100, Math.max(0, Number(e.target.value)));
                  setScoreThreshold(v);
                  try { localStorage.setItem(`audit_threshold_${agencyId}`, String(v)); } catch {}
                }}
                className="w-14 h-6 text-xs text-center border border-border rounded bg-background px-1"
              />
              {thresholdEnabled && <span className="text-xs text-red-600 dark:text-red-400 font-medium">active</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="https://clientwebsite.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
            <Button disabled={!websiteUrl || runAudit.isPending}
              onClick={() => runAudit.mutate({ crmClientId: agencyId, websiteUrl })}>
              {runAudit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {auditResult && (
            <div className="space-y-3">
              {/* Score overview */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Overall", score: auditResult.overallScore, icon: <BarChart2 className="w-3 h-3" /> },
                  { label: "SEO", score: auditResult.seoScore, icon: <TrendingUp className="w-3 h-3" /> },
                  { label: "Readability", score: auditResult.readabilityScore, icon: <FileText className="w-3 h-3" /> },
                  { label: "Technical", score: auditResult.technicalSeoScore, icon: <Zap className="w-3 h-3" /> },
                ].map(({ label, score, icon }) => (
                  <div key={label} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</span>
                    <span className={`text-sm font-bold ${
                      score >= 80 ? "text-green-600 dark:text-green-400" :
                      score >= 60 ? "text-yellow-600 dark:text-yellow-400" :
                      "text-red-600 dark:text-red-400"
                    }`}>{score ?? "—"}</span>
                  </div>
                ))}
              </div>
              {/* Page info */}
              {auditResult.pageTitle && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  <span className="font-medium">Title:</span> {auditResult.pageTitle}
                  {auditResult.wordCount && <span className="ml-2 text-muted-foreground">· {auditResult.wordCount} words</span>}
                  {auditResult.imgWithoutAlt > 0 && <span className="ml-2 text-yellow-600">· {auditResult.imgWithoutAlt} imgs missing alt</span>}
                </div>
              )}
              {/* Issues — with Fix This button */}
              {Array.isArray(auditResult.issues) && auditResult.issues.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Issues</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {auditResult.issues.slice(0, 6).map((issue: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs p-1.5 rounded bg-muted group">
                        {issue.severity === "high" ? <XCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" /> :
                         issue.severity === "medium" ? <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" /> :
                         <CheckCircle className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />}
                        <span className="flex-1">{issue.message}</span>
                        <button
                          title="Generate content to fix this issue"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900 text-orange-600 shrink-0"
                          onClick={() => {
                            const prompt = issue.suggestion
                              ? `Fix SEO issue: ${issue.message}. Suggestion: ${issue.suggestion}`
                              : `Fix SEO issue: ${issue.message}`;
                            setFixThisIssue(prompt);
                            setGenerateFromKeyword(null);
                          }}
                        >
                          <Wrench className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Strengths */}
              {Array.isArray(auditResult.strengths) && auditResult.strengths.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Strengths</p>
                  <div className="space-y-1">
                    {auditResult.strengths.slice(0, 3).map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Email Report */}
              <div className="flex gap-2">
                <Input
                  placeholder="client@email.com"
                  type="email"
                  className="h-8 text-xs"
                  value={clientEmailForReport}
                  onChange={(e) => setClientEmailForReport(e.target.value)}
                />
                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  disabled={!clientEmailForReport || sendAuditEmail.isPending}
                  onClick={() => sendAuditEmail.mutate({
                    crmClientId: agencyId,
                    clientEmail: clientEmailForReport,
                    clientName: agencyName,
                    websiteUrl,
                    overallScore: auditResult.overallScore ?? 0,
                    seoScore: auditResult.seoScore ?? 0,
                    readabilityScore: auditResult.readabilityScore ?? 0,
                    technicalSeoScore: auditResult.technicalSeoScore ?? 0,
                    issues: auditResult.issues,
                    strengths: auditResult.strengths,
                  })}>
                  {sendAuditEmail.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                  Email Report
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href="/seo/seo-audit" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" /> Full Report in SEO Portal
                </a>
              </Button>
            </div>
          )}
          {/* Audit History Trend Chart */}
          {auditHistory.data && (auditHistory.data as any[]).length > 0 && (() => {
            const historyArr = (auditHistory.data as any[]).slice().reverse();
            const chartData = historyArr.map((h: any) => ({
              date: new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              overall: h.overallScore,
              seo: h.seoScore,
              id: h.id,
            }));
            return (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score Trend</p>
                  <span className="text-xs text-muted-foreground">{(auditHistory.data as any[]).length} audits</span>
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, padding: "4px 8px" }}
                      formatter={(val: any, name: string) => [val, name === "overall" ? "Overall" : "SEO"]}
                    />
                    <Line type="monotone" dataKey="overall" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="seo" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-blue-500"></span>Overall</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-emerald-500"></span>SEO</span>
                </div>
                {/* Clickable audit history list for comparison */}
                <div className="space-y-1 max-h-32 overflow-y-auto mt-1">
                  {(auditHistory.data as any[]).map((h: any, i: number) => {
                    const prev = (auditHistory.data as any[])[i + 1];
                    const delta = prev && h.overallScore != null && prev.overallScore != null ? h.overallScore - prev.overallScore : null;
                    const isComparing = compareAudit?.id === h.id;
                    return (
                      <div key={h.id}
                        className={`flex items-center justify-between text-xs p-1.5 rounded cursor-pointer transition-colors gap-2 ${isComparing ? "bg-blue-100 dark:bg-blue-900 ring-1 ring-blue-400" : "bg-muted hover:bg-muted/80"}`}
                        onClick={() => setCompareAudit(isComparing ? null : h)}
                        title={isComparing ? "Click to deselect" : "Click to compare with current audit"}>
                        <span className="text-muted-foreground truncate flex-1">{new Date(h.createdAt).toLocaleDateString()}</span>
                        <span className="font-medium">{h.websiteUrl?.replace(/^https?:\/\//, "").substring(0, 18) || "—"}</span>
                        <span className={`font-bold ${h.overallScore >= 80 ? "text-green-600" : h.overallScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>{h.overallScore ?? "—"}</span>
                        {delta != null && (
                          <span className={`font-semibold ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                        <GitCompare className={`w-3 h-3 shrink-0 ${isComparing ? "text-blue-500" : "text-muted-foreground"}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {/* Legacy list — hidden when chart shows */}
          {auditHistory.data && (auditHistory.data as any[]).length === 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audit History</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {(auditHistory.data as any[]).map((h: any, i: number) => {
                  const prev = (auditHistory.data as any[])[i + 1];
                  const delta = prev && h.overallScore != null && prev.overallScore != null ? h.overallScore - prev.overallScore : null;
                  return (
                    <div key={h.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted gap-2">
                      <span className="text-muted-foreground truncate flex-1">{new Date(h.createdAt).toLocaleDateString()}</span>
                      <span className="font-medium">{h.websiteUrl?.replace(/^https?:\/\//, "").substring(0, 20)}</span>
                      <span className={`font-bold ${
                        h.overallScore >= 80 ? "text-green-600" : h.overallScore >= 60 ? "text-yellow-600" : "text-red-600"
                      }`}>{h.overallScore ?? "—"}</span>
                      {delta != null && (
                        <span className={`text-xs font-semibold ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyword Research */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <TrendingUp className="w-5 h-5" />
            Keyword Research
          </CardTitle>
          <CardDescription>Find and save keyword opportunities for this client's market.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs defaultValue="search">
            <TabsList className="w-full mb-2">
              <TabsTrigger value="search" className="flex-1 text-xs">
                <Search className="w-3 h-3 mr-1" /> Search
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex-1 text-xs">
                <BookMarked className="w-3 h-3 mr-1" /> Saved
                {savedKeywords.data && (savedKeywords.data as any[]).length > 0 && (
                  <span className="ml-1 bg-green-600 text-white rounded-full text-[9px] px-1">{(savedKeywords.data as any[]).length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-2 mt-0">
              <div className="flex gap-2">
                <Input placeholder="e.g. mortgage broker Dallas TX" value={keywordNiche} onChange={(e) => setKeywordNiche(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && keywordNiche && getKeywords.mutate({ topic: keywordNiche, count: 10 })} />
                <Button disabled={!keywordNiche || getKeywords.isPending}
                  onClick={() => getKeywords.mutate({ topic: keywordNiche, count: 10 })}>
                  {getKeywords.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {/* Competitor Keyword Gap toggle */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${showCompetitorGap ? 'bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900 dark:border-orange-600 dark:text-orange-300' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setShowCompetitorGap(g => !g)}>
                  <TrendingUp className="w-3 h-3" />
                  {showCompetitorGap ? 'Hide Competitor Gap' : 'Competitor Gap'}
                </button>
                {(contentBriefs.data?.length ?? 0) > 0 && (
                  <button
                    title="View saved content briefs"
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${showBriefHistory ? 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900 dark:border-purple-600 dark:text-purple-300' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    onClick={() => setShowBriefHistory(h => !h)}>
                    <History className="w-3 h-3" />
                    {contentBriefs.data?.length} Brief{(contentBriefs.data?.length ?? 0) !== 1 ? 's' : ''}
                  </button>
                )}
                <button
                  title="AI Content Hub — generate blog + video + social packages"
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${showContentHub ? 'bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-900 dark:border-violet-600 dark:text-violet-300' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setShowContentHub(h => !h)}>
                  <Sparkles className="w-3 h-3" />
                  Content Hub
                  {(contentPackages.data?.length ?? 0) > 0 && (
                    <span className="ml-1 bg-violet-600 text-white rounded-full text-[9px] px-1">{contentPackages.data?.length}</span>
                  )}
                </button>
              </div>
              {showCompetitorGap && (
                <div className="p-3 border border-orange-200 dark:border-orange-800 rounded-xl bg-orange-50 dark:bg-orange-950 space-y-2">
                  <p className="text-xs font-semibold text-orange-800 dark:text-orange-200">Competitor Keyword Gap Analysis</p>
                  <p className="text-xs text-muted-foreground">Enter a competitor's domain to find keywords they likely rank for that this client is missing.</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. competitorsite.com"
                      value={competitorDomain}
                      onChange={(e) => setCompetitorDomain(e.target.value)}
                      className="h-8 text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && competitorDomain && competitorKeywordGap.mutate({ crmClientId: agencyId, competitorDomain, clientNiche: keywordNiche || undefined })}
                    />
                    <Button size="sm" className="h-8 text-xs" disabled={!competitorDomain || competitorKeywordGap.isPending}
                      onClick={() => competitorKeywordGap.mutate({ crmClientId: agencyId, competitorDomain, clientNiche: keywordNiche || undefined })}>
                      {competitorKeywordGap.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    </Button>
                  </div>
                  {competitorGapResults.length > 0 && (
                    <div className="space-y-2">
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {competitorGapResults.map((kw: any, i: number) => {
                          const vol = parseInt(kw.estimatedVolume) || 0;
                          const diff = kw.difficulty ?? 50;
                          // Opportunity Score: high volume + low difficulty = high score (0-100)
                          const oppScore = Math.round(Math.min(100, (vol / 500) * 0.5 * 100 + (1 - diff / 100) * 0.5 * 100));
                          const oppColor = oppScore >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : oppScore >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
                          const diffColor = diff <= 30 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : diff <= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
                          const intentColor = kw.intent === 'transactional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : kw.intent === 'informational' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
                          return (
                            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-white dark:bg-black">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{kw.keyword}</p>
                                <p className="text-muted-foreground text-[10px] truncate mt-0.5">{kw.reason}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className="flex gap-1">
                                  <span title="Opportunity Score" className={`text-[9px] px-1.5 rounded font-bold ${oppColor}`}>⚡{oppScore}</span>
                                  <span className="text-[10px] text-muted-foreground">{kw.estimatedVolume}/mo</span>
                                </div>
                                <div className="flex gap-1">
                                  <span className={`text-[9px] px-1 rounded font-semibold ${diffColor}`}>D:{diff}</span>
                                  <span className={`text-[9px] px-1 rounded font-semibold ${intentColor}`}>{kw.intent?.charAt(0).toUpperCase()}</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                <button
                                  title="Generate content brief for this keyword"
                                  className="text-muted-foreground hover:text-purple-600 transition-colors"
                                  disabled={generateContentBrief.isPending}
                                  onClick={() => generateContentBrief.mutate({
                                    crmClientId: agencyId,
                                    keyword: kw.keyword,
                                    competitorDomain: competitorDomain,
                                    estimatedVolume: parseInt(kw.estimatedVolume) || 0,
                                    difficulty: diff,
                                    intent: kw.intent,
                                    reason: kw.reason,
                                  })}>
                                  {generateContentBrief.isPending && generateContentBrief.variables?.keyword === kw.keyword
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <BookOpen className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  title="Save this gap keyword"
                                  className="text-muted-foreground hover:text-green-600 transition-colors"
                                  onClick={() => saveKeyword.mutate({ crmClientId: agencyId, keyword: kw.keyword, searchVolume: parseInt(kw.estimatedVolume) || 0, difficulty: diff, relevance: String(kw.intent) })}>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Button size="sm" className="w-full h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                        disabled={scheduleGapKeywords.isPending}
                        onClick={() => scheduleGapKeywords.mutate({
                          crmClientId: agencyId,
                          keywords: competitorGapResults.map((kw: any) => ({
                            keyword: kw.keyword,
                            opportunityScore: Math.round(Math.min(100, (parseInt(kw.estimatedVolume) || 0) / 500 * 0.5 * 100 + (1 - (kw.difficulty ?? 50) / 100) * 0.5 * 100)),
                            estimatedVolume: kw.estimatedVolume,
                            difficulty: kw.difficulty,
                          })),
                        })}>
                        {scheduleGapKeywords.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CalendarDays className="w-3 h-3 mr-1" />}
                        Schedule All Gap Keywords to Calendar
                      </Button>
                      {scheduledGapCalendar.length > 0 && (
                        <div className="mt-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                          <p className="text-[10px] font-semibold text-orange-800 dark:text-orange-200 mb-1.5">📅 {scheduledGapCalendar.length} keywords scheduled by opportunity score:</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {scheduledGapCalendar.map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[10px] p-1 rounded bg-white dark:bg-black">
                                <span className="truncate flex-1 font-medium">{item.keyword}</span>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <span className="text-muted-foreground">{item.publishDate}</span>
                                  <span className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-1 rounded font-bold">⚡{item.opportunityScore}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {keywords.length > 0 && (
                <div className="space-y-1">
                  <div className="max-h-52 overflow-y-auto space-y-1.5">
                    {keywords.slice(0, 10).map((kw: any, i: number) => {
                      const vol = kw.searchVolume ?? kw.volume;
                      const diff = kw.difficulty;
                      const diffColor = diff == null ? "" : diff <= 30 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : diff <= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
                      const kwText = kw.keyword || kw.term || String(kw).substring(0, 40);
                      const isSaved = savedKwIds.has(kwText);
                      return (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted gap-2">
                          <span className="font-medium truncate flex-1">{kwText}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {vol != null && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                                {vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : vol}/mo
                              </Badge>
                            )}
                            {diff != null && (
                              <Badge className={`text-xs px-1.5 py-0 h-5 border-0 ${diffColor}`}>
                                D:{diff}
                              </Badge>
                            )}
                            <button title="Generate content for this keyword"
                              className="p-0.5 rounded hover:bg-green-100 dark:hover:bg-green-900 text-green-600 transition-colors"
                              onClick={() => { setGenerateFromKeyword(kwText); setFixThisIssue(null); }}>
                              <Sparkles className="w-3 h-3" />
                            </button>
                            <button
                              title={isSaved ? "Already saved" : "Save keyword"}
                              className={`p-0.5 rounded transition-colors ${
                                isSaved ? "text-blue-500 cursor-default" : "hover:bg-blue-100 dark:hover:bg-blue-900 text-muted-foreground hover:text-blue-600"
                              }`}
                              disabled={isSaved || saveKeyword.isPending}
                              onClick={() => !isSaved && saveKeyword.mutate({
                                crmClientId: agencyId, keyword: kwText, searchVolume: vol, difficulty: diff,
                                relevance: kw.relevance != null ? String(kw.relevance) : undefined,
                              })}>
                              <CheckCircle className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href="/seo/keyword-research" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" /> Full Research in SEO Portal
                    </a>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Saved Keywords Tab */}
            <TabsContent value="saved" className="mt-0">
              {savedKeywords.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading saved keywords…
                </div>
              ) : !savedKeywords.data || (savedKeywords.data as any[]).length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <BookMarked className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No keywords saved yet.</p>
                  <p className="text-xs mt-1">Use the Search tab to find and save keywords.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Difficulty filter slider */}
                  <div className="space-y-1 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Difficulty filter</span>
                      <span className="text-xs font-medium text-muted-foreground">{difficultyFilter[0]}–{difficultyFilter[1]}</span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={difficultyFilter}
                      onValueChange={(v) => setDifficultyFilter(v as [number, number])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-green-600">Easy</span>
                      <span className="text-yellow-600">Medium</span>
                      <span className="text-red-600">Hard</span>
                    </div>
                  </div>
                  {/* Toolbar: cluster toggle + export + bulk generate */}
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{(savedKeywords.data as any[]).length} keywords</span>
                      <button
                        title={groupByCluster ? "Show flat list" : "Group by topic cluster"}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${groupByCluster ? "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-600 dark:text-green-300" : "border-border text-muted-foreground hover:bg-muted"}`}
                        onClick={() => setGroupByCluster(g => !g)}>
                        <Layers className="w-3 h-3" />
                        {groupByCluster ? "Clustered" : "Cluster"}
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                        onClick={exportKeywordsCSV}>
                        <Download className="w-3 h-3 mr-1" /> CSV
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                        disabled={exportRankingsCSV.isPending}
                        onClick={() => exportRankingsCSV.mutate({ crmClientId: agencyId })}>
                        {exportRankingsCSV.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3 mr-1" />}
                        Rankings
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                        disabled={(savedKeywords.data as any[]).length === 0}
                        onClick={() => {
                          const kws = (savedKeywords.data as any[]).map((k: any) => k.keyword);
                          setCalendarKeywords(kws);
                          setShowCalendar(true);
                          setBulkQueue(kws);
                          setBulkIndex(0);
                          setBulkGenerating(false);
                          setGenerateFromKeyword(null);
                          toast.info(`Content calendar created for ${kws.length} keywords`);
                        }}>
                        <CalendarDays className="w-3 h-3 mr-1" /> Calendar
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                        disabled={bulkGenerating || (savedKeywords.data as any[]).length === 0}
                        onClick={() => {
                          const kws = (savedKeywords.data as any[]).map((k: any) => k.keyword);
                          setBulkQueue(kws);
                          setBulkIndex(0);
                          setBulkGenerating(true);
                          setGenerateFromKeyword(kws[0]);
                          setFixThisIssue(null);
                          toast.info(`Bulk queue started: ${kws.length} keywords`);
                        }}>
                        <Play className="w-3 h-3 mr-1" /> {bulkGenerating ? `${bulkIndex + 1}/${bulkQueue.length}` : "Generate All"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                        title="Check all rank alerts for this client"
                        disabled={checkRankAlerts.isPending}
                        onClick={() => checkRankAlerts.mutate({ crmClientId: agencyId })}>
                        {checkRankAlerts.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3 mr-1" />}
                        Check Alerts
                      </Button>
                    </div>
                  </div>
                  {/* Keyword list — flat or clustered, filtered by difficulty */}
                  {(() => {
                    const allRows = savedKeywords.data as any[];
                    const rows = allRows.filter((kw: any) => {
                      const d = kw.difficulty ?? 50;
                      return d >= difficultyFilter[0] && d <= difficultyFilter[1];
                    });
                    const KwRow = ({ kw }: { kw: any }) => {
                      const diff = kw.difficulty;
                      const vol = kw.searchVolume;
                      const diffColor = diff == null ? "" : diff <= 30 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : diff <= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
                      return (
                        <div key={kw.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted gap-2">
                          <span className="font-medium truncate flex-1">{kw.keyword}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {vol != null && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                                {vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : vol}/mo
                              </Badge>
                            )}
                            {diff != null && (
                              <Badge className={`text-xs px-1.5 py-0 h-5 border-0 ${diffColor}`}>D:{diff}</Badge>
                            )}
                            <button title="Generate content for this keyword"
                              className="p-0.5 rounded hover:bg-green-100 dark:hover:bg-green-900 text-green-600 transition-colors"
                              onClick={() => { setGenerateFromKeyword(kw.keyword); setFixThisIssue(null); setBulkGenerating(false); }}>
                              <Sparkles className="w-3 h-3" />
                            </button>
                            <button title="Track keyword ranking"
                              className={`p-0.5 rounded transition-colors ${rankingKeywordId === kw.id ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900' : 'hover:bg-indigo-100 dark:hover:bg-indigo-900 text-muted-foreground hover:text-indigo-600'}`}
                              onClick={() => setRankingKeywordId(rankingKeywordId === kw.id ? null : kw.id)}>
                              <BarChart2 className="w-3 h-3" />
                            </button>
                            <button title="Remove keyword"
                              className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900 text-muted-foreground hover:text-red-600 transition-colors"
                              disabled={deleteKeyword.isPending}
                              onClick={() => deleteKeyword.mutate({ id: kw.id })}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    };

                    if (!groupByCluster) {
                      return (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                          {rows.map((kw: any) => <KwRow key={kw.id} kw={kw} />)}
                        </div>
                      );
                    }

                    // Build clusters: group by first 2 significant words
                    const clusters: Record<string, any[]> = {};
                    rows.forEach((kw: any) => {
                      const words = kw.keyword.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter((w: string) => w.length > 3);
                      const clusterKey = words.slice(0, 2).join(" ") || "Other";
                      if (!clusters[clusterKey]) clusters[clusterKey] = [];
                      clusters[clusterKey].push(kw);
                    });

                    return (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {Object.entries(clusters).map(([cluster, kws]) => (
                          <div key={cluster}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Layers className="w-3 h-3 text-green-600" />
                              <span className="text-xs font-semibold text-green-700 dark:text-green-400 capitalize">{cluster}</span>
                              <Badge variant="outline" className="text-xs px-1 py-0 h-4">{kws.length}</Badge>
                            </div>
                            <div className="space-y-1 pl-2 border-l-2 border-green-200 dark:border-green-800">
                              {kws.map((kw: any) => <KwRow key={kw.id} kw={kw} />)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
              {/* Rank tracking mini panel */}
              {rankingKeywordId && (() => {
                const kw = (savedKeywords.data as any[])?.find((k: any) => k.id === rankingKeywordId);
                if (!kw) return null;
                const snaps = (rankSnapshots.data as any[] | undefined)?.filter((s: any) => s.savedKeywordId === rankingKeywordId) ?? [];
                return (
                  <div className="mt-3 p-3 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50 dark:bg-indigo-950 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200 flex items-center gap-1">
                        <BarChart2 className="w-3 h-3" /> Rank Tracking: <span className="italic truncate max-w-32">"{kw.keyword}"</span>
                      </p>
                      <button className="text-muted-foreground hover:text-foreground" onClick={() => setRankingKeywordId(null)}>
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="h-7 text-xs" variant="outline"
                        disabled={addRankSnapshot.isPending}
                        onClick={() => {
                          const pos = Math.floor(Math.random() * 80) + 5;
                          addRankSnapshot.mutate({ savedKeywordId: rankingKeywordId, position: pos, keyword: kw.keyword, crmClientId: agencyId });
                        }}>
                        {addRankSnapshot.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3 mr-1" />}
                        Record Position
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                        disabled={fetchLiveRankings.isPending}
                        onClick={() => fetchLiveRankings.mutate({ crmClientId: agencyId, keywords: [kw.keyword] })}>
                        {fetchLiveRankings.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />}
                        Fetch Live Rankings
                      </Button>
                      <span className="text-xs text-muted-foreground self-center">({snaps.length} snapshots)</span>
                    </div>
                    {liveRankingsData.length > 0 && liveRankingsData.find((r: any) => r.keyword === kw.keyword) && (() => {
                      const live = liveRankingsData.find((r: any) => r.keyword === kw.keyword);
                      return (
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                          <p className="text-[10px] font-semibold text-indigo-800 dark:text-indigo-200 mb-1">📡 Live SERP Data (Google Search Console)</p>
                          <div className="grid grid-cols-4 gap-1 text-center">
                            <div><p className="text-[9px] text-muted-foreground">Position</p><p className="text-xs font-bold text-indigo-600">#{live.position}</p></div>
                            <div><p className="text-[9px] text-muted-foreground">Impressions</p><p className="text-xs font-bold">{live.impressions?.toLocaleString()}</p></div>
                            <div><p className="text-[9px] text-muted-foreground">Clicks</p><p className="text-xs font-bold">{live.clicks?.toLocaleString()}</p></div>
                            <div><p className="text-[9px] text-muted-foreground">CTR</p><p className="text-xs font-bold">{((live.ctr ?? 0) * 100).toFixed(1)}%</p></div>
                          </div>
                        </div>
                      );
                    })()}
                    {snaps.length >= 2 && (() => {
                      const chartData = snaps.slice().reverse().map((s: any) => ({
                        date: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        position: s.position,
                      }));
                      return (
                        <div className="mt-1">
                          <p className="text-[10px] text-muted-foreground mb-1">Position trend (lower = better)</p>
                          <ResponsiveContainer width="100%" height={80}>
                            <LineChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -28 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" />
                              <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                              <YAxis reversed tick={{ fontSize: 8 }} />
                              <Tooltip
                                contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                                formatter={(v: any) => [`#${v}`, 'Position']}
                              />
                              <Line type="monotone" dataKey="position" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                    {snaps.length > 0 && (
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {snaps.slice().reverse().map((s: any, i: number) => {
                          const prev = snaps.slice().reverse()[i + 1];
                          const delta = prev ? s.position - prev.position : null;
                          return (
                            <div key={s.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-white dark:bg-black gap-2">
                              <span className="text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</span>
                              <span className={`font-bold ${s.position <= 10 ? 'text-green-600' : s.position <= 30 ? 'text-yellow-600' : 'text-red-600'}`}>#{s.position}</span>
                              {delta != null && (
                                <span className={`font-semibold ${delta < 0 ? 'text-green-600' : delta > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {delta < 0 ? `↑${Math.abs(delta)}` : delta > 0 ? `↓${delta}` : '—'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {snaps.length === 0 && <p className="text-xs text-muted-foreground">No rank snapshots yet. Click Record Position to add the first one.</p>}
                    {/* Rank Alert Section */}
                    <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-700">
                      <p className="text-[10px] font-semibold text-indigo-800 dark:text-indigo-200 mb-1.5 flex items-center gap-1">
                        <Bell className="w-3 h-3" /> Rank Drop Alert
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">Alert if rank drops below</span>
                        <input
                          type="number" min={1} max={100}
                          value={rankAlertThreshold[rankingKeywordId] ?? 10}
                          onChange={(e) => setRankAlertThreshold(prev => ({ ...prev, [rankingKeywordId]: Number(e.target.value) }))}
                          className="w-12 h-6 text-xs text-center border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-black px-1"
                        />
                        <span className="text-[10px] text-muted-foreground">(position #)</span>
                        {rankAlertActive[rankingKeywordId] ? (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] border-red-300 text-red-600 hover:bg-red-50 px-2"
                            disabled={deleteRankAlert.isPending}
                            onClick={() => deleteRankAlert.mutate({ savedKeywordId: rankingKeywordId })}>
                            {deleteRankAlert.isPending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <BellOff className="w-2.5 h-2.5 mr-1" />}
                            Remove Alert
                          </Button>
                        ) : (
                          <Button size="sm" className="h-6 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2"
                            disabled={setRankAlert.isPending}
                            onClick={() => setRankAlert.mutate({
                              savedKeywordId: rankingKeywordId,
                              crmClientId: agencyId,
                              keyword: kw.keyword,
                              thresholdPosition: rankAlertThreshold[rankingKeywordId] ?? 10,
                            })}>
                            {setRankAlert.isPending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Bell className="w-2.5 h-2.5 mr-1" />}
                            Set Alert
                          </Button>
                        )}
                        {rankAlertActive[rankingKeywordId] && (
                          <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                      </div>
                      {rankAlertActive[rankingKeywordId] && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          You'll receive a push notification + email if this keyword drops below position #{rankAlertThreshold[rankingKeywordId] ?? 10}.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Client Portal Invite */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <Key className="w-5 h-5" />
            Client SEO Portal Invite
          </CardTitle>
          <CardDescription>Send {agencyName} access to review and approve their SEO content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input type="email" placeholder="client@email.com" value={portalInviteEmail} onChange={(e) => setPortalInviteEmail(e.target.value)} />
            <Button disabled={!portalInviteEmail || sendPortalInvite.isPending}
              onClick={() => sendPortalInvite.mutate({ crmClientId: agencyId, email: portalInviteEmail, name: agencyName, origin: window.location.origin })}>
              {sendPortalInvite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">The client will receive an email with a link to their branded SEO content portal to approve, reject, or comment on content.</p>
        </CardContent>
      </Card>

      {/* Budget Tracking */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <DollarSign className="w-5 h-5" />
            SEO Budget Tracking
          </CardTitle>
          <CardDescription>Track AI content generation costs for this client this month.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {getBudget.isPending || budgetData === undefined ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading this month's cost…
            </div>
          ) : budgetData ? (
            <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">${budgetData.monthlyCost.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">AI generation cost this month</p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => getBudget.mutate({ crmClientId: agencyId })} disabled={getBudget.isPending}>
                  <Loader2 className={`w-3 h-3 mr-1 ${getBudget.isPending ? "animate-spin" : "hidden"}`} /> Refresh
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/seo/analytics" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" /> Full Analytics
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No SEO activity recorded this month for this client.</p>
              <Button variant="outline" size="sm" onClick={() => getBudget.mutate({ crmClientId: agencyId })} disabled={getBudget.isPending}>
                <Loader2 className={`w-3 h-3 mr-1 ${getBudget.isPending ? "animate-spin" : "hidden"}`} /> Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Fix This Issue — inline panel */}
    {fixThisIssue && (
      <div className="mt-4 p-4 border border-orange-300 dark:border-orange-700 rounded-xl bg-orange-50 dark:bg-orange-950 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Fix This SEO Issue
          </p>
          <button className="text-muted-foreground hover:text-foreground" onClick={() => setFixThisIssue(null)}>
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Use this prompt in the <strong>AI SEO Content</strong> panel on any Lead page to generate targeted content that addresses this specific issue.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={fixThisIssue} className="bg-white dark:bg-black font-mono text-sm" />
          <Button size="sm" variant="outline" onClick={() => {
            navigator.clipboard.writeText(fixThisIssue);
            toast.success("Prompt copied to clipboard!");
          }}>Copy</Button>
        </div>
      </div>
    )}

    {/* Audit Comparison Panel */}
    {compareAudit && auditResult && (
      <div className="mt-4 p-4 border border-blue-300 dark:border-blue-700 rounded-xl bg-blue-50 dark:bg-blue-950 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            Audit Comparison
          </p>
          <button className="text-muted-foreground hover:text-foreground" onClick={() => setCompareAudit(null)}>
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Past audit column */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground text-center">Past ({new Date(compareAudit.createdAt).toLocaleDateString()})</p>
            {[
              { label: "Overall", past: compareAudit.overallScore, current: auditResult.overallScore },
              { label: "SEO", past: compareAudit.seoScore, current: auditResult.seoScore },
              { label: "Readability", past: compareAudit.readabilityScore, current: auditResult.readabilityScore },
              { label: "Technical", past: compareAudit.technicalSeoScore, current: auditResult.technicalSeoScore },
            ].map(({ label, past, current }) => {
              const delta = current != null && past != null ? current - past : null;
              return (
                <div key={label} className="flex items-center justify-between text-xs p-1.5 rounded bg-white dark:bg-black gap-2">
                  <span className="text-muted-foreground w-20">{label}</span>
                  <span className="font-medium">{past ?? "—"}</span>
                  <span className="font-bold text-blue-600">→ {current ?? "—"}</span>
                  {delta != null && (
                    <span className={`font-semibold text-xs ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Issues diff column */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground text-center">Issue Changes</p>
            {(() => {
              const pastIssues: string[] = Array.isArray(compareAudit.issues) ? compareAudit.issues.map((i: any) => i.message || String(i)) : [];
              const currentIssues: string[] = Array.isArray(auditResult.issues) ? auditResult.issues.map((i: any) => i.message || String(i)) : [];
              const resolved = pastIssues.filter(m => !currentIssues.includes(m));
              const newIssues = currentIssues.filter(m => !pastIssues.includes(m));
              return (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {resolved.length === 0 && newIssues.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No changes in issues</p>
                  )}
                  {resolved.map((m, i) => (
                    <div key={`r${i}`} className="flex items-start gap-1 text-xs text-green-700 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{m}</span>
                    </div>
                  ))}
                  {newIssues.map((m, i) => (
                    <div key={`n${i}`} className="flex items-start gap-1 text-xs text-red-700 dark:text-red-400">
                      <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{m}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    )}

    {/* Generate Content from Keyword — inline panel */}
    {generateFromKeyword && (
      <div className="mt-4 p-4 border border-green-300 dark:border-green-700 rounded-xl bg-green-50 dark:bg-green-950 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Generate Content for: <span className="italic">"{generateFromKeyword}"</span>
          </p>
          <button className="text-muted-foreground hover:text-foreground" onClick={() => setGenerateFromKeyword(null)}>
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Head to the <strong>Leads</strong> page, open any lead, and use the <strong>AI SEO Content</strong> panel. The keyword <strong>"{generateFromKeyword}"</strong> has been copied below — paste it as the target niche/topic to generate a full SEO article, video script, or social post.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={generateFromKeyword} className="bg-white dark:bg-black font-mono text-sm" />
          <Button size="sm" variant="outline" onClick={() => {
            navigator.clipboard.writeText(generateFromKeyword);
            toast.success("Keyword copied to clipboard!");
          }}>
            Copy
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Tip: You can also go directly to the SEO Portal's Content Generation page and use this keyword as the topic.</p>
        {bulkGenerating && bulkQueue.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-green-200 dark:border-green-800">
            <span className="text-xs text-muted-foreground">Bulk queue: {bulkIndex + 1} of {bulkQueue.length}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs"
                disabled={bulkIndex >= bulkQueue.length - 1}
                onClick={() => {
                  const next = bulkIndex + 1;
                  if (next < bulkQueue.length) {
                    setBulkIndex(next);
                    setGenerateFromKeyword(bulkQueue[next]);
                  } else {
                    setBulkGenerating(false);
                    toast.success("Bulk queue complete!");
                  }
                }}>
                Next Keyword →
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                onClick={() => { setBulkGenerating(false); setBulkQueue([]); setGenerateFromKeyword(null); }}>
                Stop
              </Button>
            </div>
          </div>
        )}
      </div>
    )}
    {/* Content Calendar Panel */}
    {showCalendar && calendarKeywords.length > 0 && (
      <div className="mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded-xl bg-indigo-50 dark:bg-indigo-950 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            30-Day Content Calendar — {calendarKeywords.length} keywords
          </p>
          <button className="text-muted-foreground hover:text-foreground" onClick={() => setShowCalendar(false)}>
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Each keyword is assigned a suggested publish date spread evenly across the next 30 days. Click a keyword to open the content generator.</p>
        {/* 5-column week grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {calendarKeywords.map((kw, i) => {
            const publishDate = new Date();
            publishDate.setDate(publishDate.getDate() + Math.floor((i / calendarKeywords.length) * 30) + 1);
            const dayLabel = publishDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const weekNum = Math.floor(i / 5) + 1;
            const colors = [
              "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200",
              "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-200",
              "bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200",
              "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-200",
              "bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900 dark:border-pink-700 dark:text-pink-200",
              "bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900 dark:border-teal-700 dark:text-teal-200",
            ];
            const colorClass = colors[(weekNum - 1) % colors.length];
            return (
              <button
                key={i}
                title={`Generate content for: ${kw}`}
                className={`text-left p-2 rounded-lg border text-xs transition-all hover:scale-105 hover:shadow-sm ${colorClass}`}
                onClick={() => { setGenerateFromKeyword(kw); setFixThisIssue(null); setBulkGenerating(false); }}>
                <div className="font-semibold text-xs opacity-70 mb-0.5">{dayLabel}</div>
                <div className="font-medium line-clamp-2 leading-tight">{kw}</div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-indigo-200 dark:border-indigo-800">
          <span className="text-xs text-muted-foreground">Click any card to open the content generator for that keyword</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={exportICS}>
              <Download className="w-3 h-3 mr-1" /> Export .ics
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              disabled={generateCalendarPDF.isPending}
              onClick={() => {
                const kwsWithDates = calendarKeywords.map((kw, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + Math.floor((i / calendarKeywords.length) * 30) + 1);
                  const savedKw = (savedKeywords.data as any[] | undefined)?.find((s: any) => s.keyword === kw);
                  return {
                    keyword: kw,
                    publishDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    searchVolume: savedKw?.searchVolume ?? null,
                    difficulty: savedKw?.difficulty ?? null,
                  };
                });
                generateCalendarPDF.mutate({
                  crmClientId: agencyId,
                  clientName: agencyName,
                  keywords: kwsWithDates,
                });
              }}>
              {generateCalendarPDF.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
              Export PDF
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => {
                setBulkQueue(calendarKeywords);
                setBulkIndex(0);
                setBulkGenerating(true);
                setGenerateFromKeyword(calendarKeywords[0]);
                setFixThisIssue(null);
                setShowCalendar(false);
              }}>
              <Play className="w-3 h-3 mr-1" /> Start Bulk Generation
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* ─── Content Brief Modal ─── */}
    {showBriefModal && activeBrief && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowBriefModal(false)}>
        <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-start justify-between gap-4 rounded-t-2xl">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Content Brief</span>
                {activeBrief.searchIntent && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    activeBrief.searchIntent === 'transactional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : activeBrief.searchIntent === 'informational' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                    : activeBrief.searchIntent === 'commercial' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>{activeBrief.searchIntent}</span>
                )}
              </div>
              <h2 className="text-lg font-bold text-foreground leading-tight">{activeBrief.keyword}</h2>
              {activeBrief.competitorDomain && (
                <p className="text-xs text-muted-foreground mt-0.5">Gap from: {activeBrief.competitorDomain}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                title="Copy brief to clipboard"
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-muted"
                onClick={() => {
                  const text = [
                    `CONTENT BRIEF: ${activeBrief.keyword}`,
                    `Intent: ${activeBrief.searchIntent}`,
                    `Target Audience: ${activeBrief.targetAudience}`,
                    ``,
                    `RECOMMENDED TITLE:`,
                    activeBrief.recommendedTitle,
                    ``,
                    `WORD COUNT TARGET: ${activeBrief.recommendedWordCount} words`,
                    ``,
                    `SUGGESTED HEADINGS:`,
                    ...(activeBrief.headings ?? []).map((h: string, i: number) => `${i + 1}. ${h}`),
                    ``,
                    `WRITING BRIEF:`,
                    activeBrief.writingBrief,
                    ``,
                    `CALL TO ACTION:`,
                    activeBrief.callToAction,
                    ``,
                    `INTERNAL LINK OPPORTUNITIES:`,
                    ...(activeBrief.internalLinks ?? []).map((l: string) => `• ${l}`),
                    ``,
                    `SEO TIPS:`,
                    ...(activeBrief.seoTips ?? []).map((t: string) => `• ${t}`),
                  ].join('\n');
                  navigator.clipboard.writeText(text).then(() => toast.success('Brief copied to clipboard!'));
                }}>
                <ClipboardCopy className="w-4 h-4" />
              </button>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-muted"
                onClick={() => setShowBriefModal(false)}>
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Recommended Title */}
            {activeBrief.recommendedTitle && (
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Recommended H1 Title</p>
                <p className="text-sm font-semibold text-foreground">{activeBrief.recommendedTitle}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Target word count: <strong>{activeBrief.recommendedWordCount?.toLocaleString()} words</strong></p>
              </div>
            )}

            {/* Target Audience */}
            {activeBrief.targetAudience && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-muted-foreground" /> Target Audience</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{activeBrief.targetAudience}</p>
              </div>
            )}

            {/* Writing Brief */}
            {activeBrief.writingBrief && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-muted-foreground" /> Writing Brief</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{activeBrief.writingBrief}</p>
              </div>
            )}

            {/* Suggested Headings */}
            {activeBrief.headings?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-muted-foreground" /> Suggested Headings ({activeBrief.headings.length})</p>
                <div className="space-y-1">
                  {activeBrief.headings.map((h: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Call to Action */}
            {activeBrief.callToAction && (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Primary Call to Action</p>
                <p className="text-sm font-medium text-foreground">{activeBrief.callToAction}</p>
              </div>
            )}

            {/* Internal Links */}
            {activeBrief.internalLinks?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Link2 className="w-3.5 h-3.5 text-muted-foreground" /> Internal Link Opportunities ({activeBrief.internalLinks.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeBrief.internalLinks.map((l: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* SEO Tips */}
            {activeBrief.seoTips?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5 text-yellow-500" /> SEO Tips ({activeBrief.seoTips.length})</p>
                <div className="space-y-1.5">
                  {activeBrief.seoTips.map((tip: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                      <span className="text-yellow-600 font-bold text-xs shrink-0 mt-0.5">{i + 1}.</span>
                      <span className="text-muted-foreground">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-background border-t border-border px-6 py-3 flex gap-2 rounded-b-2xl">
            <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                const text = [
                  `CONTENT BRIEF: ${activeBrief.keyword}`,
                  `Intent: ${activeBrief.searchIntent}`,
                  `Target Audience: ${activeBrief.targetAudience}`,
                  ``,
                  `RECOMMENDED TITLE:`,
                  activeBrief.recommendedTitle,
                  ``,
                  `WORD COUNT TARGET: ${activeBrief.recommendedWordCount} words`,
                  ``,
                  `SUGGESTED HEADINGS:`,
                  ...(activeBrief.headings ?? []).map((h: string, i: number) => `${i + 1}. ${h}`),
                  ``,
                  `WRITING BRIEF:`,
                  activeBrief.writingBrief,
                  ``,
                  `CALL TO ACTION:`,
                  activeBrief.callToAction,
                  ``,
                  `INTERNAL LINK OPPORTUNITIES:`,
                  ...(activeBrief.internalLinks ?? []).map((l: string) => `• ${l}`),
                  ``,
                  `SEO TIPS:`,
                  ...(activeBrief.seoTips ?? []).map((t: string) => `• ${t}`),
                ].join('\n');
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `content-brief-${activeBrief.keyword.replace(/\s+/g, '-').toLowerCase()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Brief downloaded!');
              }}>
              <Download className="w-3.5 h-3.5 mr-1" /> Download Brief
            </Button>
            <Button size="sm" variant="outline" className="flex-1"
              onClick={() => {
                const text = [
                  `CONTENT BRIEF: ${activeBrief.keyword}`,
                  `Intent: ${activeBrief.searchIntent}`,
                  `Target Audience: ${activeBrief.targetAudience}`,
                  ``,
                  `RECOMMENDED TITLE: ${activeBrief.recommendedTitle}`,
                  `WORD COUNT: ${activeBrief.recommendedWordCount} words`,
                  ``,
                  `HEADINGS:`,
                  ...(activeBrief.headings ?? []).map((h: string, i: number) => `${i + 1}. ${h}`),
                  ``,
                  `WRITING BRIEF: ${activeBrief.writingBrief}`,
                  `CTA: ${activeBrief.callToAction}`,
                  ``,
                  `INTERNAL LINKS: ${(activeBrief.internalLinks ?? []).join(', ')}`,
                  `SEO TIPS: ${(activeBrief.seoTips ?? []).join(' | ')}`,
                ].join('\n');
                navigator.clipboard.writeText(text).then(() => toast.success('Brief copied!'));
              }}>
              <ClipboardCopy className="w-3.5 h-3.5 mr-1" /> Copy All
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* ─── Brief History Panel ─── */}
    {showBriefHistory && (contentBriefs.data?.length ?? 0) > 0 && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowBriefHistory(false)}>
        <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-semibold">Saved Content Briefs ({contentBriefs.data?.length})</h3>
            </div>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setShowBriefHistory(false)}>
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {contentBriefs.data?.map((brief: any) => (
              <button
                key={brief.id}
                className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                onClick={() => { setActiveBrief(brief); setShowBriefModal(true); setShowBriefHistory(false); }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{brief.keyword}</p>
                    {brief.recommendedTitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{brief.recommendedTitle}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {brief.searchIntent && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        brief.searchIntent === 'transactional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : brief.searchIntent === 'informational' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>{brief.searchIntent}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{new Date(brief.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {brief.competitorDomain && (
                  <p className="text-[10px] text-muted-foreground mt-1">Gap from: {brief.competitorDomain}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ─── AI Content Hub Panel ─── */}
    {showContentHub && (
      <div className="mt-4 p-4 border border-violet-200 dark:border-violet-800 rounded-xl bg-violet-50/50 dark:bg-violet-950/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-semibold text-violet-800 dark:text-violet-200">AI Content Hub</h3>
            <Badge className="text-[10px] bg-violet-600 text-white">BETA</Badge>
          </div>
          <div className="flex gap-1">
            <button
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${contentHubTab === 'packages' ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:bg-muted'}`}
              onClick={() => setContentHubTab('packages')}>
              Packages
            </button>
            <button
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${contentHubTab === 'setup' ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:bg-muted'}`}
              onClick={() => setContentHubTab('setup')}>
              Setup
            </button>
          </div>
        </div>

        {/* Packages Tab */}
        {contentHubTab === 'packages' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Generate a full content package (blog + 60s video script + social captions + email newsletter) for any saved keyword. One package at a time — approve before generating the next.</p>
            </div>

            {/* Generate new package */}
            {(() => {
              const pendingPkg = (contentPackages.data as any[] | undefined)?.find((p: any) => p.status === 'pending_approval' || p.status === 'generating' || p.status === 'video_rendering');
              const canGenerate = !pendingPkg;
              const savedKws = (savedKeywords.data as any[] | undefined) ?? [];
              return (
                <div className="space-y-2">
                  {pendingPkg && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Package for <strong>"{pendingPkg.keyword}"</strong> is {pendingPkg.status === 'generating' ? 'generating content...' : pendingPkg.status === 'video_rendering' ? 'rendering video...' : 'awaiting your approval'}. Approve or reject it before generating the next one.</span>
                    </div>
                  )}
                  {canGenerate && savedKws.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <p className="text-xs text-muted-foreground w-full mb-1">Select a keyword to generate a package:</p>
                      {savedKws.slice(0, 10).map((kw: any) => (
                        <button
                          key={kw.id}
                          disabled={generateContentPackage.isPending || !seoClientId}
                          onClick={() => {
                            if (!seoClientId) { toast.error('SEO client not linked yet — run an audit first.'); return; }
                            generateContentPackage.mutate({ clientId: seoClientId, keyword: kw.keyword, crmClientId: agencyId });
                          }}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-violet-300 bg-white dark:bg-black hover:bg-violet-50 dark:hover:bg-violet-950 text-violet-700 dark:text-violet-300 disabled:opacity-50 transition-colors">
                          {generateContentPackage.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {kw.keyword}
                        </button>
                      ))}
                    </div>
                  )}
                  {canGenerate && savedKws.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Save keywords first to generate content packages.</p>
                  )}
                </div>
              );
            })()}

            {/* Package list */}
            {contentPackages.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading packages...</div>
            ) : (contentPackages.data as any[] | undefined)?.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No packages generated yet.</p>
            ) : (
              <div className="space-y-2">
                {(contentPackages.data as any[] | undefined)?.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between p-2 border rounded-lg bg-white dark:bg-black hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setActivePackage(pkg)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        pkg.status === 'approved' ? 'bg-green-500' :
                        pkg.status === 'rejected' ? 'bg-red-500' :
                        pkg.status === 'pending_approval' ? 'bg-amber-500' :
                        pkg.status === 'video_rendering' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{pkg.keyword}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(pkg.createdAt).toLocaleDateString()} &middot; {pkg.status.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {pkg.videoUrl && <Badge className="text-[9px] bg-blue-600 text-white px-1">Video</Badge>}
                      {pkg.blogContent && <Badge className="text-[9px] bg-green-600 text-white px-1">Blog</Badge>}
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Setup Tab */}
        {contentHubTab === 'setup' && (
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">HeyGen Avatar ID</Label>
                <p className="text-[10px] text-muted-foreground mb-1">Find this in your HeyGen dashboard under Avatars. Leave blank to use a stock avatar.</p>
                <div className="flex gap-2">
                  <Input
                    className="h-7 text-xs"
                    placeholder="e.g. avatar_abc123"
                    value={heygenAvatarIdInput}
                    onChange={(e) => setHeygenAvatarIdInput(e.target.value)}
                  />
                  {heygenAvatars.data && (
                    <Select value={heygenAvatarIdInput} onValueChange={setHeygenAvatarIdInput}>
                      <SelectTrigger className="h-7 text-xs w-32">
                        <SelectValue placeholder="Pick" />
                      </SelectTrigger>
                      <SelectContent>
                        {(heygenAvatars.data as any[]).map((a: any) => (
                          <SelectItem key={a.avatar_id} value={a.avatar_id}>{a.avatar_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">HeyGen Voice ID</Label>
                <p className="text-[10px] text-muted-foreground mb-1">The voice the avatar will use. Leave blank to use the avatar's default voice.</p>
                <div className="flex gap-2">
                  <Input
                    className="h-7 text-xs"
                    placeholder="e.g. voice_xyz789"
                    value={heygenVoiceIdInput}
                    onChange={(e) => setHeygenVoiceIdInput(e.target.value)}
                  />
                  {heygenVoices.data && (
                    <Select value={heygenVoiceIdInput} onValueChange={setHeygenVoiceIdInput}>
                      <SelectTrigger className="h-7 text-xs w-32">
                        <SelectValue placeholder="Pick" />
                      </SelectTrigger>
                      <SelectContent>
                        {(heygenVoices.data as any[]).map((v: any) => (
                          <SelectItem key={v.voice_id} value={v.voice_id}>{v.display_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">Video Format</Label>
                <Select value={heygenVideoFormatInput} onValueChange={(v: any) => setHeygenVideoFormatInput(v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait 9:16 (Shorts / Reels)</SelectItem>
                    <SelectItem value="landscape">Landscape 16:9 (YouTube)</SelectItem>
                    <SelectItem value="square">Square 1:1 (Instagram)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {heygenQuota.data && (
                <div className="p-2 bg-muted rounded-lg text-xs">
                  <p className="font-medium">HeyGen Quota</p>
                  <p className="text-muted-foreground">Remaining credits: {(heygenQuota.data as any).remaining_quota ?? 'N/A'}</p>
                </div>
              )}
            </div>
            <Button
              size="sm"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              disabled={saveContentHubSetup.isPending || !seoClientId}
              onClick={() => {
                if (!seoClientId) { toast.error('SEO client not linked yet — run an audit first.'); return; }
                saveContentHubSetup.mutate({
                  id: seoClientId,
                  heygenAvatarId: heygenAvatarIdInput || undefined,
                  heygenVoiceId: heygenVoiceIdInput || undefined,
                  heygenVideoFormat: heygenVideoFormatInput,
                  contentHubEnabled: true,
                });
              }}>
              {saveContentHubSetup.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Save Content Hub Settings
            </Button>
          </div>
        )}
      </div>
    )}

    {/* ─── Package Detail Modal ─── */}
    {activePackage && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setActivePackage(null)}>
        <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{activePackage.keyword}</h2>
                <p className="text-xs text-muted-foreground">{new Date(activePackage.createdAt).toLocaleDateString()} &middot; <span className="capitalize">{activePackage.status.replace(/_/g, ' ')}</span></p>
              </div>
              <button onClick={() => setActivePackage(null)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Blog Post */}
            {activePackage.blogContent && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-semibold">Blog Post</p>
                  <button
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => { navigator.clipboard.writeText(activePackage.blogContent); toast.success('Blog copied!'); }}>
                    <ClipboardCopy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="text-xs bg-muted rounded-lg p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">{activePackage.blogContent}</div>
              </div>
            )}

            {/* Video Script */}
            {activePackage.videoScript && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold">60s Video Script</p>
                  <button
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => { navigator.clipboard.writeText(activePackage.videoScript); toast.success('Script copied!'); }}>
                    <ClipboardCopy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="text-xs bg-muted rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">{activePackage.videoScript}</div>
              </div>
            )}

            {/* Social Captions */}
            {activePackage.socialCaptions && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-semibold">Social Captions</p>
                  <button
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(activePackage.socialCaptions, null, 2)); toast.success('Captions copied!'); }}>
                    <ClipboardCopy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="grid gap-1">
                  {Object.entries(activePackage.socialCaptions as Record<string, string>).map(([platform, caption]) => (
                    <div key={platform} className="text-xs bg-muted rounded p-2">
                      <span className="font-semibold capitalize">{platform}:</span> {caption as string}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email Newsletter */}
            {activePackage.emailNewsletter && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-semibold">Email Newsletter</p>
                  <button
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => { navigator.clipboard.writeText(activePackage.emailNewsletter); toast.success('Newsletter copied!'); }}>
                    <ClipboardCopy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="text-xs bg-muted rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">{activePackage.emailNewsletter}</div>
              </div>
            )}

            {/* HeyGen Video */}
            {activePackage.videoUrl ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold">HeyGen Video</p>
                  <a href={activePackage.videoUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> View Video
                  </a>
                </div>
              </div>
            ) : activePackage.heygenVideoId ? (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                Video is rendering in HeyGen... (auto-refreshes every 30s)
              </div>
            ) : null}

            {/* Approval Actions */}
            {activePackage.status === 'pending_approval' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={approveContentPackage.isPending}
                  onClick={() => approveContentPackage.mutate({ packageId: activePackage.id })}>
                  {approveContentPackage.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                  Approve Package
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  disabled={rejectContentPackage.isPending}
                  onClick={() => rejectContentPackage.mutate({ packageId: activePackage.id })}>
                  {rejectContentPackage.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                  Reject
                </Button>
              </div>
            )}
            {activePackage.status === 'approved' && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-800 dark:text-green-200">
                <CheckCircle className="w-3 h-3" />
                Approved — content is ready to publish via the CRM scheduler.
              </div>
            )}
          </div>
        </div>
      </div>
    )}
     </>
  );
}
