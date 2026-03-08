import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Globe,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format, isSameDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";

type ViewMode = "month" | "week";
type ColorBy = "client" | "status" | "platform";

const CLIENT_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500",
  in_progress: "bg-yellow-500",
  approved: "bg-green-500",
};

const SCHEDULE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-purple-500",
  processing: "bg-blue-400",
  completed: "bg-blue-600",
  failed: "bg-red-600",
};

// Common timezones
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [colorBy, setColorBy] = useState<ColorBy>("client");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [filterRanking, setFilterRanking] = useState<string>("all");
  const [filterContentType, setFilterContentType] = useState<string>("all");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [, navigate] = useLocation();

  // Schedule dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleForDate, setScheduleForDate] = useState<Date | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [publishToWordPress, setPublishToWordPress] = useState(false);
  const [selectedWordPress, setSelectedWordPress] = useState<number[]>([]);
  const [wordpressStatus, setWordpressStatus] = useState<"draft" | "publish" | "pending">("draft");
  const [publishToManus, setPublishToManus] = useState(false);
  const [selectedManus, setSelectedManus] = useState<number[]>([]);

  // Current-time indicator state — updates every minute
  const [now, setNow] = useState(() => new Date());
  const weekScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);
  // Scroll week view to current hour on mount
  useEffect(() => {
    if (viewMode === "week" && weekScrollRef.current) {
      const currentHour = new Date().getHours();
      const rowHeight = 52;
      weekScrollRef.current.scrollTop = Math.max(0, (currentHour - 1) * rowHeight);
    }
  }, [viewMode]);

  const { data: content, refetch: refetchContent } = trpc.seo.content.list.useQuery();
  const { data: clients } = trpc.seo.clients.list.useQuery();
  const { data: schedules, refetch: refetchSchedules } = trpc.seo.publishingScheduler.getSchedules.useQuery();
  const updateContent = trpc.seo.content.update.useMutation();
  const createSchedule = trpc.seo.publishingScheduler.create.useMutation();
  const cancelSchedule = trpc.seo.publishingScheduler.cancel.useMutation();

  // Get WordPress/Manus connections for selected content
  const selectedContentItem = content?.find((c) => c.content.id === selectedContentId);
  const { data: wpConnections } = trpc.seo.wordpress.getConnections.useQuery(
    { clientId: selectedContentItem?.content.clientId || 0 },
    { enabled: !!selectedContentItem }
  );
  const { data: manusWebsites } = trpc.seo.manusWebsites.getWebsites.useQuery(
    { clientId: selectedContentItem?.content.clientId || 0 },
    { enabled: !!selectedContentItem }
  );

  // Social platform colours for calendar dots
  const SOCIAL_PLATFORM_COLORS: Record<string, string> = {
    linkedin: "#3b82f6",
    twitter: "#38bdf8",
    instagram: "#ec4899",
    facebook: "#6366f1",
    tiktok: "#f43f5e",
    general: "#a855f7",
  };

  // Filter content by client, ranking, and content type
  const filteredContent = useMemo(() => {
    if (!content) return [];
    return content.filter((c) => {
      if (selectedClient !== "all" && c.content.clientId !== parseInt(selectedClient)) return false;
      if (filterRanking !== "all") {
        const score = (c as any).qualityScore ?? null;
        if (filterRanking === "high" && (score == null || score < 70)) return false;
        if (filterRanking === "medium" && (score == null || score < 40 || score >= 70)) return false;
        if (filterRanking === "low" && (score == null || score >= 40)) return false;
        if (filterRanking === "unscored" && score != null) return false;
      }
      if (filterContentType === "social") {
        if ((c.content as any).contentType !== "social-post") return false;
      } else if (filterContentType === "email") {
        const ct = (c.content as any).contentType;
        if (ct !== "newsletter" && ct !== "email-sequence") return false;
      } else if (filterContentType !== "all") {
        if ((c.content as any).contentType !== filterContentType) return false;
      }
      return true;
    });
  }, [content, selectedClient, filterRanking, filterContentType]);

  // Build calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  // Get content scheduled on a date (via content.scheduledPublishDate)
  const getContentForDate = (date: Date) => {
    return filteredContent.filter((item) => {
      if (!item.content.scheduledPublishDate) return false;
      return isSameDay(new Date(item.content.scheduledPublishDate), date);
    });
  };

  // Get publishing schedules on a date
  const getSchedulesForDate = (date: Date) => {
    if (!schedules) return [];
    return schedules.filter((s) => isSameDay(new Date(s.scheduledFor), date));
  };

  // Navigation
  const goBack = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subWeeks(currentDate, 1));
  };
  const goForward = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addWeeks(currentDate, 1));
  };
  const goToToday = () => setCurrentDate(new Date());

  // Drag-and-drop
  const handleDragStart = (e: React.DragEvent, contentId: number) => {
    e.dataTransfer.setData("contentId", contentId.toString());
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const contentId = parseInt(e.dataTransfer.getData("contentId"));
    const contentItem = content?.find((c) => c.content.id === contentId);
    if (!contentItem) return;
    try {
      const scheduledDate = new Date(targetDate);
      scheduledDate.setHours(12, 0, 0, 0);
      await updateContent.mutateAsync({
        id: contentId,
        scheduledPublishDate: scheduledDate.toISOString(),
      });
      toast.success("Content rescheduled");
      refetchContent();
    } catch {
      toast.error("Failed to reschedule content");
    }
  };

  // Open schedule dialog for a specific date
  const openScheduleDialog = (date: Date) => {
    setScheduleForDate(date);
    setScheduleDialogOpen(true);
    setSelectedContentId(null);
    setScheduleTime("09:00");
    setPublishToWordPress(false);
    setSelectedWordPress([]);
    setPublishToManus(false);
    setSelectedManus([]);
  };

  // Create publishing schedule
  const handleCreateSchedule = async () => {
    if (!selectedContentId || !scheduleForDate) {
      toast.error("Please select content");
      return;
    }
    if (!publishToWordPress && !publishToManus) {
      toast.error("Please select at least one platform");
      return;
    }

    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledFor = new Date(scheduleForDate);
    scheduledFor.setHours(hours, minutes, 0, 0);

    if (scheduledFor <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    try {
      await createSchedule.mutateAsync({
        contentId: selectedContentId,
        scheduledFor,
        publishToWordPress,
        wordpressConnectionIds: publishToWordPress ? selectedWordPress : undefined,
        wordpressStatus,
        publishToManus,
        manusWebsiteIds: publishToManus ? selectedManus : undefined,
      });
      toast.success("Publishing scheduled!");
      setScheduleDialogOpen(false);
      refetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule");
    }
  };

  // Cancel a schedule
  const handleCancelSchedule = async (scheduleId: number) => {
    try {
      await cancelSchedule.mutateAsync({ id: scheduleId });
      toast.success("Schedule cancelled");
      refetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel");
    }
  };

  const PLATFORM_COLORS: Record<string, string> = {
    linkedin:  "bg-blue-600",
    twitter:   "bg-sky-400",
    instagram: "bg-pink-500",
    facebook:  "bg-indigo-500",
    tiktok:    "bg-rose-500",
    general:   "bg-purple-500",
  };

  const getItemColor = (clientId: number, status: string, contentType?: string, contentSubtype?: string) => {
    if (colorBy === "platform") {
      if (contentType === "social-post") {
        return PLATFORM_COLORS[contentSubtype ?? "general"] ?? "bg-purple-500";
      }
      // Non-social content gets a neutral colour in platform view
      return "bg-muted";
    }
    if (colorBy === "client") return CLIENT_COLORS[clientId % CLIENT_COLORS.length];
    return STATUS_COLORS[status] || "bg-gray-500";
  };

  const headerLabel =
    viewMode === "month"
      ? format(currentDate, "MMMM yyyy")
      : `Week of ${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`;

  return (
    <TooltipProvider>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Content Calendar</h1>
            <p className="text-muted-foreground mt-2">
              Schedule and manage your content publication dates
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {/* Timezone selector */}
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-[180px]">
                <Globe className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Client filter */}
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Content type filter */}
            <Select value={filterContentType} onValueChange={setFilterContentType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="social">📱 Social Posts</SelectItem>
                <SelectItem value="email">✉️ Email / Newsletter</SelectItem>
                <SelectItem value="blog-post">📝 Blog Post</SelectItem>
                <SelectItem value="press-release">📣 Press Release</SelectItem>
                <SelectItem value="video-script">🎬 Video Script</SelectItem>
                <SelectItem value="landing-page">🌐 Landing Page</SelectItem>
                <SelectItem value="whitepaper">📄 Whitepaper</SelectItem>
                <SelectItem value="case-study">📊 Case Study</SelectItem>
              </SelectContent>
            </Select>

            {/* Ranking filter */}
            <Select value={filterRanking} onValueChange={setFilterRanking}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Rankings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rankings</SelectItem>
                <SelectItem value="high">High (70+)</SelectItem>
                <SelectItem value="medium">Medium (40–69)</SelectItem>
                <SelectItem value="low">Low (&lt;40)</SelectItem>
                <SelectItem value="unscored">Not Scored</SelectItem>
              </SelectContent>
            </Select>

            {/* Color by */}
            <Select value={colorBy} onValueChange={(v) => setColorBy(v as ColorBy)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Color by Client</SelectItem>
                <SelectItem value="status">Color by Status</SelectItem>
                <SelectItem value="platform">Color by Platform</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={goToToday}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Today
            </Button>
          </div>
        </div>

        {/* Calendar Controls */}
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold min-w-[260px] text-center">{headerLabel}</h2>
              <Button variant="outline" size="icon" onClick={goForward}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                onClick={() => setViewMode("month")}
              >
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>
            </div>
          </div>
        </Card>

        {/* Legend */}
        <Card className="p-3 mb-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-sm">Legend:</span>
            {colorBy === "status" ? (
              <>
                {Object.entries(STATUS_COLORS).map(([s, c]) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${c}`} />
                    <span className="capitalize">{s.replace("_", " ")}</span>
                  </div>
                ))}
              </>
            ) : colorBy === "platform" ? (
              <>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-600" /><span>LinkedIn</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-sky-400" /><span>Twitter / X</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-pink-500" /><span>Instagram</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-500" /><span>Facebook</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-500" /><span>TikTok</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-500" /><span>Other Social</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-muted" /><span>Non-social content</span></div>
              </>
            ) : (
              <span className="text-muted-foreground">Each color = a different client</span>
            )}
            <div className="flex items-center gap-1.5 ml-4">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span>Scheduled (pending)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-600" />
              <span>Published (completed)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-600" />
              <span>Failed</span>
            </div>
          </div>
        </Card>

        {/* Calendar Grid */}
        <Card className="p-4">
          {viewMode === "week" ? (
            /* ── Week view: hourly time slots ── */
            <div className="overflow-x-auto">
              {/* Day header row */}
              <div className="grid gap-0" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                <div className="" />
                {calendarDays.map((date) => (
                  <div
                    key={date.toISOString()}
                    className={`text-center py-2 border-b border-border/50 ${
                      isToday(date) ? "bg-primary/5" : ""
                    }`}
                  >
                    <p className="text-xs text-muted-foreground font-medium">{format(date, "EEE")}</p>
                    <p
                      className={`text-sm font-semibold ${
                        isToday(date)
                          ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto"
                          : ""
                      }`}
                    >
                      {format(date, "d")}
                    </p>
                  </div>
                ))}
              </div>

              {/* Hourly rows */}
              <div className="max-h-[600px] overflow-y-auto relative" ref={weekScrollRef}>
                {/* Current-time red indicator — only shown when today is in the visible week */}
                {calendarDays.some((d) => isToday(d)) && (() => {
                  const nowHour = now.getHours();
                  const nowMinute = now.getMinutes();
                  const rowHeight = 52; // px, matches minHeight below
                  const topPx = nowHour * rowHeight + (nowMinute / 60) * rowHeight;
                  const todayColIndex = calendarDays.findIndex((d) => isToday(d));
                  // Each day column is (100% - 56px) / 7 wide; left offset = 56px + todayColIndex * colWidth
                  return (
                    <div
                      className="absolute pointer-events-none z-20"
                      style={{
                        top: `${topPx}px`,
                        left: `calc(56px + ${todayColIndex} * ((100% - 56px) / 7))`,
                        width: `calc((100% - 56px) / 7)`,
                      }}
                    >
                      {/* Circle dot on the left edge */}
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                      {/* Horizontal line */}
                      <div className="h-[2px] w-full bg-red-500 opacity-80" />
                    </div>
                  );
                })()}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    className="grid border-b border-border/20 hover:bg-muted/10 transition-colors"
                    style={{ gridTemplateColumns: "56px repeat(7, 1fr)", minHeight: "52px" }}
                  >
                    {/* Hour label */}
                    <div className="text-[10px] text-muted-foreground/60 pr-2 pt-1 text-right shrink-0 select-none">
                      {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                    </div>

                    {/* Day columns */}
                    {calendarDays.map((date) => {
                      const dayContent = getContentForDate(date).filter((item) => {
                        if (!item.content.scheduledPublishDate) return false;
                        const h = new Date(item.content.scheduledPublishDate).getHours();
                        return h === hour;
                      });
                      const daySchedules = getSchedulesForDate(date).filter((s) => {
                        const h = new Date(s.scheduledFor).getHours();
                        return h === hour;
                      });
                      const todayHighlight = isToday(date);

                      return (
                        <div
                          key={date.toISOString()}
                          className={`border-l border-border/20 px-1 py-0.5 ${
                            todayHighlight ? "bg-primary/5" : ""
                          }`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => {
                            e.preventDefault();
                            const contentId = parseInt(e.dataTransfer.getData("contentId"));
                            const contentItem = content?.find((c) => c.content.id === contentId);
                            if (!contentItem) return;
                            const scheduledDate = new Date(date);
                            scheduledDate.setHours(hour, 0, 0, 0);
                            updateContent.mutate({
                              id: contentId,
                              scheduledPublishDate: scheduledDate.toISOString(),
                            }, { onSuccess: () => { toast.success("Content rescheduled"); refetchContent(); } });
                          }}
                        >
                          {dayContent.map((item) => (
                            <Tooltip key={`c-${item.content.id}`}>
                              <TooltipTrigger asChild>
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, item.content.id)}
                                  className={`text-[10px] px-1 py-0.5 rounded cursor-move hover:opacity-80 truncate mb-0.5 ${
                                    getItemColor(item.content.clientId, item.content.status, (item.content as any).contentType, (item.content as any).contentSubtype)
                                  } text-white`}
                                  onClick={() => navigate(`/content/${item.content.id}`)}
                                >
                                  {item.content.title}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{item.content.title}</p>
                                <p className="text-xs text-muted-foreground">{item.client?.name} · {item.content.status}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {daySchedules.map((sched) => (
                            <Tooltip key={`s-${sched.id}`}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5 mb-0.5 ${
                                    SCHEDULE_STATUS_COLORS[sched.status] || "bg-purple-500"
                                  } text-white truncate`}
                                >
                                  <Send className="h-2 w-2 shrink-0" />
                                  <span className="truncate">{sched.contentTitle || `#${sched.contentId}`}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{sched.contentTitle}</p>
                                <p className="text-xs">{format(new Date(sched.scheduledFor), "h:mm a")} · <span className="capitalize">{sched.status}</span></p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-xs text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar cells */}
            {calendarDays.map((date, index) => {
              const dayContent = getContentForDate(date);
              const daySchedules = getSchedulesForDate(date);
              const isCurrentMonth =
                date.getMonth() === currentDate.getMonth();
              const todayHighlight = isToday(date);

              return (
                <div
                  key={index}
                  className={`min-h-[110px] border rounded-lg p-1.5 transition-colors ${
                    isCurrentMonth ? "bg-card" : "bg-muted/20 opacity-50"
                  } ${todayHighlight ? "ring-2 ring-primary" : ""}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, date)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium ${
                        todayHighlight
                          ? "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center"
                          : "text-foreground"
                      }`}
                    >
                      {format(date, "d")}
                    </span>
                    {isCurrentMonth && (
                      <button
                        onClick={() => openScheduleDialog(date)}
                        className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Schedule publishing"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {/* Content items (drag-and-drop scheduled) */}
                    {dayContent.map((item) => (
                      <Tooltip key={`c-${item.content.id}`}>
                        <TooltipTrigger asChild>
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.content.id)}
                            className={`text-xs px-1.5 py-0.5 rounded cursor-move hover:opacity-80 transition-opacity ${getItemColor(
                              item.content.clientId,
                              item.content.status,
                              (item.content as any).contentType,
                              (item.content as any).contentSubtype
                            )} text-white truncate`}
                            onClick={() => navigate(`/content/${item.content.id}`)}
                          >
                            {item.content.title}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{item.content.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.client?.name} · {item.content.status}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}

                    {/* Publishing schedule items */}
                    {daySchedules.map((sched) => (
                      <Tooltip key={`s-${sched.id}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              SCHEDULE_STATUS_COLORS[sched.status] || "bg-purple-500"
                            } text-white truncate`}
                          >
                            <Send className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{sched.contentTitle || `#${sched.contentId}`}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{sched.contentTitle}</p>
                          <p className="text-xs">
                            {format(new Date(sched.scheduledFor), "h:mm a")} ·{" "}
                            <span className="capitalize">{sched.status}</span>
                          </p>
                          {sched.publishToWordPress ? (
                            <p className="text-xs">→ WordPress</p>
                          ) : null}
                          {sched.publishToManus ? (
                            <p className="text-xs">→ Manus</p>
                          ) : null}
                          {sched.status === "pending" && (
                            <button
                              className="text-xs underline mt-1 text-red-300"
                              onClick={() => handleCancelSchedule(sched.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )} {/* end month view ternary */}
        </Card>

        {/* Unscheduled Content */}
        {filteredContent.filter((c) => !c.content.scheduledPublishDate).length > 0 && (
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">
              Unscheduled Content
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (drag to a date to schedule)
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {filteredContent
                .filter((c) => !c.content.scheduledPublishDate)
                .map((item) => (
                  <div
                    key={item.content.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.content.id)}
                    className={`px-3 py-1.5 rounded cursor-move hover:opacity-80 transition-opacity ${getItemColor(
                      item.content.clientId,
                      item.content.status,
                      (item.content as any).contentType,
                      (item.content as any).contentSubtype
                    )} text-white text-sm max-w-[200px]`}
                    onClick={() => navigate(`/content/${item.content.id}`)}
                  >
                    <div className="font-medium truncate">{item.content.title}</div>
                    <div className="text-xs opacity-90">{item.client?.name}</div>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* Schedule Publishing Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Publishing</DialogTitle>
              <DialogDescription>
                {scheduleForDate
                  ? `Schedule content to publish on ${format(scheduleForDate, "MMMM d, yyyy")}`
                  : "Schedule content publishing"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Content selection */}
              <div className="space-y-2">
                <Label>Content *</Label>
                <Select
                  value={selectedContentId?.toString() || ""}
                  onValueChange={(v) => setSelectedContentId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content to publish" />
                  </SelectTrigger>
                  <SelectContent>
                    {content
                      ?.filter((c) =>
                        selectedClient === "all"
                          ? true
                          : c.content.clientId === parseInt(selectedClient)
                      )
                      .map((c) => (
                        <SelectItem key={c.content.id} value={c.content.id.toString()}>
                          {c.content.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* WordPress */}
              {selectedContentItem && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wp"
                      checked={publishToWordPress}
                      onCheckedChange={(c) => setPublishToWordPress(!!c)}
                    />
                    <label htmlFor="wp" className="text-sm font-medium cursor-pointer">
                      Publish to WordPress
                    </label>
                  </div>

                  {publishToWordPress && wpConnections && wpConnections.length > 0 && (
                    <div className="ml-6 space-y-2">
                      {wpConnections.map((conn) => (
                        <div key={conn.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`wp-${conn.id}`}
                            checked={selectedWordPress.includes(conn.id)}
                            onCheckedChange={(c) =>
                              setSelectedWordPress(
                                c
                                  ? [...selectedWordPress, conn.id]
                                  : selectedWordPress.filter((id) => id !== conn.id)
                              )
                            }
                          />
                          <label htmlFor={`wp-${conn.id}`} className="text-sm cursor-pointer">
                            {conn.siteName}
                          </label>
                        </div>
                      ))}
                      <div className="mt-2 space-y-1">
                        <Label className="text-xs">Post Status</Label>
                        <Select
                          value={wordpressStatus}
                          onValueChange={(v: any) => setWordpressStatus(v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="publish">Published</SelectItem>
                            <SelectItem value="pending">Pending Review</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {publishToWordPress && wpConnections?.length === 0 && (
                    <p className="ml-6 text-xs text-muted-foreground">
                      No WordPress connections configured for this client.
                    </p>
                  )}

                  {/* Manus */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="manus"
                      checked={publishToManus}
                      onCheckedChange={(c) => setPublishToManus(!!c)}
                    />
                    <label htmlFor="manus" className="text-sm font-medium cursor-pointer">
                      Publish to Manus Website
                    </label>
                  </div>

                  {publishToManus && manusWebsites && manusWebsites.length > 0 && (
                    <div className="ml-6 space-y-2">
                      {manusWebsites.map((site) => (
                        <div key={site.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`manus-${site.id}`}
                            checked={selectedManus.includes(site.id)}
                            onCheckedChange={(c) =>
                              setSelectedManus(
                                c
                                  ? [...selectedManus, site.id]
                                  : selectedManus.filter((id) => id !== site.id)
                              )
                            }
                          />
                          <label htmlFor={`manus-${site.id}`} className="text-sm cursor-pointer">
                            {site.projectTitle}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {publishToManus && manusWebsites?.length === 0 && (
                    <p className="ml-6 text-xs text-muted-foreground">
                      No Manus websites configured for this client.
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSchedule} disabled={createSchedule.isPending}>
                {createSchedule.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scheduling...</>
                ) : (
                  <><Clock className="h-4 w-4 mr-2" />Schedule</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
