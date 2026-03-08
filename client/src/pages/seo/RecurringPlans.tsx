import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Calendar, Trash2, Play, Pause, RefreshCw, CheckCircle2, Sparkles, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "wouter";

/**
 * Recurring content plans - automate content generation on a schedule
 * Allows setting up recurring plans like "2 blog posts per week for Client X"
 */
export default function RecurringPlans() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [runningPlanId, setRunningPlanId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [runResult, setRunResult] = useState<{ planName: string; count: number } | null>(null);
  const [showRunResult, setShowRunResult] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);

  const [formData, setFormData] = useState({
    clientId: 0,
    planName: "",
    frequency: "weekly" as "daily" | "weekly" | "biweekly" | "monthly",
    postsPerCycle: 1,
    topicTemplate: "",
    customPrompt: "",
    aiModel: "gemini-2.5-flash",
    enableWebResearch: true,
    enableImageGeneration: true,
  });

  const { data: clients } = trpc.seo.clients.list.useQuery();
  const { data: plans, refetch } = trpc.seo.recurringPlans.list.useQuery();
  const { data: settings } = trpc.seo.agencySettings.getAll.useQuery();

  // Update default AI model when settings load
  useEffect(() => {
    if (settings?.default_ai_model && formData.aiModel === "gemini-2.5-flash") {
      setFormData(prev => ({ ...prev, aiModel: settings.default_ai_model }));
    }
  }, [settings]);

  // Animate progress bar while running
  useEffect(() => {
    if (runningPlanId !== null) {
      setFakeProgress(5);
      const interval = setInterval(() => {
        setFakeProgress(prev => {
          if (prev >= 90) { clearInterval(interval); return 90; }
          return prev + Math.random() * 8;
        });
      }, 800);
      return () => clearInterval(interval);
    } else {
      setFakeProgress(0);
    }
  }, [runningPlanId]);

  const createMutation = trpc.seo.recurringPlans.create.useMutation({
    onSuccess: () => {
      toast.success("Recurring plan created");
      setIsDialogOpen(false);
      refetch();
      setFormData({
        clientId: 0,
        planName: "",
        frequency: "weekly",
        postsPerCycle: 1,
        topicTemplate: "",
        customPrompt: "",
        aiModel: "gemini-2.5-flash",
        enableWebResearch: true,
        enableImageGeneration: true,
      });
    },
    onError: (error) => {
      toast.error(`Failed to create plan: ${error.message}`);
    },
  });

  const toggleMutation = trpc.seo.recurringPlans.toggle.useMutation({
    onSuccess: () => {
      toast.success("Plan status updated");
      refetch();
    },
  });

  const deleteMutation = trpc.seo.recurringPlans.delete.useMutation({
    onSuccess: () => {
      toast.success("Plan deleted");
      refetch();
    },
  });

  const runNowMutation = trpc.seo.recurringPlans.runNow.useMutation({
    onSuccess: (data, variables) => {
      const plan = plans?.find((p: any) => p.id === variables.id);
      setFakeProgress(100);
      setTimeout(() => {
        setRunningPlanId(null);
        setRunResult({ planName: plan?.planName || "Plan", count: data.generatedCount });
        setShowRunResult(true);
        refetch();
      }, 400);
    },
    onError: (error) => {
      toast.error(`Failed to run plan: ${error.message}`);
      setRunningPlanId(null);
    },
  });

  const handleRunNow = (planId: number) => {
    setRunningPlanId(planId);
    runNowMutation.mutate({ id: planId });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.planName) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate(formData);
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: "Daily",
      weekly: "Weekly",
      biweekly: "Every 2 weeks",
      monthly: "Monthly",
    };
    return labels[freq] || freq;
  };

  const runningPlan = plans?.find((p: any) => p.id === runningPlanId);

  return (
    <div className="container mx-auto py-8">
      {/* Generation Progress Dialog */}
      <Dialog open={runningPlanId !== null} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              Generating Content
            </DialogTitle>
            <DialogDescription>
              Running <span className="font-medium text-foreground">{runningPlan?.planName}</span> — generating {runningPlan?.postsPerCycle} post{(runningPlan?.postsPerCycle ?? 1) > 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>AI writing content{runningPlan?.enableImageGeneration ? " & generating images" : ""}...</span>
                <span>{Math.round(fakeProgress)}%</span>
              </div>
              <Progress value={fakeProgress} className="h-2" />
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {fakeProgress >= 10 && <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> Generating topic ideas from template</div>}
              {fakeProgress >= 35 && <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> Writing blog content with AI</div>}
              {fakeProgress >= 60 && runningPlan?.enableImageGeneration && <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> Generating featured images</div>}
              {fakeProgress >= 80 && <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> Saving drafts to database</div>}
              {fakeProgress < 90 && <div className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Processing...</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Result Dialog */}
      <Dialog open={showRunResult} onOpenChange={setShowRunResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Generation Complete!
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{runResult?.planName}</span> finished successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="text-5xl font-bold text-primary mb-2">{runResult?.count}</div>
            <p className="text-muted-foreground">new draft{(runResult?.count ?? 0) > 1 ? "s" : ""} created</p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowRunResult(false)}>Close</Button>
            <Link href="/seo/content">
              <Button onClick={() => setShowRunResult(false)}>
                <FileText className="h-4 w-4 mr-2" />
                View Content
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Recurring Content Plans</h1>
          <p className="text-muted-foreground">
            Automate content generation with recurring schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Calendar className="h-3.5 w-3.5 inline mr-1" />Calendar
            </button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Recurring Content Plan</DialogTitle>
              <DialogDescription>
                Set up automated content generation on a schedule
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="planName">Plan Name *</Label>
                <Input
                  id="planName"
                  value={formData.planName}
                  onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                  placeholder="e.g., Weekly Blog Posts for Acme Corp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select
                  value={formData.clientId.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, clientId: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postsPerCycle">Posts Per Cycle</Label>
                  <Input
                    id="postsPerCycle"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.postsPerCycle}
                    onChange={(e) =>
                      setFormData({ ...formData, postsPerCycle: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topicTemplate">Topic Template</Label>
                <Textarea
                  id="topicTemplate"
                  value={formData.topicTemplate}
                  onChange={(e) => setFormData({ ...formData, topicTemplate: e.target.value })}
                  placeholder="e.g., Latest trends in {industry}, How to improve {topic}"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Use placeholders like {"{industry}"} or {"{topic}"} for dynamic topics
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPrompt">Custom Prompt (Optional)</Label>
                <Textarea
                  id="customPrompt"
                  value={formData.customPrompt}
                  onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
                  placeholder="Custom instructions for AI content generation"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiModel">AI Model</Label>
                <Select
                  value={formData.aiModel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, aiModel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (High Quality)</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Balanced)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Cost-Effective)</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Claude models excel at creative writing, GPT models are versatile, Gemini models are cost-effective
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="webResearch">Enable Web Research</Label>
                  <p className="text-xs text-muted-foreground">
                    Fetch current data from the web
                  </p>
                </div>
                <Switch
                  id="webResearch"
                  checked={formData.enableWebResearch}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableWebResearch: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="imageGen">Enable Image Generation</Label>
                  <p className="text-xs text-muted-foreground">
                    Generate featured images with AI
                  </p>
                </div>
                <Switch
                  id="imageGen"
                  checked={formData.enableImageGeneration}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableImageGeneration: checked })
                  }
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Plan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {viewMode === "calendar" && plans && plans.length > 0 ? (
        <RecurringPlansCalendar plans={plans} clients={clients ?? []} />
      ) : !plans || plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recurring plans yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a plan to automate content generation
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {plans.map((plan: any) => {
            const client = clients?.find((c) => c.id === plan.clientId);
            const isThisPlanRunning = runningPlanId === plan.id;
            return (
              <Card key={plan.id} className={isThisPlanRunning ? "ring-2 ring-primary/40" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3">
                        {plan.planName}
                        <Badge variant={plan.isActive ? "default" : "secondary"}>
                          {plan.isActive ? "Active" : "Paused"}
                        </Badge>
                        {isThisPlanRunning && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">
                            <Sparkles className="h-3 w-3 mr-1" /> Running
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {client?.name} • {getFrequencyLabel(plan.frequency)} •{" "}
                        {plan.postsPerCycle} post{plan.postsPerCycle > 1 ? "s" : ""} per cycle
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {plan.topicTemplate && (
                      <div>
                        <p className="text-sm font-medium mb-1">Topic Template</p>
                        <p className="text-sm text-muted-foreground">{plan.topicTemplate}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {plan.enableWebResearch && <Badge variant="outline">Web Research</Badge>}
                      {plan.enableImageGeneration && (
                        <Badge variant="outline">Image Generation</Badge>
                      )}
                    </div>

                    {plan.lastRunDate && (
                      <p className="text-sm text-muted-foreground">
                        Last run: {new Date(plan.lastRunDate).toLocaleString()}
                      </p>
                    )}
                    {plan.nextRunDate && (
                      <p className="text-sm text-muted-foreground">
                        Next run: {new Date(plan.nextRunDate).toLocaleString()}
                      </p>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunNow(plan.id)}
                        disabled={runNowMutation.isPending}
                        className={isThisPlanRunning ? "border-primary/40 text-primary" : ""}
                      >
                        {isThisPlanRunning ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {isThisPlanRunning ? "Generating..." : "Run Now"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleMutation.mutate({ id: plan.id })}
                        disabled={runNowMutation.isPending}
                      >
                        {plan.isActive ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Resume
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate({ id: plan.id })}
                        disabled={runNowMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Calendar View ───────────────────────────────────────────────────
const FREQ_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

function getScheduledDays(plan: any, year: number, month: number): number[] {
  const interval = FREQ_DAYS[plan.frequency] ?? 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: number[] = [];
  // Anchor: treat plan creation date as first occurrence
  const anchor = new Date(plan.createdAt ?? Date.now());
  const anchorDay = anchor.getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfMonth = new Date(year, month, d);
    const diff = Math.round((dayOfMonth.getTime() - new Date(year, month, anchorDay).getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff % interval === 0) days.push(d);
    if (diff < 0 && Math.abs(diff) % interval === 0) days.push(d);
  }
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

const PLAN_COLORS = [
  "bg-blue-500/80",
  "bg-emerald-500/80",
  "bg-violet-500/80",
  "bg-amber-500/80",
  "bg-rose-500/80",
  "bg-cyan-500/80",
];

function RecurringPlansCalendar({ plans, clients }: { plans: any[]; clients: any[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a map: day → list of plan names
  const dayMap = new Map<number, { name: string; color: string }[]>();
  plans.forEach((plan, idx) => {
    const color = PLAN_COLORS[idx % PLAN_COLORS.length];
    const client = clients.find((c) => c.id === plan.clientId);
    const label = client ? `${client.name} – ${plan.planName}` : plan.planName;
    getScheduledDays(plan, year, month).forEach((d) => {
      if (!dayMap.has(d)) dayMap.set(d, []);
      dayMap.get(d)!.push({ name: label, color });
    });
  });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const exportIcal = () => {
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AI SEO Portal//Recurring Plans//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    plans.forEach((plan) => {
      const client = clients.find((c) => c.id === plan.clientId);
      const summary = client ? `${client.name} – ${plan.planName}` : plan.planName;
      getScheduledDays(plan, year, month).forEach((d) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const dateStr = `${year}${pad(month + 1)}${pad(d)}`;
        const uid = `${plan.id}-${dateStr}@ai-seo-portal`;
        lines.push(
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTART;VALUE=DATE:${dateStr}`,
          `DTEND;VALUE=DATE:${dateStr}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:Recurring plan: ${plan.planName} (${plan.frequency})`,
          "END:VEVENT"
        );
      });
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-schedule-${year}-${String(month + 1).padStart(2, "0")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar exported as .ics file");
  };

  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{monthName} {year}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>‹</Button>
            <Button variant="outline" size="sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Today</Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>›</Button>
            <Button variant="outline" size="sm" onClick={exportIcal} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export iCal
            </Button>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-2">
          {plans.map((plan, idx) => {
            const client = clients.find((c) => c.id === plan.clientId);
            return (
              <span key={plan.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${PLAN_COLORS[idx % PLAN_COLORS.length]}`} />
                {client ? `${client.name} – ` : ""}{plan.planName}
              </span>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {days.map(d => (
            <div key={d} className="bg-muted/40 text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-background min-h-[80px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const events = dayMap.get(day) ?? [];
            return (
              <div key={day} className={`bg-background min-h-[80px] p-1.5 ${isToday ? "ring-2 ring-inset ring-primary/60" : ""}`}>
                <span className={`text-xs font-medium mb-1 block ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</span>
                <div className="space-y-0.5">
                  {events.slice(0, 3).map((ev, ei) => (
                    <div key={ei} className={`${ev.color} text-white text-[10px] leading-tight px-1 py-0.5 rounded truncate`} title={ev.name}>
                      {ev.name}
                    </div>
                  ))}
                  {events.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{events.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
