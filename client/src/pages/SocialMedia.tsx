import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Calendar, Plus, Facebook, Instagram, Linkedin, Clock,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, List, LayoutGrid,
} from "lucide-react";

import { toast } from "sonner";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "facebook": return <Facebook className="w-4 h-4" />;
    case "instagram": return <Instagram className="w-4 h-4" />;
    case "linkedin": return <Linkedin className="w-4 h-4" />;
    default: return null;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "scheduled": return "bg-blue-500 text-white";
    case "published": return "bg-green-500 text-white";
    case "draft": return "bg-gray-400 text-white";
    case "failed": return "bg-red-500 text-white";
    default: return "bg-gray-400 text-white";
  }
}

function getPlatformColor(platform: string) {
  switch (platform) {
    case "facebook": return "bg-blue-600";
    case "instagram": return "bg-pink-500";
    case "linkedin": return "bg-sky-700";
    default: return "bg-gray-500";
  }
}

// Build a grid for the given month (padded to full weeks)
function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Calendar sub-component ───────────────────────────────────────────────────

interface CalendarViewProps {
  posts: any[];
  onReschedule: (postId: number, newDate: Date) => void;
  isRescheduling: boolean;
}

function CalendarView({ posts, onReschedule, isRescheduling }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  const grid = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const postsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const post of posts) {
      if (!post.scheduledDate) continue;
      const d = new Date(post.scheduledDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(post);
      }
    }
    return map;
  }, [posts, year, month]);

  // Month-level stats
  const monthStats = useMemo(() => {
    const monthPosts = posts.filter((p: any) => {
      if (!p.scheduledDate) return false;
      const d = new Date(p.scheduledDate);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const byPlatform: Record<string, number> = {};
    for (const p of monthPosts) {
      byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1;
    }
    return { total: monthPosts.length, byPlatform };
  }, [posts, year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleDrop = (day: number) => {
    if (draggingId === null) return;
    const post = posts.find((p: any) => p.id === draggingId);
    if (!post) return;
    const orig = new Date(post.scheduledDate);
    const newDate = new Date(year, month, day, orig.getHours(), orig.getMinutes());
    onReschedule(draggingId, newDate);
    setDraggingId(null);
    setDragOverDay(null);
  };

  return (
    <div className="select-none">
      {/* Month-level stats banner */}
      <div className="flex items-center gap-3 mb-3 px-1 flex-wrap">
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">{monthStats.total}</span>
          <span className="text-xs text-muted-foreground">posts this month</span>
        </div>
        {Object.entries(monthStats.byPlatform).map(([platform, count]) => (
          <div key={platform} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-white text-xs font-medium ${getPlatformColor(platform)}`}>
            {platform === "facebook" && <Facebook className="w-3 h-3" />}
            {platform === "instagram" && <Instagram className="w-3 h-3" />}
            {platform === "linkedin" && <Linkedin className="w-3 h-3" />}
            {count} {platform}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
        <h3 className="font-semibold text-lg">{MONTH_NAMES[month]} {year}</h3>
        <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {grid.map((day, idx) => {
          const isToday = day !== null && new Date(year, month, day).toDateString() === today.toDateString();
          const isDragOver = dragOverDay === day && day !== null;
          const dayPosts = day ? (postsByDay[day] || []) : [];
          return (
            <div
              key={idx}
              className={`bg-background min-h-[90px] p-1 transition-colors ${
                day === null ? "opacity-40" : "hover:bg-accent/30"
              } ${isDragOver ? "bg-primary/10 ring-2 ring-inset ring-primary" : ""}`}
              onDragOver={day !== null ? (e) => { e.preventDefault(); setDragOverDay(day); } : undefined}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={day !== null ? () => handleDrop(day) : undefined}
            >
              {day !== null && (
                <>
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post: any) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={() => setDraggingId(post.id)}
                        onDragEnd={() => { setDraggingId(null); setDragOverDay(null); }}
                        title={post.content?.slice(0, 80)}
                        className={`text-[10px] text-white rounded px-1 py-0.5 truncate cursor-grab active:cursor-grabbing ${getPlatformColor(post.platform)} ${
                          draggingId === post.id ? "opacity-40" : ""
                        } ${isRescheduling && draggingId === post.id ? "animate-pulse" : ""}`}
                      >
                        {post.platform?.slice(0, 2).toUpperCase()} · {post.content?.slice(0, 18)}…
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{dayPosts.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Drag a post to a different day to reschedule it
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SocialMedia() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [, setLocation] = useLocation();
  const { data: clientInfo } = trpc.crm.getMyInfo.useQuery();
  const { data: posts, isLoading } = trpc.social.listPosts.useQuery();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "agency_owner";
  const isReadOnly = clientInfo?.client.accessMode === "read_only";

  const rescheduleMutation = trpc.social.reschedulePost.useMutation({
    onSuccess: () => {
      toast.success("Post rescheduled!");
      utils.social.listPosts.invalidate();
    },
    onError: (err: any) => toast.error(`Reschedule failed: ${err.message}`),
  });

  const handleReschedule = (postId: number, newDate: Date) => {
    rescheduleMutation.mutate({ postId, scheduledDate: newDate });
  };

  const stats = useMemo(() => {
    if (!posts) return { total: 0, scheduled: 0, published: 0, draft: 0 };
    return {
      total: posts.length,
      scheduled: posts.filter((p: any) => p.status === "scheduled").length,
      published: posts.filter((p: any) => p.status === "published").length,
      draft: posts.filter((p: any) => p.status === "draft").length,
    };
  }, [posts]);

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Social Media Scheduler</h1>
            <p className="text-muted-foreground">Schedule and manage posts across Facebook, Instagram, and LinkedIn</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setView("list")}
              >
                <List className="w-4 h-4 mr-1" /> List
              </Button>
              <Button
                variant={view === "calendar" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setView("calendar")}
              >
                <LayoutGrid className="w-4 h-4 mr-1" /> Calendar
              </Button>
            </div>
            {!isReadOnly && isAdmin && (
              <Button size="sm" onClick={() => setLocation("/seo/content")}>
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.scheduled}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.published}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.draft}</div></CardContent>
          </Card>
        </div>

        {/* Calendar or List view */}
        {view === "calendar" ? (
          <Card>
            <CardHeader>
              <CardTitle>Post Calendar</CardTitle>
              <CardDescription>Drag posts to different days to reschedule them</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading posts...</p>
                </div>
              ) : (
                <CalendarView
                  posts={posts || []}
                  onReschedule={handleReschedule}
                  isRescheduling={rescheduleMutation.isPending}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Posts</CardTitle>
              <CardDescription>All your social media posts across platforms</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading posts...</p>
                </div>
              ) : posts && posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post: any) => (
                    <div key={post.id} onClick={() => setLocation(`/social/${post.id}`)} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                          {getPlatformIcon(post.platform)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="capitalize">{post.platform}</Badge>
                            <Badge className={getStatusColor(post.status)}>{post.status}</Badge>
                            {post.scheduledDate && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(post.scheduledDate).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{post.content}</p>
                          {post.mediaUrls && JSON.parse(post.mediaUrls).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              📎 {JSON.parse(post.mediaUrls).length} media file(s)
                            </p>
                          )}
                        </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No posts yet</p>
                  <p className="text-sm mt-1">Create your first social media post to get started</p>
                  {!isReadOnly && isAdmin && (
                    <Button className="mt-4" onClick={() => setLocation("/seo/content")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Post in AI SEO Portal
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
