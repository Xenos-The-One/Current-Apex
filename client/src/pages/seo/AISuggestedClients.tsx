import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Building2,
  DollarSign,
  MessageSquare,
  Loader2,
  TrendingUp,
  MapPin,
  RefreshCw,
  UserPlus,
  KanbanSquare,
  GripVertical,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MoreHorizontal,
  CalendarClock,
  Pencil,
  BellOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type PipelineStage = "prospect" | "contacted" | "proposal" | "onboarded";

interface PipelineCard {
  id: string;
  businessName: string;
  industry: string;
  budgetRange: string;
  matchScore: number;
  stage: PipelineStage;
  notes?: string;
  addedAt: number;
}

const STAGES: { id: PipelineStage; label: string; color: string; bgColor: string }[] = [
  { id: "prospect", label: "Prospect", color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20" },
  { id: "contacted", label: "Contacted", color: "text-yellow-400", bgColor: "bg-yellow-500/10 border-yellow-500/20" },
  { id: "proposal", label: "Proposal Sent", color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/20" },
  { id: "onboarded", label: "Onboarded", color: "text-green-400", bgColor: "bg-green-500/10 border-green-500/20" },
];

export default function AISuggestedClients() {
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [count, setCount] = useState(5);
  const [suggestions, setSuggestions] = useState<Array<{
    businessName: string;
    industry: string;
    reason: string;
    budgetRange: string;
    pitch: string;
    matchScore: number;
  }>>([]);
  const [dragId, setDragId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("discover");

  const utils = trpc.useUtils();

  // DB-backed pipeline
  const { data: pipelineData = [] } = trpc.seo.pipeline.list.useQuery();

  const suggestMutation = trpc.seo.aiClientSuggestions.suggest.useMutation({
    onSuccess: (data) => {
      setSuggestions(data);
      toast.success(`${data.length} potential clients found!`);
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const createClientMutation = trpc.seo.clients.create.useMutation({
    onSuccess: () => toast.success("Client added to your roster!"),
    onError: () => toast.error("Failed to add client"),
  });

  const createPlanMutation = trpc.seo.recurringPlans.create.useMutation({
    onSuccess: () => {},
    onError: () => {},
  });

  const addToPipelineMutation = trpc.seo.pipeline.create.useMutation({
    onSuccess: () => utils.seo.pipeline.list.invalidate(),
    onError: (err) => toast.error(`Pipeline error: ${err.message}`),
  });

  const updateStageMutation = trpc.seo.pipeline.updateStage.useMutation({
    onSuccess: () => utils.seo.pipeline.list.invalidate(),
  });

  const removeMutation = trpc.seo.pipeline.remove.useMutation({
    onSuccess: () => utils.seo.pipeline.list.invalidate(),
  });

  const updateNotesMutation = trpc.seo.pipeline.updateNotes.useMutation({
    onSuccess: () => utils.seo.pipeline.list.invalidate(),
  });

  const updateDueDateMutation = trpc.seo.pipeline.updateDueDate.useMutation({
    onSuccess: () => utils.seo.pipeline.list.invalidate(),
  });

  const updateCardMutation = trpc.seo.pipeline.updateCard.useMutation({
    onSuccess: () => { utils.seo.pipeline.list.invalidate(); setEditModalCard(null); toast.success("Card updated"); },
    onError: (err) => toast.error(err.message),
  });

  const snoozeMutation = trpc.seo.pipeline.snooze.useMutation({
    onSuccess: (_, vars) => {
      utils.seo.pipeline.list.invalidate();
      toast.success(vars.days === 0 ? "Snooze cleared" : `Snoozed for ${vars.days} day${vars.days > 1 ? "s" : ""}`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Edit modal state
  const [editModalCard, setEditModalCard] = useState<typeof pipelineData[0] | null>(null);
  const [editForm, setEditForm] = useState({ businessName: "", industry: "", budgetRange: "", matchScore: 0 });

  const openEditModal = (card: typeof pipelineData[0]) => {
    setEditModalCard(card);
    setEditForm({
      businessName: card.businessName,
      industry: card.industry ?? "",
      budgetRange: card.budgetRange ?? "",
      matchScore: card.matchScore ?? 0,
    });
  };

  const saveEditModal = () => {
    if (!editModalCard) return;
    updateCardMutation.mutate({ id: editModalCard.id, ...editForm });
  };

  // Quick-add prospect state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ businessName: "", industry: "", budgetRange: "", matchScore: 50, stage: "prospect" as PipelineStage });

  const handleQuickAdd = () => {
    if (!quickAddForm.businessName.trim()) return;
    addToPipelineMutation.mutate(
      { ...quickAddForm },
      {
        onSuccess: () => {
          setShowQuickAdd(false);
          setQuickAddForm({ businessName: "", industry: "", budgetRange: "", matchScore: 50, stage: "prospect" });
          toast.success("Prospect added to pipeline");
        },
      }
    );
  };

  // Track which card is being edited for notes
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [editingDueDateId, setEditingDueDateId] = useState<number | null>(null);

  const startEditNotes = (id: number, currentNotes: string | null) => {
    setEditingNotesId(id);
    setNotesValue(currentNotes ?? "");
  };

  const saveNotes = async (id: number) => {
    await updateNotesMutation.mutateAsync({ id, notes: notesValue });
    setEditingNotesId(null);
    toast.success("Notes saved");
  };

  const handleSuggest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim()) { toast.error("Please enter a niche or industry"); return; }
    suggestMutation.mutate({ niche: niche.trim(), location: location.trim() || undefined, count });
  };

  const handleAddClient = (s: typeof suggestions[0]) => {
    createClientMutation.mutate({
      name: s.businessName,
      company: s.businessName,
      notes: `AI Suggested: ${s.reason}\n\nPitch: ${s.pitch}\n\nEstimated Budget: ${s.budgetRange}`,
    });
  };

  const handleAddToPipeline = async (s: typeof suggestions[0]) => {
    const existing = pipelineData.find(p => p.businessName === s.businessName);
    if (existing) { toast.info("Already in pipeline"); return; }
    await addToPipelineMutation.mutateAsync({
      businessName: s.businessName,
      industry: s.industry,
      budgetRange: s.budgetRange,
      matchScore: s.matchScore,
      stage: "prospect",
    });
    toast.success(`${s.businessName} added to pipeline`);
    setActiveTab("pipeline");
  };

  const moveStage = async (id: number, stage: PipelineStage) => {
    const card = pipelineData.find(c => c.id === id);
    // Optimistic update
    utils.seo.pipeline.list.setData(undefined, old =>
      old ? old.map(c => c.id === id ? { ...c, stage } : c) : old
    );
    await updateStageMutation.mutateAsync({ id, stage });

    // Auto-trigger onboarding when moved to Onboarded
    if (stage === "onboarded" && card) {
      try {
        const result = await createClientMutation.mutateAsync({
          name: card.businessName,
          company: card.businessName,
          notes: `Pipeline onboarded · Budget: ${card.budgetRange ?? ""} · Match: ${card.matchScore ?? 0}%`,
        });
        if (result?.id) {
          await createPlanMutation.mutateAsync({
            clientId: result.id,
            planName: `Weekly Content for ${card.businessName}`,
            frequency: "weekly",
            postsPerCycle: 2,
            topicTemplate: `${card.industry ?? ""} tips, news, and insights`,
            enableWebResearch: true,
            enableImageGeneration: true,
          });
          toast.success(`${card.businessName} onboarded! Client + recurring plan created.`, { duration: 5000 });
        }
      } catch {
        toast.error("Onboarding automation failed — please add client manually");
      }
    }
  };

  const removeFromPipeline = async (id: number) => {
    await removeMutation.mutateAsync({ id });
    toast.success("Removed from pipeline");
  };

  const handleDragStart = (id: number) => setDragId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    if (dragId !== null) { moveStage(dragId, stage); setDragId(null); }
  };

  const stageCards = useMemo(() =>
    STAGES.reduce((acc, s) => {
      acc[s.id] = pipelineData.filter(c => c.stage === s.id);
      return acc;
    }, {} as Record<PipelineStage, typeof pipelineData>),
    [pipelineData]
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500/15 text-green-400 border-green-500/30";
    if (score >= 60) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    if (score >= 40) return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Fit";
    if (score >= 60) return "Good Fit";
    if (score >= 40) return "Moderate Fit";
    return "Low Fit";
  };

  return (
    <>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Client Discovery</h1>
            <p className="text-sm text-muted-foreground">
              Let AI suggest potential clients — then track them through your sales pipeline
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="discover" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Discovery
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <KanbanSquare className="h-4 w-4" />
            CRM Pipeline
            {pipelineData.length > 0 && (
              <span className="ml-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {pipelineData.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Discover Tab ── */}
        <TabsContent value="discover">
          {/* Search Form */}
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-5">
              <form onSubmit={handleSuggest} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="niche" className="text-sm font-medium mb-1.5 block">Niche / Industry *</Label>
                  <Input id="niche" placeholder="e.g. local restaurants, e-commerce fashion, dental clinics..." value={niche} onChange={(e) => setNiche(e.target.value)} className="bg-background" required />
                </div>
                <div className="w-48">
                  <Label htmlFor="location" className="text-sm font-medium mb-1.5 block">Location (optional)</Label>
                  <Input id="location" placeholder="e.g. New York, Austin TX..." value={location} onChange={(e) => setLocation(e.target.value)} className="bg-background" />
                </div>
                <div className="w-32">
                  <Label htmlFor="count" className="text-sm font-medium mb-1.5 block">Results</Label>
                  <Input id="count" type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))} className="bg-background" />
                </div>
                <Button type="submit" disabled={suggestMutation.isPending} className="gap-2">
                  {suggestMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching...</> : <><Sparkles className="h-4 w-4" /> Find Clients</>}
                </Button>
                {suggestions.length > 0 && (
                  <Button type="button" variant="outline" onClick={() => suggestMutation.mutate({ niche: niche.trim(), location: location.trim() || undefined, count })} disabled={suggestMutation.isPending} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Loading */}
          {suggestMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-muted-foreground text-sm">AI is analyzing your niche and finding the best matches...</p>
            </div>
          )}

          {/* Results */}
          {!suggestMutation.isPending && suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {suggestions.length} Suggested Clients
                  <span className="text-sm font-normal text-muted-foreground ml-2">for "{niche}"</span>
                </h2>
                <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />AI-Powered</Badge>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {suggestions.sort((a, b) => b.matchScore - a.matchScore).map((s, idx) => (
                  <Card key={idx} className="hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                            {s.businessName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-base">{s.businessName}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs gap-1"><Building2 className="h-3 w-3" />{s.industry}</Badge>
                              {location && <Badge variant="outline" className="text-xs gap-1"><MapPin className="h-3 w-3" />{location}</Badge>}
                            </div>
                          </div>
                        </div>
                        <Badge className={`text-xs border ${getScoreColor(s.matchScore)}`}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {s.matchScore}% · {getScoreLabel(s.matchScore)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2 space-y-2">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Why They Need You</p>
                            <p className="text-sm text-foreground">{s.reason}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              <MessageSquare className="h-3 w-3 inline mr-1" />Outreach Pitch
                            </p>
                            <p className="text-sm text-muted-foreground italic">"{s.pitch}"</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              <DollarSign className="h-3 w-3 inline mr-1" />Est. Budget
                            </p>
                            <p className="text-sm font-bold text-green-400">{s.budgetRange}</p>
                          </div>
                          <Button size="sm" className="w-full gap-2" onClick={() => handleAddToPipeline(s)}>
                            <ArrowRight className="h-4 w-4" /> Add to Pipeline
                          </Button>
                          <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleAddClient(s)} disabled={createClientMutation.isPending}>
                            <UserPlus className="h-4 w-4" /> Add as Client
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!suggestMutation.isPending && suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Discover Your Next Clients</h3>
              <p className="text-muted-foreground max-w-md text-sm">
                Enter a niche or industry above and our AI will analyze the market to surface the most relevant potential clients — complete with personalized outreach pitches and budget estimates.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── Pipeline Tab ── */}
        <TabsContent value="pipeline">
          {/* Pipeline toolbar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{pipelineData.length} prospect{pipelineData.length !== 1 ? "s" : ""} in pipeline</p>
            <Button size="sm" className="gap-2" onClick={() => setShowQuickAdd(true)}>
              <UserPlus className="h-4 w-4" /> Add Prospect
            </Button>
          </div>

          {pipelineData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <KanbanSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your Pipeline is Empty</h3>
              <p className="text-muted-foreground max-w-md text-sm mb-4">
                Click <strong>Add Prospect</strong> to manually add a prospect, or use AI Discovery to find potential clients.
              </p>
              <div className="flex gap-2">
                <Button className="gap-2" onClick={() => setShowQuickAdd(true)}>
                  <UserPlus className="h-4 w-4" /> Add Prospect
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("discover")} className="gap-2">
                  <Sparkles className="h-4 w-4" /> AI Discovery
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Pipeline stats */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {STAGES.map(stage => (
                  <div key={stage.id} className={`rounded-lg border p-3 ${stage.bgColor}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${stage.color}`}>{stage.label}</p>
                    <p className="text-2xl font-bold">{stageCards[stage.id].length}</p>
                  </div>
                ))}
              </div>

              {/* Kanban board */}
              <div className="grid grid-cols-4 gap-4">
                {STAGES.map(stage => (
                  <div
                    key={stage.id}
                    className="flex flex-col gap-2 min-h-[400px]"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    {/* Column header */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${stage.bgColor}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${stage.color}`}>{stage.label}</span>
                      <span className={`text-xs font-bold ${stage.color}`}>{stageCards[stage.id].length}</span>
                    </div>

                    {/* Cards */}
                    {stageCards[stage.id].map(card => (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={() => handleDragStart(card.id)}
                        className={`rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors ${dragId !== null && dragId === card.id ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium truncate">{card.businessName}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(card)}>
                                <Pencil className="h-3 w-3 mr-2" /> Edit Card
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {STAGES.filter(s => s.id !== stage.id).map(s => (
                                <DropdownMenuItem key={s.id} onClick={() => moveStage(card.id, s.id)}>
                                  Move to {s.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              {card.dueDate && card.dueDate > 0 && card.dueDate < Date.now() && (
                                <>
                                  <DropdownMenuItem onClick={() => snoozeMutation.mutate({ id: card.id, days: 1 })}>
                                    <BellOff className="h-3 w-3 mr-2" /> Snooze 1 day
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => snoozeMutation.mutate({ id: card.id, days: 3 })}>
                                    <BellOff className="h-3 w-3 mr-2" /> Snooze 3 days
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => snoozeMutation.mutate({ id: card.id, days: 7 })}>
                                    <BellOff className="h-3 w-3 mr-2" /> Snooze 7 days
                                  </DropdownMenuItem>
                                  {card.snoozedUntil && card.snoozedUntil > Date.now() && (
                                    <DropdownMenuItem onClick={() => snoozeMutation.mutate({ id: card.id, days: 0 })}>
                                      Clear Snooze
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => { createClientMutation.mutate({ name: card.businessName, company: card.businessName, notes: `Pipeline client · Budget: ${card.budgetRange}` }); }}
                              >
                                <UserPlus className="h-3 w-3 mr-2" /> Add as Client
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => removeFromPipeline(card.id)}>
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Badge variant="outline" className="text-xs mb-2">{card.industry}</Badge>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-400 font-medium">{card.budgetRange}</span>
                          <Badge className={`text-[10px] border ${getScoreColor(card.matchScore ?? 0)}`}>
                            {card.matchScore ?? 0}%
                          </Badge>
                        </div>
                        {stage.id === "onboarded" && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> Onboarded
                          </div>
                        )}
                        {card.snoozedUntil && card.snoozedUntil > Date.now() && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <BellOff className="h-3 w-3" />
                            Snoozed until {new Date(card.snoozedUntil).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </div>
                        )}
                        {/* Due date */}
                        <div className="mt-2 border-t border-border/30 pt-2">
                          {editingDueDateId === card.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="date"
                                className="text-[10px] flex-1 rounded border border-input bg-background px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                                defaultValue={card.dueDate && card.dueDate > 0 ? new Date(card.dueDate).toISOString().split("T")[0] : ""}
                                onChange={(e) => {
                                  const ts = e.target.value ? new Date(e.target.value).getTime() : null;
                                  updateDueDateMutation.mutate({ id: card.id, dueDate: ts });
                                  setEditingDueDateId(null);
                                }}
                                onBlur={() => setEditingDueDateId(null)}
                                autoFocus
                              />
                              <button onClick={() => { updateDueDateMutation.mutate({ id: card.id, dueDate: null }); setEditingDueDateId(null); }} className="text-[10px] text-muted-foreground hover:text-destructive">Clear</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingDueDateId(card.id)}
                              className={`w-full text-left text-[10px] flex items-center gap-1 transition-colors ${
                                card.dueDate && card.dueDate > 0 && card.dueDate < Date.now()
                                  ? "text-red-400 font-semibold"
                                  : card.dueDate && card.dueDate > 0
                                  ? "text-muted-foreground hover:text-foreground"
                                  : "text-muted-foreground/50 hover:text-muted-foreground italic"
                              }`}
                            >
                              <CalendarClock className="h-3 w-3 shrink-0" />
                              {card.dueDate && card.dueDate > 0 ? (
                                <span>
                                  {card.dueDate < Date.now() ? "Overdue: " : "Due: "}
                                  {new Date(card.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              ) : (
                                <span>+ Set due date</span>
                              )}
                            </button>
                          )}
                        </div>
                        {/* Inline notes */}
                        <div className="mt-1 border-t border-border/20 pt-1.5">
                          {editingNotesId === card.id ? (
                            <div className="space-y-1.5">
                              <textarea
                                className="w-full text-xs rounded border border-input bg-background px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                                rows={3}
                                value={notesValue}
                                onChange={(e) => setNotesValue(e.target.value)}
                                placeholder="Add notes, call logs, next steps..."
                                autoFocus
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => saveNotes(card.id)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                                  disabled={updateNotesMutation.isPending}
                                >
                                  {updateNotesMutation.isPending ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={() => setEditingNotesId(null)}
                                  className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditNotes(card.id, card.notes)}
                              className="w-full text-left text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {card.notes ? (
                                <span className="line-clamp-2">{card.notes}</span>
                              ) : (
                                <span className="italic opacity-50">+ Add notes</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Drop zone hint */}
                    {stageCards[stage.id].length === 0 && (
                      <div className="flex-1 rounded-lg border border-dashed border-border/50 flex items-center justify-center min-h-[100px]">
                        <p className="text-xs text-muted-foreground/50">Drop here</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>

      {/* ── Edit Card Modal ── */}
      <Dialog open={!!editModalCard} onOpenChange={(open) => { if (!open) setEditModalCard(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pipeline Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-businessName">Business Name *</Label>
              <Input
                id="edit-businessName"
                value={editForm.businessName}
                onChange={(e) => setEditForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="Business name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-industry">Industry</Label>
              <Input
                id="edit-industry"
                value={editForm.industry}
                onChange={(e) => setEditForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. SaaS, E-commerce, Healthcare"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-budget">Budget Range</Label>
              <Input
                id="edit-budget"
                value={editForm.budgetRange}
                onChange={(e) => setEditForm(f => ({ ...f, budgetRange: e.target.value }))}
                placeholder="e.g. $1,000–$3,000/mo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-score">Match Score (0–100)</Label>
              <Input
                id="edit-score"
                type="number"
                min={0}
                max={100}
                value={editForm.matchScore}
                onChange={(e) => setEditForm(f => ({ ...f, matchScore: Math.min(100, Math.max(0, Number(e.target.value))) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalCard(null)}>Cancel</Button>
            <Button onClick={saveEditModal} disabled={updateCardMutation.isPending || !editForm.businessName.trim()}>
              {updateCardMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick-Add Prospect Modal ── */}
      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Prospect to Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="qa-businessName">Business Name *</Label>
              <Input
                id="qa-businessName"
                value={quickAddForm.businessName}
                onChange={(e) => setQuickAddForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="e.g. Acme Corp"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-industry">Industry</Label>
              <Input
                id="qa-industry"
                value={quickAddForm.industry}
                onChange={(e) => setQuickAddForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. SaaS, E-commerce, Healthcare"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-budget">Budget Range</Label>
              <Input
                id="qa-budget"
                value={quickAddForm.budgetRange}
                onChange={(e) => setQuickAddForm(f => ({ ...f, budgetRange: e.target.value }))}
                placeholder="e.g. $1,000–$3,000/mo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-score">Match Score (0–100)</Label>
              <Input
                id="qa-score"
                type="number"
                min={0}
                max={100}
                value={quickAddForm.matchScore}
                onChange={(e) => setQuickAddForm(f => ({ ...f, matchScore: Math.min(100, Math.max(0, Number(e.target.value))) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-stage">Initial Stage</Label>
              <select
                id="qa-stage"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={quickAddForm.stage}
                onChange={(e) => setQuickAddForm(f => ({ ...f, stage: e.target.value as PipelineStage }))}
              >
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
            <Button onClick={handleQuickAdd} disabled={addToPipelineMutation.isPending || !quickAddForm.businessName.trim()}>
              {addToPipelineMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : "Add to Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
