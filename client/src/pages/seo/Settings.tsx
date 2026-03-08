import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Settings as SettingsIcon, Palette, FileText, Save, Loader2, Plus, Trash2, Building2, Bell
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { data: settings, isLoading, refetch } = trpc.seo.agencySettings.getAll.useQuery();
  const { data: promptTemplates, refetch: refetchTemplates } = trpc.seo.agencySettings.getPromptTemplates.useQuery();
  const updateBatchMutation = trpc.seo.agencySettings.updateBatch.useMutation();
  const saveTemplateMutation = trpc.seo.agencySettings.savePromptTemplate.useMutation();
  const deleteTemplateMutation = trpc.seo.agencySettings.deletePromptTemplate.useMutation();

  // Branding state
  const [agencyName, setAgencyName] = useState("");
  const [agencyTagline, setAgencyTagline] = useState("");
  const [agencyLogoUrl, setAgencyLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [defaultTone, setDefaultTone] = useState("");
  const [defaultAudience, setDefaultAudience] = useState("");
  const [footerText, setFooterText] = useState("");
  const [defaultAiModel, setDefaultAiModel] = useState("gemini-2.5-flash");

  // New template dialog
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplatePrompt, setNewTemplatePrompt] = useState("");

  useEffect(() => {
    if (settings) {
      setAgencyName(settings["agency_name"] || "");
      setAgencyTagline(settings["agency_tagline"] || "");
      setAgencyLogoUrl(settings["agency_logo_url"] || "");
      setPrimaryColor(settings["primary_color"] || "#3b82f6");
      setDefaultTone(settings["default_tone"] || "");
      setDefaultAudience(settings["default_audience"] || "");
      setFooterText(settings["footer_text"] || "");
      setDefaultAiModel(settings["default_ai_model"] || "gemini-2.5-flash");
    }
  }, [settings]);

  const handleSaveBranding = async () => {
    try {
      await updateBatchMutation.mutateAsync({
        settings: {
          agency_name: agencyName,
          agency_tagline: agencyTagline,
          agency_logo_url: agencyLogoUrl,
          primary_color: primaryColor,
          default_tone: defaultTone,
          default_audience: defaultAudience,
          footer_text: footerText,
          default_ai_model: defaultAiModel,
        },
      });
      toast.success("Branding settings saved");
      refetch();
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplatePrompt.trim()) {
      toast.error("Please fill in template name and prompt");
      return;
    }
    try {
      await saveTemplateMutation.mutateAsync({
        name: newTemplateName,
        prompt: newTemplatePrompt,
      });
      toast.success("Template saved");
      setShowNewTemplate(false);
      setNewTemplateName("");
      setNewTemplatePrompt("");
      refetchTemplates();
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleDeleteTemplate = async (key: string) => {
    try {
      await deleteTemplateMutation.mutateAsync({ key });
      toast.success("Template deleted");
      refetchTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure your agency branding, default prompts, and platform settings
        </p>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Prompt Templates
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Content Defaults
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Agency Identity</CardTitle>
                <CardDescription>Set your agency name, tagline, and logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="agencyName">Agency Name</Label>
                  <Input
                    id="agencyName"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Your Agency Name"
                  />
                </div>
                <div>
                  <Label htmlFor="agencyTagline">Tagline</Label>
                  <Input
                    id="agencyTagline"
                    value={agencyTagline}
                    onChange={(e) => setAgencyTagline(e.target.value)}
                    placeholder="Your agency tagline or motto"
                  />
                </div>
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={agencyLogoUrl}
                    onChange={(e) => setAgencyLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  {agencyLogoUrl && (
                    <div className="mt-3 p-4 bg-muted/30 rounded-lg flex items-center justify-center">
                      <img
                        src={agencyLogoUrl}
                        alt="Agency Logo"
                        className="max-h-20 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize colors and footer text</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Brand Color</Label>
                  <div className="flex gap-3 items-center mt-1">
                    <input
                      type="color"
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-16 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <Separator />
                <div>
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Textarea
                    id="footerText"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Text to appear in exported content footers"
                    rows={3}
                  />
                </div>
                {/* Live Portal Preview */}
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Live Portal Preview</p>
                  <div className="rounded-xl border border-border/60 overflow-hidden shadow-lg">
                    {/* Portal header bar */}
                    <div className="px-5 py-3 flex items-center gap-3" style={{ backgroundColor: primaryColor }}>
                      {agencyLogoUrl ? (
                        <img src={agencyLogoUrl} alt="logo" className="h-7 w-7 rounded object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                          {(agencyName || "A").charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm text-white">{agencyName || "Your Agency"}</p>
                        <p className="text-xs text-white/70">{agencyTagline || "Content Portal"}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-white/20" />
                        <span className="text-xs text-white/80">Client Name</span>
                      </div>
                    </div>
                    {/* Portal nav strip */}
                    <div className="px-5 py-2 flex gap-4 border-b border-border/40 bg-background">
                      {["Dashboard", "Content", "Reports"].map((tab, i) => (
                        <span key={tab} className={`text-xs font-medium pb-1 ${i === 0 ? "border-b-2 text-foreground" : "text-muted-foreground"}`} style={i === 0 ? { borderColor: primaryColor } : {}}>{tab}</span>
                      ))}
                    </div>
                    {/* Portal body */}
                    <div className="p-4 bg-muted/20 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {([["Total Content", "12"], ["Approved", "8"], ["Pending Review", "4"]] as [string, string][]).map(([label, val]) => (
                          <div key={label} className="bg-background rounded-lg p-3 border border-border/40">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-lg font-bold" style={{ color: primaryColor }}>{val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-background rounded-lg border border-border/40 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold">Latest Content</p>
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: primaryColor }}>Pending Review</span>
                        </div>
                        <p className="text-xs font-medium">How to Improve Your SEO Strategy in 2025</p>
                        <p className="text-xs text-muted-foreground mt-1">1,240 words · Generated 2 days ago</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 rounded border border-border/60 text-muted-foreground">Request Changes</span>
                          <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: primaryColor }}>Approve</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center pt-1">{footerText || `Powered by ${agencyName || "Your Agency"}`}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <Button onClick={handleSaveBranding} disabled={updateBatchMutation.isPending}>
                {updateBatchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Branding Settings
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Prompt Templates Tab */}
        <TabsContent value="prompts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Default Prompt Templates</CardTitle>
                <CardDescription>Create reusable AI prompts for content generation</CardDescription>
              </div>
              <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Prompt Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Template Name</Label>
                      <Input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="e.g. SEO Blog Post, Product Description"
                      />
                    </div>
                    <div>
                      <Label>Prompt</Label>
                      <Textarea
                        value={newTemplatePrompt}
                        onChange={(e) => setNewTemplatePrompt(e.target.value)}
                        placeholder="You are an expert SEO content writer. Your task is to write a comprehensive blog post about {topic}..."
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use {"{topic}"}, {"{keywords}"}, {"{audience}"}, {"{tone}"} as placeholders
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewTemplate(false)}>Cancel</Button>
                    <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
                      {saveTemplateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Template
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!promptTemplates || promptTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Prompt Templates</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create default prompts to use when generating content for clients
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {promptTemplates.map((template) => (
                    <div key={template.id} className="p-4 rounded-lg border border-border/50 bg-card/50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{template.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono line-clamp-3">
                        {template.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Defaults Tab */}
        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle>Content Generation Defaults</CardTitle>
              <CardDescription>Set default values for new content generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div>
                <Label htmlFor="defaultTone">Default Tone</Label>
                <Input
                  id="defaultTone"
                  value={defaultTone}
                  onChange={(e) => setDefaultTone(e.target.value)}
                  placeholder="e.g. Professional, Friendly, Authoritative"
                />
              </div>
              <div>
                <Label htmlFor="defaultAudience">Default Target Audience</Label>
                <Input
                  id="defaultAudience"
                  value={defaultAudience}
                  onChange={(e) => setDefaultAudience(e.target.value)}
                  placeholder="e.g. Small business owners, Marketing professionals"
                />
              </div>
              <div>
                <Label htmlFor="defaultAiModel">Default AI Model</Label>
                <Select
                  value={defaultAiModel}
                  onValueChange={(value) => setDefaultAiModel(value)}
                >
                  <SelectTrigger id="defaultAiModel">
                    <SelectValue placeholder="Select default AI model" />
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
                <p className="text-xs text-muted-foreground mt-1">
                  This model will be pre-selected when generating new content
                </p>
              </div>
              <Separator />
              <Button onClick={handleSaveBranding} disabled={updateBatchMutation.isPending}>
                {updateBatchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationPreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Notification Preferences Tab ───────────────────────────────────────────

type NotifPref = {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
};

const NOTIF_PREFS: NotifPref[] = [
  { id: "new_comment", label: "New Comments", description: "Push alert when a team member posts a comment on any content piece", defaultOn: true },
  { id: "mention", label: "@Mentions", description: "Push alert when you are @mentioned in a collaboration comment", defaultOn: true },
  { id: "revision_request", label: "Revision Requests", description: "Push alert when a revision is requested via a comment", defaultOn: true },
  { id: "content_approved", label: "Content Approved", description: "Push alert when a content piece is marked as approved", defaultOn: true },
  { id: "content_published", label: "Content Published", description: "Push alert when content is successfully published", defaultOn: false },
  { id: "new_client", label: "New Client Added", description: "Push alert when a new client is added or onboarded via the pipeline", defaultOn: true },
  { id: "recurring_plan_run", label: "Recurring Plan Completed", description: "Push alert when a recurring plan finishes generating content", defaultOn: false },
  { id: "keyword_ranking_change", label: "Keyword Ranking Changes", description: "Push alert when a tracked keyword moves significantly in rankings", defaultOn: false },
  { id: "seo_audit_done", label: "SEO Audit Completed", description: "Push alert when an SEO audit crawl finishes", defaultOn: false },
  { id: "ab_test_result", label: "A/B Test Results Ready", description: "Push alert when an A/B test has enough data for analysis", defaultOn: false },
];

function NotificationPreferencesTab() {
  const { data: settings, refetch } = trpc.seo.agencySettings.getAll.useQuery();
  const updateBatchMutation = trpc.seo.agencySettings.updateBatch.useMutation();

  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState("18:00");
  const [saved, setSaved] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const notifyOwnerMutation = trpc.system.notifyOwner.useMutation();

  const sendTestDigest = async () => {
    setTestSending(true);
    try {
      await notifyOwnerMutation.mutateAsync({
        title: "Daily Digest Preview",
        content: `This is a sample Daily Digest notification.\n\n📊 Summary for today:\n• 3 content pieces approved\n• 2 revision requests received\n• 1 new client onboarded via pipeline\n• 5 keyword ranking changes detected\n\nDigest delivery time: ${digestTime} (your local time)`,
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch {
      toast.error("Failed to send test digest");
    } finally {
      setTestSending(false);
    }
  };

  useEffect(() => {
    if (settings) {
      const stored = settings["notification_prefs"];
      if (stored) {
        try { setPrefs(JSON.parse(stored)); } catch { /* use defaults */ }
      } else {
        const defaults: Record<string, boolean> = {};
        NOTIF_PREFS.forEach(p => { defaults[p.id] = p.defaultOn; });
        setPrefs(defaults);
      }
      if (settings["digest_enabled"]) setDigestEnabled(settings["digest_enabled"] === "true");
      if (settings["digest_time"]) setDigestTime(settings["digest_time"]);
    }
  }, [settings]);

  const toggle = (id: string) => setPrefs(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    await updateBatchMutation.mutateAsync({
      settings: {
        notification_prefs: JSON.stringify(prefs),
        digest_enabled: String(digestEnabled),
        digest_time: digestTime,
      }
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refetch();
  };

  const categories = [
    { label: "Content & Collaboration", ids: ["new_comment", "mention", "revision_request", "content_approved", "content_published"] },
    { label: "Clients & Plans", ids: ["new_client", "recurring_plan_run"] },
    { label: "SEO & Research", ids: ["keyword_ranking_change", "seo_audit_done", "ab_test_result"] },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Owner Push Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which events trigger a push notification to the agency owner. These alerts are delivered via the Manus notification system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {categories.map(cat => (
            <div key={cat.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{cat.label}</p>
              <div className="space-y-3">
                {cat.ids.map(id => {
                  const pref = NOTIF_PREFS.find(p => p.id === id)!;
                  const isOn = prefs[id] ?? pref.defaultOn;
                  return (
                    <div key={id} className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{pref.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{pref.description}</p>
                      </div>
                      <Switch
                        checked={isOn}
                        onCheckedChange={() => toggle(id)}
                        className="shrink-0 mt-0.5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave} disabled={updateBatchMutation.isPending} size="sm" className="gap-2">
              {updateBatchMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? "Saved!" : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Digest Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Daily Digest
          </CardTitle>
          <CardDescription>
            Instead of individual push alerts, receive a single end-of-day summary notification that batches all activity from the day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Daily Digest</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, individual event alerts are suppressed and replaced with one summary notification at your chosen time.
              </p>
            </div>
            <Switch
              checked={digestEnabled}
              onCheckedChange={setDigestEnabled}
              className="shrink-0 mt-0.5"
            />
          </div>
          {digestEnabled && (
            <div className="flex items-center gap-3 pt-1">
              <label className="text-sm font-medium text-foreground w-32">Delivery Time</label>
              <input
                type="time"
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <span className="text-xs text-muted-foreground">Your local time</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <Button
              onClick={sendTestDigest}
              disabled={testSending}
              size="sm"
              variant="ghost"
              className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {testSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
              {testSent ? "Test sent!" : "Send Test Digest Now"}
            </Button>
            <Button onClick={handleSave} disabled={updateBatchMutation.isPending} size="sm" variant="outline" className="gap-2">
              {updateBatchMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
