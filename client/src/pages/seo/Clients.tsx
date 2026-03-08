import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, Building2, Mail, Phone, Globe, Zap,
  Users, FileText, DollarSign, Search, ChevronUp, ChevronDown,
  Download, CheckSquare, RefreshCw, TrendingUp,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type SortField = "name" | "company" | "email" | "phone" | "createdAt" | "content" | "health";
type SortDir = "asc" | "desc";

export default function Clients() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({ name: "", email: "", company: "", notes: "", companyColors: "" });
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [assignPlanOpen, setAssignPlanOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [syncBrandVoiceOpen, setSyncBrandVoiceOpen] = useState(false);
  const [brandVoiceTemplate, setBrandVoiceTemplate] = useState("");

  const { data: clients, isLoading, refetch } = trpc.seo.clients.list.useQuery();
  const { data: contentList } = trpc.seo.content.list.useQuery();
  const utils = trpc.useUtils();
  const { data: seedCheck } = trpc.seo.seed.check.useQuery();

  const createMutation = trpc.seo.clients.create.useMutation();
  const updateMutation = trpc.seo.clients.update.useMutation();
  const deleteMutation = trpc.seo.clients.delete.useMutation();
  const { data: recurringPlans } = trpc.seo.recurringPlans.list.useQuery();
  const createPlanMutation = trpc.seo.recurringPlans.create.useMutation();
  const bulkUpdateMutation = trpc.seo.clients.update.useMutation();
  const { data: pipelineData } = trpc.seo.pipeline.list.useQuery();
  const createPipelineMutation = trpc.seo.pipeline.create.useMutation({
    onSuccess: () => {
      utils.seo.pipeline.list.invalidate();
      toast.success("Added to pipeline");
    },
    onError: () => toast.error("Failed to add to pipeline"),
  });
  const isInPipeline = (clientName: string) =>
    pipelineData?.some(c => c.businessName === clientName) ?? false;

  const seedMutation = trpc.seo.seed.run.useMutation({
    onSuccess: (result) => {
      toast.success(`Demo data loaded: ${result.created.clients} clients, ${result.created.content} content pieces added.`);
      utils.seo.clients.list.invalidate();
      utils.seo.content.list.invalidate();
      utils.seo.seed.check.invalidate();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const getClientContentCount = (clientId: number) =>
    contentList?.filter((c) => c.content.clientId === clientId).length || 0;

  // Health score: 0-100 based on content recency, avg quality, and volume
  const getClientHealth = (clientId: number): { score: number; label: string; color: string; recency: number; quality: number; volume: number; pieces: number } => {
    const pieces = contentList?.filter((c) => c.content.clientId === clientId) || [];
    if (pieces.length === 0) return { score: 0, label: "No Data", color: "text-muted-foreground", recency: 0, quality: 0, volume: 0, pieces: 0 };
    // Recency: most recent content within 30 days = 40pts
    const mostRecent = Math.max(...pieces.map(p => new Date(p.content.createdAt).getTime()));
    const daysSince = (Date.now() - mostRecent) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 40 - Math.floor(daysSince / 30) * 10);
    // Quality: avg quality score / 100 * 40pts
    const avgQuality = pieces.reduce((s, p) => s + ((p as any).qualityScore || 0), 0) / pieces.length;
    const qualityScore = Math.round((avgQuality / 100) * 40);
    // Volume: 1+ pieces = 10pts, 3+ = 15pts, 5+ = 20pts
    const volumeScore = pieces.length >= 5 ? 20 : pieces.length >= 3 ? 15 : 10;
    const total = Math.min(100, recencyScore + qualityScore + volumeScore);
    const label = total >= 75 ? "Healthy" : total >= 45 ? "Fair" : "At Risk";
    const color = total >= 75 ? "text-emerald-500" : total >= 45 ? "text-amber-500" : "text-red-500";
    return { score: total, label, color, recency: recencyScore, quality: qualityScore, volume: volumeScore, pieces: pieces.length };
  };

  const totalBudget = clients?.reduce((sum, c) => sum + parseFloat((c.monthlyBudget as string) || "0"), 0) ?? 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase();
    let list = clients.filter(c => {
      if (!(!q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q))) return false;
      if (statusFilter === "active" && !c.isActive) return false;
      if (statusFilter === "inactive" && c.isActive) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let va: any, vb: any;
      if (sortField === "content") {
        va = getClientContentCount(a.id);
        vb = getClientContentCount(b.id);
      } else if (sortField === "health") {
        va = getClientHealth(a.id).score;
        vb = getClientHealth(b.id).score;
      } else if (sortField === "createdAt") {
        va = new Date(a.createdAt).getTime();
        vb = new Date(b.createdAt).getTime();
      } else {
        va = (a[sortField] || "").toString().toLowerCase();
        vb = (b[sortField] || "").toString().toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [clients, search, sortField, sortDir, contentList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateMutation.mutateAsync({ id: editingClient.id, ...formData });
        toast.success("Client updated successfully");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Client created successfully");
      }
      setIsCreateOpen(false);
      setEditingClient(null);
      setFormData({ name: "", email: "", company: "", notes: "", companyColors: "" });
      refetch();
    } catch {
      toast.error("Failed to save client");
    }
  };

  const handleEdit = (e: React.MouseEvent, client: any) => {
    e.stopPropagation();
    setEditingClient(client);
    setFormData({ name: client.name, email: client.email || "", company: client.company || "", notes: client.notes || "", companyColors: (client as any).companyColors || "" });
    setIsCreateOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this client? This will also delete all their content.")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("Client deleted");
        refetch();
        utils.seo.seed.check.invalidate();
      } catch {
        toast.error("Failed to delete client");
      }
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const exportCSV = () => {
    const rows = filteredClients
      .filter(c => selectedIds.size === 0 || selectedIds.has(c.id))
      .map(c => [c.name, c.email || "", c.company || "", c.phone || "", c.industry || "", new Date(c.createdAt).toLocaleDateString()]);
    const header = ["Name", "Email", "Company", "Phone", "Industry", "Created"];
    const csv = [header, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "clients.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} contacts`);
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected client(s)? This will also delete all their content.`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync({ id })));
      toast.success(`Deleted ${selectedIds.size} client(s)`);
      setSelectedIds(new Set());
      refetch();
      utils.seo.seed.check.invalidate();
    } catch {
      toast.error("Failed to delete some clients");
    }
  };

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-primary" />
      : <ChevronDown className="h-3 w-3 text-primary" />;
  }

  function ColHeader({ field, label }: { field: SortField; label: string }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none whitespace-nowrap"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          <SortIcon field={field} />
        </div>
      </th>
    );
  }

  return (
    <div className="p-6 min-w-0">
      {/* Demo data banner */}
      {seedCheck && !seedCheck.hasData && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm">No clients yet — load demo data to see the platform in action.</p>
          </div>
          <Button size="sm" className="shrink-0 gap-2" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <><Zap className="h-3.5 w-3.5 animate-spin" /> Loading...</> : <><Zap className="h-3.5 w-3.5" /> Load Demo Data</>}
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 shrink-0">
            Contacts
            {clients && (
              <span className="text-sm font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {filteredClients.length} {filteredClients.length === 1 ? "Contact" : "Contacts"}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingClient(null); setFormData({ name: "", email: "", company: "", notes: "", companyColors: "" }); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Brand Colours</Label>
                <p className="text-xs text-muted-foreground mb-2">Pick up to 5 brand colours. Click a swatch to change it, or remove it with ×.</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {(formData.companyColors ? formData.companyColors.split(',').map(c => c.trim()).filter(Boolean) : []).map((hex, i) => (
                    <div key={i} className="relative group">
                      <label className="cursor-pointer">
                        <div className="w-9 h-9 rounded-md border-2 border-border shadow-sm" style={{ background: hex }} />
                        <input
                          type="color"
                          value={hex.startsWith('#') && hex.length >= 4 ? hex : '#000000'}
                          className="sr-only"
                          onChange={(e) => {
                            const colors = formData.companyColors.split(',').map(c => c.trim()).filter(Boolean);
                            colors[i] = e.target.value;
                            setFormData({ ...formData, companyColors: colors.join(', ') });
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] hidden group-hover:flex items-center justify-center leading-none"
                        onClick={() => {
                          const colors = formData.companyColors.split(',').map(c => c.trim()).filter(Boolean);
                          colors.splice(i, 1);
                          setFormData({ ...formData, companyColors: colors.join(', ') });
                        }}
                      >×</button>
                    </div>
                  ))}
                  {(formData.companyColors ? formData.companyColors.split(',').filter(Boolean) : []).length < 5 && (
                    <label className="cursor-pointer">
                      <div className="w-9 h-9 rounded-md border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary transition-colors text-lg">+</div>
                      <input
                        type="color"
                        defaultValue="#3b82f6"
                        className="sr-only"
                        onChange={(e) => {
                          const existing = formData.companyColors ? formData.companyColors.split(',').map(c => c.trim()).filter(Boolean) : [];
                          setFormData({ ...formData, companyColors: [...existing, e.target.value].join(', ') });
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingClient ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditingClient(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats bar */}
      {clients && clients.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clients.length}</p>
                  <p className="text-xs text-muted-foreground">Total Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contentList?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total Content</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Monthly Budget</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s === "active" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Filter contacts by name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autoComplete="off"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="text-xs h-9 shrink-0">
            Clear filter
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {filteredClients.length} of {clients?.length ?? 0} contacts
        </span>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setAssignPlanOpen(true)}>
              <RefreshCw className="h-3 w-3" /> Assign Plan
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setSyncBrandVoiceOpen(true)}>
              <Zap className="h-3 w-3" /> Sync Brand Voice
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={exportCSV}>
              <Download className="h-3 w-3" /> Export CSV
            </Button>
            <Button size="sm" variant="destructive" className="h-7 gap-1.5 text-xs" onClick={bulkDelete} disabled={deleteMutation.isPending}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      {/* Bulk brand voice sync dialog */}
      <Dialog open={syncBrandVoiceOpen} onOpenChange={setSyncBrandVoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Brand Voice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Apply the same brand voice template to all {selectedIds.size} selected client(s). This will overwrite their existing brand voice field.
            </p>
            <div className="space-y-2">
              <Label>Brand Voice Template</Label>
              <Textarea
                placeholder="e.g. Professional but approachable, data-driven, avoids jargon, uses active voice, targets business owners..."
                value={brandVoiceTemplate}
                onChange={(e) => setBrandVoiceTemplate(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">{brandVoiceTemplate.length} characters</p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSyncBrandVoiceOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!brandVoiceTemplate.trim() || bulkUpdateMutation.isPending}
                onClick={async () => {
                  const selectedClients = filteredClients.filter(c => selectedIds.has(c.id));
                  let success = 0;
                  for (const client of selectedClients) {
                    try {
                      await bulkUpdateMutation.mutateAsync({ id: client.id, brandVoice: brandVoiceTemplate.trim() });
                      success++;
                    } catch { /* skip */ }
                  }
                  toast.success(`Brand voice synced to ${success} client(s)`);
                  utils.seo.clients.list.invalidate();
                  setSyncBrandVoiceOpen(false);
                  setSelectedIds(new Set());
                  setBrandVoiceTemplate("");
                }}
              >
                {bulkUpdateMutation.isPending ? "Syncing..." : `Sync to ${selectedIds.size} Client(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk assign plan dialog */}
      <Dialog open={assignPlanOpen} onOpenChange={setAssignPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Recurring Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Create a new recurring content plan and assign it to the {selectedIds.size} selected client(s).
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Plan Template</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose a plan template or create new" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly-2">Weekly — 2 posts/week</SelectItem>
                    <SelectItem value="weekly-4">Weekly — 4 posts/week</SelectItem>
                    <SelectItem value="biweekly-2">Bi-weekly — 2 posts/cycle</SelectItem>
                    <SelectItem value="monthly-4">Monthly — 4 posts/month</SelectItem>
                    <SelectItem value="daily-1">Daily — 1 post/day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setAssignPlanOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!selectedPlanId || createPlanMutation.isPending}
                onClick={async () => {
                  const [freq, posts] = selectedPlanId.split("-");
                  const selectedClients = filteredClients.filter(c => selectedIds.has(c.id));
                  let success = 0;
                  for (const client of selectedClients) {
                    try {
                      await createPlanMutation.mutateAsync({
                        clientId: client.id,
                        planName: `${freq.charAt(0).toUpperCase() + freq.slice(1)} Content for ${client.name}`,
                        frequency: freq as any,
                        postsPerCycle: parseInt(posts),
                        enableWebResearch: true,
                        enableImageGeneration: true,
                      });
                      success++;
                    } catch { /* skip */ }
                  }
                  toast.success(`Assigned plan to ${success} client(s)`);
                  setAssignPlanOpen(false);
                  setSelectedIds(new Set());
                  setSelectedPlanId("");
                }}
              >
                {createPlanMutation.isPending ? "Assigning..." : `Assign to ${selectedIds.size} Client(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
        </div>
      ) : filteredClients.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={filteredClients.length > 0 && selectedIds.size === filteredClients.length}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <ColHeader field="name" label="Contact Name" />
                  <ColHeader field="phone" label="Phone" />
                  <ColHeader field="email" label="Email" />
                  <ColHeader field="company" label="Business Name" />
                  <ColHeader field="content" label="Content" />
                  <ColHeader field="health" label="Health" />
                  <ColHeader field="createdAt" label="Created" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Industry</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, idx) => {
                  const contentCount = getClientContentCount(client.id);
                  const health = getClientHealth(client.id);
                  const initials = client.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
                  const isSelected = selectedIds.has(client.id);
                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : idx % 2 === 0 ? "" : "bg-muted/10"}`}
                      onClick={() => setLocation(`/clients/${client.id}`)}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(client.id); }}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(client.id)} />
                      </td>
                      {/* Name */}
                      <td className="px-3 py-3 max-w-[160px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                            {initials}
                          </div>
                          <span className="font-medium text-sm text-foreground truncate">{client.name}</span>
                        </div>
                      </td>
                      {/* Phone */}
                      <td className="px-3 py-3 max-w-[130px]">
                        {client.phone ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{client.phone}</span>
                          </div>
                        ) : <span className="text-muted-foreground/40 text-sm">—</span>}
                      </td>
                      {/* Email */}
                      <td className="px-3 py-3 max-w-[180px]">
                        {client.email ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        ) : <span className="text-muted-foreground/40 text-sm">—</span>}
                      </td>
                      {/* Company */}
                      <td className="px-3 py-3 max-w-[140px]">
                        {client.company || client.businessName ? (
                          <div className="flex items-center gap-1 text-xs text-foreground min-w-0">
                            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{client.company || client.businessName}</span>
                          </div>
                        ) : <span className="text-muted-foreground/40 text-sm">—</span>}
                      </td>
                      {/* Content count */}
                      <td className="px-3 py-3 w-16">
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {contentCount}
                        </Badge>
                      </td>
                      {/* Health score */}
                      <td className="px-3 py-3 w-24">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col gap-0.5 cursor-help">
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs font-semibold ${health.color}`}>{health.score}</span>
                                  <span className={`text-xs ${health.color}`}>{health.label}</span>
                                </div>
                                <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${health.score >= 75 ? "bg-emerald-500" : health.score >= 45 ? "bg-amber-500" : "bg-red-500"}`}
                                    style={{ width: `${health.score}%` }}
                                  />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="w-48 p-3 space-y-2">
                              <p className="text-xs font-semibold text-foreground mb-1">Health Score Breakdown</p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Recency (max 40)</span>
                                  <span className="font-medium">{health.recency}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Quality (max 40)</span>
                                  <span className="font-medium">{health.quality}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Volume ({health.pieces} pieces)</span>
                                  <span className="font-medium">{health.volume}</span>
                                </div>
                                <div className="border-t border-border pt-1 flex justify-between text-xs font-semibold">
                                  <span>Total</span>
                                  <span className={health.color}>{health.score} / 100</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      {/* Created */}
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap w-24">
                        {new Date(client.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })}
                      </td>
                      {/* Industry */}
                      <td className="px-3 py-3 max-w-[110px]">
                        {client.industry ? (
                          <Badge variant="outline" className="text-xs truncate max-w-full">{client.industry}</Badge>
                        ) : <span className="text-muted-foreground/40 text-sm">—</span>}
                      </td>
                      {/* Actions */}
                      <td className="px-2 py-3 w-16">
                        <div className="flex gap-0.5 justify-end" onClick={e => e.stopPropagation()}>
                          {!isInPipeline(client.name) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300"
                              title="Add to Pipeline"
                              onClick={(e) => { e.stopPropagation(); createPipelineMutation.mutate({ businessName: client.name, industry: client.industry ?? undefined, stage: "prospect" }); }}
                              disabled={createPipelineMutation.isPending}
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => handleEdit(e, client)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => handleDelete(e, client.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            {search ? (
              <>
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results for "{search}"</h3>
                <p className="text-muted-foreground mb-4">Try a different search term</p>
                <Button variant="outline" onClick={() => setSearch("")}>Clear Search</Button>
              </>
            ) : (
              <>
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
                <p className="text-muted-foreground mb-4">Get started by adding your first client</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
