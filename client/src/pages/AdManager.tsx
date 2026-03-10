import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  Megaphone,
  MousePointerClick,
  PauseCircle,
  Play,
  Plus,
  Target,
  TrendingUp,
  Wand2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
  ready: { label: "Ready", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  active: { label: "Active", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  paused: { label: "Paused", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  completed: { label: "Completed", color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
};

const PLATFORM_CONFIG = {
  google: { label: "Google Ads", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  facebook: { label: "Facebook Ads", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
};

function AdCard({ ad, onStatusChange }: { ad: any; onStatusChange: (id: number, status: string) => void }) {
  const platform = PLATFORM_CONFIG[ad.platform as keyof typeof PLATFORM_CONFIG] ?? PLATFORM_CONFIG.google;
  const status = STATUS_CONFIG[ad.status] ?? STATUS_CONFIG.draft;
  const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(2) + "%" : "—";

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`px-2 py-0.5 rounded text-xs font-semibold ${platform.bg} ${platform.color} border ${platform.border}`}>
              {platform.label}
            </div>
            <span className="text-xs text-muted-foreground capitalize">{ad.adType?.replace(/_/g, " ")}</span>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>

        <h3 className="font-semibold text-sm mb-1 line-clamp-1">
          {ad.headline1 || "Untitled Ad"}
        </h3>
        {ad.headline2 && <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{ad.headline2}</p>}
        {(ad.description1 || ad.primaryText) && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {ad.description1 || ad.primaryText}
          </p>
        )}

        {/* Metrics */}
        {(ad.impressions || ad.clicks || ad.spend) ? (
          <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-muted/40 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Impressions</p>
              <p className="text-sm font-semibold">{ad.impressions?.toLocaleString() ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Clicks</p>
              <p className="text-sm font-semibold">{ad.clicks?.toLocaleString() ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">CTR</p>
              <p className="text-sm font-semibold">{ctr}</p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2 flex-wrap">
          {ad.status !== "active" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => onStatusChange(ad.id, "active")}
            >
              <Play className="w-3 h-3" /> Activate
            </Button>
          )}
          {ad.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
              onClick={() => onStatusChange(ad.id, "paused")}
            >
              <PauseCircle className="w-3 h-3" /> Pause
            </Button>
          )}
          {ad.destinationUrl && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" asChild>
              <a href={ad.destinationUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" /> Preview
              </a>
            </Button>
          )}
          {ad.budget && (
            <span className="text-xs text-muted-foreground ml-auto">Budget: ${ad.budget}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateAdDialog({ clientId, onSuccess }: { clientId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"google" | "facebook">("facebook");
  const [generateProduct, setGenerateProduct] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [form, setForm] = useState({
    headline1: "", headline2: "", headline3: "",
    description1: "", description2: "", primaryText: "",
    callToAction: "Learn More", destinationUrl: "", budget: "",
    adType: "image",
  });

  const createMutation = trpc.seo.ads.create.useMutation({
    onSuccess: () => {
      toast.success("Ad created successfully!");
      setOpen(false);
      onSuccess();
    },
    onError: (e) => toast.error("Failed to create ad: " + e.message),
  });

  const generateCopyMutation = trpc.seo.ads.generateCopy.useMutation();

  const handleGenerate = async () => {
    if (!generateProduct.trim()) { toast.error("Enter a product or service to generate copy for"); return; }
    setIsGenerating(true);
    try {
      const result = await generateCopyMutation.mutateAsync({
        clientId,
        platform,
        adType: form.adType as any,
        product: generateProduct,
        targetAudience: "homebuyers and homeowners",
        brandVoice: "professional, trustworthy, helpful",
        destinationUrl: form.destinationUrl,
        keywords: platform === "google" ? "mortgage, home loan, refinance" : "",
      });
      setForm(p => ({
        ...p,
        headline1: result.headline1 || p.headline1,
        headline2: result.headline2 || p.headline2,
        headline3: result.headline3 || p.headline3,
        description1: result.description1 || p.description1,
        description2: result.description2 || p.description2,
        primaryText: result.primaryText || p.primaryText,
        callToAction: result.callToAction || p.callToAction,
      }));
      toast.success("Ad copy generated!");
    } catch (e: any) {
      toast.error("Generation failed: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Create Ad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-500" /> Create New Ad
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Platform selector */}
          <div className="grid grid-cols-2 gap-2">
            {(["google", "facebook"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  platform === p
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-border text-muted-foreground hover:border-blue-300"
                }`}
              >
                {p === "google" ? "🔍 Google Ads" : "📘 Facebook Ads"}
              </button>
            ))}
          </div>

          {/* Ad type */}
          <div className="space-y-1.5">
            <Label className="text-sm">Ad Type</Label>
            <Select value={form.adType} onValueChange={v => setForm(p => ({ ...p, adType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {platform === "google" ? (
                  <>
                    <SelectItem value="search">Search Ad</SelectItem>
                    <SelectItem value="responsive_search">Responsive Search Ad</SelectItem>
                    <SelectItem value="display">Display Ad</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="image">Image Ad</SelectItem>
                    <SelectItem value="carousel">Carousel Ad</SelectItem>
                    <SelectItem value="video">Video Ad</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* AI Generate */}
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 space-y-2">
            <p className="text-xs font-semibold text-purple-700 flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5" /> AI Copy Generator
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. mortgage refinancing, first-time homebuyer loans..."
                value={generateProduct}
                onChange={e => setGenerateProduct(e.target.value)}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-purple-600 hover:bg-purple-700 shrink-0"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Copy fields */}
          {platform === "google" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm">Headline 1 <span className="text-muted-foreground">(max 30 chars)</span></Label>
                <Input maxLength={30} value={form.headline1} onChange={e => setForm(p => ({ ...p, headline1: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Headline 2</Label>
                <Input maxLength={30} value={form.headline2} onChange={e => setForm(p => ({ ...p, headline2: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Description 1 <span className="text-muted-foreground">(max 90 chars)</span></Label>
                <Textarea maxLength={90} rows={2} value={form.description1} onChange={e => setForm(p => ({ ...p, description1: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Description 2</Label>
                <Textarea maxLength={90} rows={2} value={form.description2} onChange={e => setForm(p => ({ ...p, description2: e.target.value }))} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm">Primary Text <span className="text-muted-foreground">(max 125 chars)</span></Label>
                <Textarea maxLength={125} rows={3} value={form.primaryText} onChange={e => setForm(p => ({ ...p, primaryText: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Headline <span className="text-muted-foreground">(max 40 chars)</span></Label>
                <Input maxLength={40} value={form.headline1} onChange={e => setForm(p => ({ ...p, headline1: e.target.value }))} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Destination URL</Label>
            <Input placeholder="https://yourdomain.com/landing" value={form.destinationUrl} onChange={e => setForm(p => ({ ...p, destinationUrl: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Daily Budget ($)</Label>
            <Input placeholder="50" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Call to Action</Label>
            <Select value={form.callToAction} onValueChange={v => setForm(p => ({ ...p, callToAction: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Learn More", "Get Quote", "Contact Us", "Book Now", "Sign Up", "Apply Now", "Download"].map(cta => (
                  <SelectItem key={cta} value={cta}>{cta}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={createMutation.isPending || (!form.headline1 && !form.primaryText)}
            onClick={() => createMutation.mutate({
              clientId,
              platform,
              adType: form.adType as any,
              headline1: form.headline1,
              headline2: form.headline2 || undefined,
              headline3: form.headline3 || undefined,
              description1: form.description1 || undefined,
              description2: form.description2 || undefined,
              primaryText: form.primaryText || undefined,
              callToAction: form.callToAction,
              destinationUrl: form.destinationUrl || undefined,
              budget: form.budget || undefined,
              status: "draft",
            } as any)}
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span>
            ) : (
              <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Create Ad</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdManager() {
  const { user } = useAuth();
  const clientId = (user as any)?.clientId ?? 1;
  const [platform, setPlatform] = useState<"all" | "google" | "facebook">("all");

  const { data: allAds, isLoading, refetch } = trpc.seo.ads.list.useQuery({ clientId });
  const updateMutation = trpc.seo.ads.update.useMutation({
    onSuccess: () => { toast.success("Ad updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filteredAds = allAds?.filter((a: any) => platform === "all" || a.platform === platform) ?? [];

  const stats = {
    total: allAds?.length ?? 0,
    active: allAds?.filter((a: any) => a.status === "active").length ?? 0,
    totalImpressions: allAds?.reduce((s: number, a: any) => s + (a.impressions || 0), 0) ?? 0,
    totalClicks: allAds?.reduce((s: number, a: any) => s + (a.clicks || 0), 0) ?? 0,
  };

  const overallCtr = stats.totalImpressions
    ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) + "%"
    : "—";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-blue-500" /> Ad Manager
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Create, manage, and track your Google and Facebook ad campaigns
            </p>
          </div>
          <CreateAdDialog clientId={clientId} onSuccess={refetch} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Ads", value: stats.total, icon: Megaphone, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Active Ads", value: stats.active, icon: Play, color: "text-green-600", bg: "bg-green-50" },
            { label: "Total Impressions", value: stats.totalImpressions.toLocaleString(), icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Overall CTR", value: overallCtr, icon: MousePointerClick, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className="text-2xl font-bold mt-0.5">{value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform filter + Ad grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {(["all", "google", "facebook"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  platform === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {p === "all" ? "All Platforms" : p === "google" ? "🔍 Google" : "📘 Facebook"}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{filteredAds.length} ads</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          ) : filteredAds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAds.map((ad: any) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Megaphone className="w-8 h-8 text-blue-400" />
                </div>
                <p className="font-semibold text-base">No ads yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  Create your first Google or Facebook ad. Use the AI generator to write compelling copy in seconds.
                </p>
                <div className="mt-4">
                  <CreateAdDialog clientId={clientId} onSuccess={refetch} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tips */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Ad Performance Tips for Loan Officers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Target,
                  color: "bg-blue-50 text-blue-600",
                  title: "Target Life Events",
                  desc: "Facebook's life event targeting (new home, marriage, new job) reaches buyers at the perfect moment.",
                },
                {
                  icon: BarChart3,
                  color: "bg-green-50 text-green-600",
                  title: "Use Rate Keywords",
                  desc: "Google search ads with current rate keywords (\"best mortgage rate 2025\") drive high-intent traffic.",
                },
                {
                  icon: MousePointerClick,
                  color: "bg-purple-50 text-purple-600",
                  title: "A/B Test Headlines",
                  desc: "Use the AI variant generator to test 3-5 headlines. Small copy changes can double your CTR.",
                },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
