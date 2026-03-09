import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getStatusConfig(status: string) {
  switch (status) {
    case "scheduled":   return { label: "Scheduled",   color: "bg-blue-100 text-blue-800 border-blue-200",   dot: "bg-blue-500",   icon: Calendar };
    case "confirmed":   return { label: "Confirmed",   color: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500",  icon: CheckCircle2 };
    case "completed":   return { label: "Completed",   color: "bg-gray-100 text-gray-700 border-gray-200",   dot: "bg-gray-400",   icon: CheckCircle2 };
    case "cancelled":   return { label: "Cancelled",   color: "bg-red-100 text-red-800 border-red-200",      dot: "bg-red-500",    icon: XCircle };
    case "no_show":     return { label: "No Show",     color: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500", icon: AlertCircle };
    case "no_answer":   return { label: "No Answer",   color: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-500", icon: Phone };
    case "busy":        return { label: "Busy",        color: "bg-purple-100 text-purple-800 border-purple-200", dot: "bg-purple-500", icon: Phone };
    default:            return { label: status,        color: "bg-gray-100 text-gray-700 border-gray-200",   dot: "bg-gray-400",   icon: Calendar };
  }
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ─── Appointment Detail Dialog ────────────────────────────────────────────────
function AppointmentDialog({
  appointment,
  onClose,
  onStatusChange,
  isUpdating,
}: {
  appointment: any;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  isUpdating: boolean;
}) {
  const cfg = getStatusConfig(appointment.status);
  const StatusIcon = cfg.icon;
  const canCancel = ["scheduled", "confirmed"].includes(appointment.status);
  const canReschedule = ["scheduled", "confirmed"].includes(appointment.status);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Appointment Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${cfg.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {cfg.label}
            </span>
          </div>

          {/* Contact info */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{appointment.firstName} {appointment.lastName}</span>
            </div>
            {appointment.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{appointment.phone}</span>
              </div>
            )}
            {appointment.propertyAddress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{appointment.propertyAddress}</span>
              </div>
            )}
          </div>

          {/* Date/time */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formatDate(appointment.appointmentDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{formatTime(appointment.appointmentDate)} · {appointment.duration} min</span>
            </div>
          </div>

          {/* Type & loan */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{appointment.appointmentType?.replace("_", " ")}</Badge>
            {appointment.loanType && <Badge variant="outline">{appointment.loanType}</Badge>}
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded p-3">
              <p className="font-medium text-foreground mb-1">Notes</p>
              <p>{appointment.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {canReschedule && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => toast.info("To reschedule, please contact your agent directly.")}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reschedule
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={isUpdating}
              onClick={() => onStatusChange(appointment.id, "cancelled")}
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Cancel Appointment
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Calendar Page ───────────────────────────────────────────────────────
export default function ClientCalendar() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Fetch appointments for the current month range
  const startDate = useMemo(() => new Date(currentYear, currentMonth, 1), [currentYear, currentMonth]);
  const endDate = useMemo(() => new Date(currentYear, currentMonth + 1, 0, 23, 59, 59), [currentYear, currentMonth]);

  const { data: appointments = [], refetch } = trpc.appointments.getAppointments.useQuery(
    { startDate, endDate },
    { refetchOnWindowFocus: false }
  );

  const updateStatus = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Appointment updated");
      refetch();
      setSelectedAppointment(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // Build calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays: { day: number; month: "prev" | "current" | "next"; date: Date }[] = [];
  // Previous month fill
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    calendarDays.push({ day: d, month: "prev", date: new Date(currentYear, currentMonth - 1, d) });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, month: "current", date: new Date(currentYear, currentMonth, d) });
  }
  // Next month fill
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    calendarDays.push({ day: d, month: "next", date: new Date(currentYear, currentMonth + 1, d) });
  }

  function getAppointmentsForDate(date: Date) {
    return (appointments as any[]).filter((a) => {
      const aDate = new Date(a.appointmentDate);
      return aDate.getFullYear() === date.getFullYear() &&
        aDate.getMonth() === date.getMonth() &&
        aDate.getDate() === date.getDate();
    });
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }

  // Stats
  const stats = useMemo(() => {
    const all = appointments as any[];
    return {
      total: all.length,
      upcoming: all.filter(a => ["scheduled", "confirmed"].includes(a.status) && new Date(a.appointmentDate) >= today).length,
      completed: all.filter(a => a.status === "completed").length,
      cancelled: all.filter(a => ["cancelled", "no_show"].includes(a.status)).length,
    };
  }, [appointments]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">View and manage your appointments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("month")}
            >Month</Button>
            <Button
              variant={view === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("week")}
            >Week</Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total This Month", value: stats.total, color: "text-foreground" },
            { label: "Upcoming", value: stats.upcoming, color: "text-blue-600" },
            { label: "Completed", value: stats.completed, color: "text-green-600" },
            { label: "Cancelled / No-Show", value: stats.cancelled, color: "text-red-600" },
          ].map(s => (
            <Card key={s.label} className="border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Calendar */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {MONTHS[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); }}
                  className="text-xs"
                >
                  Today
                </Button>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map(({ day, month, date }, idx) => {
                const dayAppts = getAppointmentsForDate(date);
                const isToday = date.toDateString() === today.toDateString();
                const isCurrentMonth = month === "current";
                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] p-1.5 border-b border-r last:border-r-0 ${
                      isCurrentMonth ? "bg-background" : "bg-muted/20"
                    }`}
                  >
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 ${
                      isToday
                        ? "bg-primary text-primary-foreground font-bold"
                        : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map((apt: any) => {
                        const cfg = getStatusConfig(apt.status);
                        return (
                          <button
                            key={apt.id}
                            onClick={() => setSelectedAppointment(apt)}
                            className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate border font-medium hover:opacity-80 transition-opacity ${cfg.color}`}
                          >
                            {formatTime(apt.appointmentDate)} {apt.firstName}
                          </button>
                        );
                      })}
                      {dayAppts.length > 3 && (
                        <p className="text-[10px] text-muted-foreground pl-1">+{dayAppts.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming appointments list */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {(appointments as any[]).filter(a =>
              ["scheduled", "confirmed"].includes(a.status) && new Date(a.appointmentDate) >= today
            ).sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
              .slice(0, 10)
              .map((apt: any) => {
                const cfg = getStatusConfig(apt.status);
                return (
                  <button
                    key={apt.id}
                    onClick={() => setSelectedAppointment(apt)}
                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted/40 transition-colors text-left border-b last:border-b-0"
                  >
                    <div className="flex-shrink-0 w-12 text-center">
                      <p className="text-xs text-muted-foreground">{new Date(apt.appointmentDate).toLocaleDateString("en-US", { month: "short" })}</p>
                      <p className="text-xl font-bold leading-none">{new Date(apt.appointmentDate).getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{apt.firstName} {apt.lastName}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(apt.appointmentDate)} · {apt.duration} min · {apt.appointmentType?.replace("_", " ")}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            {(appointments as any[]).filter(a =>
              ["scheduled", "confirmed"].includes(a.status) && new Date(a.appointmentDate) >= today
            ).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming appointments this month</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment detail dialog */}
      {selectedAppointment && (
        <AppointmentDialog
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onStatusChange={(id, status) => updateStatus.mutate({ appointmentId: id, status: status as any })}
          isUpdating={updateStatus.isPending}
        />
      )}
    </DashboardLayout>
  );
}
