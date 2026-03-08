import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, CheckCircle2, AlertCircle, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay } from "date-fns";

type ContentItem = {
  content: {
    id: number;
    title: string;
    status: string;
    isScheduled: number | null;
    scheduledPublishDate: Date | string | null;
    clientId: number;
  };
  client: { name: string } | null;
};

export default function Scheduling() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [publishDate, setPublishDate] = useState("");
  const [draggedItem, setDraggedItem] = useState<ContentItem | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date()));

  const { data: contentList, refetch } = trpc.seo.content.list.useQuery();
  const scheduleMutation = trpc.seo.content.schedule.useMutation();

  const scheduledContent = useMemo(() => {
    return contentList?.filter(item => item.content.isScheduled) || [];
  }, [contentList]);

  const unscheduledContent = useMemo(() => {
    return contentList?.filter(item => !item.content.isScheduled) || [];
  }, [contentList]);

  // Calendar days for month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Calendar days for week view
  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(selectedWeekStart);
    return eachDayOfInterval({ start: selectedWeekStart, end: weekEnd });
  }, [selectedWeekStart]);

  const contentByDate = useMemo(() => {
    const map: { [key: string]: ContentItem[] } = {};
    scheduledContent.forEach(item => {
      if (item.content.scheduledPublishDate) {
        const dateStr = format(new Date(item.content.scheduledPublishDate), "yyyy-MM-dd");
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(item as ContentItem);
      }
    });
    return map;
  }, [scheduledContent]);

  const handleSchedule = async () => {
    if (!selectedContentId || !publishDate) {
      toast.error("Please select content and a date");
      return;
    }
    try {
      await scheduleMutation.mutateAsync({
        contentId: selectedContentId,
        scheduledPublishDate: new Date(publishDate),
      });
      toast.success("Content scheduled successfully");
      setIsOpen(false);
      setPublishDate("");
      setSelectedContentId(null);
      refetch();
    } catch {
      toast.error("Failed to schedule content");
    }
  };

  const handleDragStart = (item: ContentItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);

    if (!draggedItem) return;

    try {
      const dropDate = new Date(dateStr + "T12:00:00");
      await scheduleMutation.mutateAsync({
        contentId: draggedItem.content.id,
        scheduledPublishDate: dropDate,
      });
      toast.success(`"${draggedItem.content.title}" scheduled for ${format(dropDate, "MMM d, yyyy")}`);
      refetch();
    } catch {
      toast.error("Failed to reschedule content");
    }
    setDraggedItem(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/80";
      case "in_progress": return "bg-yellow-500/80";
      default: return "bg-blue-500/80";
    }
  };

  const renderCalendarCell = (day: Date, isCompact: boolean = false) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayContent = contentByDate[dateStr] || [];
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isTodayDate = isToday(day);
    const isDragOver = dragOverDate === dateStr;

    return (
      <div
        key={dateStr}
        className={`rounded-lg border transition-all duration-150 ${isCompact ? "min-h-24" : "min-h-28"} flex flex-col ${
          !isCurrentMonth && viewMode === "month" ? "opacity-40 bg-muted/30" : "bg-card/50"
        } ${isTodayDate ? "border-primary ring-1 ring-primary/30" : "border-border/50"} ${
          isDragOver ? "border-primary bg-primary/10 scale-[1.02] shadow-lg" : ""
        }`}
        onDragOver={(e) => handleDragOver(e, dateStr)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, dateStr)}
      >
        <div className={`px-2 py-1 flex items-center justify-between ${isTodayDate ? "bg-primary/10 rounded-t-lg" : ""}`}>
          <span className={`text-xs font-semibold ${isTodayDate ? "text-primary" : "text-muted-foreground"}`}>
            {viewMode === "week" ? format(day, "EEE d") : day.getDate()}
          </span>
          {dayContent.length > 0 && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {dayContent.length}
            </Badge>
          )}
        </div>
        <div className="flex-1 px-1 pb-1 space-y-0.5 overflow-hidden">
          {dayContent.slice(0, viewMode === "week" ? 6 : 3).map(item => (
            <div
              key={item.content.id}
              draggable
              onDragStart={() => handleDragStart(item)}
              className={`text-[11px] rounded px-1.5 py-0.5 text-white truncate cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity flex items-center gap-1 ${getStatusColor(item.content.status)}`}
              title={`${item.content.title} (${item.client?.name || "Unknown"})`}
            >
              <GripVertical className="h-2.5 w-2.5 opacity-60 shrink-0" />
              <span className="truncate">{item.content.title}</span>
            </div>
          ))}
          {dayContent.length > (viewMode === "week" ? 6 : 3) && (
            <div className="text-[10px] text-muted-foreground text-center">
              +{dayContent.length - (viewMode === "week" ? 6 : 3)} more
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Drag and drop content to schedule publication dates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="text-xs"
            >
              Month
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="text-xs"
            >
              Week
            </Button>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Content
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Content for Publication</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content">Select Content</Label>
                  <select
                    id="content"
                    value={selectedContentId || ""}
                    onChange={(e) => setSelectedContentId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground"
                  >
                    <option value="">Choose content...</option>
                    {unscheduledContent.map(item => (
                      <option key={item.content.id} value={item.content.id}>
                        {item.content.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="date">Publish Date & Time</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSchedule} disabled={scheduleMutation.isPending}>
                    Schedule
                  </Button>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {viewMode === "month"
                    ? format(currentMonth, "MMMM yyyy")
                    : `${format(selectedWeekStart, "MMM d")} - ${format(endOfWeek(selectedWeekStart), "MMM d, yyyy")}`
                  }
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (viewMode === "month") {
                        setCurrentMonth(subMonths(currentMonth, 1));
                      } else {
                        setSelectedWeekStart(new Date(selectedWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000));
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedWeekStart(startOfWeek(new Date()));
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (viewMode === "month") {
                        setCurrentMonth(addMonths(currentMonth, 1));
                      } else {
                        setSelectedWeekStart(new Date(selectedWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000));
                      }
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-1.5">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(viewMode === "month" ? calendarDays : weekDays).map(day =>
                  renderCalendarCell(day, viewMode === "month")
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Unscheduled + Upcoming */}
        <div className="space-y-6">
          {/* Unscheduled Content - Drag Source */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                Unscheduled ({unscheduledContent.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                {unscheduledContent.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">All content is scheduled</p>
                ) : (
                  <div className="space-y-1.5 pr-2">
                    {unscheduledContent.map(item => (
                      <div
                        key={item.content.id}
                        draggable
                        onDragStart={() => handleDragStart(item as ContentItem)}
                        className="p-2 rounded-md border border-border/50 bg-card/50 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all group"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 opacity-50 group-hover:opacity-100 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{item.content.title}</p>
                            <p className="text-[10px] text-muted-foreground">{item.client?.name || "Unknown"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Upcoming Schedule */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {scheduledContent.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No scheduled content</p>
                ) : (
                  <div className="space-y-1.5 pr-2">
                    {scheduledContent
                      .filter(item => item.content.scheduledPublishDate)
                      .sort((a, b) => {
                        const dateA = new Date(a.content.scheduledPublishDate || 0).getTime();
                        const dateB = new Date(b.content.scheduledPublishDate || 0).getTime();
                        return dateA - dateB;
                      })
                      .slice(0, 8)
                      .map(item => (
                        <div
                          key={item.content.id}
                          draggable
                          onDragStart={() => handleDragStart(item as ContentItem)}
                          className="p-2 rounded-md border border-border/50 bg-card/50 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all"
                        >
                          <p className="text-xs font-medium truncate">{item.content.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(item.content.scheduledPublishDate || 0), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{scheduledContent.length}</p>
                  <p className="text-[10px] text-muted-foreground">Scheduled</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-400">{unscheduledContent.length}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{contentList?.length || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
