import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Globe, Sparkles, Plus, Eye, Trash2, RefreshCw, Download, Copy,
  CheckCircle2, Clock, Loader2, Palette, Building2, Phone, Mail,
  MapPin, Award, Calendar, ExternalLink, Code2, Layout
} from "lucide-react";

const COLOR_SCHEMES = [
  { value: "navy", label: "Navy Blue", preview: "#0f172a", accent: "#3b82f6" },
  { value: "dark", label: "Deep Dark", preview: "#111827", accent: "#6366f1" },
  { value: "forest", label: "Forest Green", preview: "#052e16", accent: "#22c55e" },
  { value: "burgundy", label: "Burgundy", preview: "#1c0a0e", accent: "#f43f5e" },
  { value: "charcoal", label: "Charcoal Gold", preview: "#1c1917", accent: "#f59e0b" },
];

const LOAN_SPECIALTIES = [
  "Purchase Loans", "Refinancing", "FHA Loans", "VA Loans", "USDA Loans",
  "Jumbo Loans", "Conventional Loans", "First-Time Homebuyer", "Investment Properties",
  "Cash-Out Refinance", "Reverse Mortgages", "Construction Loans", "HELOC",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  generating: { label: "Generating...", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  ready: { label: "Ready", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
  published: { label: "Published", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Globe className="h-3 w-3" /> },
  archived: { label: "Archived", color: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
};

function NewWebsiteDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    licenseNumber: "",
    yearsExperience: "",
    colorScheme: "navy" as const,
    specialties: [] as string[],
  });

  const createMutation = trpc.websiteGenerator.create.useMutation({
    onSuccess: () => {
      toast.success("Website project created!");
      setOpen(false);
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleSpecialty = (s: string) => {
    setForm(f => ({
      ...f,
      specialties: f.specialties.includes(s) ? f.specialties.filter(x => x !== s) : [...f.specialties, s],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New Website</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Create New Loan Officer Website
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Business Name *</Label>
              <Input
                placeholder="e.g. Smith Mortgage Group"
                value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Loan Officer Name</Label>
              <Input
                placeholder="e.g. John Smith"
                value={form.ownerName}
                onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>NMLS License #</Label>
              <Input
                placeholder="e.g. 123456"
                value={form.licenseNumber}
                onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                placeholder="john@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                placeholder="e.g. Austin"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                placeholder="e.g. TX"
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Years Experience</Label>
              <Input
                type="number"
                placeholder="10"
                value={form.yearsExperience}
                onChange={e => setForm(f => ({ ...f, yearsExperience: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <Label className="mb-2 block">Color Scheme</Label>
            <div className="flex gap-3 flex-wrap">
              {COLOR_SCHEMES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setForm(f => ({ ...f, colorScheme: c.value as any }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                    form.colorScheme === c.value ? "border-primary" : "border-border"
                  }`}
                >
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full" style={{ background: c.preview }} />
                    <div className="w-4 h-4 rounded-full" style={{ background: c.accent }} />
                  </div>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Specialties */}
          <div>
            <Label className="mb-2 block">Loan Specialties</Label>
            <div className="flex flex-wrap gap-2">
              {LOAN_SPECIALTIES.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSpecialty(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.specialties.includes(s)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full gap-2"
            disabled={!form.businessName || createMutation.isPending}
            onClick={() => createMutation.mutate({
              ...form,
              yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : undefined,
            })}
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Website Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WebsitePreviewDialog({ site }: { site: any }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
          <Eye className="h-3 w-3" /> Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{site.businessName}</span>
            <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[site.status]?.color}`}>
              {STATUS_CONFIG[site.status]?.label}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => {
                const blob = new Blob([site.generatedHtml || ""], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${site.businessName.replace(/\s+/g, "-").toLowerCase()}.html`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("HTML downloaded!");
              }}
            >
              <Download className="h-3 w-3" /> Download HTML
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => {
                navigator.clipboard.writeText(site.generatedHtml || "");
                toast.success("HTML copied to clipboard!");
              }}
            >
              <Copy className="h-3 w-3" /> Copy HTML
            </Button>
          </div>
        </div>
        {site.generatedHtml ? (
          <iframe
            srcDoc={site.generatedHtml}
            className="w-full"
            style={{ height: "calc(90vh - 60px)", border: "none" }}
            title={`Preview: ${site.businessName}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Layout className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">No preview available yet. Generate the website first.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WebsiteCard({ site, onRefresh }: { site: any; onRefresh: () => void }) {
  const generateMutation = trpc.websiteGenerator.generate.useMutation({
    onSuccess: () => {
      toast.success("Website generated successfully!");
      onRefresh();
    },
    onError: (e) => {
      toast.error("Generation failed: " + e.message);
      onRefresh();
    },
  });

  const deleteMutation = trpc.websiteGenerator.delete.useMutation({
    onSuccess: () => {
      toast.success("Website deleted");
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const colorScheme = COLOR_SCHEMES.find(c => c.value === (site.colorScheme || "navy")) || COLOR_SCHEMES[0];
  const statusCfg = STATUS_CONFIG[site.status] || STATUS_CONFIG.draft;
  const specialties = site.specialties ? JSON.parse(site.specialties) : [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Color preview */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: `linear-gradient(135deg, ${colorScheme.preview}, ${colorScheme.accent})` }}
            >
              {site.businessName.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-base">{site.businessName}</CardTitle>
              {site.ownerName && (
                <p className="text-xs text-muted-foreground">{site.ownerName}</p>
              )}
            </div>
          </div>
          <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 shrink-0 ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {site.city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              {site.city}{site.state ? `, ${site.state}` : ""}
            </div>
          )}
          {site.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              {site.phone}
            </div>
          )}
          {site.licenseNumber && (
            <div className="flex items-center gap-1.5">
              <Award className="h-3 w-3" />
              NMLS #{site.licenseNumber}
            </div>
          )}
          {site.yearsExperience && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {site.yearsExperience}+ years
            </div>
          )}
        </div>

        {/* Specialties */}
        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {specialties.slice(0, 3).map((s: string) => (
              <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
            ))}
            {specialties.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{specialties.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Color scheme */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Palette className="h-3 w-3" />
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full" style={{ background: colorScheme.preview }} />
            <div className="w-3 h-3 rounded-full" style={{ background: colorScheme.accent }} />
          </div>
          {colorScheme.label}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {(site.status === "draft" || site.status === "ready") && (
            <Button
              size="sm"
              className="gap-1.5 text-xs h-7 flex-1"
              disabled={generateMutation.isPending || site.status === "generating"}
              onClick={() => generateMutation.mutate({ id: site.id })}
            >
              {generateMutation.isPending || site.status === "generating" ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="h-3 w-3" /> {site.status === "ready" ? "Regenerate" : "Generate AI Content"}</>
              )}
            </Button>
          )}
          {site.status === "ready" || site.status === "published" ? (
            <WebsitePreviewDialog site={site} />
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-7 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("Delete this website?")) deleteMutation.mutate({ id: site.id });
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Published URL */}
        {site.publishedUrl && (
          <a
            href={site.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {site.publishedUrl}
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export default function WebsiteGenerator() {
  const { data: sites, isLoading, refetch } = trpc.websiteGenerator.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: (data) => {
      // Poll every 5s if any site is generating
      if (data && Array.isArray(data) && data.some((s: any) => s.status === "generating")) return 5000;
      return false;
    },
  });

  const readySites = sites?.filter((s: any) => s.status === "ready" || s.status === "published") || [];
  const draftSites = sites?.filter((s: any) => s.status === "draft" || s.status === "generating") || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            AI Website Generator
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate high-converting loan officer websites in minutes — dark, bold, and built to convert like Takeoff Digital.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <NewWebsiteDialog onCreated={() => refetch()} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Sites", value: sites?.length || 0, icon: <Globe className="h-4 w-4 text-primary" /> },
          { label: "Ready to Deploy", value: readySites.length, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
          { label: "In Progress", value: draftSites.length, icon: <Clock className="h-4 w-4 text-amber-500" /> },
          { label: "Published", value: sites?.filter((s: any) => s.status === "published").length || 0, icon: <ExternalLink className="h-4 w-4 text-blue-500" /> },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How it works */}
      {(!sites || sites.length === 0) && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8">
            <div className="text-center max-w-lg mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate Your First Loan Officer Website</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Enter the loan officer's info, pick a color scheme, and our AI generates a complete, high-converting website — hero section, services, testimonials, about page, FAQ, and CTA — in under 60 seconds.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6 text-left">
                {[
                  { step: "1", title: "Enter Info", desc: "Business name, location, specialties" },
                  { step: "2", title: "AI Generates", desc: "Headlines, copy, testimonials, FAQ" },
                  { step: "3", title: "Download & Deploy", desc: "Get clean HTML ready to host" },
                ].map(s => (
                  <div key={s.step} className="bg-muted/50 rounded-lg p-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold mb-2">{s.step}</div>
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
              <NewWebsiteDialog onCreated={() => refetch()} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sites Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
              <CardContent><div className="h-24 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : sites && sites.length > 0 ? (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({sites.length})</TabsTrigger>
            <TabsTrigger value="ready">Ready ({readySites.length})</TabsTrigger>
            <TabsTrigger value="draft">Draft ({draftSites.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((site: any) => (
                <WebsiteCard key={site.id} site={site} onRefresh={() => refetch()} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="ready" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {readySites.map((site: any) => (
                <WebsiteCard key={site.id} site={site} onRefresh={() => refetch()} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="draft" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftSites.map((site: any) => (
                <WebsiteCard key={site.id} site={site} onRefresh={() => refetch()} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
