/**
 * Content Studio
 *
 * Central hub for managing Tim's two content brands:
 * - Tim the Home Loan Coach (ID 30001): Facebook, Instagram, TikTok — Home Loan content
 * - Coach Tim (ID 30002): YouTube, Facebook, Instagram, TikTok — Finance content
 *
 * Features:
 * - Brand switcher
 * - Viral topic research queue (AI-discovered topics)
 * - Content package pipeline with video review cards
 * - Social post history
 * - Manual post: paste video URL + generate AI caption + post
 * - Posting schedule editor
 * - Content calendar (week/month view)
 * - HeyGen browser agent controls
 * - Brand System name management
 */

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  TrendingUp, Video, Send, RefreshCw, CheckCircle, Clock,
  AlertCircle, Play, Facebook, Instagram, Youtube, Zap, Sparkles,
  BarChart2, Calendar, Eye, Settings2, X, ChevronLeft, ChevronRight,
  Bot, Loader2, XCircle, RotateCcw, MonitorPlay
} from "lucide-react";

const BRANDS = [
  {
    id: 30001,
    name: "Tim the Home Loan Coach",
    tagline: "Home Loan Content",
    platforms: ["facebook", "instagram", "tiktok"],
    color: "bg-blue-600",
    textColor: "text-blue-600",
    borderColor: "border-blue-600",
  },
  {
    id: 30002,
    name: "Coach Tim",
    tagline: "Finance & Wealth Content",
    platforms: ["youtube", "facebook", "instagram", "tiktok"],
    color: "bg-emerald-600",
    textColor: "text-emerald-600",
    borderColor: "border-emerald-600",
  },
];

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  tiktok: <Video className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  researched: "bg-yellow-100 text-yellow-800",
  scripted: "bg-blue-100 text-blue-800",
  in_production: "bg-purple-100 text-purple-800",
  ready: "bg-green-100 text-green-800",
  posted: "bg-gray-100 text-gray-600",
  archived: "bg-gray-100 text-gray-400",
  generating: "bg-purple-100 text-purple-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  pending_review: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  published: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-800",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ContentStudio() {
  const [activeBrandId, setActiveBrandId] = useState(30001);
  const [manualVideoUrl, setManualVideoUrl] = useState("");
  const [scheduleEdits, setScheduleEdits] = useState<Record<string, any>>({});
  const [manualTopic, setManualTopic] = useState("Nevada Essential Worker Home Loan Program");
  const [manualCaption, setManualCaption] = useState("");
  const [manualPlatform, setManualPlatform] = useState<"facebook" | "instagram" | "tiktok" | "youtube">("facebook");
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogPkgId, setRejectDialogPkgId] = useState<number | null>(null);
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);

  const activeBrand = BRANDS.find(b => b.id === activeBrandId)!;

  // Calendar date range
  const calendarRange = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (calendarWeekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);
    return { fromMs: startOfWeek.getTime(), toMs: endOfWeek.getTime(), startOfWeek };
  }, [calendarWeekOffset]);

  // Queries
  const { data: viralTopics, refetch: refetchTopics } = trpc.seoBridge.getViralTopics.useQuery({ seoClientId: activeBrandId });
  const { data: contentPackages, refetch: refetchPackages } = trpc.seoBridge.getContentPackages.useQuery({ clientId: activeBrandId });
  const { data: socialPosts, refetch: refetchPosts } = trpc.seoBridge.getSocialPosts.useQuery({ seoClientId: activeBrandId });
  const { data: postingSchedules, refetch: refetchSchedules } = trpc.seoBridge.getPostingSchedules.useQuery({ seoClientId: activeBrandId });
  const { data: calendarData, refetch: refetchCalendar } = trpc.seoBridge.getContentCalendar.useQuery({
    seoClientId: activeBrandId,
    fromMs: calendarRange.fromMs,
    toMs: calendarRange.toMs,
  });
  const { data: brandSystemData } = trpc.seoBridge.getBrandSystemName.useQuery({ seoClientId: activeBrandId });
  const { data: agentStatus } = trpc.seoBridge.getAgentStatus.useQuery(undefined, { refetchInterval: 10000 });

  // Mutations
  const researchTopics = trpc.seoBridge.researchViralTopics.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} viral topics researched!`, { description: "AI has discovered the best topics for this week." });
      refetchTopics();
    },
    onError: (err) => toast.error("Research failed", { description: err.message }),
  });

  const generatePackages = trpc.seoBridge.generatePackagesFromTopics.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.packageIds.length} content packages started`, { description: "Scripts being generated. Videos will process one at a time." });
      refetchPackages();
      refetchTopics();
    },
    onError: (err) => toast.error("Generation failed", { description: err.message }),
  });

  const generateSingleTopic = trpc.seoBridge.generateSingleTopic.useMutation({
    onSuccess: (data) => {
      toast.success("Content package started!", { description: "Script being generated. Video will process when agent is free." });
      refetchPackages();
      refetchTopics();
    },
    onError: (err) => toast.error("Generation failed", { description: err.message }),
  });

  const approvePackage = trpc.seoBridge.approveContentPackage.useMutation({
    onSuccess: () => {
      toast.success("Package approved!", { description: "Content queued for publishing." });
      refetchPackages();
    },
    onError: (err) => toast.error("Approval failed", { description: err.message }),
  });

  const rejectPackage = trpc.seoBridge.rejectContentPackage.useMutation({
    onSuccess: () => {
      toast.success("Package rejected", { description: "Content sent back for revision." });
      refetchPackages();
      setRejectDialogPkgId(null);
      setRejectReason("");
    },
    onError: (err) => toast.error("Rejection failed", { description: err.message }),
  });

  const triggerBrowserGenerate = trpc.seoBridge.triggerBrowserGenerate.useMutation({
    onSuccess: (data) => {
      toast.success("Browser Agent Launched!", { description: data.message });
      refetchPackages();
    },
    onError: (err) => toast.error("Browser agent failed", { description: err.message }),
  });

  const retryBrowserGenerate = trpc.seoBridge.retryBrowserGenerate.useMutation({
    onSuccess: () => {
      toast.success("Package reset", { description: "Ready to retry browser generation." });
      refetchPackages();
    },
    onError: (err) => toast.error("Retry failed", { description: err.message }),
  });

  const { data: heygenSessionStatus, refetch: refetchHeygenSession } = trpc.seoBridge.getHeyGenSessionStatus.useQuery(
    { seoClientId: activeBrandId },
    { refetchInterval: 30000 }
  );

  const testHeyGenConnection = trpc.seoBridge.testHeyGenConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("HeyGen connection verified!", { description: "Session tokens are valid." });
      } else {
        toast.error("HeyGen connection invalid", { description: data.error || "Session may have expired. Please reconnect." });
      }
      refetchHeygenSession();
    },
    onError: (err) => toast.error("Connection test failed", { description: err.message }),
  });

  // Listen for postMessage from the HeyGen capture popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'heygen-connected') {
        toast.success("HeyGen Connected!", { description: "Session tokens captured successfully." });
        refetchHeygenSession();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const openHeyGenCapture = () => {
    const url = `/api/heygen/capture?seoClientId=${activeBrandId}`;
    window.open(url, 'heygen-capture', 'width=600,height=700,scrollbars=yes');
  };

  const generateCaption = trpc.seoBridge.generateCaption.useMutation({
    onSuccess: (data) => {
      setManualCaption(data.caption);
      toast.success("Caption generated!", { description: "AI-written caption is ready to review." });
    },
    onError: (err) => toast.error("Caption generation failed", { description: err.message }),
  });

  const saveSchedule = trpc.seoBridge.savePostingSchedule.useMutation({
    onSuccess: () => {
      toast.success("Schedule saved!", { description: "Posting schedule updated for this brand." });
      refetchSchedules();
      setScheduleEdits({});
    },
    onError: (err) => toast.error("Save failed", { description: err.message }),
  });

  const manualPost = trpc.seoBridge.manualPost.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Posted to ${data.platform}!`, { description: data.platformPostId ? `Post ID: ${data.platformPostId}` : "Draft created — manual upload required." });
      } else {
        toast.error("Post failed", { description: data.error });
      }
      refetchPosts();
    },
    onError: (err) => toast.error("Post failed", { description: err.message }),
  });

  const updateBrandSystem = trpc.seoBridge.updateBrandSystemName.useMutation({
    onSuccess: () => toast.success("Brand System name updated!"),
    onError: (err) => toast.error("Update failed", { description: err.message }),
  });
  const cancelPackage = trpc.seoBridge.cancelContentPackage.useMutation({
    onSuccess: () => {
      toast.success("Removed from queue", { description: "Video job cancelled." });
      refetchPackages();
    },
    onError: (err) => toast.error("Cancel failed", { description: err.message }),
  });
  const cancelAllFailed = trpc.seoBridge.cancelAllFailedPackages.useMutation({
    onSuccess: (data) => {
      toast.success(`Cleared ${data.cancelled} items`, { description: "All failed and stuck jobs removed." });
      refetchPackages();
    },
    onError: (err) => toast.error("Clear failed", { description: err.message }),
  });

  const handleGenerateCaption = async () => {
    if (!manualTopic) return;
    setIsGeneratingCaption(true);
    try {
      await generateCaption.mutateAsync({
        seoClientId: activeBrandId,
        platform: manualPlatform,
        topic: manualTopic,
        videoContext: manualVideoUrl ? `Video URL: ${manualVideoUrl}` : undefined,
      });
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handlePost = async () => {
    if (!manualVideoUrl || !manualCaption) {
      toast.error("Missing info", { description: "Please add a video URL and caption first." });
      return;
    }
    setIsPosting(true);
    try {
      await manualPost.mutateAsync({
        seoClientId: activeBrandId,
        platform: manualPlatform,
        videoUrl: manualVideoUrl,
        caption: manualCaption,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const pendingTopics = viralTopics?.filter(t => t.status === "researched") ?? [];
  const pendingReview = contentPackages?.filter(p => p.status === "pending_review" || p.status === "pending_approval") ?? [];
  const generating = contentPackages?.filter(p => p.status === "generating") ?? [];

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(calendarRange.startOfWeek);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendarRange.startOfWeek]);

  const getCalendarItemsForDay = (day: Date) => {
    if (!calendarData) return { posts: [], packages: [], topics: [] };
    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayEnd.getTime();

    const posts = calendarData.scheduledPosts.filter(p => {
      const ts = p.scheduledAt ?? p.postedAt;
      return ts && ts >= dayStartMs && ts <= dayEndMs;
    });
    const packages = calendarData.packages.filter(p => {
      return p.createdAt >= dayStartMs && p.createdAt <= dayEndMs;
    });
    const topics = calendarData.topics.filter(t => {
      return t.createdAt >= dayStartMs && t.createdAt <= dayEndMs;
    });
    return { posts, packages, topics };
  };

  const calendarWeekLabel = useMemo(() => {
    const start = calendarDays[0];
    const end = calendarDays[6];
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", opts)} — ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
  }, [calendarDays]);

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Content Studio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered content engine for Tim's brands — research, generate, approve, and post
          </p>
        </div>
        <div className="flex items-center gap-2">
          {heygenSessionStatus?.connected ? (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                HeyGen Connected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => testHeyGenConnection.mutate({ seoClientId: activeBrandId })}
                disabled={testHeyGenConnection.isPending}
                className="text-xs h-7 px-2"
              >
                {testHeyGenConnection.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={openHeyGenCapture}
              className="text-xs bg-purple-600 hover:bg-purple-700"
            >
              <Bot className="h-3 w-3 mr-1" />
              Connect HeyGen
            </Button>
          )}
          {agentStatus?.busy ? (
            <Badge variant="outline" className="text-orange-600 border-orange-500 bg-orange-50 dark:bg-orange-950/30">
              <Loader2 className="h-3 w-3 animate-spin mr-1.5 text-orange-600" />
              <span className="max-w-[200px] truncate">
                Generating: {agentStatus.currentJob.topic}
              </span>
              <span className="ml-1 text-orange-400 text-[10px]">
                {Math.round((agentStatus.currentJob.elapsedMs ?? 0) / 60000)}m
              </span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Agent Ready
            </Badge>
          )}
        </div>
      </div>

      {/* Brand Switcher */}
      <div className="grid grid-cols-2 gap-4">
        {BRANDS.map(brand => (
          <button
            key={brand.id}
            onClick={() => setActiveBrandId(brand.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              activeBrandId === brand.id
                ? `${brand.borderColor} bg-card shadow-md`
                : "border-border bg-card/50 hover:bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-semibold ${activeBrandId === brand.id ? brand.textColor : "text-foreground"}`}>
                  {brand.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{brand.tagline}</div>
                {brandSystemData?.brandSystemName && activeBrandId === brand.id && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    HeyGen Brand: {brandSystemData.brandSystemName}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                {brand.platforms.map(p => (
                  <span key={p} className={`${activeBrandId === brand.id ? brand.textColor : "text-muted-foreground"}`}>
                    {PLATFORM_ICONS[p]}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-0 bg-purple-50 dark:bg-purple-950/30">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-700">{pendingTopics.length}</div>
            <div className="text-xs text-purple-600 mt-1">Topics Ready</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-700">{pendingReview.length}</div>
            <div className="text-xs text-orange-600 mt-1">Awaiting Review</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-700">{generating.length}</div>
            <div className="text-xs text-blue-600 mt-1">Generating</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-green-50 dark:bg-green-950/30">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-700">
              {contentPackages?.filter(p => p.status === "approved").length ?? 0}
            </div>
            <div className="text-xs text-green-600 mt-1">Approved</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gray-50 dark:bg-gray-950/30">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-700">
              {socialPosts?.filter(p => (p as any).status === "posted").length ?? 0}
            </div>
            <div className="text-xs text-gray-600 mt-1">Published</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="review">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="review" className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            Review
            {pendingReview.length > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-orange-600 text-white text-xs">
                {pendingReview.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="post-now">Post Now</TabsTrigger>
          <TabsTrigger value="topics">
            Topics
            {pendingTopics.length > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-purple-600 text-white text-xs">
                {pendingTopics.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ VIDEO REVIEW TAB ═══════════ */}
        <TabsContent value="review" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <MonitorPlay className="h-5 w-5 text-orange-500" />
                Video Review Queue
              </h3>
              <p className="text-sm text-muted-foreground">
                Videos generated by the HeyGen Browser Agent. Preview, approve, or request changes.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchPackages()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {pendingReview.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No videos awaiting review</p>
                <p className="text-sm text-muted-foreground mt-1">
                  When the HeyGen Browser Agent finishes generating a video, it will appear here for your approval.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingReview.map((pkg: any) => (
                <Card key={pkg.id} className="border-orange-300 bg-orange-50/30 dark:bg-orange-950/10 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex gap-5">
                      {/* Video Preview */}
                      <div className="flex-shrink-0 w-64">
                        {pkg.heygenVideoUrl ? (
                          <div className="rounded-lg overflow-hidden bg-black aspect-[9/16] relative group">
                            <video
                              src={pkg.heygenVideoUrl}
                              controls
                              className="w-full h-full object-contain"
                              preload="metadata"
                            />
                            <a
                              href={pkg.heygenVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Play className="h-3 w-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-gray-200 dark:bg-gray-800 aspect-[9/16] flex items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Content Details */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-base">{pkg.keyword}</h4>
                            <Badge className={`text-xs ${STATUS_COLORS[pkg.status] ?? "bg-gray-100"}`}>
                              {pkg.status.replace(/_/g, " ")}
                            </Badge>
                            {pkg.heygenVideoStatus !== "not_started" && (
                              <Badge variant="outline" className="text-xs">
                                Video: {pkg.heygenVideoStatus}
                              </Badge>
                            )}
                          </div>
                          {pkg.blogTitle && (
                            <p className="text-sm text-muted-foreground mt-1">{pkg.blogTitle}</p>
                          )}
                        </div>

                        {/* Video Script Preview */}
                        {pkg.videoScript && (
                          <div className="bg-background/80 rounded-lg p-3 border">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Video Script</div>
                            <p className="text-sm text-foreground line-clamp-4">{pkg.videoScript}</p>
                          </div>
                        )}

                        {/* Social Captions */}
                        {pkg.socialCaptions && pkg.socialCaptions.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Social Captions</div>
                            <div className="flex gap-1 flex-wrap">
                              {pkg.socialCaptions.map((c: any) => (
                                <Badge key={c.platform} variant="outline" className="text-xs capitalize">
                                  {PLATFORM_ICONS[c.platform]}
                                  <span className="ml-1">{c.platform}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            onClick={() => approvePackage.mutate({ packageId: pkg.id })}
                            disabled={approvePackage.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve & Publish
                          </Button>

                          <Dialog open={rejectDialogPkgId === pkg.id} onOpenChange={(open) => { if (!open) setRejectDialogPkgId(null); }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => setRejectDialogPkgId(pkg.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Request Changes
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Request Changes — {pkg.keyword}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="What needs to change? (e.g., 'Make the hook more engaging', 'Add NMLS disclaimer', 'Shorten to 30 seconds')"
                                  value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                  rows={4}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setRejectDialogPkgId(null)}>Cancel</Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => rejectPackage.mutate({ packageId: pkg.id, reason: rejectReason })}
                                    disabled={rejectPackage.isPending}
                                  >
                                    Send Feedback
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => triggerBrowserGenerate.mutate({ packageId: pkg.id })}
                            disabled={triggerBrowserGenerate.isPending || agentStatus?.busy}
                            className="text-purple-600"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {agentStatus?.busy ? "Agent Busy" : "Regenerate"}
                          </Button>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Created {new Date(pkg.createdAt).toLocaleDateString()} at {new Date(pkg.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Generating section */}
          {generating.length > 0 && (
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  Currently Generating ({generating.length})
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => cancelAllFailed.mutate({ seoClientId: activeBrandId })}
                  disabled={cancelAllFailed.isPending}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All Stuck
                </Button>
              </div>
              {generating.map((pkg: any) => (
                <Card key={pkg.id} className="border-purple-200 bg-purple-50/30 dark:bg-purple-950/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{pkg.keyword}</span>
                          <Badge className="text-xs bg-purple-100 text-purple-800">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Generating
                          </Badge>
                        </div>
                        {pkg.blogTitle && <p className="text-xs text-muted-foreground mt-1">{pkg.blogTitle}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          {new Date(pkg.createdAt).toLocaleDateString()}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => cancelPackage.mutate({ packageId: pkg.id })}
                          disabled={cancelPackage.isPending}
                          title="Remove from queue"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Failed packages */}
          {(() => {
            const failedPkgs = contentPackages?.filter(p => p.status === "failed") ?? [];
            if (failedPkgs.length === 0) return null;
            return (
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                    Failed ({failedPkgs.length})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => cancelAllFailed.mutate({ seoClientId: activeBrandId })}
                    disabled={cancelAllFailed.isPending}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All Failed
                  </Button>
                </div>
                {failedPkgs.map((pkg: any) => (
                  <Card key={pkg.id} className="border-red-200 bg-red-50/30 dark:bg-red-950/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{pkg.keyword}</span>
                            <Badge className="text-xs bg-red-100 text-red-800 shrink-0">Failed</Badge>
                          </div>
                          {pkg.errorMessage && <p className="text-xs text-red-600 mt-1 line-clamp-1">{pkg.errorMessage}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await retryBrowserGenerate.mutateAsync({ packageId: pkg.id });
                              triggerBrowserGenerate.mutate({ packageId: pkg.id });
                            }}
                            disabled={retryBrowserGenerate.isPending || triggerBrowserGenerate.isPending || agentStatus?.busy}
                            className="text-xs"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {agentStatus?.busy ? "Agent Busy" : "Retry"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => cancelPackage.mutate({ packageId: pkg.id })}
                            disabled={cancelPackage.isPending}
                            title="Remove from queue"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        {/* ═══════════ POST NOW TAB ═══════════ */}
        <TabsContent value="post-now" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-500" />
                Post a Video
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Paste a video URL (HeyGen, CDN, or Google Drive direct link), generate an AI caption, and post to {activeBrand.name}'s channels.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform</label>
                  <Select value={manualPlatform} onValueChange={(v) => setManualPlatform(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBrand.platforms.map(p => (
                        <SelectItem key={p} value={p}>
                          <div className="flex items-center gap-2">
                            {PLATFORM_ICONS[p]}
                            <span className="capitalize">{p}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Video Topic</label>
                  <Input
                    value={manualTopic}
                    onChange={e => setManualTopic(e.target.value)}
                    placeholder="e.g. Nevada Essential Worker Home Loan Program"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Video URL</label>
                <Input
                  value={manualVideoUrl}
                  onChange={e => setManualVideoUrl(e.target.value)}
                  placeholder="https://files.manuscdn.com/... or HeyGen video URL"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Caption</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCaption}
                    disabled={isGeneratingCaption || !manualTopic}
                  >
                    {isGeneratingCaption ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Generate AI Caption
                  </Button>
                </div>
                <Textarea
                  value={manualCaption}
                  onChange={e => setManualCaption(e.target.value)}
                  placeholder="Write or generate a caption..."
                  rows={4}
                />
              </div>

              <Button
                onClick={handlePost}
                disabled={isPosting || !manualVideoUrl || !manualCaption}
                className="w-full"
              >
                {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Post to {manualPlatform.charAt(0).toUpperCase() + manualPlatform.slice(1)}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ TOPICS TAB ═══════════ */}
        <TabsContent value="topics" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Viral Topic Queue</h3>
              <p className="text-sm text-muted-foreground">AI-discovered topics optimized for {activeBrand.name}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => researchTopics.mutate({ seoClientId: activeBrandId })}
                disabled={researchTopics.isPending}
              >
                {researchTopics.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                Research Topics Now
              </Button>
              <Button
                size="sm"
                onClick={() => generatePackages.mutate({ seoClientId: activeBrandId })}
                disabled={generatePackages.isPending || pendingTopics.length === 0 || (agentStatus?.busy ?? false)}
                variant="outline"
              >
                {generatePackages.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                {agentStatus?.busy ? "Agent Busy" : `Generate All (${pendingTopics.length})`}
              </Button>
            </div>
          </div>

          {!viralTopics || viralTopics.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No topics yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Research Topics Now" to discover viral content ideas for {activeBrand.name}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {viralTopics.map(topic => (
                <Card key={topic.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{topic.topic}</span>
                          <Badge className={`text-xs ${STATUS_COLORS[topic.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {topic.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {PLATFORM_ICONS[topic.platform ?? "instagram"]}
                            <span className="ml-1">{topic.platform}</span>
                          </Badge>
                          {topic.contentType === "youtube_longform" && (
                            <Badge className="text-xs bg-red-100 text-red-700">Long-form</Badge>
                          )}
                        </div>
                        {topic.hook && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Hook: "{topic.hook}"</p>
                        )}
                        {topic.keyPoints && topic.keyPoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {topic.keyPoints.slice(0, 3).map((pt: string, i: number) => (
                              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{pt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-600">{topic.viralScore}</div>
                          <div className="text-xs text-muted-foreground">Viral Score</div>
                        </div>
                        {topic.searchVolume && (
                          <div className="text-right">
                            <div className="text-sm font-semibold text-blue-600">
                              {topic.searchVolume.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">Monthly Searches</div>
                          </div>
                        )}
                        {topic.status === "researched" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="mt-1"
                            onClick={() => generateSingleTopic.mutate({ seoClientId: activeBrandId, topicId: topic.id })}
                            disabled={generateSingleTopic.isPending || (agentStatus?.busy ?? false)}
                          >
                            {generateSingleTopic.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Zap className="h-3 w-3 mr-1" />
                            )}
                            {agentStatus?.busy ? "Agent Busy" : "Generate"}
                          </Button>
                        )}
                        {(topic.status === "in_production" || topic.status === "scripted") && (
                          <Badge className="text-xs bg-amber-100 text-amber-700">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Processing
                          </Badge>
                        )}
                        {topic.status === "ready" && (
                          <Badge className="text-xs bg-green-100 text-green-700">Video Ready</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════ PIPELINE TAB ═══════════ */}
        <TabsContent value="pipeline" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Content Pipeline</h3>
              <p className="text-sm text-muted-foreground">
                All content packages for {activeBrand.name} — from generation to publishing.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchPackages()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {!contentPackages || contentPackages.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No content packages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Research topics and generate packages to start the HeyGen pipeline
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {contentPackages.map((pkg: any) => (
                <Card key={pkg.id} className={`hover:shadow-md transition-shadow ${
                  pkg.status === "pending_review" || pkg.status === "pending_approval" ? "border-orange-300" :
                  pkg.status === "generating" ? "border-purple-300" :
                  pkg.status === "failed" ? "border-red-300" : ""
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{pkg.keyword}</span>
                          <Badge className={`text-xs ${STATUS_COLORS[pkg.status] ?? "bg-gray-100"}`}>
                            {pkg.status.replace(/_/g, " ")}
                          </Badge>
                          {pkg.heygenVideoStatus !== "not_started" && (
                            <Badge variant="outline" className="text-xs">
                              Video: {pkg.heygenVideoStatus}
                            </Badge>
                          )}
                        </div>
                        {pkg.blogTitle && (
                          <p className="text-xs text-muted-foreground mt-1">{pkg.blogTitle}</p>
                        )}
                        {pkg.heygenVideoUrl && (
                          <a
                            href={pkg.heygenVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            <Play className="h-3 w-3" />
                            Preview Video
                          </a>
                        )}
                        {pkg.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">{pkg.errorMessage}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                        {(pkg.status === "pending_review" || pkg.status === "pending_approval") && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approvePackage.mutate({ packageId: pkg.id })}
                              disabled={approvePackage.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600"
                              onClick={() => setRejectDialogPkgId(pkg.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {pkg.status === "generating" && (
                          <div className="flex items-center gap-1 text-xs text-purple-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Generating...
                          </div>
                        )}
                        {pkg.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await retryBrowserGenerate.mutateAsync({ packageId: pkg.id });
                              triggerBrowserGenerate.mutate({ packageId: pkg.id });
                            }}
                            disabled={retryBrowserGenerate.isPending || agentStatus?.busy}
                            className="text-xs"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {agentStatus?.busy ? "Agent Busy" : "Retry"}
                          </Button>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(pkg.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════ CALENDAR TAB ═══════════ */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-500" />
                Content Calendar
              </h3>
              <p className="text-sm text-muted-foreground">
                Week view of all scheduled posts, packages, and topics for {activeBrand.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCalendarWeekOffset(w => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCalendarWeekOffset(0)}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCalendarWeekOffset(w => w + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchCalendar()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-center font-medium text-sm text-muted-foreground">{calendarWeekLabel}</div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const items = getCalendarItemsForDay(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const totalItems = items.posts.length + items.packages.length + items.topics.length;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 min-h-[160px] ${
                    isToday ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-xs font-medium ${isToday ? "text-indigo-600" : "text-muted-foreground"}`}>
                      {DAY_LABELS[idx]}
                    </div>
                    <div className={`text-sm font-bold ${isToday ? "text-indigo-700 bg-indigo-200 rounded-full w-7 h-7 flex items-center justify-center" : "text-foreground"}`}>
                      {day.getDate()}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {/* Scheduled/Posted social posts */}
                    {items.posts.map((post: any) => (
                      <div
                        key={`post-${post.id}`}
                        className={`text-xs rounded px-2 py-1 ${
                          post.status === "posted" ? "bg-green-100 text-green-800" :
                          post.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {PLATFORM_ICONS[post.platform]}
                          <span className="truncate">{post.keyword ?? post.caption?.slice(0, 20) ?? post.platform}</span>
                        </div>
                        {post.scheduledAt && (
                          <div className="text-[10px] opacity-70 mt-0.5">
                            {new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Content packages created this day */}
                    {items.packages.map((pkg: any) => (
                      <div
                        key={`pkg-${pkg.id}`}
                        className={`text-xs rounded px-2 py-1 ${STATUS_COLORS[pkg.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        <div className="flex items-center gap-1">
                          <Video className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{pkg.keyword}</span>
                        </div>
                      </div>
                    ))}

                    {/* Topics researched this day */}
                    {items.topics.map((topic: any) => (
                      <div
                        key={`topic-${topic.id}`}
                        className="text-xs rounded px-2 py-1 bg-purple-100 text-purple-800"
                      >
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{topic.topic}</span>
                        </div>
                      </div>
                    ))}

                    {totalItems === 0 && (
                      <div className="text-[10px] text-muted-foreground text-center py-4 opacity-50">
                        No activity
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
              Posted
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
              Scheduled
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300" />
              Pending Review
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300" />
              Topic Researched
            </div>
          </div>
        </TabsContent>

        {/* ═══════════ SCHEDULE TAB ═══════════ */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Posting Schedule — {activeBrand.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Set which days and times the agent posts on each platform. Content is spread across the calendar automatically — no same-day stacking.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brand System Name Editor */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">HeyGen Brand System</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The name of the Brand System in HeyGen that the browser agent will activate when generating videos for this brand.
                </p>
                <div className="flex gap-2">
                  <Input
                    defaultValue={brandSystemData?.brandSystemName ?? activeBrand.name}
                    id="brand-system-input"
                    placeholder="e.g. Tim the Home Loan Coach"
                    className="max-w-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById("brand-system-input") as HTMLInputElement;
                      if (input?.value) {
                        updateBrandSystem.mutate({ seoClientId: activeBrandId, brandSystemName: input.value });
                      }
                    }}
                    disabled={updateBrandSystem.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>

              {!postingSchedules || postingSchedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No schedules configured yet.</p>
                </div>
              ) : (
                postingSchedules.map((sched) => {
                  const key = sched.platform;
                  const edited = scheduleEdits[key] ?? sched;
                  const PLATFORM_COLORS: Record<string, string> = {
                    facebook: "bg-blue-50 border-blue-200 dark:bg-blue-950/30",
                    instagram: "bg-pink-50 border-pink-200 dark:bg-pink-950/30",
                    tiktok: "bg-gray-50 border-gray-200 dark:bg-gray-950/30",
                    youtube: "bg-red-50 border-red-200 dark:bg-red-950/30",
                    youtube_shorts: "bg-red-50 border-red-200 dark:bg-red-950/30",
                  };

                  return (
                    <div key={key} className={`rounded-xl border p-4 space-y-4 ${PLATFORM_COLORS[key] ?? "bg-card border-border"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{PLATFORM_ICONS[key] ?? <Video className="h-4 w-4" />}</span>
                          <span className="font-semibold capitalize">{key.replace("_", " ")}</span>
                          {edited.notes && (
                            <span className="text-xs text-muted-foreground hidden md:block">— {edited.notes}</span>
                          )}
                        </div>
                        <Switch
                          checked={edited.enabled}
                          onCheckedChange={(val) =>
                            setScheduleEdits(prev => ({ ...prev, [key]: { ...edited, enabled: val } }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Post Days</Label>
                        <div className="flex gap-2 flex-wrap">
                          {DAY_LABELS.map((day, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const current: number[] = edited.daysOfWeek ?? [];
                                const next = current.includes(idx)
                                  ? current.filter((d: number) => d !== idx)
                                  : [...current, idx].sort();
                                setScheduleEdits(prev => ({ ...prev, [key]: { ...edited, daysOfWeek: next } }));
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                (edited.daysOfWeek ?? []).includes(idx)
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-background text-muted-foreground border-border hover:border-indigo-400"
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Post Times (PST)</Label>
                        <div className="flex gap-2 flex-wrap items-center">
                          {(edited.postTimes ?? []).map((t: string, i: number) => (
                            <div key={i} className="flex items-center gap-1">
                              <Input
                                type="time"
                                value={t}
                                onChange={(e) => {
                                  const times = [...(edited.postTimes ?? [])];
                                  times[i] = e.target.value;
                                  setScheduleEdits(prev => ({ ...prev, [key]: { ...edited, postTimes: times } }));
                                }}
                                className="w-32 h-8 text-xs"
                              />
                              <button
                                onClick={() => {
                                  const times = (edited.postTimes ?? []).filter((_: string, j: number) => j !== i);
                                  setScheduleEdits(prev => ({ ...prev, [key]: { ...edited, postTimes: times } }));
                                }}
                                className="text-red-400 hover:text-red-600 text-xs"
                              >✕</button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const times = [...(edited.postTimes ?? []), "09:00"];
                              setScheduleEdits(prev => ({ ...prev, [key]: { ...edited, postTimes: times } }));
                            }}
                            className="px-2 py-1 rounded border border-dashed border-indigo-400 text-indigo-600 text-xs hover:bg-indigo-50"
                          >+ Add time</button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max Posts/Day</Label>
                          <Select
                            value={String(edited.maxPostsPerDay ?? 1)}
                            onValueChange={(v) =>
                              setScheduleEdits(prev => ({ ...prev, [key]: { ...edited, maxPostsPerDay: Number(v) } }))
                            }
                          >
                            <SelectTrigger className="w-20 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(n => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Min Hours Between Posts</Label>
                          <Select
                            value={String(edited.minHoursBetweenPosts ?? 4)}
                            onValueChange={(v) =>
                              setScheduleEdits(prev => ({ ...prev, [key]: { ...edited, minHoursBetweenPosts: Number(v) } }))
                            }
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[2, 4, 6, 8, 12, 24].map(n => (
                                <SelectItem key={n} value={String(n)}>{n}h</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {scheduleEdits[key] && (
                        <Button
                          size="sm"
                          onClick={() => saveSchedule.mutate({
                            seoClientId: activeBrandId,
                            platform: edited.platform as any,
                            enabled: edited.enabled,
                            daysOfWeek: edited.daysOfWeek,
                            postTimes: edited.postTimes,
                            maxPostsPerDay: edited.maxPostsPerDay,
                            minHoursBetweenPosts: edited.minHoursBetweenPosts,
                            timezone: edited.timezone ?? "America/Los_Angeles",
                            notes: edited.notes ?? undefined,
                          })}
                          disabled={saveSchedule.isPending}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          {saveSchedule.isPending ? "Saving..." : "Save Schedule"}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}

              {/* Schedule Summary */}
              {postingSchedules && postingSchedules.length > 0 && (
                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 p-4">
                  <div className="font-medium text-sm text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Weekly Posting Summary
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {postingSchedules.filter(s => s.enabled).map(s => {
                      const days = (s.daysOfWeek ?? []).map((d: number) => DAY_LABELS[d]).join(", ");
                      const postsPerWeek = (s.daysOfWeek ?? []).length * (s.maxPostsPerDay ?? 1);
                      return (
                        <div key={s.platform} className="text-xs space-y-0.5">
                          <div className="font-medium capitalize flex items-center gap-1">
                            {PLATFORM_ICONS[s.platform]}
                            {s.platform.replace("_", " ")}
                          </div>
                          <div className="text-indigo-700 dark:text-indigo-400">{days}</div>
                          <div className="text-muted-foreground">{postsPerWeek} posts/week</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
