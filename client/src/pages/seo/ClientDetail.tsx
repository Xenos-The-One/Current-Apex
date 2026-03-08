import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User,
  Building2,
  Globe,
  Lock,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Save,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  DollarSign,
  AlertCircle,
  UserPlus,
  Copy,
  Trash2,
  Palette,
  BarChart,
  Plus,
  Target,
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  Wand2,
  Megaphone,
  FileDown,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { WordPressConnections } from "@/components/WordPressConnections";
import { ManusWebsites } from "@/components/ManusWebsites";

export default function ClientDetail() {
  const params = useParams<{ id: string }>();
  const clientId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const { data: client, isLoading, refetch } = trpc.seo.clients.getById.useQuery(
    { id: clientId },
    { enabled: clientId > 0 }
  );
  const { data: contentList } = trpc.seo.content.list.useQuery();
  const { data: clientStats } = trpc.seo.clients.getClientStats.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const updateMutation = trpc.seo.clients.update.useMutation();
  const generateBrandVoiceMutation = trpc.seo.clients.generateBrandVoice.useMutation({
    onSuccess: (data) => {
      setFormData((p: any) => ({ ...p, brandVoice: data.brandVoice }));
      toast.success("Brand voice generated! Review and save when ready.");
    },
    onError: (e) => toast.error("Generation failed: " + e.message),
  });
  const [customBrandVoiceUrl, setCustomBrandVoiceUrl] = useState("");
  const [showBrandVoiceUrlInput, setShowBrandVoiceUrlInput] = useState(false);
  const generateTargetAudienceMutation = trpc.seo.clients.generateTargetAudience.useMutation({
    onSuccess: (data) => {
      setFormData((p: any) => ({ ...p, targetAudience: data.targetAudience }));
      toast.success("Target audience generated! Review and save when ready.");
    },
    onError: (e) => toast.error("Generation failed: " + e.message),
  });
  const [customAudienceUrl, setCustomAudienceUrl] = useState("");
  const [showAudienceUrlInput, setShowAudienceUrlInput] = useState(false);

  // Brand voice history
  const { data: brandVoiceHistoryData, refetch: refetchHistory } = trpc.seo.clients.getBrandVoiceHistory.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const saveBrandVoiceHistoryMutation = trpc.seo.clients.saveBrandVoiceHistory.useMutation();
  const [showBrandVoiceHistory, setShowBrandVoiceHistory] = useState(false);

  const clientContent = contentList?.filter((c) => c.content.clientId === clientId) || [];
  const [contentStatusFilter, setContentStatusFilter] = useState<string>("all");
  const [reportLoading, setReportLoading] = useState(false);

  const { data: reportData } = trpc.seo.reports.getClientReport.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  const generateReport = () => {
    if (!reportData) {
      toast.error("Report data not loaded yet, please wait.");
      return;
    }
    setReportLoading(true);
    try {
      const r = reportData;
      const colors = r.client.companyColors
        ? r.client.companyColors.split(',').map((c: string) => c.trim()).filter(Boolean)
        : ['#00ffff', '#0d9488'];
      const primary = colors[0] || '#00ffff';
      const secondary = colors[1] || '#0d9488';
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${r.client.name} — SEO Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; }
    .cover { background: linear-gradient(135deg, #000f12 0%, #021214 100%); color: white; padding: 60px 48px; }
    .cover h1 { font-family: 'Space Grotesk', sans-serif; font-size: 36px; font-weight: 700; color: ${primary}; margin-bottom: 8px; }
    .cover h2 { font-size: 20px; font-weight: 400; opacity: 0.8; margin-bottom: 4px; }
    .cover .meta { font-size: 13px; opacity: 0.5; margin-top: 16px; }
    .brand-bar { height: 6px; background: linear-gradient(90deg, ${colors.join(', ')}); }
    .section { padding: 32px 48px; border-bottom: 1px solid #e2e8f0; }
    .section h3 { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 600; color: ${primary}; margin-bottom: 20px; border-left: 4px solid ${primary}; padding-left: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 8px; }
    .stat-card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); text-align: center; }
    .stat-card .val { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: ${primary}; }
    .stat-card .lbl { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 600; color: #475569; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    tr:hover td { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; }
    .badge-approved { background: #dcfce7; color: #166534; }
    .badge-draft { background: #f1f5f9; color: #475569; }
    .badge-in_progress { background: #fef9c3; color: #854d0e; }
    .footer { padding: 24px 48px; background: #000f12; color: #64748b; font-size: 12px; text-align: center; }
    .footer span { color: ${primary}; }
    @media print { body { background: white; } .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${r.client.name}</h1>
    <h2>${r.client.company || r.client.industry || 'SEO Performance Report'}</h2>
    <div class="meta">Generated ${new Date(r.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;·&nbsp; Powered by Takeoff Digital Solutions</div>
  </div>
  <div class="brand-bar"></div>

  <div class="section">
    <h3>Content Summary</h3>
    <div class="stats-grid">
      <div class="stat-card"><div class="val">${r.contentSummary.total}</div><div class="lbl">Total Pieces</div></div>
      <div class="stat-card"><div class="val">${r.contentSummary.statusCounts['approved'] || 0}</div><div class="lbl">Approved</div></div>
      <div class="stat-card"><div class="val">${r.contentSummary.avgQuality != null ? r.contentSummary.avgQuality + '%' : '—'}</div><div class="lbl">Avg Quality</div></div>
      <div class="stat-card"><div class="val">${r.contentSummary.totalViews.toLocaleString()}</div><div class="lbl">Total Views</div></div>
    </div>
  </div>

  ${r.adSummary.total > 0 ? `
  <div class="section">
    <h3>Ad Performance</h3>
    <div class="stats-grid">
      <div class="stat-card"><div class="val">${r.adSummary.total}</div><div class="lbl">Total Ads</div></div>
      <div class="stat-card"><div class="val">${r.adSummary.totalImpressions.toLocaleString()}</div><div class="lbl">Impressions</div></div>
      <div class="stat-card"><div class="val">${r.adSummary.totalClicks.toLocaleString()}</div><div class="lbl">Clicks</div></div>
      <div class="stat-card"><div class="val">$${r.adSummary.totalSpend.toFixed(2)}</div><div class="lbl">Total Spend</div></div>
    </div>
  </div>` : ''}

  ${r.topKeywords.length > 0 ? `
  <div class="section">
    <h3>Top Keywords (GSC)</h3>
    <table>
      <thead><tr><th>Keyword</th><th>Position</th><th>Clicks</th><th>Impressions</th><th>CTR</th></tr></thead>
      <tbody>
        ${r.topKeywords.map(k => `<tr><td>${k.query}</td><td>${k.position.toFixed(1)}</td><td>${k.clicks}</td><td>${k.impressions}</td><td>${(k.ctr * 100).toFixed(1)}%</td></tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${r.recentContent.length > 0 ? `
  <div class="section">
    <h3>Recent Content</h3>
    <table>
      <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Created</th></tr></thead>
      <tbody>
        ${r.recentContent.map(c => `<tr><td>${c.title}</td><td>${c.type || '—'}</td><td><span class="badge badge-${c.status}">${c.status}</span></td><td>${new Date(c.createdAt).toLocaleDateString()}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <div class="footer">Report generated by <span>Takeoff Digital Solutions AI SEO Portal</span> &nbsp;·&nbsp; ${new Date().getFullYear()}</div>
</body>
</html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${r.client.name.replace(/[^a-z0-9]/gi, '_')}_SEO_Report_${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded! Open the HTML file and use Ctrl+P to save as PDF.');
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (client) {
      setFormData({ ...client });
    }
  }, [client]);

  const handleSave = async () => {
    try {
      const { id, createdBy, createdAt, updatedAt, ...updates } = formData;
      // Save brand voice to history if it changed
      const prevBrandVoice = (client as any)?.brandVoice;
      if (updates.brandVoice && updates.brandVoice !== prevBrandVoice) {
        await saveBrandVoiceHistoryMutation.mutateAsync({
          clientId,
          brandVoice: updates.brandVoice,
          source: "manual",
        }).catch(() => {/* non-blocking */});
        refetchHistory();
      }
      await updateMutation.mutateAsync({ id: clientId, ...updates });
      toast.success("Client updated successfully!");
      setIsEditing(false);
      refetch();
    } catch {
      toast.error("Failed to update client");
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => setLocation("/seo/clients")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client not found</p>
        </div>
      </div>
    );
  }

  const renderField = (label: string, field: string, icon?: any, type = "text", placeholder = "") => {
    const Icon = icon;
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </Label>
        {isEditing ? (
          <Input
            type={type}
            value={formData[field] || ""}
            onChange={(e) => updateField(field, e.target.value)}
            placeholder={placeholder}
            className="bg-muted/30"
          />
        ) : (
          <p className="text-sm font-medium min-h-[20px]">
            {(() => {
              const val = client[field as keyof typeof client];
              if (val instanceof Date) return val.toLocaleDateString();
              return val || <span className="text-muted-foreground/50 italic">Not set</span>;
            })()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/seo/clients")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => { setIsEditing(false); setFormData({ ...client }); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => generateReport()}
                disabled={reportLoading}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                {reportLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Generate Report
              </Button>
              <Button onClick={() => setIsEditing(true)}>Edit Client</Button>
            </>
          )}
        </div>
      </div>

      {/* Client Name Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {client.name?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {client.company && (
                <Badge variant="outline" className="text-muted-foreground">
                  <Building2 className="h-3 w-3 mr-1" />
                  {client.company}
                </Badge>
              )}
              {client.industry && (
                <Badge variant="outline" className="text-muted-foreground">
                  {client.industry}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Per-client Stats Bar */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
        <Card className="p-2.5">
          <p className="text-[11px] text-muted-foreground leading-tight">Content</p>
          <p className="text-xl font-bold mt-0.5">{clientStats?.totalContent ?? clientContent.length}</p>
        </Card>
        <Card className="p-2.5">
          <p className="text-[11px] text-muted-foreground leading-tight">Approved</p>
          <p className="text-xl font-bold text-green-500 mt-0.5">{clientStats?.approvedContent ?? 0}</p>
        </Card>
        <Card className="p-2.5">
          <p className="text-[11px] text-muted-foreground leading-tight">In Progress</p>
          <p className="text-xl font-bold text-yellow-500 mt-0.5">{clientStats?.inProgressContent ?? 0}</p>
        </Card>
        <Card className="p-2.5">
          <p className="text-[11px] text-muted-foreground leading-tight">Drafts</p>
          <p className="text-xl font-bold text-muted-foreground mt-0.5">{clientStats?.draftContent ?? 0}</p>
        </Card>
        <Card className="p-2.5">
          <p className="text-[11px] text-muted-foreground leading-tight">Views</p>
          <p className="text-xl font-bold mt-0.5">{(clientStats?.totalViews ?? 0).toLocaleString()}</p>
        </Card>
        <Card className="p-2.5">
          <p className="text-[11px] text-muted-foreground leading-tight">Clicks</p>
          <p className="text-xl font-bold mt-0.5">{(clientStats?.totalClicks ?? 0).toLocaleString()}</p>
        </Card>
        <Card className="p-2.5">
          <p className="text-[11px] text-muted-foreground leading-tight">Avg Quality</p>
          <p className={`text-xl font-bold mt-0.5 ${
            clientStats?.avgQualityScore == null ? "text-muted-foreground" :
            clientStats.avgQualityScore >= 70 ? "text-green-500" :
            clientStats.avgQualityScore >= 40 ? "text-yellow-500" : "text-red-500"
          }`}>
            {clientStats?.avgQualityScore != null ? `${clientStats.avgQualityScore}` : "—"}
          </p>
        </Card>
      </div>

      {/* Tab definitions — used for both desktop pinned+more and mobile select */}
      {(() => {
        const allTabs = [
          { value: "contact", label: "Contact Info", icon: <User className="h-3.5 w-3.5" /> },
          { value: "business", label: "Business Info", icon: <Building2 className="h-3.5 w-3.5" /> },
          { value: "content", label: "Content", icon: <FileText className="h-3.5 w-3.5" />, badge: clientStats?.totalContent ?? undefined },
          { value: "seo-strategy", label: "SEO & Strategy", icon: <Target className="h-3.5 w-3.5" /> },
          { value: "ad-accounts", label: "Ad Accounts", icon: <Megaphone className="h-3.5 w-3.5" /> },
          { value: "branding", label: "Branding", icon: <Palette className="h-3.5 w-3.5" /> },
          { value: "website", label: "Website Login", icon: <Lock className="h-3.5 w-3.5" /> },
          { value: "social", label: "Social Media", icon: <Globe className="h-3.5 w-3.5" /> },
          { value: "budget", label: "Budget", icon: <DollarSign className="h-3.5 w-3.5" /> },
          { value: "portal", label: "Portal Access", icon: <Lock className="h-3.5 w-3.5" /> },
          { value: "analytics", label: "Analytics", icon: <BarChart className="h-3.5 w-3.5" /> },
          { value: "wordpress", label: "WordPress", icon: <Globe className="h-3.5 w-3.5" /> },
          { value: "manus", label: "Manus Sites", icon: <Globe className="h-3.5 w-3.5" /> },
          { value: "search-console", label: "Search Console", icon: <BarChart className="h-3.5 w-3.5" /> },
          { value: "permissions", label: "Permissions", icon: <Lock className="h-3.5 w-3.5" /> },
          { value: "pipeline", label: "Pipeline", icon: <BarChart className="h-3.5 w-3.5" /> },
        ];
        const PINNED = 5;
        const pinnedTabs = allTabs.slice(0, PINNED);
        const moreTabs = allTabs.slice(PINNED);
        return null;
      })()}
      <Tabs defaultValue="contact" className="space-y-6">
        {/* Mobile: single Select dropdown */}
        {(() => {
          const allTabs = [
            { value: "contact", label: "Contact Info" },
            { value: "business", label: "Business Info" },
            { value: "content", label: `Content${clientStats?.totalContent ? ` (${clientStats.totalContent})` : ""}` },
            { value: "seo-strategy", label: "SEO & Strategy" },
            { value: "ad-accounts", label: "Ad Accounts" },
            { value: "branding", label: "Branding" },
            { value: "website", label: "Website Login" },
            { value: "social", label: "Social Media" },
            { value: "budget", label: "Budget" },
            { value: "portal", label: "Portal Access" },
            { value: "analytics", label: "Analytics" },
            { value: "wordpress", label: "WordPress" },
            { value: "manus", label: "Manus Sites" },
            { value: "search-console", label: "Search Console" },
            { value: "permissions", label: "Permissions" },
            { value: "pipeline", label: "Pipeline" },
          ];
          return (
            <>
              {/* Mobile select */}
              <div className="sm:hidden mb-2">
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  onChange={(e) => {
                    const el = document.querySelector(`[data-tab-trigger="${e.target.value}"]`) as HTMLButtonElement | null;
                    el?.click();
                  }}
                >
                  {allTabs.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {/* Desktop: pinned + More */}
              <div className="hidden sm:flex items-center gap-1 flex-wrap mb-2">
                <TabsList className="bg-muted/30 h-auto p-1 flex flex-wrap gap-0.5">
                  <TabsTrigger value="contact" data-tab-trigger="contact" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <User className="h-3.5 w-3.5" />Contact Info
                  </TabsTrigger>
                  <TabsTrigger value="business" data-tab-trigger="business" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <Building2 className="h-3.5 w-3.5" />Business Info
                  </TabsTrigger>
                  <TabsTrigger value="content" data-tab-trigger="content" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <FileText className="h-3.5 w-3.5" />Content
                    {(clientStats?.totalContent ?? 0) > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                        {clientStats!.totalContent}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="seo-strategy" data-tab-trigger="seo-strategy" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <Target className="h-3.5 w-3.5" />SEO &amp; Strategy
                  </TabsTrigger>
                  <TabsTrigger value="ad-accounts" data-tab-trigger="ad-accounts" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <Megaphone className="h-3.5 w-3.5" />Ad Accounts
                  </TabsTrigger>
                  <TabsTrigger value="branding" data-tab-trigger="branding" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <Palette className="h-3.5 w-3.5" />Branding
                  </TabsTrigger>
                  <TabsTrigger value="website" data-tab-trigger="website" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <Lock className="h-3.5 w-3.5" />Website Login
                  </TabsTrigger>
                  <TabsTrigger value="social" data-tab-trigger="social" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <Globe className="h-3.5 w-3.5" />Social Media
                  </TabsTrigger>
                  <TabsTrigger value="budget" data-tab-trigger="budget" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <DollarSign className="h-3.5 w-3.5" />Budget
                  </TabsTrigger>
                  <TabsTrigger value="portal" data-tab-trigger="portal" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <Lock className="h-3.5 w-3.5" />Portal Access
                  </TabsTrigger>
                  <TabsTrigger value="analytics" data-tab-trigger="analytics" className="gap-1.5 text-xs px-2.5 py-1.5">
                    <BarChart className="h-3.5 w-3.5" />Analytics
                  </TabsTrigger>
                </TabsList>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-2.5">
                      <MoreHorizontal className="h-3.5 w-3.5" />More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {[
                      { value: "wordpress", label: "WordPress", icon: <Globe className="h-3.5 w-3.5" /> },
                      { value: "manus", label: "Manus Sites", icon: <Globe className="h-3.5 w-3.5" /> },
                      { value: "search-console", label: "Search Console", icon: <BarChart className="h-3.5 w-3.5" /> },
                      { value: "permissions", label: "Permissions", icon: <Lock className="h-3.5 w-3.5" /> },
                      { value: "pipeline", label: "Pipeline", icon: <BarChart className="h-3.5 w-3.5" /> },
                    ].map(t => (
                      <DropdownMenuItem
                        key={t.value}
                        className="gap-2 text-xs cursor-pointer"
                        onClick={() => {
                          const el = document.querySelector(`[data-tab-trigger="${t.value}"]`) as HTMLButtonElement | null;
                          el?.click();
                        }}
                      >
                        {t.icon}{t.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Hidden triggers for More tabs so Tabs state still works */}
              <div className="hidden">
                <TabsList>
                  <TabsTrigger value="wordpress" data-tab-trigger="wordpress">WordPress</TabsTrigger>
                  <TabsTrigger value="manus" data-tab-trigger="manus">Manus</TabsTrigger>
                  <TabsTrigger value="search-console" data-tab-trigger="search-console">Search Console</TabsTrigger>
                  <TabsTrigger value="permissions" data-tab-trigger="permissions">Permissions</TabsTrigger>
                  <TabsTrigger value="pipeline" data-tab-trigger="pipeline">Pipeline</TabsTrigger>
                </TabsList>
              </div>
            </>
          );
        })()}

        {/* Contact Information Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderField("Full Name", "name", User, "text", "John Doe")}
                {renderField("Email Address", "email", Mail, "email", "john@example.com")}
                {renderField("Phone Number", "phone", Phone, "tel", "+1 (555) 123-4567")}
                {renderField("Company", "company", Building2, "text", "Acme Corp")}
              </div>
              <Separator className="my-6" />
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Mailing Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderField("Street Address", "address", MapPin, "text", "123 Main St")}
                {renderField("City", "city", undefined, "text", "New York")}
                {renderField("State / Province", "state", undefined, "text", "NY")}
                {renderField("ZIP / Postal Code", "zipCode", undefined, "text", "10001")}
                {renderField("Country", "country", undefined, "text", "United States")}
              </div>
              <Separator className="my-6" />
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Notes</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.notes || ""}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Additional notes about this client..."
                    rows={4}
                    className="bg-muted/30"
                  />
                ) : (
                  <p className="text-sm min-h-[20px]">
                    {client.notes || (
                      <span className="text-muted-foreground/50 italic">No notes</span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Information Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderField("Business Name", "businessName", Building2, "text", "Acme Corporation")}
                {renderField("Business Type", "businessType", undefined, "text", "LLC, Corp, Sole Proprietor")}
                {renderField("Industry", "industry", undefined, "text", "Technology, Healthcare, etc.")}
                {renderField("Business Phone", "businessPhone", Phone, "tel", "+1 (555) 987-6543")}
                {renderField("Business Email", "businessEmail", Mail, "email", "info@acmecorp.com")}
                {renderField("Business Website", "businessWebsite", Globe, "url", "https://www.acmecorp.com")}
              </div>
              <Separator className="my-6" />
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Business Address</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.businessAddress || ""}
                    onChange={(e) => updateField("businessAddress", e.target.value)}
                    placeholder="Full business address..."
                    rows={3}
                    className="bg-muted/30"
                  />
                ) : (
                  <p className="text-sm min-h-[20px]">
                    {client.businessAddress || (
                      <span className="text-muted-foreground/50 italic">Not set</span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Website Login Tab */}
        <TabsContent value="website">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Website Login Credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-400">
                  <strong>Security Notice:</strong> These credentials are stored for your team's convenience. Ensure only authorized team members have access to this information.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderField("Website URL", "websiteUrl", Globe, "url", "https://clientsite.com")}
                {renderField("CMS Platform", "websitePlatform", undefined, "text", "WordPress, Shopify, Wix, etc.")}
                {renderField("Login Page URL", "websiteLoginUrl", ExternalLink, "url", "https://clientsite.com/wp-admin")}
                {renderField("Username", "websiteUsername", User, "text", "admin")}

                {/* Password field with show/hide toggle */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Password
                  </Label>
                  {isEditing ? (
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.websitePassword || ""}
                        onChange={(e) => updateField("websitePassword", e.target.value)}
                        placeholder="••••••••"
                        className="bg-muted/30 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono">
                        {client.websitePassword ? (
                          showPassword ? client.websitePassword : "••••••••••••"
                        ) : (
                          <span className="text-muted-foreground/50 italic font-sans">Not set</span>
                        )}
                      </p>
                      {client.websitePassword && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                          className="h-6 px-2"
                        >
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-6" />
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Website Notes</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.websiteNotes || ""}
                    onChange={(e) => updateField("websiteNotes", e.target.value)}
                    placeholder="Hosting provider, FTP details, special instructions..."
                    rows={4}
                    className="bg-muted/30"
                  />
                ) : (
                  <p className="text-sm min-h-[20px]">
                    {client.websiteNotes || (
                      <span className="text-muted-foreground/50 italic">No notes</span>
                    )}
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              {client.websiteLoginUrl && !isEditing && (
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => window.open(client.websiteLoginUrl!, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Login Page
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Media Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderField("Facebook", "socialFacebook", Facebook, "url", "https://facebook.com/clientpage")}
                {renderField("Instagram", "socialInstagram", Instagram, "url", "https://instagram.com/clienthandle")}
                {renderField("LinkedIn", "socialLinkedin", Linkedin, "url", "https://linkedin.com/company/client")}
                {renderField("Twitter / X", "socialTwitter", Twitter, "url", "https://twitter.com/clienthandle")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content for {client.name}
                  <Badge className="ml-2">{clientContent.length} items</Badge>
                </CardTitle>
                {/* Status filter buttons */}
                <div className="flex items-center gap-1">
                  {(["all", "approved", "in_progress", "draft"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setContentStatusFilter(status)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                        contentStatusFilter === status
                          ? status === "approved" ? "bg-green-500 text-white"
                            : status === "in_progress" ? "bg-blue-500 text-white"
                            : status === "draft" ? "bg-gray-500 text-white"
                            : "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {status === "all" ? `All (${clientContent.length})`
                        : status === "in_progress" ? `In Progress (${clientContent.filter(c => c.content.status === "in_progress").length})`
                        : `${status.charAt(0).toUpperCase() + status.slice(1)} (${clientContent.filter(c => c.content.status === status).length})`}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const filtered = contentStatusFilter === "all"
                  ? clientContent
                  : clientContent.filter(c => c.content.status === contentStatusFilter);
                return filtered.length > 0 ? (
                <div className="space-y-3">
                  {filtered.map((item) => (
                    <div
                      key={item.content.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/content/${item.content.id}`)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{item.content.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Topic: {item.content.topic}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {new Date(item.content.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        className={
                          item.content.status === "approved"
                            ? "bg-green-500/20 text-green-400"
                            : item.content.status === "in_progress"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-500/20 text-gray-400"
                        }
                      >
                        {item.content.status === "in_progress" ? "In Progress" : item.content.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No content generated for this client yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setLocation("/seo/content")}
                  >
                    Generate Content
                  </Button>
                </div>
              );
              })()
              }
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget">
          <BudgetTab clientId={clientId} clientName={client.name} />
        </TabsContent>

        {/* Portal Access Tab */}
        <TabsContent value="portal">
          <PortalAccessTab clientId={clientId} clientName={client.name} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AnalyticsTab clientId={clientId} />
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <BrandingTab clientId={clientId} companyColors={(client as any)?.companyColors || ""} />
        </TabsContent>

        {/* WordPress Tab */}
        <TabsContent value="wordpress">
          <WordPressConnections clientId={clientId} />
        </TabsContent>

        {/* Manus Websites Tab */}
        <TabsContent value="manus">
          <ManusWebsites clientId={clientId} />
        </TabsContent>

        {/* Search Console Tab */}
        <TabsContent value="search-console">
          <SearchConsoleTab clientId={clientId} />
        </TabsContent>

        {/* Publishing Permissions Tab */}
        <TabsContent value="permissions">
          <PublishingPermissionsTab clientId={clientId} />
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline">
          <PipelineTab clientId={clientId} clientName={client?.name ?? ""} />
        </TabsContent>

        {/* SEO & Strategy Tab */}
        <TabsContent value="seo-strategy" className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" />SEO &amp; Research</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Google Search Console Property URL</Label>
                  {isEditing ? (
                    <Input placeholder="https://sc-domain:example.com" value={formData.gscPropertyUrl || ""} onChange={e => setFormData((p: any) => ({ ...p, gscPropertyUrl: e.target.value }))} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{(client as any)?.gscPropertyUrl || <span className="italic">Not set</span>}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>GSC Access Granted</Label>
                  {isEditing ? (
                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={String(formData.gscHasAccess ?? (client as any)?.gscHasAccess ?? 0)} onChange={e => setFormData((p: any) => ({ ...p, gscHasAccess: Number(e.target.value) }))}>
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  ) : (
                    <Badge variant={(client as any)?.gscHasAccess ? "default" : "secondary"}>{(client as any)?.gscHasAccess ? "Granted" : "Not granted"}</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Competitor URLs</Label>
                {isEditing ? (
                  <Textarea placeholder="https://competitor1.com, https://competitor2.com" value={formData.competitorUrls || ""} onChange={e => setFormData((p: any) => ({ ...p, competitorUrls: e.target.value }))} rows={2} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(client as any)?.competitorUrls || <span className="italic">Not set</span>}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Brand &amp; Audience</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Brand Voice / Tone Guidelines</Label>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      disabled={generateBrandVoiceMutation.isPending}
                      onClick={() => setShowBrandVoiceUrlInput((v) => !v)}
                    >
                      <Wand2 className="h-3 w-3" />
                      Generate from website
                    </Button>
                  )}
                </div>
                {isEditing && showBrandVoiceUrlInput && (
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder={(client as any)?.websiteUrl || "https://example.com"}
                      value={customBrandVoiceUrl}
                      onChange={(e) => setCustomBrandVoiceUrl(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5 text-xs shrink-0"
                      disabled={generateBrandVoiceMutation.isPending}
                      onClick={() => {
                        const url = customBrandVoiceUrl.trim() || (client as any)?.websiteUrl || "";
                        if (!url) { toast.error("Enter a website URL first"); return; }
                        generateBrandVoiceMutation.mutate({ websiteUrl: url });
                      }}
                    >
                      {generateBrandVoiceMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      {generateBrandVoiceMutation.isPending ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                )}
                {isEditing ? (
                  <Textarea placeholder="e.g. Professional but approachable, uses data-driven language, avoids jargon..." value={formData.brandVoice || ""} onChange={e => setFormData((p: any) => ({ ...p, brandVoice: e.target.value }))} rows={4} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(client as any)?.brandVoice || <span className="italic">Not set</span>}</p>
                )}
                {/* Brand voice history */}
                {brandVoiceHistoryData && brandVoiceHistoryData.length > 0 && (
                  <div className="mt-1">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                      onClick={() => setShowBrandVoiceHistory((v) => !v)}
                    >
                      <ChevronDown className={`h-3 w-3 transition-transform ${showBrandVoiceHistory ? "rotate-180" : ""}`} />
                      {showBrandVoiceHistory ? "Hide" : "Show"} version history ({brandVoiceHistoryData.length})
                    </button>
                    {showBrandVoiceHistory && (
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {brandVoiceHistoryData.map((entry) => (
                          <div key={entry.id} className="rounded border border-border/50 p-2 bg-muted/20 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${entry.source === "ai_generated" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                  {entry.source === "ai_generated" ? "AI" : "Manual"}
                                </span>
                                {isEditing && (
                                  <button
                                    type="button"
                                    className="text-primary hover:underline text-[10px]"
                                    onClick={() => {
                                      setFormData((p: any) => ({ ...p, brandVoice: entry.brandVoice }));
                                      toast.success("Rolled back to previous version");
                                    }}
                                  >
                                    Restore
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{entry.brandVoice}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Target Audience Personas</Label>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      disabled={generateTargetAudienceMutation.isPending}
                      onClick={() => setShowAudienceUrlInput((v) => !v)}
                    >
                      <Wand2 className="h-3 w-3" />
                      Generate from website
                    </Button>
                  )}
                </div>
                {isEditing && showAudienceUrlInput && (
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder={(client as any)?.websiteUrl || "https://example.com"}
                      value={customAudienceUrl}
                      onChange={(e) => setCustomAudienceUrl(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5 text-xs shrink-0"
                      disabled={generateTargetAudienceMutation.isPending}
                      onClick={() => {
                        const url = customAudienceUrl.trim() || (client as any)?.websiteUrl || "";
                        if (!url) { toast.error("Enter a website URL first"); return; }
                        generateTargetAudienceMutation.mutate({ websiteUrl: url });
                      }}
                    >
                      {generateTargetAudienceMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      {generateTargetAudienceMutation.isPending ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                )}
                {isEditing ? (
                  <Textarea placeholder="e.g. Small business owners aged 35-55, tech-savvy, budget-conscious..." value={formData.targetAudience || ""} onChange={e => setFormData((p: any) => ({ ...p, targetAudience: e.target.value }))} rows={4} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(client as any)?.targetAudience || <span className="italic">Not set</span>}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Unique Selling Proposition (USP)</Label>
                {isEditing ? (
                  <Textarea placeholder="What makes this client stand out from competitors?" value={formData.uniqueSellingProp || ""} onChange={e => setFormData((p: any) => ({ ...p, uniqueSellingProp: e.target.value }))} rows={2} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(client as any)?.uniqueSellingProp || <span className="italic">Not set</span>}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Primary Services / Products</Label>
                {isEditing ? (
                  <Textarea placeholder="List key products or services with brief descriptions" value={formData.primaryServices || ""} onChange={e => setFormData((p: any) => ({ ...p, primaryServices: e.target.value }))} rows={3} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(client as any)?.primaryServices || <span className="italic">Not set</span>}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Service Areas (Local SEO)</Label>
                {isEditing ? (
                  <Input placeholder="e.g. Miami, Fort Lauderdale, Boca Raton" value={formData.serviceAreas || ""} onChange={e => setFormData((p: any) => ({ ...p, serviceAreas: e.target.value }))} />
                ) : (
                  <p className="text-sm text-muted-foreground">{(client as any)?.serviceAreas || <span className="italic">Not set</span>}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Brand Colours */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Brand Colours</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Colours</Label>
                <p className="text-xs text-muted-foreground">Used to guide AI content and ad copy generation</p>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2 items-center mt-1">
                    {((formData.companyColors || "").split(',').map((c: string) => c.trim()).filter(Boolean)).map((hex: string, i: number) => (
                      <div key={i} className="relative group">
                        <label className="cursor-pointer">
                          <div className="w-10 h-10 rounded-lg border-2 border-border shadow-sm" style={{ background: hex }} />
                          <input
                            type="color"
                            value={hex.startsWith('#') && hex.length >= 4 ? hex : '#000000'}
                            className="sr-only"
                            onChange={(e) => {
                              const colors = (formData.companyColors || "").split(',').map((c: string) => c.trim()).filter(Boolean);
                              colors[i] = e.target.value;
                              setFormData((p: any) => ({ ...p, companyColors: colors.join(', ') }));
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] hidden group-hover:flex items-center justify-center leading-none"
                          onClick={() => {
                            const colors = (formData.companyColors || "").split(',').map((c: string) => c.trim()).filter(Boolean);
                            colors.splice(i, 1);
                            setFormData((p: any) => ({ ...p, companyColors: colors.join(', ') }));
                          }}
                        >×</button>
                        <span className="block text-center text-[9px] text-muted-foreground font-mono mt-0.5">{hex}</span>
                      </div>
                    ))}
                    {((formData.companyColors || "").split(',').filter(Boolean).length) < 5 && (
                      <label className="cursor-pointer">
                        <div className="w-10 h-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary transition-colors text-xl">+</div>
                        <input
                          type="color"
                          defaultValue="#3b82f6"
                          className="sr-only"
                          onChange={(e) => {
                            const existing = (formData.companyColors || "").split(',').map((c: string) => c.trim()).filter(Boolean);
                            setFormData((p: any) => ({ ...p, companyColors: [...existing, e.target.value].join(', ') }));
                          }}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-3 flex-wrap mt-1">
                    {((client as any)?.companyColors ? (client as any).companyColors.split(',').map((c: string) => c.trim()).filter(Boolean) : []).map((hex: string, i: number) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-lg border border-border shadow-sm" style={{ background: hex }} />
                        <span className="text-[10px] text-muted-foreground font-mono">{hex}</span>
                      </div>
                    ))}
                    {!((client as any)?.companyColors) && (
                      <p className="text-sm text-muted-foreground italic">Not set — click Edit to add brand colours</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5 text-primary" />Publishing &amp; Reporting</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Publish Days</Label>
                  {isEditing ? (
                    <Input placeholder="e.g. Mon,Wed,Fri" value={formData.preferredPublishDays || ""} onChange={e => setFormData((p: any) => ({ ...p, preferredPublishDays: e.target.value }))} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{(client as any)?.preferredPublishDays || <span className="italic">Not set</span>}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Preferred Publish Time</Label>
                  {isEditing ? (
                    <Input type="time" value={formData.preferredPublishTime || ""} onChange={e => setFormData((p: any) => ({ ...p, preferredPublishTime: e.target.value }))} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{(client as any)?.preferredPublishTime || <span className="italic">Not set</span>}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Reporting KPIs</Label>
                  {isEditing ? (
                    <Input placeholder="e.g. traffic,rankings,leads" value={formData.reportingKpis || ""} onChange={e => setFormData((p: any) => ({ ...p, reportingKpis: e.target.value }))} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{(client as any)?.reportingKpis || <span className="italic">Not set</span>}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Reporting Frequency</Label>
                  {isEditing ? (
                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={formData.reportingFrequency || ""} onChange={e => setFormData((p: any) => ({ ...p, reportingFrequency: e.target.value }))}>
                      <option value="">Select...</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground capitalize">{(client as any)?.reportingFrequency || <span className="italic">Not set</span>}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Competitor Content Gap Analysis */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Competitor Content Gap Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                AI analyses competitor sites against your existing content and surfaces missing topic clusters.
              </p>
            </CardHeader>
            <CardContent>
              <GapAnalysisPanel clientId={clientId} competitorUrls={(client as any)?.competitorUrls || ""} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ad Accounts Tab */}
        <TabsContent value="ad-accounts" className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Ad Account Connections
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Store the client's ad account IDs so the Ads Manager can publish directly to Google Ads and Facebook Ads.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Ads */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <span className="text-blue-400 font-bold text-sm">G</span>
                  <h3 className="font-semibold text-sm">Google Ads</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer ID</Label>
                    {isEditing ? (
                      <Input placeholder="e.g. 123-456-7890" value={formData.googleAdsCustomerId || ""} onChange={e => setFormData((p: any) => ({ ...p, googleAdsCustomerId: e.target.value }))} />
                    ) : (
                      <p className="text-sm font-medium">{(client as any)?.googleAdsCustomerId || <span className="text-muted-foreground/50 italic">Not set</span>}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Found in Google Ads → Admin → Account settings</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Campaign ID</Label>
                    {isEditing ? (
                      <Input placeholder="e.g. 9876543210" value={formData.googleAdsCampaignId || ""} onChange={e => setFormData((p: any) => ({ ...p, googleAdsCampaignId: e.target.value }))} />
                    ) : (
                      <p className="text-sm font-medium">{(client as any)?.googleAdsCampaignId || <span className="text-muted-foreground/50 italic">Not set</span>}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Optional: pre-select a campaign for new ads</p>
                  </div>
                </div>
              </div>
              {/* Facebook Ads */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <span className="text-indigo-400 font-bold text-sm">f</span>
                  <h3 className="font-semibold text-sm">Facebook / Meta Ads</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ad Account ID</Label>
                    {isEditing ? (
                      <Input placeholder="e.g. act_123456789" value={formData.facebookAdAccountId || ""} onChange={e => setFormData((p: any) => ({ ...p, facebookAdAccountId: e.target.value }))} />
                    ) : (
                      <p className="text-sm font-medium">{(client as any)?.facebookAdAccountId || <span className="text-muted-foreground/50 italic">Not set</span>}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Found in Meta Business Suite → Ad Accounts</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook Page ID</Label>
                    {isEditing ? (
                      <Input placeholder="e.g. 123456789012345" value={formData.facebookPageId || ""} onChange={e => setFormData((p: any) => ({ ...p, facebookPageId: e.target.value }))} />
                    ) : (
                      <p className="text-sm font-medium">{(client as any)?.facebookPageId || <span className="text-muted-foreground/50 italic">Not set</span>}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Found in Meta Business Suite → Pages</p>
                  </div>
                </div>
              </div>
              {isEditing && (
                <div className="pt-2">
                  <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Ad Accounts
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Gap Analysis Panel
function GapAnalysisPanel({ clientId, competitorUrls }: { clientId: number; competitorUrls: string }) {
  const [result, setResult] = useState<null | {
    gaps: { cluster: string; description: string; articleIdeas: string[]; searchIntent: string; priority: string }[];
    summary: string;
  }>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const parsedUrls = useMemo(() => {
    return competitorUrls
      .split(/[,\n]+/)
      .map((u) => u.trim())
      .filter((u) => {
        try { new URL(u); return true; } catch { return false; }
      })
      .slice(0, 5);
  }, [competitorUrls]);

  const gapMutation = trpc.seo.clients.gapAnalysis.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (e) => toast.error("Gap analysis failed: " + e.message),
  });

  const priorityColor = (p: string) =>
    p === "high" ? "text-red-400" : p === "medium" ? "text-yellow-400" : "text-green-400";
  const intentBadge = (i: string) => {
    const map: Record<string, string> = {
      informational: "bg-blue-500/20 text-blue-300",
      navigational: "bg-purple-500/20 text-purple-300",
      commercial: "bg-orange-500/20 text-orange-300",
      transactional: "bg-green-500/20 text-green-300",
    };
    return map[i] ?? "bg-muted text-muted-foreground";
  };

  if (parsedUrls.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Add competitor URLs in the SEO &amp; Research section above, then run a gap analysis.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            Will analyse against: {parsedUrls.map((u) => new URL(u).hostname).join(", ")}
          </p>
        </div>
        <Button
          onClick={() => gapMutation.mutate({ clientId, competitorUrls: parsedUrls })}
          disabled={gapMutation.isPending}
          className="gap-2 shrink-0"
        >
          {gapMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {gapMutation.isPending ? "Analysing..." : "Run Gap Analysis"}
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-sm">
            <p className="font-medium text-foreground mb-1">Summary</p>
            <p className="text-muted-foreground">{result.summary}</p>
          </div>
          {result.gaps.map((gap, i) => (
            <div key={i} className="rounded-lg border border-border/50 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs font-bold uppercase ${priorityColor(gap.priority)}`}>{gap.priority}</span>
                  <span className="font-medium text-sm truncate">{gap.cluster}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${intentBadge(gap.searchIntent)}`}>{gap.searchIntent}</span>
                </div>
                {expanded === i ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              {expanded === i && (
                <div className="px-3 pb-3 space-y-2 border-t border-border/50">
                  <p className="text-sm text-muted-foreground pt-2">{gap.description}</p>
                  <p className="text-xs font-medium text-foreground">Article ideas:</p>
                  <ul className="space-y-1">
                    {gap.articleIdeas.map((idea, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span> {idea}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => {
                        const params = new URLSearchParams({
                          clientId: String(clientId),
                          title: gap.cluster,
                          notes: `Search intent: ${gap.searchIntent}\n\n${gap.description}\n\nArticle ideas:\n${gap.articleIdeas.map(a => `• ${a}`).join("\n")}`,
                        });
                        setLocation(`/briefs/new?${params.toString()}`);
                      }}
                    >
                      <FileText className="h-3 w-3" /> Create Brief
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Budget Tab Component
function BudgetTab({ clientId, clientName }: { clientId: number; clientName: string }) {
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(80);
  
  const { data: client, refetch } = trpc.seo.clients.getById.useQuery({ id: clientId });
  const { data: budgetStatus } = trpc.seo.clients.getBudgetStatus.useQuery(
    { clientId },
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );
  const updateMutation = trpc.seo.clients.update.useMutation();

  useEffect(() => {
    if (client) {
      setMonthlyBudget(client.monthlyBudget || "0.00");
      setAlertThreshold(client.budgetAlertThreshold || 80);
    }
  }, [client]);

  const handleSaveBudget = async () => {
    try {
      await updateMutation.mutateAsync({
        id: clientId,
        monthlyBudget,
        budgetAlertThreshold: alertThreshold,
      });
      toast.success("Budget settings saved");
      refetch();
    } catch {
      toast.error("Failed to save budget settings");
    }
  };

  const currentCost = budgetStatus?.currentCost || 0;
  const budget = budgetStatus?.budget || parseFloat(monthlyBudget) || 0;
  const percentage = budget > 0 ? (currentCost / budget) * 100 : 0;
  const isOverBudget = percentage > 100;
  const isNearThreshold = percentage >= alertThreshold && !isOverBudget;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Settings for {clientName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="monthlyBudget">Monthly Budget (USD)</Label>
              <Input
                id="monthlyBudget"
                type="number"
                step="0.01"
                min="0"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set to 0 to disable budget tracking
              </p>
            </div>
            <div>
              <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
              <Input
                id="alertThreshold"
                type="number"
                min="0"
                max="100"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Receive notification when spending reaches this percentage
              </p>
            </div>
          </div>
          <Button onClick={handleSaveBudget} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Budget Settings
          </Button>
        </CardContent>
      </Card>

      {budget > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Current Month Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Spend</span>
              <span className="text-2xl font-bold">${currentCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Budget</span>
              <span className="text-lg font-medium">${budget.toFixed(2)}</span>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Budget Usage</span>
                <span
                  className={`text-sm font-bold ${
                    isOverBudget
                      ? "text-red-400"
                      : isNearThreshold
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isOverBudget
                      ? "bg-red-500"
                      : isNearThreshold
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
            {isOverBudget && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Budget exceeded! Consider adjusting the budget or reducing content generation.
                </p>
              </div>
            )}
            {isNearThreshold && !isOverBudget && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Approaching budget threshold. You'll receive a notification if spending continues.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// Portal Access Tab Component
function PortalAccessTab({ clientId, clientName }: { clientId: number; clientName: string }) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"client_admin" | "client_viewer">("client_viewer");
  const [lastInvitation, setLastInvitation] = useState<any>(null);

  const { data: portalUsers, refetch } = trpc.seo.clientPortal.listUsers.useQuery({ clientId });
  const createInvitationMutation = trpc.seo.clientPortal.createInvitation.useMutation();
  const deactivateUserMutation = trpc.seo.clientPortal.deactivateUser.useMutation();

  const handleSendInvitation = async () => {
    if (!inviteEmail || !inviteName) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const result = await createInvitationMutation.mutateAsync({
        clientId,
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
        origin: window.location.origin,
      });

      setLastInvitation(result);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteName("");
      setShowInviteDialog(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    }
  };

  const handleDeactivateUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${userName}'s portal access?`)) {
      return;
    }

    try {
      await deactivateUserMutation.mutateAsync({ userId });
      toast.success(`${userName}'s portal access has been deactivated`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate user");
    }
  };

  const copyInvitationLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/portal/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invitation link copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Portal Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Client Portal Access
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Invite {clientName} team members to access their content portal
              </p>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Portal URL</h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background px-3 py-2 rounded text-sm">
                {window.location.origin}/portal
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/portal`);
                  toast.success("Portal URL copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Invitation */}
      {lastInvitation && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">Recent Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Invited User</Label>
              <p className="font-medium">{lastInvitation.name} ({lastInvitation.email})</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Invitation Link</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-xs overflow-x-auto">
                  {window.location.origin}/portal/accept-invitation?token={lastInvitation.token}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyInvitationLink(lastInvitation.token)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this link with the user to complete their registration
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Portal Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Portal Users</CardTitle>
        </CardHeader>
        <CardContent>
          {!portalUsers || portalUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No portal users yet</p>
              <p className="text-sm mt-1">Invite team members to access the client portal</p>
            </div>
          ) : (
            <div className="space-y-3">
              {portalUsers.map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={user.role === "client_admin" ? "default" : "secondary"}>
                      {user.role === "client_admin" ? "Admin" : "Viewer"}
                    </Badge>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {user.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivateUser(user.id, user.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite User to Portal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Send an invitation to access the client portal
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Name</Label>
                <Input
                  id="invite-name"
                  placeholder="John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="john@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "client_admin" | "client_viewer")}
                >
                  <option value="client_viewer">Viewer - Can view and approve content</option>
                  <option value="client_admin">Admin - Full portal access</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowInviteDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSendInvitation}
                  disabled={createInvitationMutation.isPending}
                >
                  {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


// Analytics Tab Component
function AnalyticsTab({ clientId }: { clientId: number }) {
  const { data: connection, refetch } = trpc.seo.googleAnalytics.get.useQuery({ clientId });
  const upsertMutation = trpc.seo.googleAnalytics.upsert.useMutation();
  const deleteMutation = trpc.seo.googleAnalytics.delete.useMutation();
  
  const [formData, setFormData] = useState({
    propertyId: "",
    viewId: "",
    serviceAccountEmail: "",
    serviceAccountKey: "",
  });

  useEffect(() => {
    if (connection) {
      setFormData({
        propertyId: connection.propertyId || "",
        viewId: connection.viewId || "",
        serviceAccountEmail: connection.serviceAccountEmail || "",
        serviceAccountKey: connection.serviceAccountKey || "",
      });
    }
  }, [connection]);

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        clientId,
        ...formData,
      });
      toast.success("Analytics connection saved successfully!");
      refetch();
    } catch {
      toast.error("Failed to save analytics connection");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this analytics connection?")) return;
    
    try {
      await deleteMutation.mutateAsync({ clientId });
      toast.success("Analytics connection deleted");
      setFormData({
        propertyId: "",
        viewId: "",
        serviceAccountEmail: "",
        serviceAccountKey: "",
      });
      refetch();
    } catch {
      toast.error("Failed to delete analytics connection");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Analytics Connection</CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect Google Analytics to automatically pull traffic and keyword data
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="propertyId">GA4 Property ID *</Label>
            <Input
              id="propertyId"
              value={formData.propertyId}
              onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
              placeholder="123456789"
            />
            <p className="text-xs text-muted-foreground">
              Find this in Google Analytics under Admin → Property Settings
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="viewId">View ID (Optional)</Label>
            <Input
              id="viewId"
              value={formData.viewId}
              onChange={(e) => setFormData({ ...formData, viewId: e.target.value })}
              placeholder="987654321"
            />
            <p className="text-xs text-muted-foreground">
              For Universal Analytics (legacy) only
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="serviceAccountEmail">Service Account Email</Label>
            <Input
              id="serviceAccountEmail"
              value={formData.serviceAccountEmail}
              onChange={(e) => setFormData({ ...formData, serviceAccountEmail: e.target.value })}
              placeholder="your-service-account@project.iam.gserviceaccount.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceAccountKey">Service Account Key (JSON)</Label>
            <Textarea
              id="serviceAccountKey"
              value={formData.serviceAccountKey}
              onChange={(e) => setFormData({ ...formData, serviceAccountKey: e.target.value })}
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Paste the entire JSON key file content from Google Cloud Console
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={upsertMutation.isPending || !formData.propertyId}
            >
              {upsertMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Connection</>
              )}
            </Button>
            {connection && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="h-4 w-4 mr-2" /> Delete Connection</>
                )}
              </Button>
            )}
          </div>

          {connection && connection.lastSyncedAt && (
            <div className="text-sm text-muted-foreground pt-2">
              Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Set Up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">1. Get your GA4 Property ID</h4>
            <p className="text-muted-foreground">
              In Google Analytics, go to Admin → Property Settings. Copy the Property ID.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Create a Service Account</h4>
            <p className="text-muted-foreground">
              In Google Cloud Console, create a service account and download the JSON key file.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Grant Access</h4>
            <p className="text-muted-foreground">
              In Google Analytics, add the service account email as a Viewer to your property.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Branding Tab Component
function BrandingTab({ clientId, companyColors }: { clientId: number; companyColors?: string }) {
  const { data: branding, refetch } = trpc.seo.portalBranding.get.useQuery({ clientId });
  const upsertMutation = trpc.seo.portalBranding.upsert.useMutation();
  
  const [formData, setFormData] = useState({
    logoUrl: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af",
    portalName: "",
    welcomeMessage: "",
  });

  useEffect(() => {
    if (branding) {
      setFormData({
        logoUrl: branding.logoUrl || "",
        primaryColor: branding.primaryColor || "#3b82f6",
        secondaryColor: branding.secondaryColor || "#1e40af",
        portalName: branding.portalName || "",
        welcomeMessage: branding.welcomeMessage || "",
      });
    }
  }, [branding]);

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        clientId,
        ...formData,
      });
      toast.success("Branding settings saved successfully!");
      refetch();
    } catch {
      toast.error("Failed to save branding settings");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Portal Branding
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Customize the appearance of the client portal for this client
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="portal-name">Portal Name</Label>
            <Input
              id="portal-name"
              placeholder="Client Portal"
              value={formData.portalName}
              onChange={(e) => setFormData({ ...formData, portalName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Displayed in the portal header
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input
              id="logo-url"
              placeholder="https://example.com/logo.png"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              URL to the logo image (recommended size: 200x50px)
            </p>
          </div>

          {companyColors && (() => {
            const hexColors = companyColors.split(",").map(c => c.trim()).filter(c => /^#[0-9a-fA-F]{3,8}$/.test(c));
            if (hexColors.length < 1) return null;
            return (
              <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-medium">Brand colours:</span>
                  {hexColors.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-xs">
                      <span className="inline-block w-4 h-4 rounded-sm border border-border" style={{ background: c }} />
                      {c}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs gap-1.5"
                  onClick={() => {
                    if (hexColors[0]) setFormData(f => ({ ...f, primaryColor: hexColors[0] }));
                    if (hexColors[1]) setFormData(f => ({ ...f, secondaryColor: hexColors[1] }));
                    toast.success("Portal colours populated from brand colours");
                  }}
                >
                  <Palette className="h-3 w-3" />
                  Use brand colours
                </Button>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-20 h-10 p-1"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-20 h-10 p-1"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  placeholder="#1e40af"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-message">Welcome Message</Label>
            <Textarea
              id="welcome-message"
              placeholder="Welcome to your content portal!"
              value={formData.welcomeMessage}
              onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Shown on the portal dashboard
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Preview</h4>
            <div
              className="border rounded-lg p-6 space-y-4"
              style={{
                backgroundColor: `${formData.primaryColor}10`,
                borderColor: formData.primaryColor,
              }}
            >
              {formData.logoUrl && (
                <img
                  src={formData.logoUrl}
                  alt="Logo preview"
                  className="h-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <h3
                className="text-2xl font-bold"
                style={{ color: formData.primaryColor }}
              >
                {formData.portalName || "Client Portal"}
              </h3>
              {formData.welcomeMessage && (
                <p className="text-sm" style={{ color: formData.secondaryColor }}>
                  {formData.welcomeMessage}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={upsertMutation.isPending}
            className="w-full"
          >
            {upsertMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Branding Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Console Tab
// ─────────────────────────────────────────────────────────────────────────────
function SearchConsoleTab({ clientId }: { clientId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    siteUrl: "",
    accessToken: "",
    refreshToken: "",
    googleClientId: "",
    googleClientSecret: "",
  });

  const { data: credentials, refetch } = trpc.seo.searchConsole.getCredentials.useQuery({ clientId });
  const { data: summary } = trpc.seo.searchConsole.getSummary.useQuery(
    { clientId, days: 28 },
    { enabled: (credentials?.length ?? 0) > 0 }
  );
  const { data: topQueries } = trpc.seo.searchConsole.getTopQueries.useQuery(
    { clientId, limit: 10 },
    { enabled: (credentials?.length ?? 0) > 0 }
  );

  const saveMutation = trpc.seo.searchConsole.saveCredentials.useMutation();
  const deleteMutation = trpc.seo.searchConsole.deleteCredentials.useMutation();
  const syncMutation = trpc.seo.searchConsole.syncNow.useMutation();

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ ...form, clientId, id: editId ?? undefined });
      toast.success("Credentials saved");
      setShowForm(false);
      setEditId(null);
      setForm({ siteUrl: "", accessToken: "", refreshToken: "", googleClientId: "", googleClientSecret: "" });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    toast.success("Credentials deleted");
    refetch();
  };

  const handleSync = async (credentialId: number) => {
    try {
      const result = await syncMutation.mutateAsync({ credentialId });
      toast.success(`Synced ${result.rowsSynced} rows`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Clicks", value: summary.totalClicks.toLocaleString() },
            { label: "Impressions", value: summary.totalImpressions.toLocaleString() },
            { label: "Avg CTR", value: `${(summary.avgCtr * 100).toFixed(2)}%` },
            { label: "Avg Position", value: summary.avgPosition.toFixed(1) },
          ].map((m) => (
            <Card key={m.label} className="p-4 text-center">
              <div className="text-2xl font-bold">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Top queries */}
      {topQueries && topQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Queries (Last 28 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left py-2 pr-4">Query</th>
                    <th className="text-right py-2 pr-4">Clicks</th>
                    <th className="text-right py-2 pr-4">Impressions</th>
                    <th className="text-right py-2 pr-4">CTR</th>
                    <th className="text-right py-2">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.map((q, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium truncate max-w-[200px]">{q.query}</td>
                      <td className="text-right py-2 pr-4">{q.clicks}</td>
                      <td className="text-right py-2 pr-4">{q.impressions}</td>
                      <td className="text-right py-2 pr-4">{(q.ctr * 100).toFixed(2)}%</td>
                      <td className="text-right py-2">{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credentials list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Search Console Credentials</CardTitle>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Credentials
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {credentials?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No credentials configured. Add your Google Search Console credentials to start tracking SEO performance.
            </p>
          )}
          {credentials?.map((cred) => (
            <div key={cred.id} className="flex flex-col gap-2 p-3 border rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="font-medium text-sm truncate">{cred.siteUrl}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Sync status badge */}
                    {(cred as any).lastSyncStatus === "success" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 text-[11px] font-semibold">
                        ✓ Synced
                      </span>
                    )}
                    {(cred as any).lastSyncStatus === "error" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[11px] font-semibold">
                        ✗ Error
                      </span>
                    )}
                    {(!(cred as any).lastSyncStatus || (cred as any).lastSyncStatus === "never") && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground border px-2 py-0.5 text-[11px] font-semibold">
                        Never synced
                      </span>
                    )}
                    {/* Last sync time */}
                    {cred.lastSyncedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(cred.lastSyncedAt).toLocaleString()}
                      </span>
                    )}
                    {/* Rows synced */}
                    {(cred as any).lastSyncRowsSynced != null && (cred as any).lastSyncRowsSynced > 0 && (
                      <span className="text-xs text-muted-foreground">
                        · {(cred as any).lastSyncRowsSynced} rows
                      </span>
                    )}
                  </div>
                  {/* Error message */}
                  {(cred as any).lastSyncStatus === "error" && (cred as any).lastSyncError && (
                    <p className="text-xs text-red-600 mt-1 truncate max-w-xs" title={(cred as any).lastSyncError}>
                      {(cred as any).lastSyncError}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSync(cred.id)}
                    disabled={syncMutation.isPending}
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Sync Now"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(cred.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add credentials form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Search Console Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Site URL *</Label>
              <Input
                placeholder="https://example.com/"
                value={form.siteUrl}
                onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Google Client ID</Label>
                <Input
                  placeholder="OAuth client ID"
                  value={form.googleClientId}
                  onChange={(e) => setForm({ ...form, googleClientId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Google Client Secret</Label>
                <Input
                  type="password"
                  placeholder="OAuth client secret"
                  value={form.googleClientSecret}
                  onChange={(e) => setForm({ ...form, googleClientSecret: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Refresh Token</Label>
              <Input
                placeholder="OAuth refresh token"
                value={form.refreshToken}
                onChange={(e) => setForm({ ...form, refreshToken: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Publishing Permissions Tab
// ─────────────────────────────────────────────────────────────────────────────
function PublishingPermissionsTab({ clientId }: { clientId: number }) {
  const { data: perms, refetch } = trpc.seo.clientPublishingPermissions.getPermissions.useQuery({ clientId });
  const saveMutation = trpc.seo.clientPublishingPermissions.savePermissions.useMutation();

  const [form, setForm] = useState({
    canPublishToWordPress: false,
    canPublishToManus: false,
    canSchedulePublishing: false,
    canApproveContent: true,
    canRequestRevisions: true,
  });

  useEffect(() => {
    if (perms) {
      setForm({
        canPublishToWordPress: !!perms.canPublishToWordPress,
        canPublishToManus: !!perms.canPublishToManus,
        canSchedulePublishing: !!perms.canSchedulePublishing,
        canApproveContent: !!perms.canApproveContent,
        canRequestRevisions: !!perms.canRequestRevisions,
      });
    }
  }, [perms]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ clientId, ...form });
      toast.success("Permissions saved");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save permissions");
    }
  };

  const toggle = (key: keyof typeof form) =>
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));

  const permissions = [
    {
      key: "canApproveContent" as const,
      label: "Approve Content",
      description: "Client portal users can approve content for publishing",
    },
    {
      key: "canRequestRevisions" as const,
      label: "Request Revisions",
      description: "Client portal users can request content revisions",
    },
    {
      key: "canPublishToWordPress" as const,
      label: "Publish to WordPress",
      description: "Client portal users can trigger WordPress publishing",
    },
    {
      key: "canPublishToManus" as const,
      label: "Publish to Manus",
      description: "Client portal users can publish to Manus websites",
    },
    {
      key: "canSchedulePublishing" as const,
      label: "Schedule Publishing",
      description: "Client portal users can schedule content for future publishing",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Client Portal Publishing Permissions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Control what actions client portal users for this client are allowed to perform.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissions.map((p) => (
          <div key={p.key} className="flex items-start justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">{p.label}</div>
              <div className="text-sm text-muted-foreground">{p.description}</div>
            </div>
            <div
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                form[p.key] ? "bg-primary" : "bg-muted"
              }`}
              onClick={() => toggle(p.key)}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form[p.key] ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
          </div>
        ))}

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Save Permissions</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Pipeline Tab Component
const PIPELINE_STAGES = [
  { id: "prospect", label: "Prospect", color: "bg-slate-500" },
  { id: "contacted", label: "Contacted", color: "bg-blue-500" },
  { id: "proposal", label: "Proposal Sent", color: "bg-amber-500" },
  { id: "onboarded", label: "Onboarded", color: "bg-emerald-500" },
];

function PipelineTab({ clientId, clientName }: { clientId: number; clientName: string }) {
  const { data: pipelineData, isLoading } = trpc.seo.pipeline.list.useQuery();
  const utils = trpc.useUtils();
  const createMutation = trpc.seo.pipeline.create.useMutation({ onSuccess: () => utils.seo.pipeline.list.invalidate() });
  const updateStageMutation = trpc.seo.pipeline.updateStage.useMutation({ onSuccess: () => utils.seo.pipeline.list.invalidate() });
  const updateNotesMutation = trpc.seo.pipeline.updateNotes.useMutation({ onSuccess: () => utils.seo.pipeline.list.invalidate() });
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const card = pipelineData?.find(c => c.businessName === clientName);

  const handleAdd = async () => {
    await createMutation.mutateAsync({ businessName: clientName, stage: "prospect" });
    toast.success("Added to pipeline");
  };

  if (isLoading) return <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          CRM Pipeline Stage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!card ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-muted-foreground text-sm">This client is not in the CRM pipeline yet.</p>
            <Button onClick={handleAdd} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to Pipeline
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Current Stage</p>
              <div className="flex flex-wrap gap-2">
                {PIPELINE_STAGES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => updateStageMutation.mutate({ id: card.id, stage: s.id as any })}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      card.stage === s.id
                        ? `${s.color} text-white border-transparent shadow-md`
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Pipeline Notes</p>
                {!editingNotes && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditingNotes(true); setNotesValue(card.notes ?? ""); }}>
                    <Save className="h-3 w-3" /> Edit
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    rows={5}
                    value={notesValue}
                    onChange={e => setNotesValue(e.target.value)}
                    placeholder="Call notes, email threads, next actions..."
                    className="bg-muted/30"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async () => { await updateNotesMutation.mutateAsync({ id: card.id, notes: notesValue }); setEditingNotes(false); toast.success("Notes saved"); }} disabled={updateNotesMutation.isPending}>
                      {updateNotesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />} Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground min-h-[40px]">
                  {card.notes || <span className="italic opacity-50">No notes yet — click Edit to add</span>}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
