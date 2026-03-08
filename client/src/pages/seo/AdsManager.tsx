import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Plus,
  Trash2,
  Wand2,
  Loader2,
  ExternalLink,
  Edit2,
  CheckCircle,
  PauseCircle,
  Clock,
  XCircle,
  Play,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: Clock },
  ready: { label: "Ready", color: "bg-blue-500/20 text-blue-400", icon: CheckCircle },
  active: { label: "Active", color: "bg-green-500/20 text-green-400", icon: Play },
  paused: { label: "Paused", color: "bg-yellow-500/20 text-yellow-400", icon: PauseCircle },
  completed: { label: "Completed", color: "bg-purple-500/20 text-purple-400", icon: XCircle },
};

const GOOGLE_AD_TYPES = [
  { value: "search", label: "Search Ad" },
  { value: "responsive_search", label: "Responsive Search Ad" },
  { value: "display", label: "Display Ad" },
];

const FACEBOOK_AD_TYPES = [
  { value: "image", label: "Image Ad" },
  { value: "carousel", label: "Carousel Ad" },
  { value: "video", label: "Video Ad" },
];

const GOOGLE_CTAS = ["Learn More", "Shop Now", "Sign Up", "Get Quote", "Contact Us", "Book Now", "Download"];
const FACEBOOK_CTAS = ["Learn More", "Shop Now", "Sign Up", "Get Quote", "Contact Us", "Book Now", "Download", "Watch More", "Apply Now"];

const emptyGoogleForm = {
  clientId: "",
  platform: "google" as const,
  adType: "search" as const,
  headline1: "",
  headline2: "",
  headline3: "",
  description1: "",
  description2: "",
  callToAction: "Learn More",
  destinationUrl: "",
  displayUrl: "",
  campaignName: "",
  targetKeywords: "",
  budget: "",
  notes: "",
};

const emptyFacebookForm = {
  clientId: "",
  platform: "facebook" as const,
  adType: "image" as const,
  headline1: "",
  primaryText: "",
  description1: "",
  callToAction: "Learn More",
  destinationUrl: "",
  campaignName: "",
  adSetName: "",
  targetAudience: "",
  budget: "",
  notes: "",
};

export default function AdsManager() {
  const [activeTab, setActiveTab] = useState<"google" | "facebook">("google");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [googleForm, setGoogleForm] = useState({ ...emptyGoogleForm });
  const [facebookForm, setFacebookForm] = useState({ ...emptyFacebookForm });
  const [generateProduct, setGenerateProduct] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: clients } = trpc.seo.clients.list.useQuery();
  const { data: allAds, refetch } = trpc.seo.ads.list.useQuery({
    clientId: clientFilter && clientFilter !== "all" ? parseInt(clientFilter) : undefined,
  });
  const utils = trpc.useUtils();

  const createMutation = trpc.seo.ads.create.useMutation({
    onSuccess: () => { toast.success("Ad created!"); refetch(); setShowCreateDialog(false); resetForms(); },
    onError: (e) => toast.error("Failed to create ad: " + e.message),
  });
  const updateMutation = trpc.seo.ads.update.useMutation({
    onSuccess: () => { toast.success("Ad updated!"); refetch(); setEditingAd(null); },
    onError: (e) => toast.error("Failed to update ad: " + e.message),
  });
  const deleteMutation = trpc.seo.ads.delete.useMutation({
    onSuccess: () => { toast.success("Ad deleted"); refetch(); },
    onError: (e) => toast.error("Failed to delete ad: " + e.message),
  });
  const generateCopyMutation = trpc.seo.ads.generateCopy.useMutation();
  const updateMetricsMutation = trpc.seo.ads.updateMetrics.useMutation({
    onSuccess: () => { toast.success("Metrics updated!"); refetch(); },
    onError: (e) => toast.error("Failed to update metrics: " + e.message),
  });
  const generateVariantMutation = trpc.seo.ads.generateVariant.useMutation({
    onSuccess: () => { toast.success("Variant created!"); refetch(); },
    onError: (e) => toast.error("Failed to generate variant: " + e.message),
  });

  const resetForms = () => {
    setGoogleForm({ ...emptyGoogleForm });
    setFacebookForm({ ...emptyFacebookForm });
    setGenerateProduct("");
  };

  const handleGenerateCopy = async () => {
    if (!generateProduct.trim()) { toast.error("Enter a product/service to generate copy for"); return; }
    const clientId = parseInt(activeTab === "google" ? googleForm.clientId : facebookForm.clientId);
    const client = clients?.find((c) => c.id === clientId);
    setIsGenerating(true);
    try {
      const result = await generateCopyMutation.mutateAsync({
        clientId: clientId || 0,
        platform: activeTab,
        adType: activeTab === "google" ? (googleForm.adType as any) : (facebookForm.adType as any),
        product: generateProduct,
        targetAudience: (client as any)?.targetAudience || "",
        brandVoice: (client as any)?.brandVoice || "",
        destinationUrl: activeTab === "google" ? googleForm.destinationUrl : facebookForm.destinationUrl,
        keywords: activeTab === "google" ? googleForm.targetKeywords : "",
      });
      if (activeTab === "google") {
        setGoogleForm((p) => ({
          ...p,
          headline1: result.headline1 || p.headline1,
          headline2: result.headline2 || p.headline2,
          headline3: result.headline3 || p.headline3,
          description1: result.description1 || p.description1,
          description2: result.description2 || p.description2,
          displayUrl: result.displayUrl || p.displayUrl,
          callToAction: result.callToAction || p.callToAction,
        }));
      } else {
        setFacebookForm((p) => ({
          ...p,
          headline1: result.headline1 || p.headline1,
          primaryText: result.primaryText || p.primaryText,
          description1: result.description1 || p.description1,
          callToAction: result.callToAction || p.callToAction,
        }));
      }
      toast.success("Ad copy generated!");
    } catch (e: any) {
      toast.error("Generation failed: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = () => {
    const form = activeTab === "google" ? googleForm : facebookForm;
    if (!form.clientId) { toast.error("Select a client"); return; }
    createMutation.mutate({
      ...form,
      clientId: parseInt(form.clientId),
    } as any);
  };

  const handleStatusChange = (id: number, status: any) => {
    updateMutation.mutate({ id, status });
  };

  const platformAds = allAds?.filter((a) => a.platform === activeTab) ?? [];
  const googleAds = allAds?.filter((a) => a.platform === "google") ?? [];
  const facebookAds = allAds?.filter((a) => a.platform === "facebook") ?? [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Megaphone className="h-8 w-8" />
            Ads Manager
          </h1>
          <p className="text-muted-foreground mt-2">
            Create, manage, and track Google Ads and Facebook Ads for your clients. Use AI to generate platform-optimised copy instantly.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Ad
        </Button>
      </div>

      {/* Notice banner */}
      <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
        <strong>Note:</strong> This module creates and stores ad copy drafts. Direct publishing to Google Ads or Facebook Ads requires connecting your ad accounts via their respective APIs (Google Ads API / Facebook Marketing API). Connection settings can be configured per client in their profile. Ads marked as <strong>Ready</strong> can be manually copied and pasted into the ad platform.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Google Ads", value: googleAds.length, color: "text-blue-400" },
          { label: "Facebook Ads", value: facebookAds.length, color: "text-indigo-400" },
          { label: "Active", value: allAds?.filter((a) => a.status === "active").length ?? 0, color: "text-green-400" },
          { label: "Drafts", value: allAds?.filter((a) => a.status === "draft").length ?? 0, color: "text-muted-foreground" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-56 h-9">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients?.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="google" className="gap-2">
            <span className="text-blue-400 font-bold text-xs">G</span> Google Ads ({googleAds.length})
          </TabsTrigger>
          <TabsTrigger value="facebook" className="gap-2">
            <span className="text-indigo-400 font-bold text-xs">f</span> Facebook Ads ({facebookAds.length})
          </TabsTrigger>
        </TabsList>

        {(["google", "facebook"] as const).map((platform) => (
          <TabsContent key={platform} value={platform}>
            <AdsList
              ads={(allAds ?? []).filter((a) => a.platform === platform)}
              clients={clients ?? []}
              onStatusChange={handleStatusChange}
              onDelete={(id) => deleteMutation.mutate({ id })}
              onEdit={setEditingAd}
              isDeleting={deleteMutation.isPending}
              onUpdateMetrics={(id: number, m: any) => updateMetricsMutation.mutate({ id, ...m })}
              onGenerateVariant={(id: number) => generateVariantMutation.mutate({ adId: id })}
              isGeneratingVariant={generateVariantMutation.isPending}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(o) => { setShowCreateDialog(o); if (!o) resetForms(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> Create New Ad
            </DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="google">Google Ad</TabsTrigger>
              <TabsTrigger value="facebook">Facebook Ad</TabsTrigger>
            </TabsList>
            <TabsContent value="google">
              <GoogleAdForm
                form={googleForm}
                setForm={setGoogleForm}
                clients={clients ?? []}
                generateProduct={generateProduct}
                setGenerateProduct={setGenerateProduct}
                onGenerate={handleGenerateCopy}
                isGenerating={isGenerating}
                ctas={GOOGLE_CTAS}
                adTypes={GOOGLE_AD_TYPES}
              />
            </TabsContent>
            <TabsContent value="facebook">
              <FacebookAdForm
                form={facebookForm}
                setForm={setFacebookForm}
                clients={clients ?? []}
                generateProduct={generateProduct}
                setGenerateProduct={setGenerateProduct}
                onGenerate={handleGenerateCopy}
                isGenerating={isGenerating}
                ctas={FACEBOOK_CTAS}
                adTypes={FACEBOOK_AD_TYPES}
              />
            </TabsContent>
          </Tabs>
          <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForms(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Ad
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingAd && (
        <EditAdDialog
          ad={editingAd}
          clients={clients ?? []}
          onClose={() => setEditingAd(null)}
          onSave={(updates: any) => updateMutation.mutate({ id: editingAd.id, ...updates })}
          isSaving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── Ads List ────────────────────────────────────────────────────────────────
function AdsList({ ads, clients, onStatusChange, onDelete, onEdit, isDeleting, onUpdateMetrics, onGenerateVariant, isGeneratingVariant }: {
  ads: any[];
  clients: any[];
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onEdit: (ad: any) => void;
  isDeleting: boolean;
  onUpdateMetrics: (id: number, metrics: any) => void;
  onGenerateVariant: (id: number) => void;
  isGeneratingVariant: boolean;
}) {
  if (ads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No ads yet</p>
        <p className="text-sm">Click "New Ad" to create your first ad.</p>
      </div>
    );
  }

  const [expandedMetrics, setExpandedMetrics] = useState<number | null>(null);
  const [metricsForm, setMetricsForm] = useState<Record<number, { impressions: string; clicks: string; spend: string; conversions: string }>>({});

  const getMetricsForm = (ad: any) => metricsForm[ad.id] ?? {
    impressions: String(ad.impressions ?? 0),
    clicks: String(ad.clicks ?? 0),
    spend: String(ad.spend ?? "0"),
    conversions: String(ad.conversions ?? 0),
  };

  const ctr = (ad: any) => {
    const imp = ad.impressions ?? 0;
    const clk = ad.clicks ?? 0;
    if (!imp) return "—";
    return ((clk / imp) * 100).toFixed(2) + "%";
  };

  return (
    <div className="space-y-3">
      {ads.map((ad) => {
        const cfg = STATUS_CONFIG[ad.status] ?? STATUS_CONFIG.draft;
        const StatusIcon = cfg.icon;
        const client = clients.find((c) => c.id === ad.clientId);
        const mf = getMetricsForm(ad);
        const isMetricsOpen = expandedMetrics === ad.id;
        return (
          <Card key={ad.id} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm truncate">{ad.headline1 || "Untitled Ad"}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
                      <StatusIcon className="h-2.5 w-2.5 mr-1" />{cfg.label}
                    </Badge>
                    {ad.variantLabel && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ad.variantLabel}</Badge>}
                    {client && <span className="text-xs text-muted-foreground">{client.name}</span>}
                    {ad.campaignName && <span className="text-xs text-muted-foreground">· {ad.campaignName}</span>}
                  </div>
                  {ad.platform === "google" ? (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {ad.headline2 && <span className="mr-2">| {ad.headline2}</span>}
                      {ad.headline3 && <span>| {ad.headline3}</span>}
                      {ad.description1 && <p className="mt-1">{ad.description1}</p>}
                      {ad.displayUrl && <p className="text-green-400">{ad.displayUrl}</p>}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {ad.primaryText && <p className="line-clamp-2">{ad.primaryText}</p>}
                      {ad.description1 && <p className="mt-0.5 text-muted-foreground/70">{ad.description1}</p>}
                    </div>
                  )}
                  {ad.budget && <p className="text-xs text-primary mt-1">Budget: {ad.budget}</p>}
                  {/* Quick metrics row */}
                  {(ad.impressions > 0 || ad.clicks > 0) && (
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>👁 {ad.impressions?.toLocaleString() ?? 0} imp</span>
                      <span>🖱 {ad.clicks?.toLocaleString() ?? 0} clicks</span>
                      <span>CTR: {ctr(ad)}</span>
                      {ad.spend && ad.spend !== "0" && <span>💰 ${ad.spend}</span>}
                      {ad.conversions > 0 && <span>✅ {ad.conversions} conv</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setExpandedMetrics(isMetricsOpen ? null : ad.id)} title="Update metrics">
                    📊
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => onGenerateVariant(ad.id)} disabled={isGeneratingVariant} title="Generate A/B variant">
                    {isGeneratingVariant ? <Loader2 className="h-3 w-3 animate-spin" /> : "⚡"}
                  </Button>
                  <Select value={ad.status} onValueChange={(v) => onStatusChange(ad.id, v)}>
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                        <SelectItem key={v} value={v}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(ad)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(ad.id)} disabled={isDeleting}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {/* Metrics panel */}
              {isMetricsOpen && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Update Performance Metrics</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(["impressions", "clicks", "spend", "conversions"] as const).map((field) => (
                      <div key={field} className="space-y-1">
                        <label className="text-[10px] text-muted-foreground capitalize">{field === "spend" ? "Spend ($)" : field}</label>
                        <Input
                          type="number"
                          min="0"
                          className="h-7 text-xs"
                          value={mf[field]}
                          onChange={(e) => setMetricsForm((p) => ({ ...p, [ad.id]: { ...mf, [field]: e.target.value } }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => {
                      onUpdateMetrics(ad.id, {
                        impressions: parseInt(mf.impressions) || 0,
                        clicks: parseInt(mf.clicks) || 0,
                        spend: mf.spend || "0",
                        conversions: parseInt(mf.conversions) || 0,
                      });
                      setExpandedMetrics(null);
                    }}>Save Metrics</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpandedMetrics(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Google Ad Form ───────────────────────────────────────────────────────────
function GoogleAdForm({ form, setForm, clients, generateProduct, setGenerateProduct, onGenerate, isGenerating, ctas, adTypes }: any) {
  const charCount = (val: string, max: number) => (
    <span className={`text-[10px] ${val.length > max ? "text-red-400" : "text-muted-foreground"}`}>{val.length}/{max}</span>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Client *</Label>
          <Select value={form.clientId} onValueChange={(v) => setForm((p: any) => ({ ...p, clientId: v }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Ad Type</Label>
          <Select value={form.adType} onValueChange={(v) => setForm((p: any) => ({ ...p, adType: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{adTypes.map((t: any) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {/* AI Generate */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
        <p className="text-xs font-medium text-primary flex items-center gap-1"><Wand2 className="h-3 w-3" /> AI Copy Generator</p>
        <div className="flex gap-2">
          <Input placeholder="Describe the product/service..." value={generateProduct} onChange={(e) => setGenerateProduct(e.target.value)} className="h-8 text-sm" />
          <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between"><Label>Headline 1 *</Label>{charCount(form.headline1, 30)}</div>
        <Input maxLength={30} value={form.headline1} onChange={(e) => setForm((p: any) => ({ ...p, headline1: e.target.value }))} placeholder="Main headline (max 30 chars)" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex justify-between"><Label>Headline 2</Label>{charCount(form.headline2, 30)}</div>
          <Input maxLength={30} value={form.headline2} onChange={(e) => setForm((p: any) => ({ ...p, headline2: e.target.value }))} placeholder="Second headline" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between"><Label>Headline 3</Label>{charCount(form.headline3, 30)}</div>
          <Input maxLength={30} value={form.headline3} onChange={(e) => setForm((p: any) => ({ ...p, headline3: e.target.value }))} placeholder="Third headline" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between"><Label>Description 1</Label>{charCount(form.description1, 90)}</div>
        <Textarea maxLength={90} rows={2} value={form.description1} onChange={(e) => setForm((p: any) => ({ ...p, description1: e.target.value }))} placeholder="First description line (max 90 chars)" />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between"><Label>Description 2</Label>{charCount(form.description2, 90)}</div>
        <Textarea maxLength={90} rows={2} value={form.description2} onChange={(e) => setForm((p: any) => ({ ...p, description2: e.target.value }))} placeholder="Second description line (max 90 chars)" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Destination URL</Label>
          <Input value={form.destinationUrl} onChange={(e) => setForm((p: any) => ({ ...p, destinationUrl: e.target.value }))} placeholder="https://example.com/landing" />
        </div>
        <div className="space-y-1">
          <Label>Display URL</Label>
          <Input value={form.displayUrl} onChange={(e) => setForm((p: any) => ({ ...p, displayUrl: e.target.value }))} placeholder="example.com/path" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Call to Action</Label>
          <Select value={form.callToAction} onValueChange={(v) => setForm((p: any) => ({ ...p, callToAction: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{ctas.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Campaign Name</Label>
          <Input value={form.campaignName} onChange={(e) => setForm((p: any) => ({ ...p, campaignName: e.target.value }))} placeholder="e.g. Summer Sale 2025" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Target Keywords</Label>
          <Input value={form.targetKeywords} onChange={(e) => setForm((p: any) => ({ ...p, targetKeywords: e.target.value }))} placeholder="Comma-separated keywords" />
        </div>
        <div className="space-y-1">
          <Label>Budget</Label>
          <Input value={form.budget} onChange={(e) => setForm((p: any) => ({ ...p, budget: e.target.value }))} placeholder="e.g. $50/day" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea rows={2} value={form.notes} onChange={(e) => setForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Internal notes..." />
      </div>
    </div>
  );
}

// ─── Facebook Ad Form ─────────────────────────────────────────────────────────
function FacebookAdForm({ form, setForm, clients, generateProduct, setGenerateProduct, onGenerate, isGenerating, ctas, adTypes }: any) {
  const charCount = (val: string, max: number) => (
    <span className={`text-[10px] ${val.length > max ? "text-red-400" : "text-muted-foreground"}`}>{val.length}/{max}</span>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Client *</Label>
          <Select value={form.clientId} onValueChange={(v) => setForm((p: any) => ({ ...p, clientId: v }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Ad Type</Label>
          <Select value={form.adType} onValueChange={(v) => setForm((p: any) => ({ ...p, adType: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{adTypes.map((t: any) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {/* AI Generate */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
        <p className="text-xs font-medium text-primary flex items-center gap-1"><Wand2 className="h-3 w-3" /> AI Copy Generator</p>
        <div className="flex gap-2">
          <Input placeholder="Describe the product/service..." value={generateProduct} onChange={(e) => setGenerateProduct(e.target.value)} className="h-8 text-sm" />
          <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between"><Label>Primary Text *</Label>{charCount(form.primaryText || "", 125)}</div>
        <Textarea maxLength={125} rows={3} value={form.primaryText || ""} onChange={(e) => setForm((p: any) => ({ ...p, primaryText: e.target.value }))} placeholder="Main ad copy shown above the image (max 125 chars)" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex justify-between"><Label>Headline</Label>{charCount(form.headline1 || "", 40)}</div>
          <Input maxLength={40} value={form.headline1 || ""} onChange={(e) => setForm((p: any) => ({ ...p, headline1: e.target.value }))} placeholder="Ad headline (max 40 chars)" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between"><Label>Link Description</Label>{charCount(form.description1 || "", 30)}</div>
          <Input maxLength={30} value={form.description1 || ""} onChange={(e) => setForm((p: any) => ({ ...p, description1: e.target.value }))} placeholder="Link description (max 30 chars)" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Call to Action</Label>
          <Select value={form.callToAction} onValueChange={(v) => setForm((p: any) => ({ ...p, callToAction: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{ctas.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Destination URL</Label>
          <Input value={form.destinationUrl} onChange={(e) => setForm((p: any) => ({ ...p, destinationUrl: e.target.value }))} placeholder="https://example.com/landing" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Campaign Name</Label>
          <Input value={form.campaignName} onChange={(e) => setForm((p: any) => ({ ...p, campaignName: e.target.value }))} placeholder="e.g. Brand Awareness Q1" />
        </div>
        <div className="space-y-1">
          <Label>Ad Set Name</Label>
          <Input value={form.adSetName} onChange={(e) => setForm((p: any) => ({ ...p, adSetName: e.target.value }))} placeholder="e.g. Retargeting - Website Visitors" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Target Audience</Label>
          <Input value={form.targetAudience} onChange={(e) => setForm((p: any) => ({ ...p, targetAudience: e.target.value }))} placeholder="e.g. Business owners 35-55" />
        </div>
        <div className="space-y-1">
          <Label>Budget</Label>
          <Input value={form.budget} onChange={(e) => setForm((p: any) => ({ ...p, budget: e.target.value }))} placeholder="e.g. $20/day" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea rows={2} value={form.notes} onChange={(e) => setForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Internal notes..." />
      </div>
    </div>
  );
}

// ─── Edit Ad Dialog ───────────────────────────────────────────────────────────
function EditAdDialog({ ad, clients, onClose, onSave, isSaving }: any) {
  const [form, setForm] = useState({ ...ad });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ad</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {ad.platform === "google" ? (
            <>
              <div className="space-y-1"><Label>Headline 1</Label><Input maxLength={30} value={form.headline1 || ""} onChange={(e) => setForm((p: any) => ({ ...p, headline1: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Headline 2</Label><Input maxLength={30} value={form.headline2 || ""} onChange={(e) => setForm((p: any) => ({ ...p, headline2: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Headline 3</Label><Input maxLength={30} value={form.headline3 || ""} onChange={(e) => setForm((p: any) => ({ ...p, headline3: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Description 1</Label><Textarea maxLength={90} rows={2} value={form.description1 || ""} onChange={(e) => setForm((p: any) => ({ ...p, description1: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Description 2</Label><Textarea maxLength={90} rows={2} value={form.description2 || ""} onChange={(e) => setForm((p: any) => ({ ...p, description2: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Display URL</Label><Input value={form.displayUrl || ""} onChange={(e) => setForm((p: any) => ({ ...p, displayUrl: e.target.value }))} /></div>
            </>
          ) : (
            <>
              <div className="space-y-1"><Label>Primary Text</Label><Textarea maxLength={125} rows={3} value={form.primaryText || ""} onChange={(e) => setForm((p: any) => ({ ...p, primaryText: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Headline</Label><Input maxLength={40} value={form.headline1 || ""} onChange={(e) => setForm((p: any) => ({ ...p, headline1: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Link Description</Label><Input maxLength={30} value={form.description1 || ""} onChange={(e) => setForm((p: any) => ({ ...p, description1: e.target.value }))} /></div>
            </>
          )}
          <div className="space-y-1"><Label>Destination URL</Label><Input value={form.destinationUrl || ""} onChange={(e) => setForm((p: any) => ({ ...p, destinationUrl: e.target.value }))} /></div>
          <div className="space-y-1"><Label>Budget</Label><Input value={form.budget || ""} onChange={(e) => setForm((p: any) => ({ ...p, budget: e.target.value }))} /></div>
          <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm((p: any) => ({ ...p, notes: e.target.value }))} /></div>
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
