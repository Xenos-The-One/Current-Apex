import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Sparkles, Link2, Settings, RefreshCw, Loader2, Copy, CheckCircle2,
  Share2, Eye, Zap, ChevronRight, Instagram, Linkedin, Twitter,
  Globe, Youtube, Layers, PlusCircle,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { PlatformConnectionCard, PlatformConnectionGrid, type PlatformKey } from "@/components/PlatformConnectionCard";
import { SocialPostPreview, type SocialPlatform } from "@/components/SocialPostPreview";

// ─── Platform icon helper ─────────────────────────────────────────────────────
const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Globe,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  google_business: Globe,
  tiktok: Globe,
  youtube: Youtube,
  pinterest: Globe,
  threads: Globe,
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  linkedin: "#0A66C2",
  twitter: "#000000",
  google_business: "#4285F4",
  tiktok: "#fe2c55",
  youtube: "#FF0000",
  pinterest: "#E60023",
  threads: "#000000",
};

// ─── Connect Platform Dialog ──────────────────────────────────────────────────
function ConnectPlatformDialog({
  platform,
  open,
  onClose,
}: {
  platform: PlatformKey | null;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [pageName, setPageName] = useState("");

  const connectMutation = trpc.socialConnections.connectPlatform.useMutation({
    onSuccess: () => {
      toast.success(`${platform} connected successfully`);
      utils.socialConnections.listConnections.invalidate();
      setUsername("");
      setPageName("");
      onClose();
    },
    onError: (e) => toast.error(e.message || "Failed to connect platform"),
  });

  if (!platform) return null;

  const platformLabel =
    platform.charAt(0).toUpperCase() + platform.slice(1).replace("_", " ");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-foreground text-xs font-bold"
              style={{ background: PLATFORM_COLORS[platform] ?? "#555" }}
            >
              {platform[0].toUpperCase()}
            </div>
            Connect {platformLabel}
          </DialogTitle>
          <DialogDescription>
            Add your {platformLabel} account details so your content can be scheduled and published.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username / Handle</Label>
            <Input
              id="username"
              placeholder={`@your${platform}handle`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          {(platform === "facebook" || platform === "linkedin" || platform === "google_business") && (
            <div className="space-y-1.5">
              <Label htmlFor="pageName">Page / Business Name</Label>
              <Input
                id="pageName"
                placeholder="Your Business Page"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
              />
            </div>
          )}
          <div
            className="rounded-lg p-3 text-xs"
            style={{
              border: "1px solid hsl(var(--border))",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            <p className="font-medium text-muted-foreground mb-1">Note</p>
            <p>
              Your account credentials are managed by your agency. This connects the platform
              for scheduling and content management purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={connectMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              connectMutation.mutate({
                platform,
                username: username || undefined,
                pageName: pageName || undefined,
              })
            }
            disabled={connectMutation.isPending}
            style={{ background: PLATFORM_COLORS[platform] ?? undefined }}
          >
            {connectMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Connect {platformLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Generate Post Dialog ─────────────────────────────────────────────────────
function GeneratePostDialog({
  open,
  onClose,
  defaultPlatform,
  businessName,
}: {
  open: boolean;
  onClose: () => void;
  defaultPlatform?: SocialPlatform;
  businessName?: string;
}) {
  const [platform, setPlatform] = useState<SocialPlatform>(defaultPlatform ?? "facebook");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "casual" | "urgent" | "inspirational">("professional");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeCta, setIncludeCta] = useState(true);
  const [result, setResult] = useState<{
    caption: string;
    hashtags: string;
    cta: string;
    charCount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.socialConnections.generatePost.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (e) => toast.error(e.message || "Generation failed"),
  });

  const handleCopy = () => {
    const fullText = [result?.caption, result?.hashtags, result?.cta]
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const handleClose = () => {
    setResult(null);
    setTopic("");
    onClose();
  };

  const previewContent = result
    ? [result.caption, result.cta].filter(Boolean).join("\n\n")
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Social Post Generator
          </DialogTitle>
          <DialogDescription>
            Generate platform-optimized social media posts with AI
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden min-h-0">
          {/* Left: Form */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Platform */}
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["facebook", "instagram", "linkedin", "twitter", "google_business", "tiktok"] as SocialPlatform[]).map((p) => {
                  const isActive = platform === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border"
                      style={
                        isActive
                          ? {
                              background: `${PLATFORM_COLORS[p]}20`,
                              borderColor: `${PLATFORM_COLORS[p]}50`,
                              color: PLATFORM_COLORS[p],
                            }
                          : {
                              background: "rgba(255,255,255,0.03)",
                              borderColor: "rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.5)",
                            }
                      }
                    >
                      <div
                        className="h-4 w-4 rounded-sm flex items-center justify-center text-foreground text-[9px] font-bold shrink-0"
                        style={{ background: PLATFORM_COLORS[p] }}
                      >
                        {p[0].toUpperCase()}
                      </div>
                      {p === "google_business" ? "Google" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <Label htmlFor="topic">Topic / Brief</Label>
              <Textarea
                id="topic"
                placeholder="e.g. Mortgage rates just dropped — great time to buy. Target first-time homebuyers in Dallas."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Tone */}
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="hashtags"
                  checked={includeHashtags}
                  onCheckedChange={setIncludeHashtags}
                />
                <Label htmlFor="hashtags" className="text-sm">Hashtags</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="cta"
                  checked={includeCta}
                  onCheckedChange={setIncludeCta}
                />
                <Label htmlFor="cta" className="text-sm">Call-to-Action</Label>
              </div>
            </div>

            {/* Credit indicator */}

            {/* Generate button */}
            <Button
              className="w-full"
              onClick={() =>
                generateMutation.mutate({
                  platform,
                  topic,
                  tone,
                  includeHashtags,
                  includeCta,
                  businessName,
                })
              }
              disabled={!topic.trim() || generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Post
                </>
              )}
            </Button>

            {/* Result */}
            {result && (
              <div className="space-y-3 rounded-xl p-4 border" style={{ background: undefined, borderColor: "hsl(var(--border))" }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-primary">Generated Post</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/70">{result.charCount} chars</span>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy}>
                      {copied ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground/70 mb-1 uppercase tracking-wide">Caption</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.caption}</p>
                  </div>
                  {result.hashtags && (
                    <div>
                      <p className="text-[10px] text-muted-foreground/70 mb-1 uppercase tracking-wide">Hashtags</p>
                      <p className="text-sm text-primary/80">{result.hashtags}</p>
                    </div>
                  )}
                  {result.cta && (
                    <div>
                      <p className="text-[10px] text-muted-foreground/70 mb-1 uppercase tracking-wide">CTA</p>
                      <p className="text-sm text-muted-foreground italic">{result.cta}</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() =>
                    generateMutation.mutate({
                      platform,
                      topic,
                      tone,
                      includeHashtags,
                      includeCta,
                      businessName,
                    })
                  }
                  disabled={generateMutation.isPending}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            )}
          </div>

          {/* Right: Live Preview */}
          <div
            className="w-full md:w-72 shrink-0 rounded-xl p-4 overflow-y-auto"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Live Preview
            </p>
            <SocialPostPreview
              platform={platform}
              content={previewContent}
              businessName={businessName}
              hashtags={result?.hashtags}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PortalSocialMedia() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "connections" | "posts">("overview");
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformKey | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  const utils = trpc.useUtils();

  const { data: connections, isLoading: connectionsLoading } = trpc.socialConnections.listConnections.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: myInfo } = trpc.crm.getMyInfo.useQuery(undefined, { enabled: !!user });
  const businessName = myInfo?.client?.name ?? user?.name ?? "Your Business";

  const disconnectMutation = trpc.socialConnections.disconnectPlatform.useMutation({
    onSuccess: () => {
      toast.success("Platform disconnected");
      utils.socialConnections.listConnections.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to disconnect"),
  });

  const connectedCount = connections?.filter((c) => c.connected).length ?? 0;
  const totalPlatforms = connections?.length ?? 0;

  const connectedPlatforms = useMemo(
    () => connections?.filter((c) => c.connected).map((c) => c.platform as SocialPlatform) ?? [],
    [connections]
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "connections", label: "Connected Platforms", icon: Link2 },
    { id: "posts", label: "Post Generator", icon: Sparkles },
  ] as const;

  return (
    <PortalLayout activePath="/seo/portal/social">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Social Media</h2>
            <p className="text-sm mt-1 text-muted-foreground">
              Manage your social platforms and generate AI-powered posts
            </p>
          </div>
          <Button
            onClick={() => setShowGenerateDialog(true)}
            className="shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.1), hsl(var(--primary)/0.2))", border: "1px solid hsl(var(--border))", color: "hsl(var(--primary))" }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Post
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all"
              style={
                isActive
                  ? { background: undefined, color: "hsl(var(--primary))" }
                  : { color: "rgba(255,255,255,0.5)" }
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Connected Platforms", value: connectedCount, icon: Link2, color: "hsl(var(--primary))" },
              { label: "Total Platforms", value: totalPlatforms, icon: Globe, color: "#60a5fa" },
              { label: "Posts This Month", value: "—", icon: Share2, color: "#a78bfa" },
              { label: "AI Credits Used", value: "—", icon: Zap, color: "#f59e0b" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}15` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground/70">{label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Connected platforms quick view */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Connected Platforms</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("connections")}
                  className="text-xs h-7"
                >
                  Manage
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground/70 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading platforms…
                </div>
              ) : connectedCount === 0 ? (
                <div className="text-center py-8">
                  <Link2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground mb-3">No platforms connected yet</p>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("connections")}
                    style={{ background: undefined, color: "hsl(var(--primary))", border: "1px solid hsl(var(--border))" }}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Connect a Platform
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {connections
                    ?.filter((c) => c.connected)
                    .map((c) => (
                      <PlatformConnectionCard
                        key={c.platform}
                        status={{ ...c, platform: c.platform as PlatformKey }}
                        compact
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setShowGenerateDialog(true)}
                  className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)/0.08), hsl(var(--primary)/0.15))",
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: undefined }}>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Generate AI Post</p>
                    <p className="text-xs text-muted-foreground/70">Create platform-optimized content</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("connections")}
                  className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Manage Connections</p>
                    <p className="text-xs text-muted-foreground/70">Connect or update platforms</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Connections Tab ── */}
      {activeTab === "connections" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Connections</CardTitle>
              <CardDescription>
                Connect your social media accounts to enable scheduling and AI-powered content publishing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground/70 text-sm py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <PlatformConnectionGrid
                  statuses={(connections ?? []).map((c) => ({
                    ...c,
                    platform: c.platform as PlatformKey,
                  }))}
                  onConnect={(platform) => setConnectingPlatform(platform)}
                  onDisconnect={(platform) => disconnectMutation.mutate({ platform })}
                  onReconnect={(platform) => setConnectingPlatform(platform)}
                  isLoading={disconnectMutation.isPending}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Post Generator Tab ── */}
      {activeTab === "posts" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Post Generator</CardTitle>
                  <CardDescription>
                    Generate platform-optimized social media posts with AI — with a live preview.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/40" />
                <p className="text-muted-foreground mb-2">Ready to generate</p>
                <p className="text-sm text-muted-foreground/60 mb-6">
                  Click the button below to open the full AI post generator with live platform preview.
                </p>
                <Button
                  onClick={() => setShowGenerateDialog(true)}
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)/0.08), hsl(var(--primary)/0.15))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--primary))",
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Open Post Generator
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Platform previews */}
          {connectedPlatforms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Previews</CardTitle>
                <CardDescription>
                  See how your content looks across your connected platforms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {connectedPlatforms.slice(0, 4).map((p) => (
                    <div key={p}>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        {p.charAt(0).toUpperCase() + p.slice(1).replace("_", " ")}
                      </p>
                      <SocialPostPreview
                        platform={p}
                        content=""
                        businessName={businessName}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <ConnectPlatformDialog
        platform={connectingPlatform}
        open={!!connectingPlatform}
        onClose={() => setConnectingPlatform(null)}
      />
      <GeneratePostDialog
        open={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        businessName={businessName}
      />
    </PortalLayout>
  );
}
